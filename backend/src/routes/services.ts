import { Router, Request, Response } from 'express';
import { query, pool } from '../db/index.js';

function toService(row: any) {
  return {
    id: String(row.id),
    code: row.code,
    slug: row.slug || row.id,
    icon: row.icon,
    title: row.title,
    category: row.category,
    basePrice: Number(row.base_price),
    priceFinal: Number(row.base_price),
    priceIncludesBtw: true,
    btwRate: Number(row.btw_rate),
    badge: row.badge,
    duration: row.duration,
    active: Boolean(row.active),
    visibleWeb: row.visible_web !== false,
    sortOrder: Number(row.sort_order || 0),
    requirements: Array.isArray(row.requirements) ? row.requirements : [],
    desc: row.description || '',
  };
}

async function listServices(publicOnly = false) {
  const result = await query(
    publicOnly
      ? 'SELECT * FROM service_prices WHERE active = TRUE AND visible_web = TRUE ORDER BY sort_order ASC, title ASC'
      : 'SELECT * FROM service_prices ORDER BY sort_order ASC, title ASC'
  );
  return result.rows.map(toService);
}

export const publicServicesRouter = Router();
publicServicesRouter.get('/', async (_req: Request, res: Response) => {
  try { res.json({ services: await listServices(true) }); }
  catch (error) { console.error('Error listando servicios públicos:', error); res.status(500).json({ error: 'No se pudo cargar el catálogo de servicios' }); }
});

const router = Router();
router.get('/', async (_req: Request, res: Response) => {
  try { res.json({ services: await listServices(false) }); }
  catch (error) { console.error('Error listando servicios:', error); res.status(500).json({ error: 'No se pudo cargar el catálogo de servicios' }); }
});

router.put('/bulk', async (req: Request, res: Response) => {
  const services = Array.isArray(req.body?.services) ? req.body.services : [];
  if (services.length === 0) return res.status(400).json({ error: 'El catálogo no puede estar vacío.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const service of services) {
      const id = String(service.id || service.code || '').trim();
      const code = String(service.code || id).trim();
      const title = String(service.title || '').trim();
      if (!id || !code || !title) continue;
      await client.query(`
        INSERT INTO service_prices
          (id, code, slug, icon, title, category, base_price, btw_rate, badge, duration, active, visible_web, sort_order, description, requirements, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          code=EXCLUDED.code, slug=EXCLUDED.slug, icon=EXCLUDED.icon, title=EXCLUDED.title,
          category=EXCLUDED.category, base_price=EXCLUDED.base_price, btw_rate=EXCLUDED.btw_rate,
          badge=EXCLUDED.badge, duration=EXCLUDED.duration, active=EXCLUDED.active,
          visible_web=EXCLUDED.visible_web, sort_order=EXCLUDED.sort_order,
          description=EXCLUDED.description, requirements=EXCLUDED.requirements, updated_at=CURRENT_TIMESTAMP`,
        [id, code, String(service.slug || id), service.icon || 'receipt_long', title, service.category || 'otros', Number(service.basePrice ?? service.priceFinal) || 0,
          Number(service.btwRate) || 0.21, service.badge || 'Servicio', service.duration || 'Según caso', service.active !== false,
          service.visibleWeb !== false, Number(service.sortOrder) || 0, service.desc || service.description || null,
          JSON.stringify(Array.isArray(service.requirements) ? service.requirements : [])]
      );
    }
    await client.query('COMMIT');
    res.json({ services: await listServices(false) });
  } catch (error) {
    // El ROLLBACK se protege: si la conexión ya está rota (error de red, por
    // ejemplo) este query también lanza, y sin este guard el `finally` nunca
    // llega a release() y la conexión se fugaria al pool.
    //
    // No se relanza el error: Express 4 no captura rechazos de promesas en
    // handlers async, asi que un `throw` aqui se convierte en unhandledRejection
    // que tumba el proceso entero (API caida, no solo este endpoint).
    try { await client.query('ROLLBACK'); } catch { /* la conexión ya no sirve */ }
    console.error('Error guardando el catalogo de servicios:', error);
    res.status(500).json({ error: 'No se pudo guardar el catalogo de servicios' });
  } finally { client.release(); }
});

export default router;
