import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvoiceTotals } from '../src/utils/invoice-calculation.ts';

test('convierte precio final con IVA 0%', () => {
  assert.deepEqual(calculateInvoiceTotals([{ quantity: 1, unit_price: 100, tax_rate: 0 }]), { total: 100, subtotal: 100, tax_amount: 0, effective_tax_rate: 0 });
});

test('convierte precio final con IVA 9%', () => {
  assert.deepEqual(calculateInvoiceTotals([{ quantity: 1, unit_price: 100, tax_rate: 9 }]), { total: 100, subtotal: 91.74, tax_amount: 8.26, effective_tax_rate: 9 });
});

test('convierte precio final con IVA 21%', () => {
  assert.deepEqual(calculateInvoiceTotals([{ quantity: 1, unit_price: 100, tax_rate: 21 }]), { total: 100, subtotal: 82.64, tax_amount: 17.36, effective_tax_rate: 21.01 });
});

test('suma varias líneas con tasas distintas y conceptos manuales', () => {
  assert.deepEqual(calculateInvoiceTotals([
    { description: 'Servicio 0', quantity: 1, unit_price: 100, tax_rate: 0 },
    { description: 'Servicio 9', quantity: 1, unit_price: 100, tax_rate: 9 },
    { description: 'Concepto manual', quantity: 1, unit_price: 100, tax_rate: 21, manual_price: true },
  ]), { total: 300, subtotal: 274.38, tax_amount: 25.62, effective_tax_rate: 9.34 });
});
