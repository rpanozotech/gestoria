import { Router, Request, Response } from 'express';
import { query, pool } from '../db/index.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const audit = async (req: Request, debtId: string, action: string, changes: Record<string, unknown> = {}) => {
  await query('INSERT INTO debt_audit_log (debt_id, actor_user_id, actor_role, action, changes) VALUES ($1,$2,$3,$4,$5::jsonb)', [debtId, req.user?.id, req.user?.role, action, JSON.stringify(changes)]);
};
router.get('/debts', async (req, res) => {
  const result = await query(`SELECT d.*, c.full_name AS client_name, COALESCE(SUM(p.amount),0) AS paid_total FROM debts d LEFT JOIN clients c ON c.id=d.client_id LEFT JOIN debt_payments p ON p.debt_id=d.id WHERE d.owner_type='client' GROUP BY d.id,c.full_name ORDER BY d.due_date ASC NULLS LAST`);
  res.json({ debts: result.rows });
});
router.get('/debts/:id', async (req, res) => {
  const debt = await query(`SELECT d.*, c.full_name AS client_name FROM debts d LEFT JOIN clients c ON c.id=d.client_id WHERE d.id=$1 AND d.owner_type='client'`, [req.params.id]);
  if (!debt.rows.length) return res.status(404).json({ error: 'Deuda no encontrada' });
  const [payments, installments, documents, notes, history] = await Promise.all([
    query('SELECT * FROM debt_payments WHERE debt_id=$1 ORDER BY paid_at DESC', [req.params.id]),
    query('SELECT * FROM debt_installments WHERE debt_id=$1 ORDER BY installment_number', [req.params.id]),
    query('SELECT * FROM debt_documents WHERE debt_id=$1 ORDER BY created_at DESC', [req.params.id]),
    query('SELECT * FROM debt_notes WHERE debt_id=$1 ORDER BY created_at DESC', [req.params.id]),
    query('SELECT * FROM debt_audit_log WHERE debt_id=$1 ORDER BY created_at DESC', [req.params.id]),
  ]);
  res.json({ debt: debt.rows[0], payments: payments.rows, installments: installments.rows, documents: documents.rows, notes: notes.rows, history: history.rows });
});
router.post('/debts/:id/plan', async (req, res) => {
  const installments = Array.isArray(req.body?.installments) ? req.body.installments : [];
  if (!installments.length) return res.status(400).json({ error: 'El plan debe incluir al menos una cuota' });
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const debt = await db.query("SELECT id, original_amount, paid_amount, owner_type FROM debts WHERE id=$1 AND owner_type='client' FOR UPDATE", [req.params.id]);
    if (!debt.rows.length) { await db.query('ROLLBACK'); return res.status(404).json({ error: 'Deuda no encontrada' }); }
    const outstanding = Math.round((Number(debt.rows[0].original_amount) - Number(debt.rows[0].paid_amount)) * 100) / 100;
    const normalized = installments.map((item: any, index: number) => ({ number: index + 1, due_date: String(item.due_date || ''), amount: Math.round(Number(item.amount) * 100) / 100 })).filter((item: any) => /^\\d{4}-\\d{2}-\\d{2}$/.test(item.due_date) && Number.isFinite(item.amount) && item.amount > 0);
    const total = Math.round(normalized.reduce((sum: number, item: any) => sum + item.amount, 0) * 100) / 100;
    if (normalized.length !== installments.length || Math.abs(total - outstanding) > 0.01) { await db.query('ROLLBACK'); return res.status(400).json({ error: `Las cuotas deben sumar exactamente el saldo pendiente (${outstanding.toFixed(2)} €).`, outstanding, total }); }
    await db.query('DELETE FROM debt_installments WHERE debt_id=$1', [req.params.id]);
    for (const item of normalized) await db.query('INSERT INTO debt_installments (debt_id, installment_number, due_date, amount, status) VALUES ($1,$2,$3,$4,$5)', [req.params.id, item.number, item.due_date, item.amount, 'pending']);
    await db.query("UPDATE debts SET status='en_cuotas', plan_name=$2, due_date=$3, updated_by=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$1", [req.params.id, `${normalized.length} cuotas`, normalized[0].due_date, req.user?.id]);
    await db.query('COMMIT'); await audit(req, req.params.id, 'payment_plan_created', { installments: normalized }); res.status(201).json({ installments: normalized, outstanding });
  } catch (error) { await db.query('ROLLBACK').catch(() => undefined); console.error('Error creando plan de deuda:', error); res.status(500).json({ error: 'No se pudo crear el plan de pagos' }); } finally { db.release(); }
});

router.post('/debts/:id/payments', async (req, res) => {
  const amount = Number(req.body?.amount); if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Importe inválido' });
  const result = await query('INSERT INTO debt_payments (debt_id, amount, paid_at, status, created_by) VALUES ($1,$2,COALESCE($3::date,CURRENT_DATE),\'paid\',$4) RETURNING *', [req.params.id, amount, req.body?.paid_at || null, req.user?.id]);
  await query('UPDATE debts SET paid_amount=(SELECT COALESCE(SUM(amount),0) FROM debt_payments WHERE debt_id=$1), updated_by=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND owner_type=\'client\'', [req.params.id, req.user?.id]);
  await audit(req, req.params.id, 'payment_created', { amount }); res.status(201).json({ payment: result.rows[0] });
});
router.post('/debts', async (req, res) => {
  const { client_id, creditor, reference, original_amount, due_date, plan_name, visible_to_client } = req.body || {};
  const amount = Number(original_amount);
  if (!client_id || !String(creditor || '').trim() || !String(reference || '').trim() || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Cliente, acreedor, referencia e importe positivo son obligatorios' });
  const client = await query('SELECT id FROM clients WHERE id=$1 AND status <> $2', [client_id, 'eliminado']);
  if (!client.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
  const result = await query(`INSERT INTO debts (client_id, owner_type, creditor, reference, status, original_amount, due_date, plan_name, visible_to_client, created_by, updated_by) VALUES ($1,'client',$2,$3,'pending',$4,$5,$6,$7,$8,$8) RETURNING *`, [client_id, String(creditor).trim(), String(reference).trim(), amount, due_date || null, plan_name || null, Boolean(visible_to_client), req.user?.id]);
  await audit(req, result.rows[0].id, 'client_debt_created', { client_id, amount }); res.status(201).json({ debt: result.rows[0] });
});

router.delete('/debts/:id', async (req, res) => {
  const payments = await query("SELECT COUNT(*)::int AS count FROM debt_payments p JOIN debts d ON d.id=p.debt_id WHERE p.debt_id=$1 AND d.owner_type='client'", [req.params.id]);
  if (!payments.rows.length) return res.status(404).json({ error: 'Deuda de cliente no encontrada' });
  if (payments.rows[0].count > 0) return res.status(409).json({ error: 'No se puede eliminar una deuda con pagos registrados.' });
  const result = await query("DELETE FROM debts WHERE id=$1 AND owner_type='client' RETURNING id", [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Deuda no encontrada' });
  res.json({ ok: true, deleted_id: result.rows[0].id });
});

router.get('/obligations', requireRole('admin'), async (_req, res) => {
  const result = await query(`SELECT d.*, COALESCE(SUM(p.amount),0) AS paid_total FROM debts d LEFT JOIN debt_payments p ON p.debt_id=d.id WHERE d.owner_type='own' GROUP BY d.id ORDER BY d.due_date ASC NULLS LAST`);
  res.json({ obligations: result.rows });
});
router.post('/obligations', requireRole('admin'), async (req, res) => {
  const result = await query(`INSERT INTO debts (owner_type, creditor, reference, status, original_amount, due_date, created_by, updated_by) VALUES ('own',$1,$2,$3,$4,$5,$6,$6) RETURNING *`, [req.body.creditor, req.body.reference, req.body.status || 'pending', Number(req.body.original_amount || 0), req.body.due_date || null, req.user?.id]);
  await audit(req, result.rows[0].id, 'own_obligation_created', { creditor: req.body.creditor }); res.status(201).json({ obligation: result.rows[0] });
});
router.delete('/obligations/:id', requireRole('admin'), async (req, res) => {
  const payments = await query("SELECT COUNT(*)::int AS count FROM debt_payments p JOIN debts d ON d.id=p.debt_id WHERE p.debt_id=$1 AND d.owner_type='own'", [req.params.id]);
  if (!payments.rows.length) return res.status(404).json({ error: 'Obligación no encontrada' });
  if (payments.rows[0].count > 0) return res.status(409).json({ error: 'No se puede eliminar una obligación con pagos registrados.' });
  const result = await query("DELETE FROM debts WHERE id=$1 AND owner_type='own' RETURNING id", [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Obligación no encontrada' });
  res.json({ ok: true, deleted_id: result.rows[0].id });
});

export default router;
