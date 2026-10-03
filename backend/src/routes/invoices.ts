import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

// ==========================================
// PRESUPUESTOS (QUOTES)
// ==========================================

// GET /api/quotes - Listado de presupuestos
router.get('/quotes', async (req: Request, res: Response) => {
  try {
    const { client_id } = req.query;
    const params: any[] = [];
    const filter = client_id ? `WHERE q.client_id = $1` : '';
    if (client_id) params.push(client_id);
    const sql = `
      SELECT q.*, c.full_name as client_name, c.email as client_email, c.bsn as client_bsn
      FROM quotes q
      JOIN clients c ON q.client_id = c.id
      ${filter}
      ORDER BY q.created_at DESC
    `;
    const result = await query(sql, params);
    res.json({ quotes: result.rows });
  } catch (error) {
    console.error('Error listando presupuestos:', error);
    res.status(500).json({ error: 'Error al consultar presupuestos' });
  }
});

// POST /api/quotes - Crear presupuesto correlativo PRE-2026-XXXX
router.post('/quotes', async (req: Request, res: Response) => {
  try {
    const { client_id, dossier_id, items, valid_until, notes } = req.body;

    if (!client_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe especificar el cliente y al menos una línea de concepto' });
    }

    // Calcular subtotal, IVA/BTW (21%) y total
    const subtotal = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unit_price), 0);
    const tax_rate = 21.00;
    const tax_amount = Math.round((subtotal * (tax_rate / 100)) * 100) / 100;
    const total = Math.round((subtotal + tax_amount) * 100) / 100;

    const countRes = await query(`SELECT COUNT(*) FROM quotes`);
    const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
    const year = new Date().getFullYear();
    const code = `PRE-${year}-${String(nextNum).padStart(4, '0')}`;

    const sql = `
      INSERT INTO quotes (code, client_id, dossier_id, items, subtotal, tax_rate, tax_amount, total, status, valid_until, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'enviado', $9, $10)
      RETURNING *;
    `;

    const result = await query(sql, [
      code,
      client_id,
      dossier_id || null,
      JSON.stringify(items),
      subtotal,
      tax_rate,
      tax_amount,
      total,
      valid_until || null,
      notes || null,
    ]);

    res.status(201).json({ quote: result.rows[0], message: 'Presupuesto creado con éxito' });
  } catch (error) {
    console.error('Error creando presupuesto:', error);
    res.status(500).json({ error: 'Error al generar presupuesto' });
  }
});

// POST /api/quotes/:id/convert - Convertir presupuesto a Factura FAC-2026-XXXX
router.post('/quotes/:id/convert', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quoteRes = await query('SELECT * FROM quotes WHERE id = $1', [id]);
    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }
    const quote = quoteRes.rows[0];

    // Generar código de factura FAC-2026-XXXX
    const countRes = await query(`SELECT COUNT(*) FROM invoices`);
    const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
    const year = new Date().getFullYear();
    const invoiceCode = `FAC-${year}-${String(nextNum).padStart(4, '0')}`;

    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 14); // 14 días para pago

    // Crear la factura
    const invSql = `
      INSERT INTO invoices (code, quote_id, client_id, dossier_id, items, subtotal, tax_rate, tax_amount, total, status, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'emitida', $10)
      RETURNING *;
    `;

    const invResult = await query(invSql, [
      invoiceCode,
      quote.id,
      quote.client_id,
      quote.dossier_id,
      quote.items,
      quote.subtotal,
      quote.tax_rate,
      quote.tax_amount,
      quote.total,
      due_date.toISOString().split('T')[0],
    ]);

    // Marcar presupuesto como 'convertido'
    await query(`UPDATE quotes SET status = 'convertido', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    res.status(201).json({
      invoice: invResult.rows[0],
      message: `Presupuesto ${quote.code} convertido exitosamente a Factura ${invoiceCode}`,
    });
  } catch (error) {
    console.error('Error convirtiendo presupuesto a factura:', error);
    res.status(500).json({ error: 'Error en la conversión a factura' });
  }
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
