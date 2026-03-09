import type { Request, Response, NextFunction } from 'express';
import { createHash, pbkdf2Sync } from 'crypto';
import { supabase } from '../lib/supabase.js';

export const agentAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing API Key' });
  }

  const apiKey = authHeader.split(' ')[1];
  let bot;

  if (apiKey.includes('.')) {
    const [botId, secret] = apiKey.split('.');
    if (!botId || !secret) return res.status(401).json({ error: 'Invalid API Key format' });

    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .single();

    if (error || !data || !data.api_key_hash?.includes(':')) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    const [salt, storedHash] = data.api_key_hash.split(':');
    const hashToVerify = pbkdf2Sync(secret, salt, 10000, 64, 'sha512').toString('hex');

    if (hashToVerify === storedHash) {
      bot = data;
    }
  } else {
    // Legacy SHA-256 Support
    const hash = createHash('sha256').update(apiKey).digest('hex');
    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .eq('api_key_hash', hash)
      .single();
    
    if (!error && data) {
      bot = data;
    }
  }

  if (!bot) {
    return res.status(401).json({ error: 'Invalid API Key' });
  }

  // Optionally update status if needed, but for now just pass the bot
  (req as any).agent = bot;
  next();
};
