# Especificaciones y Requisitos de Plataforma de Negocio & CRM Inteligente

## 1. Visión General del Proyecto
Plataforma integral y modular para gestión de negocio y asesoría/gestoría con foco en trámites, gestiones administrativas, clientes y automatización inteligente con IA.

- **Stack**: Backend centralizado Node.js + PostgreSQL, Web pública (Next.js), CRM Web privado (Next.js), App Móvil (React Native / Expo), IA (OpenAI API).
- **Entorno de despliegue**: Cloud Linux, Docker, Nginx, SSL, S3 compatible.

## 2. CRM y Funcionalidades Clave
1. **Dashboard Principal**:
   - Métricas en tiempo real: Clientes activos, citas de hoy, servicios en curso, facturas pendientes/pagadas, facturación mensual, tareas pendientes, documentos por recibir.
2. **Alta de Clientes Inteligente**:
   - Formulario manual tradicional.
   - Captura por Lenguaje Natural con IA (ej. "Maria Popescu, Eindhoven, DigiD 60€...") con pantalla de revisión/confirmación obligatoria antes de guardar.
   - Escaneo inteligente de documentos (PDF, foto, OCR de BSN, dirección, importes, etc.).
3. **Ficha Completa 360° del Cliente**:
   - Pestañas: Resumen, Datos personales (BSN, pasaporte, etc.), Servicios, Documentos, Presupuestos, Facturas, Citas, Notas, Tareas, Historial y Actividad IA.
4. **Presupuestos y Facturación**:
   - Conversión de presupuesto a factura con numeración correlativa (`PRE-2026-0001`, `FAC-2026-0001`).
   - Gestión de estados de cobro y registro de pagos.
5. **Asistente y Generador de Documentos con IA**:
   - Plantillas oficiales automáticas (ej. Cartas a HollandZorg, Belastingdienst, autorizaciones).
