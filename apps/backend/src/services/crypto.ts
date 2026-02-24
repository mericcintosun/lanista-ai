import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

const DEV_FALLBACK_KEY = 'default_secret_key_32_bytes_long_';

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (key && key.length >= 16) {
    return key;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ENCRYPTION_KEY is required in production. Set a secure 32+ character secret in your environment.'
    );
  }
  console.warn(
    '[crypto] ENCRYPTION_KEY not set; using dev-only fallback. Never use this in production.'
  );
  return DEV_FALLBACK_KEY;
}

const ENCRYPTION_KEY = getEncryptionKey();

function getKey(): Buffer {
  return Buffer.from(
    crypto.createHash('sha256').update(ENCRYPTION_KEY).digest('base64').substring(0, 32),
    'utf-8'
  );
}

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Format: iv:encrypted_data
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
