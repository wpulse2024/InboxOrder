import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

if (!process.env.ENCRYPTION_KEY) {
  throw new Error(
    'ENCRYPTION_KEY env var is not set. A random key would be regenerated on every ' +
    'restart, silently making all previously-encrypted data undecryptable. Set a ' +
    'persistent 32-byte key (e.g. `openssl rand -hex 16`, truncated/padded to 32 chars).'
  );
}

const KEY = Buffer.from(process.env.ENCRYPTION_KEY);

if (KEY.length !== 32) {
  throw new Error(
    `ENCRYPTION_KEY must be exactly 32 bytes for aes-256-gcm, got ${KEY.length}.`
  );
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(payload: string): string {
  const [ivHex, authTagHex, encryptedHex] = payload.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
