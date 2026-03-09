import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import WDK from '@tetherto/wdk';
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import { supabase } from '../../lib/supabase.js';
import { generateApiKey } from '../../services/auth.js';
import { encrypt } from '../../services/crypto.js';
import { fetchPersonality, isUrlAllowed } from '../../services/agent-personality.js';
import { respondError } from '../shared.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many registrations from this IP, please try again after 15 minutes." }
});

// Creates a new bot with WDK wallet and API key
router.post('/', registerLimiter, async (req: any, res: any) => {
    const { name, description, personality_url, webhook_url } = req.body;
    if (!name || typeof name !== 'string' || name.length > 100) {
        return res.status(400).json({ error: "Missing or invalid 'name'. Maximum length is 100 characters." });
    }
    
    if (description && (typeof description !== 'string' || description.length > 500)) {
        return res.status(400).json({ error: "Description must be a string under 500 characters." });
    }

    if (webhook_url && (typeof webhook_url !== 'string' || webhook_url.length > 500)) {
        return res.status(400).json({ error: "'webhook_url' exceeds length limits." });
    }

    if (webhook_url && !isUrlAllowed(webhook_url)) {
        return res.status(400).json({ error: "Invalid webhook URL. Internal/Localhost URLs are not allowed." });
    }

    try {
        const botId = uuidv4();
        const { apiKey, hash } = generateApiKey(botId);

        if (!process.env.SUPABASE_URL) {
            return res.status(503).json({ error: "Database not connected. Registration offline." });
        }

        const seedPhrase = WDK.getRandomSeedPhrase();
        const encryptedPrivateKey = encrypt(seedPhrase);

        // Generate wallet address via WDK
        const wdk = new WDK(seedPhrase);
        wdk.registerWallet('evm', WalletManagerEvm as any, { rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc', chainId: 43114 } as any);
        const evmAccount = await wdk.getAccount('evm');
        const walletAddress = (evmAccount as any)._account.address || (evmAccount as any).address;

        // If no name provided or special flag sent, derive name from wallet address
        const botName = name === 'DUMMY_WALLET_NAME' ? walletAddress.slice(2, 6).toLowerCase() : name;

        const finalAvatarUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(botName)}`;

        const { data, error } = await supabase.from('bots').insert({
            id: botId,
            name: botName,
            description,
            personality_url,
            webhook_url,
            avatar_url: finalAvatarUrl,
            api_key_hash: hash,
            wallet_address: walletAddress,
            encrypted_private_key: encryptedPrivateKey,
            status: 'active',
            hp: 100,
            attack: 10,
            defense: 10,
            elo: 0,
            wins: 0,
            total_matches: 0
        }).select().single();

        if (error) {
            console.error("Agent registration error:", error);
            return res.status(400).json({ error: "Registration failed. Check your input." });
        }

        if (process.env.AGENT_PASSPORT_CONTRACT_ADDRESS) {
            try {
                const { blockchainQueue } = await import('../../engine/blockchain-worker.js');
                const baseUrl = (process.env.API_PUBLIC_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
                const metadataURI = baseUrl
                    ? `${baseUrl}/api/nft/passport-metadata/by-wallet/${encodeURIComponent(walletAddress)}`
                    : '';
                await blockchainQueue.add('mint-passport', {
                    botWallet: walletAddress,
                    ownerWallet: null,
                    metadataURI
                }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
            } catch (e) {
                console.warn('[Register] Passport mint queue error:', (e as Error)?.message);
            }
        }

        res.json({
            message: "Welcome to Lanista Arena, Agent.",
            api_key: apiKey,
            bot_id: data.id,
            wallet_address: walletAddress
        });
    } catch (err: any) {
        respondError(res, 500, "Registration failed.", err);
    }
});

export default router;
