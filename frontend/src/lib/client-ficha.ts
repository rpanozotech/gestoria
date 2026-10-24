type Row = Record<string, any>;

const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100);
const sumMoney = (rows: Row[], amount: (row: Row) => number) => rows.reduce((sum, row) => sum + amount(row), 0) / 100;
export const debtOutstanding = (debt: Row) => Math.max(0, cents(debt.original_amount) - cents(debt.paid_total ?? debt.paid_amount)) / 100;

export function clientFinancials(invoices: Row[], debts: Row[], now = new Date()) {
  const issued = invoices.filter(row => ['emitida', 'pagada', 'vencida'].includes(String(row.status).toLowerCase()));
  return {
    billed: sumMoney(issued.filter(row => {
      const date = new Date(row.created_at);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }), row => cents(row.total)),
    pending: sumMoney(issued.filter(row => ['emitida', 'vencida'].includes(String(row.status).toLowerCase())), row => cents(row.total)),
    debt: sumMoney(debts.filter(row => row.status !== 'deleted'), row => Math.round(debtOutstanding(row) * 100)),
  };
}

// The API is all-or-error. Missing collections are not equivalent to a verified empty collection.
export function validateClientDetail(payload: any) {
  if (!payload?.client?.id || typeof payload.client.full_name !== 'string' ||
    !['dossiers', 'service_requests', 'quotes', 'invoices', 'appointments', 'debts', 'documents', 'messages', 'audit', 'tasks'].every(key => Array.isArray(payload[key]))) {
    throw new Error('La respuesta de la ficha está incompleta. Vuelve a intentarlo.');
  }
  const numeric = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value));
  if (payload.invoices.some((row: Row) => !numeric(row.total)) || payload.debts.some((row: Row) => !numeric(row.original_amount) || !numeric(row.paid_total ?? row.paid_amount))) {
    throw new Error('Los datos financieros de la ficha están incompletos. Vuelve a intentarlo.');
  }
  return payload;
}

export function findContextClient(clients: Row[], query: URLSearchParams) {
  const identifier = query.get('id') || query.get('client') || query.get('nombre');
  if (!identifier?.trim()) return undefined;
  const byId = clients.find(client => String(client.id) === identifier);
  if (byId) return byId;
  const matching = clients.filter(client => String(client.full_name || '').trim().toLowerCase() === identifier.trim().toLowerCase());
  return matching.length === 1 ? matching[0] : undefined;
}
