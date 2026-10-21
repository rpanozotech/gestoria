import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { encryptSecret } from '../utils/crypto.js';

const router = Router();
const PROVIDERS = ['brevo', 'resend', 'meta_whatsapp', 'twilio_whatsapp', '360dialog_whatsapp'] as const;
const allowedKeys = new Set(['email', 'whatsapp']);

router.get('/', async (_req: Request, res: Response) => {
  const result = await query(`SELECT channel, provider, enabled, config, (secret_ciphertext IS NOT NULL) AS configured, updated_at FROM integration_settings ORDER BY channel`);
  res.json({ integrations: result.rows });
});

router.put('/:channel', async (req: Request, res: Response) => {
  const { channel } = req.params;
  const { provider, enabled = false, config = {}, secret } = req.body || {};
  if (!allowedKeys.has(channel) || !PROVIDERS.includes(provider)) return res.status(400).json({ error: 'Canal o proveedor no válido' });
  if (channel === 'email' && !['brevo', 'resend'].includes(provider)) return res.status(400).json({ error: 'Proveedor de email no válido' });
  if (channel === 'whatsapp' && !String(provider).includes('whatsapp')) return res.status(400).json({ error: 'Proveedor de WhatsApp no válido' });
  if (typeof config !== 'object' || Array.isArray(config)) return res.status(400).json({ error: 'La configuración debe ser un objeto' });
  try {
    let encrypted = null;
    if (typeof secret === 'string' && secret.trim()) encrypted = encryptSecret(secret.trim());
    await query(
      `INSERT INTO integration_settings (channel, provider, enabled, config, secret_ciphertext, secret_iv, secret_tag, updated_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8)
       ON CONFLICT (channel) DO UPDATE SET provider=EXCLUDED.provider, enabled=EXCLUDED.enabled, config=EXCLUDED.config,
         secret_ciphertext=COALESCE(EXCLUDED.secret_ciphertext, integration_settings.secret_ciphertext),
         secret_iv=COALESCE(EXCLUDED.secret_iv, integration_settings.secret_iv), secret_tag=COALESCE(EXCLUDED.secret_tag, integration_settings.secret_tag),
         updated_by=EXCLUDED.updated_by, updated_at=CURRENT_TIMESTAMP`,
      [channel, provider, Boolean(enabled), JSON.stringify(config), encrypted?.ciphertext || null, encrypted?.iv || null, encrypted?.tag || null, req.user?.id || null],
    );
    const saved = await query(`SELECT channel, provider, enabled, config, (secret_ciphertext IS NOT NULL) AS configured, updated_at FROM integration_settings WHERE channel=$1`, [channel]);
    res.json({ integration: saved.rows[0] });
  } catch (error: any) {
    if (String(error?.message).includes('INTEGRATION_ENCRYPTION_KEY')) return res.status(503).json({ error: 'Falta configurar INTEGRATION_ENCRYPTION_KEY en el servidor' });
    console.error('Error guardando integración:', error);
    res.status(500).json({ error: 'No se pudo guardar la integración' });
  }
});

export default router;
