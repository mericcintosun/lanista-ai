import express from 'express';
import { supabase } from '../lib/supabase.js';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const bindLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15, // Max 15 attempts per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many bind requests from this IP, please try again later." }
});

router.use(bindLimiter);

router.post('/generate', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "No token provided" });
        const token = authHeader.replace('Bearer ', '');

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: "Invalid token" });

        const { bot_identifier, api_key } = req.body;
        if (!bot_identifier) return res.status(400).json({ error: "Agent ID or Name is required. You must specify which agent to claim." });
        if (!api_key) return res.status(400).json({ error: "Agent's API Key is required to authorize the claim." });

        // Check if bot exists and is unowned (search by ID or Name)
        let query = supabase.from('bots').select('id, owner_id, name, api_key_hash');
        
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bot_identifier);
        if (isUuid) {
            query = query.eq('id', bot_identifier);
        } else {
            query = query.ilike('name', bot_identifier);
        }

        const { data: bots, error: botErr } = await query;
        if (botErr) {
            console.error("Database query error:", botErr.message);
            return res.status(500).json({ error: "Internal database error occurred while querying agent." });
        }
        
        if (!bots || bots.length === 0) {
            return res.status(404).json({ error: "Agent not found. Make sure you typed the exact name or ID." });
        }
        
        if (!isUuid && bots.length > 1) {
            return res.status(400).json({ error: `Found ${bots.length} agents named "${bot_identifier}". Please use the precise Agent ID (UUID) instead of the name.` });
        }

        const bot = bots[0];

        if (bot.owner_id) {
            return res.status(400).json({ error: "Agent is already claimed by someone else." });
        }

        // Verify API Key
        let isValidKey = false;
        if (api_key.includes('.')) {
            const [keyBotId, secret] = api_key.split('.');
            if (bot.api_key_hash?.includes(':')) {
                const [salt, storedHash] = bot.api_key_hash.split(':');
                const hashToVerify = crypto.pbkdf2Sync(secret, salt, 10000, 64, 'sha512').toString('hex');
                if (hashToVerify === storedHash) {
                    isValidKey = true;
                }
            }
        } else {
            // Legacy SHA-256 Support
            const hashToVerify = crypto.createHash('sha256').update(api_key).digest('hex');
            if (hashToVerify === bot.api_key_hash) {
                isValidKey = true;
            }
        }

        if (!isValidKey) {
            return res.status(403).json({ error: "Invalid API Key. You can only claim this agent if you possess its API Key." });
        }

        // Generate a cryptographically secure 8-character hex code (approx 4.2 billion combinations)
        const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
        const bindCode = `LNST-${randomHex}`;

        // Set expiration time to 15 minutes from now
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        // Delete ALL existing pending requests for this user to enforce single active request and prevent race condition anomalies
        await supabase.from('agent_bind_requests').delete().eq('user_id', user.id);

        // Insert new bind request
        const { error: insertErr } = await supabase.from('agent_bind_requests').insert({
            user_id: user.id,
            bot_id: bot.id,
            bind_code: bindCode,
            expires_at: expiresAt.toISOString()
        });

        if (insertErr) {
            console.error("Insert bind req error:", insertErr);
            return res.status(500).json({ error: "Failed to create bind request" });
        }

        res.json({ message: "Bind code generated", bind_code: bindCode });
    } catch (error) {
        console.error("Bind generate error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "No token provided" });
        const token = authHeader.replace('Bearer ', '');

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: "Invalid token" });

        const { tweet_url, twitter_handle } = req.body;
        if (!tweet_url) return res.status(400).json({ error: "tweet_url is required" });
        if (!twitter_handle) return res.status(400).json({ error: "twitter_handle is required to verify ownership" });

        // 1. Get the pending bind request for this user
        const { data: request, error: reqErr } = await supabase
            .from('agent_bind_requests')
            .select('bot_id, bind_code, expires_at')
            .eq('user_id', user.id)
            .single();

        if (reqErr || !request) {
            return res.status(404).json({ error: "No active binding request found. Please generate a new code." });
        }

        // 2. Check expiration
        if (new Date(request.expires_at) < new Date()) {
            await supabase.from('agent_bind_requests').delete().eq('user_id', user.id);
            return res.status(400).json({ error: "Binding code expired (15 minutes limit). Please generate a new code." });
        }

        // 3. Fetch Tweet via oEmbed API (No auth required) with Timeout protection
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweet_url)}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout
        
        let oembedRes;
        try {
            oembedRes = await fetch(oembedUrl, { signal: controller.signal });
        } catch (fetchErr) {
            clearTimeout(timeoutId);
            return res.status(408).json({ error: "X (Twitter) API response timed out. Please try again." });
        }
        clearTimeout(timeoutId);
        
        if (!oembedRes.ok) {
            return res.status(400).json({ error: "Could not fetch tweet. Make sure the URL is correct and the account is public." });
        }
        
        const tweetData = await oembedRes.json();
        const tweetHtml = tweetData.html || '';

        const authorUrl = tweetData.author_url || '';
        const authorMatch = authorUrl.match(/twitter\.com\/([^/]+)/i) || authorUrl.match(/x\.com\/([^/]+)/i);
        if (!authorMatch || authorMatch[1].toLowerCase() !== twitter_handle.toLowerCase().replace('@', '')) {
            return res.status(400).json({ error: "Tweet author does not match the provided X handle. You can only claim bots from your own account." });
        }

        // 4. Verify the bind code is in the tweet
        if (!tweetHtml.includes(request.bind_code)) {
            return res.status(400).json({ error: "Binding code not found in the tweet. Make sure you posted the exact code." });
        }

        // 5. Success! Update the bot's owner_id
        const { data: updateData, error: updateErr } = await supabase
            .from('bots')
            .update({ owner_id: user.id })
            .eq('id', request.bot_id)
            .is('owner_id', null)
            .select();

        if (updateErr) {
            console.error("Bot update error:", updateErr);
            return res.status(500).json({ error: "Failed to claim agent in database" });
        }

        if (!updateData || updateData.length === 0) {
            return res.status(400).json({ error: "Agent claim failed. It may have already been claimed by someone else." });
        }

        // 6. Automatically upgrade user role to 'commander' if they were an observer
        await supabase
            .from('profiles')
            .update({ role: 'commander' })
            .eq('id', user.id);

        // 7. Cleanup the bind request
        await supabase.from('agent_bind_requests').delete().eq('user_id', user.id);

        res.json({ message: "Agent successfully claimed! You are now a recognized Tactical Commander." });

    } catch (error) {
        console.error("Bind verify error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
