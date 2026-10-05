-- =====================================================================
-- NEXUSGEST - Esquema de Base de Datos PostgreSQL
-- Especializado en Gestoría, Asesoría Fiscal, Trámites y Clientes
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Usuarios (Administradores, Gestores, Clientes)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'gestor', -- 'admin', 'gestor', 'cliente'
    phone VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Clientes (Ficha 360)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(180) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    bsn VARCHAR(20) UNIQUE, -- Burger Service Nummer (NL)
    id_document_number VARCHAR(50), -- Pasaporte o DNI
    nationality VARCHAR(80) DEFAULT 'España',
    address VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Países Bajos',
    iban VARCHAR(40),
    digid_status VARCHAR(50) DEFAULT 'sin_digid', -- 'activo', 'pendiente_activar', 'sin_digid'
    status VARCHAR(50) DEFAULT 'activo', -- 'activo', 'inactivo', 'prospecto'
    notes TEXT,
    portal_username VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compatibilidad con instalaciones ya inicializadas antes del portal real.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_username VARCHAR(80);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_portal_username ON clients(portal_username) WHERE portal_username IS NOT NULL;

-- 3. Tabla de Expedientes / Trámites
CREATE TABLE IF NOT EXISTS dossiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Ej: EXP-2026-0042
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'M-Form / Renta', 'Zorgtoeslag', 'Huurtoeslag', 'DigiD', 'HollandZorg', 'KVK / Empresa', 'General'
    description TEXT,
    status VARCHAR(50) DEFAULT 'en_proceso', -- 'en_proceso', 'pendiente_documentos', 'en_belastingdienst', 'completado', 'cancelado'
    priority VARCHAR(20) DEFAULT 'media', -- 'alta', 'media', 'baja'
    progress_percentage INTEGER DEFAULT 10,
    fee DECIMAL(10, 2) DEFAULT 0.00,
    deadline DATE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Pasos y Checklist de Expedientes
CREATE TABLE IF NOT EXISTS dossier_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Presupuestos (Quotes) con numeración correlativa PRE-2026-XXXX
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Ej: PRE-2026-0001
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    dossier_id UUID REFERENCES dossiers(id) ON DELETE SET NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{description, quantity, unit_price, total}]
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 21.00, -- 21% BTW en Países Bajos
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'borrador', -- 'borrador', 'enviado', 'aceptado', 'rechazado', 'convertido'
    valid_until DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Facturas con numeración correlativa FAC-2026-XXXX
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Ej: FAC-2026-0001
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    dossier_id UUID REFERENCES dossiers(id) ON DELETE SET NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 21.00,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'emitida', -- 'borrador', 'emitida', 'pagada', 'vencida', 'cancelada'
    payment_method VARCHAR(50) DEFAULT 'ideal', -- 'ideal', 'transferencia', 'tarjeta', 'efectivo'
    payment_reference VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Citas y Agenda
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    gestor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    modality VARCHAR(50) DEFAULT 'online_meet', -- 'presencial', 'online_meet', 'telefonica'
    status VARCHAR(50) DEFAULT 'confirmada', -- 'pendiente', 'confirmada', 'completada', 'cancelada'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Documentos y Archivos Seguros (OCR, Cartas oficiales, Contratos)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    dossier_id UUID REFERENCES dossiers(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    category VARCHAR(100) DEFAULT 'otro', -- 'identidad', 'carta_belastingdienst', 'nomina', 'contrato', 'toeslagen'
    ocr_status VARCHAR(50) DEFAULT 'no_requerido', -- 'no_requerido', 'procesando', 'completado', 'fallido'
    ocr_extracted_data JSONB DEFAULT '{}'::jsonb,
    is_verified BOOLEAN DEFAULT FALSE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Registro de Actividad IA (Auditoría y Transparencia)
CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL, -- 'alta_cliente_nlp', 'ocr_extraccion', 'generador_cartas'
    input_text TEXT,
    output_data JSONB,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Catálogo de tarifas y servicios del CRM
CREATE TABLE IF NOT EXISTS service_prices (
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
);

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_clients_bsn ON clients(bsn);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_dossiers_client ON dossiers(client_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_status ON dossiers(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_code ON invoices(code);
CREATE INDEX IF NOT EXISTS idx_quotes_code ON quotes(code);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_service_prices_active ON service_prices(active);


-- Integración unificada CRM/web (idempotente para instalaciones nuevas y existentes)
ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS slug VARCHAR(120);
ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS visible_web BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id VARCHAR(80) REFERENCES service_prices(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source VARCHAR(40) NOT NULL DEFAULT 'crm';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_id VARCHAR(80) REFERENCES service_prices(id) ON DELETE SET NULL, source VARCHAR(40) NOT NULL DEFAULT 'web',
    status VARCHAR(40) NOT NULL DEFAULT 'pendiente', notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_service_requests_client ON service_requests(client_id);
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    service_id VARCHAR(80) REFERENCES service_prices(id) ON DELETE SET NULL, description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1, unit_price DECIMAL(10,2) NOT NULL DEFAULT 0, total DECIMAL(10,2) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_id VARCHAR(80) REFERENCES service_prices(id) ON DELETE SET NULL, description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1, unit_price DECIMAL(10,2) NOT NULL DEFAULT 0, total DECIMAL(10,2) NOT NULL DEFAULT 0
);
