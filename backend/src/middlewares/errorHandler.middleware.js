/* =========================================================================
 * Centralized Error Handling Middleware (errorHandler.middleware.js)
 * 
 * Intercepts uncaught exceptions and errors, formats clean responses,
 * and suppresses sensitive stack traces / internal filepaths in production.
 * ========================================================================= */

function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

    console.error(`[API Error] ${req.method} ${req.originalUrl}:`, {
        message: err.message,
        status: statusCode,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    res.status(statusCode).json({
        error: err.name || 'Internal Server Error',
        message: err.isOperational ? err.message : (err.message || 'An unexpected error occurred while processing your request.'),
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
}

function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Not Found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`
    });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
