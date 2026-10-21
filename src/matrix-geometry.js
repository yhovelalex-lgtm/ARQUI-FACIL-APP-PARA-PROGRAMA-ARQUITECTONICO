// Geometría compartida entre la matriz funcional, las láminas y sus pruebas.
// El antiguo rombo identificador forma parte de la punta del recinto.
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

export function relationValue(value) {
  return Math.min(RELATION.DIRECT, Math.max(RELATION.NONE, Number(value) || 0));
}

export function relationTotal(roomId, spaces, getRelation) {
  return spaces.reduce((sum, other) => other.id === roomId
    ? sum : sum + relationValue(getRelation(roomId, other.id)), 0);
}

export function matrixLayout(count, triangular = true, roomWidth = 450, rowHeight = 48, headerHeight = 56) {
  const half = rowHeight / 2;
  const headerGap = 12;
  const rowStart = headerHeight + headerGap;
  const legendHeight = 78;
  return {
    triangular, count, roomWidth, rowHeight, headerHeight, headerGap, rowStart, legendHeight, half,
    // La anchura mínima también reserva espacio para la cabecera con pocos recintos.
    width: Math.max(roomWidth + (triangular ? (count + 1) * half : count * rowHeight) + 2, roomWidth + 240),
    height: rowStart + count * rowHeight + legendHeight + 2,
  };
}

export function matrixCell(layout, row, col) {
  const { roomWidth, rowHeight, rowStart, half, triangular } = layout;
  return triangular
    ? { x: roomWidth + (col - row + 1) * half, y: rowStart + (row + col + 1) * half }
    : { x: roomWidth + col * rowHeight + half, y: rowStart + row * rowHeight + half };
}

// Una sola pieza pentagonal: cuerpo del recinto y antiguo rombo inicial unidos.
export function matrixRowShape(layout, row) {
  const { roomWidth: right, rowHeight: step, rowStart, half, triangular } = layout;
  const top = rowStart + row * step;
  const bottom = top + step;
  if (!triangular) return `M 0 ${top} H ${right} V ${bottom} H 0 Z`;
  return `M 0 ${top} H ${right + half} L ${right + step} ${top + half} L ${right + half} ${bottom} H 0 Z`;
}

export function matrixOutline(layout) {
  const { roomWidth: left, rowStart: top, rowHeight: step, half, count: n, triangular } = layout;
  if (!triangular) return 'M ' + left + ' ' + top + ' H ' + (left + n * step) +
    ' V ' + (top + n * step) + ' H ' + left + ' Z';
  if (n < 2) return '';
  // El contorno cubre solo relaciones: las puntas coloreadas cierran su borde izquierdo.
  const upper = ['M', left + step, top + half, 'L', left + (n + 1) * half, top + n * half,
    'L', left + step, top + (n - 0.5) * step];
  for (let row = n - 2; row >= 0; row--) {
    upper.push('L', left + half, top + (row + 1) * step);
    upper.push('L', left + step, top + (row + 0.5) * step);
  }
  upper.push('Z');
  return upper.join(' ');
}
