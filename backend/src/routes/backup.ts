import { Router, Request, Response } from 'express';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import * as tar from 'tar';
import type { PoolClient } from 'pg';
import { pool, query } from '../db/index.js';

const router = Router();
const BACKUP_FORMAT = 'nexusgest-full-backup-v1';
const MAX_BACKUP_SIZE = 3 * 1024 * 1024 * 1024;

const fullBackupUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, os.tmpdir()),
    filename: (_req, _file, callback) => callback(null, `nexusgest-restore-${crypto.randomBytes(12).toString('hex')}.tar.gz`),
  }),
  limits: { fileSize: MAX_BACKUP_SIZE },
  fileFilter: (_req, file, callback) => callback(null, file.originalname.toLowerCase().endsWith('.tar.gz')),
});

const receiveFullBackup = (req: Request, res: Response, next: (error?: any) => void) => {
  fullBackupUpload.single('backup')(req, res, (error) => {
    if (error) return res.status(400).json({ error: 'El archivo no es válido o supera el límite de 3 GB.' });
    next();
  });
};

function pgToolEnvironment(): NodeJS.ProcessEnv {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
  const connection = new URL(process.env.DATABASE_URL);
  const sslmode = connection.searchParams.get('sslmode');
  return {
    ...process.env,
    PGHOST: decodeURIComponent(connection.hostname),
    PGPORT: connection.port || '5432',
    PGUSER: decodeURIComponent(connection.username),
    PGPASSWORD: decodeURIComponent(connection.password),
    PGDATABASE: decodeURIComponent(connection.pathname.replace(/^\//, '')),
    PGAPPNAME: 'nexusgest-manual-backup',
    ...(sslmode ? { PGSSLMODE: sslmode } : {}),
  };
}

function runPostgresTool(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => { stderr = `${stderr}${chunk}`.slice(-8000); });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} terminó con código ${code}: ${stderr.trim()}`));
    });
  });
}

function normalizedBackupEntry(entryPath: string): string | null {
  const normalizedInput = entryPath.replace(/\\/g, '/');
  if (path.posix.isAbsolute(normalizedInput) || normalizedInput.split('/').includes('..') || /^[a-zA-Z]:/.test(normalizedInput)) {
    return null;
  }
  const normalized = path.posix.normalize(normalizedInput).replace(/^(\.\/)+/, '').replace(/\/+$/, '');
  if (normalized === 'database.dump' || normalized === 'metadata.json' || normalized === 'uploads' || normalized.startsWith('uploads/')) {
    return normalized;
  }
  return null;
}

async function extractFullBackup(archivePath: string, targetDir: string): Promise<any> {
  const requiredEntries = new Set<string>();
  let expandedBytes = 0;
  await tar.t({
    file: archivePath,
    strict: true,
    onentry(entry) {
      const normalized = normalizedBackupEntry(entry.path);
      if (!normalized || !['File', 'Directory'].includes(entry.type)) {
        throw new Error('El archivo contiene rutas o tipos de archivo no permitidos.');
      }
      if (entry.size > MAX_BACKUP_SIZE * 5) throw new Error('El contenido descomprimido supera el límite permitido.');
      expandedBytes += entry.size;
      if (expandedBytes > MAX_BACKUP_SIZE * 5) throw new Error('El contenido descomprimido supera el límite permitido.');
      requiredEntries.add(normalized);
    },
  });

  if (!requiredEntries.has('database.dump') || !requiredEntries.has('metadata.json') || !requiredEntries.has('uploads')) {
    throw new Error('La copia no contiene la base de datos, los documentos y los metadatos.');
  }

  await tar.x({
    file: archivePath,
    cwd: targetDir,
    strict: true,
    filter: (entryPath) => normalizedBackupEntry(entryPath) !== null,
  });

  const metadata = JSON.parse(await readFile(path.join(targetDir, 'metadata.json'), 'utf8'));
  if (metadata?.format !== BACKUP_FORMAT || !metadata.counts) {
    throw new Error('La copia no es un respaldo completo de NexusGest.');
  }
  await runPostgresTool('pg_restore', ['--list', path.join(targetDir, 'database.dump')], pgToolEnvironment());
  return metadata;
}

const RESTORE_TABLES = {
  clients: ['id', 'full_name', 'email', 'phone', 'bsn', 'id_document_number', 'nationality', 'address', 'city', 'postal_code', 'country', 'iban', 'digid_status', 'status', 'notes', 'created_at', 'updated_at'],
  dossiers: ['id', 'code', 'client_id', 'title', 'category', 'description', 'status', 'priority', 'progress_percentage', 'fee', 'deadline', 'created_at', 'updated_at'],
  quotes: ['id', 'code', 'client_id', 'dossier_id', 'items', 'subtotal', 'tax_rate', 'tax_amount', 'total', 'status', 'valid_until', 'notes', 'created_at', 'updated_at'],
  invoices: ['id', 'code', 'quote_id', 'client_id', 'dossier_id', 'items', 'subtotal', 'tax_rate', 'tax_amount', 'total', 'status', 'payment_method', 'payment_reference', 'paid_at', 'due_date', 'notes', 'created_at', 'updated_at'],
  appointments: ['id', 'client_id', 'title', 'appointment_date', 'appointment_time', 'duration_minutes', 'modality', 'status', 'notes', 'created_at', 'updated_at'],
} as const;

/**
 * Convierte un array de objetos a formato CSV con formato estándar RFC 4180
 * e incluye el BOM UTF-8 (\uFEFF) para que Excel y otros CRM reconozcan
 * automáticamente los acentos, caracteres especiales y números.
 */
function jsonToCsv(rows: any[], columns: { key: string; header: string; format?: (v: any, row: any) => string }[]): string {
  if (!rows || rows.length === 0) {
    return '\uFEFF' + columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(';') + '\r\n';
  }

  const headerLine = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(';');

  const dataLines = rows.map((row) => {
    return columns
      .map((col) => {
        let val = row[col.key];
        if (col.format) {
          val = col.format(val, row);
        } else if (val === null || val === undefined) {
          val = '';
        } else if (typeof val === 'object') {
          val = JSON.stringify(val);
        } else {
          val = String(val);
        }
        return `"${sanitizeCsvValue(String(val)).replace(/"/g, '""')}"`;
      })
      .join(';');
  });

  return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
}

/**
 * Neutraliza CSV injection (f\u00F3rmula) y normaliza saltos de l\u00EDnea.
 *
 * Excel y Google Sheets ejecutan el contenido de una celda que empieza por
 * =, +, - o @ como f\u00F3rmula. Un campo libre de cliente (notes, address,
 * title) con ese prefijo ejecutar\u00EDa c\u00F3digo en el equipo del gestor que
 * abre el fichero. El prefijo de tabulador lo marca como texto sin alterar
 * el valor visible, y \r\n se normaliza porque algunos importadores parten
 * las direcciones multil\u00EDnea como filas nuevas.
 */
function sanitizeCsvValue(value: string): string {
  const normalized = value.replace(/\r\n|\r/g, '\n');
  return /^[=+\-@\t]/.test(normalized) ? `\t${normalized}` : normalized;
}

/**
 * Formatea un DECIMAL de Postgres para Excel en locale neerlandés.
 *
 * El driver `pg` devuelve los DECIMAL como string con punto decimal
 * ("1234.50"). Con separador de columnas ';' y punto decimal, Excel
 * neerlandés no lo reconoce como número y trata la celda como texto: la
 * columna de importes no suma. La coma decimal lo convierte en número.
 */
function formatNlAmount(value: any): string {
  if (value === null || value === undefined || value === '') return '';
  const asString = String(value);
  const normalized = asString.includes(',') ? asString.replace(',', '.') : asString;
  return normalized.replace('.', ',');
}

/**
 * GET /api/backup/stats
 * Resumen del contenido y volumen para la copia de seguridad.
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const clientsCount = await query('SELECT COUNT(*)::int AS n FROM clients');
    const dossiersCount = await query('SELECT COUNT(*)::int AS n FROM dossiers');
    const quotesCount = await query('SELECT COUNT(*)::int AS n FROM quotes');
    const invoicesCount = await query('SELECT COUNT(*)::int AS n FROM invoices');
    const appointmentsCount = await query('SELECT COUNT(*)::int AS n FROM appointments');
    const documentsCount = await query('SELECT COUNT(*)::int AS n FROM documents');

    // Estado real de la copia de seguridad.
    //
    // Antes esto devolvia `lastBackupDate: new Date()` y `databaseStatus:
    // 'healthy'` fijos, o sea que el panel anunciaba "healthy, backup ahora
    // mismo" aunque el backup llevara semanas sin correr o fallando. La red de
    // seguridad se reportaba a si misma como sana.
    //
    // Ahora se lee el directorio de backups del disco. Si esta vacio o no se
    // puede leer, se dice explicitamente que no hay backup, en vez de mentir.
    const backupDir = process.env.BACKUP_DIR || '/backups';
    const retentionDays = Number(process.env.RETENTION_DAYS || 14);
    let backup: {
      lastBackupDate: string | null;
      databaseStatus: 'healthy' | 'sin_backup' | 'degradado';
      backupFiles: number;
      uploadsBackedUp: boolean;
      retentionDays: number;
      warning: string | null;
    };

    try {
      const entries = await readdir(backupDir);
      const dbBackups = entries.filter((f) => /^nexusgest-\d{8}-\d{6}\.sql\.gz$/.test(f));
      const uploadsBackups = entries.filter((f) => /^uploads-\d{8}-\d{6}\.tar\.gz$/.test(f));

      let lastBackupDate: string | null = null;
      for (const file of dbBackups) {
        const stamp = file.match(/nexusgest-(\d{8})-(\d{6})\.sql\.gz$/);
        if (!stamp) continue;
        const iso = `${stamp[1].slice(0, 4)}-${stamp[1].slice(4, 6)}-${stamp[1].slice(6, 8)}T${stamp[2].slice(0, 2)}:${stamp[2].slice(2, 4)}:${stamp[2].slice(4, 6)}Z`;
        if (!lastBackupDate || iso > lastBackupDate) lastBackupDate = iso;
      }

      const ageHours = lastBackupDate ? (Date.now() - new Date(lastBackupDate).getTime()) / 36e5 : Infinity;
      const stale = ageHours > retentionDays * 24;

      if (dbBackups.length === 0) {
        backup = {
          lastBackupDate: null,
          databaseStatus: 'sin_backup',
          backupFiles: 0,
          uploadsBackedUp: uploadsBackups.length > 0,
          retentionDays,
          warning: 'No hay ninguna copia de la base de datos en el servidor. Configura el cron job en Coolify para ejecutar backup.sh.',
        };
      } else {
        backup = {
          lastBackupDate,
          databaseStatus: stale ? 'degradado' : 'healthy',
          backupFiles: dbBackups.length,
          uploadsBackedUp: uploadsBackups.length > 0,
          retentionDays,
          warning: stale
            ? `La ultima copia es de hace ${Math.floor(ageHours / 24)} dias, mas alla de la retencion de ${retentionDays}. Revisa el cron job.`
            : uploadsBackups.length === 0
              ? 'Hay copias de la base de datos pero ninguna de los documentos (uploads).'
              : null,
        };
      }
    } catch {
      backup = {
        lastBackupDate: null,
        databaseStatus: 'sin_backup',
        backupFiles: 0,
        uploadsBackedUp: false,
        retentionDays,
        warning: `No se pudo leer ${backupDir}. Comprueba que el volumen backups_data este montado en el backend.`,
      };
    }

    res.json({
      counts: {
        clients: clientsCount.rows[0]?.n || 0,
        dossiers: dossiersCount.rows[0]?.n || 0,
        quotes: quotesCount.rows[0]?.n || 0,
        invoices: invoicesCount.rows[0]?.n || 0,
        appointments: appointmentsCount.rows[0]?.n || 0,
        documents: documentsCount.rows[0]?.n || 0,
      },
      ...backup,
    });
  } catch (err: any) {
    console.error('Error al obtener estadísticas de backup:', err);
    res.status(500).json({ error: 'Error al consultar datos de backup' });
  }
});

router.post('/full', async (req: Request, res: Response) => {
  let workDir: string | undefined;
  let snapshotClient: PoolClient | undefined;
  let snapshotOpen = false;

  try {
    const pgEnv = pgToolEnvironment();
    workDir = await mkdtemp(path.join(os.tmpdir(), 'nexusgest-backup-'));
    const dumpPath = path.join(workDir, 'database.dump');
    const archivePath = path.join(workDir, 'nexusgest-full-backup.tar.gz');
    const uploadsPath = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const countTables = {
      clients: 'clients',
      dossiers: 'dossiers',
      quotes: 'quotes',
      invoices: 'invoices',
      appointments: 'appointments',
      documents: 'documents',
      users: 'users',
      ai_logs: 'ai_logs',
    } as const;
    const counts: Record<string, number> = {};

    const exporter = await pool.connect();
    snapshotClient = exporter;
    await exporter.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    snapshotOpen = true;
    for (const [key, table] of Object.entries(countTables)) {
      const result = await exporter.query(`SELECT COUNT(*)::bigint AS count FROM ${table}`);
      counts[key] = Number(result.rows[0].count);
    }
    const snapshotResult = await exporter.query('SELECT pg_export_snapshot() AS snapshot');
    await runPostgresTool('pg_dump', [
      '--format=custom',
      '--no-owner',
      '--no-acl',
      `--snapshot=${snapshotResult.rows[0].snapshot}`,
      '--file',
      dumpPath,
    ], pgEnv);
    await exporter.query('COMMIT');
    snapshotOpen = false;
    snapshotClient.release();
    snapshotClient = undefined;

    await runPostgresTool('pg_restore', ['--list', dumpPath], pgEnv);
    await cp(uploadsPath, path.join(workDir, 'uploads'), { recursive: true, force: true });
    const metadata = {
      format: BACKUP_FORMAT,
      createdAt: new Date().toISOString(),
      counts,
    };
    await writeFile(path.join(workDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
    await tar.c({ gzip: true, file: archivePath, cwd: workDir, portable: true }, [
      'database.dump',
      'metadata.json',
      'uploads',
    ]);

    const date = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('X-Backup-Counts', JSON.stringify(counts));
    res.setHeader('Content-Type', 'application/gzip');
    return res.download(archivePath, `nexusgest-backup-${date}.tar.gz`, (error) => {
      if (error) console.error('Error enviando copia completa:', error);
      void rm(workDir!, { recursive: true, force: true }).catch(() => undefined);
    });
  } catch (error) {
    if (snapshotClient) {
      if (snapshotOpen) await snapshotClient.query('ROLLBACK').catch(() => undefined);
      snapshotClient.release();
    }
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    console.error('Error creando copia completa:', error);
    return res.status(500).json({ error: 'No se pudo crear la copia completa de PostgreSQL y documentos.' });
  }
});

router.post('/full/inspect', receiveFullBackup, async (req: Request, res: Response) => {
  let workDir: string | undefined;
  try {
    if (!req.file) return res.status(400).json({ error: 'Selecciona un archivo .tar.gz de NexusGest.' });
    workDir = await mkdtemp(path.join(os.tmpdir(), 'nexusgest-inspect-'));
    const metadata = await extractFullBackup(req.file.path, workDir);
    return res.json({ metadata });
  } catch (error) {
    console.error('Error inspeccionando copia completa:', error);
    return res.status(400).json({ error: 'El archivo no es una copia completa válida de NexusGest.' });
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    if (req.file) await unlink(req.file.path).catch(() => undefined);
  }
});

router.post('/full/restore', receiveFullBackup, async (req: Request, res: Response) => {
  let workDir: string | undefined;
  try {
    if (!req.file) return res.status(400).json({ error: 'Selecciona un archivo .tar.gz de NexusGest.' });
    if (req.body?.confirmation !== 'RESTAURAR COPIA COMPLETA') {
      return res.status(400).json({ error: 'Confirmación incorrecta. Vuelve a revisar la copia antes de restaurar.' });
    }

    workDir = await mkdtemp(path.join(os.tmpdir(), 'nexusgest-restore-'));
    const metadata = await extractFullBackup(req.file.path, workDir);
    const restoredUploads = path.join(workDir, 'uploads');
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    await cp(restoredUploads, uploadDir, { recursive: true, force: true });
    await runPostgresTool('pg_restore', [
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-acl',
      '--single-transaction',
      '--exit-on-error',
      path.join(workDir, 'database.dump'),
    ], pgToolEnvironment());

    return res.json({ message: 'Copia completa restaurada.', restored: metadata.counts, createdAt: metadata.createdAt });
  } catch (error) {
    console.error('Error restaurando copia completa:', error);
    return res.status(500).json({ error: 'No se pudo restaurar la copia. PostgreSQL conserva sus datos si la restauración falla.' });
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    if (req.file) await unlink(req.file.path).catch(() => undefined);
  }
});

/**
 * POST /api/backup/reset
 * Vacía los datos operativos del CRM y las cuentas de portal vinculadas,
 * conservando las cuentas del equipo gestor y la configuración del sistema.
 * Requiere una frase exacta para evitar borrados accidentales.
 */
router.post('/reset', async (req: Request, res: Response) => {
  if (req.body?.confirmation !== 'RESETEAR CRM') {
    return res.status(400).json({ error: 'Confirmación incorrecta. Escribe RESETEAR CRM para continuar.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const documentFiles = await client.query<{ file_path: string }>(
      'SELECT file_path FROM documents WHERE file_path IS NOT NULL'
    );

    // Las tablas relacionadas con clientes tienen ON DELETE CASCADE.
    // El orden explícito mantiene el endpoint seguro aunque cambie el esquema.
    await client.query('DELETE FROM ai_logs');
    await client.query('DELETE FROM ai_import_history');
    await client.query('DELETE FROM contact_messages');
    await client.query('DELETE FROM service_requests');
    await client.query('DELETE FROM withdrawal_requests');
    await client.query('DELETE FROM crm_tasks');
    await client.query("DELETE FROM debts WHERE owner_type = 'client'");
    await client.query('DELETE FROM documents');
    await client.query('DELETE FROM appointments');
    await client.query('DELETE FROM invoices');
    await client.query('DELETE FROM quotes');
    await client.query('DELETE FROM dossier_steps');
    await client.query('DELETE FROM dossiers');
    await client.query('DELETE FROM clients');
    await client.query("DELETE FROM users WHERE role = 'cliente'");
    await client.query("ALTER SEQUENCE IF EXISTS withdrawal_requests_id_seq RESTART WITH 1");

    await client.query('COMMIT');

    // Borra también los binarios, pero nunca permite salir de la carpeta
    // configurada de uploads aunque la ruta almacenada estuviera manipulada.
    const uploadRoot = path.resolve(process.env.UPLOAD_DIR || './uploads');
    await Promise.all(documentFiles.rows.map(async ({ file_path }) => {
      const absoluteFile = path.resolve(file_path);
      const isInsideUploadDir = absoluteFile.startsWith(`${uploadRoot}${path.sep}`);
      if (isInsideUploadDir) {
        await unlink(absoluteFile).catch(() => undefined);
      }
    }));

    return res.json({
      message: 'CRM reseteado correctamente',
      preserved: ['admin/gestor accounts', 'service catalog', 'company settings', 'published content', 'integration settings'],
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Error al resetear CRM:', err);
    return res.status(500).json({ error: 'No se pudo resetear el CRM. No se ha borrado ningún dato.' });
  } finally {
    client.release();
  }
});

router.post('/restore', async (req: Request, res: Response) => {
  if (req.body?.confirmation !== 'RESTAURAR RESPALDO') {
    return res.status(400).json({ error: 'Confirmación incorrecta.' });
  }

  const backup = req.body?.backup;
  if (!backup || typeof backup !== 'object' || !Array.isArray(backup.clients)) {
    return res.status(400).json({ error: 'El archivo no contiene una copia válida de NexusGest.' });
  }

  for (const table of Object.keys(RESTORE_TABLES) as (keyof typeof RESTORE_TABLES)[]) {
    const rows = backup[table] ?? [];
    if (!Array.isArray(rows) || rows.some((row: any) => !row || typeof row !== 'object' || Array.isArray(row) || !row.id)) {
      return res.status(400).json({ error: `La sección ${table} no contiene registros válidos.` });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const restored: Record<string, number> = {};

    for (const table of Object.keys(RESTORE_TABLES) as (keyof typeof RESTORE_TABLES)[]) {
      const columns = RESTORE_TABLES[table];
      const rows = backup[table] ?? [];
      restored[table] = rows.length;

      for (const row of rows) {
        const rowColumns = columns.filter((column) => row[column] !== undefined);
        const values = rowColumns.map((column) => row[column]);
        const placeholders = rowColumns.map((_, index) => `$${index + 1}`);
        const updates = rowColumns.filter((column) => column !== 'id');
        const onConflict = updates.length
          ? `DO UPDATE SET ${updates.map((column) => `${column} = EXCLUDED.${column}`).join(', ')}`
          : 'DO NOTHING';

        await client.query(
          `INSERT INTO ${table} (${rowColumns.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (id) ${onConflict}`,
          values
        );
      }
    }

    await client.query('COMMIT');
    return res.json({
      message: 'Copia restaurada en PostgreSQL.',
      restored,
      skippedDocuments: Array.isArray(backup.documents) ? backup.documents.length : 0,
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Error al restaurar backup:', err);
    const status = err.code === '23505' || err.code === '23503' ? 409 : 500;
    return res.status(status).json({ error: 'No se pudo restaurar la copia. No se aplicaron cambios.' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/backup/export-full
 * Descarga una copia de seguridad COMPLETA de toda la plataforma en JSON estructurado.
 * Ideal para migración o restauración en cualquier otro CRM.
 */
router.get('/export-full', async (req: Request, res: Response) => {
  try {
    const clientsRes = await query('SELECT * FROM clients ORDER BY created_at ASC');
    const dossiersRes = await query('SELECT * FROM dossiers ORDER BY created_at ASC');
    const quotesRes = await query('SELECT * FROM quotes ORDER BY created_at ASC');
    const invoicesRes = await query('SELECT * FROM invoices ORDER BY created_at ASC');
    const appointmentsRes = await query('SELECT * FROM appointments ORDER BY appointment_date ASC');
    const documentsRes = await query('SELECT id, client_id, dossier_id, file_name, mime_type, category, created_at FROM documents ORDER BY created_at ASC');

    const backupPayload = {
      meta: {
        platform: 'NexusGest CRM',
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        total_records: {
          clients: clientsRes.rows.length,
          dossiers: dossiersRes.rows.length,
          quotes: quotesRes.rows.length,
          invoices: invoicesRes.rows.length,
          appointments: appointmentsRes.rows.length,
          documents: documentsRes.rows.length,
        },
        description: 'Copia de seguridad completa estructurada. Compatible con importadores JSON universales.',
      },
      clients: clientsRes.rows,
      dossiers: dossiersRes.rows,
      quotes: quotesRes.rows,
      invoices: invoicesRes.rows,
      appointments: appointmentsRes.rows,
      documents: documentsRes.rows,
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `nexusgest-crm-backup-${dateStr}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backupPayload, null, 2));
  } catch (err: any) {
    console.error('Error al generar backup completo JSON:', err);
    res.status(500).json({ error: 'Error al generar la copia de seguridad completa' });
  }
});

/**
 * GET /api/backup/export-csv/:type
 * Descarga individual de cada módulo en formato CSV universal.
 * type: 'clients' | 'invoices' | 'quotes' | 'appointments' | 'dossiers'
 */
router.get('/export-csv/:type', async (req: Request, res: Response) => {
  const { type } = req.params;
  const dateStr = new Date().toISOString().slice(0, 10);

  try {
    let csvData = '';
    let filename = `nexusgest-${type}-${dateStr}.csv`;

    switch (type) {
      case 'clients': {
        const result = await query('SELECT * FROM clients ORDER BY created_at DESC');
        csvData = jsonToCsv(result.rows, [
          { key: 'id', header: 'ID_Cliente' },
          { key: 'full_name', header: 'Nombre_Completo' },
          { key: 'bsn', header: 'BSN_BurgerServiceNummer' },
          { key: 'email', header: 'Correo_Electronico' },
          { key: 'phone', header: 'Telefono' },
          { key: 'id_document_number', header: 'DNI_Pasaporte' },
          { key: 'nationality', header: 'Nacionalidad' },
          { key: 'address', header: 'Direccion' },
          { key: 'city', header: 'Ciudad' },
          { key: 'postal_code', header: 'Codigo_Postal' },
          { key: 'country', header: 'Pais' },
          { key: 'iban', header: 'IBAN_Cuenta_Bancaria' },
          { key: 'digid_status', header: 'Estado_DigiD' },
          { key: 'status', header: 'Estado_Cliente' },
          { key: 'notes', header: 'Notas_Internas' },
          { key: 'created_at', header: 'Fecha_Alta' },
        ]);
        break;
      }

      case 'invoices': {
        const result = await query(`
          SELECT i.*, c.full_name as client_name, c.bsn as client_bsn
          FROM invoices i
          LEFT JOIN clients c ON i.client_id = c.id
          ORDER BY i.created_at DESC
        `);
        csvData = jsonToCsv(result.rows, [
          { key: 'code', header: 'Numero_Factura' },
          { key: 'client_name', header: 'Cliente' },
          { key: 'client_bsn', header: 'BSN' },
          { key: 'subtotal', header: 'Base_Imponible_EUR', format: formatNlAmount },
          { key: 'tax_rate', header: 'Tipo_BTW_Pct' },
          { key: 'tax_amount', header: 'Importe_BTW_EUR', format: formatNlAmount },
          { key: 'total', header: 'Total_Factura_EUR', format: formatNlAmount },
          { key: 'status', header: 'Estado_Pago' },
          { key: 'payment_method', header: 'Metodo_Pago' },
          { key: 'payment_reference', header: 'Referencia_Transaccion' },
          { key: 'due_date', header: 'Fecha_Vencimiento' },
          { key: 'paid_at', header: 'Fecha_Cobro' },
          { key: 'created_at', header: 'Fecha_Emision' },
        ]);
        break;
      }

      case 'quotes': {
        const result = await query(`
          SELECT q.*, c.full_name as client_name, c.bsn as client_bsn
          FROM quotes q
          LEFT JOIN clients c ON q.client_id = c.id
          ORDER BY q.created_at DESC
        `);
        csvData = jsonToCsv(result.rows, [
          { key: 'code', header: 'Numero_Presupuesto' },
          { key: 'client_name', header: 'Cliente' },
          { key: 'client_bsn', header: 'BSN' },
          { key: 'subtotal', header: 'Base_EUR', format: formatNlAmount },
          { key: 'tax_amount', header: 'BTW_EUR', format: formatNlAmount },
          { key: 'total', header: 'Total_EUR', format: formatNlAmount },
          { key: 'status', header: 'Estado' },
          { key: 'valid_until', header: 'Valido_Hasta' },
          { key: 'notes', header: 'Observaciones' },
          { key: 'created_at', header: 'Fecha_Emision' },
        ]);
        break;
      }

      case 'appointments': {
        const result = await query(`
          SELECT a.*, c.full_name as client_name, c.phone as client_phone
          FROM appointments a
          LEFT JOIN clients c ON a.client_id = c.id
          ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `);
        csvData = jsonToCsv(result.rows, [
          { key: 'id', header: 'ID_Cita' },
          { key: 'title', header: 'Titulo_Asunto' },
          { key: 'client_name', header: 'Cliente' },
          { key: 'client_phone', header: 'Telefono' },
          { key: 'appointment_date', header: 'Fecha' },
          { key: 'appointment_time', header: 'Hora' },
          { key: 'modality', header: 'Modalidad' },
          { key: 'status', header: 'Estado' },
          { key: 'notes', header: 'Notas' },
        ]);
        break;
      }

      case 'dossiers': {
        const result = await query(`
          SELECT d.*, c.full_name as client_name, c.bsn as client_bsn
          FROM dossiers d
          LEFT JOIN clients c ON d.client_id = c.id
          ORDER BY d.created_at DESC
        `);
        csvData = jsonToCsv(result.rows, [
          { key: 'code', header: 'Codigo_Expediente' },
          { key: 'title', header: 'Titulo_Tramite' },
          { key: 'category', header: 'Categoria' },
          { key: 'client_name', header: 'Cliente' },
          { key: 'client_bsn', header: 'BSN' },
          { key: 'status', header: 'Estado_Tramite' },
          { key: 'progress_percentage', header: 'Progreso_Pct' },
          { key: 'fee', header: 'Tarifa_Honorarios_EUR', format: formatNlAmount },
          { key: 'deadline', header: 'Fecha_Limite' },
          { key: 'description', header: 'Descripcion' },
          { key: 'created_at', header: 'Fecha_Apertura' },
        ]);
        break;
      }

      default:
        return res.status(400).json({ error: 'Tipo de exportación no soportado' });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (err: any) {
    console.error(`Error al exportar CSV (${type}):`, err);
    res.status(500).json({ error: `Error al exportar datos de ${type}` });
  }
});

export default router;
