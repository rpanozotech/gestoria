import test from 'node:test';
import assert from 'node:assert/strict';
import { appointmentClientHref } from '../src/lib/agenda-context.ts';
import { defaultPreferences, persistedPreferences, pushJson, persistPushSubscription, deletePushSubscription } from '../src/lib/push-settings.ts';

const json = (body: unknown, status = 200) => Response.json(body, { status });

test('agenda uses persisted identity even when names are duplicated; fallback remains an encoded directory search', () => {
  assert.equal(appointmentClientHref({ client_id: 'client-one', client_name: 'Ana & Juan' }), '/crm/clientes/client-one');
  assert.equal(appointmentClientHref({ client_id: 'client-two', client_name: 'Ana & Juan' }), '/crm/clientes/client-two');
  assert.equal(appointmentClientHref({ client_name: 'Ana & Juan' }), '/crm/clientes?client=Ana%20%26%20Juan&from=agenda');
});

test('preference load and PUT surface HTTP/API errors instead of accepting error bodies', async () => {
  for (const method of ['GET', 'PUT']) {
    await assert.rejects(pushJson(async (_path, init) => {
      assert.equal(init?.method, method);
      return json({ error: 'Base de datos no disponible' }, 503);
    }, '/push/preferences', 'Error', { method }), /Base de datos no disponible/);
  }
  await assert.rejects(pushJson(async () => new Response('Gateway error', { status: 502 }), '/push/preferences', 'No se pudo guardar'), /No se pudo guardar/);
  await assert.rejects(pushJson(async () => new Response('not JSON'), '/push/preferences', 'Respuesta inválida'), /Respuesta inválida/);
});

test('preferences accept server-persisted booleans and reject missing or malformed values', () => {
  const saved = { ...defaultPreferences, citas: false };
  assert.deepEqual(persistedPreferences({ preferences: saved }), saved);
  assert.throws(() => persistedPreferences({}), /preferencias válidas/);
  assert.throws(() => persistedPreferences({ preferences: { ...saved, citas: 'false' } as any }), /preferencias válidas/);
});

test('failed new POST rolls back browser subscription; failed existing POST preserves it', async () => {
  for (const created of [true, false]) {
    let rollbacks = 0;
    const subscription = { endpoint: 'https://push.example.test/device', unsubscribe: async () => { rollbacks += 1; return true; } } as PushSubscription;
    await assert.rejects(persistPushSubscription(async (_path, init) => {
      assert.equal(init?.method, 'POST');
      assert.equal(JSON.parse(String(init?.body)).subscription.endpoint, subscription.endpoint);
      return json({ error: 'Alta rechazada' }, 500);
    }, subscription, created), /Alta rechazada/);
    assert.equal(rollbacks, created ? 1 : 0);
  }
});

test('POST requires explicit server confirmation and reports rollback failure', async () => {
  const subscription = { unsubscribe: async () => false } as PushSubscription;
  await assert.rejects(persistPushSubscription(async () => json({}), subscription, true), /permiso local/);
  await assert.rejects(persistPushSubscription(async () => json({}), subscription, false), /no confirmó/);
  await persistPushSubscription(async () => json({ ok: true }, 201), subscription, true);
});

test('DELETE failure preserves browser subscription and scopes successful deletion to this endpoint', async () => {
  let removals = 0;
  const subscription = { endpoint: 'https://push.example.test/only-this-device', unsubscribe: async () => { removals += 1; return true; } } as PushSubscription;
  await assert.rejects(deletePushSubscription(async () => json({ error: 'Baja rechazada' }, 500), subscription), /Baja rechazada/);
  assert.equal(removals, 0);
  await deletePushSubscription(async (_path, init) => {
    assert.equal(init?.method, 'DELETE');
    assert.deepEqual(JSON.parse(String(init?.body)), { endpoint: subscription.endpoint });
    return json({ ok: true });
  }, subscription);
  assert.equal(removals, 1);
});

test('DELETE reports partial local failure instead of claiming complete removal', async () => {
  const subscription = { endpoint: 'local', unsubscribe: async () => false } as PushSubscription;
  await assert.rejects(deletePushSubscription(async () => json({ ok: true }), subscription), /baja se guardó en el servidor/);
});

test('missing endpoint can never delete subscriptions on other devices', async () => {
  let calls = 0;
  await assert.rejects(deletePushSubscription(async () => { calls += 1; return json({ ok: true }); }, { endpoint: '' } as PushSubscription), /ningún dispositivo/);
  assert.equal(calls, 0);
});
