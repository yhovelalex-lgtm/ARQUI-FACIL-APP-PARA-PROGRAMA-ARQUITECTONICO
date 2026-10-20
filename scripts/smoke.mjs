import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const output = process.env.ARTIFACT_DIR || '/tmp/arquifacil-validation';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const checks = [], consoleErrors = [], runtimeErrors = [], warnings = [];
page.on('pageerror', e => runtimeErrors.push(e.message));
page.on('console', m => {
  if (m.type() === 'error') consoleErrors.push(m.text());
  if (m.type() === 'warning') warnings.push(m.text());
});
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); };
const openModule = label => page.getByRole('navigation', { name: 'Módulos de diseño' }).getByRole('button', { name: label }).click();
const capture = async name => {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true, animations: 'disabled' });
};

try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/');
  await page.getByRole('heading', { name: 'Piensa el espacio. Traza lo posible.' }).waitFor();
  await capture('desktop');
  check('Carga los 11 espacios del ejemplo', await page.locator('.program-table tbody tr').count() === 11);
  await page.getByLabel('Nombre del nuevo espacio', { exact: true }).fill('Estudio de prueba');
  await page.getByLabel('Área del nuevo espacio en metros cuadrados').fill('42');
  await page.getByRole('button', { name: 'Añadir espacio', exact: true }).click();
  check('Añade un espacio con su área', await page.getByLabel('Área de Estudio de prueba', { exact: true }).inputValue() === '42');
  await page.getByLabel('Área de Estudio de prueba', { exact: true }).fill('46');
  check('Edita el área', await page.getByLabel('Área de Estudio de prueba', { exact: true }).inputValue() === '46');
  await page.getByRole('button', { name: 'Eliminar Estudio de prueba', exact: true }).click();
  check('Elimina el espacio', await page.getByLabel('Nombre de Estudio de prueba', { exact: true }).count() === 0);

  await openModule('02 Matriz funcional');
  for (const [value, next] of [[3, 0], [0, 1], [1, 3]]) {
    await page.getByRole('button', { name: `Relación entre Reception y Hall: ${value}. Clic para cambiar.` }).click();
    check(`Relación ${value} → ${next}`, await page.getByRole('button', { name: `Relación entre Reception y Hall: ${next}. Clic para cambiar.` }).count() === 1);
  }
  await page.getByRole('button', { name: 'FORMA: TRIANGULAR' }).click();
  check('Alterna a matriz cuadrada', await page.getByRole('button', { name: 'Relación entre Hall y Reception: 3. Clic para cambiar.' }).count() === 1);

  await openModule('03 Topología');
  await page.waitForTimeout(400);
  check('Dibuja la topología', await page.locator('g.cursor-grab').count() === 11);
  await page.getByRole('button', { name: 'Fusión: ON' }).click();
  check('Alterna la fusión', await page.getByRole('button', { name: 'Fusión: OFF' }).count() === 1);
  await page.getByRole('button', { name: 'Centro', exact: true }).click();
  check('Cambia la posición del texto', await page.locator('textPath').count() === 0);
  await capture('topologia');

  await openModule('04 Relaciones');
  const box = page.locator('g[transform^="translate("]').first();
  const initial = await box.getAttribute('transform');
  const bounds = await box.boundingBox();
  await page.mouse.move(bounds.x + 20, bounds.y + 20);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 55, bounds.y + 45, { steps: 5 });
  await page.mouse.up();
  check('Arrastra un recinto', await box.getAttribute('transform') !== initial);
  await page.getByRole('button', { name: 'RECORRIDOS: OFF' }).click();
  check('Alterna los recorridos', await page.getByRole('button', { name: 'RECORRIDOS: ON' }).count() === 1);

  await openModule('05 Plantas');
  await page.getByRole('button', { name: 'GENERAR ESQUEMAS' }).click();
  await page.getByText('Planta Top 6', { exact: true }).waitFor({ timeout: 15000 });
  check('El proceso termina y muestra seis tarjetas (no valida calidad)', await page.getByText(/Planta Top \d/).count() === 6);

  await openModule('06 Láminas');
  await capture('laminas');
  for (const [button, extension, fileCount] of [['PDF', 'pdf', 1], ['PNG', 'png', 3], ['JPG', 'jpg', 3]]) {
    const downloads = [];
    const handler = download => downloads.push(download);
    page.on('download', handler);
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'PNG');
      return button && !button.disabled;
    }, undefined, { timeout: 45000 });
    for (let i = 0; i < 20 && downloads.length < fileCount; i++) await page.waitForTimeout(100);
    check(`Descarga ${button}: ${fileCount} archivo(s)`, downloads.length === fileCount);
    for (let i = 0; i < downloads.length; i++) {
      const filename = path.join(output, `${button.toLowerCase()}-${i + 1}.${extension}`);
      await downloads[i].saveAs(filename);
      check(`Archivo ${button} ${i + 1} tiene contenido`, fs.statSync(filename).size > 1000);
    }
    page.off('download', handler);
  }

  await openModule('01 Programa');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('mobile');
  check('No desborda la página en móvil', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('El formulario cabe en móvil', await page.locator('.space-form').evaluate(el => el.scrollWidth <= el.clientWidth));
  check('Sin excepciones de JavaScript en la interfaz', runtimeErrors.length === 0);
} finally {
  fs.writeFileSync(path.join(output, 'smoke-results.json'), JSON.stringify({
    checks, runtimeErrors,
    knownConsoleErrors: [...new Set(consoleErrors)],
    warnings: [...new Set(warnings)],
    note: 'No certifica la calidad del motor ni la importación Excel. Ejecutar audit:original para los defectos reproducidos.',
  }, null, 2));
  await browser.close();
}
console.log(`${checks.length} comprobaciones de interfaz completadas. Evidencias: ${output}`);
