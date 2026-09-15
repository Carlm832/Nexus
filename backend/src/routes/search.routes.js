/* =========================================================================
 * Global Scholarly Search Routes (search.routes.js)
 * 
 * Live querying of OpenAlex (250M+ scholarly index) with high-speed
 * in-memory caching and Supabase synthesis status cross-checking.
 * ========================================================================= */
const express = require('express');
const router = express.Router();
const { searchGlobalPapers } = require('../services/openalexSearch');
const { searchCache } = require('../services/cacheService');
const { supabase } = require('../services/supabase');
const { validateSearchQuery } = require('../middlewares/validate.middleware');

/**
 * GET /api/search/live
 * Real-time scholarly search across 250M+ papers
 */
router.get('/live', validateSearchQuery, async (req, res, next) => {
    try {
        const {
            q = '',
            discipline = '',
            from_year = null,
            to_year = null,
            open_access = 'false',
            sort = null,
            page = 1,
            per_page = 20
        } = req.query;

        // Build deterministic cache key
        const cacheKey = `search:${q.trim().toLowerCase()}:${discipline}:${from_year}:${to_year}:${open_access}:${sort}:${page}:${per_page}`;

        // 1. Check in-memory cache
        const cached = searchCache.get(cacheKey);
        if (cached) {
            return res.json({ ...cached, fromCache: true });
        }

        // 2. Query OpenAlex global index
        const searchResult = await searchGlobalPapers({
            q: q.trim(),
            discipline: discipline.trim(),
            fromYear: from_year || null,
            toYear: to_year || null,
            openAccessOnly: open_access === 'true',
            sort: sort || null,
            page: parseInt(page, 10) || 1,
            perPage: parseInt(per_page, 10) || 20
        });

        // 3. Cross-check with Supabase cache for pre-synthesized papers
        if (supabase && searchResult.results && searchResult.results.length > 0) {
            const paperIds = searchResult.results.map(p => p.id);
            const { data: cachedRows } = await supabase
                .from('papers')
                .select('id, audio_url')
                .in('id', paperIds);

            if (cachedRows && cachedRows.length > 0) {
                const cachedSet = new Map(cachedRows.map(r => [r.id, r]));
                searchResult.results = searchResult.results.map(p => {
                    if (cachedSet.has(p.id)) {
                        return {
                            ...p,
                            isCached: true,
                            audioUrl: cachedSet.get(p.id).audio_url || p.audioUrl
                        };
                    }
                    return p;
                });
            }
        }

        // 4. Save to cache (10 min TTL)
        searchCache.set(cacheKey, searchResult, 10 * 60 * 1000);

        res.json(searchResult);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
