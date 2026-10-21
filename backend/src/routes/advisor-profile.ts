import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

const DEFAULT_PROFILE = {
  full_name: 'Tu gestor',
  title: 'Asesoría RP Gestoría',
  organization: 'RP Gestoría & Asesoría',
  phone: '',
  email: '',
  hours: 'Lunes a viernes, 09:00–17:00',
  online: true,
  avatar_url: '',
  bio: 'Estoy aquí para ayudarte con tus trámites en Holanda.',
  booking_enabled: true,
  chat_enabled: true,
};

router.get('/', async (_req: Request, res: Response) => {
  const result = await query('SELECT * FROM portal_advisor_profile WHERE id = 1');
  res.json({ profile: result.rows[0] || { id: 1, ...DEFAULT_PROFILE } });
});

router.put('/', async (req: Request, res: Response) => {
  const body = req.body || {};
  const values = {
    full_name: String(body.full_name || '').trim().slice(0, 120),
    title: String(body.title || '').trim().slice(0, 120),
    organization: String(body.organization || '').trim().slice(0, 160),
    phone: String(body.phone || '').trim().slice(0, 50),
    email: String(body.email || '').trim().slice(0, 255),
    hours: String(body.hours || '').trim().slice(0, 160),
    online: Boolean(body.online),
    avatar_url: String(body.avatar_url || '').trim().slice(0, 500),
    bio: String(body.bio || '').trim().slice(0, 600),
    booking_enabled: Boolean(body.booking_enabled),
    chat_enabled: Boolean(body.chat_enabled),
  };
  if (!values.full_name || !values.organization) return res.status(400).json({ error: 'El nombre y la organización son obligatorios.' });
  if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) return res.status(400).json({ error: 'El correo no tiene un formato válido.' });
  const result = await query(`
    INSERT INTO portal_advisor_profile (id, full_name, title, organization, phone, email, hours, online, avatar_url, bio, booking_enabled, chat_enabled, updated_by, updated_at)
    VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET full_name=EXCLUDED.full_name, title=EXCLUDED.title, organization=EXCLUDED.organization, phone=EXCLUDED.phone, email=EXCLUDED.email, hours=EXCLUDED.hours, online=EXCLUDED.online, avatar_url=EXCLUDED.avatar_url, bio=EXCLUDED.bio, booking_enabled=EXCLUDED.booking_enabled, chat_enabled=EXCLUDED.chat_enabled, updated_by=EXCLUDED.updated_by, updated_at=CURRENT_TIMESTAMP
    RETURNING *`, [values.full_name, values.title, values.organization, values.phone, values.email, values.hours, values.online, values.avatar_url, values.bio, values.booking_enabled, values.chat_enabled, req.user?.id || null]);
  res.json({ profile: result.rows[0], message: 'Perfil guardado correctamente.' });
});

export default router;
