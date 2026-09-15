/* =========================================================================
 * Paper Chat Routes (chat.routes.js)
 * 
 * Interactive "Ask the Paper" AI Q&A endpoint powered by Gemini.
 * ========================================================================= */
const express = require('express');
const router = express.Router();
const { chatWithPaper } = require('../services/llm');
const { readPapers } = require('../services/paperStorage');
const { aiLimiter } = require('../middlewares/rateLimiter.middleware');
const { validateChatPayload } = require('../middlewares/validate.middleware');
const { optionalAuth } = require('../middlewares/auth.middleware');

/**
 * POST /api/papers/:id/chat
 * Ask questions about a specific paper and get grounded, critical scientific answers.
 */
router.post('/papers/:id/chat', aiLimiter, validateChatPayload, optionalAuth, async (req, res, next) => {
    const { id } = req.params;
    const { history, paper: paperPayload } = req.body;
    const question = req.cleanQuestion;

    try {
        let paper = paperPayload;

        if (!paper) {
            const allPapers = await readPapers();
            paper = allPapers.find(p => p.id === id || p.doi === id);
        }

        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }

        const result = await chatWithPaper({
            paper,
            question,
            history: Array.isArray(history) ? history : []
        });

        res.json({
            answer: result.answer,
            paperId: paper.id,
            userId: req.user?.id || null
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
