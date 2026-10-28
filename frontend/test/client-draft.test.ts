import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withoutPortalCredentials } from '../src/lib/client-draft.ts';

test('drafts and AI history recursively exclude credentials without mutating success state', () => {
  const original = [{ full_name: 'Synthetic Client', status: 'activo', portal_username: 'synthetic', portal_password: 'not-a-real-password', nested: { portal_access: { username: 'synthetic', password: 'not-a-real-password' }, token: 'synthetic-token', bsn: '100000001' } }];
  const clean = withoutPortalCredentials(original);
  assert.deepEqual(clean, [{ full_name: 'Synthetic Client', status: 'activo', nested: { bsn: '100000001' } }]);
  assert.ok(original[0].portal_password, 'one-time UI state must remain available');
  assert.doesNotMatch(JSON.stringify(clean), /not-a-real-password|synthetic-token|portal_access|portal_password|portal_username/);
});

test('AI creation is active, existing-client status is retained, and all persistence uses sanitizer', () => {
  const source = readFileSync('src/app/crm/clientes/alta-ia/page.tsx', 'utf8');
  assert.match(source, /status: 'activo'/);
  assert.match(source, /status: existing\.status \|\| null/);
  assert.doesNotMatch(source, /status: client\.status \|\| existing\.status/);
  assert.match(source, /JSON\.stringify\(withoutPortalCredentials\(detectedClients\)\)/);
  assert.match(source, /clients: withoutPortalCredentials\(persistedClients\.map/);
  assert.match(source, /status: clientData\.client\.status \|\| 'activo'/);
});

test('normal and CSV create UIs display one-time returned access without storage writes', () => {
  const normal = readFileSync('src/app/crm/clientes/nuevo/page.tsx', 'utf8');
  assert.match(normal, /cliente queda activo/);
  assert.match(normal, /created\.username/); assert.match(normal, /created\.password/);
  assert.doesNotMatch(normal, /localStorage|sessionStorage/);
  const directory = readFileSync('src/app/crm/clientes/page.tsx', 'utf8');
  assert.match(directory, /setImportedAccess\(\(data\.created/);
  assert.match(directory, /client\.portal_access\.username/);
  assert.match(directory, /client\.portal_access\.password/);
  assert.match(directory, /setImportedAccess\(\[\]\)/);
});
