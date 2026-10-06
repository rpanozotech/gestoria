import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync(new URL('../src/app/crm/clientes/page.tsx', import.meta.url), 'utf8');

test('CRM activity clears stale client data and ignores out-of-order loads', () => {
  assert.match(page, /setClientMessages\(\[\]\);/);
  assert.match(page, /clientActivityRequestRef\.current/);
  assert.match(page, /if \(requestId !== clientActivityRequestRef\.current\) return;/);
  assert.match(page, /aria-busy=\{clientActivityLoading\}/);
});
