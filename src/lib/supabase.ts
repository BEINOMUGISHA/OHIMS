/**
 * src/lib/supabase.ts
 * Supabase client for OHIMS — credentials are baked in at build time
 * so the static Vercel/GitHub Pages bundle works with no server.
 * The public anon key is safe to expose; RLS policies + Supabase Auth
 * enforce all data-access rules server-side.
 */
import { createClient } from '@supabase/supabase-js';

// ── Supabase Project Credentials ──────────────────────────────────────────────
// Priority: Vercel env vars (VITE_SUPABASE_URL) > Hardcoded project defaults.
// The anon key is public-safe — it only allows operations permitted by RLS policies.
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel → Project Settings →
// Environment Variables to override these build-time defaults.
const OHIMS_PROJECT_URL   = 'https://kdvtawddhskanutixkeu.supabase.co';
const OHIMS_PROJECT_ANON  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkdnRhd2RkaHNrYW51dGl4a2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NDYzMjksImV4cCI6MjEwMDEyMjMyOX0.YWvgGCWhxuj3mET7axErsnaiB-RSfdawD0FVr86A4z0';

const SUPABASE_URL      = (import.meta.env.VITE_SUPABASE_URL      || OHIMS_PROJECT_URL).trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || OHIMS_PROJECT_ANON).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'ohims_session',
  },
});

export default supabase;
