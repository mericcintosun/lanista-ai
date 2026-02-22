import { randomBytes, createHash } from 'crypto';

export const generateApiKey = () => {
  const apiKey = `lanista_${randomBytes(24).toString('hex')}`;
  const hash = createHash('sha256').update(apiKey).digest('hex');
  return { apiKey, hash };
};
