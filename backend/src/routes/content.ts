import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sanitizeContentBlocks } from '../utils/content-sanitize.js';

export const publicContentRouter = Router();
publicContentRouter.get('/:pageKey', async (req: Request, res: Response) => {
  const locale = String(req.query.locale || 'ES').toUpperCase();
  const result = await query(`SELECT page_key, locale, version, blocks, seo_title, seo_description, published_at FROM public_content WHERE page_key = $1 AND locale = $2 AND status = 'published' ORDER BY version DESC LIMIT 1`, [req.params.pageKey, locale]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Contenido publicado no encontrado' });
  const row = result.rows[0];
  res.json({ ...row, blocks: sanitizeContentBlocks(row.blocks) });
});

export const contentAdminRouter = Router();
contentAdminRouter.use(requireAuth, requireRole('admin', 'gestor'));
contentAdminRouter.get('/', async (_req, res) => {
  const result = await query(`SELECT page_key, locale, status, MAX(version)::int AS version, MAX(updated_at) AS updated_at, MAX(published_at) AS published_at FROM public_content GROUP BY page_key, locale, status ORDER BY page_key, locale, status`);
  res.json({ pages: result.rows });
});
contentAdminRouter.post('/', async (req: Request, res: Response) => {
  const { page_key, locale = 'ES', blocks = [], seo_title = '', seo_description = '', status = 'draft' } = req.body || {};
  if (!/^[a-z0-9-]{2,80}$/.test(String(page_key || '')) || !['ES', 'EN', 'NL'].includes(locale) || !['draft', 'published'].includes(status)) return res.status(400).json({ error: 'Contenido inválido' });
  const clean = sanitizeContentBlocks(blocks);
  const max = await query('SELECT COALESCE(MAX(version),0)::int AS version FROM public_content WHERE page_key=$1 AND locale=$2', [page_key, locale]);
  const version = max.rows[0].version + 1;
  const result = await query(`INSERT INTO public_content (page_key, locale, version, status, blocks, seo_title, seo_description, updated_by, published_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,CASE WHEN $4='published' THEN CURRENT_TIMESTAMP ELSE NULL END) RETURNING id,page_key,locale,version,status,blocks,seo_title,seo_description,published_at`, [page_key, locale, version, status, JSON.stringify(clean), String(seo_title).slice(0,160), String(seo_description).slice(0,320), req.user?.id]);
  res.status(201).json({ content: result.rows[0] });
});
contentAdminRouter.post('/:pageKey/:locale/publish/:version', async (req: Request, res: Response) => {
  const { pageKey, locale, version } = req.params;
  const clientVersion = Number(version);
  if (!Number.isInteger(clientVersion)) return res.status(400).json({ error: 'Versión inválida' });
  await query('UPDATE public_content SET status=CASE WHEN version=$3 THEN \'published\' ELSE \'draft\' END, published_at=CASE WHEN version=$3 THEN CURRENT_TIMESTAMP ELSE published_at END, updated_at=CURRENT_TIMESTAMP WHERE page_key=$1 AND locale=$2', [pageKey, locale.toUpperCase(), clientVersion]);
  res.json({ ok: true, page_key: pageKey, locale: locale.toUpperCase(), version: clientVersion });
});
