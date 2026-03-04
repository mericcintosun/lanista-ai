import 'dotenv/config';
import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';

type RegisteredAgent = {
  apiKey: string;
  botId: string;
  name: string;
};

// 200 hard‑coded base bot names (synthetic combinations)
const BOT_BASE_NAMES: string[] = [
  'Aria',
  'Nyx',
  'Vex',
  'Kairo',
  'Nova',
  'Zara',
  'Lynx',
  'Vanta',
  'Coda',
  'Echo',
  'Flux',
  'Ion',
  'Jinx',
  'Kora',
  'Lumen',
  'Mira',
  'Nero',
  'Orion',
  'Pyra',
  'Quill',
  'Riven',
  'Sylph',
  'Titan',
  'Umbra',
  'Vega',
  'Warden',
  'Xero',
  'Yara',
  'Zeph',
  'Axiom',
  'Bishop',
  'Cipher',
  'Drift',
  'Ember',
  'Frost',
  'Glitch',
  'Halo',
  'Iris',
  'Jade',
  'Keen',
  'Loki',
  'Mosaic',
  'Nexus',
  'Onyx',
  'Pulse',
  'Quartz',
  'Rogue',
  'Strata',
  'Talon',
  'Unity',
  'Vesper',
  'Whisper',
  'Xenon',
  'Yield',
  'Zenith',
  'Astra',
  'Binary',
  'Chrome',
  'Delta',
  'Eon',
  'Fable',
  'Ghost',
  'Havoc',
  'Infer',
  'Jolt',
  'Karma',
  'Lyric',
  'Myth',
  'Neon',
  'Obsidian',
  'Proxy',
  'Quanta',
  'Reverie',
  'Static',
  'Trace',
  'Ultra',
  'Vortex',
  'Warp',
  'Xylem',
  'Yonder',
  'Zen',
  'Arc',
  'Blitz',
  'Crux',
  'Dusk',
  'Edge',
  'Fade',
  'Gale',
  'Haze',
  'Ivy',
  'Juno',
  'Kite',
  'Luxe',
  'Muse',
  'Nadir',
  'Omen',
  'Plex',
  'Quirk',
  'Rift',
  'Shard',
  'Tide',
  'Umbrel',
  'Vale',
  'Wire',
  'Xeno',
  'Yuki',
  'Zinc',
  'Aegis',
  'Beacon',
  'Catalyst',
  'Draco',
  'Eclipse',
  'Fragment',
  'Golem',
  'Harbor',
  'Indra',
  'Jasper',
  'Krypton',
  'Lucid',
  'Magnet',
  'Nimbus',
  'Oracle',
  'Phantom',
  'Quiver',
  'Relay',
  'Sentinel',
  'Temple',
  'Vertex',
  'Walker',
  'Xander',
  'Yielda',
  'Zora',
  'Atlas',
  'Boreal',
  'Cinder',
  'Dynamo',
  'Epoch',
  'Fission',
  'Graviton',
  'Helix',
  'Ionis',
  'Jigsaw',
  'Kalix',
  'Lattice',
  'Monarch',
  'NimbusX',
  'Ozone',
  'Parallax',
  'Quantum',
  'Radian',
  'Strider',
  'Tempest',
  'Umbriel',
  'Vector',
  'Waypoint',
  'Xerion',
  'Ypsilon',
  'Zodiac',
  'Aurora',
  'Bolt',
  'Cobalt',
  'Drifter',
  'Emissary',
  'Fractal',
  'Glimmer',
  'Harpy',
  'Ixion',
  'Javelin',
  'Kardinal',
  'Lancer',
  'Mirage',
  'Nymeria',
  'Obex',
  'Pylon',
  'QuantaX',
  'Raptor',
  'Solace',
  'Thorn',
  'Uplink',
  'VectorX',
  'Wisp',
  'Xact',
  'Yttria',
  'Zenko',
  'Arclight',
  'BeaconX',
  'CipherX',
  'Dagger',
  'Eyrie',
  'Fluxion',
  'Gazer',
  'HarborX',
  'IonCore',
  'JadeX',
  'K-Probe',
  'LumenX',
  'Matrix',
  'NovaCore',
  'Omni',
  'PulseX',
  'Quark',
  'Rune',
  'Stellar',
  'TraceX',
  'UmbraX',
  'Vivid',
  'Ward',
  'X-pulse',
  'YaraX',
  'ZenCore',
];

// Tracks how many times each base name has been used in this run.
// If a name is reused, we suffix with incremental numbers: Aria, Aria2, Aria3, ...
const usedNameCounts = new Map<string, number>();

function nextBotName() {
  const base =
    BOT_BASE_NAMES[Math.floor(Math.random() * BOT_BASE_NAMES.length)];
  const currentCount = usedNameCounts.get(base) ?? 0;
  const nextCount = currentCount + 1;
  usedNameCounts.set(base, nextCount);

  return nextCount === 1 ? base : `${base}${nextCount}`;
}

const registeredAgents: RegisteredAgent[] = [];

async function spawnDummy(name: string) {
  console.log(`🤖 Spawning Dummy Opponent: ${name}...`);

  // 1. Register dummy bot
  const registerRes = await fetch(`${API_BASE}/agents/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description: 'An automated sparring partner.',
      webhook_url: 'http://not-used',
    }),
  });

  if (!registerRes.ok) {
    console.error('Failed to register dummy bot', await registerRes.text());
    return;
  }

  const { api_key, bot_id, wallet_address } = (await registerRes.json()) as any;
  console.log(
    `✅ Dummy registered as ${name}. Wallet: ${wallet_address}`,
  );

  registeredAgents.push({
    apiKey: api_key,
    botId: bot_id,
    name,
  });

  // 2. Prepare combat with strategy
  const prepRes = await fetch(`${API_BASE}/agents/prepare-combat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${api_key}`,
    },
    body: JSON.stringify({
      points_hp: 15,
      points_attack: 25,
      points_defense: 10,
      strategy: [
        { hp_above: 70, weights: { ATTACK: 50, HEAVY_ATTACK: 30, DEFEND: 10, HEAL: 10 } },
        { hp_above: 35, weights: { ATTACK: 40, HEAVY_ATTACK: 10, DEFEND: 25, HEAL: 25 } },
        { hp_above: 0, weights: { ATTACK: 60, HEAVY_ATTACK: 10, DEFEND: 10, HEAL: 20 } },
      ],
    }),
  });

  if (!prepRes.ok) {
    console.error('Failed to prepare combat', await prepRes.text());
    return;
  }

  const prepData = (await prepRes.json()) as any;
  console.log(
    `✅ Stats & strategy locked for ${name}. HP=${prepData.stats.hp} ATK=${prepData.stats.attack} DEF=${prepData.stats.defense}`,
  );

  // 3. Join queue
  console.log('⚔️ Entering the matchmaking queue...');
  const queueRes = await fetch(`${API_BASE}/agents/join-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${api_key}`,
    },
    body: JSON.stringify({}),
  });

  const queueData = (await queueRes.json()) as any;
  if (queueRes.ok) {
    console.log(`✅ Queue Result for ${name}:`, queueData.message || queueData.status);
  } else {
    console.error('Failed to join queue', queueData);
  }
}

async function main() {
  const TOTAL = 4;
  for (let i = 0; i < TOTAL; i++) {
    const name = nextBotName();
    console.log(`\n--- Spawning Bot ${i + 1} of ${TOTAL} :: ${name} ---`);
    await spawnDummy(name);
    // İsteğe bağlı, logların daha rahat okunması için kısa bir bekleme
    await new Promise((r) => setTimeout(r, 300));
  }

  const outPath = resolve(process.cwd(), 'dummy-agents.json');
  writeFileSync(outPath, JSON.stringify(registeredAgents, null, 2), 'utf8');
  console.log(`\n📁 Saved ${registeredAgents.length} dummy agents to ${outPath}`);
}

main().catch(console.error);
