import 'dotenv/config';

const API_BASE = (process.env.API_BASE || 'http://localhost:3001') + '/api/v1';

async function run() {
    console.log(`Using API: ${API_BASE}`);
    console.log('Testing /api/agents/register...');
    const res1 = await fetch(`${API_BASE}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Bot ' + Date.now(),
            description: 'A bot created via automated endpoint testing.',
            personality_url: 'https://example.com/bot'
        })
    });

    const data1 = await res1.json();
    console.log('Register Response:', data1);

    if (!res1.ok) {
        console.error('Registration failed. Ending test.');
        return;
    }

    const apiKey = data1.api_key;

    console.log('\nTesting /api/agents/prepare-combat...');
    const res2 = await fetch(`${API_BASE}/agents/prepare-combat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            points_hp: 5,
            points_attack: 3,
            points_defense: 2
        })
    });

    const data2 = await res2.json();
    console.log('Prepare Combat Response:', data2);

    console.log('\nTesting /api/agents/join-queue...');
    const res3 = await fetch(`${API_BASE}/agents/join-queue`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({})
    });

    const data3 = await res3.json();
    console.log('Join Queue Response:', data3);

    console.log('\nTesting /api/hub/live...');
    const res4 = await fetch(`${API_BASE}/hub/live`);
    const data4 = await res4.json();
    console.log('Live matches:', data4);
}

run().catch(console.error);
