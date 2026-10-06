import test from 'node:test';
import assert from 'node:assert/strict';
import { diffChangedFields } from '../src/utils/audit.ts';

test('calcula cambios de ficha sin incluir campos intactos', () => {
  assert.deepEqual(
    diffChangedFields({ full_name: 'Ana', bsn: '123', phone: null }, { full_name: 'Ana Salla', bsn: '123', phone: '+31' }, ['full_name', 'bsn', 'phone']),
    { full_name: { before: 'Ana', after: 'Ana Salla' }, phone: { before: null, after: '+31' } },
  );
});
