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
] as const;

export async function migrateDatabase() {
  await pool.query(`
    ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS slug VARCHAR(120);
    ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS visible_web BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id VARCHAR(80) REFERENCES service_prices(id) ON DELETE SET NULL;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source VARCHAR(40) NOT NULL DEFAULT 'crm';
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    CREATE TABLE IF NOT EXISTS service_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service_id VARCHAR(80) REFERENCES service_prices(id) ON DELETE SET NULL,
      source VARCHAR(40) NOT NULL DEFAULT 'web',
      status VARCHAR(40) NOT NULL DEFAULT 'pendiente',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_service_requests_client ON service_requests(client_id);
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
  `);
  for (const s of DEFAULT_SERVICES) {
    await pool.query(`
      INSERT INTO service_prices (id, code, icon, title, slug, category, base_price, btw_rate, badge, duration, active, visible_web, sort_order, description, requirements)
      VALUES ($1,$2,$3,$4,$5,$6,$7,0.21,$8,$9,true,true,$10,$11,$12)
      ON CONFLICT (id) DO NOTHING
    `, [s[0],s[1],s[2],s[3],s[0],s[4],s[5],s[6],s[7],s[10],s[8],JSON.stringify(s[9])]);
  }
}
