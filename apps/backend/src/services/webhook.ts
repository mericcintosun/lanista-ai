import { ethers } from 'ethers';

// Sunucunun güvenli cüzdanı (Örn: 0xLanistaArena...)
// Fallback olarak rastgele bir hesap oluşturuyoruz ki env yokken çökmesin
const ARENA_PRIVATE_KEY = process.env.ARENA_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey;
const wallet = new ethers.Wallet(ARENA_PRIVATE_KEY);

export const signCombatProof = async (matchId: string, winnerId: string, loserId: string) => {
  // Veriyi paketle (Solidity'deki keccak256(abi.encodePacked(...)) mantığı)
  const messageHash = ethers.solidityPackedKeccak256(
    ['string', 'string', 'string'],
    [matchId, winnerId, loserId]
  );
  
  // Arena cüzdanı ile imzala
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));
  
  return {
    match_id: matchId,
    winner_id: winnerId,
    loser_id: loserId,
    signature: signature,
    arena_signer: wallet.address // Doğrulayıcılar bu adrese bakacak
  };
};
