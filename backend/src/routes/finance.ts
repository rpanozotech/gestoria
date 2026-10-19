import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
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
router.post('/debts/:id/payments', async (req, res) => {
  const amount = Number(req.body?.amount); if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Importe inválido' });
  const result = await query('INSERT INTO debt_payments (debt_id, amount, paid_at, status, created_by) VALUES ($1,$2,COALESCE($3::date,CURRENT_DATE),\'paid\',$4) RETURNING *', [req.params.id, amount, req.body?.paid_at || null, req.user?.id]);
  await query('UPDATE debts SET paid_amount=(SELECT COALESCE(SUM(amount),0) FROM debt_payments WHERE debt_id=$1), updated_by=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND owner_type=\'client\'', [req.params.id, req.user?.id]);
  await audit(req, req.params.id, 'payment_created', { amount }); res.status(201).json({ payment: result.rows[0] });
});
router.get('/obligations', requireRole('admin'), async (_req, res) => {
  const result = await query(`SELECT d.*, COALESCE(SUM(p.amount),0) AS paid_total FROM debts d LEFT JOIN debt_payments p ON p.debt_id=d.id WHERE d.owner_type='own' GROUP BY d.id ORDER BY d.due_date ASC NULLS LAST`);
  res.json({ obligations: result.rows });
});
router.post('/obligations', requireRole('admin'), async (req, res) => {
  const result = await query(`INSERT INTO debts (owner_type, creditor, reference, status, original_amount, due_date, created_by, updated_by) VALUES ('own',$1,$2,$3,$4,$5,$6,$6) RETURNING *`, [req.body.creditor, req.body.reference, req.body.status || 'pending', Number(req.body.original_amount || 0), req.body.due_date || null, req.user?.id]);
  await audit(req, result.rows[0].id, 'own_obligation_created', { creditor: req.body.creditor }); res.status(201).json({ obligation: result.rows[0] });
});
export default router;
