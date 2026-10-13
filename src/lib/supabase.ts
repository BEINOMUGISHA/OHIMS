/**
 * src/lib/supabase.ts
 * Supabase client for OHIMS — credentials are baked in at build time
 * so the static GitHub Pages bundle works with no server.
 * The public anon key is safe to expose; RLS policies + Supabase Auth
 * enforce all data-access rules server-side.
 */
import { createClient } from '@supabase/supabase-js';

// Fall back to build-time env vars (Vite replaces import.meta.env at compile time).
// Hardcoded values ensure the GitHub Pages build always has credentials.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env.DEV ? 'https://kdvtawddhskanutixkeu.supabase.co' : '');

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (import.meta.env.DEV ? 'demo-anon-key' : '');

if (import.meta.env.PROD && (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('your-project-id'))) {
  console.warn('[OHIMS] Missing Supabase environment configuration. Frontend auth/data APIs may not work until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.');
}

export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'ohims_session',
  },
});

export default supabase;
