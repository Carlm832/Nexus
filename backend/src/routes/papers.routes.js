/* =========================================================================
 * Papers Routes (papers.routes.js)
 * 
 * Handles reading curated papers feed, filtering, and JIT AI synthesis.
 * ========================================================================= */
const express = require('express');
const router = express.Router();
const { readPapers, savePaper, supabaseRowToPaper } = require('../services/paperStorage');
const { generateInsights } = require('../services/llm');
const { supabase } = require('../services/supabase');
const { aiLimiter } = require('../middlewares/rateLimiter.middleware');

/**
 * GET /api/papers
 * Returns published peer-reviewed papers with optional discipline and search filters.
 */
router.get('/', async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        let papers = (await readPapers())
            .map(p => ({ reviewStatus: p.reviewStatus || 'peerReviewed', ...p }))
            .filter(p => {
                if (!p.publishDate) return false;
                const pub = new Date(p.publishDate);
                if (isNaN(pub.getTime()) || pub > today) return false;
                if (p.reviewStatus === 'preReview') return false;
                return true;
            });

        const { discipline, search, limit } = req.query;

        if (discipline) {
            papers = papers.filter(p => (p.discipline || '').toLowerCase() === discipline.toLowerCase());
        }

        if (search) {
            const q = search.toLowerCase();
            papers = papers.filter(p =>
                (p.title || '').toLowerCase().includes(q) ||
                (p.summary || '').toLowerCase().includes(q) ||
                (p.authors || []).join(' ').toLowerCase().includes(q)
            );
        }

        if (limit) {
            const max = parseInt(limit, 10);
            if (!isNaN(max) && max > 0) {
                papers = papers.slice(0, max);
            }
        }

        res.json(papers);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/papers/jit-synthesize
 * On-Demand (Just-In-Time) synthesis with Gemini and caching to Supabase.
 */
router.post('/jit-synthesize', aiLimiter, async (req, res, next) => {
    try {
        const { rawPaper } = req.body;
        if (!rawPaper || !rawPaper.id) {
            return res.status(400).json({ error: 'Paper payload is required' });
        }

        // 1. Check if already in Supabase
        if (supabase) {
            const { data: existing } = await supabase
                .from('papers')
                .select('*')
                .eq('id', rawPaper.id)
                .maybeSingle();

            if (existing) {
                return res.json({ paper: supabaseRowToPaper(existing), cached: true });
            }
        }

        // 2. Synthesize with Gemini
        console.log(`[JIT Synthesis] Synthesizing paper ${rawPaper.id}: "${rawPaper.title}"...`);
        const synthesized = await generateInsights({
            rawId: rawPaper.id,
            title: rawPaper.title,
            authors: rawPaper.authors || [],
            journal: rawPaper.journal,
            publishDate: rawPaper.publishDate,
            doiUrl: rawPaper.doi || (rawPaper.rawDoi ? `https://doi.org/${rawPaper.rawDoi}` : null),
            abstract: rawPaper.abstract,
            discipline: rawPaper.discipline
        });

        if (!synthesized) {
            return res.status(500).json({ error: 'Failed to synthesize insights for paper.' });
        }

        // Preserve metadata from OpenAlex
        if (rawPaper.citations) synthesized.metrics.citations = rawPaper.citations;
        if (rawPaper.oaUrl) synthesized.oaUrl = rawPaper.oaUrl;
        if (rawPaper.tags && rawPaper.tags.length) {
            synthesized.tags = Array.from(new Set([...synthesized.tags, ...rawPaper.tags])).slice(0, 5);
        }

        // 3. Save to Supabase permanently
        await savePaper(synthesized);
        console.log(`[JIT Synthesis] Successfully synthesized and cached paper ${synthesized.id} to Supabase.`);

        res.json({ paper: synthesized, cached: false });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
