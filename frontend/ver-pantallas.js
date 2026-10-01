/**
 * Captura las pantallas de NexusGest en los cuatro tamaños que importan.
 *
 * Uso (con el frontend levantado en localhost:3000):
 *   cd C:\Users\Rony\Documents\Gestoria\frontend
 *   node ver-pantallas.js
 *
 * Genera capturas en ./capturas/ y un resumen en consola.
 * Es una herramienta de diagnostico: no toca la aplicacion.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SALIDA = path.join(__dirname, 'capturas');

// 375 = movil pequeno (el caso mas apretado), 1440 = escritorio.
const VIEWPORTS = [
  { nombre: 'movil-375', width: 375, height: 812 },
  { nombre: 'movil-390', width: 390, height: 844 },
  { nombre: 'tablet-768', width: 768, height: 1024 },
  { nombre: 'escritorio-1440', width: 1440, height: 900 },
];

const PANTALLAS = [
  { ruta: '/', nombre: 'web-publica' },
  { ruta: '/calculadora', nombre: 'calculadora' },
  { ruta: '/servicios', nombre: 'servicios' },
  { ruta: '/portal', nombre: 'portal-cliente' },
  { ruta: '/login', nombre: 'login' },
  // El CRM pide sesion. Se captura la pantalla de login como referencia de
  // bloqueada; para entrar haria falta un usuario de prueba.
  { ruta: '/crm', nombre: 'crm' },
  { ruta: '/crm/facturacion', nombre: 'crm-facturacion' },
];

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });

  const browser = await chromium.launch();
  const problemas = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });

    for (const p of PANTALLAS) {
      const page = await context.newPage();
      const url = BASE + p.ruta;

      // Errores de JavaScript y peticiones fallidas de la propia pagina.
      const errores = [];
      page.on('pageerror', (e) => errores.push('JS: ' + e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errores.push('CONSOLA: ' + m.text());
      });
      page.on('requestfailed', (r) => {
        // Las llamadas /api/backend fallan sin backend: es esperado.
        if (!r.url().includes('/api/')) {
          errores.push('RED: ' + r.url().replace(BASE, '') + ' — ' + (r.failure()?.errorText || ''));
        }
      });

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1200);

        const archivo = path.join(SALIDA, `${p.nombre}--${vp.nombre}.png`);
        await page.screenshot({ path: archivo, fullPage: true });

        // Deteccion basica de desbordamiento horizontal: la causa mas
        // comun de "no se ve la columna de acciones".
        const desborde = await page.evaluate(() => {
          const d = document.documentElement;
          return { scroll: d.scrollWidth, visible: d.clientWidth };
        });

        const ancho = desborde.scroll > desborde.visible + 2;
        console.log(
          `${vp.nombre.padEnd(14)} ${p.nombre.padEnd(18)} ` +
          (ancho ? `DESBORDA (${desborde.scroll} > ${desborde.visible})` : 'ok') +
          (errores.length ? `  [${errores.length} errores]` : '')
        );
        if (errores.length) problemas.push({ pantalla: p.nombre, vp: vp.nombre, errores });
      } catch (e) {
        console.log(`${vp.nombre.padEnd(14)} ${p.nombre.padEnd(18)} FALLO: ${e.message.split('\n')[0]}`);
        problemas.push({ pantalla: p.nombre, vp: vp.nombre, errores: [e.message.split('\n')[0]] });
      }
      await page.close();
    }
    await context.close();
  }

  await browser.close();

  console.log('\n=== RESUMEN ===');
  if (problemas.length === 0) {
    console.log('Ningun error de JavaScript ni peticion fallida.');
  } else {
    for (const p of problemas.slice(0, 12)) {
      console.log(`\n${p.vp} / ${p.screen}`);
      p.errores.slice(0, 4).forEach((e) => console.log('   ' + e));
    }
    console.log('\nCapturas en: ' + SALIDA);
    console.log('Abre las imagenes y describeme lo que se ve feo o descuadrado.');
  }
})();