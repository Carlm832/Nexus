/* =========================================================================
 * Supabase Client (Frontend)
 *
 * Initialises the Supabase JS client for the React app using the anon key.
 * Used for:
 * - Auth (email sign-up / sign-in)
 * - Bookmarks (read/write per user)
 * - Chat history persistence (optional)
 * ========================================================================= */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not set. Auth and bookmarks will be limited.');
}

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
