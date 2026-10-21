import { Router } from 'express';
import { query } from '../db/index.js';
const router = Router();
router.get('/debts', async (req, res) => {
  if (!req.user?.client_id) return res.status(403).json({ error: 'Esta cuenta no tiene un cliente asociado' });
  const result = await query(`SELECT id, creditor, reference, status, original_amount, paid_amount, (original_amount-paid_amount) AS pending_amount, due_date, plan_name FROM debts WHERE owner_type='client' AND client_id=$1 AND visible_to_client=true AND status <> 'deleted' ORDER BY due_date ASC NULLS LAST`, [req.user.client_id]);
  res.json({ debts: result.rows });
});
export default router;
