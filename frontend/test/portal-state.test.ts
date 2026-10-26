import assert from 'node:assert/strict';
import test from 'node:test';
import { HUURTOESLAG_REQUEST, hasHuurtoeslagRequest, internalStatus, localDate, meetingUrl, nextWorkingDates, persistPortalMessage, portalRecords, savedAmount } from '../src/app/portal/portal-state.ts';

test('a request is acknowledged only after the actual 201 persisted message; reload recognizes it', async () => {
  let stored: unknown;
  const request = (async (endpoint, init) => {
    assert.equal(endpoint, '/api/backend/portal/messages');
    assert.equal(init?.credentials, 'same-origin');
    assert.equal(init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(init?.body)), { body: HUURTOESLAG_REQUEST });
    stored = { id: 'synthetic-message', body: HUURTOESLAG_REQUEST, created_at: '2026-10-24T12:00:00Z' };
    return new Response(JSON.stringify({ message: stored }), { status: 201 });
  }) as typeof fetch;
  const message = await persistPortalMessage('/api/backend/portal/messages', HUURTOESLAG_REQUEST, request);
  assert.equal(hasHuurtoeslagRequest([]), false);
  assert.equal(hasHuurtoeslagRequest([message]), true);
  assert.equal(hasHuurtoeslagRequest(JSON.parse(JSON.stringify([stored]))), true);
  for (const status of [200, 202, 400, 401, 403, 500]) {
    await assert.rejects(persistPortalMessage('/messages', HUURTOESLAG_REQUEST, (async () => new Response(JSON.stringify({ message: stored }), { status })) as typeof fetch));
  }
  await assert.rejects(persistPortalMessage('/messages', HUURTOESLAG_REQUEST, (async () => { throw new Error('offline'); }) as typeof fetch));
  await assert.rejects(persistPortalMessage('/messages', HUURTOESLAG_REQUEST, (async () => new Response('{}', { status: 201 })) as typeof fetch));
  await assert.rejects(persistPortalMessage('/messages', HUURTOESLAG_REQUEST, (async () => new Response('bad JSON', { status: 201 })) as typeof fetch));
});

test('empty and different accounts cannot inherit synthetic benefits, timeline or official status', () => {
  const empty = portalRecords({ client: {}, dossiers: [] });
  assert.deepEqual([empty.refund, empty.zorg, empty.huur, empty.progress], [null, null, null, null]);
  assert.deepEqual(empty.notifications, []);
  assert.deepEqual(empty.steps, []);
  const record = portalRecords({
    client: { monthly_zorg: '67.50', monthly_huur: '0', refund_amount: '104.20' },
    dossiers: [{ id: 'd1', code: 'SYNTHETIC-1', title: 'Synthetic', status: 'en_belastingdienst', progress_percentage: 40, updated_at: '2026-10-24T12:00:00Z' }],
    dossier_steps: [{ id: 's2', dossier_id: 'other-client-dossier', title: 'Must not appear' }, { id: 's1', dossier_id: 'd1', title: 'Actual CRM step', position: 0 }],
  });
  assert.equal(record.zorg, 67.5);
  assert.equal(record.huur, 0);
  assert.equal(record.progress, 40);
  assert.deepEqual(record.steps.map(step => step.id), ['s1']);
  assert.match(record.notifications[0].text, /Registro del gestor, no resolución oficial/);
  assert.equal(internalStatus('en_belastingdienst'), 'Seguimiento por el gestor');
  assert.equal(internalStatus(undefined), 'Estado interno sin confirmar');
  for (const amount of [undefined, null, '', ' ', NaN, Infinity, true, [], 'not an amount']) assert.equal(savedAmount(amount), null);
});

test('meeting links must be saved https Meet room URLs, never provider home or executable URLs', () => {
  for (const value of [undefined, '', 'https://meet.google.com', 'https://meet.google.com/', 'javascript:alert(1)', 'http://meet.google.com/abc-defg-hij', 'https://meet.google.com.evil.example/abc-defg-hij', 'https://user:secret@meet.google.com/abc-defg-hij', 'https://meet.google.com/nxg-1-asesoria']) assert.equal(meetingUrl(value), null);
  assert.equal(meetingUrl('https://meet.google.com/abc-defg-hij'), 'https://meet.google.com/abc-defg-hij');
});

test('booking dates are local and future working days at current and future clock dates', () => {
  for (const now of [new Date(2026, 9, 24, 23, 59), new Date(2027, 11, 31, 23, 59), new Date(2028, 1, 28, 0, 1)]) {
    const dates = nextWorkingDates(now);
    assert.equal(dates.length, 3);
    assert.equal(new Set(dates).size, 3);
    for (const date of dates) {
      assert.ok(date > localDate(now));
      assert.ok(![0, 6].includes(new Date(`${date}T12:00:00`).getDay()));
    }
  }
  assert.deepEqual(nextWorkingDates(new Date(2026, 9, 24)), ['2026-10-26', '2026-10-27', '2026-10-28']);
});
