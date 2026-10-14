import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeContentBlocks } from '../src/utils/content-sanitize.ts';

test('sanitizes public content and removes executable markup', () => {
  const result = sanitizeContentBlocks([
    { type: 'hero', title: 'Hola <script>alert(1)</script>', text: '<b>Ayuda</b>', cta: { label: 'Ver', href: 'javascript:alert(1)' } },
    { type: 'unknown', value: 'no' },
  ]);
  assert.deepEqual(result, [{ type: 'hero', title: 'Hola', text: 'Ayuda', cta: { label: 'Ver', href: '/' } }]);
});
