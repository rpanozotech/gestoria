import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { query } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { esTipoDocumentoPermitido, firmaDocumentoValida } from '../utils/upload.js';

const router = Router();
router.use(requireAuth, requireRole('cliente'));

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const portalUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
      callback(null, `${Date.now()}-${crypto.randomBytes(10).toString('hex')}${extension}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, esTipoDocumentoPermitido(file));
  },
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const clientId = req.user?.client_id;
    if (!clientId) return res.status(403).json({ error: 'La sesión no está vinculada a un cliente' });
    const [client, dossiers, invoices, documents, appointments] = await Promise.all([
      query('SELECT id, full_name, email, phone, bsn, address, city, country, iban, digid_status, status FROM clients WHERE id = $1', [clientId]),
      query('SELECT * FROM dossiers WHERE client_id = $1 ORDER BY created_at DESC', [clientId]),
      query('SELECT * FROM invoices WHERE client_id = $1 ORDER BY created_at DESC', [clientId]),
            query('SELECT id, file_name, file_size, mime_type, category, ocr_status, is_verified, uploaded_by, created_at FROM documents WHERE client_id = $1 ORDER BY created_at DESC', [clientId]),
            query(`SELECT a.*, c.full_name AS client_name, c.phone AS client_phone
              FROM appointments a JOIN clients c ON c.id = a.client_id
              WHERE a.client_id = $1 ORDER BY a.appointment_date DESC, a.appointment_time DESC`, [clientId]),
    ]);
    if (client.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ client: client.rows[0], dossiers: dossiers.rows, invoices: invoices.rows, documents: documents.rows, appointments: appointments.rows });
  } catch (error) {
    console.error('Error cargando portal:', error);
    res.status(500).json({ error: 'No se pudo cargar el portal' });
  }
});

router.post('/bsn/reveal', async (req: Request, res: Response) => {
  const clientId = req.user?.client_id;
  if (!clientId) return res.status(403).json({ error: 'La sesión no está vinculada a un cliente' });
  try {
    const result = await query('SELECT bsn FROM clients WHERE id = $1', [clientId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    await query(
      `INSERT INTO client_audit_log (client_id, actor_user_id, actor_role, action, changes)
       VALUES ($1, $2, $3, 'bsn.revealed', $4::jsonb)`,
      [clientId, req.user?.id || null, req.user?.role || 'cliente', JSON.stringify({ field: 'bsn', origin: 'Portal' })]
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error registrando revelación de BSN del portal:', error);
    return res.status(500).json({ error: 'No se pudo registrar la revelación del BSN' });
  }
});

router.post('/appointments', async (req: Request, res: Response) => {
  const clientId = req.user?.client_id;
  const { title, appointment_date, appointment_time, modality, notes } = req.body || {};
  if (!clientId) return res.status(403).json({ error: 'La sesión no está vinculada a un cliente' });
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(appointment_date || '') || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(appointment_time || '')) {
    return res.status(400).json({ error: 'Indica el motivo, una fecha y una hora válidas.' });
  }
  if (!['online_meet', 'llamada', 'presencial'].includes(modality)) {
    return res.status(400).json({ error: 'Modalidad de cita no válida.' });
  }

  try {
    const conflict = await query(
      `SELECT id FROM appointments
       WHERE appointment_date = $1 AND status NOT IN ('cancelada', 'completada')
         AND ($2::time < appointment_time + ((COALESCE(duration_minutes, 30) + 15) * interval '1 minute'))
         AND (($2::time + interval '45 minutes') > appointment_time)
       LIMIT 1`,
      [appointment_date, appointment_time]
    );
    if (conflict.rows.length > 0) return res.status(409).json({ error: 'Ese horario ya no está disponible. Elige otra hora.' });

    const result = await query(
      `INSERT INTO appointments (client_id, title, appointment_date, appointment_time, duration_minutes, modality, status, notes)
       VALUES ($1, $2, $3, $4, 30, $5, 'pendiente', $6)
       RETURNING *`,
      [clientId, title.trim(), appointment_date, appointment_time, modality, notes ? `Solicitada desde el portal: ${String(notes).trim()}` : 'Solicitada desde el portal del cliente']
    );
    return res.status(201).json({ appointment: { ...result.rows[0], client_name: req.user?.full_name } });
  } catch (error) {
    console.error('Error al solicitar cita desde el portal:', error);
    return res.status(500).json({ error: 'No se pudo guardar la solicitud de cita.' });
  }
});

router.post('/documents', (req: Request, res: Response, next) => {
  portalUpload.single('file')(req, res, (error) => {
    if (error) return res.status(400).json({ error: 'Archivo no válido o supera el límite de 15 MB.' });
    next();
  });
}, async (req: Request, res: Response) => {
  const clientId = req.user?.client_id;
  const file = req.file;
  if (!clientId) return res.status(403).json({ error: 'La sesión no está vinculada a un cliente' });
  if (!file) return res.status(400).json({ error: 'Selecciona un PDF o una imagen JPG/PNG.' });

  try {
    if (!(await firmaDocumentoValida(file.path, file.mimetype))) {
      await unlink(file.path).catch(() => undefined);
      return res.status(400).json({ error: 'La firma del archivo no coincide con su tipo declarado.' });
    }
    const result = await query(
      `INSERT INTO documents (client_id, file_name, file_path, file_size, mime_type, category, ocr_status, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, 'Documento del cliente', 'no_requerido', $6)
       RETURNING id, file_name, file_size, mime_type, category, ocr_status, is_verified, uploaded_by, created_at`,
      [clientId, file.originalname, file.path, file.size, file.mimetype, req.user?.id]
    );
    const document = result.rows[0];
    await query(
      `INSERT INTO client_audit_log (client_id, actor_user_id, actor_role, action, changes)
       VALUES ($1, $2, $3, 'document.uploaded', $4::jsonb)`,
      [clientId, req.user?.id || null, req.user?.role || null, JSON.stringify({
        document_id: document.id,
        file_name: document.file_name,
        category: document.category,
        mime_type: document.mime_type,
      })]
    );
    return res.status(201).json({ document });
  } catch (error) {
    await unlink(file.path).catch(() => undefined);
    console.error('Error guardando documento del portal:', error);
    return res.status(500).json({ error: 'No se pudo guardar el documento.' });
  }
});

router.get('/documents/:id/download', async (req: Request, res: Response) => {
  const clientId = req.user?.client_id;
  if (!clientId) return res.status(403).json({ error: 'La sesión no está vinculada a un cliente' });

  try {
    const result = await query(
      'SELECT file_path, file_name FROM documents WHERE id = $1 AND client_id = $2',
      [req.params.id, clientId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Documento no encontrado' });
    return res.download(result.rows[0].file_path, result.rows[0].file_name, (error) => {
      if (error && !res.headersSent) res.status(404).json({ error: 'El archivo ya no está disponible.' });
    });
  } catch (error) {
    console.error('Error descargando documento del portal:', error);
    return res.status(500).json({ error: 'No se pudo descargar el documento.' });
  }
});

export default router;
