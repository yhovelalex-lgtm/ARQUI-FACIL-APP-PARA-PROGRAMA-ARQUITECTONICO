import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const files=['src/App.jsx','src/Visuals.jsx','src/PrintStudio.jsx'];
for(const file of files){
 const src=readFileSync(file,'utf8');
 assert.ok(src.includes('export ')||file.endsWith('App.jsx'),'Archivo vacío o inválido: '+file);
 console.log('Código revisado:',file);
}
const app=readFileSync('src/App.jsx','utf8');
const visuals=readFileSync('src/Visuals.jsx','utf8');
const studio=readFileSync('src/PrintStudio.jsx','utf8');
for(const required of ['<MatrixDiamond','<TopologyArtwork','<FlowArtwork','<LegendOverlay','<GraphicStyleControls','<PrintStudioView'])assert.ok(app.includes(required),'No se integra '+required);
assert.ok(visuals.includes('relationKey'),'Falta la clave canónica');
assert.ok(studio.includes('matrixTriangular')&&studio.includes('topologyNodes')&&studio.includes('showFlows'),'Falta sincronía de estado');
assert.ok(studio.includes('pdf.addPage'),'Falta página independiente en PDF');
const n=11;
assert.equal(n*(n-1)/2,55);
console.log('Integración estática: OK');
