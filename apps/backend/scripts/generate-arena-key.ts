import { Wallet } from 'ethers';

const w = Wallet.createRandom();
console.log('\nAdd this to apps/backend/.env.local (or .env):\n');
console.log(`ARENA_PRIVATE_KEY=${w.privateKey}`);
console.log(`\nArena signer address (for verification): ${w.address}\n`);
