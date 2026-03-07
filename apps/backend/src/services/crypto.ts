import crypto from 'crypto';

/**
 * Lanista Advanced Crypto Service
 * Standards: AES-256-GCM, PBKDF2 Key Derivation, Authenticated Encryption.
 */

const ALGORITHM = 'aes-256-gcm';
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits for AES-256
const IV_LENGTH = 12;  // Recommended for GCM
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Retrieves the master encryption key from environment variables.
 * @throws Error if ENCRYPTION_KEY is missing in production.
 */
function getMasterKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: ENCRYPTION_KEY must be at least 32 characters in production.');
    }
    console.warn('[crypto] Using insecure or missing ENCRYPTION_KEY. Set a 32+ char secret in .env');
    return key || 'dev_fallback_secret_key_32_chars_long';
  }
  return key;
}

const MASTER_KEY = getMasterKey();

/**
 * Derives a cryptographic key from the master secret and a unique salt using PBKDF2.
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(MASTER_KEY, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts a string using AES-256-GCM.
 * Output Format: salt:iv:authTag:ciphertext (all hex)
 */
export function encrypt(text: string): string {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    key.fill(0); // Clear key from memory

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Combine into a single string for storage: salt:iv:authTag:ciphertext
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('[crypto] Encryption failed:', err);
    throw new Error('Encryption process failed due to internal cryptographic error.');
  }
}

/**
 * Decrypts a string formatted as salt:iv:authTag:ciphertext using AES-256-GCM.
 * @throws Error if verification or authentication fails.
 */
export function decrypt(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format. Expected 4 parts (salt:iv:authTag:ciphertext).');
    }

    const [saltHex, ivHex, authTagHex, ciphertextHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = deriveKey(salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    key.fill(0); // Clear key from memory

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err: any) {
    // If authTag check fails, createDecipheriv/final will throw
    console.error('[crypto] Decryption failed (potential data tampering):', err.message);
    throw new Error('Decryption failed. Data might be corrupted or encryption key is incorrect.');
  }
}
