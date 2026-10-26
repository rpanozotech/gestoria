import type { PoolClient } from 'pg';

// Every writer uses the same transaction lock; numeric comparison ignores legacy
// non-numeric codes and works across 9999, gaps and competing request paths.
export async function nextDossierCode(db: PoolClient): Promise<string> {
  await db.query("SELECT pg_advisory_xact_lock(hashtext('nexusgest_dossiers_number'))");
  const year = new Date().getFullYear();
  const result = await db.query(
    `SELECT COALESCE(MAX(substring(code from $1)::numeric), 0) + 1 AS next_num
       FROM dossiers WHERE code ~ $1`, [`^EXP-${year}-([0-9]+)$`]
  );
  return `EXP-${year}-${String(result.rows[0].next_num).padStart(4, '0')}`;
}
