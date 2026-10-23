// =====================================================================
// OHIMS — Security hardening verification suite
//
// Run AFTER applying supabase_security_hardening.sql:
//   node scripts/verify-security.mjs
//
// Reads credentials from .env.local (nothing is printed).
// Every check is non-destructive, except check 6 which changes a demo
// account's role and immediately restores it.
// =====================================================================
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}
const URL_BASE = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;

const DEMOS = {
  member: ['member@ohims.gov.ug', 'member123'],
  staff: ['staff@ohims.gov.ug', 'staff123'],
  provider: ['mulago@ohims.gov.ug', 'provider123'],
  admin: ['admin@ohims.gov.ug', 'admin123'],
};

let pass = 0, fail = 0;
const check = (label, ok, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n        ${detail}` : ''}`);
};

const anonHeaders = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' };

async function signIn([email, password]) {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: anonHeaders,
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`sign-in failed for ${email}: ${res.status}`);
  const { access_token, user } = await res.json();
  const headers = { apikey: ANON, Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };
  const prof = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${user.id}&select=id,email,role`, { headers });
  const rows = await prof.json();
  return { token: access_token, headers, id: user.id, role: Array.isArray(rows) ? rows[0]?.role : null };
}

const rpc = async (headers, fn, params) => {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(params || {}) });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
};

console.log('\n══ OHIMS security hardening — verification ══\n');

// ── 1. The codes table must no longer be world-readable ──────────────
{
  const res = await fetch(`${URL_BASE}/rest/v1/access_codes?select=code,recipient_name&limit=5`, { headers: anonHeaders });
  const text = await res.text();
  const leaked = res.ok && Array.isArray(JSON.parse(text)) && JSON.parse(text).length > 0;
  check('anonymous read of access_codes is denied', !leaked, `status=${res.status} body=${text.slice(0, 140)}`);
}

// ── 2. Master codes must not be readable from the table ──────────────
{
  const res = await fetch(`${URL_BASE}/rest/v1/system_settings?select=staff_access_code,clinic_access_code&limit=1`, { headers: anonHeaders });
  const text = await res.text();
  const leaked = /STAFF-|CLINIC-/.test(text);
  check('anonymous read of master code columns is denied', !leaked, `status=${res.status} body=${text.slice(0, 140)}`);
}

// ── 3. Sign in as each demo role ─────────────────────────────────────
let member, staff, admin;
try {
  member = await signIn(DEMOS.member);
  staff = await signIn(DEMOS.staff);
  admin = await signIn(DEMOS.admin);
  check('demo sessions established', true,
    `member.role=${member.role} staff.role=${staff.role} admin.role=${admin.role}`);
} catch (e) {
  check('demo sessions established', false, String(e.message));
  process.exit(1);
}

// The role the member account must end up with, captured before any test
// touches it. The restore step in the finally block always writes this back.
const ORIGINAL_MEMBER_ROLE = member.role || 'member';
const ORIGINAL_STAFF_ROLE = staff.role || 'staff';

async function restoreRole(session, role) {
  if (!admin || !session) return;
  await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${session.id}`, {
    method: 'PATCH', headers: admin.headers, body: JSON.stringify({ role }),
  });
}

async function restoreMemberRole() {
  await restoreRole(member, ORIGINAL_MEMBER_ROLE);
}
async function restoreStaffRole() {
  await restoreRole(staff, ORIGINAL_STAFF_ROLE);
}

try {
// ── 4. A member cannot raise their own role ──────────────────────────
{
  const res = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${member.id}`, {
    method: 'PATCH', headers: member.headers, body: JSON.stringify({ role: 'admin' }),
  });
  const text = await res.text();
  const blocked = res.status >= 400;
  check('member cannot self-promote to admin', blocked, `status=${res.status} body=${text.slice(0, 160)}`);
}

// ── 5. Staff cannot self-promote, nor mint an administrator ─────────
{
  const res = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${staff.id}`, {
    method: 'PATCH', headers: staff.headers, body: JSON.stringify({ role: 'admin' }),
  });
  const text = await res.text();
  check('staff cannot self-promote to admin', res.status >= 400, `status=${res.status} body=${text.slice(0, 160)}`);
}
{
  const res = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${member.id}`, {
    method: 'PATCH', headers: staff.headers, body: JSON.stringify({ role: 'admin' }),
  });
  const text = await res.text();
  check('staff cannot promote another account to admin', res.status >= 400, `status=${res.status} body=${text.slice(0, 160)}`);
}

// ── 6. Administrators keep their authority (change + restore) ────────
{
  const up = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${member.id}`, {
    method: 'PATCH', headers: admin.headers, body: JSON.stringify({ role: 'staff' }),
  });
  const down = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${member.id}`, {
    method: 'PATCH', headers: admin.headers, body: JSON.stringify({ role: ORIGINAL_MEMBER_ROLE }),
  });
  const after = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${member.id}&select=role`, { headers: admin.headers });
  const afterRole = (await after.json())?.[0]?.role;
  check('admin can still change an account role and restore it',
    up.ok && down.ok && afterRole === ORIGINAL_MEMBER_ROLE,
    `role ${ORIGINAL_MEMBER_ROLE} -> staff -> ${afterRole} (set=${up.status}, restore=${down.status})`);
}

// ── 7. Anonymous callers cannot insert an administrator profile ──────
{
  const res = await fetch(`${URL_BASE}/rest/v1/profiles`, {
    method: 'POST', headers: anonHeaders,
    body: JSON.stringify({ id: randomUUID(), email: `probe-${Date.now()}@example.com`, name: 'Probe', role: 'admin' }),
  });
  const text = await res.text();
  const blockedByPolicy = /42501|permission denied|row-level security/i.test(text);
  check('anonymous insert of an admin profile is blocked by policy', blockedByPolicy,
    `status=${res.status} body=${text.slice(0, 160)}`);
}

// ── 7b. A logged-in member must not read the master codes directly ──
{
  const res = await fetch(`${URL_BASE}/rest/v1/system_settings?select=staff_access_code,clinic_access_code&limit=1`, { headers: member.headers });
  const text = await res.text();
  const leaked = /STAFF-|CLINIC-/.test(text);
  check('member cannot read master code columns from the table', !leaked, `status=${res.status} body=${text.slice(0, 140)}`);
}

// ── 8. Master codes: staff/admin only ───────────────────────────────
{
  const asMember = await rpc(member.headers, 'fn_get_master_codes');
  check('member cannot read master codes', asMember.status >= 400, `status=${asMember.status} body=${JSON.stringify(asMember.body).slice(0, 140)}`);

  const asAdmin = await rpc(admin.headers, 'fn_get_master_codes');
  const codes = asAdmin.body || {};
  const ok = asAdmin.status === 200 && !!codes.staff && !!codes.provider;
  check('admin can read master codes', ok, `status=${asAdmin.status}`);

  // ── 9. Verification RPC: master code works, bogus code does not ────
  if (ok) {
    const good = await rpc(anonHeaders, 'fn_verify_access_code', { p_code: codes.staff, p_role: 'staff' });
    check('master code verifies through the RPC', good.status === 200 && good.body?.valid === true,
      `status=${good.status} body=${JSON.stringify(good.body).slice(0, 140)}`);

    const bad = await rpc(anonHeaders, 'fn_verify_access_code', { p_code: 'DEFINITELY-NOT-A-CODE-123', p_role: 'staff' });
    check('bogus code is rejected by the RPC', bad.status === 200 && bad.body?.valid === false,
      `status=${bad.status} body=${JSON.stringify(bad.body).slice(0, 140)}`);
  }

  // ── 10. Issued passes verify through the RPC (temporary row) ──────
  const tempId = randomUUID();
  const tempCode = `STAFF-VERIFY-${Date.now().toString().slice(-6)}`;
  const ins = await fetch(`${URL_BASE}/rest/v1/access_codes`, {
    method: 'POST', headers: admin.headers, Prefer: 'return=representation',
    body: JSON.stringify({
      id: tempId, code: tempCode, role: 'staff', recipient_name: 'VERIFY PROBE',
      status: 'active', max_uses: 2, use_count: 0, issued_by: admin.id, issued_by_name: 'verify',
    }),
  });
  check('admin can issue a pass', ins.ok, `status=${ins.status}`);

  if (ins.ok) {
    const v1 = await rpc(anonHeaders, 'fn_verify_access_code', { p_code: tempCode, p_role: 'staff' });
    check('issued pass verifies through the RPC', v1.status === 200 && v1.body?.valid === true,
      `status=${v1.status} body=${JSON.stringify(v1.body).slice(0, 160)}`);

    const v2 = await rpc(anonHeaders, 'fn_verify_access_code', { p_code: tempCode, p_role: 'provider' });
    check('issued pass is rejected for the wrong role', v2.status === 200 && v2.body?.valid === false,
      `status=${v2.status} body=${JSON.stringify(v2.body).slice(0, 140)}`);
  }
  const del = await fetch(`${URL_BASE}/rest/v1/access_codes?id=eq.${tempId}`, { method: 'DELETE', headers: admin.headers });
  check('verification probe row removed', del.ok, `status=${del.status}`);
}
} finally {
  // Always put the demo accounts back the way we found them.
  await restoreMemberRole();
  await restoreStaffRole();
  for (const [label, session, expected] of [['member', member, ORIGINAL_MEMBER_ROLE], ['staff', staff, ORIGINAL_STAFF_ROLE]]) {
    const now = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${session.id}&select=role`, { headers: admin.headers });
    const nowRole = (await now.json())?.[0]?.role;
    check(`${label} demo account restored to '${expected}'`, nowRole === expected, `role=${nowRole}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
