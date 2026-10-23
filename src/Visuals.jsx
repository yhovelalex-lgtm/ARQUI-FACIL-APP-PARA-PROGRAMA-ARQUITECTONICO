import React, { useRef, useState } from 'react';

/** Un único lenguaje gráfico para el editor y las láminas de exportación. */
export const relationKey = (a, b) => [a, b].sort().join('-');
// El modelo mantiene 3/1 para compatibilidad; la convención gráfica es 2/1.
export const relationshipScore = (value) => value === 3 || value === 2 ? 2 : value === 1 ? 1 : 0;
export const withAlpha = (color, alpha) => {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color + Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  if (/^#[0-9a-f]{3}$/i.test(color)) return '#' + [...color.slice(1)].map(c => c + c).join('') + Math.round(alpha * 255).toString(16).padStart(2, '0');
  return color;
};
const relationshipItems = (colors) => [
  { code: '2', text: 'Directa / Necesaria', color: colors.direct },
  { code: '1', text: 'Indirecta / Deseable', color: colors.indirect },
  { code: '–', text: 'Nula / Sin relación', color: colors.muted }
];

export function LegendOverlay({ title = 'SIMBOLOGÍA DE VÍNCULO', items, position, onPositionChange, printable = false, palette }) {
  const drag = useRef(null);
  const handleDown = (event) => {
    if (printable || !onPositionChange || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const panel = event.currentTarget.parentElement;
    const rect = panel.parentElement.getBoundingClientRect();
    drag.current = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, position };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleMove = (event) => {
    if (!drag.current) return;
    const { x, y, width, height, position: start } = drag.current;
    onPositionChange({ x: Math.min(86, Math.max(0, start.x + 100 * (event.clientX - x) / Math.max(1, width))), y: Math.min(88, Math.max(0, start.y + 100 * (event.clientY - y) / Math.max(1, height))) });
  };
  return (
    <aside className={'af-legend' + (printable ? ' af-legend-print' : '')} style={{ left: position.x + '%', top: position.y + '%', background: withAlpha(palette.bg, 0.96), color: palette.text, borderColor: palette.lines }}>
      <div className="af-legend-handle" style={{ borderColor: palette.lines, cursor: printable ? 'default' : 'move' }} onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <strong>{title}</strong>{!printable && <span aria-label="Arrastrar leyenda" title="Arrastra este encabezado para mover la leyenda">⠿</span>}
      </div>
      {items.map((item, index) => <div className="af-legend-item" key={index}>
        <span className="af-legend-symbol" style={{ color: item.color, borderColor: item.color, borderStyle: item.code === '1' ? 'dashed' : 'solid' }}>{item.code}</span>
        <span>{item.text}</span>
      </div>)}
    </aside>
  );
}

export function MatrixDiamond({ spaces, getRelation, onCycleRelation, getSpaceColor, palette, colors, variant = 'diamond', labelTextSize = 11, areaTextSize = 10 }) {
  if (!spaces.length) return null;
  const h=39, top=52, left=330;
  const width=Math.max(785,left+h*spaces.length/2+255);
  const height=top+spaces.length*h+34;
  const cell=(a,b,x,y,diamond=false)=>{
    const raw=getRelation(a.id,b.id);
    const value=relationshipScore(raw);
    const neutral=palette.bg.toLowerCase()==='#fbfbf8';
    const tone=neutral?(value===2?'#3d4541':'#aebbb1'):(value===2?colors.direct:colors.indirect);
    const label='Relación entre '+a.name+' y '+b.name+': '+value+'. Clic para cambiar.';
    const activate=()=>{if(onCycleRelation)onCycleRelation(a.id,b.id);};
    return <g key={relationKey(a.id,b.id)}
      className={'af-matrix-cell'+(onCycleRelation?' af-matrix-cell-interactive':'')}
      role={onCycleRelation?'button':undefined}
      tabIndex={onCycleRelation?0:undefined}
      aria-label={onCycleRelation?label:undefined}
      onClick={activate}
      onKeyDown={event=>{if(onCycleRelation&&(event.key==='Enter'||event.key===' ')){event.preventDefault();activate();}}}>
      <title>{a.name+' / '+b.name+': '+(value===2?'Directa (2)':value===1?'Indirecta (1)':'Nula (0)')}</title>
      {diamond
        ? <polygon
          points={x+','+(y-h/2)+' '+(x+h/2)+','+y+' '+x+','+(y+h/2)+' '+(x-h/2)+','+y}
          fill={palette.bg} stroke={palette.lines} strokeWidth=".86"/>
        : <rect x={x-h/2+1} y={y-h/2+1} width={h-2} height={h-2} rx="2" fill={palette.bg} stroke={palette.lines} strokeWidth=".9"/>
      }
      {value!==0&&<circle className={'af-matrix-relation-dot af-matrix-relation-'+value}
        cx={x} cy={y} r="10.5" fill={value===2?tone:neutral?'#b9c4bc':withAlpha(tone,.50)}/>}
      {!diamond&&value!==0&&<text x={x} y={y+3.5} fontSize="10" textAnchor="middle" fontWeight="700" fill={value===2?'#fff':palette.text}>{value}</text>}
    </g>;
  };
  if(variant==='square')return <svg className="af-matrix-svg" role="group" aria-label="Matriz de relaciones cuadrada"
    viewBox={'0 0 '+(left+spaces.length*h+30)+' '+height} style={{minWidth:Math.max(680,left+spaces.length*h+30)}}>
    <text x="16" y="28" fill={palette.text} fontSize="12" fontWeight="700">Nº / RECINTO ARQUITECTÓNICO</text>
    {spaces.map((space,i)=><g key={space.id}>
      <text x="16" y={top+i*h+25} fill={getSpaceColor(space)} fontSize={labelTextSize}>{(i+1)+'. '+space.name}</text>
      <text x="288" y={top+i*h+25} fill={palette.text} textAnchor="end" fontSize={areaTextSize}>{space.area+' m²'}</text>
      <line x1="12" y1={top+(i+1)*h} x2={left-7} y2={top+(i+1)*h} stroke={palette.lines}/>
      <text x={left+i*h+h/2} y="40" fill={getSpaceColor(space)} fontSize="10" textAnchor="middle">{i+1}</text>
    </g>)}
    {spaces.map((row,i)=>spaces.map((col,j)=>i===j
      ?<rect key={row.id+'-self'} x={left+j*h} y={top+i*h} width={h-1} height={h-1} fill={withAlpha(palette.lines,.32)}/>
      :cell(row,col,left+j*h+h/2,top+i*h+h/2)))}
  </svg>;
  // Solo cambia la estética: relaciones, edición, suma, paleta y exportación comparten el mismo modelo.
  const rowData=spaces.map((space,i)=>{
    const y0=top+i*h,y1=y0+h,cy=y0+h/2;
    const sum=spaces.reduce((n,other)=>n+(other.id===space.id?0:relationshipScore(getRelation(space.id,other.id))),0);
    return {space,i,y0,y1,cy,sum,shoulderX:left-h/2};
  });
  return <svg className="af-matrix-svg af-matrix-triangular" role="group"
    aria-label="Matriz triangular romboidal de relaciones"
    viewBox={'0 0 '+width+' '+height} style={{minWidth:760}}>
    <rect className="af-matrix-header-panel" x="13" y="9" width={left-h/2-2} height="32" rx="8"
      fill={withAlpha(palette.text,.032)} stroke={palette.lines} strokeWidth=".7"/>
    <text x="25" y="30" fill={palette.text} fontWeight="700" fontSize="10.6">Nº / RECINTO ARQUITECTÓNICO</text>
    <text x={left-77} y="30" fill={palette.text} textAnchor="middle" fontWeight="700" fontSize="10.5">ÁREA</text>
    <text x={left-h/2} y="30" fill={palette.text} textAnchor="middle" fontWeight="700" fontSize="10.5">Σ</text>
    {rowData.map(({space,i,y0,y1,cy,shoulderX})=><g key={space.id} className="af-matrix-row" data-space-id={space.id}>
      <polygon className="af-matrix-row-pentagon"
        points={'13,'+(y0+.5)+' '+shoulderX+','+(y0+.5)+' '+left+','+cy+' '+shoulderX+','+(y1-.5)+' 13,'+(y1-.5)}
        fill={withAlpha(palette.text,.078)}
        stroke={palette.lines} strokeOpacity=".75" strokeWidth=".75" strokeLinejoin="round"/>
      <rect x="13" y={y0+1} width="4.3" height={h-2} fill={withAlpha(palette.text,.50)}/>
      <text className="af-matrix-row-name" x="24" y={y0+h*.62} fill={palette.text} fontSize={labelTextSize} fontWeight="600">
        {(i+1)+'. '+space.name.slice(0,Math.max(9,Math.min(34,Math.floor(34*11/labelTextSize))))}
      </text>
      <text className="af-matrix-row-area" x={left-49} y={y0+h*.62} fill={palette.text} textAnchor="end" fontSize={areaTextSize}>{space.area+' m²'}</text>
    </g>)}
    {spaces.map((a,i)=>spaces.slice(i+1).map((b,offset)=>{
      const j=i+offset+1;
      return cell(a,b,left+h*(j-i-1)/2,top+h*(i+j+1)/2,true);
    }))}
    <path className="af-matrix-outline"
      d={'M '+left+' '+(top+h/2)+' L '+(left+h*(spaces.length-1)/2)+' '+(top+spaces.length*h/2)+' L '+left+' '+(top+(spaces.length-.5)*h)}
      fill="none" stroke={palette.text} strokeOpacity=".78" strokeWidth="1.25"
      strokeLinejoin="round" pointerEvents="none"/>
    {rowData.map(({space,cy,sum,shoulderX})=><g key={space.id+'-sum'}
      className="af-matrix-sum" role="img" aria-label={space.name+': '+sum+' relaciones'}>
      <title>{'Sumatoria ponderada de '+space.name+': '+sum}</title>
      <circle cx={shoulderX} cy={cy} r="11" fill={palette.bg}
        stroke={palette.text} strokeOpacity=".75" strokeWidth="1.25"/>
      <text x={shoulderX} y={cy+3.7} textAnchor="middle" fontSize="10.5"
        fontWeight="650" fill={palette.text}>{sum}</text>
    </g>)}
  </svg>;
}

export function TopologyArtwork({ nodes, matrix, getSpaceColor, palette, colors, showGooey = true, gooeyStrength = 1.8, showAreaText = true, topologyTextPos = 'edge', topologyTextSize = 11, areaTextSize = 10, viewBox, onNodePointerDown, onNodeDoubleClick, idPrefix = 'live' }) {
  const pairs = nodes.flatMap((a,i)=>nodes.slice(i+1).map(b=>({a,b,weight:matrix[relationKey(a.id,b.id)]||0}))).filter(pair=>pair.weight>0);
  const dark = /^#(?:0[0-9a-f]|1[0-9a-f]|2[0-9a-f]|3[0-9a-f])/i.test(palette.bg);
  const filterId='af-goo-'+idPrefix;
  const glowId='af-glow-'+idPrefix;
  return <svg viewBox={viewBox} width={viewBox ? undefined : 4000} height={viewBox ? undefined : 4000} className={viewBox ? 'af-artwork-svg' : 'absolute inset-0 overflow-visible'} fontFamily="var(--af-graphic-font, Roboto, Arial, sans-serif)">
    <defs>
      <filter id={filterId} x="-45%" y="-45%" width="190%" height="190%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur"/>
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo"/>
        <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
      </filter>
      <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="21"/></filter>
      {pairs.map(({a,b}) => <linearGradient key={relationKey(a.id,b.id)} id={'af-grad-'+idPrefix+'-'+relationKey(a.id,b.id)} gradientUnits="userSpaceOnUse" x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
        <stop offset="0%" stopColor={getSpaceColor(a)}/><stop offset="48%" stopColor={colors.blend}/><stop offset="100%" stopColor={getSpaceColor(b)}/>
      </linearGradient>)}
      {nodes.map(n=><radialGradient key={n.id} id={'af-core-'+idPrefix+'-'+n.id}>
        <stop offset="0%" stopColor={colors.core} stopOpacity=".40"/><stop offset="65%" stopColor={getSpaceColor(n)} stopOpacity=".25"/><stop offset="100%" stopColor={getSpaceColor(n)} stopOpacity=".04"/>
      </radialGradient>)}
    </defs>
    {showGooey && <g style={{ mixBlendMode: dark ? 'screen' : 'multiply' }}>
      <g opacity=".18" filter={'url(#'+glowId+')'}>
        {pairs.map(({a,b})=><line key={relationKey(a.id,b.id)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={'url(#af-grad-'+idPrefix+'-'+relationKey(a.id,b.id)+')'} strokeWidth={Math.min(a.radius,b.radius)*gooeyStrength} strokeLinecap="round"/>)}
      </g>
      <g opacity=".70" filter={'url(#'+filterId+')'}>
        {pairs.map(({a,b})=>{
          const dist=Math.hypot(a.x-b.x,a.y-b.y);
          const reach=(a.radius+b.radius+150)*1.5;
          const fade=Math.max(0,Math.min(1,(reach-dist)/(reach*.25)));
          if (!fade) return null;
          return <line key={relationKey(a.id,b.id)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={'url(#af-grad-'+idPrefix+'-'+relationKey(a.id,b.id)+')'} strokeWidth={Math.min(a.radius,b.radius)*gooeyStrength*fade} strokeLinecap="round"/>;
        })}
        {nodes.map(n=><circle key={n.id} cx={n.x} cy={n.y} r={n.radius*gooeyStrength} fill={getSpaceColor(n)}/>)}
      </g>
    </g>}
    {pairs.map(({a,b,weight})=><line key={'link-'+relationKey(a.id,b.id)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={weight===3?colors.direct:colors.indirect} strokeWidth={weight===3?1.6:1} strokeDasharray={weight===1?'4,5':undefined} opacity=".48"/>)}
    {nodes.map(node => {
      const tone=getSpaceColor(node), radius=node.radius+6, pathId='af-label-'+idPrefix+'-'+node.id;
      return <g key={node.id}>
        <g className={onNodePointerDown?'cursor-grab':''} onPointerDown={onNodePointerDown?event=>onNodePointerDown(node.id,event):undefined} onDoubleClick={onNodeDoubleClick?event=>onNodeDoubleClick(node.id,event):undefined}>
          {node.pinned && <circle cx={node.x} cy={node.y} r={node.radius+12} fill="none" stroke={tone} strokeWidth="1.5" strokeDasharray="3,3" opacity=".6"/>}
          <circle cx={node.x} cy={node.y} r={node.radius} fill={palette.bg} fillOpacity=".85" stroke={tone} strokeWidth="2"/>
          <circle cx={node.x} cy={node.y} r={node.radius} fill={'url(#af-core-'+idPrefix+'-'+node.id+')'}/>
          {topologyTextPos==='center' ? <>
            <text x={node.x} y={node.y-(showAreaText?topologyTextSize/2:0)} fontSize={topologyTextSize} fill={colors.label} textAnchor="middle" dominantBaseline="central" fontWeight="700">{node.name.slice(0,20)}</text>
            {showAreaText && <text x={node.x} y={node.y+topologyTextSize} fontSize={areaTextSize} textAnchor="middle" fill={colors.area}>{node.area} m²</text>}
          </> : <>
            <circle cx={node.x} cy={node.y} r="3" fill={colors.core}/>
            {showAreaText && <text x={node.x} y={node.y+Math.max(14,areaTextSize+4)} fontSize={areaTextSize} textAnchor="middle" fill={colors.area}>{node.area} m²</text>}
          </>}
        </g>
        {topologyTextPos==='edge' && <g pointerEvents="none"><defs><path id={pathId} d={'M '+(node.x-radius)+' '+node.y+' A '+radius+' '+radius+' 0 1 1 '+(node.x+radius)+' '+node.y}/></defs>
          <text fill={colors.label} fontSize={topologyTextSize} fontWeight="700" letterSpacing="1"><textPath href={'#'+pathId} startOffset="50%" textAnchor="middle">{node.name.slice(0,22)}</textPath></text>
        </g>}
      </g>;
    })}
  </svg>;
}

export const orthogonalPath=(a,b)=>{
  const x=a.x+a.w/2,y=a.y+a.h/2,u=b.x+b.w/2,v=b.y+b.h/2;
  return Math.abs(x-u)>Math.abs(y-v)?'M '+x+' '+y+' H '+(x+u)/2+' V '+v+' H '+u:'M '+x+' '+y+' V '+(y+v)/2+' H '+u+' V '+v;
};
export const curvedPath=(a,b)=>{
  const x=a.x+a.w/2,y=a.y+a.h/2,u=b.x+b.w/2,v=b.y+b.h/2;
  return 'M '+x+' '+y+' C '+(x+u)/2+' '+y+', '+(x+u)/2+' '+v+', '+u+' '+v;
};
export function FlowArtwork({ spaces, matrix, getSpaceColor, palette, colors, showAreaText, showFlows, labelTextSize = 11, areaTextSize = 10, viewBox, onNodePointerDown, onResizePointerDown, hoveredId, idPrefix='live' }) {
  const pairs=spaces.flatMap((a,i)=>spaces.slice(i+1).map(b=>({a,b,weight:matrix[relationKey(a.id,b.id)]||0}))).filter(p=>p.weight>0);
  return <svg viewBox={viewBox} width={viewBox ? undefined : 4000} height={viewBox ? undefined : 4000} className={viewBox?'af-artwork-svg':'absolute inset-0 overflow-visible'} fontFamily="DM Sans, sans-serif">
    <defs><marker id={'af-arrow-'+idPrefix} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill={colors.direct}/></marker></defs>
    {pairs.filter(p=>!(showFlows&&(p.a.zone==='circulation'||p.b.zone==='circulation'))).map(({a,b,weight})=><path key={relationKey(a.id,b.id)} d={orthogonalPath(a,b)} fill="none" stroke={weight===3?colors.direct:colors.indirect} strokeWidth={weight===3?2.5:1.5} strokeDasharray={weight===3?undefined:'4,4'} opacity={weight===3?.78:.54}/>)}
    {showFlows && pairs.filter(p=>p.a.zone==='circulation'||p.b.zone==='circulation').map(({a,b})=><path key={'path-'+relationKey(a.id,b.id)} d={curvedPath(a,b)} fill="none" stroke={colors.direct} strokeWidth="4" strokeDasharray="9,7" opacity=".72" markerEnd={'url(#af-arrow-'+idPrefix+')'}/>)}
    {spaces.map(node=><g key={node.id} transform={'translate('+node.x+','+node.y+')'}>
      {hoveredId===node.id && <rect width={node.w} height={node.h} rx="10" fill="none" stroke={getSpaceColor(node)} strokeWidth="6" opacity=".25"/>}
      <g className={onNodePointerDown?'cursor-grab':''} onPointerDown={onNodePointerDown?e=>onNodePointerDown(e,node.id):undefined}>
        <rect width={node.w} height={node.h} rx="10" fill={palette.bg} stroke={getSpaceColor(node)} strokeWidth="2"/>
        <rect width={node.w} height={node.h} rx="10" fill={getSpaceColor(node)} fillOpacity=".13"/>
        <text x={node.w/2} y={node.h/2-(showAreaText?areaTextSize/2:0)} textAnchor="middle" dominantBaseline="central" fill={colors.label} fontSize={labelTextSize} fontWeight="700">{node.name.slice(0,24)}</text>
        {showAreaText && <text x={node.w/2} y={node.h/2+Math.max(13,areaTextSize+3)} textAnchor="middle" dominantBaseline="central" fill={colors.area} fontSize={areaTextSize}>{node.area} m²</text>}
      </g>
      {onResizePointerDown && <path d={'M '+(node.w-12)+' '+(node.h-2)+' L '+(node.w-2)+' '+(node.h-12)} stroke={colors.label} strokeWidth="2" className="cursor-nwse-resize" onPointerDown={e=>onResizePointerDown(e,node.id)}/>}
    </g>)}
  </svg>;
}

function NumericSize({ name, value, onChange, min = 6, max = 32 }) {
  const update = (raw) => {
    const next = Number(raw);
    if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, Math.round(next))));
  };
  return <label className="af-size-setting"><span>{name}</span>
    <div className="af-size-inputs">
      <input type="range" aria-label={'Deslizador '+name} min={min} max={max} value={value} onChange={e=>update(e.target.value)}/>
      <input type="number" aria-label={'Tamaño '+name} min={min} max={max} value={value} onChange={e=>update(e.target.value)}/>
      <small>px</small>
    </div>
  </label>;
}

export function GraphicStyleControls({ selectedPaletteId, setSelectedPaletteId, palettes, customPalette, colorMode, setColorMode, shuffle, colors, overrides, setOverrides, typography, setTypography, paletteColors, imageColors, onImageUpload }) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState('typography');
  const [target, setTarget] = useState('label');
  const uploadRef = useRef(null);
  const colorGroups = [
    { title:'Lienzo y líneas', fields:[['bg','Fondo'],['text','Texto general'],['lines','Retícula'],['direct','Relación directa'],['indirect','Relación indirecta']] },
    { title:'Textos y burbujas', fields:[['label','Texto de recintos'],['area','Texto de áreas'],['core','Centro de burbuja'],['blend','Fusión entre burbujas']] },
    { title:'Leyenda', fields:[['legendBg','Fondo de leyenda'],['legendBorder','Borde de leyenda']] }
  ];
  const available = [...new Set((paletteColors||[]).filter(c=>/^#[0-9a-f]{6}$/i.test(c)).map(c=>c.toLowerCase()))];
  const updateTypography=(key,value)=>setTypography(prev=>({...prev,[key]:value}));
  const selectColor=(color)=>setOverrides(prev=>({...prev,[target]:color}));
  const changePalette=(id)=>{
    setSelectedPaletteId(id);
    setOverrides({});
  };
  return <div className="af-style-toolbar">
    <select aria-label="Paleta de colores" value={selectedPaletteId} onChange={e=>changePalette(e.target.value)}>
      {palettes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      {customPalette&&<option value="custom_image">{customPalette.name}</option>}
    </select>
    <select aria-label="Distribución de colores" value={colorMode} onChange={e=>setColorMode(e.target.value)}>
      <option value="macro">Por zona</option><option value="subzone">Por subzona</option><option value="auto">Automática</option>
    </select>
    <button type="button" onClick={shuffle} title="Redistribuir colores de recintos">↻ Colores</button>
    <button type="button" className="af-editor-open" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Cerrar editor':'Avanzado'}</button>
    {open&&<div className="af-style-panel">
      <header className="af-style-panel-heading">
        <div><strong>ESTUDIO GRÁFICO</strong><span>Edición vinculada a diagramas y láminas</span></div>
        <button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar editor gráfico">✕</button>
      </header>
      <nav className="af-style-tabs" aria-label="Apartados de diseño">
        <button type="button" className={section==='typography'?'active':''} onClick={()=>setSection('typography')}>Tipografía</button>
        <button type="button" className={section==='colors'?'active':''} onClick={()=>setSection('colors')}>Colores</button>
        <button type="button" className={section==='image'?'active':''} onClick={()=>setSection('image')}>Paleta de imagen</button>
      </nav>
      {section==='typography'&&<section className="af-editor-section">
        <h3>Tipografía</h3><p>Modifica los textos de todos los diagramas y su versión de impresión.</p>
        <label className="af-font-select"><span>Tipo de letra</span><select aria-label="Tipo de letra" value={typography.fontFamily} onChange={e=>updateTypography('fontFamily',e.target.value)}>
          {['Roboto','DM Sans','Montserrat','Arial','Georgia','IBM Plex Mono'].map(font=><option key={font} value={font}>{font}</option>)}
        </select></label>
        <NumericSize name="texto recintos" value={typography.labelSize} onChange={v=>updateTypography('labelSize',v)}/>
        <NumericSize name="texto áreas" value={typography.areaSize} onChange={v=>updateTypography('areaSize',v)}/>
        <div className="af-typography-preview" style={{fontFamily:typography.fontFamily}}>
          <div style={{fontSize:typography.labelSize,fontWeight:700}}>Sala de exposiciones</div>
          <div style={{fontSize:typography.areaSize}}>250 m²</div>
        </div>
      </section>}
      {section==='colors'&&<section className="af-editor-section">
        <div className="af-editor-heading"><h3>Colores avanzados</h3><button type="button" onClick={()=>setOverrides({})}>Restablecer ajustes</button></div>
        <p>Elige qué elemento modificar; debajo encontrarás los colores disponibles de la paleta seleccionada.</p>
        {colorGroups.map(group=><div key={group.title} className="af-color-group">
          <h4>{group.title}</h4><div className="af-style-grid">
            {group.fields.map(([field,label])=><label key={field} className={field===target?'active':''} onClick={()=>setTarget(field)}><span>{label}</span><input type="color" aria-label={label} value={overrides[field]||colors[field]||'#888888'} onFocus={()=>setTarget(field)} onChange={e=>{setTarget(field);setOverrides(prev=>({...prev,[field]:e.target.value}));}}/></label>)}
          </div>
        </div>)}
        <div className="af-swatches-panel"><div><strong>Colores guardados de la paleta</strong><small>Aplicar a: {colorGroups.flatMap(g=>g.fields).find(([key])=>key===target)?.[1]}</small></div>
          <div className="af-swatches" role="group" aria-label="Colores guardados de la paleta">
            {available.map((color,i)=><button type="button" key={color} className="af-swatch" title={color} aria-label={'Aplicar color '+color+' a '+target} style={{backgroundColor:color}} onClick={()=>selectColor(color)}><span>{i+1}</span></button>)}
          </div>
          {available.length===0&&<p>No hay colores extraídos todavía. Selecciona una paleta o carga una imagen.</p>}
        </div>
      </section>}
      {section==='image'&&<section className="af-editor-section">
        <h3>Paleta desde imagen</h3><p>Extrae los colores presentes en una imagen. No se añaden colores aleatorios ni colores de otras paletas.</p>
        <input ref={uploadRef} type="file" accept="image/*" className="af-hidden-input" aria-label="Archivo de imagen para paleta" onChange={onImageUpload}/>
        <button type="button" className="af-upload-button" onClick={()=>uploadRef.current?.click()}>Cargar imagen y extraer colores</button>
        {imageColors.length>0?<><div className="af-saved-heading">Colores extraídos y guardados ({imageColors.length})</div>
          <div className="af-swatches" role="group" aria-label="Colores extraídos de la imagen">
            {imageColors.map((color,i)=><button type="button" key={i} title={color} aria-label={'Color extraído '+color} style={{backgroundColor:color}} className="af-swatch" onClick={()=>{setTarget('label');setSection('colors');setOverrides(prev=>({...prev,label:color}));}}><span>{i+1}</span></button>)}
          </div>
          <button type="button" className="af-use-image" onClick={()=>changePalette('custom_image')}>Usar los colores de esta imagen</button></>:<p>Selecciona una imagen para crear tu paleta.</p>}
        <p>También puedes asignar cada muestra a textos, líneas o fondos desde el apartado Colores.</p>
      </section>}
    </div>}
  </div>;
}
