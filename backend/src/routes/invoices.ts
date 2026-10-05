import { Router, Request, Response } from 'express';
import { query, pool } from '../db/index.js';

const router = Router();

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
  const normalized = items.map((item: any) => ({ service_id: item.service_id || item.serviceId || null, description: String(item.description || item.title || 'Servicio').trim(), quantity: Number(item.quantity) || 1, unit_price: Number(item.unit_price ?? item.unitPrice ?? item.price) || 0 })).filter((item: any) => item.description && item.unit_price >= 0);
  if (!normalized.length) return res.status(400).json({ error: 'Las líneas del presupuesto no son válidas' });
  const total = Math.round(normalized.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0) * 100) / 100;
  const subtotal = Math.round((total / 1.21) * 100) / 100;
  const taxAmount = Math.round((total - subtotal) * 100) / 100;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const validClient = await client.query('SELECT id FROM clients WHERE id=$1 FOR UPDATE', [client_id]);
    if (!validClient.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'El cliente no existe' }); }
    if (dossier_id) { const d = await client.query('SELECT id FROM dossiers WHERE id=$1 AND client_id=$2', [dossier_id, client_id]); if (!d.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'El expediente no pertenece al cliente' }); } }
    for (const item of normalized) { if (item.service_id) { const service = await client.query('SELECT id FROM service_prices WHERE id=$1 AND active=TRUE', [item.service_id]); if (!service.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: `El servicio ${item.service_id} no existe o está inactivo` }); } } }
    await client.query("SELECT pg_advisory_xact_lock(hashtext('nexusgest_quotes_number'))");
    const year = new Date().getFullYear();
    const count = await client.query('SELECT COUNT(*)::int AS n FROM quotes WHERE code LIKE $1', [`PRE-${year}-%`]);
    const code = `PRE-${year}-${String(count.rows[0].n + 1).padStart(4, '0')}`;
    const quote = await client.query(`INSERT INTO quotes (code,client_id,dossier_id,items,subtotal,tax_rate,tax_amount,total,status,valid_until,notes) VALUES ($1,$2,$3,$4,$5,21,$6,$7,'borrador',$8,$9) RETURNING *`, [code, client_id, dossier_id || null, JSON.stringify(normalized), subtotal, taxAmount, total, valid_until || null, notes || null]);
    for (const item of normalized) await client.query('INSERT INTO quote_items (quote_id,service_id,description,quantity,unit_price,total) VALUES ($1,$2,$3,$4,$5,$6)', [quote.rows[0].id, item.service_id, item.description, item.quantity, item.unit_price, Math.round(item.quantity * item.unit_price * 100) / 100]);
    await client.query('COMMIT');
    res.status(201).json({ quote: quote.rows[0], message: 'Presupuesto creado con éxito' });
  } catch (error) { await client.query('ROLLBACK').catch(() => undefined); console.error('Error creando presupuesto:', error); res.status(500).json({ error: 'Error al generar presupuesto' }); }
  finally { client.release(); }
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
    const year = new Date().getFullYear();
    const count = await client.query('SELECT COUNT(*)::int AS n FROM invoices WHERE code LIKE $1', [`FAC-${year}-%`]);
    const code = `FAC-${year}-${String(count.rows[0].n + 1).padStart(4, '0')}`;
    const due = new Date(); due.setDate(due.getDate() + 14);
    const items = Array.isArray(quote.items) ? quote.items : (typeof quote.items === 'string' ? JSON.parse(quote.items) : []);
    const invoice = await client.query(`INSERT INTO invoices (code,quote_id,client_id,dossier_id,items,subtotal,tax_rate,tax_amount,total,status,due_date) VALUES ($1,$2,$3,$4,$5,$6,21,$7,$8,'emitida',$9) RETURNING *`, [code, quote.id, quote.client_id, quote.dossier_id, JSON.stringify(items), quote.subtotal, quote.tax_amount, quote.total, due.toISOString().slice(0,10)]);
    for (const item of items) await client.query('INSERT INTO invoice_items (invoice_id,service_id,description,quantity,unit_price,total) VALUES ($1,$2,$3,$4,$5,$6)', [invoice.rows[0].id, item.service_id || item.serviceId || null, item.description || 'Servicio', Number(item.quantity) || 1, Number(item.unit_price ?? item.unitPrice ?? 0), Number(item.total ?? ((Number(item.quantity)||1) * Number(item.unit_price ?? item.unitPrice ?? 0)))]);
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
