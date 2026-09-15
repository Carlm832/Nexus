/* =========================================================================
 * Supabase Client (Backend)
 *
 * Initialises the Supabase JS client for the Express server.
 * The anon key is used here; RLS policies control access.
 * The backend has an open write policy for the papers table
 * so it can seed and update records.
 * ========================================================================= */
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('WARNING: SUPABASE_URL or SUPABASE_ANON_KEY not set. Database operations will fail.');
}

const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

module.exports = { supabase };
