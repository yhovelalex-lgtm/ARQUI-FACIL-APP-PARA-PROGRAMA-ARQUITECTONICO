import test from 'node:test';
import assert from 'node:assert/strict';
import { RELATION, relationKey, nextRelation, relationDasharray, matrixLayout, matrixCell, matrixOutline, matrixRowShape } from '../src/matrix-geometry.js';

test('las relaciones solo usan 0, 1 y 2', () => {
  assert.deepEqual([nextRelation(0), nextRelation(1), nextRelation(2)], [1, 2, 0]);
  assert.equal(nextRelation(3), 0);
  assert.equal(RELATION.DIRECT, 2);
  assert.equal(relationDasharray(0), undefined);
  assert.equal(relationDasharray(1), '6 6');
  assert.equal(relationDasharray(2), undefined);
  assert.equal(relationKey('b', 'a'), relationKey('a', 'b'));
});

test('el primer rombo de cada fila se une exactamente a la línea de la tabla', () => {
  for (const n of [2, 3, 11, 28]) {
    const layout = matrixLayout(n);
    for (let i = 0; i < n - 1; i++) {
      const first = matrixCell(layout, i, i + 1);
      assert.equal(first.x - layout.half, layout.roomWidth + layout.half);
      assert.equal(first.y, layout.headerHeight + (i + 1) * layout.rowHeight);
      assert.ok(first.y - layout.half > layout.headerHeight);
      assert.ok(first.y + layout.half < layout.height);
    }
  }
});

test('triangular: cada par aparece una sola vez, retícula dentro del contorno', () => {
  for (const n of [2, 3, 11, 28]) {
    const layout = matrixLayout(n);
    const items = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) items.push(matrixCell(layout, i, j));
    assert.equal(items.length, n * (n - 1) / 2);
    assert.ok(items.every(p => p.x - layout.half >= layout.roomWidth));
    assert.ok(items.every(p => p.x + layout.half <= layout.width));
    assert.ok(items.every(p => p.y + layout.half <= layout.height));
    assert.ok((matrixOutline(layout).match(/ L /g) || []).length >= n * 2);
  }
});

test('cuadrada: centros perfectamente coincidentes con filas', () => {
  const layout = matrixLayout(11, false);
  for (let i = 0; i < 11; i++) for (let j = 0; j < 11; j++) {
    const point = matrixCell(layout, i, j);
    assert.equal(point.y, layout.headerHeight + (i + 0.5) * layout.rowHeight);
  }
  assert.ok(matrixOutline(layout).endsWith('Z'));
});

test('cada remate de recinto es una punta coloreable alineada con su rombo', () => {
  for (const n of [2, 11, 28]) {
    const layout = matrixLayout(n);
    for (let i = 0; i < n; i++) {
      const point = matrixCell(layout, i, i);
      const shape = matrixRowShape(layout, i);
      assert.equal(point.x - layout.half, layout.roomWidth);
      assert.equal(point.y, layout.headerHeight + (i + .5) * layout.rowHeight);
      assert.ok(shape.includes('L ' + layout.roomWidth + ' ' + point.y));
      assert.ok(shape.endsWith('Z'));
    }
  }
});
