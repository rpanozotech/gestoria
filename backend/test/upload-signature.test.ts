import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { firmaDocumentoValida } from '../src/utils/upload.ts';

test('acepta firmas binarias coherentes con el MIME', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'nexus-upload-'));
  try {
    const pdf = path.join(dir, 'document.pdf');
    const png = path.join(dir, 'image.png');
    await writeFile(pdf, Buffer.from('%PDF-1.7\ncontenido'));
    await writeFile(png, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    assert.equal(await firmaDocumentoValida(pdf, 'application/pdf'), true);
    assert.equal(await firmaDocumentoValida(png, 'image/png'), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rechaza un MIME/extensión que no coincide con la firma binaria', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'nexus-upload-'));
  try {
    const fakePdf = path.join(dir, 'fake.pdf');
    await writeFile(fakePdf, Buffer.from('<script>alert(1)</script>'));
    assert.equal(await firmaDocumentoValida(fakePdf, 'application/pdf'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
