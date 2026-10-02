import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('cliente'));

router.get('/me', async (req: Request, res: Response) => {
  try {
    const clientId = req.user?.client_id;
    if (!clientId) return res.status(403).json({ error: 'La sesión no está vinculada a un cliente' });
    const [client, dossiers, invoices, documents, appointments] = await Promise.all([
      query('SELECT id, full_name, email, phone, bsn, address, city, country, iban, digid_status, status FROM clients WHERE id = $1', [clientId]),
      query('SELECT * FROM dossiers WHERE client_id = $1 ORDER BY created_at DESC', [clientId]),
      query('SELECT * FROM invoices WHERE client_id = $1 ORDER BY created_at DESC', [clientId]),
      query('SELECT id, file_name, file_size, mime_type, category, ocr_status, is_verified, created_at FROM documents WHERE client_id = $1 ORDER BY created_at DESC', [clientId]),
      query('SELECT * FROM appointments WHERE client_id = $1 ORDER BY appointment_date DESC, appointment_time DESC', [clientId]),
    ]);
    if (client.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ client: client.rows[0], dossiers: dossiers.rows, invoices: invoices.rows, documents: documents.rows, appointments: appointments.rows });
  } catch (error) {
    console.error('Error cargando portal:', error);
    res.status(500).json({ error: 'No se pudo cargar el portal' });
  }
});

export default router;
