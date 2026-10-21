// Geometría y semántica comunes para la matriz funcional y sus diagramas.
export const RELATION = Object.freeze({ NONE: 0, INDIRECT: 1, DIRECT: 2 });

export function relationKey(a, b) {
  return [a, b].sort().join('-');
}

export function nextRelation(value) {
  return value === RELATION.NONE ? RELATION.INDIRECT
    : value === RELATION.INDIRECT ? RELATION.DIRECT : RELATION.NONE;
}

export function relationDasharray(value) {
  return value === RELATION.INDIRECT ? '6 6' : undefined;
}

export function matrixLayout(count, triangular = true, roomWidth = 450, rowHeight = 48, headerHeight = 56) {
  const half = rowHeight / 2;
  return {
    triangular, count, roomWidth, rowHeight, headerHeight, half,
    width: roomWidth + (triangular ? count * half : count * rowHeight) + 2,
    height: headerHeight + count * rowHeight + 2,
  };
}

export function matrixCell(layout, row, col) {
  const { roomWidth, rowHeight, headerHeight, half, triangular } = layout;
  return triangular
    ? { x: roomWidth + (col - row) * half, y: headerHeight + (row + col + 1) * half }
    : { x: roomWidth + col * rowHeight + half, y: headerHeight + row * rowHeight + half };
}

export function matrixOutline(layout) {
  const { roomWidth: left, headerHeight: top, rowHeight: step, half, count: n, triangular } = layout;
  if (!triangular) return 'M ' + left + ' ' + top + ' H ' + (left + n * step) +
    ' V ' + (top + n * step) + ' H ' + left + ' Z';
  if (n < 2) return '';
  return 'M ' + (left + half) + ' ' + (top + half) +
    ' L ' + (left + n * half) + ' ' + (top + n * half) +
    ' L ' + (left + half) + ' ' + (top + (n - 0.5) * step) +
    ' L ' + left + ' ' + (top + (n - 1) * step) +
    ' L ' + left + ' ' + (top + step) + ' Z';
}
