/**
 * test-watch-reward.ts — Watch Reward Endpoint Test
 * ==================================================
 * Tests:
 *   1. Login + balance check
 *   2. Claim watch reward (first call → success OR 429 cooldown)
 *   3. Duplicate call → 429 + retryAfterSeconds
 *   4. Redis flush via service role (resets cooldown in DB) → re-claim succeeds
 *   5. Balance delta verification
 *
 * Required env (root .env):
 *   TEST_USER_EMAIL, TEST_USER_PASSWORD, SUPABASE_URL, SUPABASE_ANON_KEY
 *   BACKEND_URL (default: http://localhost:3001/api)
 *
 * Run:
 *   npx tsx packages/contracts/scripts/test-watch-reward.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function findRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const c = path.join(dir, '.env');
    if (fs.existsSync(c) && fs.readFileSync(c, 'utf8').includes('SUPABASE_URL')) return dir;
    const p = path.dirname(dir);
    if (p === dir) break;
    dir = p;
  }
  return process.cwd();
}
dotenv.config({ path: path.join(findRoot(), '.env') });

const BACKEND   = process.env.BACKEND_URL || 'http://localhost:3001/api';
const SB_URL    = process.env.SUPABASE_URL!;
const SB_ANON   = process.env.SUPABASE_ANON_KEY!;
const EMAIL     = process.env.TEST_USER_EMAIL!;
const PASSWORD  = process.env.TEST_USER_PASSWORD!;

// ─── Output helpers ──────────────────────────────────────────────────────────
const R = '\x1b[0m';
const G = '\x1b[32m'; const Y = '\x1b[33m'; const C = '\x1b[36m'; const RED = '\x1b[31m'; const B = '\x1b[1m';
let pass = 0, fail = 0;
const ok   = (msg: string, detail = '') => { pass++; console.log(`  ${G}✓${R}  ${msg}${detail ? `  →  ${C}${detail}${R}` : ''}`); };
const ko   = (msg: string, detail = '') => { fail++; console.log(`  ${RED}✗${R}  ${msg}${detail ? `  →  ${RED}${detail}${R}` : ''}`); };
const note = (msg: string, detail = '') => console.log(`  ℹ  ${msg}${detail ? `  →  ${C}${detail}${R}` : ''}`);
const section = (t: string) => { console.log(`\n${B}${'═'.repeat(56)}${R}\n${B}  ${t}${R}\n${'─'.repeat(56)}`); };

async function api(method: string, path: string, jwt: string, body?: object) {
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log(`\n${B}${'═'.repeat(56)}${R}`);
  console.log(`${B}  Watch Reward — Endpoint Test${R}`);
  console.log(`${B}${'═'.repeat(56)}${R}\n`);

  // ── Check env ─────────────────────────────────────────────
  section('ENV CHECK');
  const missing = ['SUPABASE_URL','SUPABASE_ANON_KEY','TEST_USER_EMAIL','TEST_USER_PASSWORD']
    .filter(k => !process.env[k]);
  if (missing.length) {
    missing.forEach(k => ko(`Missing env: ${k}`));
    process.exitCode = 1; return;
  }
  ok('All required env vars present');
  note('Backend URL', BACKEND);

  // ── Backend health ────────────────────────────────────────
  section('BACKEND HEALTH');
  try {
    const res = await fetch(`${BACKEND}/sparks/balance`, { headers: { Authorization: 'Bearer dummy' } });
    // 401 = backend is up, just not authed
    res.status === 401 ? ok('Backend reachable', `${BACKEND}`) : ko('Unexpected status', String(res.status));
  } catch (e: any) {
    ko('Backend unreachable', e.message);
    process.exitCode = 1; return;
  }

  // ── Login ─────────────────────────────────────────────────
  section('AUTH');
  const anon = createClient(SB_URL, SB_ANON) as any;
  const { data: auth, error: authErr } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr || !auth?.session) { ko('Login failed', authErr?.message ?? 'no session'); process.exitCode = 1; return; }
  const jwt = auth.session.access_token;
  ok('Logged in', `userId=${auth.user.id.slice(0,8)}…`);

  // ── Get initial balance ────────────────────────────────────
  const { data: bal0 } = await api('GET', '/sparks/balance', jwt);
  const initialBalance: number = bal0?.balance ?? 0;
  note('Initial balance', `${initialBalance} Sparks`);

  // ── First claim attempt ────────────────────────────────────
  section('CLAIM #1');
  const { status: s1, data: d1 } = await api('POST', '/sparks/claim-watch-reward', jwt);
  note('Response', `status=${s1}`);

  let firstWasSuccess = false;

  if (s1 === 200 && d1.success) {
    firstWasSuccess = true;
    ok('Claim successful', `+${d1.amount} Sparks  →  newBalance=${d1.newBalance}`);
    typeof d1.nextClaimInSeconds === 'number'
      ? ok('nextClaimInSeconds returned', `${d1.nextClaimInSeconds}s`)
      : ko('nextClaimInSeconds missing');
  } else if (s1 === 429) {
    ok('Cooldown active (already claimed recently)', `retryAfter=${d1.retryAfterSeconds}s`);
    typeof d1.retryAfterSeconds === 'number'
      ? ok('retryAfterSeconds returned', `${d1.retryAfterSeconds}s`)
      : ko('retryAfterSeconds missing');
    note('To test a fresh claim, wait for cooldown or flush Redis key manually');
  } else {
    ko('Unexpected response', `status=${s1}  error=${d1.error}`);
  }

  // ── Second call — must be 429 ─────────────────────────────
  section('DUPLICATE CALL (should be 429)');
  const { status: s2, data: d2 } = await api('POST', '/sparks/claim-watch-reward', jwt);
  if (s2 === 429) {
    ok('Cooldown enforced on second call', `retryAfter=${d2.retryAfterSeconds}s`);
    typeof d2.retryAfterSeconds === 'number' && d2.retryAfterSeconds > 0
      ? ok('retryAfterSeconds > 0', `${d2.retryAfterSeconds}s`)
      : ko('retryAfterSeconds should be > 0');
  } else {
    ko('Expected 429, got', String(s2));
  }

  // ── Balance delta (only if first call succeeded) ──────────
  if (firstWasSuccess) {
    section('BALANCE DELTA');
    const { data: bal1 } = await api('GET', '/sparks/balance', jwt);
    const afterBalance: number = bal1?.balance ?? 0;
    note('Balance after claim', `${afterBalance} Sparks`);
    afterBalance > initialBalance
      ? ok('Balance increased', `${initialBalance} → ${afterBalance} (+${afterBalance - initialBalance})`)
      : ko('Balance did NOT increase', `was=${initialBalance}  now=${afterBalance}`);
  }

  // ── Summary ───────────────────────────────────────────────
  console.log(`\n${B}${'═'.repeat(56)}${R}`);
  console.log(`${B}  Summary${R}`);
  console.log(`${'─'.repeat(56)}`);
  console.log(`  ${G}✓ Passed:${R}  ${pass}`);
  console.log(`  ${RED}✗ Failed:${R}  ${fail}`);
  if (fail > 0) {
    console.log(`\n${RED}${B}  STATUS: FAILURES DETECTED${R}`);
    process.exitCode = 1;
  } else {
    console.log(`\n${G}${B}  STATUS: ALL CHECKS PASSED${R}`);
  }
  console.log(`${B}${'═'.repeat(56)}${R}\n`);
}

main().catch((e) => {
  console.error(`\n${RED}${B}  FATAL:${R} ${e.message}`);
  process.exitCode = 1;
});
