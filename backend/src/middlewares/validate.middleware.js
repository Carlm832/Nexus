/* =========================================================================
 * Input Validation & Path Traversal Middleware (validate.middleware.js)
 * 
 * Validates, cleans, and sanitizes user input across endpoints.
 * Guards against parameter pollution, injection, and path traversal attacks.
 * ========================================================================= */
const path = require('path');

// Standard DOI regex (e.g., 10.1038/227680a0, 10.1016/j.cell.2006.10.030)
const DOI_REGEX = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/i;

/**
 * Validates DOI submissions
 */
function validateDoi(req, res, next) {
    let { doi } = req.body;

    if (!doi || typeof doi !== 'string' || !doi.trim()) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'A valid DOI string is required (e.g. 10.1038/s41586-020-2649-2).'
        });
    }

    doi = doi.trim().replace(/^https?:\/\/doi\.org\//i, '').trim();

    if (!DOI_REGEX.test(doi)) {
        return res.status(400).json({
            error: 'Invalid DOI',
            message: `The provided DOI "${doi}" does not match standard scholarly format.`
        });
    }

    req.cleanDoi = doi;
    next();
}

/**
 * Validates and limits search queries
 */
function validateSearchQuery(req, res, next) {
    if (req.query.q) {
        if (typeof req.query.q !== 'string' || req.query.q.length > 500) {
            req.query.q = String(req.query.q).slice(0, 500);
        }
    }

    if (req.query.from_year) {
        const y = parseInt(req.query.from_year, 10);
        if (isNaN(y) || y < 1800 || y > 2100) delete req.query.from_year;
    }

    if (req.query.to_year) {
        const y = parseInt(req.query.to_year, 10);
        if (isNaN(y) || y < 1800 || y > 2100) delete req.query.to_year;
    }

    next();
}

/**
 * Validates chat Q&A payload
 */
function validateChatPayload(req, res, next) {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Question text is required.'
        });
    }

    if (question.length > 1000) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Question exceeds maximum permitted length of 1,000 characters.'
        });
    }

    req.cleanQuestion = question.trim();
    next();
}

/**
 * Validates audio file download requests to prevent directory traversal
 */
function validateAudioFilename(audioDir) {
    return (req, res, next) => {
        const filename = req.params.filename;

        if (!filename || typeof filename !== 'string') {
            return res.status(400).json({ error: 'Filename is required' });
        }

        // Strictly allow only alphanumeric characters, underscores, hyphens, and .mp3
        if (!/^[a-zA-Z0-9_-]+\.mp3$/i.test(filename)) {
            return res.status(400).json({ error: 'Invalid audio file identifier' });
        }

        const safePath = path.join(audioDir, path.basename(filename));

        // Prevent path traversal
        if (!safePath.startsWith(path.resolve(audioDir))) {
            return res.status(403).json({ error: 'Access denied' });
        }

        req.safeAudioPath = safePath;
        next();
    };
}

module.exports = {
    validateDoi,
    validateSearchQuery,
    validateChatPayload,
    validateAudioFilename
};
