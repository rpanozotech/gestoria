import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import * as OTPAuth from 'otpauth';
import { pool, query } from '../db/index.js';

export const signingKey = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  return process.env.JWT_SECRET;
};
const encryptionKey = () => {
  if (!process.env.AUTH_ENCRYPTION_KEY || process.env.AUTH_ENCRYPTION_KEY.length < 32) throw new Error('AUTH_ENCRYPTION_KEY no está configurada');
  return crypto.createHash('sha256').update(process.env.AUTH_ENCRYPTION_KEY).digest();
};
export function sealSecret(secret: string) {
  const iv = crypto.randomBytes(12);const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(value => value.toString('base64')).join('.');
}
export function openSecret(value: string) {
  const [iv, tag, data] = value.split('.').map(part => Buffer.from(part, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
export function totp(secret: string, label = 'RP Asesoría') {
  return new OTPAuth.TOTP({ issuer: 'RP Asesoría', label, algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
}
export const newMfaSecret = () => new OTPAuth.Secret({ size: 20 }).base32;
export const recoveryHash = (code: string) => crypto.createHash('sha256').update(code.replace(/[\s-]/g, '').toLowerCase()).digest('hex');

/** A recovery code and a time counter are each consumed atomically, once. */
export async function consumeMfa(userId: string, code: string) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const user = (await db.query('SELECT mfa_secret,mfa_last_counter,mfa_recovery_hashes FROM users WHERE id=$1 FOR UPDATE', [userId])).rows[0];
    if (!user?.mfa_secret) { await db.query('ROLLBACK');return false; }
    const timestamp = Date.now();
    const delta = /^\d{6}$/.test(code) ? totp(openSecret(user.mfa_secret)).validate({ token: code, timestamp, window: 1 }) : null;
    const counter = delta === null ? null : Math.floor(timestamp / 30_000) + delta;
    if (counter !== null && (user.mfa_last_counter === null || counter > Number(user.mfa_last_counter))) {
      await db.query('UPDATE users SET mfa_last_counter=$1 WHERE id=$2', [counter, userId]);
    } else {
      const hashes: string[] = user.mfa_recovery_hashes || [];const hash = recoveryHash(code);
      if (!hashes.includes(hash)) { await db.query('ROLLBACK');return false; }
      await db.query('UPDATE users SET mfa_recovery_hashes=$1::jsonb WHERE id=$2', [JSON.stringify(hashes.filter(value => value !== hash)), userId]);
    }
    await db.query('COMMIT');return true;
  } catch (error) { await db.query('ROLLBACK').catch(() => undefined);throw error; }
  finally { db.release(); }
}

export async function issueSession(user: { id: string; email: string; full_name: string; role: string; password_hash: string; client_id?: string }) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    // Serialize session creation with password changes. A login that checked an
    // old hash must not recreate a session after password-change revocation.
    const current = (await db.query('SELECT password_hash,role,is_active FROM users WHERE id=$1 FOR UPDATE', [user.id])).rows[0];
    if (!current?.is_active || current.role !== user.role || current.password_hash !== user.password_hash) {
      await db.query('ROLLBACK');return null;
    }
    if (user.role === 'cliente') {
      // Hold the client state through COMMIT so deactivation cannot race a
      // successful password check into a newly valid session after revocation.
      const linked = await db.query('SELECT status FROM clients WHERE id=$1 AND user_id=$2 FOR SHARE', [user.client_id, user.id]);
      if (linked.rows[0]?.status !== 'activo') { await db.query('ROLLBACK'); return null; }
    }
    const sid = crypto.randomUUID();const seconds = user.role === 'cliente' ? 86_400 : 28_800;
    const token = jwt.sign({ id: user.id, role: user.role, client_id: user.client_id, sid }, signingKey(), { expiresIn: seconds, algorithm: 'HS256' });
    await db.query('DELETE FROM auth_sessions WHERE expires_at < CURRENT_TIMESTAMP');
    await db.query('INSERT INTO auth_sessions(id,user_id,expires_at) VALUES($1,$2,CURRENT_TIMESTAMP + $3::int * interval \'1 second\')', [sid, user.id, seconds]);
    await db.query('COMMIT');return { token, seconds };
  } catch (error) { await db.query('ROLLBACK').catch(() => undefined);throw error; }
  finally { db.release(); }
}
