import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const output = process.env.ARTIFACT_DIR || '/tmp/arquifacil-matrix-pentagonal';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1520, height: 1080 } });
const checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const check = (name, actual, expected = true) => {
  assert.deepEqual(actual, expected, name);
  checks.push(name);
};
const open = name => page.getByRole('navigation').getByRole('button', { name: new RegExp(name) }).click();
const cells = () => page.getByRole('button', { name: /^Relación entre/ });
const totals = () => page.locator('.fm-row-summary text').allTextContents();
const sumFor = (name, value) => page.getByRole('img', { name: `Sumatoria de relaciones de ${name}: ${value}`, exact: true });
const snapshot = async filename => {
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.fm-sheet').screenshot({ path: path.join(output, filename), animations: 'disabled' });
};

try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await open('Matriz funcional');
  check('55 relaciones editables sin añadir una diagonal separada', await cells().count(), 55);
  check('Se muestran las diez relaciones declaradas en el ejemplo', await cells().evaluateAll(items => items.filter(item => !item.getAttribute('aria-label').includes(': 0.')).length), 10);
  check('Cada recinto muestra la suma de pesos, no el número de conexiones', await totals(), ['6', '9', '2', '2', '2', '2', '1', '6', '2', '4', '2']);
  check('La suma de filas cuenta cada par exactamente dos veces', (await totals()).reduce((sum, value) => sum + Number(value), 0), 38);
  check('Se eliminó la columna de identificadores grises independientes', await page.locator('[aria-label^="Identificador de"]').count(), 0);

  const geometry = await page.locator('.fm-sheet').evaluate(sheet => {
    const rows = [...sheet.querySelectorAll('.fm-room-row')];
    const paths = rows.map(row => row.querySelector('.fm-room-shape'));
    const summariesInside = rows.every(row => {
      const shape = row.querySelector('.fm-room-shape'), circle = row.querySelector('.fm-row-summary circle');
      const x = Number(circle.getAttribute('cx')), y = Number(circle.getAttribute('cy')), radius = Number(circle.getAttribute('r'));
      return Array.from({ length: 8 }, (_, i) => i * Math.PI / 4).every(angle =>
        shape.isPointInFill(new DOMPoint(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)));
    });
    const relationsUncovered = [...sheet.querySelectorAll('.fm-editable .fm-tile')].every(tile => {
      const b = tile.getBBox(), center = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2);
      return !paths.some(shape => shape.isPointInFill(center));
    });
    return { summariesInside, relationsUncovered };
  });
  check('La punta contiene por completo el círculo de sumatoria', geometry.summariesInside);
  check('Los pentágonos no tapan las celdas de relaciones', geometry.relationsUncovered);

  for (const [before, after, hall, reception] of [[2, 0, 4, 7], [0, 1, 5, 8], [1, 2, 6, 9]]) {
    await page.getByRole('button', { name: `Relación entre Hall y Reception: ${before}. Clic para cambiar.`, exact: true }).click();
    check(`Editar ${before} → ${after} actualiza las dos sumatorias`, await sumFor('Hall', hall).count() === 1 && await sumFor('Reception', reception).count() === 1);
  }
  const pair = value => page.getByRole('button', { name: `Relación entre Hall y Reception: ${value}. Clic para cambiar.`, exact: true });
  await pair(2).focus(); await page.keyboard.press('Space');
  check('Editar con Espacio actualiza Σ', await sumFor('Hall', 4).count(), 1);
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  check('Editar con Enter conserva el ciclo 0 → 1 → 2', await sumFor('Hall', 6).count(), 1);

  await page.getByRole('button', { name: 'Solo gráfico', exact: true }).click();
  check('El modo gráfico mantiene la sumatoria visible', await sumFor('Hall', 6).count(), 1);
  check('El modo gráfico oculta solo los números de las relaciones', await page.locator('.fm-editable text').count(), 0);
  await page.getByRole('button', { name: 'Solo número', exact: true }).click();
  check('El modo numérico conserva las diez relaciones', await page.locator('.fm-editable text').count(), 10);
  await page.getByRole('button', { name: 'Mixto', exact: true }).click();
  await page.getByRole('button', { name: 'FORMA: TRIANGULAR', exact: true }).click();
  check('La matriz cuadrada conserva sus 110 celdas', await cells().count(), 110);
  check('La matriz cuadrada conserva la misma suma de pesos', (await totals()).reduce((sum, value) => sum + Number(value), 0), 38);
  await page.getByRole('button', { name: 'FORMA: CUADRADA', exact: true }).click();

  const legend = page.locator('.fm-svg-legend'), before = await legend.getAttribute('transform'), b = await legend.boundingBox();
  await page.mouse.move(b.x + 35, b.y + 20); await page.mouse.down();
  await page.mouse.move(b.x + 67, b.y + 28, { steps: 5 }); await page.mouse.up();
  check('La leyenda sigue siendo arrastrable', await legend.getAttribute('transform') !== before);
  await snapshot('matriz-pentagonal.png');

  await open('Láminas');
  await page.locator('select').first().selectOption('bauhaus');
  await open('Matriz funcional');
  const colors = await page.locator('.fm-room-row[data-room-id="recep"]').evaluate(row => ({
    body: row.querySelectorAll('path')[1].getAttribute('fill'),
    summary: row.querySelector('.fm-row-summary circle').getAttribute('stroke'),
  }));
  check('La fila y su sumatoria heredan el color de zona', colors, { body: '#dc2626', summary: '#dc2626' });
  await snapshot('matriz-pentagonal-color.png');

  await open('Láminas');
  const printNode = page.locator('#print-node-matrix');
  check('La lámina usa los mismos pentágonos y sumatorias', await printNode.locator('.fm-row-summary').count(), 11);
  check('La lámina conserva la suma de Hall', await printNode.locator('[aria-label="Sumatoria de relaciones de Hall: 6"]').count(), 1);
  await page.getByRole('button', { name: 'Diagrama Flujos', exact: true }).click();
  await page.getByRole('button', { name: 'Topología Metaball', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG', exact: true }).click();
  const download = await downloadPromise, filename = path.join(output, 'lamina-matriz.png');
  await download.saveAs(filename);
  check('La exportación PNG genera una lámina con contenido', fs.statSync(filename).size > 10000);

  await open('Matriz funcional');
  await page.setViewportSize({ width: 390, height: 844 });
  check('En móvil la matriz no desborda la página', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('En móvil se puede desplazar horizontalmente la matriz', await page.locator('.fm-canvas-scroll').evaluate(element => element.scrollWidth > element.clientWidth));
  await page.screenshot({ path: path.join(output, 'movil.png'), animations: 'disabled' });

  await page.setViewportSize({ width: 1520, height: 1080 });
  await open('Programa');
  for (const name of ['Bibliothèque', 'Escaliers + Asc.', 'Cinema', 'Auditorium', 'Magasin / WC', 'Permanent Exhibition', 'Escaliers', 'Café', 'Scène en Direct']) {
    await page.getByRole('button', { name: `Eliminar ${name}`, exact: true }).click();
  }
  await open('Matriz funcional');
  check('Con dos recintos sigue existiendo un solo par', await cells().count(), 1);
  check('Con dos recintos la cabecera cabe en la lámina', await page.locator('.fm-svg').evaluate(svg =>
    [...svg.querySelectorAll('.fm-head-text')].every(text => text.getBBox().x + text.getBBox().width <= svg.viewBox.baseVal.width)));
  check('Sin excepciones JavaScript durante la edición y exportación', errors, []);
} finally {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
console.log(`${checks.length} comprobaciones de matriz y exportación completadas. Evidencias: ${output}`);
