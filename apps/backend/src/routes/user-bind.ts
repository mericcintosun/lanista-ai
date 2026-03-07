import express from 'express';
import { supabase } from '../lib/supabase.js';
import crypto from 'crypto';

const router = express.Router();

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
            return res.status(500).json({ error: `Database Error: ${botErr.message}` });
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
        const hashToVerify = crypto.createHash('sha256').update(api_key).digest('hex');
        if (hashToVerify !== bot.api_key_hash) {
            return res.status(403).json({ error: "Invalid API Key. You can only claim this agent if you possess its API Key." });
        }

        // Generate a cryptographically secure 6-character code (LNST-XXXXXX)
        const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
        const bindCode = `LNST-${randomHex}`;

        // Set expiration time to 15 minutes from now
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        // Delete any existing pending requests for this user + bot pair
        await supabase.from('agent_bind_requests').delete().eq('user_id', user.id).eq('bot_id', bot.id);

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

        const { tweet_url } = req.body;
        if (!tweet_url) return res.status(400).json({ error: "tweet_url is required" });

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

        // 3. Fetch Tweet via oEmbed API (No auth required)
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweet_url)}`;
        const oembedRes = await fetch(oembedUrl);
        
        if (!oembedRes.ok) {
            return res.status(400).json({ error: "Could not fetch tweet. Make sure the URL is correct and the account is public." });
        }
        
        const tweetData = await oembedRes.json();
        const tweetHtml = tweetData.html || '';

        // 4. Verify the bind code is in the tweet
        if (!tweetHtml.includes(request.bind_code)) {
            return res.status(400).json({ error: "Binding code not found in the tweet. Make sure you posted the exact code." });
        }

        // 5. Success! Update the bot's owner_id
        const { error: updateErr } = await supabase
            .from('bots')
            .update({ owner_id: user.id })
            .eq('id', request.bot_id);

        if (updateErr) {
            console.error("Bot update error:", updateErr);
            return res.status(500).json({ error: "Failed to claim agent in database" });
        }

        // 6. Cleanup the bind request
        await supabase.from('agent_bind_requests').delete().eq('user_id', user.id);

        res.json({ message: "Agent successfully claimed! It is now bound to your account." });

    } catch (error) {
        console.error("Bind verify error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
