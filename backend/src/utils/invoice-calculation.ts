export type InvoiceCalculationItem = {
  quantity?: number;
  unit_price?: number;
  tax_rate?: number;
  manual_price?: boolean;
};

const cents = (value: number) => Math.round(value * 100) / 100;

export function calculateInvoiceTotals(items: InvoiceCalculationItem[]) {
  const totals = items.reduce((acc, item) => {
    const quantity = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unit_price ?? 0);
    const rate = Number(item.tax_rate ?? 0);
    const total = cents(quantity * unitPrice);
    const subtotal = cents(total / (1 + rate / 100));
    acc.total += total;
    acc.subtotal += subtotal;
    acc.tax_amount += total - subtotal;
    return acc;
  }, { total: 0, subtotal: 0, tax_amount: 0 });
  const total = cents(totals.total);
  const subtotal = cents(totals.subtotal);
  const tax_amount = cents(total - subtotal);
  return { total, subtotal, tax_amount, effective_tax_rate: subtotal > 0 ? cents((tax_amount / subtotal) * 100) : 0 };
}
