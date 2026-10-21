import crypto from 'node:crypto';

const key = () => crypto.createHash('sha256').update(process.env.INTEGRATION_ENCRYPTION_KEY || '').digest();

export function encryptSecret(value: string): { ciphertext: string; iv: string; tag: string } {
  if (!process.env.INTEGRATION_ENCRYPTION_KEY) throw new Error('INTEGRATION_ENCRYPTION_KEY no esta definido');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}
