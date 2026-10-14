import test from 'node:test';
import assert from 'node:assert/strict';

const { validateManagerToken } = await import('../src/lib/server-auth-core.ts');

const fakeFetch = (payload, status = 200) => async () => new Response(JSON.stringify(payload), { status });

test('rechaza un token falso', async () => {
  const result = await validateManagerToken('fake-token', fakeFetch({ error: 'Token invalido' }, 401), 'http://backend:5000');
  assert.deepEqual(result, { ok: false, status: 401, error: 'Token inválido o expirado.' });
});

test('rechaza un usuario cliente', async () => {
  const result = await validateManagerToken('valid-client-token', fakeFetch({ user: { role: 'cliente' } }), 'http://backend:5000');
  assert.deepEqual(result, { ok: false, status: 403, error: 'No tienes permisos para usar esta función.' });
});

test('acepta un usuario gestor', async () => {
  const result = await validateManagerToken('valid-manager-token', fakeFetch({ user: { role: 'gestor' } }), 'http://backend:5000');
  assert.deepEqual(result, { ok: true });
});
