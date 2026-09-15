/* =========================================================================
 * Tiered Rate Limiting Middleware (rateLimiter.middleware.js)
 * 
 * Guards the Nexus backend against brute-force attacks, resource exhaustion,
 * and excessive billing on external AI / TTS APIs.
 * ========================================================================= */
const rateLimit = require('express-rate-limit');

/**
 * Standard API rate limiter (150 requests per minute)
 */
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too Many Requests',
        message: 'You have exceeded the browsing rate limit. Please try again shortly.'
    }
});

/**
 * AI Synthesis & Chat rate limiter (30 requests per minute)
 * Protects Gemini AI API quotas
 */
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too Many Requests',
        message: 'AI synthesis request limit reached. Please wait a moment before sending more queries.'
    }
});

/**
 * ElevenLabs Audio narration rate limiter (12 requests per minute)
 * Protects ElevenLabs audio generation quota
 */
const ttsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too Many Requests',
        message: 'Audio generation limit reached. Please wait a moment before generating more audio.'
    }
});

/**
 * Researcher DOI Submission rate limiter (10 submissions per minute)
 */
const submitLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too Many Requests',
        message: 'DOI submission rate limit exceeded. Please wait a moment.'
    }
});

module.exports = {
    generalLimiter,
    aiLimiter,
    ttsLimiter,
    submitLimiter
};
