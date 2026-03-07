import { Router } from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';
import { ethers } from 'ethers';
import sharp from 'sharp';
import axios from 'axios';
import { supabase } from '../../lib/supabase.js';
import { respondError } from '../shared.js';

const router = Router();

const __dir = dirname(fileURLToPath(import.meta.url));

function normalizeWallet(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  try {
    return ethers.getAddress(t);
  } catch {
    return null;
  }
}

function getTemplatePath(): string | null {
  const candidates = [
    resolve(__dir, '../../../../frontend/public/assets/passport-template.png'),
    resolve(__dir, '../../../frontend/public/assets/passport-template.png'),
    resolve(process.cwd(), 'apps/frontend/public/assets/passport-template.png'),
    resolve(process.cwd(), 'frontend/public/assets/passport-template.png'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

const AVATAR_SIZE = 320;
const AVATAR_LEFT = 100;
const AVATAR_TOP = 340;

/**
 * Composite passport image: template + circular avatar.
 * GET /api/nft/passport-image/by-wallet/:wallet
 */
router.get('/by-wallet/:wallet', async (req, res) => {
  try {
    const raw = req.params.wallet;
    const wallet = normalizeWallet(raw);
    if (!wallet) return res.status(400).json({ error: 'Invalid wallet address' });

    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, name, avatar_url')
      .eq('wallet_address', wallet)
      .maybeSingle();

    if (error) {
      respondError(res, 500, 'Failed to fetch agent.', error);
      return;
    }
    if (!bot) return res.status(404).json({ error: 'Agent not found' });

    const templatePath = getTemplatePath();
    if (!templatePath) {
      if (bot.avatar_url) {
        const r = await axios.get(bot.avatar_url, { responseType: 'arraybuffer', timeout: 8000 }).catch(() => null);
        if (r?.data) {
          res.set('Content-Type', 'image/png');
          res.set('Cache-Control', 'public, max-age=3600');
          const out = await sharp(Buffer.from(r.data)).resize(AVATAR_SIZE, AVATAR_SIZE).png().toBuffer();
          return res.send(out);
        }
      }
      return res.status(503).json({ error: 'Passport template not found and no avatar available' });
    }

    let template = sharp(templatePath);
    const meta = await template.metadata();
    const width = meta.width ?? 1000;
    const height = meta.height ?? 1000;

    let avatarBuffer: Buffer | null = null;
    if (bot.avatar_url) {
      const r = await axios.get(bot.avatar_url, { responseType: 'arraybuffer', timeout: 8000 }).catch(() => null);
      if (r?.data) avatarBuffer = Buffer.from(r.data);
    }

    if (!avatarBuffer) {
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=300');
      const out = await sharp(templatePath).png().toBuffer();
      return res.send(out);
    }

    const circleSvg = `
      <svg width="${AVATAR_SIZE}" height="${AVATAR_SIZE}">
        <circle cx="${AVATAR_SIZE / 2}" cy="${AVATAR_SIZE / 2}" r="${AVATAR_SIZE / 2}" fill="white"/>
      </svg>
    `;

    const rounded = await sharp(avatarBuffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE)
      .composite([{ input: Buffer.from(circleSvg), blend: 'dest-in' }])
      .png()
      .toBuffer();

    const composed = await sharp(templatePath)
      .composite([{ input: rounded, left: AVATAR_LEFT, top: AVATAR_TOP, blend: 'over' }])
      .png()
      .toBuffer();

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(composed);
  } catch (err: unknown) {
    respondError(res, 500, 'Failed to generate passport image.', err as Error);
  }
});

export default router;
