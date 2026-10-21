/**
 * Crea (o actualiza) un usuario gestor/admin.
 *
 * Uso dentro del contenedor del backend:
 *   docker compose exec backend node dist/db/create-user.js --email gestor@rp-gestoria.tech --name "Rony P."
 *
 * El rol por defecto es 'admin': el CRM es de un unico gestor, asi que la
 * cuenta principal debe tener acceso completo. Sin --password genera una
 * contraseña aleatoria de 20 caracteres y la imprime una sola vez. No hay
 * contraseña por defecto en el codigo: un valor fijo aqui seria una
 * credencial publicada en el repositorio.
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from './index.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function generarPassword(): string {
  // Sin caracteres ambiguos (0/O, 1/l/I) para poder dictarla por teléfono.
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(20);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

async function main() {
  const email = (arg('email') || '').trim().toLowerCase();
  const fullName = (arg('name') || '').trim();
  const role = (arg('role') || 'admin').trim();
  const password = arg('password');

  if (!email || !email.includes('@')) {
    console.error('Falta --email valido. Uso: --email gestor@rp-gestoria.tech');
    process.exit(1);
  }
  if (!fullName) {
    console.error('Falta --name. Uso: --name "Rony P."');
    process.exit(1);
  }
  if (!['admin', 'gestor', 'cliente'].includes(role)) {
    console.error(`--role debe ser admin, gestor o cliente (recibido: ${role})`);
    process.exit(1);
  }

  const clave = password || generarPassword();
  if (password && password.length < 12) {
    console.error('La contraseña debe tener al menos 12 caracteres.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(clave, 10);

  const res = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           is_active = true
     RETURNING id, email, full_name, role;`,
    [email, hash, fullName, role]
  );

  const u = res.rows[0];
  console.log('\n✅ Usuario listo para el CRM');
  console.log(`   email : ${u.email}`);
  console.log(`   nombre: ${u.full_name}`);
  console.log(`   rol   : ${u.role}`);
  console.log(`\n🔑 CONTRASEÑA: ${clave}`);
  console.log('   Guárdala ahora: no se vuelve a mostrar.\n');
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('❌ Error creando el usuario:', err.message);
    process.exit(1);
  });