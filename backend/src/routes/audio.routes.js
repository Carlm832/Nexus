/* =========================================================================
 * Audio Routes (audio.routes.js)
 * 
 * Manages ElevenLabs speech generation and secure static audio streaming
 * with strict path traversal defenses.
 * ========================================================================= */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { readPapers, savePaper } = require('../services/paperStorage');
const { generateSpeech } = require('../services/tts');
const { ttsLimiter } = require('../middlewares/rateLimiter.middleware');
const { validateAudioFilename } = require('../middlewares/validate.middleware');

const AUDIO_DIR = path.join(__dirname, '../../data/audio');

// Ensure audio folder exists
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

/**
 * POST /api/papers/:id/audio
 * On-demand ElevenLabs audio generator for a specific paper.
 */
router.post('/papers/:id/audio', ttsLimiter, async (req, res, next) => {
    const rawId = req.params.id;
    if (!rawId) return res.status(400).json({ error: 'Paper ID required' });

    const id = decodeURIComponent(rawId);

    try {
        const allPapers = await readPapers();
        let paper = allPapers.find(p => p.id === id || p.doi === id || p.id === rawId);

        if (!paper && req.body.paper) {
            paper = req.body.paper;
        }

        if (!paper) {
            return res.status(404).json({ error: 'Paper not found in database' });
        }

        const audioFilename = `${(paper.id || id).replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
        const audioPath = path.join(AUDIO_DIR, audioFilename);
        const relativeAudioUrl = `/api/audio/${audioFilename}`;

        // If audio file already exists on disk, return immediately
        if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000) {
            if (!paper.audioUrl) {
                await savePaper({ ...paper, audioUrl: relativeAudioUrl });
            }
            return res.json({ message: 'Audio already exists', audioUrl: relativeAudioUrl });
        }

        const textToRead = `${paper.title}. Summary: ${paper.summary || paper.abstract} Why it matters: ${paper.significance || ''}`;

        console.log(`Generating ElevenLabs audio for paper: ${paper.id || id}...`);
        const hasAudio = await generateSpeech(textToRead, audioPath);

        if (!hasAudio) {
            return res.status(500).json({ error: 'Audio generation failed with ElevenLabs API' });
        }

        await savePaper({ ...paper, audioUrl: relativeAudioUrl });

        res.json({ message: 'Audio generated successfully', audioUrl: relativeAudioUrl });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/audio/:filename
 * Secure streaming for generated audio narration files (path traversal protected).
 */
router.get('/audio/:filename', validateAudioFilename(AUDIO_DIR), (req, res) => {
    if (!fs.existsSync(req.safeAudioPath)) {
        return res.status(404).json({ error: 'Audio file not found' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(req.safeAudioPath).pipe(res);
});

module.exports = router;
