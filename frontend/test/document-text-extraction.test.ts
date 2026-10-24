import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDocumentText } from '../src/lib/document-text-extraction.ts';

test('two different images with identical names use their actual OCR output', async () => {
  const extractors = {
    image: async (file: File) => (await file.text()).replace('synthetic pixels: ', ''),
    pdf: async () => { throw new Error('Unexpected PDF extraction'); },
  };
  const first = new File(['synthetic pixels: ALPHA 7319'], 'zorgtoeslag.png', { type: 'image/png' });
  const second = new File(['synthetic pixels: BRAVO 4826'], 'zorgtoeslag.png', { type: 'image/png' });
  assert.equal(await extractDocumentText(first, extractors), 'ALPHA 7319');
  assert.equal(await extractDocumentText(second, extractors), 'BRAVO 4826');
});

test('text uploads read bytes, including a misleading official-looking filename', async () => {
  const unused = async () => { throw new Error('No binary extractor should run'); };
  assert.equal(await extractDocumentText(new File(['  Actual user text  '], 'zorgtoeslag.txt', { type: 'text/plain' }), { image: unused, pdf: unused }), 'Actual user text');
});

test('PDF uses parser text and removes only page separators', async () => {
  const file = new File(['synthetic PDF bytes'], 'huurtoeslag.pdf', { type: 'application/pdf' });
  let received: File | undefined;
  const text = await extractDocumentText(file, { image: async () => { throw Error('Unexpected OCR'); }, pdf: async input => { received = input; return '-- 1 of 1 --\nACTUAL PDF 2037'; } });
  assert.equal(received, file);
  assert.equal(text, 'ACTUAL PDF 2037');
});

test('empty text, blank OCR and separator-only PDFs never produce analysis input', async () => {
  const extractors = { image: async () => ' \n ', pdf: async () => '-- 1 of 1 --' };
  for (const file of [new File([], 'zorgtoeslag.txt', { type: 'text/plain' }), new File(['pixels'], 'cak.png', { type: 'image/png' }), new File(['pdf'], 'huurtoeslag.pdf', { type: 'application/pdf' })]) {
    await assert.rejects(extractDocumentText(file, extractors), /No se ha podido extraer texto legible/);
  }
});

test('unsupported documents are rejected without invoking extractors', async () => {
  const unused = async () => { throw new Error('Extractor must not run'); };
  await assert.rejects(extractDocumentText(new File(['arbitrary bytes'], 'boete.docx'), { image: unused, pdf: unused }), /Formato no compatible/);
});

test('OCR and PDF extractor errors remain errors, never filename-derived text', async () => {
  const broken = async () => { throw new Error('Synthetic extractor failure'); };
  for (const file of [new File(['bytes'], 'zorgtoeslag.png', { type: 'image/png' }), new File(['bytes'], 'cak.pdf', { type: 'application/pdf' })]) {
    await assert.rejects(extractDocumentText(file, { image: broken, pdf: broken }), /Synthetic extractor failure/);
  }
});
