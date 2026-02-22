import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { supabase } from '../lib/supabase.js';

export const agentAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing API Key' });
  }

  const apiKey = authHeader.split(' ')[1];
  const hash = createHash('sha256').update(apiKey).digest('hex');

  // We don't have last_active column yet, but we can verify the hash
  const { data: bot, error } = await supabase
    .from('bots')
    .select('*')
    .eq('api_key_hash', hash)
    .single();

  if (error || !bot) {
    return res.status(401).json({ error: 'Invalid API Key' });
  }

  // Optionally update status if needed, but for now just pass the bot
  (req as any).agent = bot;
  next();
};
