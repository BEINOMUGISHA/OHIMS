-- =====================================================================
-- ONLINE HEALTH INSURANCE MANAGEMENT SYSTEM (OHIMS) UGANDA
-- COMPLETE SUPABASE POSTGRESQL SCHEMA + RLS + TRIGGERS + SEED DATA
-- =====================================================================
-- Run this entire file in the Supabase SQL Editor to bootstrap the DB.
-- =====================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =====================================================================
-- CLEANUP PREVIOUS SCHEMAS (Drop view / table / function cascade)
-- =====================================================================
drop view if exists public.vw_outstanding_premiums cascade;
drop view if exists public.vw_claims_full cascade;
drop view if exists public.vw_active_policies cascade;

drop table if exists public.audit_logs cascade;
drop table if exists public.system_settings cascade;
drop table if exists public.premiums cascade;
drop table if exists public.notifications cascade;
drop table if exists public.claims cascade;
drop table if exists public.beneficiaries cascade;
drop table if exists public.policies cascade;
drop table if exists public.providers cascade;
drop table if exists public.plans cascade;
drop table if exists public.profiles cascade;

drop function if exists public.fn_set_updated_at() cascade;
drop function if exists public.fn_handle_new_user() cascade;
drop function if exists public.fn_audit_policy_change() cascade;
drop function if exists public.fn_audit_claim_change() cascade;
drop function if exists public.fn_deduct_coverage_on_claim() cascade;
drop function if exists public.fn_auth_role() cascade;
drop function if exists public.seed_auth_user(uuid, text, text, text, text) cascade;

-- =====================================================================
-- TABLE 1: PROFILES  (extends auth.users)
-- =====================================================================
create table public.profiles (
    id              uuid primary key references auth.users(id) on delete cascade,
    email           text not null unique,
    name            text not null,
    role            text not null check (role in ('member','provider','staff')),
    national_id     text,
    dob             date,
    gender          text check (gender in ('male','female','other')),
    address         text,
    phone           text,
    avatar_url      text,
    password_hash   text,
    created_at      timestamptz default now() not null,
    updated_at      timestamptz default now() not null
);
comment on table public.profiles is 'Extended user info linked 1:1 to auth.users.';

-- =====================================================================
-- TABLE 2: INSURANCE PLANS
-- =====================================================================
create table public.plans (
    id              text primary key,          -- e.g. 'plan-basic'
    name            text not null,
    description     text,
    premium_amount  numeric not null check (premium_amount >= 0),
    coverage_limit  numeric not null check (coverage_limit > 0),
    benefits        text[]  not null default '{}',
    exclusions      text[]  not null default '{}',
    status          text not null default 'active' check (status in ('active','inactive')),
    created_at      timestamptz default now() not null,
    updated_at      timestamptz default now() not null
);

-- =====================================================================
-- TABLE 3: CLINIC / HEALTHCARE PROVIDERS
-- =====================================================================
create table public.providers (
    id                      uuid default gen_random_uuid() primary key,
    name                    text not null,
    type                    text not null check (type in ('hospital','clinic','lab','pharmacy')),
    location                text not null,
    contact                 text not null,
    accreditation_status    text not null default 'pending'
                                check (accreditation_status in ('accredited','suspended','pending')),
    approved_plans          text[]  not null default '{}',
    created_at              timestamptz default now() not null,
    updated_at              timestamptz default now() not null
);

-- =====================================================================
-- TABLE 4: MEMBER POLICIES
-- =====================================================================
create table public.policies (
    id                  text primary key,   -- e.g. 'POL-2026-0001'
    user_id             uuid references public.profiles(id) on delete cascade not null,
    plan_id             text references public.plans(id) not null,
    status              text not null default 'active'
                            check (status in ('active','suspended','terminated','cancelled')),
    start_date          date not null default current_date,
    end_date            date not null,
    premium_rate        numeric not null check (premium_rate >= 0),
    coverage_limit      numeric not null check (coverage_limit > 0),
    remaining_coverage  numeric not null check (remaining_coverage >= 0),
    created_at          timestamptz default now() not null,
    updated_at          timestamptz default now() not null,
    constraint chk_remaining check (remaining_coverage <= coverage_limit)
);

-- =====================================================================
-- TABLE 5: POLICY BENEFICIARIES / DEPENDENTS
-- =====================================================================
create table public.beneficiaries (
    id              uuid default gen_random_uuid() primary key,
    policy_id       text references public.policies(id) on delete cascade not null,
    name            text not null,
    relationship    text not null
                        check (relationship in ('spouse','child','parent','sibling','other')),
    national_id     text,
    dob             date,
    created_at      timestamptz default now() not null
);

-- =====================================================================
-- TABLE 6: INSURANCE CLAIMS
-- =====================================================================
create table public.claims (
    id              uuid default gen_random_uuid() primary key,
    policy_id       text references public.policies(id) on delete cascade not null,
    provider_id     uuid references public.providers(id) on delete set null,
    diagnosis       text not null,
    treatment       text not null,
    amount_claimed  numeric not null check (amount_claimed > 0),
    amount_approved numeric default 0 check (amount_approved >= 0),
    status          text not null default 'submitted'
                        check (status in ('submitted','under_review','approved','rejected','paid')),
    date_filed      timestamptz default now() not null,
    reviewer_id     uuid references public.profiles(id) on delete set null,
    review_notes    text,
    document_data   text,          -- stored file path / public URL
    is_flagged      boolean not null default false,
    created_at      timestamptz default now() not null,
    updated_at      timestamptz default now() not null
);

-- =====================================================================
-- TABLE 6b: NOTIFICATIONS (in-app user inbox)
-- =====================================================================
create table public.notifications (
    id          uuid default gen_random_uuid() primary key,
    user_id     uuid references public.profiles(id) on delete cascade not null,
    message     text not null,
    type        text not null default 'info' check (type in ('info','success','alert','error')),
    read        boolean not null default false,
    created_at  timestamptz default now() not null
);
comment on table public.notifications is 'In-app notification inbox for all roles.';

-- =====================================================================
-- TABLE 7: PREMIUM BILLING
-- =====================================================================
create table public.premiums (
    id              uuid default gen_random_uuid() primary key,
    policy_id       text references public.policies(id) on delete cascade not null,
    amount          numeric not null check (amount > 0),
    status          text not null default 'unpaid' check (status in ('paid','unpaid')),
    due_date        date not null,
    paid_date       timestamptz,
    receipt_number  text unique,
    created_at      timestamptz default now() not null
);

-- =====================================================================
-- TABLE 8: SYSTEM SETTINGS  (singleton row)
-- =====================================================================
create table public.system_settings (
    id                          integer primary key default 1 check (id = 1),
    allow_auto_approval         boolean not null default true,
    low_claim_threshold         numeric not null default 500000,
    auto_sla_days               integer not null default 5,
    require_accreditation       boolean not null default true,
    allow_self_submit           boolean not null default true,
    updated_at                  timestamptz default now() not null
);

-- =====================================================================
-- TABLE 9: AUDIT / COMPLIANCE LOGS
-- =====================================================================
create table public.audit_logs (
    id          uuid default gen_random_uuid() primary key,
    timestamp   timestamptz default now() not null,
    user_id     uuid references public.profiles(id) on delete set null,
    user_name   text not null,
    action      text not null,
    entity      text not null,
    entity_id   text not null,
    created_at  timestamptz default now() not null
);

-- =====================================================================
-- INDEXES
-- =====================================================================
create index idx_profiles_role          on public.profiles(role);
create index idx_policies_user_id       on public.policies(user_id);
create index idx_policies_plan_id       on public.policies(plan_id);
create index idx_policies_status        on public.policies(status);
create index idx_beneficiaries_policy   on public.beneficiaries(policy_id);
create index idx_claims_policy_id       on public.claims(policy_id);
create index idx_claims_provider_id     on public.claims(provider_id);
create index idx_claims_status          on public.claims(status);
create index idx_claims_reviewer        on public.claims(reviewer_id);
create index idx_premiums_policy_id     on public.premiums(policy_id);
create index idx_premiums_status        on public.premiums(status);
create index idx_audit_timestamp        on public.audit_logs(timestamp desc);
create index idx_audit_user_id          on public.audit_logs(user_id);
create index idx_audit_entity           on public.audit_logs(entity, entity_id);

-- =====================================================================
-- TRIGGER: auto-update updated_at
-- =====================================================================
create or replace function public.fn_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger trg_profiles_updated_at   before update on public.profiles        for each row execute function public.fn_set_updated_at();
create trigger trg_plans_updated_at      before update on public.plans           for each row execute function public.fn_set_updated_at();
create trigger trg_providers_updated_at  before update on public.providers       for each row execute function public.fn_set_updated_at();
create trigger trg_policies_updated_at   before update on public.policies        for each row execute function public.fn_set_updated_at();
create trigger trg_claims_updated_at     before update on public.claims          for each row execute function public.fn_set_updated_at();
create trigger trg_settings_updated_at   before update on public.system_settings for each row execute function public.fn_set_updated_at();

-- =====================================================================
-- TRIGGER: auto-create profile after Supabase Auth signup
-- =====================================================================
create or replace function public.fn_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.profiles (id, email, name, role)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data->>'role', 'member')
    );
    return new;
end;
$$;

create trigger trg_on_auth_user_created
    after insert on auth.users
    for each row execute function public.fn_handle_new_user();

-- =====================================================================
-- TRIGGER: auto write audit log on policy status change
-- =====================================================================
create or replace function public.fn_audit_policy_change()
returns trigger language plpgsql security definer as $$
begin
    if old.status is distinct from new.status then
        insert into public.audit_logs (user_id, user_name, action, entity, entity_id)
        values (
            new.user_id,
            'SYSTEM',
            'POLICY_STATUS_CHANGED_TO_' || upper(new.status),
            'policies',
            new.id
        );
    end if;
    return new;
end;
$$;

create trigger trg_audit_policy_status
    after update on public.policies
    for each row execute function public.fn_audit_policy_change();

-- =====================================================================
-- TRIGGER: auto write audit log on claim status change
-- =====================================================================
create or replace function public.fn_audit_claim_change()
returns trigger language plpgsql security definer as $$
begin
    if old.status is distinct from new.status then
        insert into public.audit_logs (user_id, user_name, action, entity, entity_id)
        values (
            new.reviewer_id,
            coalesce((select name from public.profiles where id = new.reviewer_id), 'SYSTEM'),
            'CLAIM_STATUS_CHANGED_TO_' || upper(new.status),
            'claims',
            new.id::text
        );
    end if;
    return new;
end;
$$;

create trigger trg_audit_claim_status
    after update on public.claims
    for each row execute function public.fn_audit_claim_change();

-- =====================================================================
-- TRIGGER: deduct remaining coverage when claim is approved/paid
-- =====================================================================
create or replace function public.fn_deduct_coverage_on_claim()
returns trigger language plpgsql security definer as $$
begin
    if new.status in ('approved','paid') and new.amount_approved > 0
       and (old.status not in ('approved','paid') or old.amount_approved <> new.amount_approved) then
        update public.policies
        set remaining_coverage = greatest(0, remaining_coverage - new.amount_approved)
        where id = new.policy_id;
    end if;
    return new;
end;
$$;

create trigger trg_deduct_coverage
    after update on public.claims
    for each row execute function public.fn_deduct_coverage_on_claim();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.plans           enable row level security;
alter table public.providers       enable row level security;
alter table public.policies        enable row level security;
alter table public.beneficiaries   enable row level security;
alter table public.claims          enable row level security;
alter table public.premiums        enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs      enable row level security;

-- Helper: get role of current authenticated user
create or replace function public.fn_auth_role()
returns text language sql security definer stable as $$
    select role from public.profiles where id = auth.uid();
$$;

-- ---- PROFILES -------------------------------------------------------
create policy "profiles: self read" on public.profiles
    for select using (auth.uid() = id);
create policy "profiles: staff read all" on public.profiles
    for select using (public.fn_auth_role() in ('staff','provider'));
create policy "profiles: self update" on public.profiles
    for update using (auth.uid() = id);
create policy "profiles: staff manage" on public.profiles
    for all using (public.fn_auth_role() = 'staff');
create policy "profiles: public insert" on public.profiles
    for insert with check (true);

-- ---- PLANS  (public catalogue, staff write) -------------------------
create policy "plans: public select" on public.plans
    for select using (true);
create policy "plans: staff manage" on public.plans
    for all using (public.fn_auth_role() = 'staff');

-- ---- PROVIDERS (public catalogue, staff write) ----------------------
create policy "providers: public select" on public.providers
    for select using (true);
create policy "providers: staff manage" on public.providers
    for all using (public.fn_auth_role() = 'staff');

-- ---- POLICIES -------------------------------------------------------
create policy "policies: member reads own" on public.policies
    for select using (auth.uid() = user_id);
create policy "policies: staff provider read all" on public.policies
    for select using (public.fn_auth_role() in ('staff','provider'));
create policy "policies: staff manage" on public.policies
    for all using (public.fn_auth_role() = 'staff');
create policy "policies: member insert" on public.policies
    for insert with check (auth.uid() = user_id);
create policy "policies: public insert" on public.policies
    for insert with check (true);

-- ---- BENEFICIARIES --------------------------------------------------
create policy "beneficiaries: member reads own" on public.beneficiaries
    for select using (
        exists (
            select 1 from public.policies p
            where p.id = policy_id and p.user_id = auth.uid()
        )
    );
create policy "beneficiaries: member deletes own" on public.beneficiaries
    for delete using (
        exists (
            select 1 from public.policies p
            where p.id = policy_id and p.user_id = auth.uid()
        )
    );
create policy "beneficiaries: staff manage" on public.beneficiaries
    for all using (public.fn_auth_role() = 'staff');

-- ---- CLAIMS ---------------------------------------------------------
create policy "claims: member reads own" on public.claims
    for select using (
        exists (
            select 1 from public.policies p
            where p.id = policy_id and p.user_id = auth.uid()
        )
    );
create policy "claims: member self-submit" on public.claims
    for insert with check (
        (select allow_self_submit from public.system_settings limit 1) = true
        and exists (
            select 1 from public.policies p
            where p.id = policy_id and p.user_id = auth.uid()
        )
    );
create policy "claims: provider manage" on public.claims
    for all using (public.fn_auth_role() = 'provider');
create policy "claims: staff manage" on public.claims
    for all using (public.fn_auth_role() = 'staff');

-- ---- PREMIUMS -------------------------------------------------------
create policy "premiums: member reads own" on public.premiums
    for select using (
        exists (
            select 1 from public.policies p
            where p.id = policy_id and p.user_id = auth.uid()
        )
    );
create policy "premiums: staff manage" on public.premiums
    for all using (public.fn_auth_role() = 'staff');
create policy "premiums: public insert" on public.premiums
    for insert with check (true);

-- ---- SYSTEM SETTINGS ------------------------------------------------
create policy "settings: any authenticated reads" on public.system_settings
    for select using (auth.role() = 'authenticated');
create policy "settings: staff manage" on public.system_settings
    for all using (public.fn_auth_role() = 'staff');

-- ---- AUDIT LOGS -----------------------------------------------------
create policy "audit: staff reads" on public.audit_logs
    for select using (public.fn_auth_role() = 'staff');
create policy "audit: system inserts" on public.audit_logs
    for insert with check (true);

-- =====================================================================
-- SEED DATA: Default Insurance Plans
-- =====================================================================
insert into public.plans (id, name, description, premium_amount, coverage_limit, benefits, exclusions, status)
values
(
    'plan-basic',
    'Bronze Essential Care',
    'Affordable basic outpatient cover for individuals and small families.',
    45000, 5000000,
    array[
        'Outpatient triage consultation',
        'Generic prescription drugs',
        'Standard blood panel & urinalysis diagnostics',
        'Ambulance call-out (local)',
        'Emergency dental extraction'
    ],
    array[
        'Specialist elective surgery',
        'Cosmetic procedures',
        'Maternity care',
        'International medical referrals',
        'Optical corrective lenses'
    ],
    'active'
),
(
    'plan-standard',
    'Silver Plus Comprehensive',
    'Comprehensive outpatient, inpatient, optical and dental cover for families.',
    95000, 15000000,
    array[
        'Outpatient triage consultation',
        'Generic and some branded prescriptions',
        'Advanced diagnostics (X-ray, Ultrasound)',
        'Inpatient admission up to 7 days per year',
        'Routine dental check-up & extraction',
        'Optical examination & basic frames',
        'Maternity: 2 antenatal visits',
        'Ambulance call-out (national)'
    ],
    array[
        'Specialist elective surgery',
        'Cosmetic procedures',
        'International medical referrals',
        'Organ transplants'
    ],
    'active'
),
(
    'plan-premium',
    'Gold Executive Shield',
    'Top-tier all-inclusive cover including specialist care, maternity and international referrals.',
    220000, 75000000,
    array[
        'Unlimited outpatient consultations',
        'Specialist referral consultations',
        'Advanced imaging (MRI, CT Scan, PET)',
        'Inpatient admission up to 30 days per year',
        'Full dental: check-ups, fillings, root canals',
        'Full optical: frames, lenses, and contact lenses',
        'Comprehensive maternity package (8 ANC visits, delivery)',
        'Critical care ICU cover',
        'Elective non-cosmetic surgical procedures',
        'International emergency medical evacuation'
    ],
    array[
        'Purely cosmetic surgical procedures',
        'Experimental or unapproved drug trials'
    ],
    'active'
)
on conflict (id) do nothing;

-- =====================================================================
-- SEED DATA: Default System Settings (singleton row)
-- =====================================================================
insert into public.system_settings
    (id, allow_auto_approval, low_claim_threshold, auto_sla_days, require_accreditation, allow_self_submit)
values
    (1, true, 500000, 5, true, true)
on conflict (id) do nothing;

-- =====================================================================
-- SEED DATA: Sample Accredited Healthcare Providers
-- =====================================================================
insert into public.providers (id, name, type, location, contact, accreditation_status, approved_plans)
values
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'Mulago National Referral Hospital',
    'hospital',
    'Mulago Hill, Kampala',
    '+256 414 540 131',
    'accredited',
    array['plan-basic','plan-standard','plan-premium']
),
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'Case Medical Centre',
    'hospital',
    'Nakasero, Kampala',
    '+256 312 200 400',
    'accredited',
    array['plan-standard','plan-premium']
),
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
    'International Hospital Kampala (IHK)',
    'hospital',
    'Namuwongo, Kampala',
    '+256 312 200 400',
    'accredited',
    array['plan-premium']
),
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'::uuid,
    'Norvik Enterprises Laboratory',
    'lab',
    'Ntinda, Kampala',
    '+256 772 400 100',
    'accredited',
    array['plan-basic','plan-standard','plan-premium']
),
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15'::uuid,
    'Kampala Pharmacy Hub',
    'pharmacy',
    'Wandegeya, Kampala',
    '+256 700 123 456',
    'pending',
    array['plan-basic']
)
on conflict (id) do nothing;

-- =====================================================================
-- SEED DATA: Sandbox Demo Accounts (Supabase Auth Users & Profiles)
-- =====================================================================

-- Helper function to seed Auth Users securely with hashed passwords
create or replace function public.seed_auth_user(
    u_id uuid,
    u_email text,
    u_password text,
    u_name text,
    u_role text
) returns void language plpgsql security definer as $$
begin
    if not exists (select 1 from auth.users where email = u_email) then
        insert into auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud,
            confirmed_at
        ) values (
            u_id,
            '00000000-0000-0000-0000-000000000000'::uuid,
            u_email,
            crypt(u_password, gen_salt('bf', 10)),
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('name', u_name, 'role', u_role),
            now(),
            now(),
            'authenticated',
            'authenticated',
            now()
        );
    end if;
end;
$$;

-- Seed sandbox accounts in auth.users (which triggers profiles auto-creation)
select public.seed_auth_user('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'admin@ohims.gov.ug', 'admin123', 'System Administrator', 'staff');
select public.seed_auth_user('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid, 'staff@ohims.gov.ug', 'staff123', 'Staff Adjuster', 'staff');
select public.seed_auth_user('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid, 'mulago@ohims.gov.ug', 'provider123', 'Mulago Partner', 'provider');
select public.seed_auth_user('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'::uuid, 'beinomugishainnocent2001@gmail.com', 'member123', 'Beinomugisha Innocent', 'member');
select public.seed_auth_user('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15'::uuid, 'member@ohims.gov.ug', 'member123', 'Demo Member', 'member');

-- Enrich profiles table with profile details
update public.profiles
set phone = '+256414540131', gender = 'male', dob = '1985-01-01', address = 'Kampala'
where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid;

update public.profiles
set phone = '+256755949229', national_id = 'CM01037AGV2G', dob = '1998-05-15', gender = 'male', address = 'Kabale'
where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'::uuid;

update public.profiles
set phone = '+256700111222', national_id = 'CM02047ZGV4G', dob = '1995-10-12', gender = 'female', address = 'Kampala'
where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15'::uuid;

-- Clean up helper function
drop function if exists public.seed_auth_user(uuid, text, text, text, text);

-- =====================================================================
-- SEED DATA: Seed active policies, premiums, claims, and notifications
-- =====================================================================

-- 1. Policies
insert into public.policies (id, user_id, plan_id, status, start_date, end_date, premium_rate, coverage_limit, remaining_coverage)
values
(
    'POL-2026-99999',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'::uuid,
    'plan-basic',
    'active',
    '2026-06-30',
    '2027-06-30',
    45000,
    5000000,
    4820000 -- reflecting deducted approved claim (5,000,000 - 180,000)
),
(
    'POL-2026-11111',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15'::uuid,
    'plan-standard',
    'active',
    '2026-06-30',
    '2027-06-30',
    95000,
    15000000,
    15000000
)
on conflict (id) do nothing;

-- 2. Premiums
insert into public.premiums (id, policy_id, amount, status, due_date)
values
(
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'POL-2026-99999',
    45000,
    'unpaid',
    '2026-07-30'
),
(
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'POL-2026-11111',
    95000,
    'unpaid',
    '2026-07-30'
)
on conflict (id) do nothing;

-- 3. Claims
insert into public.claims (id, policy_id, provider_id, diagnosis, treatment, amount_claimed, amount_approved, status, date_filed, review_notes)
values
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'POL-2026-99999',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'Malaria Fever Checkup & Infusion',
    'General Outpatient consultation and medication',
    180000,
    180000,
    'approved',
    now() - interval '5 days',
    'Low claim threshold auto-approval'
),
(
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'POL-2026-99999',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'::uuid,
    'Regular Routine Eye Refraction Lens',
    'Eye screening and prescription spectacles',
    650000,
    0,
    'submitted',
    now() - interval '1 day'
)
on conflict (id) do nothing;

-- 4. Notifications
insert into public.notifications (user_id, message, type, read)
values
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'::uuid,
    'Your claim for Malaria Fever Checkup & Infusion has been approved for UGX 180,000.',
    'success',
    false
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'::uuid,
    'Premium invoice generated for policy POL-2026-99999. Due on 2026-07-30.',
    'info',
    true
);

-- =====================================================================
-- USEFUL VIEWS FOR REPORTING
-- =====================================================================

-- View: active policies with member names and plan details
create or replace view public.vw_active_policies as
select
    po.id               as policy_id,
    pr.name             as member_name,
    pr.email            as member_email,
    pr.national_id,
    pl.name             as plan_name,
    pl.premium_amount,
    po.coverage_limit,
    po.remaining_coverage,
    po.status,
    po.start_date,
    po.end_date
from public.policies po
join public.profiles pr on pr.id = po.user_id
join public.plans pl on pl.id = po.plan_id
where po.status = 'active';

-- View: claims with policy-holder and provider details
create or replace view public.vw_claims_full as
select
    c.id                    as claim_id,
    c.policy_id,
    pr.name                 as member_name,
    pv.name                 as provider_name,
    c.diagnosis,
    c.treatment,
    c.amount_claimed,
    c.amount_approved,
    c.status,
    c.is_flagged,
    c.date_filed,
    c.review_notes,
    rv.name                 as reviewer_name
from public.claims c
join public.policies po on po.id = c.policy_id
join public.profiles pr on pr.id = po.user_id
left join public.providers pv on pv.id = c.provider_id
left join public.profiles rv on rv.id = c.reviewer_id;

-- View: outstanding premium invoices
create or replace view public.vw_outstanding_premiums as
select
    pm.id           as premium_id,
    po.id           as policy_id,
    pr.name         as holder_name,
    pr.email,
    pl.name         as plan_name,
    pm.amount,
    pm.due_date,
    pm.status
from public.premiums pm
join public.policies po on po.id = pm.policy_id
join public.profiles pr on pr.id = po.user_id
join public.plans pl on pl.id = po.plan_id
where pm.status = 'unpaid'
order by pm.due_date asc;
