import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();
const fields = ['logo_url','commercial_name','legal_name','description','address','city','country','kvk','vat_id','iban','email','phone','footer_text','default_language','quote_prefix','invoice_prefix','number_format'] as const;

router.get('/', async (_req: Request, res: Response) => {
  const result = await query('SELECT * FROM company_document_settings WHERE id = 1');
  res.json({ settings: result.rows[0] || null });
});

router.put('/', async (req: Request, res: Response) => {
  const body = req.body || {};
  const values = fields.map((field) => String(body[field] ?? '').trim().slice(0, field === 'description' || field === 'footer_text' ? 2000 : 500));
  if (!values[1]) return res.status(400).json({ error: 'El nombre comercial es obligatorio.' });
  if (values[10] && !/^\S+@\S+\.\S+$/.test(values[10])) return res.status(400).json({ error: 'El email no tiene un formato válido.' });
  const columns = fields.join(', ');
  const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
  const updates = fields.map((field) => `${field}=EXCLUDED.${field}`).join(', ');
  const result = await query(`INSERT INTO company_document_settings (id, ${columns}, updated_by, updated_at) VALUES (1, ${placeholders}, $${fields.length + 1}, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET ${updates}, updated_by=EXCLUDED.updated_by, updated_at=CURRENT_TIMESTAMP RETURNING *`, [...values, req.user?.id || null]);
  res.json({ settings: result.rows[0], message: 'Datos de empresa guardados correctamente.' });
});

export default router;
