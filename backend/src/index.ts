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
import servicesRouter, { publicServicesRouter } from './routes/services.js';
import withdrawalsRouter from './routes/withdrawals.js';
import { migrateDatabase } from './db/migrate.js';
import serviceRequestsRouter from './routes/service-requests.js';
import clientMessagesRouter from './routes/client-messages.js';
import portalMessagesRouter from './routes/portal-messages.js';
import integrationsRouter from './routes/integrations.js';
import pushRouter from './routes/push.js';
import financeRouter from './routes/finance.js';
import portalFinanceRouter from './routes/portal-finance.js';
import advisorProfileRouter from './routes/advisor-profile.js';
import { publicContentRouter, contentAdminRouter } from './routes/content.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { rateLimit, cabecerasSeguridad } from './middleware/rate-limit.js';
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
// Cabeceras de seguridad primero: aplican a todas las respuestas, incluidas
// las de error. Sin esto, un documento subido que se sirviera como text/html
// podria ejecutar script en el origen del CRM.
app.use(cabecerasSeguridad);
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

// Limites sobre las rutas publicas. Estas son las que accepts peticiones sin
// token, y por tanto las que permitirian a alguien:
//   - forzar bruta el login hasta colocar un JWT de 7 dias en su poder, o
//   - rellenar clients y dossiers de produccion con miles de filas basura.
// El resto de rutas ya exige un rol gestor/admin, asi que no las limita esto.

// Login: 10 intentos fallidos por IP+email cada 15 minutos. `soloFallidos`
// evita que un gestor que se equivoca unas veces y luego acierta se bloquee a
// si mismo, y el bucket por IP+email impide que un atacante agote el limite de
// una victima concreta para dejarla sin poder entrar.
app.use('/api/auth/login', rateLimit({ nombre: 'login', max: 10, ventanaMs: 15 * 60 * 1000, soloFallidos: true }));
app.use('/api/auth/portal-login', rateLimit({ nombre: 'login', max: 10, ventanaMs: 15 * 60 * 1000, soloFallidos: true }));

// Formulario de solicitud: escribe en clients/dossiers sin autenticacion.
app.use('/api/service-requests', rateLimit({ nombre: 'solicitudes', max: 5, ventanaMs: 60 * 60 * 1000 }));

// Citas: se limita SOLO la creacion, no la lectura.
//
// `/availability` es publico y lo consulta la web para pintar los huecos; si
// se limitara junto con POST, 10 peticiones/hora por IP bloquearian la pagina
// de reservas. Y como el contador es por IP, una familia o una oficina
// compartida (mismo NAT) se quedarian sin poder agendar entre varios.
//
// Solo POST lleva el limite: es la operacion que escribe filas en `appointments`
// y, por el bypass de `requireGestorForLinkedClient`, la que puede tocar fichas
// de clientes. GET/availability recibe un limite alto y aparte (60/5min) para
// no estropear la navegacion.
const limiteCrearCita = rateLimit({ nombre: 'cita-crear', max: 8, ventanaMs: 60 * 60 * 1000 });
const limiteVerDisponibilidad = rateLimit({ nombre: 'cita-disponibilidad', max: 60, ventanaMs: 5 * 60 * 1000 });
app.use('/api/appointments', (req, res, next) =>
  req.method === 'POST' ? limiteCrearCita(req, res, next) : limiteVerDisponibilidad(req, res, next));

// Portal del cliente: ya exige token de rol `cliente` y todas sus consultas
// filtran por el client_id del token, asi que el limite aqui es solo un freno
// bruto. Es amplio a proposito: un cliente que navega expediente, descarga un
// PDF y agenda una cita encadenando peticiones no debe toparse con un 429.
app.use('/api/portal', rateLimit({ nombre: 'portal', max: 200, ventanaMs: 5 * 60 * 1000 }));

app.use('/api/auth', authRouter);
app.use('/api/withdrawals', rateLimit({ nombre: 'desistimientos', max: 5, ventanaMs: 60 * 60 * 1000 }));
app.use('/api/withdrawals', withdrawalsRouter);
app.use('/api/service-requests', serviceRequestsRouter);
app.use('/api/portal', portalRouter);
app.use('/api/portal/messages', requireAuth, requireRole('cliente'), portalMessagesRouter);
app.use('/api/portal/finance', requireAuth, requireRole('cliente'), portalFinanceRouter);
app.get('/api/portal/advisor-profile', requireAuth, requireRole('cliente'), async (_req, res) => {
  const result = await query('SELECT * FROM portal_advisor_profile WHERE id = 1');
  res.json({ profile: result.rows[0] || null });
});

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
app.use('/api/integrations', gestorOnly, integrationsRouter);
app.use('/api/push', gestorOnly, pushRouter);
app.use('/api/finance', gestorOnly, financeRouter);
app.use('/api/advisor-profile', gestorOnly, advisorProfileRouter);
app.use('/api/clients', gestorOnly, clientsRouter);
app.use('/api/client-messages', gestorOnly, clientMessagesRouter);
app.use('/api/dossiers', gestorOnly, dossiersRouter);
app.use('/api/ai', gestorOnly, aiRouter);
app.use('/api/documents', gestorOnly, documentsRouter);
app.use('/api/backup', gestorOnly, backupRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/services/public', publicServicesRouter);
app.use('/api/public-content', publicContentRouter);
app.use('/api/content-admin', contentAdminRouter);
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

// Red de seguridad a nivel de proceso.
//
// Express 4 no captura rechazos de promesas en handlers async: si un handler
// lanza, la promesa se descarta y Node la trata como unhandledRejection. Con el
// default de Node >= 15 eso es un uncaught exception y el proceso muere, tirando
// el CRM entero por un 500 en un solo endpoint.
//
// Este handler NO evita que se registre el error, solo evita que el proceso
// muera por el. Los bugs reales se corrigen en el handler que los lanza.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Promesa rechazada sin manejar:', reason);
});
process.on('uncaughtException', (error) => {
  // Aquí el estado del proceso es desconocido: lo mas seguro es morir y dejar
  // que el orquestador (Coolify) reinicie el contenedor con estado limpio.
  console.error('[uncaughtException] Error no capturado, reiniciando:', error);
  process.exit(1);
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
  await migrateDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 NexusGest API corriendo en el puerto ${PORT}`);
    console.log(`🩺 Health check disponible en http://localhost:${PORT}/health`);
  });
}

// `start()` no se descarta sin mas: si la migracion o el listen fallan, el
// fallo tiene que verse en el log del contenedor, no desaparecer como otra
// promesa rechazada sin manejar.
start().catch((error) => {
  console.error('No se pudo arrancar el servidor NexusGest:', error);
  process.exit(1);
});
