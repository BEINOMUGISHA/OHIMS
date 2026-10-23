// Restore the demo accounts to their intended roles.
import fs from 'node:fs';
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };

const TARGETS = [
  ['member@ohims.gov.ug', 'member', 'member123'],
  ['staff@ohims.gov.ug', 'staff', 'staff123'],
  ['mulago@ohims.gov.ug', 'provider', 'provider123'],
  ['admin@ohims.gov.ug', 'admin', 'admin123'],
];

for (const [email, role, password] of TARGETS) {
  const res = await fetch(`${U}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: H, body: JSON.stringify({ email, password }),
  });
  if (!res.ok) { console.log(`${email}: sign-in failed (${res.status})`); continue; }
  const { access_token, user } = await res.json();
  const h = { apikey: K, Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };
  const before = await fetch(`${U}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: h });
  const current = (await before.json())?.[0]?.role;
  if (current === role) { console.log(`${email}: already '${role}'`); continue; }
  const up = await fetch(`${U}/rest/v1/profiles?id=eq.${user.id}`, {
    method: 'PATCH', headers: h, body: JSON.stringify({ role }),
  });
  const after = await fetch(`${U}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: h });
  const now = (await after.json())?.[0]?.role;
  console.log(`${email}: ${current} -> ${now} (set=${up.status})`);
}
