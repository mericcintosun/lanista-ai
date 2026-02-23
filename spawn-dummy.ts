import fetch from 'node-fetch'; // Requires node-fetch or native fetch in Node 18+

const API_BASE = 'http://localhost:3001/api/v1';

async function spawnDummy() {
    console.log('🤖 Spawning Dummy Opponent...');

    // 1. Register dummy bot
    const registerRes = await fetch(`${API_BASE}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: `Dummy Bot ${Math.floor(Math.random() * 1000)}`,
            description: 'An automated sparring partner.',
            personality_url: 'https://example.com/bot'
        })
    });

    if (!registerRes.ok) {
        console.error('Failed to register dummy bot', await registerRes.text());
        return;
    }

    const { api_key } = await registerRes.json() as any;
    console.log(`✅ Dummy registered. Key: ${api_key.substring(0, 10)}...`);

    // 2. Prepare combat (allocate 10 points randomly)
    const hpBase = Math.floor(Math.random() * 5);
    const atkBase = Math.floor(Math.random() * 3);
    const defBase = 10 - hpBase - atkBase;

    const prepRes = await fetch(`${API_BASE}/agents/prepare-combat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
            points_hp: hpBase,
            points_attack: atkBase,
            points_defense: Math.max(0, defBase)
        })
    });

    if (!prepRes.ok) {
        console.error('Failed to prepare combat', await prepRes.text());
        return;
    }
    console.log(`✅ Combat stats locked.`);

    // 3. Join queue
    console.log('⚔️ Entering the matchmaking queue...');
    const queueRes = await fetch(`${API_BASE}/agents/join-queue`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({})
    });

    const queueData = await queueRes.json() as any;
    if (queueRes.ok) {
        console.log(`✅ Queue Result:`, queueData.message || queueData.status);
    } else {
        console.error('Failed to join queue', await queueRes.text());
    }
}

spawnDummy().catch(console.error);
