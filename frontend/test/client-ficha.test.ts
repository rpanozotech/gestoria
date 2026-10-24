import assert from 'node:assert/strict';
import test from 'node:test';
import { clientFinancials } from '../src/lib/client-ficha.ts';

test('card financial KPIs count issued invoices this month, collectible invoices and every debt', () => {
  const totals = clientFinancials([
    { total: '121.00', status: 'emitida', created_at: '2026-10-10T12:00:00Z' },
    { total: '60.50', status: 'pagada', created_at: '2026-10-11T12:00:00Z' },
    { total: '500', status: 'borrador', created_at: '2026-10-12T12:00:00Z' },
    { total: '300', status: 'cancelada', created_at: '2026-10-12T12:00:00Z' },
    { total: '20', status: 'vencida', created_at: '2026-09-12T12:00:00Z' },
  ], [
    { original_amount: '100', paid_total: '30', paid_amount: '30' },
    { original_amount: '50', paid_total: '0', paid_amount: '45' },
    { original_amount: '10', paid_total: '15' },
  ], new Date('2026-10-24T12:00:00Z'));
  assert.deepEqual(totals, { billed: 181.5, pending: 141, debt: 120 });
});

test('context routing selects UUID or an unambiguous exact name, never another similarly named client', async () => {
  const { findContextClient } = await import('../src/lib/client-ficha.ts');
  const clients = [{ id: 'a', full_name: 'Ana' }, { id: 'b', full_name: 'Ana María' }];
  assert.equal(findContextClient(clients, new URLSearchParams('client=b')).id, 'b');
  assert.equal(findContextClient(clients, new URLSearchParams('client=Ana')).id, 'a');
  assert.equal(findContextClient(clients, new URLSearchParams('client=María')), undefined);
  assert.equal(findContextClient([...clients, { id: 'c', full_name: 'Ana' }], new URLSearchParams('client=Ana')), undefined);
});

test('incomplete API response is an error rather than zero financials', async () => {
  const { validateClientDetail } = await import('../src/lib/client-ficha.ts');
  assert.throws(() => validateClientDetail({ client: { id: 'a', full_name: 'Ana' }, invoices: [] }), /incompleta/);
});

test('a malformed financial field is not silently displayed as zero', async () => {
  const { validateClientDetail } = await import('../src/lib/client-ficha.ts');
  const payload: any = { client: { id: 'a', full_name: 'Ana' } };
  for (const key of ['dossiers', 'service_requests', 'quotes', 'invoices', 'appointments', 'debts', 'documents', 'messages', 'audit', 'tasks']) payload[key] = [];
  payload.invoices = [{ status: 'emitida' }];
  assert.throws(() => validateClientDetail(payload), /financieros/);
});
