/* =========================================================================
 * Paper Submission & Ingestion Routes (submit.routes.js)
 * 
 * Handles DOI ingestion pipeline: Crossref resolution -> Gemini synthesis
 * -> ElevenLabs audio generation -> Supabase persistence.
 * Protected with authentication and rate limiting.
 * ========================================================================= */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { normalizePaperData } = require('../services/crossref');
const { generateInsights } = require('../services/llm');
const { generateSpeech } = require('../services/tts');
const { savePaper } = require('../services/paperStorage');
const { requireAuth } = require('../middlewares/auth.middleware');
const { submitLimiter } = require('../middlewares/rateLimiter.middleware');
const { validateDoi } = require('../middlewares/validate.middleware');

const AUDIO_DIR = path.join(__dirname, '../../data/audio');

/**
 * POST /api/submit
 * Authenticated submission of a new DOI to the Nexus scientific index.
 */
router.post('/submit', submitLimiter, requireAuth, validateDoi, async (req, res, next) => {
    const doi = req.cleanDoi;

    try {
        console.log(`[DOI Submission] User ${req.user.email || req.user.id} submitted DOI: ${doi}`);

        // Step 1: Fetch raw JSON from Crossref database using the provided DOI
        const response = await axios.get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
            timeout: 10000,
            headers: { 'User-Agent': 'NexusScholarlyEngine/1.0 (mailto:nexus.engine@example.com)' }
        });

        if (response.status !== 200 || !response.data.message) {
            return res.status(404).json({ error: 'DOI not found in Crossref database.' });
        }

        // Step 2: Clean the raw JSON into standardized Nexus object schema
        const rawItem = response.data.message;
        const normalized = normalizePaperData(rawItem);

        // Step 3: Pass standardized object to Gemini for LLM synthesis
        const processedPaper = await generateInsights(normalized);
        if (!processedPaper) {
            return res.status(500).json({ error: 'Failed to process insights.' });
        }

        // Step 4: Generate audio narration
        if (!fs.existsSync(AUDIO_DIR)) {
            fs.mkdirSync(AUDIO_DIR, { recursive: true });
        }

        const audioFilename = `${processedPaper.id.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
        const audioPath = path.join(AUDIO_DIR, audioFilename);
        const textToRead = `${processedPaper.title}. Summary: ${processedPaper.summary} Why it matters: ${processedPaper.significance}`;

        console.log(`Generating audio narration for remote submission ${processedPaper.id}...`);
        const hasAudio = await generateSpeech(textToRead, audioPath);
        if (hasAudio) {
            processedPaper.audioUrl = `/api/audio/${audioFilename}`;
        }

        // Step 5: Save to Supabase
        await savePaper(processedPaper);

        res.json({
            message: 'Paper successfully analyzed and added to Nexus!',
            paper: processedPaper,
            submittedBy: req.user.id
        });
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: `DOI ${doi} was not found in scholarly registries.` });
        }
        next(error);
    }
});

/**
 * POST /api/ingest
 * Description: Trigger background bulk ingestion script.
 */
router.post('/ingest', requireAuth, async (req, res) => {
    const { runIngestion } = require('../scripts/ingest');
    try {
        runIngestion().catch(e => console.error("Background ingestion failed", e));
        res.json({ message: 'Ingestion pipeline started in the background.' });
    } catch {
        res.status(500).json({ error: 'Failed to start ingestion' });
    }
});

module.exports = router;
