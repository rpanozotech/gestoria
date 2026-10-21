import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', async (req: Request, res: Response) => {
  const fullName = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || '').trim();
  const topic = String(req.body?.topic || '').trim();
  const message = String(req.body?.message || '').trim();
  if (!fullName || !email || !phone || !topic || !message || req.body?.legal_consent !== true) {
    return res.status(400).json({ error: 'Completa todos los campos y acepta la política de privacidad.' });
  }
  if (!emailPattern.test(email) || fullName.length > 200 || email.length > 320 || phone.length > 50 || topic.length > 100 || message.length > 5000) {
    return res.status(400).json({ error: 'Revisa el formato o la longitud de los campos.' });
  }
  try {
    const result = await query(
      `INSERT INTO contact_messages (full_name,email,phone,topic,message,legal_consent,legal_consent_at)
       VALUES ($1,$2,$3,$4,$5,true,CURRENT_TIMESTAMP)
       RETURNING id, created_at`,
      [fullName, email, phone, topic, message],
    );
    return res.status(201).json({ message: 'Consulta guardada. El equipo puede verla en el CRM.', id: result.rows[0].id });
  } catch (error) {
    console.error('Error guardando consulta de contacto:', error);
    return res.status(500).json({ error: 'No se pudo guardar tu consulta. Inténtalo de nuevo o escríbenos por los canales indicados.' });
  }
});

router.get('/', requireAuth, requireRole('admin', 'gestor'), async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id,full_name,email,phone,topic,message,status,created_at
       FROM contact_messages ORDER BY created_at DESC LIMIT 200`,
    );
    return res.json({ messages: result.rows });
  } catch (error) {
    console.error('Error listando consultas de contacto:', error);
    return res.status(500).json({ error: 'No se pudieron cargar las consultas.' });
  }
});

export default router;
