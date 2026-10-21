// Geometría compartida entre la matriz funcional, las láminas y sus pruebas.
// La punta de la fila coincide con el vértice izquierdo del rombo identificador.
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
  const headerGap = 12;
  const rowStart = headerHeight + headerGap;
  const legendHeight = 78;
  return {
    triangular, count, roomWidth, rowHeight, headerHeight, headerGap, rowStart, legendHeight, half,
    // Un rombo identificador por recinto; las relaciones se ubican a su derecha.
    width: roomWidth + (triangular ? (count + 1) * half : count * rowHeight) + 2,
    height: rowStart + count * rowHeight + legendHeight + 2,
  };
}

export function matrixCell(layout, row, col) {
  const { roomWidth, rowHeight, rowStart, half, triangular } = layout;
  return triangular
    ? { x: roomWidth + (col - row + 1) * half, y: rowStart + (row + col + 1) * half }
    : { x: roomWidth + col * rowHeight + half, y: rowStart + row * rowHeight + half };
}

// Punta coloreada de la tabla: el vértice coincide con el primer rombo de la fila.
export function matrixRowShape(layout, row) {
  const { roomWidth: right, rowHeight: step, rowStart, half, triangular } = layout;
  const top = rowStart + row * step;
  const bottom = top + step;
  if (!triangular) return `M 0 ${top} H ${right} V ${bottom} H 0 Z`;
  return `M 0 ${top} H ${right - half} L ${right} ${top + half} L ${right - half} ${bottom} H 0 Z`;
}

export function matrixOutline(layout) {
  const { roomWidth: left, rowStart: top, rowHeight: step, half, count: n, triangular } = layout;
  if (!triangular) return 'M ' + left + ' ' + top + ' H ' + (left + n * step) +
    ' V ' + (top + n * step) + ' H ' + left + ' Z';
  if (n < 1) return '';
  // Borde superior y derecho y, de regreso, zigzag por cada vértice de la tabla.
  const upper = ['M', left + half, top, 'L', left + (n + 1) * half, top + n * half,
    'L', left + half, top + n * step];
  for (let row = n - 1; row >= 0; row--) {
    upper.push('L', left, top + (row + 0.5) * step);
    upper.push('L', left + half, top + row * step);
  }
  upper.push('Z');
  return upper.join(' ');
}
