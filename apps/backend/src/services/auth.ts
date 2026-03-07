import { randomBytes, createHash, pbkdf2Sync } from 'crypto';

export const generateApiKey = (botId: string) => {
  const secret = randomBytes(24).toString('hex');
  const apiKey = `${botId}.${secret}`;
  
  const salt = randomBytes(16).toString('hex');
  const derivedKey = pbkdf2Sync(secret, salt, 10000, 64, 'sha512').toString('hex');
  const hash = `${salt}:${derivedKey}`;
  
  return { apiKey, hash };
};
