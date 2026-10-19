import { Router, Request, Response } from 'express';
import { query, pool } from '../db/index.js';
import { calculateInvoiceTotals } from '../utils/invoice-calculation.js';

const router = Router();

async function documentSettings() {
  const result = await query('SELECT quote_prefix, invoice_prefix, number_format FROM company_document_settings WHERE id=1');
  return result.rows[0] || { quote_prefix: 'PRE', invoice_prefix: 'FAC', number_format: '{prefix}-{year}-{number}' };
}

function documentCode(format: string, prefix: string, year: number, number: number) {
  return String(format || '{prefix}-{year}-{number}').replace('{prefix}', prefix).replace('{year}', String(year)).replace('{number}', String(number).padStart(4, '0'));
}

// Presupuestos: el precio recibido es siempre el total final IVA incluido.
router.get('/quotes', async (req: Request, res: Response) => {
  try {
    const { client_id } = req.query;
    const params: any[] = [];
    const filter = client_id ? `WHERE q.client_id = $1` : '';
    if (client_id) params.push(client_id);
    const result = await query(`SELECT q.*, c.full_name AS client_name, c.email AS client_email, c.bsn AS client_bsn FROM quotes q JOIN clients c ON q.client_id=c.id ${filter} ORDER BY q.created_at DESC`, params);
    res.json({ quotes: result.rows });
  } catch (error) { console.error('Error listando presupuestos:', error); res.status(500).json({ error: 'Error al consultar presupuestos' }); }
});

router.post('/quotes', async (req: Request, res: Response) => {
  const { client_id, dossier_id, items, valid_until, notes } = req.body || {};
  if (!client_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Debe especificar el cliente y al menos una línea de concepto' });
  const normalized = [] as any[];
  for (const raw of items) {
    const serviceId = raw.service_id || raw.serviceId || null;
    const serviceResult = serviceId ? await query('SELECT id, title, base_price, btw_rate, active FROM service_prices WHERE id=$1', [serviceId]) : null;
    const service = serviceResult?.rows[0];
    if (serviceId && (!service || !service.active)) return res.status(400).json({ error: `El servicio ${serviceId} no existe o está inactivo` });
    const quantity = Number(raw.quantity ?? 1);
    const manualPrice = raw.manual_price === true || raw.manualPrice === true;
    const configuredPrice = service ? Number(service.base_price) : Number(raw.unit_price ?? raw.unitPrice ?? raw.price);
    const unitPrice = manualPrice ? Number(raw.unit_price ?? raw.unitPrice ?? raw.price) : configuredPrice;
    const description = String(raw.description || raw.title || service?.title || 'Servicio').trim();
    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return res.status(400).json({ error: 'Las líneas del presupuesto no son válidas' });
    if (unitPrice === 0) return res.status(400).json({ error: `Tarifa pendiente de configurar: ${description}` });
    const rate = service ? Number(service.btw_rate) * 100 : Number(raw.tax_rate ?? 21);
    const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
    normalized.push({ service_id: serviceId, description, quantity, unit_price: unitPrice, total: lineTotal, tax_rate: rate, tax_amount: Math.round((lineTotal - lineTotal / (1 + rate / 100)) * 100) / 100, manual_price: manualPrice });
  }
  if (!normalized.length) return res.status(400).json({ error: 'Las líneas del presupuesto no son válidas' });
  const total = Math.round(normalized.reduce((sum: number, item: any) => sum + item.total, 0) * 100) / 100;
  const taxRate = Number(normalized[0]?.tax_rate || 21);
  const subtotal = Math.round(normalized.reduce((sum: number, item: any) => sum + (item.total - item.tax_amount), 0) * 100) / 100;
  const taxAmount = Math.round(normalized.reduce((sum: number, item: any) => sum + item.tax_amount, 0) * 100) / 100;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const validClient = await client.query('SELECT id FROM clients WHERE id=$1 FOR UPDATE', [client_id]);
    if (!validClient.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El cliente no existe' }); }
    if (dossier_id) { const d = await client.query('SELECT id FROM dossiers WHERE id=$1 AND client_id=$2', [dossier_id, client_id]); if (!d.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'El expediente no pertenece al cliente' }); } }
    for (const item of normalized) { if (item.service_id) { const service = await client.query('SELECT id FROM service_prices WHERE id=$1 AND active=TRUE', [item.service_id]); if (!service.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: `El servicio ${item.service_id} no existe o está inactivo` }); } } }
    await client.query("SELECT pg_advisory_xact_lock(hashtext('nexusgest_quotes_number'))");
    const settings = await documentSettings();
    const year = new Date().getFullYear();
    const count = await client.query('SELECT COUNT(*)::int AS n FROM quotes WHERE code LIKE $1', [`${settings.quote_prefix}-${year}-%`]);
    const code = documentCode(settings.number_format, settings.quote_prefix, year, count.rows[0].n + 1);
    const quote = await client.query(`INSERT INTO quotes (code,client_id,dossier_id,items,subtotal,tax_rate,tax_amount,total,status,valid_until,notes,manual_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'borrador',$9,$10,$11) RETURNING *`, [code, client_id, dossier_id || null, JSON.stringify(normalized), subtotal, taxRate, taxAmount, total, valid_until || null, notes || null, normalized.some((item: any) => item.manual_price)]);
    for (const item of normalized) await client.query('INSERT INTO quote_items (quote_id,service_id,description,quantity,unit_price,total,tax_rate,tax_amount,manual_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [quote.rows[0].id, item.service_id, item.description, item.quantity, item.unit_price, item.total, item.tax_rate, item.tax_amount, item.manual_price]);
    await client.query('COMMIT');
    res.status(201).json({ quote: quote.rows[0], message: 'Presupuesto creado con éxito' });
  } catch (error) { await client.query('ROLLBACK').catch(() => undefined); console.error('Error creando presupuesto:', error); res.status(500).json({ error: 'Error al generar presupuesto' }); }
  finally { client.release(); }
});

router.get('/quotes/:id/versions', async (req: Request, res: Response) => {
  const result = await query('SELECT id, quote_id, version, changes, reason, edited_by, created_at FROM quote_versions WHERE quote_id=$1 ORDER BY version DESC', [req.params.id]);
  res.json({ versions: result.rows });
});

router.put('/quotes/:id', async (req: Request, res: Response) => {
  const { client_id, items, valid_until, notes, internal_notes, reason, mode } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'El presupuesto debe tener al menos una línea.' });
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const found = await db.query('SELECT * FROM quotes WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!found.rows.length) { await db.query('ROLLBACK'); return res.status(404).json({ error: 'Presupuesto no encontrado' }); }
    const current = found.rows[0];
    if (['convertido', 'pagado'].includes(current.status)) { await db.query('ROLLBACK'); return res.status(409).json({ error: 'Este presupuesto ya está facturado o pagado. Duplica o cancela el documento en lugar de editarlo.', terminal: true }); }
    const revisionRequired = ['enviado', 'pendiente', 'aceptado'].includes(current.status);
    if (revisionRequired && mode !== 'revision') { await db.query('ROLLBACK'); return res.status(409).json({ error: 'Este estado requiere crear una revisión nueva.', revisionRequired: true }); }
    if (client_id) { const clientResult = await db.query('SELECT id FROM clients WHERE id=$1', [client_id]); if (!clientResult.rows.length) { await db.query('ROLLBACK'); return res.status(400).json({ error: 'El cliente no existe.' }); } }
    const normalized = items.map((item: any) => { const quantity = Number(item.quantity ?? 1); const unit = Number(item.unit_price ?? item.unitPrice ?? 0); const total = Math.round(quantity * unit * 100) / 100; const rate = Number(item.tax_rate ?? 21); const tax = Math.round((total - total / (1 + rate / 100)) * 100) / 100; return { service_id: item.service_id || item.serviceId || null, description: String(item.description || 'Servicio').trim(), quantity, unit_price: unit, total, tax_rate: rate, tax_amount: tax, manual_price: Boolean(item.manual_price || item.manualPrice) }; });
    if (normalized.some((item: any) => !item.description || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unit_price) || item.unit_price <= 0 || !Number.isFinite(item.tax_rate) || item.tax_rate < 0)) { await db.query('ROLLBACK'); return res.status(400).json({ error: 'Cada línea debe tener descripción, cantidad, tarifa e IVA válidos.' }); }
    for (const item of normalized) { if (item.service_id) { const service = await db.query('SELECT id, active FROM service_prices WHERE id=$1', [item.service_id]); if (!service.rows.length || !service.rows[0].active) { await db.query('ROLLBACK'); return res.status(400).json({ error: `El servicio ${item.service_id} no existe o está inactivo.` }); } } }
    const total = Math.round(normalized.reduce((sum: number, item: any) => sum + item.total, 0) * 100) / 100;
    const subtotal = Math.round(normalized.reduce((sum: number, item: any) => sum + item.total - item.tax_amount, 0) * 100) / 100;
    const tax = Math.round(normalized.reduce((sum: number, item: any) => sum + item.tax_amount, 0) * 100) / 100;
    const version = Number(current.version || 1) + 1;
    await db.query('INSERT INTO quote_versions (quote_id,version,snapshot,changes,reason,edited_by) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [req.params.id, Number(current.version || 1), JSON.stringify(current), JSON.stringify({ items: true, client_id: client_id !== current.client_id, valid_until: valid_until !== current.valid_until, notes: notes !== current.notes }), reason || null, req.user?.id || null]);
    const updated = await db.query(`UPDATE quotes SET client_id=COALESCE($1,client_id),items=$2,subtotal=$3,tax_amount=$4,total=$5,version=$6,valid_until=$7,notes=$8,internal_notes=$9,updated_at=CURRENT_TIMESTAMP,status=$10 WHERE id=$11 RETURNING *`, [client_id || null, JSON.stringify(normalized), subtotal, tax, total, version, valid_until || null, notes || null, internal_notes || null, revisionRequired || mode === 'revision' ? 'pendiente' : current.status, req.params.id]);
    await db.query('DELETE FROM quote_items WHERE quote_id=$1', [req.params.id]);
    for (const item of normalized) await db.query('INSERT INTO quote_items (quote_id,service_id,description,quantity,unit_price,total,tax_rate,tax_amount,manual_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [req.params.id, item.service_id, item.description, item.quantity, item.unit_price, item.total, item.tax_rate, item.tax_amount, item.manual_price]);
    await db.query('COMMIT');
    res.json({ quote: updated.rows[0], message: revisionRequired || mode === 'revision' ? 'Revisión guardada.' : 'Borrador guardado.' });
  } catch (error) { await db.query('ROLLBACK').catch(() => undefined); console.error('Error editando presupuesto:', error); res.status(500).json({ error: 'No se pudo guardar el presupuesto.' }); }
  finally { db.release(); }
});

router.post('/quotes/:id/cancel', async (req: Request, res: Response) => {
  const result = await query("UPDATE quotes SET status='cancelado', updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status NOT IN ('pagado','convertido') RETURNING *", [req.params.id]);
  if (!result.rows.length) return res.status(409).json({ error: 'No se puede cancelar este presupuesto.' });
  res.json({ quote: result.rows[0] });
});

router.post('/quotes/:id/convert', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quoteRes = await client.query('SELECT * FROM quotes WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!quoteRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Presupuesto no encontrado' }); }
    const quote = quoteRes.rows[0];
    const existing = await client.query('SELECT * FROM invoices WHERE quote_id=$1 LIMIT 1', [quote.id]);
    if (existing.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Este presupuesto ya tiene una factura', invoice: existing.rows[0] }); }
    await client.query("SELECT pg_advisory_xact_lock(hashtext('nexusgest_invoices_number'))");
    const settings = await documentSettings();
    const year = new Date().getFullYear();
    const count = await client.query('SELECT COUNT(*)::int AS n FROM invoices WHERE code LIKE $1', [`${settings.invoice_prefix}-${year}-%`]);
    const code = documentCode(settings.number_format, settings.invoice_prefix, year, count.rows[0].n + 1);
    const due = new Date(); due.setDate(due.getDate() + 14);
    const items = Array.isArray(quote.items) ? quote.items : (typeof quote.items === 'string' ? JSON.parse(quote.items) : []);
    const calculated = calculateInvoiceTotals(items.map((item: any) => ({ quantity: Number(item.quantity || 1), unit_price: Number(item.unit_price ?? item.unitPrice ?? item.price ?? 0), tax_rate: Number(item.tax_rate ?? quote.tax_rate ?? 0) })));
    if (calculated.total <= 0 || Math.abs(calculated.total - Number(quote.total)) > 0.01) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'No se puede convertir: la suma de líneas no coincide con el total del presupuesto.' }); }
    const invoice = await client.query(`INSERT INTO invoices (code,quote_id,client_id,dossier_id,items,subtotal,tax_rate,tax_amount,total,status,due_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'emitida',$10) RETURNING *`, [code, quote.id, quote.client_id, quote.dossier_id, JSON.stringify(items), calculated.subtotal, calculated.effective_tax_rate, calculated.tax_amount, calculated.total, due.toISOString().slice(0,10)]);
    for (const item of items) {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
      const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
      const rate = Number(item.tax_rate ?? quote.tax_rate ?? 0);
      const lineTax = Math.round((lineTotal - lineTotal / (1 + rate / 100)) * 100) / 100;
      await client.query('INSERT INTO invoice_items (invoice_id,service_id,description,quantity,unit_price,total,tax_rate,tax_amount,manual_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [invoice.rows[0].id, item.service_id || item.serviceId || null, item.description || 'Servicio', quantity, unitPrice, lineTotal, rate, lineTax, Boolean(item.manual_price || item.manualPrice)]);
    }
    await client.query("UPDATE quotes SET status='convertido',updated_at=CURRENT_TIMESTAMP WHERE id=$1", [quote.id]);
    await client.query('COMMIT');
    res.status(201).json({ invoice: invoice.rows[0], message: `Presupuesto ${quote.code} convertido exitosamente a Factura ${code}` });
  } catch (error) { await client.query('ROLLBACK').catch(() => undefined); console.error('Error convirtiendo presupuesto a factura:', error); res.status(500).json({ error: 'Error en la conversión a factura' }); }
  finally { client.release(); }
});

// ==========================================
// FACTURAS (INVOICES)
// ==========================================

// GET /api/invoices - Listado de facturas
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { client_id } = req.query;
    const params: any[] = [];
    const filter = client_id ? `WHERE i.client_id = $1` : '';
    if (client_id) params.push(client_id);
    const sql = `
      SELECT i.*, c.full_name as client_name, c.email as client_email, c.bsn as client_bsn
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      ${filter}
      ORDER BY i.created_at DESC
    `;
    const result = await query(sql, params);
    res.json({ invoices: result.rows });
  } catch (error) {
    console.error('Error listando facturas:', error);
    res.status(500).json({ error: 'Error al consultar facturas' });
  }
});

// POST /api/invoices/:id/pay - Registrar cobro (ej. pasarela iDEAL o transferencia)
router.post('/invoices/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { payment_method, payment_reference } = req.body;

    const ref = payment_reference || `IDL-PAY-${Date.now().toString().slice(-6)}`;

    const sql = `
      UPDATE invoices SET
        status = 'pagada',
        payment_method = COALESCE($1, 'ideal'),
        payment_reference = $2,
        paid_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    const result = await query(sql, [payment_method, ref, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json({ invoice: result.rows[0], message: 'Pago registrado con éxito' });
  } catch (error) {
    console.error('Error registrando pago de factura:', error);
    res.status(500).json({ error: 'Error al registrar el pago' });
  }
});

// DELETE /api/invoices/:id - Eliminar factura
//
// Una factura pagada NO se borra nunca: tiene obligacion legal de
// conservacion (7 años para la administracion fiscal neerlandesa). Para
// esas, la via es marcarla como 'cancelada' con el PATCH.
//
// Las facturas en estado 'borrador' o 'emitida' si se pueden eliminar, que
// todavia no han dado lugar a un cobro ni a un asiento definitivo.
router.delete('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const found = await query('SELECT id, code, status, total FROM invoices WHERE id = $1', [id]);
    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    const factura = found.rows[0];

    if (factura.status === 'pagada') {
      return res.status(409).json({
        error:
          `La factura ${factura.code} está pagada y no se puede eliminar. ` +
          'Por obligación de conservación fiscal debe mantenerse. ' +
          'Si procede, márcala como "cancelada" para conservar el registro.',
      });
    }

    await query('DELETE FROM invoices WHERE id = $1', [id]);

    res.json({ message: `Factura ${factura.code} eliminada`, factura });
  } catch (error) {
    console.error('Error al eliminar factura:', error);
    res.status(500).json({ error: 'Error al eliminar la factura' });
  }
});

// PATCH /api/invoices/:id - Cambiar estado de la factura
//
// Permite anular una factura pagada conservando el registro, que es lo
// que exige la contabilidad cuando se emite una factura rectificativa.
router.patch('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ESTADOS = ['borrador', 'emitida', 'pagada', 'vencida', 'cancelada'];
    if (!ESTADOS.includes(status)) {
      return res.status(400).json({
        error: `Estado no válido: ${status}. Valores admitidos: ${ESTADOS.join(', ')}.`,
      });
    }

    const result = await query(
      `UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *;`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json({ invoice: result.rows[0], message: `Factura marcada como "${status}"` });
  } catch (error) {
    console.error('Error actualizando factura:', error);
    res.status(500).json({ error: 'Error al actualizar la factura' });
  }
});

export default router;
