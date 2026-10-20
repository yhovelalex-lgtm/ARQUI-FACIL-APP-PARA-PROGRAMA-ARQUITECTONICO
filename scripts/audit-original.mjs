import fs from 'node:fs';
import vm from 'node:vm';

// Diagnostic of the exact uploaded source, not a passing readiness test.
const source = fs.readFileSync(new URL('../docs/original/matriz_y_diagrama_generativo.tsx', import.meta.url), 'utf8');
const engineCode = source.slice(source.indexOf('const FloorPlanEngine ='), source.indexOf('// ==========================================\n// COMPONENTE PRINCIPAL'));
const spacesText = source.match(/const \[spaces, setSpaces\] = useState\(([\s\S]*?)\);/)[1];
const matrixText = source.match(/const \[matrix, setMatrix\] = useState\(([\s\S]*?)\);/)[1];
let seed = 1;
const math = Object.create(Math);
math.random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
const context = { Math: math, setTimeout, Date };
vm.createContext(context);
const engine = vm.runInContext(engineCode + ';FloorPlanEngine', context);
const spaces = vm.runInContext(spacesText, context);
const matrix = vm.runInContext('(' + matrixText + ')', context);
const ignoredRelations = Object.keys(matrix).filter(key => !spaces.some((s, i) => spaces.slice(i + 1).some(t => [s.id, t.id].sort().join('-') === key)));
const proposals = await engine.runFloorPlanEvolutionAsync(spaces, matrix, { popSize: 40, generations: 50, mutationRate: .2, topK: 6, aspectRatio: 1.5 }, () => {});
const expectedArea = spaces.reduce((sum, s) => sum + s.area, 0);
const result = {
  randomSeed: 1,
  expectedSpaces: spaces.length,
  expectedArea,
  declaredRelations: Object.keys(matrix).length,
  ignoredRelations,
  proposals: proposals.map(p => ({
    ids: p.layout.map(r => r.id),
    uniqueSpaces: new Set(p.layout.map(r => r.id)).size,
    declaredArea: p.layout.reduce((sum, r) => sum + r.area, 0),
    containerArea: p.boundary.w * p.boundary.h,
    fitness: p.fitness,
  })),
};
console.log(JSON.stringify(result, null, 2));
if (ignoredRelations.length || result.proposals.some(p => p.uniqueSpaces !== spaces.length || Math.abs(p.declaredArea - expectedArea) > .001)) {
  console.error('FALLO CONFIRMADO EN EL ORIGINAL: relaciones omitidas y/o ambientes repetidos o ausentes. Ver docs/AUDITORIA.md.');
  process.exitCode = 1;
}
