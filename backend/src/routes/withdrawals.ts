import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
const router = Router();
router.post('/', async (req: Request, res: Response) => {
  const { name, email, service, contracted_at, message, legal_consent } = req.body || {};
  if (!name || !email || !message || legal_consent !== true) return res.status(400).json({ error: 'Nombre, email, mensaje y consentimiento son obligatorios.' });
  const result = await query(`INSERT INTO withdrawal_requests (name,email,service,contracted_at,message,status,created_at) VALUES ($1,$2,$3,$4,$5,'pendiente',CURRENT_TIMESTAMP) RETURNING id,created_at`, [String(name).trim(), String(email).trim(), service || null, contracted_at || null, String(message).trim()]);
  res.status(201).json({ ok: true, request: result.rows[0] });
});
export default router;
