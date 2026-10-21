# NexusGest - Plataforma de Negocio & CRM Gestoría Inteligente

Plataforma integral, modular y de alta precisión para gestión de asesorías y gestorías especializadas en trámites, fiscalidad neerlandesa (M-Form, DigiD, Toeslagen, Belastingdienst), clientes y automatización inteligente con IA.

Diseñado y optimizado para despliegue directo en **Coolify** mediante **Docker Compose**.

---

## 🏛️ Módulos de la Plataforma

### 1. Web Pública (`/`)
- **Página Principal**: Presentación institucional de confianza europea (Executive Precision).
- **Simulador Fiscal M-Form Interactivo**: Estimación en tiempo real del saldo a devolver por año fraccionado según meses resididos, ingresos brutos y retenciones (*Loonheffing*).
- **Reserva de Citas Online**: Formulario conectado a la agenda oficial (Google Meet o presencial).

### 2. CRM Operativo del Gestor (`/crm`)
- **Dashboard en Tiempo Real**: 6 KPIs ejecutivos (Clientes activos, citas de hoy, expedientes en curso, trámites en Belastingdienst, facturación mensual y pasarela iDEAL).
- **Alta Inteligente con IA (`/crm/alta-ia`)**:
  - Captura por Lenguaje Natural libre (texto o transcripción de audio).
  - Escáner OCR de cartas de la Belastingdienst con extracción de BSN e importes.
  - **Pantalla de revisión y confirmación obligatoria** antes de registrar en base de datos.
- **Directorio de Clientes & Ficha 360° (`/crm/clientes`)**: Resumen de cliente, datos fiscales (BSN, pasaporte, IBAN), expedientes, facturación y registro de actividad IA.
- **Presupuestos y Facturación Correlativa (`/crm/facturacion`)**:
  - Numeración legal `PRE-2026-XXXX` y `FAC-2026-XXXX`.
  - Conversión de presupuesto a factura en 1 clic.
  - Control de estados de cobro y registro de pagos iDEAL.
- **Agenda & Citas (`/crm/agenda`)**: Planificador y calendario de citas.
- **Asistente de Documentos IA (`/crm/documentos-ia`)**: Redacción legal automática en neerlandés formal (*Zakelijk Nederlands*) para la Belastingdienst, HollandZorg y autorizaciones de representación.

### 3. Portal Privado del Cliente - Mijn NexusGest (`/portal`)
- **Seguimiento de Expediente**: Línea temporal de progreso del trámite paso a paso.
- **Toeslagen Hub**: Monitor de subsidios holandeses (*Zorgtoeslag*, *Huurtoeslag*, *Kindgebonden budget*).
- **Facturas y Pasarela de Pago iDEAL**: Selector de banco holandés (ING, ABN AMRO, Rabobank, Bunq) y simulación de pago seguro.
- **Subida Segura de Cartas**: Envío de resoluciones postales escaneadas por IA directamente al gestor.

---

## 🚀 Despliegue en Servidor con Coolify

Consulta la guía completa detallada en [COOLIFY_DEPLOY.md](file:///c:/Users/Rony/Documents/Gestoria/COOLIFY_DEPLOY.md).

### Despliegue Rápido:
1. Sube este repositorio a tu cuenta de GitHub o GitLab (privado).
2. En tu servidor Coolify: **+ New Resource** ➔ **Docker Compose**.
3. Selecciona tu repositorio y rama `main`.
4. Coolify levantará automáticamente los contenedores:
   - `frontend` (Next.js Standalone en puerto 3000)
   - `backend` (API Node.js en puerto 5000)
   - `postgres` (Base de datos PostgreSQL 16 con volumen persistente)
5. Asigna tus dominios en Coolify y obtendrás **certificados SSL Let's Encrypt automáticos**.

---

## 💻 Ejecución Local

### Con Docker Compose:
```bash
docker compose up -d --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`
- Healthcheck: `http://localhost:5000/health`

### Modo Desarrollo (sin Docker):
1. **Backend**:
   ```bash
   cd backend
   npm install
   npm run build
   npm run start
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🛠️ Stack Tecnológico
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS (Executive Precision tokens), Google Material Symbols.
- **Backend**: Node.js, Express, TypeScript, Zod, JWT, bcryptjs, Multer.
- **Base de Datos**: PostgreSQL 16 con extensiones UUID y tablas relacionales completas.
- **Inteligencia Artificial**: OpenAI API (`gpt-4o-mini`) con motor semántico heurístico offline de respaldo.
- **Infraestructura**: Docker, Docker Compose, Coolify, Traefik / SSL.
