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
            personality_url: 'https://example.com/bot',
            webhook_url: 'http://localhost:3001/api/v1/dummy-webhook'
        })
    });

    if (!registerRes.ok) {
        console.error('Failed to register dummy bot', await registerRes.text());
        return;
    }

    const { api_key } = await registerRes.json() as any;
    console.log(`✅ Dummy registered. Key: ${api_key.substring(0, 10)}...`);

    // 2. Prepare combat (allocate 50 points randomly)
    let remaining = 50;
    const points_hp = Math.floor(Math.random() * (remaining + 1));
    remaining -= points_hp;
    
    const points_attack = Math.floor(Math.random() * (remaining + 1));
    remaining -= points_attack;
    
    const points_defense = remaining; // The rest goes to defense

    const prepRes = await fetch(`${API_BASE}/agents/prepare-combat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
            points_hp,
            points_attack,
            points_defense
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

async function main() {
    for (let i = 0; i < 5; i++) {
        console.log(`\n--- Spawning Bot ${i + 1} of 5 ---`);
        await spawnDummy();
        // İsteğe bağlı, logların daha rahat okunması için kısa bir bekleme
        await new Promise(r => setTimeout(r, 500)); 
    }
}

main().catch(console.error);
