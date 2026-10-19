import webpush from 'web-push';
import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();
const DEFAULT_PREFERENCES = { citas: true, deudas: true, pagos: true, documentos: true, mensajes: true, facturas: true, tareas: true };
function configurePush() {
  const subject = process.env.VAPID_SUBJECT; const publicKey = process.env.VAPID_PUBLIC_KEY; const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey); return true;
}
router.get('/public-key', (_req, res) => res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null, enabled: Boolean(configurePush()) }));
router.get('/preferences', async (req: Request, res: Response) => {
  const result = await query('SELECT preferences FROM push_preferences WHERE user_id = $1', [req.user!.id]);
  res.json({ preferences: { ...DEFAULT_PREFERENCES, ...(result.rows[0]?.preferences || {}) } });
});
router.put('/preferences', async (req: Request, res: Response) => {
  const preferences = Object.fromEntries(Object.keys(DEFAULT_PREFERENCES).map((key) => [key, req.body?.[key] !== false]));
  await query(`INSERT INTO push_preferences (user_id, preferences, updated_at) VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = CURRENT_TIMESTAMP`, [req.user!.id, JSON.stringify(preferences)]);
  res.json({ preferences });
});
router.post('/subscription', async (req: Request, res: Response) => {
  const subscription = req.body?.subscription;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return res.status(400).json({ error: 'Suscripción inválida' });
  await query(`INSERT INTO push_subscriptions (user_id, endpoint, subscription, updated_at) VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP)
    ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, subscription = EXCLUDED.subscription, updated_at = CURRENT_TIMESTAMP`, [req.user!.id, subscription.endpoint, JSON.stringify(subscription)]);
  res.status(201).json({ ok: true });
});
router.delete('/subscription', async (req: Request, res: Response) => {
  if (req.body?.endpoint) await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [req.user!.id, req.body.endpoint]);
  else await query('DELETE FROM push_subscriptions WHERE user_id = $1', [req.user!.id]);
  res.json({ ok: true });
});
router.post('/send-test', async (req: Request, res: Response) => {
  if (!configurePush()) return res.status(503).json({ error: 'Push no configurado en este entorno' });
  const subscriptions = await query('SELECT id, subscription FROM push_subscriptions WHERE user_id = $1', [req.user!.id]);
  const payload = JSON.stringify({ title: 'RP Asesoría', body: 'Tienes una actualización pendiente en RP Asesoría', url: '/crm' });
  let sent = 0;
  for (const row of subscriptions.rows) {
    try { await webpush.sendNotification(row.subscription, payload); sent += 1; }
    catch (error: any) { if (error?.statusCode === 404 || error?.statusCode === 410) await query('DELETE FROM push_subscriptions WHERE id = $1', [row.id]); }
  }
  res.json({ ok: true, sent });
});
export default router;
