import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db/index.js';

const router = Router();

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

// POST /api/documents/upload - Subir documento
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  let storedFilePath: string | null = null;
  try {
    const file = req.file;
    const { client_id, dossier_id, category } = req.body;

    if (!file || !client_id) {
      if (file?.path) fs.rmSync(file.path, { force: true });
      return res.status(400).json({ error: 'Se requiere el archivo y el ID del cliente' });
    }
    storedFilePath = path.resolve(file.path);

    const sql = `
      INSERT INTO documents (client_id, dossier_id, file_name, file_path, file_size, mime_type, category, ocr_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'completado')
      RETURNING *;
    `;

    const result = await query(sql, [
      client_id,
      dossier_id || null,
      file.originalname,
      storedFilePath,
      file.size,
      file.mimetype,
      category || 'otro',
    ]);

    res.status(201).json({
      document: result.rows[0],
      message: 'Documento subido y registrado exitosamente',
    });
  } catch (error) {
    if (storedFilePath) fs.rmSync(storedFilePath, { force: true });
    console.error('Error subiendo documento:', error);
    res.status(500).json({ error: 'Error al procesar el archivo' });
  }
});

// POST /api/documents/text - Crear una nota/documento de texto asociado al cliente
router.post('/text', async (req: Request, res: Response) => {
  let filePath: string | null = null;
  try {
    const { client_id, dossier_id, category, file_name, content } = req.body || {};
    if (!client_id || !file_name || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Se requiere cliente, nombre y contenido del documento.' });
    }

    const safeName = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
    filePath = path.join(uploadDir, storedName);
    fs.writeFileSync(filePath, content, 'utf8');
    const result = await query(
      `INSERT INTO documents (client_id, dossier_id, file_name, file_path, file_size, mime_type, category, ocr_status)
       VALUES ($1, $2, $3, $4, $5, 'text/plain', $6, 'completado')
       RETURNING *`,
      [client_id, dossier_id || null, file_name, filePath, Buffer.byteLength(content, 'utf8'), category || 'otro']
    );
    return res.status(201).json({ document: result.rows[0], message: 'Documento de texto guardado correctamente.' });
  } catch (error) {
    if (filePath) fs.rmSync(filePath, { force: true });
    console.error('Error guardando documento de texto:', error);
    return res.status(500).json({ error: 'Error al guardar el documento de texto.' });
  }
});

// GET /api/documents/:id/download - Ver archivo dentro del CRM
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT file_path, file_name, mime_type FROM documents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Documento no encontrado.' });

    const uploadRoot = path.resolve(uploadDir);
    const storedPath = path.resolve(String(result.rows[0].file_path));
    if (storedPath !== uploadRoot && !storedPath.startsWith(`${uploadRoot}${path.sep}`)) {
      return res.status(403).json({ error: 'Ruta de documento no permitida.' });
    }
    if (!fs.existsSync(storedPath)) return res.status(404).json({ error: 'El archivo no está disponible en el almacenamiento.' });

    res.setHeader('Content-Type', result.rows[0].mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${String(result.rows[0].file_name).replace(/["\r\n]/g, '')}"`);
    return res.sendFile(storedPath);
  } catch (error) {
    console.error('Error visualizando documento:', error);
    return res.status(500).json({ error: 'No se pudo abrir el documento.' });
  }
});

// GET /api/documents - Listar documentos
router.get('/', async (req: Request, res: Response) => {
  try {
    const { client_id, dossier_id } = req.query;
    let sql = 'SELECT * FROM documents WHERE 1=1';
    const params: any[] = [];

    if (client_id) {
      params.push(client_id);
      sql += ` AND client_id = $${params.length}`;
    }
    if (dossier_id) {
      params.push(dossier_id);
      sql += ` AND dossier_id = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json({ documents: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar documentos' });
  }
});

export default router;
