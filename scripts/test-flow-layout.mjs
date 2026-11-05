import assert from 'node:assert/strict';
import { layoutFlowFromBubbles,alignFlowNode } from '../src/flowLayout.js';

const nodes=[
 {id:'a',name:'Recepción',area:50,x:100,y:100,w:120,h:80},
 {id:'b',name:'Sala',area:100,x:200,y:110,w:120,h:80},
 {id:'c',name:'Taller',area:140,x:380,y:300,w:180,h:90},
];
const bubblePositions=[{id:'a',x:210,y:230},{id:'b',x:215,y:235},{id:'c',x:550,y:500}];
const original=JSON.stringify(nodes);
const result=layoutFlowFromBubbles(nodes,bubblePositions,40);
assert.equal(result.length,3);
assert.equal(JSON.stringify(nodes),original,'No mutar los recintos originales');
assert.deepEqual(result.map(n=>n.id),['a','b','c']);
assert.ok(result.every(n=>n.x%40===0&&n.y%40===0),'Traslado sobre cuadrícula');
assert.ok(result.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));
for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++){
 const a=result[i],b=result[j];
 const overlap=a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
 assert.equal(overlap,false,'Las cajas no deben superponerse');
}
const aligned=alignFlowNode({w:120,h:80},[{x:200,y:100,w:100,h:60}],197,98,{grid:40,snap:true,guides:true,tolerance:10});
assert.equal(aligned.x,200,'Alinear al borde X');
assert.equal(aligned.y,100,'Alinear al borde Y');
assert.equal(aligned.vertical,200);
assert.equal(aligned.horizontal,100);
const free=alignFlowNode({w:120,h:80},[],87,93,{grid:40,snap:false,guides:false});
assert.deepEqual([free.x,free.y],[87,93],'Debe permitir edición libre');
console.log('Pruebas de geometría y guías ortogonales: OK');
