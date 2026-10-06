import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dashboard = fs.readFileSync(new URL('../src/app/crm/page.tsx', import.meta.url), 'utf8');

test('CRM dashboard keeps the AI advisory inside the heading hierarchy', () => {
  assert.match(
    dashboard,
    /<h[1-3][^>]*>\s*Asistente NexusGest AI/,
    'the AI advisory must use a heading level that follows the dashboard h1',
  );
  assert.doesNotMatch(
    dashboard,
    /<h4[^>]*>\s*Asistente NexusGest AI/,
    'the AI advisory must not skip directly from h1 to h4',
  );
});
