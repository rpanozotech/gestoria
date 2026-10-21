import fs from 'fs';
import path from 'path';
import { pool } from './index.js';

export async function initializeDatabase() {
  console.log('🔄 Inicializando base de datos PostgreSQL NexusGest...');
  try {
    const distPath = path.resolve(process.cwd(), 'dist/db/schema.sql');
    const srcPath = path.resolve(process.cwd(), 'src/db/schema.sql');
    const schemaPath = fs.existsSync(distPath) ? distPath : srcPath;

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('✅ Esquema de base de datos verificado y tablas creadas exitosamente.');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  }
}

// Ejecución directa si se invoca con npm run db:init
if (process.argv[1] && process.argv[1].endsWith('init.js')) {
  initializeDatabase()
    .then(() => pool.end())
    .catch(() => process.exit(1));
}
