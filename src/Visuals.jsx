import React, { useRef, useState } from 'react';

/** Un único lenguaje gráfico para el editor y las láminas de exportación. */
export const relationKey = (a, b) => [a, b].sort().join('-');
export const withAlpha = (color, alpha) => {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color + Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  if (/^#[0-9a-f]{3}$/i.test(color)) return '#' + [...color.slice(1)].map(c => c + c).join('') + Math.round(alpha * 255).toString(16).padStart(2, '0');
  return color;
};
const relationshipItems = (colors) => [
  { code: '3', text: 'Directa / Necesaria', color: colors.direct },
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

export function MatrixDiamond({ spaces, getRelation, onCycleRelation, getSpaceColor, palette, colors, variant = 'diamond' }) {
  if (!spaces.length) return null;
  const h = 39, top = 52, left = 330, width = Math.max(785, left + h * spaces.length / 2 + 255), height = top + spaces.length * h + 34;
  const relColor = (value) => value === 3 ? colors.direct : value === 1 ? colors.indirect : colors.muted;
  const clickPair = (a, b) => { console.info('DEBUG clickPair',a,b,Boolean(onCycleRelation)); return onCycleRelation && onCycleRelation(a, b); };
  const makeCell = (a, b, x, y, diamond = false) => {
    const value = getRelation(a.id, b.id);
    const tone = relColor(value);
    const label = 'Relación entre ' + a.name + ' y ' + b.name + ': ' + value + '. Clic para cambiar.';
    return <g key={relationKey(a.id, b)} role={onCycleRelation ? 'button' : undefined} tabIndex={onCycleRelation ? 0 : undefined} aria-label={onCycleRelation ? label : undefined}
      onClick={() => clickPair(a.id, b)} onKeyDown={event => { if (onCycleRelation && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); clickPair(a.id, b); } }}
      className={onCycleRelation ? 'af-matrix-cell-interactive' : ''}>
      {diamond
        ? <polygon points={x + ',' + (y-h/2) + ' ' + (x+h/2) + ',' + y + ' ' + x + ',' + (y+h/2) + ' ' + (x-h/2) + ',' + y} fill={value === 0 ? withAlpha(palette.bg, 0.90) : withAlpha(tone, value === 3 ? .22 : .10)} stroke={value === 0 ? palette.lines : tone} strokeWidth={value === 3 ? 1.75 : .8} />
        : <rect x={x-h/2+1} y={y-h/2+1} width={h-2} height={h-2} rx="3" fill={value === 0 ? withAlpha(palette.bg,.85) : withAlpha(tone,.17)} stroke={value ? tone : palette.lines} />}
      {value !== 0 && <circle cx={x} cy={y} r="10" fill={tone} fillOpacity=".22" stroke={tone} strokeDasharray={value === 1 ? '3 3' : undefined} strokeWidth="1.5"/>}
      {value !== 0 && <text x={x} y={y+3.5} fontSize="10" fontWeight="700" textAnchor="middle" fill={tone}>{value}</text>}
    </g>;
  };
  if (variant === 'square') return <svg className="af-matrix-svg" role="group" aria-label="Matriz de relaciones cuadrada" viewBox={'0 0 ' + (left + spaces.length*h+30) + ' ' + height} style={{ minWidth: Math.max(680, left+spaces.length*h+30) }}>
    <text x="16" y="28" fill={palette.text} fontSize="12" fontWeight="700">Nº / RECINTO ARQUITECTÓNICO</text>
    {spaces.map((space, i) => <g key={space.id}>
      <text x="16" y={top+i*h+25} fill={getSpaceColor(space)} fontSize="11">{(i+1)+'. '+space.name}</text>
      <text x="288" y={top+i*h+25} fill={palette.text} textAnchor="end" fontSize="10">{space.area+' m²'}</text>
      <line x1="12" y1={top+(i+1)*h} x2={left-7} y2={top+(i+1)*h} stroke={palette.lines}/>
      <text x={left+i*h+h/2} y="40" fill={getSpaceColor(space)} fontSize="10" textAnchor="middle">{i+1}</text>
    </g>)}
    {spaces.map((row,i) => spaces.map((col,j) => i===j ? <rect key={row.id+'-self'} x={left+j*h} y={top+i*h} width={h-1} height={h-1} fill={withAlpha(palette.lines,.32)}/> : makeCell(row,col,left+j*h+h/2,top+i*h+h/2)))}
  </svg>;
  return (
    <svg className="af-matrix-svg" role="group" aria-label="Matriz triangular romboidal de relaciones" viewBox={'0 0 '+width+' '+height} style={{ minWidth: 760 }}>
      <text x="15" y="29" fill={palette.text} opacity=".8" fontWeight="700" fontSize="11">Nº / RECINTO ARQUITECTÓNICO</text>
      <text x="277" y="29" fill={palette.text} fontWeight="700" fontSize="11">ÁREA</text>
      <text x="321" y="29" fill={colors.direct} fontWeight="700" fontSize="11">Σ</text>
      {spaces.map((space,i)=>{
        const count = spaces.reduce((n,s) => n + (s.id === space.id ? 0 : getRelation(space.id,s.id) > 0 ? 1 : 0),0);
        return <g key={space.id}>
          <rect x="13" y={top+i*h} width="4" height={h-1} fill={getSpaceColor(space)}/>
          <line x1="13" y1={top+(i+1)*h} x2={left} y2={top+(i+1)*h} stroke={palette.lines} strokeWidth=".8"/>
          <text x="26" y={top+i*h+h*.62} fill={getSpaceColor(space)} fontSize="11" fontWeight="650">{(i+1)+'. '+space.name.slice(0,29)}</text>
          <text x="289" y={top+i*h+h*.62} fill={palette.text} opacity=".80" textAnchor="end" fontSize="10">{space.area+'m²'}</text>
          <text x="326" y={top+i*h+h*.62} fill={colors.direct} textAnchor="middle" fontSize="11" fontWeight="700">{count}</text>
        </g>;
      })}
      <line x1={left} y1={top} x2={left} y2={top+spaces.length*h} stroke={palette.lines}/>
      {spaces.map((a,i)=> spaces.slice(i+1).map((b,offset)=>{
        const j=i+offset+1;
        return makeCell(a,b,left+h*(j-i)/2,top+h*(i+j+1)/2,true);
      }))}
    </svg>
  );
}

export function TopologyArtwork({ nodes, matrix, getSpaceColor, palette, colors, showGooey = true, gooeyStrength = 1.8, showAreaText = true, topologyTextPos = 'edge', topologyTextSize = 11, viewBox, onNodePointerDown, onNodeDoubleClick, idPrefix = 'live' }) {
  const pairs = nodes.flatMap((a,i)=>nodes.slice(i+1).map(b=>({a,b,weight:matrix[relationKey(a.id,b.id)]||0}))).filter(pair=>pair.weight>0);
  const dark = /^#(?:0[0-9a-f]|1[0-9a-f]|2[0-9a-f]|3[0-9a-f])/i.test(palette.bg);
  const filterId='af-goo-'+idPrefix;
  const glowId='af-glow-'+idPrefix;
  return <svg viewBox={viewBox} width={viewBox ? undefined : 4000} height={viewBox ? undefined : 4000} className={viewBox ? 'af-artwork-svg' : 'absolute inset-0 overflow-visible'} fontFamily="DM Sans, sans-serif">
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
            {showAreaText && <text x={node.x} y={node.y+topologyTextSize} fontSize="10" textAnchor="middle" fill={colors.area}>{node.area} m²</text>}
          </> : <>
            <circle cx={node.x} cy={node.y} r="3" fill={colors.core}/>
            {showAreaText && <text x={node.x} y={node.y+14} fontSize="10" textAnchor="middle" fill={colors.area}>{node.area} m²</text>}
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
export function FlowArtwork({ spaces, matrix, getSpaceColor, palette, colors, showAreaText, showFlows, viewBox, onNodePointerDown, onResizePointerDown, hoveredId, idPrefix='live' }) {
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
        <text x={node.w/2} y={node.h/2-(showAreaText?5:0)} textAnchor="middle" dominantBaseline="central" fill={colors.label} fontSize="11" fontWeight="700">{node.name.slice(0,24)}</text>
        {showAreaText && <text x={node.w/2} y={node.h/2+13} textAnchor="middle" dominantBaseline="central" fill={colors.area} fontSize="10">{node.area} m²</text>}
      </g>
      {onResizePointerDown && <path d={'M '+(node.w-12)+' '+(node.h-2)+' L '+(node.w-2)+' '+(node.h-12)} stroke={colors.label} strokeWidth="2" className="cursor-nwse-resize" onPointerDown={e=>onResizePointerDown(e,node.id)}/>}
    </g>)}
  </svg>;
}

export function GraphicStyleControls({ selectedPaletteId, setSelectedPaletteId, palettes, customPalette, colorMode, setColorMode, shuffle, colors, overrides, setOverrides }) {
  const [open,setOpen]=useState(false);
  const fields=[
    ['bg','Fondo'],['text','Texto general'],['lines','Retícula'],['direct','Línea directa'],['indirect','Línea indirecta'],['label','Texto recintos'],['area','Texto áreas'],['core','Núcleo burbujas'],['blend','Fusión intermedia'],['legendBg','Fondo leyenda'],['legendBorder','Borde leyenda']
  ];
  return <div className="af-style-toolbar">
    <select aria-label="Paleta de colores" value={selectedPaletteId} onChange={e=>setSelectedPaletteId(e.target.value)}>{palettes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}{customPalette&&<option value="custom_image">{customPalette.name}</option>}</select>
    <select aria-label="Distribución de colores" value={colorMode} onChange={e=>setColorMode(e.target.value)}><option value="macro">Por zona</option><option value="subzone">Por subzona</option><option value="auto">Automática</option></select>
    <button type="button" onClick={shuffle} title="Redistribuir los colores de los recintos">↻ Colores</button>
    <button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Cerrar ajustes':'Avanzado'}</button>
    {open && <div className="af-style-panel"><div className="af-style-panel-heading"><strong>ESTILOS AVANZADOS</strong><button onClick={()=>setOverrides({})}>Restablecer</button></div><p>Los cambios se sincronizan en diagramas, matriz y láminas.</p><div className="af-style-grid">
      {fields.map(([field,label])=><label key={field}><span>{label}</span><input type="color" aria-label={label} value={overrides[field]||colors[field]||'#888888'} onChange={e=>setOverrides(prev=>({...prev,[field]:e.target.value}))}/></label>)}
    </div></div>}
  </div>;
}
