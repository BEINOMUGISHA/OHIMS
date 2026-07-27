-- =====================================================================
-- OHIMS UGANDA — SUPABASE DATABASE INCREMENTAL UPDATE PATCH
-- =====================================================================
-- Run this entire script in your Supabase Dashboard -> SQL Editor
-- to apply all latest feature updates, fixes, and storage policies.
-- =====================================================================

-- 1. Update profiles table constraints and status column
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('member','provider','staff','admin'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active','suspended'));

-- 2. Update trigger function to handle profile creation cleanly
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'member')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role;
    RETURN new;
END;
$$;

-- 3. Clean up corrupted seed accounts in auth.users so GoTrue Auth works 100% cleanly
DELETE FROM public.profiles WHERE email IN (
    'admin@ohims.gov.ug',
    'staff@ohims.gov.ug',
    'mulago@ohims.gov.ug',
    'beinomugishainnocent2001@gmail.com',
    'member@ohims.gov.ug'
);

DELETE FROM auth.users WHERE email IN (
    'admin@ohims.gov.ug',
    'staff@ohims.gov.ug',
    'mulago@ohims.gov.ug',
    'beinomugishainnocent2001@gmail.com',
    'member@ohims.gov.ug'
);

-- 4. Create Storage Bucket for Claim Attachment Documents (PDF/PNG/JPG)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('claim-documents', 'claim-documents', false) 
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Security Policies
DROP POLICY IF EXISTS "claim_docs_member_upload" ON storage.objects;
CREATE POLICY "claim_docs_member_upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'claim-documents');

DROP POLICY IF EXISTS "claim_docs_member_read" ON storage.objects;
CREATE POLICY "claim_docs_member_read" ON storage.objects 
FOR SELECT USING (bucket_id = 'claim-documents');

-- =====================================================================
-- PATCH COMPLETE — ALL FEATURES & AUTH FIXED
-- =====================================================================
