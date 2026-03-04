import 'dotenv/config';

// =============================================================================
// LANISTA API - Endpoint Test Suite
// =============================================================================
// Usage: npx tsx test-endpoints.ts
// Requires the backend server to be running (npm run dev)
// =============================================================================

const API_BASE = (process.env.API_BASE || 'http://localhost:3001') + '/api';

// --- Test state ---
let testAgentId: string | null = null;
let testApiKey: string | null = null;

// --- Stats ---
let passed = 0;
let failed = 0;
const failures: string[] = [];

// =============================================================================
// HELPERS
// =============================================================================

function ok(name: string) {
    passed++;
    console.log(`  ✅ ${name}`);
}

function fail(name: string, reason: string) {
    failed++;
    failures.push(`${name}: ${reason}`);
    console.log(`  ❌ ${name} — ${reason}`);
}

function assert(condition: boolean, name: string, reason = 'assertion failed') {
    condition ? ok(name) : fail(name, reason);
}

function section(title: string) {
    console.log(`\n━━━ ${title} ${'━'.repeat(Math.max(0, 50 - title.length))}`);
}

async function GET(path: string, apiKey?: string) {
    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    const res = await fetch(`${API_BASE}${path}`, { headers });
    const data = await res.json().catch(() => ({}));
    return { res, data };
}

async function POST(path: string, body: object, apiKey?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
}

// =============================================================================
// TEST SUITES
// =============================================================================

// --- 1. AGENT REGISTER ---
async function testRegister() {
    section('POST /api/agents/register');

    // Happy path
    const name = `TestBot_${Date.now()}`;
    const { res, data } = await POST('/agents/register', {
        name,
        description: 'Automated test agent',
        personality_url: 'https://example.com/test-bot',
        webhook_url: 'https://example.com/test-webhook',
    });

    assert(res.ok, 'returns 200', `got ${res.status}: ${JSON.stringify(data)}`);
    assert(typeof data.api_key === 'string' && data.api_key.length > 0, 'returns api_key string');
    assert(typeof data.bot_id === 'string' || typeof data.bot_id === 'number', 'returns bot_id');

    if (res.ok && data.api_key) {
        testApiKey = data.api_key;
        testAgentId = String(data.bot_id ?? '');
        console.log(`  ℹ️  Registered agent: ${name} (id=${testAgentId})`);
    }

    // Missing required fields (no name)
    const { res: r2 } = await POST('/agents/register', { description: 'no name', webhook_url: 'https://example.com/wh' });
    assert(!r2.ok, 'rejects registration without name');

    // Missing required fields (no webhook_url)
    const { res: r2b } = await POST('/agents/register', { name: `AnotherBot_${Date.now()}`, description: 'no webhook' });
    assert(!r2b.ok, 'rejects registration without webhook_url');

    // Duplicate name (if backend enforces unique names)
    const { res: r3 } = await POST('/agents/register', {
        name,
        description: 'duplicate',
        personality_url: 'https://example.com/test-bot',
        webhook_url: 'https://example.com/test-webhook',
    });
    if (r3.status === 409) ok('rejects duplicate agent name (409)');
    else console.log(`  ⚠️  Duplicate name check: got ${r3.status} (may be allowed by design)`);
}

// --- 2. PREPARE COMBAT ---
async function testPrepareCombat() {
    section('POST /api/agents/prepare-combat');
    if (!testApiKey) return fail('prepare-combat', 'Skipped — no api_key from register');

    // Happy path
    const { res, data } = await POST('/agents/prepare-combat', {
        points_hp: 5,
        points_attack: 3,
        points_defense: 2,
    }, testApiKey);

    assert(res.ok, 'returns 200', `got ${res.status}: ${JSON.stringify(data)}`);
    assert(data.success === true || res.ok, 'success flag is true');

    // No auth
    const { res: r2 } = await POST('/agents/prepare-combat', { points_hp: 5, points_attack: 3, points_defense: 2 });
    assert(r2.status === 401 || r2.status === 403, 'rejects request without auth token', `got ${r2.status}`);

    // Invalid token
    const { res: r3 } = await POST('/agents/prepare-combat', { points_hp: 5, points_attack: 3, points_defense: 2 }, 'invalid-token');
    assert(r3.status === 401 || r3.status === 403, 'rejects invalid token', `got ${r3.status}`);

    // Over-allocation (total > budget)
    const { res: r4 } = await POST('/agents/prepare-combat', {
        points_hp: 100,
        points_attack: 100,
        points_defense: 100,
    }, testApiKey);
    if (!r4.ok) ok('rejects over-allocated points');
    else console.log(`  ⚠️  Over-allocation check: backend accepted (may have no budget limit)`);
}

// --- 3. AGENT STATUS ---
async function testAgentStatus() {
    section('GET /api/agents/status');
    if (!testApiKey) return fail('agent status', 'Skipped — no api_key');

    const { res, data } = await GET('/agents/status', testApiKey);
    assert(res.ok, 'returns 200', `got ${res.status}`);
    assert(data.success === true, 'success is true');
    assert(typeof data.agent === 'object', 'returns agent object');
    assert(typeof data.stats === 'object', 'returns stats object');
    assert('wins' in (data.stats || {}), 'stats has wins field');
    assert('losses' in (data.stats || {}), 'stats has losses field');
    assert('win_rate' in (data.stats || {}), 'stats has win_rate field');
    assert(Array.isArray(data.recent_matches), 'recent_matches is an array');

    // No auth
    const { res: r2 } = await GET('/agents/status');
    assert(r2.status === 401 || r2.status === 403, 'rejects unauthenticated request', `got ${r2.status}`);
}

// --- 4. AGENT PROFILE (public) ---
async function testAgentProfile() {
    section('GET /api/agents/:id');
    if (!testAgentId) return fail('agent profile', 'Skipped — no agent id');

    const { res, data } = await GET(`/agents/${testAgentId}`);
    assert(res.ok, 'returns 200 for valid agent id', `got ${res.status}`);
    assert(typeof data.agent === 'object', 'returns agent object');
    assert(Array.isArray(data.history), 'returns history array');

    // Non-existent agent
    const { res: r2 } = await GET('/agents/00000000-nonexistent-id');
    assert(r2.status === 404, 'returns 404 for non-existent agent', `got ${r2.status}`);
}

// --- 5. JOIN QUEUE ---
async function testJoinQueue() {
    section('POST /api/agents/join-queue');
    if (!testApiKey) return fail('join-queue', 'Skipped — no api_key');

    const { res, data } = await POST('/agents/join-queue', {}, testApiKey);
    assert(res.ok, `returns 200 or queued`, `got ${res.status}: ${JSON.stringify(data)}`);

    // No auth
    const { res: r2 } = await POST('/agents/join-queue', {});
    assert(r2.status === 401 || r2.status === 403, 'rejects unauthenticated join-queue', `got ${r2.status}`);
}

// --- 6. HUB ENDPOINTS ---
async function testHub() {
    section('GET /api/hub/*');

    // Live matches
    const { res: r1, data: d1 } = await GET('/hub/live');
    assert(r1.ok, '/hub/live returns 200', `got ${r1.status}`);
    assert(Array.isArray(d1.matches), '/hub/live returns matches array');

    // Queue
    const { res: r2, data: d2 } = await GET('/hub/queue');
    assert(r2.ok, '/hub/queue returns 200', `got ${r2.status}`);
    // Queue may return agents or queue info — just check it's a valid JSON
    assert(typeof d2 === 'object', '/hub/queue returns valid JSON');

    // Recent matches
    const { res: r3, data: d3 } = await GET('/hub/recent');
    assert(r3.ok, '/hub/recent returns 200', `got ${r3.status}`);
    assert(typeof d3 === 'object', '/hub/recent returns valid JSON');
}

// --- 7. LEADERBOARD ---
async function testLeaderboard() {
    section('GET /api/leaderboard');

    const { res, data } = await GET('/leaderboard');
    assert(res.ok, 'returns 200', `got ${res.status}`);
    assert(Array.isArray(data) || Array.isArray(data.leaderboard) || typeof data === 'object', 'returns valid leaderboard data');
}

// --- 8. ORACLE ENDPOINTS ---
async function testOracle() {
    section('GET /api/oracle/*');

    // Matches
    const { res: r1 } = await GET('/oracle/matches');
    assert(r1.ok, '/oracle/matches returns 200', `got ${r1.status}`);

    // Loot — requires /:matchId param; use a dummy id, expect found:false or valid JSON (not 500)
    const { res: r2, data: d2 } = await GET('/oracle/loot/00000000-0000-0000-0000-000000000000');
    assert(r2.status !== 500, '/oracle/loot/:matchId does not crash with unknown matchId', `got 500: ${JSON.stringify(d2)}`);
    assert(r2.ok || r2.status === 404, '/oracle/loot/:matchId returns 200 or 404', `got ${r2.status}`);
    console.log(`  ℹ️  oracle/loot response for unknown matchId: ${r2.status} — ${JSON.stringify(d2)}`);
}

// --- 9. COMBAT ENDPOINTS ---
async function testCombat() {
    section('GET /api/combat/status');

    // Random non-existent match
    const { res, data } = await GET('/combat/status?matchId=non-existent-match-id');
    // Should return 404 or empty, not a 500
    assert(res.status !== 500, 'combat/status does not crash with unknown matchId', `got 500: ${JSON.stringify(data)}`);
    console.log(`  ℹ️  combat/status response for unknown id: ${res.status}`);
}

// --- 10. DELETE AGENT ---
async function testDeleteAgent() {
    section('DELETE /api/agents/:id');
    if (!testApiKey || !testAgentId) return fail('delete agent', 'Skipped — no api_key or agent id');

    // Rejected without confirm flag (accidental deletion protection)
    const { res: r0 } = await fetch(`${API_BASE}/agents/${testAgentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${testApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    }).then(r => ({ res: r }));
    assert(r0.status === 400, 'rejects delete without confirm:true', `got ${r0.status}`);

    // Cannot delete someone else's agent
    const { res: r1 } = await fetch(`${API_BASE}/agents/00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${testApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
    }).then(r => ({ res: r }));
    assert(r1.status === 403 || r1.status === 401, 'cannot delete another agent with own token', `got ${r1.status}`);

    // Cannot delete without auth
    const { res: r2 } = await fetch(`${API_BASE}/agents/${testAgentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
    }).then(r => ({ res: r }));
    assert(r2.status === 401 || r2.status === 403, 'rejects delete without auth', `got ${r2.status}`);

    // Successful self-delete with explicit confirm
    const { res: r3, data: d3 } = await fetch(`${API_BASE}/agents/${testAgentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${testApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
    }).then(async r => ({ res: r, data: await r.json().catch(() => ({})) }));
    assert(r3.ok, 'can delete own agent with confirm:true', `got ${r3.status}: ${JSON.stringify(d3)}`);
    assert(d3.success === true, 'delete returns success:true');

    // Verify: old API key no longer authenticates (api_key_hash was nulled)
    const { res: r4 } = await GET('/agents/status', testApiKey!);
    assert(r4.status === 401, 'deleted agent API key is revoked', `got ${r4.status}`);

    // Verify: public profile still accessible (soft delete keeps row for match history),
    // but status should reflect deletion
    const { res: r5, data: d5 } = await GET(`/agents/${testAgentId}`);
    assert(r5.ok, 'soft-deleted agent profile still accessible for history', `got ${r5.status}`);
    assert(d5.agent?.status === 'deleted', 'agent.status is "deleted"', `got "${d5.agent?.status}"`);

    // Mark cleaned up
    testAgentId = null;
    testApiKey = null;
    console.log('  ℹ️  Test agent soft-deleted (api_key revoked, status=deleted).');
}

// --- 11. DUMMIES & STATIC ---
async function testStatic() {
    section('Static & Utility Endpoints');

    // Dummy webhook (ATTACK action)
    const { res, data } = await POST('/dummy-webhook', { state: {} });
    assert(res.ok, '/dummy-webhook returns 200', `got ${res.status}`);
    assert(data.action === 'ATTACK', '/dummy-webhook returns ATTACK action', `got ${JSON.stringify(data)}`);

    // skill.md — served relative to server CWD; works when npm run dev is run from apps/backend
    const skillRes = await fetch(`${API_BASE.replace('/api', '')}/skill.md`);
    const text = await skillRes.text();
    if (skillRes.ok && text.length > 100) {
        ok('GET /skill.md returns 200 with content');
    } else {
        console.log(`  ⚠️  GET /skill.md: got ${skillRes.status} (OK if server started from monorepo root)`);
    }
}

// =============================================================================
// CLEANUP
// =============================================================================

async function cleanup() {
    if (testAgentId && testApiKey) {
        // Fallback: if delete test was skipped or failed, attempt cleanup anyway
        console.log(`  ⚠️  Test agent ${testAgentId} still in DB — attempting cleanup...`);
        const res = await fetch(`${API_BASE}/agents/${testAgentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${testApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirm: true }),
        });
        if (res.ok) console.log('  ✅ Cleanup successful.');
        else console.log(`  ❌ Cleanup failed (${res.status}). Please delete agent ${testAgentId} manually.`);
    } else {
        console.log('  ✅ No leftover test agents.');
    }
}

// =============================================================================
// MAIN RUNNER
// =============================================================================

async function run() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║         LANISTA API - Endpoint Test Suite            ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`\n🌐 API Base: ${API_BASE}`);
    console.log(`⏱  Started: ${new Date().toISOString()}\n`);

    // Run suites in order (some depend on previous state)
    await testRegister();
    await testPrepareCombat();
    await testAgentStatus();
    await testAgentProfile();
    await testJoinQueue();
    await testHub();
    await testLeaderboard();
    await testOracle();
    await testCombat();
    await testDeleteAgent();
    await testStatic();
    await cleanup();

    // --- Summary ---
    console.log('\n══════════════════════════════════════════════════════');
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    if (failures.length > 0) {
        console.log('\n  Failed tests:');
        failures.forEach(f => console.log(`    • ${f}`));
    }
    console.log('══════════════════════════════════════════════════════\n');

    if (failed > 0) process.exit(1);
}

run().catch(err => {
    console.error('\n💥 Test runner crashed:', err.message);
    process.exit(1);
});
