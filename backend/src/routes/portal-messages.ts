import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT m.id, m.client_id, m.visibility, m.body, m.created_at,
              m.author_user_id, u.full_name AS author_name, u.role AS author_role
       FROM client_messages m
       LEFT JOIN users u ON u.id = m.author_user_id
       WHERE m.client_id = $1 AND m.visibility = 'client'
       ORDER BY m.created_at ASC`,
      [req.user?.client_id],
    );
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Error al cargar mensajes del portal:', error);
    res.status(500).json({ error: 'No se pudieron cargar los mensajes' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  try {
    const result = await query(
      `INSERT INTO client_messages (client_id, author_user_id, visibility, body)
       VALUES ($1, $2, 'client', $3)
       RETURNING id, client_id, visibility, body, created_at`,
      [req.user?.client_id, req.user?.id, body],
    );
    res.status(201).json({ message: result.rows[0] });
  } catch (error) {
    console.error('Error al guardar mensaje del portal:', error);
    res.status(500).json({ error: 'No se pudo guardar el mensaje' });
  }
});

export default router;
