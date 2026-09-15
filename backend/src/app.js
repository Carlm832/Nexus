/* =========================================================================
 * Express Application Setup (app.js)
 * 
 * Configures security headers (Helmet), CORS, JSON body parsers,
 * rate limiting, modular routers, and centralized error handling.
 * ========================================================================= */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

// Middlewares
const { generalLimiter } = require('./middlewares/rateLimiter.middleware');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler.middleware');

// Routes
const papersRoutes = require('./routes/papers.routes');
const searchRoutes = require('./routes/search.routes');
const audioRoutes = require('./routes/audio.routes');
const chatRoutes = require('./routes/chat.routes');
const submitRoutes = require('./routes/submit.routes');

const app = express();

// 1. Security Headers (Helmet)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows audio files to be played by client browsers
    crossOriginEmbedderPolicy: false
}));

// 2. CORS Configuration
app.use(cors({
    origin: true, // Allow local dev clients / production hosts
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Request Parsers with Payload Size Limits (defense against large payload attacks)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4. Global Browsing Rate Limiter
app.use('/api', generalLimiter);

// 5. Mount Modular API Routes
app.use('/api/papers', papersRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', audioRoutes);
app.use('/api', chatRoutes);
app.use('/api', submitRoutes);

// 6. Healthcheck endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Nexus Backend API'
    });
});

// 7. Not Found & Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
