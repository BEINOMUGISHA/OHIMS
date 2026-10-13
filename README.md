# OHIMS Uganda

OHIMS is a React + Vite + Express app for health insurance management, provider operations, policy tracking, claims, and premium workflows.

## Local setup

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and fill in your environment values.
3. At minimum configure:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server side only)
   - `GEMINI_API_KEY` (for AI chat assistant)
4. For local testing only, you may set `VITE_ENABLE_DEMO_ACCOUNTS="true"`.
5. Start the app:
   `npm run dev`

## Production hardening checklist

- Do not commit real credentials.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Leave `VITE_ENABLE_DEMO_ACCOUNTS=false` in production.
- Issue staff, clinic, and admin access codes privately through approved admin channels only.
- Set unique values for `VITE_STAFF_ACCESS_CODE`, `VITE_CLINIC_ACCESS_CODE`, and `VITE_ADMIN_ACCESS_CODE` and rotate them periodically.
- Make sure Supabase RLS is active and policies are deployed.
- Set `GEMINI_API_KEY` in the environment used by the deployed server or edge function.

## Build

```bash
npm run build
```
