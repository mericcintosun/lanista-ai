import { ethers } from 'ethers';

const PASSPORT_ABI = [
  'function mint(address botWallet, address ownerWallet, string calldata metadataURI) external returns (uint256 tokenId)',
  'function updateReputation(address botWallet, uint256 reputationScore, uint32 totalMatches, uint32 wins) external',
  'function getPassportByBotWallet(address botWallet) external view returns (uint256 tokenId, address ownerWallet, uint256 reputationScore, uint32 totalMatches, uint32 wins, string memory metadataURI, uint256 createdAt)',
  'function tokenIdByBot(address) external view returns (uint256)',
];

function getPassportContract(): ethers.Contract | null {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const contractAddress = process.env.AGENT_PASSPORT_CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    return null;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, PASSPORT_ABI, wallet);
}

export async function mintPassport(
  botWallet: string,
  ownerWallet: string | null,
  metadataURI: string
): Promise<{ tokenId: string } | null> {
  const contract = getPassportContract();
  if (!contract) return null;

  if (!botWallet || !ethers.isAddress(botWallet)) return null;

  const owner = ownerWallet && ethers.isAddress(ownerWallet) ? ownerWallet : ethers.ZeroAddress;

  try {
    const tx = await contract.mint(botWallet, owner, metadataURI, { gasLimit: 300_000 });
    await tx.wait();
    const tokenId = await contract.tokenIdByBot(botWallet);
    return { tokenId: String(tokenId) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Passport] mint error:', msg);
    return null;
  }
}

export async function updateReputationOnChain(
  botWallet: string,
  reputationScore: number,
  totalMatches: number,
  wins: number
): Promise<boolean> {
  const contract = getPassportContract();
  if (!contract) return false;

  if (!botWallet || !ethers.isAddress(botWallet)) return false;

  try {
    const tx = await contract.updateReputation(
      botWallet,
      reputationScore,
      totalMatches,
      wins,
      { gasLimit: 150_000 }
    );
    await tx.wait();
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Passport] updateReputation error:', msg);
    return false;
  }
}

export interface PassportData {
  tokenId: string;
  ownerWallet: string;
  reputationScore: number;
  totalMatches: number;
  wins: number;
  metadataURI: string;
  createdAt: string;
}

export async function getPassportByBotWallet(botWallet: string): Promise<PassportData | null> {
  const rpcUrl = process.env.AVALANCHE_RPC_URL;
  const contractAddress = process.env.AGENT_PASSPORT_CONTRACT_ADDRESS;
  if (!rpcUrl || !contractAddress || !botWallet || !ethers.isAddress(botWallet)) return null;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, PASSPORT_ABI, provider);

  try {
    const [tokenId, ownerWallet, reputationScore, totalMatches, wins, metadataURI, createdAt] =
      await contract.getPassportByBotWallet(botWallet);
    if (tokenId === 0n) return null;
    return {
      tokenId: String(tokenId),
      ownerWallet: String(ownerWallet),
      reputationScore: Number(reputationScore),
      totalMatches: Number(totalMatches),
      wins: Number(wins),
      metadataURI: String(metadataURI),
      createdAt: String(createdAt),
    };
  } catch {
    return null;
  }
}
