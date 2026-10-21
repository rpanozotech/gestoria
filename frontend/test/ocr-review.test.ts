import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewOcrResult, canConfirmFicha } from '../src/lib/ocr-review.ts';

test('texto válido con confianza alta permite continuar', () => {
  const result = reviewOcrResult({ text: 'Nombre: Ana QA', confidence: 92, method: 'OCR', fileName: 'carta-ficticia.png' });
  assert.equal(result.canContinue, true);
  assert.equal(result.warning, false);
  assert.equal(result.extractedText, 'Nombre: Ana QA');
  assert.equal(result.method, 'OCR');
  assert.equal(canConfirmFicha(result, true), true);
});

test('texto válido con confianza 0 permite continuar pero exige revisión', () => {
  const result = reviewOcrResult({ text: 'Nombre: Bruno QA', confidence: 0, method: 'Extractor alternativo', fileName: 'documento-ficticio.pdf' });
  assert.equal(result.canContinue, true);
  assert.equal(result.warning, true);
  assert.equal(result.manualReviewRequired, true);
  assert.equal(result.extractedText, 'Nombre: Bruno QA');
  assert.equal(result.method, 'Extractor alternativo');
  assert.equal(canConfirmFicha(result, false), false);
  assert.equal(canConfirmFicha(result, true), true);
});

test('documento sin texto no crea ficha y no usa el nombre del archivo', () => {
  const result = reviewOcrResult({ text: '', confidence: 0, method: 'OCR', fileName: 'Nombre-que-no-debe-usarse.png' });
  assert.equal(result.canContinue, false);
  assert.equal(result.extractedText, '');
  assert.equal(result.warning, true);
  assert.equal(result.manualReviewRequired, true);
  assert.equal(result.message, 'No hemos podido leer el documento. Revisa la imagen o introduce los datos manualmente.');
  assert.equal(canConfirmFicha(result, true), false);
  assert.equal(result.extractedText.includes('Nombre-que-no-debe-usarse'), false);
});
