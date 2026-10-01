import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import clientsRouter from './routes/clients.js';
import dossiersRouter from './routes/dossiers.js';
import invoicesRouter from './routes/invoices.js';
import appointmentsRouter from './routes/appointments.js';
import aiRouter from './routes/ai.js';
import documentsRouter from './routes/documents.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*', // Permitir conexión desde frontend en Coolify o local
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

// Rutas API
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/dossiers', dossiersRouter);
app.use('/api', invoicesRouter); // /api/quotes, /api/invoices
app.use('/api/appointments', appointmentsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/documents', documentsRouter);

// Manejador global de errores
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno en el servidor NexusGest' });
});

app.listen(PORT, () => {
  console.log(`🚀 NexusGest API corriendo en el puerto ${PORT}`);
  console.log(`🩺 Health check disponible en http://localhost:${PORT}/health`);
});
