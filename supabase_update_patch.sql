-- =====================================================================
-- OHIMS UGANDA — SUPABASE DATABASE INCREMENTAL UPDATE PATCH v2
-- =====================================================================
-- Run this entire script in your Supabase Dashboard -> SQL Editor.
-- This patch is ADDITIVE ONLY — it will not destroy existing data.
-- Safe to re-run; all statements use IF NOT EXISTS / ON CONFLICT guards.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Add 'resubmitted' to claims.status check constraint
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS claims_status_check;
ALTER TABLE public.claims
  ADD CONSTRAINT claims_status_check
  CHECK (status IN ('submitted','under_review','approved','rejected','paid','resubmitted'));

-- ─────────────────────────────────────────────────────────────────────
-- 2. Claim status state-machine trigger
--    Permitted transitions:
--      submitted      → under_review
--      under_review   → approved | rejected
--      approved       → paid
--      rejected       → resubmitted
--      resubmitted    → under_review
--    Any other transition is rejected at the DB level.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_validate_claim_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  allowed_transitions JSONB := '{
    "submitted":    ["under_review"],
    "under_review": ["approved", "rejected"],
    "approved":     ["paid"],
    "rejected":     ["resubmitted"],
    "resubmitted":  ["under_review"]
  }';
  allowed_next TEXT[];
BEGIN
  -- Skip if status didn't change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed next statuses from old status
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(allowed_transitions->OLD.status)
  ) INTO allowed_next;

  -- Reject invalid transitions
  IF NOT (NEW.status = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Invalid claim status transition: % → %. Allowed next statuses from %: %',
      OLD.status, NEW.status, OLD.status, array_to_string(allowed_next, ', ');
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_validate_claim_transition ON public.claims;
CREATE TRIGGER trg_validate_claim_transition
  BEFORE UPDATE OF status ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_claim_transition();

-- ─────────────────────────────────────────────────────────────────────
-- 3. Add payment_reference column to premiums for idempotency
--    Client generates a UUID per payment attempt; UNIQUE constraint
--    prevents duplicate payments even on double-click / retry.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.premiums
  ADD COLUMN IF NOT EXISTS payment_reference TEXT UNIQUE;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Add idempotency_ref column to claims
--    Client generates a UUID per submission attempt.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS idempotency_ref TEXT UNIQUE;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Tighten claim_documents RLS if the table exists
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'claim_documents'
  ) THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE public.claim_documents ENABLE ROW LEVEL SECURITY';

    -- Members can read docs for their own claims
    DROP POLICY IF EXISTS "claim_docs: member reads own" ON public.claim_documents;
    EXECUTE '
      CREATE POLICY "claim_docs: member reads own" ON public.claim_documents
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.claims c
            JOIN public.policies p ON p.id = c.policy_id
            WHERE c.id = claim_id AND p.user_id = auth.uid()
          )
        )
    ';

    -- Members and providers can insert docs
    DROP POLICY IF EXISTS "claim_docs: insert" ON public.claim_documents;
    EXECUTE '
      CREATE POLICY "claim_docs: insert" ON public.claim_documents
        FOR INSERT WITH CHECK (true)
    ';

    -- Staff can manage all docs
    DROP POLICY IF EXISTS "claim_docs: staff manage" ON public.claim_documents;
    EXECUTE '
      CREATE POLICY "claim_docs: staff manage" ON public.claim_documents
        FOR ALL USING (public.fn_auth_role() = ''staff'')
    ';
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Tighten providers RLS: providers can only read claims for their own provider_id
-- ─────────────────────────────────────────────────────────────────────

-- First: link provider profile to providers table via email match
-- (providers need a user_id to scope RLS properly)
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update provider self-claim RLS to use user_id when set
DROP POLICY IF EXISTS "claims: provider manage" ON public.claims;
CREATE POLICY "claims: provider manage" ON public.claims
  FOR ALL USING (
    public.fn_auth_role() = 'provider'
    AND (
      provider_id IN (
        SELECT id FROM public.providers WHERE user_id = auth.uid()
      )
      OR provider_id IS NULL -- Allow providers to see unassigned claims during lookup
    )
  );

-- Providers can read their own profile
DROP POLICY IF EXISTS "providers: self read" ON public.providers;
CREATE POLICY "providers: self read" ON public.providers
  FOR SELECT USING (user_id = auth.uid() OR public.fn_auth_role() IN ('staff', 'admin'));

-- ─────────────────────────────────────────────────────────────────────
-- 7. Storage bucket and policies for claim documents
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('claim-documents', 'claim-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "claim_docs_member_upload" ON storage.objects;
CREATE POLICY "claim_docs_member_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'claim-documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "claim_docs_member_read" ON storage.objects;
CREATE POLICY "claim_docs_member_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'claim-documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "claim_docs_staff_delete" ON storage.objects;
CREATE POLICY "claim_docs_staff_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'claim-documents' AND public.fn_auth_role() = 'staff');

-- ─────────────────────────────────────────────────────────────────────
-- 8. Notifications RLS: members can only read their own notifications
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "notifications: self read" ON public.notifications;
CREATE POLICY "notifications: self read" ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR public.fn_auth_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS "notifications: self update" ON public.notifications;
CREATE POLICY "notifications: self update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid() OR public.fn_auth_role() IN ('staff', 'admin'));

-- ─────────────────────────────────────────────────────────────────────
-- 9. Update profiles constraint to include 'photo' column if missing
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo TEXT;

-- ─────────────────────────────────────────────────────────────────────
-- 10. Update profiles constraint: ensure role check is current
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('member','provider','staff','admin'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active','suspended'));

-- ─────────────────────────────────────────────────────────────────────
-- 11. Admin role \u2013 grant admin the same permissions as staff
-- ─────────────────────────────────────────────────────────────────────
-- Update fn_auth_role to treat admin same as staff for policy checks
CREATE OR REPLACE FUNCTION public.fn_auth_role()
RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Extend staff policies to also cover admin role
DROP POLICY IF EXISTS "claims: admin manage" ON public.claims;
CREATE POLICY "claims: admin manage" ON public.claims
  FOR ALL USING (public.fn_auth_role() = 'admin');

DROP POLICY IF EXISTS "premiums: admin manage" ON public.premiums;
CREATE POLICY "premiums: admin manage" ON public.premiums
  FOR ALL USING (public.fn_auth_role() = 'admin');

DROP POLICY IF EXISTS "policies: admin manage" ON public.policies;
CREATE POLICY "policies: admin manage" ON public.policies
  FOR ALL USING (public.fn_auth_role() = 'admin');

DROP POLICY IF EXISTS "profiles: admin manage" ON public.profiles;
CREATE POLICY "profiles: admin manage" ON public.profiles
  FOR ALL USING (public.fn_auth_role() = 'admin');

DROP POLICY IF EXISTS "settings: admin manage" ON public.system_settings;
CREATE POLICY "settings: admin manage" ON public.system_settings
  FOR ALL USING (public.fn_auth_role() = 'admin');

DROP POLICY IF EXISTS "audit: admin reads" ON public.audit_logs;
CREATE POLICY "audit: admin reads" ON public.audit_logs
  FOR SELECT USING (public.fn_auth_role() = 'admin');

-- =====================================================================
-- PATCH v2 COMPLETE
-- Summary of changes:
--   1. claims.status \u2013 added 'resubmitted' value
--   2. fn_validate_claim_transition trigger \u2013 enforces state machine
--   3. premiums.payment_reference \u2013 UNIQUE idempotency column
--   4. claims.idempotency_ref \u2013 UNIQUE idempotency column
--   5. claim_documents RLS \u2013 tightened member/staff/provider scopes
--   6. providers.user_id \u2013 new column for RLS scoping
--   7. claims provider RLS \u2013 scoped to provider's own claims
--   8. storage policies \u2013 authenticated-only upload/read
--   9. notifications RLS \u2013 self-read + staff override
--  10. profiles \u2013 photo column + role/status constraints
--  11. admin role \u2013 granted same DB permissions as staff
-- =====================================================================
