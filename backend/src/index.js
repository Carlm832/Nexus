/* =========================================================================
 * Server Entry Point (index.js)
 * 
 * Boots the Nexus API server and reports database connectivity status.
 * ========================================================================= */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const { supabase } = require('./services/supabase');

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Nexus Backend API running on http://localhost:${PORT}`);
    if (supabase) {
        console.log(`🛡️  Connected to Supabase Database with JWT Auth & RLS`);
    } else {
        console.log(`⚠️  Supabase not configured — using local JSON fallback`);
    }
    console.log(`🔒 Security active: Helmet, CORS, Rate Limiters, Path Traversal Defense`);
    console.log(`=======================================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
