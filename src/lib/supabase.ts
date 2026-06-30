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
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://klcfdbsvlxfenzbzltvq.supabase.co';

const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsY2ZkYnN2bHhmZW56YnpsdHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzU4ODUsImV4cCI6MjA2NjU1MTg4NX0.W5uBKXl8PGmDjKfm0OD4ERYNEsm7OGRHpZBuJy6fW8Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'ohims_session',
  },
});

export default supabase;
