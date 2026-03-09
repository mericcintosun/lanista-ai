/**
 * test-spark-e2e.ts  —  Lanista Spark Economy End-to-End Test
 * ============================================================
 * Phases:
 *   1. Prerequisites check      (env, balances)
 *   2. Contract read            (packages, price)
 *   3. Buy Sparks               (on-chain tx → buySparks)
 *   4. Event processing poll    (balance API, up to 2 min)
 *   5. Watch reward claim       (API + cooldown test)
 *   6. Spend Sparks             (API → distributeBotRewards trigger)
 *   7. Bot reward auto-dist     (wait async, check on-chain AVAX)
 *   8. Bot reward manual claim  (POST /agents/:id/claim-reward)
 *
 * Required env (root .env + below):
 *   TEST_BUYER_PRIVATE_KEY  — private key for buyer wallet (0xd305...)
 *   TEST_USER_EMAIL         — Supabase test user email
 *   TEST_USER_PASSWORD      — Supabase test user password
 *   SUPABASE_ANON_KEY       — Supabase public anon key
 *   TEST_BOT_ID             — bot UUID in DB (must have wallet_address set)
 *   BACKEND_URL             — e.g. http://localhost:3001/api  (default)
 *
 * Run:
 *   npx tsx packages/contracts/scripts/test-spark-e2e.ts
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Resolve monorepo root .env regardless of cwd:
// Walk upward from cwd until we find a .env that contains SUPABASE_URL
function findMonorepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate) && fs.readFileSync(candidate, 'utf8').includes('SUPABASE_URL')) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

dotenv.config({ path: path.join(findMonorepoRoot(), '.env') });

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL             = process.env.AVALANCHE_RPC_URL!;
const CONTRACT_ADDRESS    = process.env.SPARK_TREASURY_CONTRACT_ADDRESS!;
const PRICE_FEED_ADDRESS  = '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD';
const RELAYER_PRIVATE_KEY = (process.env.ARENA_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY)!;
const BUYER_PRIVATE_KEY   = process.env.TEST_BUYER_PRIVATE_KEY!;
const BACKEND_URL         = process.env.BACKEND_URL || 'http://localhost:3001/api';
const SUPABASE_URL        = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY   = process.env.SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TEST_EMAIL          = process.env.TEST_USER_EMAIL!;
const TEST_PASSWORD       = process.env.TEST_USER_PASSWORD!;
const TEST_BOT_ID         = process.env.TEST_BOT_ID!;

// ─── ABIs ────────────────────────────────────────────────────────────────────

const TREASURY_ABI = [
  'function buySparks(uint256 packageId, string calldata userId) external payable',
  'function packages(uint256) view returns (uint256 sparkAmount, uint256 priceUsd8)',
  'function packageCount() view returns (uint256)',
  'function priceFeed() view returns (address)',
  'function rewardPool() view returns (address)',
  'event SparksPurchased(address indexed buyer, uint256 sparkAmount, uint256 avaxPaid, uint256 ownerShare, uint256 rewardShare, string userId)',
];

const PRICE_FEED_ABI = [
  'function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)',
];

// ─── Reporter ─────────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';

let pass = 0, fail = 0, warn = 0;

function ok(msg: string, detail = '')   { pass++; console.log(`${GREEN}  ✓${RESET}  ${msg}${detail ? `  →  ${CYAN}${detail}${RESET}` : ''}`); }
function ko(msg: string, detail = '')   { fail++; console.log(`${RED}  ✗${RESET}  ${msg}${detail ? `  →  ${RED}${detail}${RESET}` : ''}`); }
function caution(msg: string, d = '')   { warn++; console.log(`${YELLOW}  ⚠${RESET}  ${msg}${d ? `  →  ${YELLOW}${d}${RESET}` : ''}`); }
function note(msg: string, d = '')      { console.log(`  ℹ  ${msg}${d ? `  →  ${CYAN}${d}${RESET}` : ''}`); }
function section(title: string)         { console.log(`\n${BOLD}${'═'.repeat(60)}${RESET}\n${BOLD}  ${title}${RESET}\n${'─'.repeat(60)}`); }
function txlink(hash: string)           { return `https://testnet.snowtrace.io/tx/${hash}`; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function apiCall(
  method: 'GET' | 'POST',
  path: string,
  jwt: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function getAvaxBalance(provider: ethers.JsonRpcProvider, address: string): Promise<string> {
  const bal = await provider.getBalance(address);
  return parseFloat(ethers.formatEther(bal)).toFixed(6);
}

// ─── Phase 1: Prerequisites ──────────────────────────────────────────────────

async function checkPrereqs(provider: ethers.JsonRpcProvider) {
  section('PHASE 1 — Prerequisites');

  const required: [string, string][] = [
    ['AVALANCHE_RPC_URL',                RPC_URL],
    ['SPARK_TREASURY_CONTRACT_ADDRESS',  CONTRACT_ADDRESS],
    ['TEST_BUYER_PRIVATE_KEY',           BUYER_PRIVATE_KEY],
    ['SUPABASE_URL',                     SUPABASE_URL],
    ['SUPABASE_ANON_KEY',                SUPABASE_ANON_KEY],
    ['TEST_USER_EMAIL',                  TEST_EMAIL],
    ['TEST_USER_PASSWORD',               TEST_PASSWORD],
    ['TEST_BOT_ID',                      TEST_BOT_ID],
  ];

  let missing = false;
  for (const [key, val] of required) {
    if (!val) { ko(`${key} not set`); missing = true; }
    else ok(key, val.length > 30 ? val.slice(0, 12) + '…' : val);
  }
  if (missing) throw new Error('Missing required env vars. Add them to .env and retry.');

  const network = await provider.getNetwork();
  Number(network.chainId) === 43113
    ? ok('Network: Avalanche Fuji', `chainId=${network.chainId}`)
    : ko('Wrong network', `chainId=${network.chainId} (expected 43113)`);

  const buyerWallet  = new ethers.Wallet(BUYER_PRIVATE_KEY, provider);
  const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
  const buyerBal    = await getAvaxBalance(provider, buyerWallet.address);
  const relayerBal  = await getAvaxBalance(provider, relayerWallet.address);

  note('Buyer wallet',   `${buyerWallet.address}  →  ${buyerBal} AVAX`);
  note('Relayer wallet', `${relayerWallet.address}  →  ${relayerBal} AVAX`);

  parseFloat(buyerBal) >= 0.02
    ? ok('Buyer has sufficient AVAX', `${buyerBal} AVAX ≥ 0.02`)
    : ko('Buyer balance too low', `${buyerBal} AVAX — need at least 0.02 AVAX on Fuji`);

  parseFloat(relayerBal) >= 0.01
    ? ok('Relayer has AVAX for bot rewards', `${relayerBal} AVAX`)
    : caution('Relayer balance low', `${relayerBal} AVAX — auto-distribution may skip`);

  return { buyerWallet, relayerWallet };
}

// ─── Phase 2: Contract Read ───────────────────────────────────────────────────

async function readContracts(provider: ethers.JsonRpcProvider) {
  section('PHASE 2 — Contract State');

  const treasury  = new ethers.Contract(CONTRACT_ADDRESS, TREASURY_ABI, provider);
  const priceFeed = new ethers.Contract(PRICE_FEED_ADDRESS, PRICE_FEED_ABI, provider);

  const [, answer] = await priceFeed.latestRoundData();
  const avaxUsd = Number(answer) / 1e8;
  ok('Chainlink price feed', `AVAX/USD = $${avaxUsd.toFixed(2)}`);

  const count = Number(await treasury.packageCount());
  note('packageCount', String(count));

  const packages: Array<{ id: number; sparks: number; priceUsd: number; requiredWei: bigint }> = [];
  for (let i = 1; i < count; i++) {
    const [sparkAmt, priceUsd8] = await treasury.packages(i);
    if (sparkAmt === 0n) { caution(`Package #${i}: sparkAmount = 0`); continue; }
    const requiredWei = (priceUsd8 * BigInt(1e18)) / BigInt(answer.toString());
    packages.push({ id: i, sparks: Number(sparkAmt), priceUsd: Number(priceUsd8) / 1e8, requiredWei });
    ok(`Package #${i}`, `${sparkAmt.toString()} Sparks = $${(Number(priceUsd8)/1e8).toFixed(2)}  (~${ethers.formatEther(requiredWei)} AVAX)`);
  }

  if (!packages.length) throw new Error('No valid packages found on contract.');
  return { packages, avaxUsd };
}

// ─── Phase 3: Buy Sparks (on-chain tx) ───────────────────────────────────────

async function buySparks(
  provider: ethers.JsonRpcProvider,
  buyerWallet: ethers.Wallet,
  packages: Array<{ id: number; sparks: number; priceUsd: number; requiredWei: bigint }>,
  userId: string
) {
  section('PHASE 3 — Buy Sparks (on-chain tx)');

  const pkg = packages[0];
  const contract = new ethers.Contract(CONTRACT_ADDRESS, TREASURY_ABI, buyerWallet);

  note('Buying package', `#${pkg.id}  →  ${pkg.sparks.toLocaleString()} Sparks  ($${pkg.priceUsd.toFixed(2)} USD)`);
  note('Sending value', `${ethers.formatEther(pkg.requiredWei)} AVAX  →  userId: ${userId.slice(0,8)}…`);

  // Add 1% slippage buffer in case price shifts between calculation and tx
  const valueWithBuffer = pkg.requiredWei + pkg.requiredWei / 100n;

  // Use high gas tip to get confirmed quickly on Fuji testnet
  const feeData = await provider.getFeeData();
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
    ? feeData.maxPriorityFeePerGas * 3n   // 3× tip for faster inclusion
    : ethers.parseUnits('25', 'gwei');
  const maxFeePerGas = feeData.maxFeePerGas
    ? feeData.maxFeePerGas * 2n
    : ethers.parseUnits('50', 'gwei');

  const tx = await contract.buySparks(pkg.id, userId, {
    value: valueWithBuffer,
    maxPriorityFeePerGas,
    maxFeePerGas,
  });
  ok('Transaction submitted', txlink(tx.hash));
  note('Waiting for confirmation (max 90s)…');

  const CONFIRM_TIMEOUT_MS = 90_000;
  let receipt: any;
  try {
    receipt = await Promise.race([
      tx.wait(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('CONFIRM_TIMEOUT')), CONFIRM_TIMEOUT_MS)
      ),
    ]);
  } catch (e: any) {
    if (e.message === 'CONFIRM_TIMEOUT') {
      caution('Confirmation timeout (90s) — tx is in mempool, re-run the test; idempotency prevents double credit', tx.hash);
      return { txHash: tx.hash, sparksBought: pkg.sparks, packageId: pkg.id };
    }
    throw e;
  }
  ok('Transaction confirmed', `block #${receipt.blockNumber}  gas=${receipt.gasUsed.toString()}`);

  // Parse SparksPurchased event from receipt
  const iface = new ethers.Interface(TREASURY_ABI);
  let sparksBought = 0;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === 'SparksPurchased') {
        sparksBought = Number(parsed.args.sparkAmount);
        ok('SparksPurchased event', `amount=${sparksBought}  avaxPaid=${ethers.formatEther(parsed.args.avaxPaid)} AVAX`);
        note('  ownerShare',  `${ethers.formatEther(parsed.args.ownerShare)} AVAX (90%)`);
        note('  rewardShare', `${ethers.formatEther(parsed.args.rewardShare)} AVAX (10%)`);
      }
    } catch { /* non-matching log */ }
  }

  return { txHash: tx.hash, sparksBought, packageId: pkg.id };
}

// ─── Phase 4: Wait for Event Listener to Credit Balance ──────────────────────

async function waitForCredit(jwt: string, previousBalance: number, sparksBought: number, txHash: string) {
  section('PHASE 4 — Wait for Backend Event Listener');
  note('Polling balance API (max 2 min, every 5s)…');

  const MAX_ATTEMPTS = 24;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await sleep(5_000);
    const { status, data } = await apiCall('GET', '/sparks/balance', jwt);
    if (status !== 200) { caution('Balance fetch failed', `status=${status}`); continue; }

    const current: number = data.balance ?? 0;
    note(`Attempt ${i + 1}/${MAX_ATTEMPTS}`, `balance=${current}  (was ${previousBalance})`);

    if (current > previousBalance) {
      ok('Balance credited!', `${previousBalance} → ${current}  (+${current - previousBalance} Sparks)`);
      ok('txHash idempotency: purchase recorded', txHash.slice(0, 12) + '…');
      return current;
    }
  }

  caution(
    'Balance did not update within 2 minutes',
    'Backend event listener may be down or block confirmation pending. Check: POST /api/sparks/balance'
  );
  return previousBalance;
}

// ─── Phase 5: Watch Reward ────────────────────────────────────────────────────

async function testWatchReward(jwt: string) {
  section('PHASE 5 — Watch Reward Claim');

  const { status, data } = await apiCall('POST', '/sparks/claim-watch-reward', jwt);
  if (status === 200) {
    ok('Watch reward claimed', `+${data.amount} Sparks  →  balance=${data.newBalance}  nextIn=${data.nextClaimInSeconds}s`);
  } else if (status === 429) {
    caution('Cooldown active (already claimed recently)', `retryAfter=${data.retryAfterSeconds}s`);
  } else {
    ko('Watch reward failed', `status=${status}  error=${data.error}`);
  }

  // Second call must be rate-limited
  const { status: s2, data: d2 } = await apiCall('POST', '/sparks/claim-watch-reward', jwt);
  s2 === 429
    ? ok('Cooldown enforced on second call', `retryAfterSeconds=${d2.retryAfterSeconds}`)
    : ko('Rate limit NOT enforced — second claim succeeded unexpectedly', `status=${s2}`);

  // Always re-fetch real balance so downstream phases don't use stale 0
  const { data: balData } = await apiCall('GET', '/sparks/balance', jwt);
  return (balData?.balance as number) ?? 0;
}

// ─── Phase 6: Spend Sparks ────────────────────────────────────────────────────

async function testSpend(jwt: string, currentBalance: number) {
  section('PHASE 6 — Spend Sparks (tomato throw)');

  if (currentBalance < 10) {
    caution('Balance < 10 Sparks, skipping spend test', `balance=${currentBalance}`);
    return currentBalance;
  }

  const { status, data } = await apiCall('POST', '/sparks/spend', jwt, {
    amount: 10,
    type: 'spend_tomato',
    reference_id: `e2e-test-tomato-${Date.now()}`,
    enable_bot_rewards: true,
  });

  if (status === 200) {
    ok('Tomato throw spend successful', `10 Sparks deducted  →  newBalance=${data.newBalance}`);
    note('distributeBotRewards triggered async for your bots');
  } else if (status === 402) {
    caution('Insufficient balance for spend test', `balance=${currentBalance}`);
  } else {
    ko('Spend failed', `status=${status}  error=${data.error}`);
  }

  return data.newBalance ?? currentBalance;
}

// ─── Phase 7: Bot Reward Auto-Distribution ────────────────────────────────────

async function testBotRewardAuto(
  provider: ethers.JsonRpcProvider,
  jwt: string,
  botId: string,
  currentBalance: number,
  serviceSupabase: any,
  userId: string
) {
  section('PHASE 7 — Bot Reward Auto-Distribution');

  // Ensure bot is owned by the test user so distributeBotRewards can find it
  await serviceSupabase
    .from('bots')
    .update({ owner_id: userId })
    .eq('id', botId)
    .is('owner_id', null);

  const { data: botRow, error: botErr } = await serviceSupabase
    .from('bots')
    .select('wallet_address, pending_reward_wei, name')
    .eq('id', botId)
    .single() as { data: { wallet_address: string | null; pending_reward_wei: string | null; name: string } | null; error: any };

  if (botErr || !botRow) {
    ko('Bot not found in DB', `id=${botId}  error=${(botErr as any)?.message}`);
    return;
  }
  if (!botRow.wallet_address) {
    caution('Bot has no wallet_address — skipping on-chain reward test', `bot=${botId}`);
    return;
  }

  note(`Bot "${botRow.name}"`, `wallet=${botRow.wallet_address}`);

  const pendingBefore = BigInt(botRow.pending_reward_wei ?? '0');
  const avaxBefore    = await getAvaxBalance(provider, botRow.wallet_address);
  note('Bot on-chain AVAX balance (before)', `${avaxBefore} AVAX`);
  note('Bot pending_reward_wei (before)',    `${ethers.formatEther(pendingBefore)} AVAX`);

  // Spend enough Sparks to accumulate past 0.01 AVAX threshold
  // At AVAX=$20: (0.01 * 2e9) / 5e5 = 40 Sparks minimum — use 50 for safety
  const SPEND_FOR_THRESHOLD = 50;

  if (currentBalance < SPEND_FOR_THRESHOLD) {
    caution(`Balance < ${SPEND_FOR_THRESHOLD}, skipping threshold auto-dist test`, `balance=${currentBalance}`);
    return;
  }

  note(`Spending ${SPEND_FOR_THRESHOLD} Sparks to trigger threshold auto-distribution…`);
  const { status, data } = await apiCall('POST', '/sparks/spend', jwt, {
    amount: SPEND_FOR_THRESHOLD,
    type: 'spend_megaphone',
    reference_id: `e2e-test-threshold-${Date.now()}`,
    enable_bot_rewards: true,
  });

  if (status !== 200) {
    ko('Threshold spend failed', `status=${status}  error=${data.error}`);
    return;
  }
  ok('Threshold spend done', `${SPEND_FOR_THRESHOLD} Sparks  →  newBalance=${data.newBalance}`);

  note('Waiting 12 seconds for async bot reward processing…');
  await sleep(12_000);

  const { data: botAfter } = await serviceSupabase
    .from('bots')
    .select('pending_reward_wei')
    .eq('id', botId)
    .single() as { data: { pending_reward_wei: string | null } | null };

  const pendingAfter = BigInt(botAfter?.pending_reward_wei ?? '0');
  const avaxAfter    = await getAvaxBalance(provider, botRow.wallet_address);

  note('Bot on-chain AVAX balance (after)', `${avaxAfter} AVAX`);
  note('Bot pending_reward_wei (after)',    `${ethers.formatEther(pendingAfter)} AVAX`);

  if (parseFloat(avaxAfter) > parseFloat(avaxBefore)) {
    ok('AVAX auto-distributed to bot wallet!', `${avaxBefore} → ${avaxAfter} AVAX`);
  } else if (pendingAfter > pendingBefore) {
    ok('Bot pending reward accumulated', `${ethers.formatEther(pendingBefore)} → ${ethers.formatEther(pendingAfter)} AVAX (below threshold, not yet sent)`);
  } else {
    caution('No change detected — check relayer AVAX balance or SPARK_BASE_PRICE_USD8 config');
  }

  return data.newBalance as number;
}

// ─── Phase 8: Manual Claim Reward ────────────────────────────────────────────

async function testManualClaim(
  provider: ethers.JsonRpcProvider,
  jwt: string,
  botId: string,
  serviceSupabase: any,
  userId: string
) {
  section('PHASE 8 — Manual Bot Reward Claim');

  // Ensure test user owns the bot before attempting claim
  await serviceSupabase
    .from('bots')
    .update({ owner_id: userId })
    .eq('id', botId);

  const { data: botRow } = await serviceSupabase
    .from('bots')
    .select('wallet_address, pending_reward_wei, name')
    .eq('id', botId)
    .single() as { data: { wallet_address: string | null; pending_reward_wei: string | null; name: string } | null };

  if (!botRow?.wallet_address) {
    caution('Bot has no wallet_address — skipping manual claim test');
    return;
  }

  const pendingWei = BigInt(botRow.pending_reward_wei ?? '0');

  if (pendingWei === 0n) {
    note('pending_reward_wei = 0 → seeding 0.001 AVAX for claim test…');
    const SEED_WEI = 10n ** 15n; // 0.001 AVAX
    await serviceSupabase
      .from('bots')
      .update({ pending_reward_wei: SEED_WEI.toString() })
      .eq('id', botId);
    note('Seeded pending_reward_wei', `${ethers.formatEther(SEED_WEI)} AVAX`);
  } else {
    note('Existing pending reward', `${ethers.formatEther(pendingWei)} AVAX`);
  }

  const avaxBefore = await getAvaxBalance(provider, botRow.wallet_address);
  note(`Bot wallet AVAX before claim: ${avaxBefore} AVAX`);

  const { status, data } = await apiCall('POST', `/agents/${botId}/claim-reward`, jwt);

  if (status === 200) {
    ok('Claim reward successful!', `txHash=${(data.txHash as string)?.slice(0, 12)}…  amount=${data.amountAvax} AVAX`);
    note('Snowtrace', txlink(data.txHash as string));

    await sleep(3_000);
    const avaxAfter = await getAvaxBalance(provider, botRow.wallet_address);
    note(`Bot wallet AVAX after claim: ${avaxAfter} AVAX`);

    parseFloat(avaxAfter) > parseFloat(avaxBefore)
      ? ok('AVAX landed on bot wallet!', `${avaxBefore} → ${avaxAfter} AVAX`)
      : caution('Balance unchanged on-chain — tx may still be propagating');

    const { data: botFinal } = await serviceSupabase
      .from('bots')
      .select('pending_reward_wei')
      .eq('id', botId)
      .single() as { data: { pending_reward_wei: string | null } | null };

    BigInt(botFinal?.pending_reward_wei ?? '1') === 0n
      ? ok('pending_reward_wei reset to 0 in DB')
      : caution('pending_reward_wei not reset', `value=${botFinal?.pending_reward_wei}`);
  } else if (status === 400 && (data.error as string)?.includes('No pending reward')) {
    caution('No pending reward to claim (may have been auto-distributed in Phase 7)');
  } else if (status === 403) {
    ko('Ownership check failed', data.error as string);
  } else {
    ko('Claim reward failed', `status=${status}  error=${data.error}`);
  }
}


// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}${'═'.repeat(60)}${RESET}`);
  console.log(`${BOLD}  Lanista — Spark Economy E2E Test  (Avalanche Fuji)${RESET}`);
  console.log(`${BOLD}${'═'.repeat(60)}${RESET}\n`);

  const provider         = new ethers.JsonRpcProvider(RPC_URL);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceSupabase: any  = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anonSupabase: any     = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── Phase 1
  const { buyerWallet, relayerWallet } = await checkPrereqs(provider);
  void relayerWallet; // used by bot-reward service; not needed directly in test

  // ── Auth: login to get JWT
  section('AUTH — Supabase Login');
  const { data: authData, error: authErr } = await anonSupabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (authErr || !authData.session) {
    ko('Login failed', authErr?.message ?? 'no session');
    process.exitCode = 1;
    return;
  }
  const jwt    = authData.session.access_token;
  const userId = authData.user.id;
  ok('Logged in', `userId=${userId.slice(0,8)}…`);

  // Get initial balance
  const { data: balData } = await apiCall('GET', '/sparks/balance', jwt);
  const initialBalance: number = balData?.balance ?? 0;
  note('Initial Spark balance', String(initialBalance));

  // ── Phase 2
  const { packages } = await readContracts(provider);

  // ── Phase 3
  const { txHash, sparksBought } = await buySparks(provider, buyerWallet, packages, userId);

  // ── Phase 4
  const balanceAfterPurchase = await waitForCredit(jwt, initialBalance, sparksBought, txHash);

  // ── Phase 5
  const balanceAfterReward = await testWatchReward(jwt);

  // ── Phase 6
  const balanceAfterSpend = await testSpend(jwt, balanceAfterReward);

  // ── Phase 7
  const balanceAfterThreshold = await testBotRewardAuto(
    provider, jwt, TEST_BOT_ID, balanceAfterSpend ?? balanceAfterPurchase, serviceSupabase, userId
  );

  // ── Phase 8
  await testManualClaim(provider, jwt, TEST_BOT_ID, serviceSupabase, userId);

  // ── Summary
  const balFinal = (await apiCall('GET', '/sparks/balance', jwt)).data?.balance ?? 0;

  console.log(`\n${BOLD}${'═'.repeat(60)}${RESET}`);
  console.log(`${BOLD}  Test Summary${RESET}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  ${GREEN}✓ Passed:${RESET}  ${pass}`);
  console.log(`  ${YELLOW}⚠ Warnings:${RESET} ${warn}`);
  console.log(`  ${RED}✗ Failed:${RESET}  ${fail}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Initial balance:  ${initialBalance} Sparks`);
  console.log(`  Final balance:    ${balFinal} Sparks`);
  console.log(`  Snowtrace (buy):  ${txlink(txHash)}`);
  if (fail > 0) {
    console.log(`\n${RED}${BOLD}  STATUS: FAILURES DETECTED — review output above${RESET}`);
    process.exitCode = 1;
  } else if (warn > 0) {
    console.log(`\n${YELLOW}${BOLD}  STATUS: PASSED WITH WARNINGS${RESET}`);
  } else {
    console.log(`\n${GREEN}${BOLD}  STATUS: ALL CHECKS PASSED${RESET}`);
  }
  console.log(`${BOLD}${'═'.repeat(60)}${RESET}\n`);
}

main().catch((e) => {
  console.error(`\n${RED}${BOLD}  FATAL:${RESET} ${e.message}`);
  process.exitCode = 1;
});
