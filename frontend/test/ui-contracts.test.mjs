import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'src/components/ui');
const files = ['Button.tsx', 'IconButton.tsx', 'FormField.tsx', 'StatusBadge.tsx', 'ResponsiveTable.tsx', 'Modal.tsx'];

for (const file of files) {
  assert.equal(existsSync(resolve(root, file)), true, `missing shared UI component: ${file}`);
}

const iconButton = readFileSync(resolve(root, 'IconButton.tsx'), 'utf8');
assert.match(iconButton, /label\s*:/, 'IconButton must require an accessible label');
const formField = readFileSync(resolve(root, 'FormField.tsx'), 'utf8');
assert.match(formField, /htmlFor/, 'FormField must associate label and control');
const modal = readFileSync(resolve(root, 'Modal.tsx'), 'utf8');
assert.match(modal, /role=["']dialog["']/, 'Modal must expose dialog role');
assert.match(modal, /aria-modal/, 'Modal must expose aria-modal');
console.log('ui-contracts: ok');
