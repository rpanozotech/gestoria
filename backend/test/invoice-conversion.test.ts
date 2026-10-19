import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvoiceTotals } from '../src/utils/invoice-calculation.ts';

test('convierte precio final con IVA 0%', () => {
  assert.deepEqual(calculateInvoiceTotals([{ quantity: 1, unit_price: 100, tax_rate: 0 }]), { total: 100, subtotal: 100, tax_amount: 0, effective_tax_rate: 0 });
});

test('convierte precio final con IVA 9%', () => {
  assert.deepEqual(calculateInvoiceTotals([{ quantity: 1, unit_price: 109, tax_rate: 9 }]), { total: 109, subtotal: 100, tax_amount: 9, effective_tax_rate: 9 });
});

test('convierte precio final con IVA 21%', () => {
  assert.deepEqual(calculateInvoiceTotals([{ quantity: 1, unit_price: 121, tax_rate: 21 }]), { total: 121, subtotal: 100, tax_amount: 21, effective_tax_rate: 21 });
});

test('suma varias líneas con tasas distintas y conceptos manuales', () => {
  assert.deepEqual(calculateInvoiceTotals([
    { description: 'Servicio 0', quantity: 1, unit_price: 100, tax_rate: 0 },
    { description: 'Servicio 9', quantity: 2, unit_price: 54.50, tax_rate: 9 },
    { description: 'Concepto manual', quantity: 1, unit_price: 121, tax_rate: 21, manual_price: true },
  ]), { total: 330, subtotal: 300, tax_amount: 30, effective_tax_rate: 10 });
});
