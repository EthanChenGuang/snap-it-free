import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

export type EncryptedProxyPayload = {
  iv: string;
  tag: string;
  data: string;
};

function decodeKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('SCRAPER_SECRETS_KEY must decode to 32 bytes');
  }
  return key;
}

export function encryptProxy(plaintext: string, keyBase64: string): EncryptedProxyPayload {
  const key = decodeKey(keyBase64);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  };
}

export function decryptProxy(payload: EncryptedProxyPayload, keyBase64: string): string {
  const key = decodeKey(keyBase64);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
