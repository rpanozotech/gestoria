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
  try {
    const file = req.file;
    const { client_id, dossier_id, category } = req.body;

    if (!file || !client_id) {
      return res.status(400).json({ error: 'Se requiere el archivo y el ID del cliente' });
    }

    const sql = `
      INSERT INTO documents (client_id, dossier_id, file_name, file_path, file_size, mime_type, category, ocr_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'completado')
      RETURNING *;
    `;

    const result = await query(sql, [
      client_id,
      dossier_id || null,
      file.originalname,
      file.path,
      file.size,
      file.mimetype,
      category || 'otro',
    ]);

    res.status(201).json({
      document: result.rows[0],
      message: 'Documento subido y registrado exitosamente',
    });
  } catch (error) {
    console.error('Error subiendo documento:', error);
    res.status(500).json({ error: 'Error al procesar el archivo' });
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
