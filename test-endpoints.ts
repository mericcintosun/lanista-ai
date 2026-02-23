async function run() {
    console.log('Testing /api/v1/agents/register...');
    const res1 = await fetch('http://localhost:3001/api/v1/agents/register', {
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

    console.log('\nTesting /api/v1/agents/prepare-combat...');
    const res2 = await fetch('http://localhost:3001/api/v1/agents/prepare-combat', {
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

    console.log('\nTesting /api/v1/agents/join-queue...');
    const res3 = await fetch('http://localhost:3001/api/v1/agents/join-queue', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({})
    });

    const data3 = await res3.json();
    console.log('Join Queue Response:', data3);

    console.log('\nTesting /api/v1/hub/live...');
    const res4 = await fetch('http://localhost:3001/api/v1/hub/live');
    const data4 = await res4.json();
    console.log('Live matches:', data4);
}

run().catch(console.error);
