import { JsonRpcProvider, formatEther } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const rpc = process.env.AVALANCHE_RPC_URL;
    if (!rpc) {
        console.error("AVALANCHE_RPC_URL is not set in environment");
        return;
    }
    
    console.log(`Testing RPC Connection to: ${rpc}`);
    const provider = new JsonRpcProvider(rpc);
    
    try {
        const network = await provider.getNetwork();
        console.log(`Network connected successfully! Chain ID: ${network.chainId}`);
        
        const blockNumber = await provider.getBlockNumber();
        console.log(`Current Block Number: ${blockNumber}`);
        
        // Check balance of default ewoq funding wallet
        const walletAddress = '0xd305607510E0Db2c95807173c7A05BEA53c1ed36';
        const balance = await provider.getBalance(walletAddress);
        console.log(`Balance of ewoq validator manager (${walletAddress}): ${formatEther(balance)} LNS`);
        
    } catch (e) {
        console.error("Failed to connect to the Subchain RPC.");
        console.error(e);
    }
}

main().catch(console.error);
