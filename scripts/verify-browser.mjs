import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1600,height:950},acceptDownloads:true});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
async function module(name){await page.getByRole('navigation').getByRole('button',{name:new RegExp(name)}).click();await page.waitForTimeout(150);}
const url=process.env.BASE_URL||'http://127.0.0.1:5173/';
try{
 await page.goto(url);await module('Matriz funcional');
 assert.equal(await page.getByRole('combobox',{name:'Paleta de colores'}).inputValue(),'minimalist','Paleta minimalista por defecto');
 assert.equal(await page.locator('.af-matrix-board').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(251, 251, 248)','Fondo inicial claro en matriz');
 const matrix=page.getByRole('group',{name:'Matriz triangular romboidal de relaciones'});
 await matrix.waitFor();
 assert.equal(await page.getByRole('button',{name:/^Relación entre/}).count(),55,'Triangular debe tener 55 pares');
 const first=page.getByRole('button',{name:'Relación entre Hall y Reception: 3. Clic para cambiar.'});
 await first.click();
 await page.getByRole('button',{name:'Relación entre Hall y Reception: 0. Clic para cambiar.'}).waitFor({timeout:6000});
 assert.equal(await page.getByRole('button',{name:'Relación entre Hall y Reception: 0. Clic para cambiar.'}).count(),1,'Edición debe funcionar');
 await page.getByRole('button',{name:'FORMA: TRIANGULAR'}).click();
 assert.equal(await page.getByRole('button',{name:/^Relación entre/}).count(),110,'Cuadrada mantiene 110 celdas');
 await page.getByRole('button',{name:'FORMA: CUADRADA'}).click();
 await page.getByRole('combobox',{name:'Distribución de colores'}).selectOption('auto');
 await page.getByRole('button',{name:'↻ Colores'}).click();
 await page.getByRole('button',{name:'Avanzado'}).click();
 await page.getByRole('textbox',{name:'Texto general'}).count().catch(()=>{});
 await module('Topología');
 assert.equal(await page.locator('.af-artwork-svg').count(),0,'El lienzo interactivo debe mantener dimensiones propias');
 assert.ok(await page.locator('.af-legend-handle').count()>0,'La leyenda debe existir');
 await module('Relaciones');
 assert.ok(await page.locator('.af-legend-handle').count()>0,'La leyenda de relaciones debe existir');
 await module('Láminas');
 assert.equal(await page.locator('.af-sheet-page').count(),3,'Se previsualizan 3 hojas seleccionadas');
 assert.ok(await page.locator('.af-sheet-body-matrix .af-matrix-svg').count()>0,'La matriz de impresión comparte su renderizador');
 assert.equal(await page.locator('.af-sheet-body-topology svg').count(),1,'Topología reproducida');
 assert.equal(await page.locator('.af-sheet-body-flowdiagram svg').count(),1,'Relaciones reproducidas');
 const [download]=await Promise.all([page.waitForEvent('download',{timeout:45000}),page.getByRole('button',{name:'Exportar PDF'}).click()]);
 assert.ok(download.suggestedFilename().endsWith('.pdf'),'PDF descargado');
 assert.deepEqual(errors,[],'No debe haber errores JavaScript');
 console.log('Pruebas de navegador: OK (matriz, edición, paletas, leyendas, láminas, PDF)');
}catch(err){console.error('Pruebas fallidas',err,errors);throw err}finally{await browser.close()}

