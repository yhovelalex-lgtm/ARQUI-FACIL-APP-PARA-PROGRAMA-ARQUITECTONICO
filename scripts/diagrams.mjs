import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const output = process.env.ARTIFACT_DIR || '/tmp/arquifacil-navigation';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const checks = [], runtimeErrors = [], messages = [];
page.on('pageerror', error => runtimeErrors.push(error.message));
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) messages.push(message.text());
});
const check = (name, actual, expected = true) => {
  assert.deepEqual(actual, expected, name);
  checks.push(name);
};
const near = (a, b) => Math.abs(a - b) < .05;
const open = async name => {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/');
  await page.getByRole('navigation').getByRole('button', { name: new RegExp(name) }).click();
  await page.waitForTimeout(200);
};
const canvas = () => page.locator('.touch-none');
const camera = () => canvas().locator('.origin-top-left').evaluate(element => {
  const matrix = new DOMMatrix(getComputedStyle(element).transform);
  return { x: matrix.e, y: matrix.f, zoom: matrix.a };
});
const blankPoint = () => canvas().evaluate(element => {
  const bounds = element.getBoundingClientRect();
  for (const [u, v] of [[.82, .75], [.8, .5], [.1, .7], [.75, .15], [.5, .75]]) {
    const x = bounds.x + bounds.width * u, y = bounds.y + bounds.height * v;
    const target = document.elementFromPoint(x, y);
    if (target && !target.closest('g.cursor-grab, g.cursor-grabbing, g[transform^="translate("]')) return { x, y };
  }
  throw new Error('No se encontró un punto libre del lienzo.');
});
async function visibleNode(name) {
  const nodes = page.locator(name === 'Topología' ? 'g.cursor-grab' : 'g[transform^="translate("]');
  const canvasBounds = await canvas().boundingBox();
  for (let i = 0; i < await nodes.count(); i++) {
    const node = nodes.nth(i), bounds = await node.boundingBox();
    if (!bounds) continue;
    const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    if (point.x > canvasBounds.x + 30 && point.x < canvasBounds.x + canvasBounds.width - 100 &&
        point.y > canvasBounds.y + 30 && point.y < canvasBounds.y + canvasBounds.height - 100) return { node, point };
  }
  throw new Error('No se encontró un elemento visible.');
}
async function drag(point, dx, dy, button = 'left', alt = false) {
  await page.mouse.move(point.x, point.y);
  if (alt) await page.keyboard.down('Alt');
  await page.mouse.down({ button });
  await page.mouse.move(point.x + dx, point.y + dy, { steps: 8 });
  await page.mouse.up({ button });
  if (alt) await page.keyboard.up('Alt');
  await page.waitForTimeout(100);
}
async function pan(name, point, dx, dy, button, alt, label) {
  const before = await camera();
  await drag(point, dx, dy, button, alt);
  const after = await camera();
  check(`${name}: ${label}`, near(after.x - before.x, dx) && near(after.y - before.y, dy) && near(after.zoom, before.zoom));
  await page.mouse.move(point.x + dx + 10, point.y + dy + 10);
  check(`${name}: soltar termina ${label}`, await camera(), after);
}

try {
  await open('Matriz funcional');
  const cells = () => page.getByRole('button', { name: /^Relación entre/ });
  check('Triangular muestra 55 pares para 11 espacios', await cells().count(), 55);
  const labels = await cells().evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')));
  const pairs = labels.map(label => label.match(/^Relación entre (.+) y (.+):/).slice(1).sort().join('|'));
  check('Triangular no duplica pares', new Set(pairs).size, 55);
  await page.getByRole('button', { name: 'FORMA: TRIANGULAR' }).click();
  check('Cuadrada muestra los 110 extremos de los pares', await cells().count(), 110);
  await page.getByRole('button', { name: 'Relación entre Hall y Reception: 2. Clic para cambiar.' }).click();
  check('Las dos celdas reflejan la misma relación editada', await page.getByRole('button', { name: /Relación entre (Hall y Reception|Reception y Hall): 0/ }).count(), 2);
  await page.getByRole('button', { name: 'FORMA: CUADRADA' }).click();
  check('Volver a triangular conserva el valor', await page.getByRole('button', { name: 'Relación entre Hall y Reception: 0. Clic para cambiar.' }).count(), 1);
  await page.screenshot({ path: path.join(output, 'triangular.png'), animations: 'disabled' });

  for (const name of ['Topología', 'Relaciones']) {
    await open(name);
    await pan(name, await blankPoint(), 60, 35, 'middle', false, 'botón central sobre el fondo');
    await pan(name, await blankPoint(), -40, -25, 'left', true, 'Alt + arrastre sobre el fondo');

    for (const [button, alt, label] of [['middle', false, 'botón central sobre un elemento'], ['left', true, 'Alt + arrastre sobre un elemento']]) {
      await open(name);
      await page.waitForTimeout(500);
      const { node, point } = await visibleNode(name);
      const geometry = await node.getAttribute('transform');
      const pinnedBefore = await page.locator('circle[stroke-dasharray="3,3"]').count();
      await pan(name, point, 45, 30, button, alt, label);
      if (name === 'Relaciones') check(`${name}: ${label} no mueve la caja`, await node.getAttribute('transform'), geometry);
      else check(`${name}: ${label} no fija una burbuja`, await page.locator('circle[stroke-dasharray="3,3"]').count(), pinnedBefore);
    }

    const point = await blankPoint(), beforeWheel = await camera();
    await page.mouse.move(point.x, point.y);
    await page.mouse.wheel(0, -120);
    await page.waitForFunction(previous => {
      const matrix = new DOMMatrix(getComputedStyle(document.querySelector('.touch-none .origin-top-left')).transform);
      return matrix.a > previous;
    }, beforeWheel.zoom);
    const afterWheel = await camera();
    check(`${name}: la rueda aumenta el zoom`, afterWheel.zoom > beforeWheel.zoom);
    check(`${name}: el zoom conserva el desplazamiento`, { x: afterWheel.x, y: afterWheel.y }, { x: beforeWheel.x, y: beforeWheel.y });

    const { node, point: nodePoint } = await visibleNode(name);
    const beforeDrag = await camera();
    if (name === 'Relaciones') {
      const geometry = await node.getAttribute('transform');
      await drag(nodePoint, 30, 25);
      check('Relaciones: el botón izquierdo sigue moviendo cajas', await node.getAttribute('transform') !== geometry);
      const resize = node.locator('path.cursor-nwse-resize');
      const handle = await resize.boundingBox();
      const widthBefore = Number(await node.locator('rect').first().getAttribute('width'));
      await drag({ x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }, 22, 15);
      const widthAfter = Number(await node.locator('rect').first().getAttribute('width'));
      check('Relaciones: sigue siendo posible redimensionar', widthAfter > widthBefore);
    } else {
      await drag(nodePoint, 30, 25);
      check('Topología: el botón izquierdo sigue fijando burbujas', await page.locator('circle[stroke-dasharray="3,3"]').count() > 0);
    }
    check(`${name}: editar un elemento no desplaza la cámara`, await camera(), beforeDrag);
  }
  check('Los gestos no provocan excepciones de JavaScript', runtimeErrors, []);
  check('La rueda no genera errores por un listener pasivo', messages.some(message => message.includes('Unable to preventDefault inside passive')), false);
} finally {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks, runtimeErrors, messages: [...new Set(messages)] }, null, 2));
  await browser.close();
}
console.log(`${checks.length} comprobaciones de matriz y navegación completadas. Evidencias: ${output}`);
