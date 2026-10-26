import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, query } from '../db/index.js';
import { requireAuth, requireRole, tokenFromRequest } from '../middleware/auth.js';
import { signingKey, sealSecret, openSecret, newMfaSecret, totp, recoveryHash, consumeMfa, issueSession } from '../utils/auth-security.js';

import { passwordChangeGuard } from '../middleware/password-change.js';

const router = Router();
const secureCookie = () => process.env.NODE_ENV === 'production' ? '; Secure' : '';
const sessionCookie = (name: string, token: string, seconds: number) => `${name}=${encodeURIComponent(token)}; Path=/; Max-Age=${seconds}; HttpOnly; SameSite=Strict${secureCookie()}`;
const publicUser = (u: any) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role, ...(u.client_id ? { client_id: u.client_id } : {}) });

async function completeLogin(user: any, res: any) {
  const session = await issueSession(user);
  if (!session) return res.status(401).json({ error: 'Vuelve a iniciar sesión.' });
  const { token, seconds } = session;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', sessionCookie(user.role === 'cliente' ? 'nexusgest_portal_token' : 'nexusgest_token', token, seconds));
  return res.json({ token, user: publicUser(user) });
}

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();const password = String(req.body?.password || '');
    if (!email || email.length > 320 || !password || password.length > 1024) return res.status(400).json({ error: 'Revisa tus credenciales.' });
    const user = (await query("SELECT * FROM users WHERE lower(email)=$1 AND is_active=true AND role IN ('admin','gestor')", [email])).rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Credenciales inválidas.' });
    res.setHeader('Cache-Control', 'no-store');
    if (!user.mfa_secret) {
      const nonce = crypto.randomUUID();
      await query('UPDATE users SET mfa_nonce=$1,mfa_pending_secret=NULL WHERE id=$2', [nonce, user.id]);
      const enrollmentToken = jwt.sign({ id: user.id, purpose: 'mfa-enroll', nonce }, signingKey(), { expiresIn: '5m', algorithm: 'HS256' });
      return res.json({ mfaEnrollmentRequired: true, enrollmentToken });
    }
    const code = String(req.body?.code || '').trim();
    if (!code) return res.json({ mfaRequired: true });
    if (!(await consumeMfa(user.id, code))) return res.status(401).json({ error: 'Código no válido o ya utilizado.' });
    return completeLogin(user, res);
  } catch (error) { next(error); }
});

async function enrollmentUser(req: any) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  let grant: any;
  try { grant = jwt.verify(token, signingKey(), { algorithms: ['HS256'] }); } catch { return null; }
  if (grant.purpose !== 'mfa-enroll' || !grant.nonce) return null;
  return (await query("SELECT * FROM users WHERE id=$1 AND mfa_nonce=$2 AND mfa_secret IS NULL AND is_active=true AND role IN ('admin','gestor')", [grant.id, grant.nonce])).rows[0] || null;
}

router.post('/mfa/setup', async (req, res, next) => {
  try {
    const user = await enrollmentUser(req);if (!user) return res.status(401).json({ error: 'Vuelve a iniciar la configuración.' });
    const secret = user.mfa_pending_secret ? openSecret(user.mfa_pending_secret) : newMfaSecret();
    if (!user.mfa_pending_secret) await query('UPDATE users SET mfa_pending_secret=$1 WHERE id=$2 AND mfa_nonce=$3', [sealSecret(secret), user.id, user.mfa_nonce]);
    res.setHeader('Cache-Control', 'no-store');res.json({ secret, uri: totp(secret, user.email).toString() });
  } catch (error) { next(error); }
});

router.post('/mfa/confirm', async (req, res, next) => {
  try {
    const user = await enrollmentUser(req);if (!user?.mfa_pending_secret) return res.status(401).json({ error: 'Vuelve a iniciar la configuración.' });
    const timestamp = Date.now();
    const delta = totp(openSecret(user.mfa_pending_secret)).validate({ token: String(req.body?.code || '').trim(), timestamp, window: 1 });
    if (delta === null) return res.status(401).json({ error: 'El código no es válido.' });
    const recoveryCodes = Array.from({ length: 10 }, () => crypto.randomBytes(12).toString('hex').match(/.{1,6}/g)!.join('-'));
    const changed = await query(`UPDATE users SET mfa_secret=mfa_pending_secret,mfa_pending_secret=NULL,mfa_nonce=NULL,mfa_last_counter=$1,mfa_recovery_hashes=$2::jsonb
      WHERE id=$3 AND mfa_nonce=$4 AND mfa_secret IS NULL RETURNING id`, [Math.floor(timestamp / 30_000) + delta, JSON.stringify(recoveryCodes.map(recoveryHash)), user.id, user.mfa_nonce]);
    if (!changed.rows.length) return res.status(409).json({ error: 'La configuración ha caducado.' });
    const session = await issueSession(user);
  if (!session) return res.status(401).json({ error: 'Vuelve a iniciar sesión.' });
  const { token, seconds } = session;
    res.setHeader('Cache-Control', 'no-store');res.setHeader('Set-Cookie', sessionCookie('nexusgest_token', token, seconds));
    return res.json({ token, user: publicUser(user), recoveryCodes });
  } catch (error) { next(error); }
});

router.post('/portal-login', async (req, res, next) => {
  try {
    const identifier = String(req.body?.identifier || '').trim().toLowerCase();const password = String(req.body?.password || '');
    if (!identifier || identifier.length > 320 || !password || password.length > 1024) return res.status(400).json({ error: 'Revisa tus credenciales.' });
    const user = (await query(`SELECT u.*,c.id AS client_id FROM users u JOIN clients c ON c.user_id=u.id
      WHERE u.role='cliente' AND u.is_active=true AND c.status='activo' AND (lower(u.email)=$1 OR lower(c.portal_username)=$1) LIMIT 1`, [identifier])).rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    return completeLogin(user, res);
  } catch (error) { next(error); }
});

router.post('/qa-session', (_req, res) => res.status(404).json({ error: 'No encontrado.' }));
router.get('/me', requireAuth, (req, res) => { res.setHeader('Cache-Control', 'no-store');res.json({ user: req.user }); });
router.post('/reauth', requireAuth, async (req, res, next) => {
  try {
    const user = (await query('SELECT password_hash,mfa_secret FROM users WHERE id=$1', [req.user!.id])).rows[0];
    if (!(await bcrypt.compare(String(req.body?.password || ''), user.password_hash))) return res.status(401).json({ error: 'No se pudo verificar el acceso.' });
    if (req.user!.role !== 'cliente' && !(await consumeMfa(req.user!.id, String(req.body?.code || '').trim()))) return res.status(401).json({ error: 'Código no válido o ya utilizado.' });
    await query('UPDATE auth_sessions SET password_verified_at=CURRENT_TIMESTAMP WHERE id=$1', [req.sessionId]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

// Self-service only: account identity and session always come from requireAuth.
router.post('/change-password', requireAuth, requireRole('admin', 'gestor'), passwordChangeGuard, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword, code } = req.body || {};
  if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 1024 ||
      typeof newPassword !== 'string' || [...newPassword].length < 12 || Buffer.byteLength(newPassword, 'utf8') > 72 ||
      newPassword !== confirmPassword || newPassword === currentPassword || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Revisa los campos: usa una contraseña distinta de al menos 12 caracteres y un máximo de 72 bytes, repítela exactamente e introduce el código de 6 dígitos.' });
  }
  const db = await pool.connect().catch(() => null);
  if (!db) return res.status(500).json({ error: 'No se pudo cambiar la contraseña. Inténtalo de nuevo.' });
  try {
    await db.query('BEGIN');
    const user = (await db.query("SELECT * FROM users WHERE id=$1 AND is_active=true AND role IN ('admin','gestor') FOR UPDATE", [req.user!.id])).rows[0];
    const session = await db.query('SELECT id FROM auth_sessions WHERE id=$1 AND user_id=$2 AND expires_at>CURRENT_TIMESTAMP', [req.sessionId, req.user!.id]);
    if (!user?.mfa_secret || !session.rows.length) { await db.query('ROLLBACK');return res.status(401).json({ error: 'Vuelve a iniciar sesión.' }); }
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) { await db.query('ROLLBACK');return res.status(403).json({ error: 'No se pudo confirmar la contraseña actual y el código. Revisa ambos.' }); }
    // TOTP only, not recovery codes. Counter consumption, hash update and session
    // revocation share this row lock and commit; failed checks mutate nothing.
    const timestamp = Date.now();
    const delta = totp(openSecret(user.mfa_secret)).validate({ token: code, timestamp, window: 1 });
    const counter = delta === null ? null : Math.floor(timestamp / 30_000) + delta;
    if (counter === null || (user.mfa_last_counter !== null && counter <= Number(user.mfa_last_counter))) {
      await db.query('ROLLBACK');return res.status(403).json({ error: 'No se pudo confirmar la contraseña actual y el código. Usa un código nuevo.' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash=$1,mfa_last_counter=$2 WHERE id=$3', [hash, counter, req.user!.id]);
    await db.query('DELETE FROM auth_sessions WHERE user_id=$1', [req.user!.id]);
    await db.query('COMMIT');
    res.setHeader('Set-Cookie', sessionCookie('nexusgest_token', '', 0));
    return res.json({ ok: true });
  } catch {
    await db.query('ROLLBACK').catch(() => undefined);
    // Never forward SQL/error objects that could contain parameter values.
    return res.status(500).json({ error: 'No se pudo cambiar la contraseña. Inténtalo de nuevo.' });
  } finally { db.release(); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const values = [tokenFromRequest(req), ...(req.headers.cookie || '').split(';').filter(part => /^\s*nexusgest_(?:portal_)?token=/.test(part)).map(part => part.slice(part.indexOf('=') + 1))];
    for (const token of values) {
      let claim: any;
      try { claim = jwt.verify(decodeURIComponent(token || ''), signingKey(), { algorithms: ['HS256'] }); } catch { continue; }
      if (claim.sid) await query('DELETE FROM auth_sessions WHERE id=$1 AND user_id=$2', [claim.sid, claim.id]);
    }
    res.setHeader('Set-Cookie', ['nexusgest_token', 'nexusgest_portal_token'].map(name => sessionCookie(name, '', 0)));res.json({ ok: true });
  } catch (error) { next(error); }
});
export default router;
