import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import clientsRouter from './routes/clients.js';
import dossiersRouter from './routes/dossiers.js';
import invoicesRouter from './routes/invoices.js';
import appointmentsRouter from './routes/appointments.js';
import aiRouter, { localPdfRouter } from './routes/ai.js';
import documentsRouter from './routes/documents.js';
import backupRouter from './routes/backup.js';
import portalRouter from './routes/portal.js';
import servicesRouter from './routes/services.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { query } from './db/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Origenes permitidos. El frontend llama same-origin via la rewrite, asi que
// CORS normalmente no aplica; se mantiene por si el API se consume directo.
// Peticiones sin cabecera Origin (healthchecks, curl, server-to-server) pasan.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Middlewares
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check para Coolify y Docker Compose
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'nexusgest-backend',
    version: '1.0.0',
  });
});

// --- Rutas publicas ---
// Login. POST /appointments (reserva web) tambien es publico, pero el guard
// va dentro del router para no duplicar el montaje: ver routes/appointments.ts.
app.use('/api/auth', authRouter);
app.use('/api/portal', portalRouter);

// --- Rutas internas (solo gestor/admin) ---
// Todo lo demas expone datos fiscales y bancarios del cliente (BSN, IBAN).
const gestorOnly = [requireAuth, requireRole('admin', 'gestor')];
// En desarrollo se permite el lector local sin login para probar OCR. En
// produccion queda protegido igual que el resto de datos del CRM.
if (process.env.NODE_ENV === 'production') {
  app.use('/api/ai-local', gestorOnly, localPdfRouter);
} else {
  app.use('/api/ai-local', localPdfRouter);
}
app.use('/api/dashboard', gestorOnly, dashboardRouter);
app.use('/api/clients', gestorOnly, clientsRouter);
app.use('/api/dossiers', gestorOnly, dossiersRouter);
app.use('/api/ai', gestorOnly, aiRouter);
app.use('/api/documents', gestorOnly, documentsRouter);
app.use('/api/backup', gestorOnly, backupRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/services', gestorOnly, servicesRouter);
// invoicesRouter se monta al final a proposito: este montage en '/api' captura
// TODAS las subrutas de /api, asi que si fuera antes aplicaria el guard a
// /api/appointments y bloquearia la reserva publica.
app.use('/api', gestorOnly, invoicesRouter); // /api/quotes, /api/invoices

// Manejador global de errores
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno en el servidor NexusGest' });
});

async function start() {
  // Migración idempotente para instalaciones existentes que ya tenían la
  // tabla clients antes de activar el portal real.
  try {
    await query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_username VARCHAR(80)');
    await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_portal_username ON clients(portal_username) WHERE portal_username IS NOT NULL');
    await query(`CREATE TABLE IF NOT EXISTS service_prices (
      id VARCHAR(80) PRIMARY KEY,
      code VARCHAR(80) UNIQUE NOT NULL,
      icon VARCHAR(80) NOT NULL DEFAULT 'receipt_long',
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'otros',
      base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      btw_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.2100,
      badge VARCHAR(100) NOT NULL DEFAULT 'Servicio',
      duration VARCHAR(100) NOT NULL DEFAULT 'Según caso',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_service_prices_active ON service_prices(active)');
  } catch (error) {
    console.warn('No se pudo aplicar la migración opcional del portal:', error instanceof Error ? error.message : error);
  }
  app.listen(PORT, () => {
    console.log(`🚀 NexusGest API corriendo en el puerto ${PORT}`);
    console.log(`🩺 Health check disponible en http://localhost:${PORT}/health`);
  });
}

void start();
