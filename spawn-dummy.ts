import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api/v1';

async function spawnDummy() {
    console.log('🤖 Spawning Dummy Opponent...');

    // 1. Register dummy bot
    const registerRes = await fetch(`${API_BASE}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: `DUMMY_WALLET_NAME`,
            description: 'An automated sparring partner.',
            webhook_url: 'http://not-used'
        })
    });

    if (!registerRes.ok) {
        console.error('Failed to register dummy bot', await registerRes.text());
        return;
    }

    const { api_key, wallet_address } = await registerRes.json() as any;
    console.log(`✅ Dummy registered. Wallet: ${wallet_address} (Name derived from wallet)`);

    // 2. Prepare combat with strategy
    const prepRes = await fetch(`${API_BASE}/agents/prepare-combat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
            points_hp: 15,
            points_attack: 25,
            points_defense: 10,
            strategy: [
                { hp_above: 70, weights: { ATTACK: 50, HEAVY_ATTACK: 30, DEFEND: 10, HEAL: 10 } },
                { hp_above: 35, weights: { ATTACK: 40, HEAVY_ATTACK: 10, DEFEND: 25, HEAL: 25 } },
                { hp_above: 0, weights: { ATTACK: 60, HEAVY_ATTACK: 10, DEFEND: 10, HEAL: 20 } }
            ]
        })
    });

    if (!prepRes.ok) {
        console.error('Failed to prepare combat', await prepRes.text());
        return;
    }

    const prepData = await prepRes.json() as any;
    console.log(`✅ Stats & strategy locked. HP=${prepData.stats.hp} ATK=${prepData.stats.attack} DEF=${prepData.stats.defense}`);

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
        console.error('Failed to join queue', queueData);
    }
}

async function main() {
    for (let i = 0; i < 4; i++) {
        console.log(`\n--- Spawning Bot ${i + 1} of 4 ---`);
        await spawnDummy();
        // İsteğe bağlı, logların daha rahat okunması için kısa bir bekleme
        await new Promise(r => setTimeout(r, 500)); 
    }
}

main().catch(console.error);
