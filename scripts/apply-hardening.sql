-- OHIMS security hardening — apply script (executable statements only).
-- Paste into Supabase → SQL Editor → Run. Idempotent; safe to re-run.
-- Full commented version: supabase_security_hardening.sql

create or replace function public.fn_guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
begin
  if auth.uid() is null then
    return new;
  end if;
  actor := public.fn_auth_role();
  if tg_op = 'INSERT' then
    if actor = 'staff' and new.role = 'admin' then
      raise exception 'Only administrators may create administrator accounts'
        using errcode = '42501';
    end if;
    return new;
  end if;
  if new.role is not distinct from old.role then
    return new;
  end if;
  if actor = 'admin' then
    return new;
  end if;
  if actor = 'staff' and new.role <> 'admin' then
    return new;
  end if;
  raise exception 'Only administrators may change account roles'
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_profiles_guard_role_ins on public.profiles;
create trigger trg_profiles_guard_role_ins
  before insert on public.profiles
  for each row execute function public.fn_guard_profile_role();

drop trigger if exists trg_profiles_guard_role_upd on public.profiles;
create trigger trg_profiles_guard_role_upd
  before update of role on public.profiles
  for each row execute function public.fn_guard_profile_role();

drop policy if exists "profiles: public insert" on public.profiles;
create policy "profiles: self insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles: staff manage" on public.profiles;
create policy "profiles: staff manage" on public.profiles
  for all using (public.fn_auth_role() = 'staff');

drop policy if exists "profiles: admin manage" on public.profiles;
create policy "profiles: admin manage" on public.profiles
  for all using (public.fn_auth_role() = 'admin');

create or replace function public.fn_verify_access_code(p_code text, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code   text := upper(trim(coalesce(p_code, '')));
  v_role   text := lower(trim(coalesce(p_role, '')));
  v_row    public.access_codes%rowtype;
  v_master text;
  v_col    text;
begin
  if v_code = '' or v_role = '' then
    return jsonb_build_object('valid', false, 'reason', 'missing_code');
  end if;
  v_col := case v_role
              when 'provider' then 'clinic_access_code'
              when 'staff'    then 'staff_access_code'
              else                'admin_access_code'
            end;
  execute format('select %I from public.system_settings where id = 1', v_col) into v_master;
  if v_master is not null and upper(trim(v_master)) = v_code then
    return jsonb_build_object('valid', true, 'source', 'master', 'role', v_role);
  end if;
  select * into v_row
    from public.access_codes
   where code = v_code and role = v_role and status = 'active'
   order by created_at desc
   limit 1;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;
  if coalesce(v_row.use_count, 0) >= coalesce(v_row.max_uses, 1) then
    return jsonb_build_object('valid', false, 'reason', 'exhausted');
  end if;
  update public.access_codes
     set use_count  = coalesce(use_count, 0) + 1,
         status     = case when coalesce(use_count, 0) + 1 >= coalesce(max_uses, 1)
                           then 'used' else 'active' end,
         updated_at = now()
   where id = v_row.id;
  return jsonb_build_object(
    'valid', true, 'source', 'issued', 'code', v_row.code, 'role', v_row.role,
    'max_uses', v_row.max_uses, 'use_count', coalesce(v_row.use_count, 0) + 1,
    'expires_at', v_row.expires_at, 'recipient_name', v_row.recipient_name
  );
end;
$$;

revoke all on function public.fn_verify_access_code(text, text) from public;
grant execute on function public.fn_verify_access_code(text, text) to anon, authenticated, service_role;

create or replace function public.fn_get_master_codes()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if public.fn_auth_role() not in ('admin', 'staff') then
    raise exception 'Only staff and administrators may read master access codes'
      using errcode = '42501';
  end if;
  select * into r from public.system_settings where id = 1;
  return jsonb_build_object(
    'provider', r.clinic_access_code,
    'staff',    r.staff_access_code,
    'admin',    r.admin_access_code
  );
end;
$$;

revoke all on function public.fn_get_master_codes() from public;
grant execute on function public.fn_get_master_codes() to authenticated, service_role;

drop policy if exists "access_codes: public verify lookup" on public.access_codes;
revoke select on public.access_codes from public;
revoke select on public.access_codes from anon;
grant select on public.access_codes to authenticated, service_role;

drop policy if exists "access_codes: staff and admin manage" on public.access_codes;
create policy "access_codes: staff and admin manage" on public.access_codes
  for all using (public.fn_auth_role() in ('admin', 'staff'));

revoke select on public.system_settings from public;
revoke select on public.system_settings from anon;
revoke select on public.system_settings from authenticated;
grant select on public.system_settings to service_role;

do $$
declare
  cols text;
begin
  select string_agg(format('%I', column_name), ', ') into cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'system_settings'
     and column_name not in ('staff_access_code', 'clinic_access_code', 'admin_access_code');
  if cols is not null then
    execute format('grant select (%s) on public.system_settings to anon, authenticated', cols);
  end if;
end $$;

update public.system_settings
   set staff_access_code  = 'STAFF-'  || upper(substr(md5(random()::text), 1, 10)),
       clinic_access_code = 'CLINIC-' || upper(substr(md5(random()::text), 1, 10)),
       admin_access_code  = 'ADMIN-'  || upper(substr(md5(random()::text), 1, 10))
 where id = 1;

notify pgr, 'reload schema';

select current_database() as database,
       (select count(*) from public.access_codes where code = 'CLINIC-MULAGO-2026') as ohims_project_marker,
       (select count(*) from pg_proc where proname in ('fn_verify_access_code','fn_get_master_codes','fn_guard_profile_role')) as hardening_functions,
       has_table_privilege('anon','public.access_codes','SELECT') as anon_can_read_codes,
       has_table_privilege('authenticated','public.system_settings','SELECT') as authenticated_reads_all_settings,
       (select staff_access_code from public.system_settings where id = 1) as staff_master_code,
       (select clinic_access_code from public.system_settings where id = 1) as clinic_master_code;
