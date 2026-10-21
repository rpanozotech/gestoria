import { pool } from './index.js';

const DEFAULT_SERVICES = [
  ['renta-mform','SRV-MFORM','receipt_long','Declaración de la Renta (M-Form / P-Form)','impuestos',89,'Más Solicitado','24-48 horas','Maximizamos tu devolución en tu primer año fiscal.', ['Jaaropgaaf','BSN','Fecha de empadronamiento'], 10],
  ['digid','SRV-DIGID','fingerprint','DigiD (Identidad Digital Holandesa)','llegada',29,'Esencial','3-5 días','Solicitud, activación y desbloqueo de tu clave digital.', ['BSN','Dirección registrada','Móvil'], 20],
  ['zorgtoeslag','SRV-ZORG','medical_services','Zorgtoeslag (Subsidio de Salud)','subsidios',45,'Hasta 154€/mes','2-4 semanas','Solicitud del subsidio mensual de salud.', ['Póliza activa','IBAN','Ingresos anuales'], 30],
  ['seguro-medico','SRV-SEGURO','health_and_safety','Seguro Médico Obligatorio','llegada',35,'Ahorro','Mismo día','Alta y asesoría de póliza básica holandesa.', ['BSN','Pasaporte/DNI','Contrato laboral'], 40],
  ['formulario-u1','SRV-U1','description','Formulario U1 (Exportar Paro)','otros',55,'Trámite Rápido','2-3 semanas','Certificación de periodos cotizados.', ['Nóminas','Finiquito','BSN'], 50],
  ['desempleo-ww','SRV-WW','work_outline','Prestación por Desempleo WW (UWV)','subsidios',95,'Soporte Completo','4 semanas','Solicitud y defensa ante UWV.', ['DigiD','Contrato finalizado','Cotizaciones'], 60],
  ['autonomos-zzp','SRV-ZZP','storefront','Autónomos / ZZP (KvK & BTW)','empresas',120,'Emprendedores','48 horas','Alta en KvK y configuración fiscal.', ['BSN','Nombre comercial','Pasaporte'], 70],
  ['residencia-fiscal','SRV-RESIDENCIA','verified_user','Certificado de Residencia Fiscal','impuestos',49,'Legal','1-2 semanas','Certificado oficial para evitar doble imposición.', ['BSN','País de destino'], 80],
  ['importacion-vehiculos','SRV-RDW-BPM','directions_car','Importación de Vehículos (RDW & BPM)','vehiculos',149,'Gestión Integral','10-15 días','Matriculación y gestión BPM.', ['Ficha técnica','Permiso de circulación','Empadronamiento'], 90],
  ['kinderopvangtoeslag','SRV-KINDER','child_care','Kinderopvangtoeslag & Subsidios Hijos','subsidios',65,'Familias','3-4 semanas','Gestión de ayudas familiares.', ['Contrato guardería','Horas contratadas','Ingresos'], 100],
  ['documentos-admin','SRV-ADMIN','folder_shared','Documentos Administrativos & BSN','llegada',39,'Llegada','24 horas','Citas Gemeente, BSN y traducción.', ['Contrato alquiler','Pasaporte'], 110],
  ['consulta-privada','SRV-CONSULTA','support_agent','Consulta Privada 1 a 1','otros',49,'Videollamada / Presencial','Inmediato','Sesión personalizada con asesor.', ['Preguntas preparadas'], 120],
  ['otros-tramites','SRV-OTROS','tune','Otros Trámites & Recursos Belastingdienst','otros',75,'Personalizado','Según caso','Recursos, cartas y trámites a medida.', ['Carta o notificación'], 130],
  ['pack-aterrizaje','PACK-ATERRIZAJE','flight_land','Pack “Aterrizaje en Holanda” (All-in-One)','otros',119,'Pack recomendado','Según caso','Incluye asesoría de BSN, alta en seguro médico, activación de DigiD y solicitud de Zorgtoeslag.', ['BSN','Pasaporte/DNI','Póliza o datos de seguro'], 140],
] as const;

export async function migrateDatabase() {
  await pool.query(`CREATE TABLE IF NOT EXISTS ai_import_history (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), source_text TEXT NOT NULL, result_json JSONB NOT NULL, confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL, confirmed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, client_ids JSONB NOT NULL DEFAULT '[]'::jsonb); CREATE INDEX IF NOT EXISTS idx_ai_import_history_confirmed_at ON ai_import_history(confirmed_at DESC)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS public_content (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), page_key VARCHAR(80) NOT NULL, locale VARCHAR(2) NOT NULL DEFAULT 'ES', version INTEGER NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'draft', blocks JSONB NOT NULL DEFAULT '[]'::jsonb, seo_title VARCHAR(160) NOT NULL DEFAULT '', seo_description VARCHAR(320) NOT NULL DEFAULT '', updated_by UUID REFERENCES users(id) ON DELETE SET NULL, published_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(page_key, locale, version), CHECK (locale IN ('ES','EN','NL')), CHECK (status IN ('draft','published')))`);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_public_content_lookup ON public_content(page_key, locale, status, version DESC)');
  await pool.query(`
    ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS slug VARCHAR(120);
    ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS visible_web BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id VARCHAR(80) REFERENCES service_prices(id) ON DELETE SET NULL;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source VARCHAR(40) NOT NULL DEFAULT 'crm';
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS legal_consent BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS legal_consent_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS legal_terms_version VARCHAR(40);
    CREATE TABLE IF NOT EXISTS service_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service_id VARCHAR(80) REFERENCES service_prices(id) ON DELETE SET NULL,
      source VARCHAR(40) NOT NULL DEFAULT 'web',
      status VARCHAR(40) NOT NULL DEFAULT 'pendiente',
      notes TEXT,
      legal_consent BOOLEAN NOT NULL DEFAULT FALSE,
      legal_consent_at TIMESTAMP WITH TIME ZONE,
      legal_terms_version VARCHAR(40),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_service_requests_client ON service_requests(client_id);
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, email VARCHAR(320) NOT NULL,
      service VARCHAR(200), contracted_at DATE, message TEXT NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pendiente', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS quote_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      service_id VARCHAR(80) REFERENCES service_prices(id) ON DELETE SET NULL,
      description VARCHAR(255) NOT NULL,
      quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
      unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      service_id VARCHAR(80) REFERENCES service_prices(id) ON DELETE SET NULL,
      description VARCHAR(255) NOT NULL,
      quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
      unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS client_audit_log (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      actor_role VARCHAR(50),
      action VARCHAR(80) NOT NULL,
      changes JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_client_audit_client_created ON client_audit_log(client_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS client_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      visibility VARCHAR(20) NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'client')),
      body TEXT NOT NULL CHECK (length(trim(body)) > 0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_client_messages_client_created ON client_messages(client_id, created_at ASC);
    CREATE TABLE IF NOT EXISTS appointment_reminders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      kind VARCHAR(40) NOT NULL CHECK (kind IN ('24h', '1h')),
      scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
      channel VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (channel IN ('pending', 'email', 'whatsapp')),
      sent_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (appointment_id, kind)
    );
    CREATE INDEX IF NOT EXISTS idx_appointment_reminders_due ON appointment_reminders(status, scheduled_at);
    CREATE TABLE IF NOT EXISTS integration_settings (
      channel VARCHAR(20) PRIMARY KEY CHECK (channel IN ('email', 'whatsapp')),
      provider VARCHAR(40) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      secret_ciphertext TEXT,
      secret_iv TEXT,
      secret_tag TEXT,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS debts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      owner_type VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (owner_type IN ('client','own')),
      creditor VARCHAR(180) NOT NULL, reference VARCHAR(120) NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'pending',
      original_amount NUMERIC(12,2) NOT NULL DEFAULT 0, paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      due_date DATE, plan_name VARCHAR(160), visible_to_client BOOLEAN NOT NULL DEFAULT FALSE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL, updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_debts_owner_type ON debts(owner_type, status);
    CREATE TABLE IF NOT EXISTS debt_payments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'paid', receipt_url TEXT, created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS debt_installments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
      installment_number INTEGER NOT NULL, due_date DATE NOT NULL, amount NUMERIC(12,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending', receipt_url TEXT, UNIQUE(debt_id, installment_number)
    );
    CREATE TABLE IF NOT EXISTS debt_documents (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE, file_name VARCHAR(255) NOT NULL, file_url TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS debt_notes (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE, body TEXT NOT NULL, private BOOLEAN NOT NULL DEFAULT TRUE, created_by UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS debt_audit_log (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE, actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL, actor_role VARCHAR(50), action VARCHAR(80) NOT NULL, changes JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS crm_tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      dossier_id UUID REFERENCES dossiers(id) ON DELETE SET NULL,
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL, description TEXT,
      status VARCHAR(40) NOT NULL DEFAULT 'pendiente', priority VARCHAR(20) NOT NULL DEFAULT 'normal',
      category VARCHAR(50) NOT NULL DEFAULT 'seguimiento', due_date DATE,
      completed_at TIMESTAMPTZ, created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_crm_tasks_work_queue ON crm_tasks(status, due_date);
    CREATE INDEX IF NOT EXISTS idx_crm_tasks_client ON crm_tasks(client_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS dossier_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL, due_date DATE, required BOOLEAN NOT NULL DEFAULT TRUE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending', position INTEGER NOT NULL DEFAULT 0, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE dossier_steps ADD COLUMN IF NOT EXISTS required BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE dossier_steps ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
    ALTER TABLE dossier_steps ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_dossier_steps_dossier ON dossier_steps(dossier_id, position);
    CREATE TABLE IF NOT EXISTS dossier_activity (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
      actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL, action VARCHAR(80) NOT NULL, detail TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_dossier_activity_dossier ON dossier_activity(dossier_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS dossier_notes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
      author_user_id UUID REFERENCES users(id) ON DELETE SET NULL, body TEXT NOT NULL, private BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_dossier_notes_dossier ON dossier_notes(dossier_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      subscription JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
    CREATE TABLE IF NOT EXISTS push_preferences (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS portal_advisor_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      full_name VARCHAR(120) NOT NULL DEFAULT 'Tu gestor',
      title VARCHAR(120) NOT NULL DEFAULT 'Asesoría RP Gestoría',
      organization VARCHAR(160) NOT NULL DEFAULT 'RP Gestoría & Asesoría',
      phone VARCHAR(50) NOT NULL DEFAULT '',
      email VARCHAR(255) NOT NULL DEFAULT '',
      hours VARCHAR(160) NOT NULL DEFAULT 'Lunes a viernes, 09:00–17:00',
      online BOOLEAN NOT NULL DEFAULT TRUE,
      avatar_url VARCHAR(500) NOT NULL DEFAULT '',
      bio VARCHAR(600) NOT NULL DEFAULT 'Estoy aquí para ayudarte con tus trámites en Holanda.',
      booking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      chat_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO portal_advisor_profile (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    CREATE TABLE IF NOT EXISTS company_document_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      logo_url TEXT NOT NULL DEFAULT '', commercial_name VARCHAR(180) NOT NULL DEFAULT 'RP Asesoría',
      legal_name VARCHAR(180) NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
      address VARCHAR(255) NOT NULL DEFAULT '', city VARCHAR(120) NOT NULL DEFAULT '', country VARCHAR(120) NOT NULL DEFAULT 'Países Bajos',
      kvk VARCHAR(40) NOT NULL DEFAULT '', vat_id VARCHAR(60) NOT NULL DEFAULT '', iban VARCHAR(60) NOT NULL DEFAULT '',
      email VARCHAR(255) NOT NULL DEFAULT '', phone VARCHAR(50) NOT NULL DEFAULT '', footer_text TEXT NOT NULL DEFAULT '',
      default_language VARCHAR(5) NOT NULL DEFAULT 'es', quote_prefix VARCHAR(20) NOT NULL DEFAULT 'PRE', invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'FAC',
      number_format VARCHAR(40) NOT NULL DEFAULT '{prefix}-{year}-{number}', updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO company_document_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    CREATE TABLE IF NOT EXISTS quote_versions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      version INTEGER NOT NULL, snapshot JSONB NOT NULL, changes JSONB NOT NULL DEFAULT '{}'::jsonb,
      reason TEXT, edited_by UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (quote_id, version)
    );
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS internal_notes TEXT;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS manual_price BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) NOT NULL DEFAULT 0;
    ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) NOT NULL DEFAULT 21;
    ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
    ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) NOT NULL DEFAULT 0;
    ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS manual_price BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) NOT NULL DEFAULT 21;
    ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
    ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS manual_price BOOLEAN NOT NULL DEFAULT FALSE;

  `);
  for (const s of DEFAULT_SERVICES) {
    await pool.query(`
      INSERT INTO service_prices (id, code, icon, title, slug, category, base_price, btw_rate, badge, duration, active, visible_web, sort_order, description, requirements)
      VALUES ($1,$2,$3,$4,$5,$6,$7,0.21,$8,$9,true,true,$10,$11,$12)
      ON CONFLICT (id) DO NOTHING
    `, [s[0],s[1],s[2],s[3],s[0],s[4],s[5],s[6],s[7],s[10],s[8],JSON.stringify(s[9])]);
  }
}
