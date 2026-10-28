import type { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

/** Caller owns the client+user transaction. Plaintext is returned once, never stored. */
export async function provisionNewClientPortal(db: PoolClient, client: { id: string; full_name: string }) {
  const base = client.full_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 32) || 'cliente';
  const username = `${base}-${crypto.randomBytes(8).toString('hex')}`;
  const password = `RP-${crypto.randomBytes(18).toString('base64url')}`;
  const hash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role, is_active)
     VALUES ($1, $2, $3, 'cliente', true) RETURNING id`,
    [`${username}@portal.local`, hash, client.full_name],
  );
  const userId = result.rows[0].id;
  await db.query('UPDATE clients SET user_id=$1, portal_username=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3', [userId, username, client.id]);
  return { userId, username, password };
}
