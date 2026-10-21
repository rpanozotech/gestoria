# Independencia de web, CRM y Portal con contenido editable — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separar físicamente web pública, CRM y Portal en frontends independientes, manteniendo un backend y una fuente de datos común para que todo el contenido autorizado editado desde el CRM se refleje en la web pública sin exponer datos privados.

**Architecture:** Tres imágenes Next.js independientes (`public-web`, `crm`, `portal`) con routers Traefik y cookies host-only por superficie. Un backend compartido seguirá siendo la única API de datos: endpoints públicos devolverán solo contenido publicado; endpoints de CRM exigirán `admin/gestor`; endpoints de Portal exigirán `cliente` y `client_id`. PostgreSQL seguirá privado y será la fuente de verdad.

**Tech Stack:** Next.js standalone, React/TypeScript, Express/TypeScript, PostgreSQL, Docker, Traefik, tests Node/backend existentes.

**Spec:** Requisito del usuario: web, CRM y Portal independientes; todo el contenido público editable desde CRM y reflejado en la web; no cambiar el catálogo ni datos privados salvo mediante acciones autorizadas.

## Global Constraints

- Mantener los dominios actuales: `rp-gestoria.tech`, `app.rp-gestoria.tech`, `portal.rp-gestoria.tech`.
- No exponer PostgreSQL ni el backend directamente a Internet.
- No permitir que la web pública reciba BSN, IBAN, documentos, facturas, clientes, citas privadas o mensajes.
- Mantener CRM exclusivamente en español.
- Los servicios, precios y lógica existentes deben conservarse; el CMS añade edición y publicación, no elimina servicios.
- Todo cambio de contenido público debe tener estado `draft/published`, autor, versión y fecha.
- No desplegar una migración irreversible sin backup y rollback verificado.
- No publicar contenido nuevo automáticamente: guardar borrador y exigir una acción explícita de publicación.
- No incluir secretos, credenciales ni tokens en código, plan o commits.

## Review Focus

- Separación real: un fallo en el frontend público no debe servir rutas CRM/Portal ni assets privados.
- Autorización: solo `admin/gestor` puede editar/publicar; la API pública solo devuelve contenido publicado.
- Consistencia: publicar un cambio debe reflejarse tras purgar/revalidar caché y sobrevivir a un reinicio.
- Privacidad: ningún endpoint público debe devolver clientes, BSN, IBAN, documentos, facturas, citas privadas o mensajes.
- Rollback: una versión anterior debe poder restaurarse sin tocar PostgreSQL operativo ni uploads.

## Mapa de unidades

- `frontend/src/app/page.tsx` y páginas públicas: consumidores de contenido público.
- Nuevos componentes `frontend/src/components/public-content/*`: renderizado seguro de bloques publicados.
- Nuevas páginas CRM `frontend/src/app/crm/contenido/*`: editor, previsualización, publicación y versiones.
- `backend/src/routes/public-content.ts`: lectura pública de contenido publicado.
- `backend/src/routes/content-admin.ts`: CRUD de borradores, publicación, despublicación y rollback protegido.
- `backend/src/db/migrate.ts`/schema: tablas de páginas, bloques, versiones y auditoría.
- `docker-compose.yml` y Dockerfiles: tres imágenes y reglas Traefik separadas.
- Tests backend/frontend: autorización, publicación, aislamiento y persistencia.

## Plan de tareas

### Task 1: Inventario y contrato de contenido

**Files:**
- Create: `docs/content-model.md`
- Test: `backend/test/content-contract.test.ts`

- [ ] Registrar las rutas públicas actuales, textos editables, servicios dinámicos y campos que deben permanecer en código.
- [ ] Definir bloques permitidos: `hero`, `rich_text`, `faq`, `cta`, `notice`, `image`, `seo`.
- [ ] Definir esquema `page_key`, `locale`, `status`, `version`, `blocks`, `seo_title`, `seo_description`, `updated_by`, `published_at`.
- [ ] Probar que el contrato rechaza HTML/script no permitido, URLs externas no aprobadas y bloques desconocidos.

### Task 2: Persistencia, versiones y auditoría

**Files:**
- Modify: `backend/src/db/migrate.ts`
- Create: `backend/src/utils/content-sanitize.ts`
- Test: `backend/test/content-storage.test.ts`

- [ ] Crear tablas de contenido, versiones y auditoría con claves únicas por página/idioma/versión.
- [ ] Implementar transacciones para publicar, despublicar y restaurar.
- [ ] No borrar versiones publicadas; marcar la versión activa.
- [ ] Registrar actor, acción, timestamp y diferencias sin guardar secretos.

### Task 3: API pública y API protegida de CRM

**Files:**
- Create: `backend/src/routes/public-content.ts`
- Create: `backend/src/routes/content-admin.ts`
- Modify: `backend/src/index.ts`
- Test: `backend/test/content-authorization.test.ts`

- [ ] `GET /api/public-content/:page?locale=ES` devuelve únicamente la versión publicada y campos sanitizados.
- [ ] `GET/POST/PATCH /api/content-admin/*` exige `requireAuth` y rol `admin/gestor`.
- [ ] El cliente no puede leer borradores de otro cliente ni acceder a datos privados.
- [ ] Publicar devuelve la versión nueva y un identificador de caché/revalidación.

### Task 4: Editor de contenido dentro del CRM

**Files:**
- Create: `frontend/src/app/crm/contenido/page.tsx`
- Create: `frontend/src/components/crm-content/*`
- Test: `frontend/test/content-editor.test.mjs`

- [ ] Crear lista de páginas y estados: borrador, publicado, última modificación y autor.
- [ ] Añadir editor de bloques con campos validados, vista previa y comparación con la versión publicada.
- [ ] Añadir botones separados `Guardar borrador`, `Publicar`, `Despublicar` y `Restaurar versión`.
- [ ] Mantener el CRM en español.
- [ ] No permitir editar desde este módulo datos de clientes, documentos, facturas o mensajes.

### Task 5: Consumo dinámico de la web pública

**Files:**
- Modify: `frontend/src/app/page.tsx` y páginas públicas
- Create: `frontend/src/lib/public-content.ts`
- Test: `frontend/test/public-content.test.mjs`

- [ ] Sustituir solo textos aprobados por lectura del endpoint público.
- [ ] Mantener fallback estático seguro si el API no está disponible, sin datos ficticios.
- [ ] Añadir `locale` ES/EN/NL solo donde exista contenido traducido; no anunciar traducciones inexistentes.
- [ ] Revalidar/purgar caché después de publicar.
- [ ] Mantener servicios y precios provenientes del endpoint de catálogo existente.

### Task 6: Tres imágenes y routers independientes

**Files:**
- Create: `frontend/Dockerfile.public`
- Create: `frontend/Dockerfile.crm`
- Create: `frontend/Dockerfile.portal`
- Modify: `docker-compose.yml`
- Test: smoke tests de rutas y assets

- [ ] Construir tres artefactos independientes sin rutas ajenas.
- [ ] Web pública: solo páginas públicas y assets públicos.
- [ ] CRM: solo login/CRM/API proxy necesario.
- [ ] Portal: solo login/Portal/API proxy necesario.
- [ ] Configurar routers host-specific, TLS y assets `_next` por superficie.
- [ ] Verificar que `app/.../portal` y `portal/.../crm` devuelvan `404`.

### Task 7: Caché, seguridad y aislamiento

**Files:**
- Modify: `backend/src/middleware/rate-limit.ts`
- Modify: `frontend/next.config.mjs`
- Test: pruebas de cabeceras, CSP, CORS, rate limit y host isolation

- [ ] Mantener cookies `HttpOnly`, `Secure`, `SameSite=Strict`, host-only.
- [ ] Añadir CSP compatible con cada frontend tras probar recursos.
- [ ] Restringir CORS a los tres orígenes exactos.
- [ ] Asegurar que contenido público no contiene identificadores privados ni HTML ejecutable.
- [ ] Verificar límites de login, publicación y lectura pública.

### Task 8: Backup, despliegue y verificación

**Files:**
- Create: `docs/deploy-content-separation.md`
- Test: matriz E2E no destructiva

- [ ] Crear backup de PostgreSQL, uploads y configuración antes de migrar.
- [ ] Construir y validar las tres imágenes.
- [ ] Desplegar primero en una ruta/host de staging si está disponible.
- [ ] Verificar publicación de un contenido de prueba autorizado, lectura pública, rollback y persistencia tras reinicio.
- [ ] Comparar el catálogo antes/después por cantidad e IDs estables.
- [ ] Confirmar que no se crean clientes, citas o documentos durante QA.
- [ ] Desplegar producción solo con healthchecks, rutas HTTPS, assets y autorización verificados.

## Criterios de aceptación

- [ ] Un cambio publicado en CRM aparece en la web pública sin editar código.
- [ ] Un borrador no aparece en la web.
- [ ] Un gestor no puede leer ni modificar contenido privado de otro ámbito.
- [ ] La web pública no puede abrir rutas CRM/Portal.
- [ ] CRM y Portal tienen imágenes/contenedores independientes.
- [ ] Los tres dominios cargan CSS, JavaScript, imágenes y fuentes.
- [ ] El catálogo mantiene la misma cantidad e IDs antes y después.
- [ ] El rollback restaura la versión anterior del contenido.
- [ ] No se modifican servicios, datos de clientes, documentos, facturas ni citas durante la migración.
