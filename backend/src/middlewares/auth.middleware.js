/* =========================================================================
 * Supabase JWT Authentication Middleware (auth.middleware.js)
 * 
 * Verifies Supabase Auth JWT Bearer tokens from the Authorization header.
 * Attaches verified user profile to `req.user`.
 * ========================================================================= */
const { supabase } = require('../services/supabase');

/**
 * requireAuth
 * Strict middleware: Rejects request with 401 if user is not authenticated.
 */
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Valid Authorization Bearer token is required for this action.'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!supabase) {
        // Fallback for development if Supabase is offline
        req.user = { id: 'dev-user', email: 'dev@nexus.local', role: 'authenticated' };
        return next();
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired session token. Please sign in again.'
            });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('[Auth Middleware Error]:', err.message);
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication check failed.'
        });
    }
}

/**
 * optionalAuth
 * Lenient middleware: Extracts user if valid token exists, but does not block guests.
 */
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ') || !supabase) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data: { user } } = await supabase.auth.getUser(token);
        req.user = user || null;
    } catch {
        req.user = null;
    }

    next();
}

module.exports = {
    requireAuth,
    optionalAuth
};
