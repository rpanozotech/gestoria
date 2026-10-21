import bcrypt from 'bcryptjs';
import { pool } from './index.js';
import { initializeDatabase } from './init.js';

// Credenciales del admin que crea el seed.
//
// La contrasena NO tiene valor por defecto a proposito: si estuviera fija en
// el codigo seria una credencial publicada en el repositorio. Definir
// SEED_ADMIN_PASSWORD para habilitarla; sin ella el seed sigue sembrando los
// datos de demo pero omite el usuario.
//
// Para produccion, preferible usar `npm run db:create-user` (genera una
// contrasena aleatoria) en lugar de este seed.
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const SEED_ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@nexusgest.nl').trim().toLowerCase();
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Rony P. (Gestor Principal)';
const ALLOW_DEMO_SEED = process.env.ALLOW_DEMO_SEED === 'true';

export async function seedDatabase() {
  console.log('🌱 Sembrando datos iniciales en NexusGest...');
  await initializeDatabase();
  if (!ALLOW_DEMO_SEED) {
    console.log('🛑 Seed demo bloqueado. Define ALLOW_DEMO_SEED=true solo en un entorno controlado.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Usuario Gestor / Admin
    // Sin SEED_ADMIN_PASSWORD no se crea el usuario. Los expedientes de demo
    // llevan assigned_to al gestor, asi que sin gestor tampoco se siembran.
    let gestorId: string | null = null;
    if (SEED_ADMIN_PASSWORD) {
      if (SEED_ADMIN_PASSWORD.length < 12) {
        throw new Error('SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres.');
      }
      const hash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);

      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, phone)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               is_active = true
         RETURNING id;`,
        [SEED_ADMIN_EMAIL, hash, SEED_ADMIN_NAME, 'admin', '+31 6 12345678']
      );
      gestorId = userRes.rows[0].id;
      console.log(`✅ Usuario admin creado: ${SEED_ADMIN_EMAIL}`);
    } else {
      console.log('⚠️  SEED_ADMIN_PASSWORD no definida: se omiten el usuario y los expedientes.');
      console.log('   Para crear el gestor usa: npm run db:create-user -- --email ... --name ...');
    }

    // 2. Clientes de demostración
    const clientsData = [
      {
        full_name: 'Maria Popescu',
        email: 'maria.popescu@gmail.com',
        phone: '+31 6 81239845',
        bsn: '982145672',
        id_document: 'RO9284102',
        nationality: 'Rumanía',
        address: 'Strijpsestraat 142',
        city: 'Eindhoven',
        postal_code: '5616 GP',
        iban: 'NL91INGB0001234567',
        digid_status: 'pendiente_activar',
        status: 'activo',
        notes: 'Requiere activación de DigiD y solicitud retroactiva de Zorgtoeslag.'
      },
      {
        full_name: 'Carlos Mendoza Ruiz',
        email: 'carlos.mendoza@outlook.com',
        phone: '+34 654 321 987',
        bsn: '817293845',
        id_document: '48920184K',
        nationality: 'España',
        address: 'Keizersgracht 321',
        city: 'Amsterdam',
        postal_code: '1016 EE',
        iban: 'NL44ABNA0412345678',
        digid_status: 'activo',
        status: 'activo',
        notes: 'Llegada en 2025. Presentación de declaración de la renta holandesa Modelo M (M-Form).'
      },
      {
        full_name: 'Lars Van Dijk',
        email: 'lars.vandijk@techconsulting.nl',
        phone: '+31 6 49201948',
        bsn: '728194028',
        id_document: 'NL8273619',
        nationality: 'Países Bajos',
        address: 'Coolsingel 88',
        city: 'Rotterdam',
        postal_code: '3011 AE',
        iban: 'NL02RABO0319284756',
        digid_status: 'activo',
        status: 'activo',
        notes: 'Alta como ZZP (autónomo) en KVK y gestión de BTW trimestral.'
      },
      {
        full_name: 'Elena Morales Castillo',
        email: 'elena.morales@hotmail.com',
        phone: '+34 611 223 344',
        bsn: '639102847',
        id_document: '51928374P',
        nationality: 'España',
        address: 'Oudegracht 120',
        city: 'Utrecht',
        postal_code: '3511 AP',
        iban: 'NL88BUNQ2019283746',
        digid_status: 'activo',
        status: 'activo',
        notes: 'Subsidio de alquiler (Huurtoeslag) y seguro médico holandés.'
      }
    ];

    const insertedClients = [];
    for (const c of clientsData) {
      const res = await client.query(
        `INSERT INTO clients (full_name, email, phone, bsn, id_document_number, nationality, address, city, postal_code, iban, digid_status, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (bsn) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id, full_name, bsn;`,
        [c.full_name, c.email, c.phone, c.bsn, c.id_document, c.nationality, c.address, c.city, c.postal_code, c.iban, c.digid_status, c.status, c.notes]
      );
      insertedClients.push(res.rows[0]);
    }

    // 3. Expedientes / Trámites
    const maria = insertedClients[0];
    const carlos = insertedClients[1];
    const lars = insertedClients[2];
    const elena = insertedClients[3];

    // Trámite Maria: DigiD y Zorgtoeslag
    const d1 = await client.query(
      `INSERT INTO dossiers (code, client_id, title, category, description, status, priority, progress_percentage, fee, deadline, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (code) DO NOTHING RETURNING id;`,
      ['EXP-2026-0041', maria.id, 'Activación DigiD + Solicitud Zorgtoeslag 2026', 'Zorgtoeslag', 'Trámite de solicitud de ayuda médica y código de activación DigiD.', 'en_belastingdienst', 'alta', 65, 85.00, '2026-10-15', gestorId]
    );

    // Trámite Carlos: M-Form
    const d2 = await client.query(
      `INSERT INTO dossiers (code, client_id, title, category, description, status, priority, progress_percentage, fee, deadline, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (code) DO NOTHING RETURNING id;`,
      ['EXP-2026-0042', carlos.id, 'Declaración Fiscal M-Form (Año migración 2025)', 'M-Form / Renta', 'Cálculo de deducción por traslado internacional y declaración ante Belastingdienst.', 'en_proceso', 'alta', 40, 180.00, '2026-11-01', gestorId]
    );

    // Trámite Lars: KVK
    await client.query(
      `INSERT INTO dossiers (code, client_id, title, category, description, status, priority, progress_percentage, fee, deadline, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (code) DO NOTHING;`,
      ['EXP-2026-0043', lars.id, 'Alta Empresa Unipersonal (Eenmanszaak KVK)', 'KVK / Empresa', 'Registro mercantil neerlandés y obtención de BTW-nummer.', 'completado', 'media', 100, 250.00, '2026-09-28', gestorId]
    );

    // 4. Presupuestos y Facturación Correlativa
    // Presupuesto PRE-2026-0001 para Carlos
    const quote1 = await client.query(
      `INSERT INTO quotes (code, client_id, items, subtotal, tax_rate, tax_amount, total, status, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (code) DO NOTHING RETURNING id;`,
      [
        'PRE-2026-0001',
        carlos.id,
        JSON.stringify([
          { description: 'Elaboración y Presentación Fiscal M-Form Belastingdienst', quantity: 1, unit_price: 180.00, total: 180.00 },
          { description: 'Revisión documentación de ingresos en origen', quantity: 1, unit_price: 40.00, total: 40.00 }
        ]),
        220.00,
        21.00,
        46.20,
        266.20,
        'aceptado',
        '2026-10-30'
      ]
    );

    // Factura correlativa FAC-2026-0001 para Carlos
    await client.query(
      `INSERT INTO invoices (code, client_id, items, subtotal, tax_rate, tax_amount, total, status, payment_method, payment_reference, paid_at, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (code) DO NOTHING;`,
      [
        'FAC-2026-0001',
        carlos.id,
        JSON.stringify([
          { description: 'Elaboración y Presentación Fiscal M-Form Belastingdienst', quantity: 1, unit_price: 180.00, total: 180.00 },
          { description: 'Revisión documentación de ingresos en origen', quantity: 1, unit_price: 40.00, total: 40.00 }
        ]),
        220.00,
        21.00,
        46.20,
        266.20,
        'pagada',
        'ideal',
        'IDL-TRX-2026-89472',
        new Date(),
        '2026-10-15'
      ]
    );

    // Factura correlativa FAC-2026-0002 para Maria (Pendiente)
    await client.query(
      `INSERT INTO invoices (code, client_id, items, subtotal, tax_rate, tax_amount, total, status, payment_method, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (code) DO NOTHING;`,
      [
        'FAC-2026-0002',
        maria.id,
        JSON.stringify([
          { description: 'Gestión Solicitud Zorgtoeslag y Registro Belastingdienst', quantity: 1, unit_price: 85.00, total: 85.00 }
        ]),
        85.00,
        21.00,
        17.85,
        102.85,
        'emitida',
        'ideal',
        '2026-10-12'
      ]
    );

    // 5. Citas de Agenda
    const today = new Date().toISOString().split('T')[0];
    await client.query(
      `INSERT INTO appointments (client_id, gestor_id, title, appointment_date, appointment_time, duration_minutes, modality, status, notes)
       VALUES 
       ($1, $2, 'Revisión M-Form Carlos Mendoza', $3, '10:00:00', 45, 'online_meet', 'confirmada', 'Revisar certificado de retenciones de España.'),
       ($4, $2, 'Verificación carta Belastingdienst Maria', $3, '11:30:00', 30, 'presencial', 'Traer carta física recibida con código DigiD.'),
       ($5, $2, 'Consulta Huurtoeslag Elena Morales', $3, '16:00:00', 30, 'online_meet', 'pendiente', 'Consultar contrato de arrendamiento en Utrecht.');`,
      [carlos.id, gestorId, today, maria.id, elena.id]
    );

    await client.query('COMMIT');
    console.log('✅ Base de datos sembrada con éxito con datos realistas de NexusGest.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error sembrando base de datos:', error);
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => pool.end())
    .catch(() => process.exit(1));
}
