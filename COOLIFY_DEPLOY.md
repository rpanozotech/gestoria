# Guía de Despliegue en Servidor con Coolify

Esta guía explica paso a paso cómo desplegar la plataforma **NexusGest** en tu servidor propio usando **Coolify**.

---

## 1. Arquitectura en Coolify

NexusGest está preparado para ser desplegado en Coolify mediante **Docker Compose**. Contiene 3 servicios orquestados:

| Servicio | Tecnología | Puerto Interno | Función |
| :--- | :--- | :--- | :--- |
| **`frontend`** | Next.js 14 Standalone | `3000` | Web Pública, CRM Gestor y Portal Privado Mijn NexusGest |
| **`backend`** | Node.js + Express + TS | `5000` | API REST, IA OpenAI, OCR, Facturación correlativa |
| **`postgres`** | PostgreSQL 16 Alpine | `5432` | Base de datos persistente con esquema automático |

---

## 2. Pasos para Desplegar en Coolify

### Opción A: Desde tu Repositorio Git (Recomendada)

1. **Sube este proyecto a tu GitHub / GitLab** (repositorio privado).
2. Abre tu panel de control de **Coolify** en tu servidor.
3. Haz clic en **"+ New Resource"** ➔ **"Docker Compose"**.
4. Selecciona tu integración de **GitHub** y elige el repositorio de NexusGest.
5. En la rama elige `main` (o `master`).
6. Coolify leerá automáticamente el archivo `docker-compose.yml`.

### Compose Raw

No uses **Raw Compose** para este proyecto: necesita el repositorio completo
para construir las imágenes y montar `backend/src/db/schema.sql` y `backup.sh`.
Despliega desde Git para que esas rutas existan en el servidor.

---

## 3. Variables de Entorno en Coolify

En la pestaña **"Environment Variables"** de tu recurso en Coolify, añade o ajusta:

```env
# Base de Datos
POSTGRES_USER=nexusgest_user
POSTGRES_PASSWORD=tu_contraseña_segura_aqui
POSTGRES_DB=nexusgest_db

# Seguridad
JWT_SECRET=tu_clave_secreta_jwt_muy_larga_2026

# Inteligencia Artificial (Opcional - Si no se indica, usará el motor heurístico local)
OPENAI_API_KEY=sk-proj-tu-api-key-de-openai
OPENAI_MODEL=gpt-4o-mini

# Dominios (Configurados en Coolify con SSL automático)
# Ejemplo: https://gestoria.tudominio.com
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api
```

---

## 4. Asignación de Dominios y Certificado SSL Automático

En Coolify:
1. En la configuración del servicio **`frontend`**, escribe tu dominio principal:
   `https://gestoria.tudominio.com` ➔ puerto `3000`.
2. En la configuración del servicio **`backend`**, escribe tu subdominio de API:
   `https://api.tudominio.com` ➔ puerto `5000`.
3. Haz clic en **"Deploy"**.
4. ¡Listo! Coolify generará los certificados **SSL de Let's Encrypt** automáticamente y levantará los contenedores.

---

## 5. Datos Iniciales y Siembra (Seed)

El esquema de PostgreSQL se crea automáticamente al iniciar el contenedor por primera vez gracias al montaje de `schema.sql`.

Si deseas cargar los datos de demostración (clientes como Maria Popescu, Carlos Mendoza, trámites de DigiD y facturas correlativas), puedes ejecutar dentro de la pestaña **Terminal / Execute** del servicio `backend` en Coolify:

```bash
node dist/db/seed.js
```

---

## 6. Rutas de Acceso de la Plataforma

- **Web Pública**: `https://gestoria.tudominio.com/` (Landing, Simulador M-Form, Reserva Citas)
- **CRM Gestor**: `https://gestoria.tudominio.com/crm` (Dashboard, Alta IA, Ficha 360°, Facturación)
- **Portal Cliente**: `https://gestoria.tudominio.com/portal` (Mijn NexusGest, Subsidios, Pago iDEAL)
