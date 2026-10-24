import { pool } from './index.js';

export async function migrateSecurity() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_pending_secret TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_nonce UUID;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_last_counter BIGINT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_recovery_hashes JSONB NOT NULL DEFAULT '[]';
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL, last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      password_verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
  `);
}

export async function assertSecurityReady() {
  await pool.query('SELECT mfa_secret FROM users LIMIT 0');
  await pool.query('SELECT id FROM auth_sessions LIMIT 0');
}
