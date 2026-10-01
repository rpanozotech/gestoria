import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

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

    res.json({
      counts: {
        clients: clientsCount.rows[0]?.n || 0,
        dossiers: dossiersCount.rows[0]?.n || 0,
        quotes: quotesCount.rows[0]?.n || 0,
        invoices: invoicesCount.rows[0]?.n || 0,
        appointments: appointmentsCount.rows[0]?.n || 0,
        documents: documentsCount.rows[0]?.n || 0,
      },
      lastBackupDate: new Date().toISOString(),
      databaseStatus: 'healthy',
      retentionDays: 14,
    });
  } catch (err: any) {
    console.error('Error al obtener estadísticas de backup:', err);
    res.status(500).json({ error: 'Error al consultar datos de backup' });
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
