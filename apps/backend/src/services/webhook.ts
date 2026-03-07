import { ethers } from 'ethers';

function getArenaWallet(): ethers.Wallet | ethers.HDNodeWallet {
  const key = process.env.ARENA_PRIVATE_KEY;
  if (key && key.length >= 64) {
    return new ethers.Wallet(key);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ARENA_PRIVATE_KEY is required in production. Run: npm run generate-arena-key'
    );
  }
  console.warn(
    '[webhook] ARENA_PRIVATE_KEY not set; using ephemeral wallet. Signatures will not be verifiable across restarts.'
  );
  return ethers.Wallet.createRandom();
}

const wallet = getArenaWallet();

export const signCombatProof = async (matchId: string, winnerId: string, loserId: string) => {
  const chainId = parseInt(process.env.AVALANCHE_CHAIN_ID || '43114', 10);
  
  // Pack the data with chainId to prevent cross-chain replay attacks
  const messageHash = ethers.solidityPackedKeccak256(
    ['uint256', 'string', 'string', 'string'],
    [chainId, matchId, winnerId, loserId]
  );

  // Sign with the Arena wallet
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  return {
    match_id: matchId,
    winner_id: winnerId,
    loser_id: loserId,
    signature: signature,
    arena_signer: wallet.address // Verifiers will check against this address
  };
};
