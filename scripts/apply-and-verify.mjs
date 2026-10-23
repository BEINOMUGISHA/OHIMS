// =====================================================================
// OHIMS — apply the security hardening patch and verify it.
//
//   node scripts/apply-and-verify.mjs
//
// Needs a Supabase personal access token (Dashboard → Account → Tokens):
//   - in process.env.SUPABASE_ACCESS_TOKEN, or
//   - in .env.local as SUPABASE_ACCESS_TOKEN=<token>
//
// It executes scripts/apply-hardening.sql through the Supabase Management
// API, prints the confirmation row, then runs the verification suite.
// =====================================================================
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const env = {};
for (const file of ['.env.local']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
const ref = (url.match(/https:\/\/([a-z]{20})\.supabase\.co/) || [])[1];

if (!token) {
  console.error('\nMissing SUPABASE_ACCESS_TOKEN.');
  console.error('Create one at https://supabase.com/dashboard/account/tokens and either');
  console.error('  - export SUPABASE_ACCESS_TOKEN=<token>, or');
  console.error('  - append SUPABASE_ACCESS_TOKEN=<token> to .env.local\n');
  process.exit(2);
}
if (!ref) {
  console.error(`Could not derive the project ref from "${url}".`);
  process.exit(2);
}

const sql = fs.readFileSync('scripts/apply-hardening.sql', 'utf8');

console.log(`\n══ Applying security hardening to ${ref} ══\n`);
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});

const body = await res.text();
console.log(`HTTP ${res.status}`);
try {
  const parsed = JSON.parse(body);
  console.log(JSON.stringify(parsed, null, 2));
  if (!res.ok) {
    console.error('\nThe patch did not apply. Fix the error above and re-run.');
    process.exit(1);
  }
} catch {
  console.log(body);
  if (!res.ok) process.exit(1);
}

console.log('\n══ Running verification suite ══\n');
const verify = spawnSync(process.execPath, ['scripts/verify-security.mjs'], { stdio: 'inherit' });
process.exit(verify.status ?? 1);
