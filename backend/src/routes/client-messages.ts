import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();
const visibleValues = new Set(['internal', 'client']);

router.get('/:clientId', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT m.id, m.client_id, m.visibility, m.body, m.created_at,
              m.author_user_id, u.full_name AS author_name, u.role AS author_role
       FROM client_messages m
       LEFT JOIN users u ON u.id = m.author_user_id
       WHERE m.client_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.clientId],
    );
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Error al cargar mensajes del cliente:', error);
    res.status(500).json({ error: 'No se pudieron cargar los mensajes' });
  }
});

router.post('/:clientId', async (req: Request, res: Response) => {
  const body = String(req.body?.body || '').trim();
  const visibility = String(req.body?.visibility || 'internal');
  if (!body) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  if (!visibleValues.has(visibility)) return res.status(400).json({ error: 'Visibilidad no válida' });
  try {
    const result = await query(
      `INSERT INTO client_messages (client_id, author_user_id, visibility, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, client_id, visibility, body, created_at`,
      [req.params.clientId, req.user?.id || null, visibility, body],
    );
    res.status(201).json({ message: result.rows[0] });
  } catch (error) {
    console.error('Error al guardar mensaje del cliente:', error);
    res.status(500).json({ error: 'No se pudo guardar el mensaje' });
  }
});

export default router;
