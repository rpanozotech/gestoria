import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

function toService(row: any) {
  return {
    id: String(row.id),
    code: row.code,
    icon: row.icon,
    title: row.title,
    category: row.category,
    basePrice: Number(row.base_price),
    btwRate: Number(row.btw_rate),
    badge: row.badge,
    duration: row.duration,
    active: Boolean(row.active),
    desc: row.description || '',
  };
}

router.get('/', async (_req: Request, res: Response) => {
  const result = await query('SELECT * FROM service_prices ORDER BY title ASC');
  res.json({ services: result.rows.map(toService) });
});

router.put('/bulk', async (req: Request, res: Response) => {
  const services = Array.isArray(req.body?.services) ? req.body.services : [];
  if (services.length === 0) {
    return res.status(400).json({ error: 'El catálogo no puede estar vacío.' });
  }

  const client = await (await import('../db/index.js')).pool.connect();
  try {
    await client.query('BEGIN');
    for (const service of services) {
      const id = String(service.id || service.code || '').trim();
      const code = String(service.code || id).trim();
      const title = String(service.title || '').trim();
      if (!id || !code || !title) continue;
      await client.query(
        `INSERT INTO service_prices
          (id, code, icon, title, category, base_price, btw_rate, badge, duration, active, description, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
          code=EXCLUDED.code, icon=EXCLUDED.icon, title=EXCLUDED.title,
          category=EXCLUDED.category, base_price=EXCLUDED.base_price,
          btw_rate=EXCLUDED.btw_rate, badge=EXCLUDED.badge,
          duration=EXCLUDED.duration, active=EXCLUDED.active,
          description=EXCLUDED.description, updated_at=CURRENT_TIMESTAMP`,
        [id, code, service.icon || 'receipt_long', title, service.category || 'otros', Number(service.basePrice) || 0,
          Number(service.btwRate) || 0, service.badge || 'Servicio', service.duration || 'Según caso',
          service.active !== false, service.desc || null]
      );
    }
    await client.query('COMMIT');
    const result = await client.query('SELECT * FROM service_prices ORDER BY title ASC');
    res.json({ services: result.rows.map(toService) });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

export default router;
