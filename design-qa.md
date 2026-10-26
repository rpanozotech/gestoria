# Design QA — Alta inteligente de clientes

## Fuentes y alcance

- Fuente visual: `C:\Users\Rony\Downloads\Imagen de ChatGPT 25 oct 2026, 02_25_28.png`.
- Implementación: `http://localhost:3000/crm/clientes/alta-ia`.
- Captura de implementación: `C:\Users\Rony\Documents\Servidor\gestoria-main\gestoria-main\design-qa-alta-ia.png`.
- Viewport de verificación: 1575 × 884 CSS px, navegador integrado, escala 1.
- La referencia mide 1487 × 1058 px; por eso la comparación se hizo normalizando el área de contenido y comprobando la composición, no superponiendo píxeles de dos tamaños distintos.

## Estado verificado

- Pantalla inicial de Alta con IA, sin desplazamiento exterior.
- Sidebar y barra superior conservan el tema común del CRM.
- La fecha queda en una tarjeta independiente en la cabecera.
- La primera fila contiene las tarjetas `1. Carga de documentos` y `2. Datos extraídos con IA`.
- La segunda fila contiene `3. Vista previa de la ficha de cliente` con las tres acciones principales.
- El área de carga mantiene los handlers reales de selección, arrastre, archivos demo y eliminación.
- Los campos extraídos son editables y conservan el flujo de OCR/IA existente.
- `Leer documento` ejecuta el OCR local; `Revisar datos` abre la vista de revisión; `Crear ficha` conserva el guardado real del cliente.
- La tarjeta de datos y la vista previa son dinámicas y muestran los datos actuales del CRM, en vez de valores ficticios hardcodeados del mock.

## Comparación visual

### Vista completa

- La jerarquía visual coincide: breadcrumb, título grande, subtítulo, tarjeta de fecha, dos tarjetas superiores y vista previa inferior.
- La distribución es de dos columnas arriba y una fila completa abajo, como en la referencia.
- El contenido cabe en una sola pantalla de 1575 × 884 sin scroll exterior ni recorte de la vista previa.
- El espacio inferior se mantiene equilibrado y las tres acciones de la vista previa quedan visibles.

### Regiones críticas

- Carga de documentos: tarjeta blanca, icono azul, zona dashed amplia y lista de documentos debajo.
- Datos extraídos: filas de campo con input, estado `Detectado`/`Revisar` y control de expansión.
- Vista previa: avatar, nombre, BSN, fecha, dirección, nacionalidad y botones `Leer documento`, `Revisar datos` y `Crear ficha`.
- Tipografía, bordes, radios, fondo azul claro y botones azules siguen los tokens visuales ya usados por el CRM.

## Diferencias intencionadas

- La referencia muestra a Carlos Martínez Ruiz y tres documentos de ejemplo; la implementación muestra los datos dinámicos disponibles, actualmente Ahmed Dicko Gaye, y no inventa documentos.
- La referencia tiene mayor altura física; la implementación compacta la composición para respetar el viewport real del CRM y mantener todo visible sin scroll.

## Historial de revisión

- Primera pasada: la vista previa inferior quedaba parcialmente cortada y el panel derecho podía desplazarse internamente.
- Corrección: se cambió la composición a una rejilla de altura controlada, se redujeron los espacios verticales y se eliminó el scroll interno del panel de datos.
- Captura final: la vista previa y sus CTA quedan completas dentro de la pantalla.

## Resultado

- Build: `npm run build` correcto.
- Advertencia existente: Next.js informa que la convención `middleware` está deprecada en favor de `proxy`; no bloquea la compilación.
- `final result: passed`

## Verificación adicional — Nuevo cliente manual

- Fuente visual: `C:\Users\Rony\Downloads\Imagen de ChatGPT 25 oct 2026, 02_24_55.png`.
- Implementación: `http://localhost:3000/crm/clientes/alta-ia?mode=manual`.
- Captura de implementación: `C:\Users\Rony\Documents\Servidor\gestoria-main\gestoria-main\design-qa-manual.png`.
- Se sustituyó la revisión antigua por una ficha de alta manual con las cuatro secciones de la referencia: Identidad, Contacto, Domicilio y Registro administrativo.
- El panel lateral `Revisión de datos` mantiene estados visuales y el bloque de coincidencias, sin inventar datos ni romper el flujo real de guardado.
- Los tres botones inferiores siguen conectados a las acciones reales: guardar borrador, confirmar datos y crear ficha de cliente.
- La referencia tiene 1487 × 1058 px y la captura del navegador 1575 × 884 CSS px. En ventanas de altura corta se aplica una compactación responsive para que la ficha completa, el panel lateral y las acciones sigan visibles sin scroll interno; en alturas amplias conserva la escala de la referencia.
- Resultado visual: composición, jerarquía, paneles, campos y acciones verificados; la diferencia restante es únicamente la escala responsive necesaria por la menor altura del viewport de prueba.

## Verificación adicional — Barra lateral

- Fuente visual: `C:\Users\Rony\Downloads\Imagen de ChatGPT 25 oct 2026, 02_25_28.png`.
- Captura final: `C:\Users\Rony\Documents\Servidor\gestoria-main\gestoria-main\design-qa-sidebar.png`.
- Se mantuvo la anchura de 240 px, el fondo azul oscuro, el acceso destacado `Mi trabajo de hoy`, los grupos con sus separadores y los estados activos azules.
- Finanzas ahora refleja la estructura visual de la referencia: `Facturación`, `Cobros y deudas` y `Tarifas`.
- Se eliminó la etiqueta `CRM` duplicada del encabezado lateral y se incorporó `Centro de ayuda` en Configuración.
- En ventanas bajas la navegación lateral se desplaza internamente sin mostrar una barra permanente; la opción activa se lleva automáticamente a una posición visible.

## Simplificación de navegación

- La primera vista del sidebar muestra solo las rutas principales: Mi trabajo de hoy, Dashboard, Agenda y citas, Expedientes, Tareas, Clientes, Finanzas y Alta con IA.
- Comunicación, Consultas web, Facturación, Cobros y deudas, Tarifas, Documentos IA, Chat IA y Configuración quedan dentro de grupos desplegables.
- Las rutas no se eliminaron: solo se redujo la carga visual inicial y los grupos se abren automáticamente cuando la ruta activa pertenece a ellos.

## Auditoría visual y funcional completa — 26/10/2026

### Pantallas revisadas

Se inspeccionaron visualmente en el navegador integrado: Dashboard, Agenda, Tareas, Clientes, ficha 360° del cliente, Deudas, ficha de deuda, Finanzas/Facturación, Alta con IA, Documentos IA, Comunicación web y Configuración de empresa. La composición común se mantiene: barra lateral, cabecera, fondo azul muy claro, tarjetas blancas, jerarquía tipográfica consistente y acciones primarias en azul.

### Recorridos funcionales verificados

- Dashboard → Clientes → ficha 360°.
- Ficha 360° → pestaña Deudas y pagos → ficha de deuda.
- Ficha de deuda: `Ver pagos` abre el panel de pagos y `Registrar pago` abre el formulario modal.
- Finanzas: una factura abre su detalle; el panel de cobros/deudas y sus clientes llevan a las fichas correspondientes.
- Agenda: crear, editar y reprogramar abren ventana modal; confirmar/completar actualizan el estado visual.
- Tareas: crear, cambiar estado, selección múltiple, acciones masivas y eliminar están conectados; el cliente de cada tarea abre la ficha 360°.
- Documentos IA: nueva plantilla y configuración de IA abren sus ventanas de trabajo.
- Búsqueda global: botón de cabecera y `Ctrl+K` abren la paleta de búsqueda.

### Correcciones aplicadas en esta auditoría

- Agenda: se activaron Semana anterior, Hoy y Semana siguiente.
- Agenda: Mes ahora muestra una rejilla mensual real con citas seleccionables.
- Agenda: el selector de asesor quedó conectado al estado de filtrado.
- Agenda: las flechas de Citas del día dejaron de ser texto decorativo y ahora cambian el día; al cambiar de semana el panel lateral queda coherente y no muestra citas de otra semana.
- Tareas: el nombre del cliente pasó a ser un enlace accesible a su ficha.

### Limitaciones que impiden certificar producción al 100 %

- El frontend está ejecutándose con `NEXT_PUBLIC_CRM_PREVIEW=true` y el backend no está escuchando en el puerto 5000. Por tanto, las interacciones verificadas usan la API de demostración; no se puede certificar todavía persistencia real en PostgreSQL, autenticación, OCR/IA remoto ni sincronización Web ↔ CRM ↔ Portal.
- La exportación CSV de Agenda no pudo verificarse hasta completar la descarga porque el navegador bloqueó el permiso de descarga. El handler existe y genera el CSV, pero queda pendiente una prueba manual con permiso del navegador.
- La API de previsualización simula algunos cambios en memoria/localStorage; los pagos, tareas y parte de las consultas no representan todavía persistencia de producción.

### Validación técnica

- `npm run build`: correcto, 42 rutas generadas.
- `git diff --check`: sin errores de espacios; solo avisos de conversión de finales de línea de Git en Windows.
- Advertencia no bloqueante: Next.js indica que la convención `middleware` está deprecada y recomienda migrar a `proxy`.
