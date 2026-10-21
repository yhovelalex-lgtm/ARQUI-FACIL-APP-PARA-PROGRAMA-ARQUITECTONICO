import React, { useMemo, useRef, useState } from 'react';
import { BrainCircuit, FileSpreadsheet, Grid, ImagePlus, Network, Palette, Printer } from 'lucide-react';
import { FlowArtwork, LegendOverlay, MatrixDiamond, TopologyArtwork } from './Visuals.jsx';

const viewMeta = [
  { id:'program', title:'Programa arquitectónico', icon:FileSpreadsheet },
  { id:'matrix', title:'Matriz funcional', icon:Grid },
  { id:'flowdiagram', title:'Diagrama de relaciones', icon:Network },
  { id:'topology', title:'Diagrama de burbujas', icon:BrainCircuit },
  { id:'floorplan', title:'Esquema de planta', icon:Grid }
];

const viewBoxFor = (nodes, type) => {
  if (!nodes.length) return '0 0 800 600';
  const bounds=nodes.map(n=>{
    const r=type==='topology'?(n.radius||Math.max(30,Math.sqrt(Math.max(n.area||1,1))*8))+25:25;
    return type==='topology'?[n.x-r,n.y-r,n.x+r,n.y+r]:[n.x-r,n.y-r,n.x+(n.w||120)+r,n.y+(n.h||80)+r];
  });
  const minX=Math.min(...bounds.map(b=>b[0])),minY=Math.min(...bounds.map(b=>b[1]));
  const maxX=Math.max(...bounds.map(b=>b[2])),maxY=Math.max(...bounds.map(b=>b[3]));
  return [minX-55,minY-55,Math.max(220,maxX-minX+110),Math.max(180,maxY-minY+110)].join(' ');
};

export default function PrintStudioView({ spaces, matrix, getRelation, currentPalette, getSpaceColor, selectedPaletteId, setSelectedPaletteId, customPalette, handleImageUpload, showAreaText, topologyTextPos, topologyTextSize, matrixTriangular, topologyNodes, showGooey, gooeyStrength, showFlows, floorPlanProposals, colors, typography, legendPositions, graphicControls, selectedViews, setSelectedViews, pageFormat, setPageFormat, printDpi, setPrintDpi }) {
  const [isExporting,setIsExporting]=useState(false);
  const [exportError,setExportError]=useState('');
  const inputRef=useRef(null);
  const validViews=viewMeta.filter(v=>v.id!=='floorplan'||floorPlanProposals.length>0);
  const active=validViews.filter(v=>selectedViews[v.id]);
  const topology=useMemo(()=>{
    if(topologyNodes.length) return spaces.map((s,i)=>{
      const current=topologyNodes.find(n=>n.id===s.id);
      return { ...s, x:current?current.x:400+Math.cos(i*10.166)*150, y:current?current.y:300+Math.sin(i*10.166)*150, radius:Math.max(30,Math.sqrt(Math.max(s.area,1))*8), pinned:current?.pinned||false };
    });
    return spaces.map((s,i)=>({...s,x:400+Math.cos(i*Math.PI*2*1.61803398875)*(100+Math.sqrt(i)*60),y:300+Math.sin(i*Math.PI*2*1.61803398875)*(100+Math.sqrt(i)*60),radius:Math.max(30,Math.sqrt(Math.max(s.area,1))*8)}));
  },[spaces,topologyNodes]);
  const meta={matrix:legendPositions.matrix,flowdiagram:legendPositions.flowdiagram,topology:legendPositions.topology};
  const legendItems=[
    {code:'3',text:'Directa / Necesaria',color:colors.direct},
    {code:'1',text:'Indirecta / Deseable',color:colors.indirect},
    {code:'–',text:'Nula / Sin relación',color:currentPalette.lines}
  ];

  const artwork=(id)=>{
    if(id==='matrix')return <div className="af-sheet-matrix"><MatrixDiamond spaces={spaces} getRelation={getRelation} palette={currentPalette} getSpaceColor={getSpaceColor} colors={colors} variant={matrixTriangular?'diamond':'square'} labelTextSize={typography.labelSize} areaTextSize={typography.areaSize}/></div>;
    if(id==='topology')return <TopologyArtwork nodes={topology} matrix={matrix} getSpaceColor={getSpaceColor} palette={currentPalette} colors={colors} showGooey={showGooey} gooeyStrength={gooeyStrength} showAreaText={showAreaText} topologyTextPos={topologyTextPos} topologyTextSize={typography.labelSize} areaTextSize={typography.areaSize} viewBox={viewBoxFor(topology,'topology')} idPrefix="print-topology"/>;
    if(id==='flowdiagram')return <FlowArtwork spaces={spaces} matrix={matrix} getSpaceColor={getSpaceColor} palette={currentPalette} colors={colors} showAreaText={showAreaText} showFlows={showFlows} labelTextSize={typography.labelSize} areaTextSize={typography.areaSize} viewBox={viewBoxFor(spaces,'flow')} idPrefix="print-flow"/>;
    if(id==='program')return <table className="af-sheet-program"><thead><tr><th>Nº</th><th>Recinto arquitectónico</th><th>Zona</th><th>Área</th></tr></thead><tbody>{spaces.map((s,i)=><tr key={s.id}><td>{i+1}</td><td style={{color:getSpaceColor(s)}}>{s.name}</td><td>{s.subzone||s.zone}</td><td>{s.area} m²</td></tr>)}</tbody><tfoot><tr><td colSpan="3">ÁREA TOTAL</td><td>{spaces.reduce((a,s)=>a+Number(s.area||0),0).toFixed(2)} m²</td></tr></tfoot></table>;
    if(id==='floorplan'){
      const item=floorPlanProposals[0];
      if(!item)return <p>Genera un esquema de planta antes de imprimirlo.</p>;
      return <svg viewBox={'-2 -2 '+(item.boundary.w+4)+' '+(item.boundary.h+4)} className="af-artwork-svg">
        {item.layout.map(r=><g key={r.id}><rect x={r.x} y={r.y} width={r.w} height={r.h} fill={getSpaceColor(r)} fillOpacity=".16" stroke={currentPalette.lines} strokeWidth=".13"/>
          <text x={r.x+r.w/2} y={r.y+r.h/2} fontSize={Math.max(1.15,typography.labelSize/8)} fill={currentPalette.text} textAnchor="middle">{r.name.slice(0,17)}</text></g>)}
      </svg>;
    }
    return null;
  };
  const sheet=(id,index)=><div id={'af-sheet-preview-'+id} className="af-sheet-page" key={id} style={{aspectRatio:pageFormat.w+'/'+pageFormat.h,background:currentPalette.bg,color:currentPalette.text,borderColor:currentPalette.lines,fontFamily:typography.fontFamily}}>
    <div className="af-sheet-header"><strong>ARQUI<span>FÁCIL</span></strong><div><span>ESTUDIO DE PROGRAMA ARQUITECTÓNICO</span><b>{viewMeta.find(v=>v.id===id)?.title}</b></div><small>{'LÁMINA '+String(index+1).padStart(2,'0')}</small></div>
    <div className={'af-sheet-body af-sheet-body-'+id} style={{borderColor:currentPalette.lines}}>
      {artwork(id)}
      {meta[id]&&<LegendOverlay palette={{...currentPalette,bg:colors.legendBg,lines:colors.legendBorder}} position={meta[id]} printable items={legendItems}/>}
    </div>
    <div className="af-sheet-footer"><span>ARQUI-FÁCIL / PROGRAMA ARQUITECTÓNICO</span><span>{spaces.length} RECINTOS · {spaces.reduce((a,s)=>a+Number(s.area||0),0).toLocaleString('es-PE')} m²</span><span>{pageFormat.w+' × '+pageFormat.h+' mm'}</span></div>
  </div>;
  const exportBatch=async(format)=>{
    if(!active.length){setExportError('Selecciona al menos una lámina.');return;}
    if(!(pageFormat.w>0&&pageFormat.h>0)){setExportError('El formato de papel debe ser positivo.');return;}
    setIsExporting(true);setExportError('');
    await document.fonts.ready;
    try {
      const [{default:html2canvas},pdfModule]=await Promise.all([import('html2canvas'),format==='pdf'?import('jspdf'):Promise.resolve(null)]);
      const jsPDF=pdfModule?.jsPDF||pdfModule?.default;
      const pdf=format==='pdf'?new jsPDF({orientation:pageFormat.w>=pageFormat.h?'landscape':'portrait',unit:'mm',format:[pageFormat.w,pageFormat.h],compress:true}):null;
      for(let i=0;i<active.length;i++){
        const id=active[i].id,element=document.getElementById('af-sheet-preview-'+id);
        if(!element)throw new Error('No se encontró la previsualización de '+id);
        // Ajustar la resolución real al tamaño físico del papel, no al tamaño de la miniatura.
        const previewWidth=Math.max(1,element.getBoundingClientRect().width);
        const pixelWidth=pageFormat.w/25.4*printDpi;
        const scale=Math.min(12,Math.max(1,pixelWidth/previewWidth));
        const canvas=await html2canvas(element,{scale,useCORS:true,backgroundColor:currentPalette.bg,logging:false});
        if(pdf){
          if(i>0)pdf.addPage([pageFormat.w,pageFormat.h],pageFormat.w>=pageFormat.h?'landscape':'portrait');
          pdf.addImage(canvas.toDataURL('image/jpeg',.98),'JPEG',0,0,pageFormat.w,pageFormat.h);
        }else{
          const a=document.createElement('a');
          a.download='ArquiFacil_'+id+'.'+format;
          a.href=canvas.toDataURL(format==='jpg'?'image/jpeg':'image/png',.97);
          document.body.appendChild(a);a.click();a.remove();
        }
      }
      if(pdf)pdf.save('ArquiFacil_Laminas.pdf');
    }catch(error){console.error('Error al exportar láminas',error);setExportError('No se pudo exportar: '+(error.message||'error desconocido'));}
    finally{setIsExporting(false);}
  };
  return <div className="af-print-studio">
    <div className="af-print-header">
      <div><h2><Palette size={20}/> Estudio de <b>láminas</b></h2><p>Las láminas usan los datos, colores, relaciones y geometría configurados en cada módulo.</p></div>
      <div className="af-print-actions">
        <label>CALIDAD <select aria-label="Resolución de impresión" value={printDpi} onChange={e=>setPrintDpi(Number(e.target.value))}><option value={150}>150 ppp · Borrador</option><option value={200}>200 ppp · Estándar</option><option value={300}>300 ppp · Alta</option></select></label>
        <label>FORMATO <select aria-label="Formato de papel" value={pageFormat.w+'x'+pageFormat.h} onChange={e=>{const [w,h]=e.target.value.split('x').map(Number);setPageFormat({w,h});}}><option value="420x297">A3 horizontal</option><option value="297x420">A3 vertical</option><option value="297x210">A4 horizontal</option><option value="210x297">A4 vertical</option><option value="594x420">A2 horizontal</option></select></label>
        <button className="af-print-image" title="Extraer paleta desde una imagen" onClick={()=>inputRef.current?.click()}><ImagePlus size={16}/> Imagen</button><input type="file" accept="image/*" ref={inputRef} style={{display:'none'}} onChange={handleImageUpload}/>
        <button className="af-export-pdf" disabled={isExporting} onClick={()=>exportBatch('pdf')}><Printer size={15}/>{isExporting?'Exportando…':'Exportar PDF'}</button>
        <button disabled={isExporting} onClick={()=>exportBatch('png')}>PNG</button>
        <button disabled={isExporting} onClick={()=>exportBatch('jpg')}>JPG</button>
      </div>
    </div>
    <div className="af-print-style">{graphicControls}<span>Los cambios de paleta se aplican a las láminas y los diagramas.</span></div>
    <div className="af-print-scroll">
      <div className="af-print-select"><strong>Seleccionar láminas</strong><span>{active.length} páginas seleccionadas</span><div className="af-print-options">{validViews.map(v=><label key={v.id} className={selectedViews[v.id]?'selected':''}><input type="checkbox" checked={!!selectedViews[v.id]} onChange={e=>setSelectedViews(p=>({...p,[v.id]:e.target.checked}))}/><v.icon size={16}/>{v.title}</label>)}</div></div>
      {exportError&&<p role="alert" className="af-export-error">{exportError}</p>}
      <div className="af-print-pages">{active.length?active.map((v,i)=><div className="af-preview-item" key={v.id}><span>{'PÁG. '+(i+1)+' — '+v.title.toUpperCase()}</span>{sheet(v.id,i)}</div>):<p>Selecciona las vistas que deseas imprimir.</p>}</div>
    </div>
  </div>;
}
