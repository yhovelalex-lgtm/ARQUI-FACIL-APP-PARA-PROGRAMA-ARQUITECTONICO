import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Trash2, Grid, Network, ListPlus, Play, BrainCircuit, Sparkles, Loader2, Settings2, Square, LayoutTemplate, Printer, FileSpreadsheet, ZoomIn, Palette, ImagePlus, Shuffle, MoveRight } from 'lucide-react';

const ZONES = { social: { id: 'social', label: 'Pública / Principal' }, private: { id: 'private', label: 'Privada / Anexos' }, service: { id: 'service', label: 'Servicios' }, circulation: { id: 'circulation', label: 'Circulación' } };

const PRINT_PALETTES = [
  { id: 'dark_blueprint', name: 'Blueprint Oscuro', bg: '#030f14', text: '#e0f2f1', lines: '#14333b', zones: { social: '#00e5ff', private: '#b066ff', service: '#00ff9d', circulation: '#facc15' } },
  { id: 'light_blueprint', name: 'Blueprint Claro', bg: '#f8fafc', text: '#0f172a', lines: '#cbd5e1', zones: { social: '#0284c7', private: '#7c3aed', service: '#059669', circulation: '#d97706' } },
  { id: 'minimalist', name: 'Minimalista', bg: '#ffffff', text: '#1a1a1a', lines: '#e5e5e5', zones: { social: '#a1a1aa', private: '#52525b', service: '#3f3f46', circulation: '#d4d4d8' } },
  { id: 'bauhaus', name: 'Bauhaus', bg: '#fdfbf7', text: '#27272a', lines: '#d4d4d8', zones: { social: '#dc2626', private: '#2563eb', service: '#eab308', circulation: '#404040' } }
];

const generateId = () => Math.random().toString(36).substr(2, 9);

// ==========================================
// MÓDULO 1: MOTOR DE PLANTA EVOLUTIVO (BSP)
// ==========================================
const FloorPlanEngine = {
  shareWall: (a, b) => {
    const tol = 0.5;
    const touchLeft = Math.abs(a.x - (b.x + b.w)) <= tol, touchRight = Math.abs((a.x + a.w) - b.x) <= tol;
    const touchTop = Math.abs(a.y - (b.y + b.h)) <= tol, touchBottom = Math.abs((a.y + a.h) - b.y) <= tol;
    const overlapY = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)) > tol;
    const overlapX = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) > tol;
    return ((touchLeft || touchRight) && overlapY) || ((touchTop || touchBottom) && overlapX);
  },
  evaluateFloorPlan: (layout, matrix) => {
    let score = 1000;
    layout.forEach(r => { const aspect = Math.max(r.w / r.h, r.h / r.w); if (aspect > 2.5 && r.zone !== 'circulation') score -= (aspect * 30); if (aspect > 5 && r.zone !== 'circulation') score -= 200; });
    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const a = layout[i], b = layout[j]; const isAdjacent = FloorPlanEngine.shareWall(a, b); const weight = matrix[[a.id, b.id].sort().join('-')] || 0;
        if (weight === 3) { if (isAdjacent) score += 150; else score -= 150; } else if (weight === 1) { if (isAdjacent) score += 40; } else if (weight === 0) { if (isAdjacent) score -= 15; }
        if (isAdjacent && (a.zone === 'circulation' || b.zone === 'circulation')) { score += 60; }
      }
    }
    return Math.max(0, score);
  },
  bspPartition: (rect, items) => {
    if (items.length === 1) return [{ ...items[0], ...rect }];
    const totalArea = items.reduce((s, i) => s + i.area, 0); let sum = 0, splitIdx = 1;
    for (let i = 0; i < items.length - 1; i++) { sum += items[i].area; if (sum >= totalArea / 2) { splitIdx = i + 1; break; } }
    const list1 = items.slice(0, splitIdx), list2 = items.slice(splitIdx); const ratio = list1.reduce((s, i) => s + i.area, 0) / totalArea;
    let rect1, rect2;
    if (rect.w > rect.h) { const w1 = rect.w * ratio; rect1 = { x: rect.x, y: rect.y, w: w1, h: rect.h }; rect2 = { x: rect.x + w1, y: rect.y, w: rect.w - w1, h: rect.h };
    } else { const h1 = rect.h * ratio; rect1 = { x: rect.x, y: rect.y, w: rect.w, h: h1 }; rect2 = { x: rect.x, y: rect.y + h1, w: rect.w, h: rect.h - h1 }; }
    return [...FloorPlanEngine.bspPartition(rect1, list1), ...FloorPlanEngine.bspPartition(rect2, list2)];
  },
  runFloorPlanEvolutionAsync: async (spaces, matrix, params, onProgress) => {
    const totalArea = spaces.reduce((sum, s) => sum + s.area, 0); const h = Math.sqrt(totalArea / params.aspectRatio), w = totalArea / h, boundary = { w, h };
    let popStruct = Array.from({ length: params.popSize }, () => { const genome = [...spaces].sort(() => Math.random() - 0.5); const layout = FloorPlanEngine.bspPartition({ x: 0, y: 0, w, h }, genome); return { genome, layout, fitness: FloorPlanEngine.evaluateFloorPlan(layout, matrix) }; });
    for (let g = 0; g < params.generations; g++) {
      popStruct.sort((a, b) => b.fitness - a.fitness); if (g % Math.max(1, Math.floor(params.generations / 20)) === 0) { await new Promise(r => setTimeout(r, 0)); onProgress(Math.round((g / params.generations) * 100)); }
      let newPopulation = popStruct.slice(0, Math.min(3, params.popSize)).map(p => JSON.parse(JSON.stringify(p)));
      while (newPopulation.length < params.popSize) {
        const p1 = popStruct[Math.floor(Math.random() * (params.popSize / 2))].genome; const p2 = popStruct[Math.floor(Math.random() * (params.popSize / 2))].genome;
        let childGenome = p1.map((item, idx) => Math.random() > 0.5 ? item : p2[idx]); 
        if (Math.random() < params.mutationRate) { const i = Math.floor(Math.random() * childGenome.length), j = Math.floor(Math.random() * childGenome.length); [childGenome[i], childGenome[j]] = [childGenome[j], childGenome[i]]; }
        const layout = FloorPlanEngine.bspPartition({ x: 0, y: 0, w, h }, childGenome); newPopulation.push({ genome: childGenome, layout, fitness: FloorPlanEngine.evaluateFloorPlan(layout, matrix) });
      }
      popStruct = newPopulation;
    }
    popStruct.sort((a, b) => b.fitness - a.fitness); return popStruct.slice(0, params.topK).map((p, i) => ({ id: `fp-var-${i}-${Date.now()}`, layout: p.layout, boundary, fitness: p.fitness }));
  }
};

// ==========================================
// COMPONENTE PRINCIPAL (REACT UI)
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('diagram'); 
  
  const [spaces, setSpaces] = useState([
    { id: 'hall', name: 'Hall', area: 120, zone: 'circulation', subzone: 'Distribución', x: 280, y: 260, w: 140, h: 80, pinned: false },
    { id: 'recep', name: 'Reception', area: 100, zone: 'social', subzone: 'Atención', x: 440, y: 260, w: 120, h: 80, pinned: false },
    { id: 'biblio', name: 'Bibliothèque', area: 250, zone: 'social', subzone: 'Lectura', x: 60, y: 200, w: 180, h: 200, pinned: false },
    { id: 'esc1', name: 'Escaliers + Asc.', area: 40, zone: 'circulation', subzone: 'Vertical', x: 140, y: 240, w: 80, h: 80, pinned: false },
    { id: 'cine', name: 'Cinema', area: 200, zone: 'social', subzone: 'Espectáculo', x: 380, y: 40, w: 180, h: 140, pinned: false },
    { id: 'audi', name: 'Auditorium', area: 300, zone: 'social', subzone: 'Espectáculo', x: 580, y: 40, w: 220, h: 140, pinned: false },
    { id: 'serv', name: 'Magasin / WC', area: 80, zone: 'service', subzone: 'Apoyo', x: 400, y: 200, w: 100, h: 80, pinned: false },
    { id: 'exhib', name: 'Permanent Exhibition', area: 200, zone: 'social', subzone: 'Exposición', x: 640, y: 220, w: 180, h: 160, pinned: false },
    { id: 'esc2', name: 'Escaliers', area: 30, zone: 'circulation', subzone: 'Vertical', x: 580, y: 220, w: 50, h: 60, pinned: false },
    { id: 'cafe', name: 'Café', area: 90, zone: 'social', subzone: 'Gastronomía', x: 400, y: 380, w: 120, h: 80, pinned: false },
    { id: 'scene', name: 'Scène en Direct', area: 350, zone: 'social', subzone: 'Espectáculo', x: 280, y: 520, w: 280, h: 160, pinned: false }
  ]);
  
  const [matrix, setMatrix] = useState({
    'hall-biblio': 3, 'hall-recep': 3, 'hall-esc1': 3, 'recep-serv': 1, 'recep-cine': 3, 'recep-cafe': 3, 'recep-exhib': 3, 'exhib-audi': 3, 'exhib-esc2': 3, 'cafe-scene': 3
  });

  const [floorPlanProposals, setFloorPlanProposals] = useState([]);
  const [xlsxLoaded, setXlsxLoaded] = useState(false);

  // Estados de Excel
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [importHeaders, setImportHeaders] = useState([]);
  const [importMapping, setImportMapping] = useState({ name: '', area: '', zone: '', subzone: '' });
  const [importWorkbook, setImportWorkbook] = useState(null);
  const [importSheetNames, setImportSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');

  // ESTADOS DE COLOR Y ESTILOS
  const [colorMode, setColorMode] = useState('macro');
  const [selectedPaletteId, setSelectedPaletteId] = useState('light_blueprint'); 
  const [customPalette, setCustomPalette] = useState(null);
  const [extractedColors, setExtractedColors] = useState([]);
  const [customBgMode, setCustomBgMode] = useState('light');

  // NUEVOS ESTADOS GLOBALES DE TEXTO Y ÁREA
  const [showAreaText, setShowAreaText] = useState(true);
  const [topologyTextPos, setTopologyTextPos] = useState('edge'); // 'edge' | 'center'
  const [topologyTextSize, setTopologyTextSize] = useState(11);

  // IA States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingMatrix, setIsGeneratingMatrix] = useState(false);

  const currentPalette = (selectedPaletteId === 'custom_image' && customPalette) ? customPalette : PRINT_PALETTES.find(p => p.id === selectedPaletteId) || PRINT_PALETTES[0];
  const uniqueSubzones = useMemo(() => [...new Set(spaces.map(s => s.subzone || 'General'))], [spaces]);
  
  const getSpaceColor = useCallback((space) => {
    if (colorMode === 'macro') return currentPalette.zones[space.zone] || currentPalette.lines;
    const szIndex = uniqueSubzones.indexOf(space.subzone || 'General');
    if (selectedPaletteId === 'custom_image' && extractedColors.length > 0) return extractedColors[szIndex % extractedColors.length];
    return `hsl(${(szIndex * 137.5) % 360}, 75%, 60%)`;
  }, [colorMode, currentPalette, uniqueSubzones, selectedPaletteId, extractedColors]);

  useEffect(() => {
    const scripts = ['https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'];
    scripts.forEach(src => {
      const script = document.createElement('script'); script.src = src; 
      if (src.includes('xlsx')) script.onload = () => setXlsxLoaded(true); document.body.appendChild(script);
    });
  }, []);

  const setCustomBackground = (mode) => { setCustomBgMode(mode); if (customPalette) { setCustomPalette(prev => ({ ...prev, bg: mode === 'light' ? '#ffffff' : '#000000', text: mode === 'light' ? '#000000' : '#ffffff', lines: mode === 'light' ? '#e5e5e5' : '#333333' })); } };

  const handleImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return; const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas'); const MAX_SIZE = 150; let w = img.width, h = img.height;
      if (w > h && w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } else if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; }
      canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h).data; const colorCounts = [];
      const getSat = (r, g, b) => { const max = Math.max(r, g, b), min = Math.min(r, g, b); return max === 0 ? 0 : (max - min) / max; };
      for (let i = 0; i < imageData.length; i += 16) {
        const r = imageData[i], g = imageData[i+1], b = imageData[i+2], a = imageData[i+3]; if (a < 128) continue; 
        const sat = getSat(r, g, b); const weight = 1 + (sat * 4); let found = false;
        for (let j = 0; j < colorCounts.length; j++) { if (Math.sqrt(Math.pow(colorCounts[j].r - r, 2) + Math.pow(colorCounts[j].g - g, 2) + Math.pow(colorCounts[j].b - b, 2)) < 45) { colorCounts[j].count += weight; found = true; break; } }
        if (!found) colorCounts.push({r, g, b, count: weight});
      }
      colorCounts.sort((a, b) => b.count - a.count); const rgbToHex = (r, g, b) => "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
      const requiredCount = 15; const colors = [];
      for(let i = 0; i < requiredCount; i++) { if (colorCounts[i]) colors.push(rgbToHex(colorCounts[i].r, colorCounts[i].g, colorCounts[i].b)); else colors.push('#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')); }
      setExtractedColors(colors); const zoneKeys = Object.keys(ZONES); const newZones = {}; zoneKeys.forEach((key, idx) => { newZones[key] = colors[idx % colors.length]; });
      setCustomPalette({ id: 'custom_image', name: 'Extraído de Imagen', bg: customBgMode === 'light' ? '#ffffff' : '#000000', text: customBgMode === 'light' ? '#000000' : '#ffffff', lines: customBgMode === 'light' ? '#e5e5e5' : '#333333', zones: newZones });
      setSelectedPaletteId('custom_image');
    };
    img.src = URL.createObjectURL(file); e.target.value = null;
  };

  const shuffleCustomPalette = () => {
    if (extractedColors.length === 0) return; const shuffled = [...extractedColors].sort(() => Math.random() - 0.5); setExtractedColors(shuffled);
    const zoneKeys = Object.keys(ZONES); const newZones = {}; zoneKeys.forEach((key, idx) => { newZones[key] = shuffled[idx % shuffled.length]; });
    setCustomPalette(prev => ({ ...prev, zones: newZones }));
  };

  const handleSpaceUpdate = (id, field, value) => setSpaces(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  const removeSpace = (id) => { setSpaces(spaces.filter(s => s.id !== id)); setMatrix(prev => { const nm = {...prev}; Object.keys(nm).forEach(k => { if(k.includes(id)) delete nm[k]; }); return nm; }); };
  const addSpace = (e) => { e.preventDefault(); const name = e.target.elements.spaceName.value, area = parseFloat(e.target.elements.spaceArea.value) || 10, zone = e.target.elements.spaceZone.value, subzone = e.target.elements.spaceSubzone.value || name; if (!name.trim()) return; setSpaces([...spaces, { id: generateId(), name, area, zone, subzone, x: 200, y: 200, w: 120, h: 80, pinned: false }]); e.target.reset(); };
  
  const getRelation = (id1, id2) => matrix[[id1, id2].sort().join('-')] || 0;
  const cycleRelation = (id1, id2) => { const key = [id1, id2].sort().join('-'); const current = matrix[key] || 0; setMatrix(prev => ({ ...prev, [key]: current === 0 ? 1 : current === 1 ? 3 : 0 })); };
  const handleSpacePositionUpdate = (id, newX, newY) => setSpaces(prev => prev.map(s => s.id === id ? { ...s, x: newX, y: newY } : s));
  const handleSpaceSizeUpdate = (id, newW, newH) => setSpaces(prev => prev.map(s => s.id === id ? { ...s, w: Math.max(50, newW), h: Math.max(50, newH) } : s));

  const handleExcelImport = (e) => {
    if (!xlsxLoaded || !window.XLSX) return alert("Librería Excel cargando...");
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = (evt) => {
      try { const wb = window.XLSX.read(evt.target.result, { type: 'binary' }); setImportWorkbook(wb); setImportSheetNames(wb.SheetNames); if(wb.SheetNames.length > 0) processExcelSheet(wb, wb.SheetNames[0]); } 
      catch (err) { alert("Error procesando Excel."); } e.target.value = null; 
    }; reader.readAsBinaryString(file);
  };

  const processExcelSheet = (wb, sheetName) => {
    setSelectedSheet(sheetName); const data = window.XLSX.utils.sheet_to_json(wb.Sheets[sheetName]); if (data.length === 0) return alert("Hoja vacía.");
    const headers = Object.keys(data[0]); const nameKey = headers.find(k => k.toLowerCase().includes('nom')) || headers[0]; const areaKey = headers.find(k => k.toLowerCase().includes('area') || k.toLowerCase().includes('m2')) || (headers.length > 1 ? headers[1] : ''); const zoneKey = headers.find(k => k.toLowerCase().includes('zon') || k.toLowerCase().includes('tip')) || (headers.length > 2 ? headers[2] : '');
    setImportHeaders(headers); setImportMapping({ name: nameKey, area: areaKey, zone: '', subzone: zoneKey }); setImportPreviewData(data); 
  };

  const confirmImport = (mode) => {
    const importedSpaces = importPreviewData.map(row => {
      const rawSubzone = importMapping.subzone && row[importMapping.subzone] ? String(row[importMapping.subzone]).trim() : 'General';
      let rawZone = importMapping.zone && row[importMapping.zone] ? String(row[importMapping.zone]).toLowerCase().trim() : rawSubzone.toLowerCase();
      let finalZone = 'social'; if (rawZone.includes('priv') || rawZone.includes('admin')) finalZone = 'private'; if (rawZone.includes('serv') || rawZone.includes('bañ') || rawZone.includes('máquina')) finalZone = 'service'; if (rawZone.includes('circ') || rawZone.includes('hall') || rawZone.includes('pasillo')) finalZone = 'circulation';
      return { id: generateId(), name: row[importMapping.name] ? String(row[importMapping.name]).trim() : `Espacio`, area: parseFloat(row[importMapping.area]) || 10, zone: finalZone, subzone: rawSubzone, x: 200, y: 200, w: 120, h: 80, pinned: false };
    });
    if (mode === 'replace') { setSpaces(importedSpaces); setMatrix({}); } else { setSpaces([...spaces, ...importedSpaces]); }
    setImportPreviewData(null); setImportWorkbook(null);
  };

  return (
    <div className="flex h-screen bg-[#030f14] text-[#e0f2f1] overflow-hidden" style={{ fontFamily: "'Roboto', sans-serif" }}>
      <aside className="w-64 bg-[#051318]/90 backdrop-blur-xl border-r border-[#14333b] flex flex-col shadow-2xl z-20">
        <div className="p-6"><h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-wide"><LayoutTemplate className="text-[#00ff9d]" /> GEN<span className="text-[#00e5ff] font-light">PLAN</span></h1><p className="text-[10px] uppercase tracking-widest mt-2 text-[#6e939a]">Planificación Avanzada</p></div>
        <nav className="flex-1 mt-4 space-y-1 px-3 overflow-y-auto custom-scrollbar">
          <NavItem icon={<ListPlus size={16} />} label="1. Programa & Zonas" active={activeTab === 'spaces'} onClick={() => setActiveTab('spaces')} />
          <NavItem icon={<Grid size={16} />} label="2. Matriz Funcional" active={activeTab === 'matrix'} onClick={() => setActiveTab('matrix')} />
          <NavItem icon={<BrainCircuit size={16} />} label="3. Topología Metaball" active={activeTab === 'diagram'} onClick={() => setActiveTab('diagram')} />
          <div className="h-px bg-[#14333b] my-2 mx-4"></div>
          <NavItem icon={<Network size={16} />} label="4. Diagrama Relaciones" active={activeTab === 'flowdiagram'} onClick={() => setActiveTab('flowdiagram')} customClass="text-[#00e5ff]" />
          <NavItem icon={<LayoutTemplate size={16} />} label="5. Plantas (Evolutivo)" active={activeTab === 'floorplan'} onClick={() => setActiveTab('floorplan')} />
          <div className="h-px bg-[#14333b] my-2 mx-4"></div>
          <NavItem icon={<Palette size={16} />} label="6. Estudio de Impresión" active={activeTab === 'print'} onClick={() => setActiveTab('print')} customClass="text-[#ff3366] hover:bg-[#ff3366]/10" />
        </nav>
      </aside>
      <main className="flex-1 flex flex-col relative bg-gradient-to-br from-[#030f14] via-[#061a21] to-[#030f14]">
        {activeTab === 'spaces' && <SpacesView spaces={spaces} addSpace={addSpace} removeSpace={removeSpace} handleSpaceUpdate={handleSpaceUpdate} colorMode={colorMode} setColorMode={setColorMode} getSpaceColor={getSpaceColor} currentPalette={currentPalette} onExcelImport={handleExcelImport} importPreviewData={importPreviewData} importHeaders={importHeaders} importMapping={importMapping} setImportMapping={setImportMapping} confirmImport={confirmImport} cancelImport={() => setImportPreviewData(null)} importSheetNames={importSheetNames} selectedSheet={selectedSheet} onSheetChange={(e) => processExcelSheet(importWorkbook, e.target.value)} setSpaces={setSpaces} isGeneratingAI={isGeneratingAI} setIsGeneratingAI={setIsGeneratingAI} />}
        {activeTab === 'matrix' && <MatrixView spaces={spaces} getRelation={getRelation} cycleRelation={cycleRelation} currentPalette={currentPalette} getSpaceColor={getSpaceColor} isGeneratingMatrix={isGeneratingMatrix} setIsGeneratingMatrix={setIsGeneratingMatrix} setMatrix={setMatrix} />}
        {activeTab === 'diagram' && <DiagramView spaces={spaces} matrix={matrix} currentPalette={currentPalette} getSpaceColor={getSpaceColor} onNodesChange={setSpaces} showAreaText={showAreaText} setShowAreaText={setShowAreaText} topologyTextPos={topologyTextPos} setTopologyTextPos={setTopologyTextPos} topologyTextSize={topologyTextSize} setTopologyTextSize={setTopologyTextSize} />}
        {activeTab === 'flowdiagram' && <FlowDiagramView spaces={spaces} matrix={matrix} currentPalette={currentPalette} getSpaceColor={getSpaceColor} onUpdatePosition={handleSpacePositionUpdate} onUpdateSize={handleSpaceSizeUpdate} showAreaText={showAreaText} setShowAreaText={setShowAreaText} />}
        {activeTab === 'floorplan' && <FloorPlanView spaces={spaces} matrix={matrix} proposals={floorPlanProposals} setProposals={setFloorPlanProposals} currentPalette={currentPalette} getSpaceColor={getSpaceColor} />}
        {activeTab === 'print' && <PrintStudioView spaces={spaces} matrix={matrix} getRelation={getRelation} floorPlanProposals={floorPlanProposals} currentPalette={currentPalette} getSpaceColor={getSpaceColor} selectedPaletteId={selectedPaletteId} setSelectedPaletteId={setSelectedPaletteId} customPalette={customPalette} handleImageUpload={handleImageUpload} shuffleCustomPalette={shuffleCustomPalette} customBgMode={customBgMode} setCustomBackground={setCustomBackground} showAreaText={showAreaText} topologyTextPos={topologyTextPos} topologyTextSize={topologyTextSize} />}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, customClass }) {
  const baseClass = active ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 shadow-[0_0_15px_rgba(0,255,157,0.1)]' : `text-[#6e939a] hover:bg-[#0a1e24] hover:text-white border border-transparent ${customClass || ''}`;
  return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${baseClass}`}>{icon} <span className="font-medium tracking-wide text-[11px] uppercase">{label}</span></button>;
}

// ==========================================
// VISTA 1: ESPACIOS
// ==========================================
function SpacesView({ spaces, addSpace, removeSpace, handleSpaceUpdate, colorMode, setColorMode, getSpaceColor, currentPalette, onExcelImport, importPreviewData, importHeaders, importMapping, setImportMapping, confirmImport, cancelImport, importSheetNames, selectedSheet, onSheetChange, setSpaces, isGeneratingAI, setIsGeneratingAI }) {
  const totalArea = spaces.reduce((sum, s) => sum + s.area, 0); const fileInputRef = useRef(null);
  const [aiPrompt, setAiPrompt] = useState("");

  const handleAIGenerate = async () => {
      if(!aiPrompt) return; setIsGeneratingAI(true);
      setTimeout(() => {
          const mockAIResponse = [
              { name: "Consultorio Principal", area: 25, zone: 'private', subzone: 'Atención Médica' }, { name: "Sala de Espera", area: 30, zone: 'social', subzone: 'Espera' }, { name: "Recepción", area: 15, zone: 'social', subzone: 'Atención' }, { name: "Baño Pacientes", area: 6, zone: 'service', subzone: 'Baños' }, { name: "Baño Personal", area: 6, zone: 'service', subzone: 'Baños' }, { name: "Sala de Rayos X", area: 20, zone: 'private', subzone: 'Especialidad' }, { name: "Laboratorio", area: 15, zone: 'private', subzone: 'Análisis' }, { name: "Cuarto de Aseo", area: 4, zone: 'service', subzone: 'Limpieza' }, { name: "Pasillo Central", area: 20, zone: 'circulation', subzone: 'Circulación' }
          ];
          const newSpaces = mockAIResponse.map(s => ({ id: generateId(), name: s.name, area: s.area, zone: s.zone, subzone: s.subzone, x: 200 + Math.random()*100, y: 200 + Math.random()*100, w: 120, h: 80, pinned: false }));
          setSpaces(newSpaces); setIsGeneratingAI(false); setAiPrompt("");
      }, 2000);
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar relative">
      {importPreviewData && (
        <div className="absolute inset-0 bg-[#030f14]/95 backdrop-blur-sm z-50 flex items-center justify-center p-8">
           <div className="bg-[#051318] border border-[#14333b] rounded-2xl p-6 shadow-2xl w-full max-w-4xl max-h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div><h3 className="text-2xl font-light text-white">Importación de <span className="font-bold text-[#00ff9d]">Excel</span></h3></div>
                {importSheetNames.length > 1 && (<select value={selectedSheet} onChange={onSheetChange} className="bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 px-4 py-2 rounded-lg font-bold outline-none">{importSheetNames.map(s => <option key={s} value={s}>{s}</option>)}</select>)}
              </div>
              <div className="grid grid-cols-4 gap-4 mb-6 bg-[#081b21] p-4 rounded-xl border border-[#14333b]">
                  {['name', 'area', 'zone', 'subzone'].map((k) => (
                    <div key={k} className="flex flex-col"><span className="text-[9px] text-[#6e939a] uppercase mb-1">{k === 'name' ? 'Nombre' : k === 'area' ? 'Área' : k === 'zone' ? 'Macro-Zona' : 'Sub-Zona'}</span>
                    <select value={importMapping[k]} onChange={e => setImportMapping({...importMapping, [k]: e.target.value})} className="bg-[#030f14] text-white outline-none px-2 py-1.5 text-sm rounded border border-[#14333b]"><option value="">-- Ignorar --</option>{importHeaders.map(h => <option key={`h-${k}-${h}`} value={h}>{h}</option>)}</select></div>
                  ))}
              </div>
              <div className="flex-1 overflow-y-auto bg-[#030f14] border border-[#14333b] custom-scrollbar rounded"><table className="w-full text-left border-collapse"><thead className="bg-[#0a1e24] text-[#6e939a] text-[10px] uppercase sticky top-0 shadow"><tr><th className="px-4 py-2">Nombre</th><th className="px-4 py-2 text-center">Área</th><th className="px-4 py-2">Sub-Zona</th></tr></thead><tbody>{importPreviewData.map((row, i) => (<tr key={`prev-${i}`} className="border-b border-[#14333b] hover:bg-[#0c262e]"><td className="px-4 py-2 text-sm text-white">{row[importMapping.name] || '-'}</td><td className="px-4 py-2 text-center text-[#00e5ff]">{row[importMapping.area] || '-'}</td><td className="px-4 py-2 text-sm text-[#8aadb3]">{importMapping.subzone ? row[importMapping.subzone] : 'General'}</td></tr>))}</tbody></table></div>
              <div className="mt-6 flex justify-end gap-4"><button onClick={cancelImport} className="px-6 py-2 rounded-lg text-[#6e939a]">Cancelar</button><button onClick={() => confirmImport('append')} className="px-6 py-2 rounded-lg bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30">Añadir</button><button onClick={() => confirmImport('replace')} className="px-6 py-2 rounded-lg bg-[#00ff9d] text-[#030f14] font-bold">Reemplazar Todo</button></div>
           </div>
        </div>
      )}

      <div className={`max-w-5xl mx-auto space-y-6 ${importPreviewData ? 'opacity-20 pointer-events-none filter blur-sm' : ''}`}>
        
        {/* IA PROMPT BAR */}
        <div className="bg-gradient-to-r from-[#b066ff]/20 to-[#00e5ff]/10 border border-[#b066ff]/30 p-1 rounded-2xl shadow-xl flex items-center">
            <div className="pl-4 pr-2 text-[#b066ff]"><Sparkles size={20} /></div>
            <input type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Ej: Describe tu proyecto para generar espacios (Ej: 'Clínica dental de 150m2')" className="flex-1 bg-transparent text-white placeholder-[#8aadb3] outline-none text-sm py-3 px-2 font-light" disabled={isGeneratingAI} />
            <button onClick={handleAIGenerate} disabled={isGeneratingAI || !aiPrompt} className="bg-[#b066ff] text-white px-6 py-3 rounded-xl font-bold text-xs mr-1 flex items-center gap-2 hover:bg-[#9d4edd] transition-colors disabled:opacity-50">
               {isGeneratingAI ? <Loader2 size={16} className="animate-spin" /> : 'Generar Programa'}
            </button>
        </div>

        <header className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-light text-white tracking-wide mb-3">Programa <span className="font-bold text-[#00e5ff]">Arquitectónico</span></h2>
            <div className="flex items-center gap-2 bg-[#051318] p-1.5 rounded-lg border border-[#14333b] inline-flex">
               <span className="text-[10px] uppercase text-[#6e939a] px-2">Colorear por:</span>
               <button onClick={() => setColorMode('macro')} className={`px-3 py-1 text-xs rounded transition-all ${colorMode === 'macro' ? 'bg-[#00e5ff] text-[#030f14] font-bold shadow-[0_0_10px_rgba(0,229,255,0.3)]' : 'text-[#6e939a] hover:text-white'}`}>Macro-Zona</button>
               <button onClick={() => setColorMode('sub')} className={`px-3 py-1 text-xs rounded transition-all ${colorMode === 'sub' ? 'bg-[#b066ff] text-white font-bold shadow-[0_0_10px_rgba(176,102,255,0.3)]' : 'text-[#6e939a] hover:text-white'}`}>Sub-Zona</button>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <input type="file" accept=".xlsx" className="hidden" ref={fileInputRef} onChange={onExcelImport} />
            <button onClick={() => fileInputRef.current.click()} className="text-[#00ff9d] text-[10px] uppercase flex items-center gap-1 hover:text-white transition-colors border border-[#00ff9d]/30 px-3 py-1.5 rounded bg-[#00ff9d]/10"><FileSpreadsheet size={12}/> Importar Excel</button>
            <div className="text-right mt-2"><span className="text-[10px] text-[#6e939a] uppercase block">Área Total</span><span className="text-2xl font-mono text-[#00ff9d]">{totalArea} m²</span></div>
          </div>
        </header>

        <div className="bg-[#081b21]/80 rounded-2xl border border-[#14333b] p-5 shadow-lg">
          <form onSubmit={addSpace} className="flex gap-4">
            <input type="text" name="spaceName" placeholder="Nombre..." className="flex-1 px-4 py-3 rounded-xl bg-[#030f14] border border-[#14333b] text-white outline-none" required />
            <input type="text" name="spaceSubzone" placeholder="Subzona (Opcional)" className="w-40 px-4 py-3 rounded-xl bg-[#030f14] border border-[#14333b] text-white outline-none" />
            <select name="spaceZone" className="px-4 py-3 rounded-xl bg-[#030f14] border border-[#14333b] text-[#8aadb3] outline-none">{Object.entries(ZONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            <input type="number" name="spaceArea" placeholder="m²" className="w-24 px-4 py-3 rounded-xl bg-[#030f14] border border-[#14333b] text-white text-center outline-none" required />
            <button type="submit" className="bg-[#0a2e38] text-[#00e5ff] px-6 py-3 rounded-xl font-medium border border-[#00e5ff]/30 hover:bg-[#00e5ff]/10"><Plus size={18} /></button>
          </form>
        </div>

        <div className="bg-[#081b21]/80 rounded-2xl border border-[#14333b] overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#051318] text-[#6e939a] text-[10px] uppercase tracking-widest border-b border-[#14333b]"><tr><th className="px-6 py-4 w-12 text-center"></th><th className="px-6 py-4">Recinto & Subzona</th><th className="px-6 py-4">Macro-Zona</th><th className="px-6 py-4 text-center w-24">Área (m²)</th><th className="px-6 py-4 text-center w-16"></th></tr></thead>
            <tbody className="divide-y divide-[#14333b]/50">
              {spaces.map(space => {
                const zColor = getSpaceColor(space);
                return (
                  <tr key={space.id} className="hover:bg-[#0c262e] transition-colors group">
                    <td className="px-6 py-3"><div className="w-4 h-4 rounded-full border shadow-sm transition-colors" style={{ backgroundColor: `${zColor}30`, borderColor: zColor }}></div></td>
                    <td className="px-6 py-3">
                       <input value={space.name} onChange={(e) => handleSpaceUpdate(space.id, 'name', e.target.value)} className="bg-transparent border-none outline-none text-white text-sm font-medium w-full focus:bg-[#030f14] focus:px-2 rounded transition-all" />
                       <input value={space.subzone || ''} onChange={(e) => handleSpaceUpdate(space.id, 'subzone', e.target.value)} placeholder="Sin subzona" className="bg-transparent border-none outline-none text-[#8aadb3] text-[10px] uppercase mt-1 w-full focus:bg-[#030f14] focus:px-2 rounded transition-all" />
                    </td>
                    <td className="px-6 py-3"><select value={space.zone} onChange={(e) => handleSpaceUpdate(space.id, 'zone', e.target.value)} className="bg-transparent border-none outline-none text-xs text-[#8aadb3] focus:bg-[#030f14] focus:p-1 rounded cursor-pointer appearance-none">{Object.entries(ZONES).map(([k, v]) => <option key={k} value={k} className="bg-[#030f14] text-white">{v.label}</option>)}</select></td>
                    <td className="px-6 py-3 text-center"><input type="number" value={space.area} onChange={(e) => handleSpaceUpdate(space.id, 'area', parseFloat(e.target.value) || 0)} className="bg-transparent border-none outline-none text-[#00e5ff] font-mono text-center w-full focus:bg-[#030f14] rounded transition-all" /></td>
                    <td className="px-6 py-3 text-center opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => removeSpace(space.id)} className="text-[#ff3366] hover:bg-[#ff3366]/10 p-2 rounded"><Trash2 size={14} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VISTA 2: MATRIZ
// ==========================================
function MatrixView({ spaces, getRelation, cycleRelation, currentPalette, getSpaceColor, isGeneratingMatrix, setIsGeneratingMatrix, setMatrix }) {
  const [isTriangular, setIsTriangular] = useState(true);

  const handleAISolve = () => {
      setIsGeneratingMatrix(true);
      setTimeout(() => {
          const newMatrix = {};
          for(let i=0; i<spaces.length; i++){
              for(let j=i+1; j<spaces.length; j++){
                  const val = Math.random();
                  if(val > 0.8) newMatrix[[spaces[i].id, spaces[j].id].sort().join('-')] = 3;
                  else if(val > 0.5) newMatrix[[spaces[i].id, spaces[j].id].sort().join('-')] = 1;
              }
          }
          setMatrix(newMatrix); setIsGeneratingMatrix(false);
      }, 2000);
  };

  if (spaces.length < 2) return <div className="p-8 text-center text-[#6e939a] h-full">Agrega espacios primero.</div>;
  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex justify-between items-end bg-[#081b21]/80 p-6 rounded-2xl border border-[#14333b]">
          <div><h2 className="text-3xl font-light text-white tracking-wide">Matriz de <span className="font-bold text-[#00e5ff]">Adyacencias</span></h2></div>
          <div className="flex items-center gap-4">
             <button onClick={handleAISolve} disabled={isGeneratingMatrix} className="px-4 py-2 bg-[#b066ff]/20 text-[#b066ff] border border-[#b066ff]/40 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#b066ff]/30 transition-all disabled:opacity-50">
                 {isGeneratingMatrix ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} RESOLVER CON IA
             </button>
             <button onClick={() => setIsTriangular(!isTriangular)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isTriangular ? 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/30' : 'bg-[#030f14] text-[#6e939a] border-[#14333b] hover:text-white'}`}>FORMA: {isTriangular ? 'TRIANGULAR' : 'CUADRADA'}</button>
          </div>
        </header>
        <div className="overflow-x-auto pb-8 bg-[#051318] p-6 rounded-2xl border border-[#14333b] shadow-xl inline-block">
          <table className="border-collapse mx-auto">
            <thead><tr><th className="p-2 border border-transparent"></th>{spaces.map((s, i) => (<th key={s.id} className="p-2 border-0"><div className="h-32 w-10 relative"><span className="absolute bottom-4 left-1/2 -translate-x-1/2 -rotate-45 whitespace-nowrap text-[10px] font-bold uppercase" style={{color: getSpaceColor(s)}}>{i + 1}. {s.name.substring(0, 15)}</span></div></th>))}</tr></thead>
            <tbody>
              {spaces.map((row, rowIndex) => (
                <tr key={row.id}>
                  <td className={`p-3 text-right text-[10px] uppercase font-bold pr-4 whitespace-nowrap border-[#14333b]/50 ${isTriangular ? 'border-r' : 'border'}`} style={{color: getSpaceColor(row)}}>{rowIndex + 1}. {row.name}</td>
                  {spaces.map((col, colIndex) => {
                    if (colIndex === rowIndex) return <td key={col.id} className={`p-1 ${isTriangular ? 'border-0 bg-transparent' : 'border border-[#14333b]/50 bg-[#030f14]/50'}`}></td>;
                    if (isTriangular && colIndex > rowIndex) return <td key={col.id} className="p-1 border-0 bg-transparent"></td>;
                    const val = getRelation(row.id, col.id); let bgCol = 'transparent', textCol = 'transparent', borderCol = 'transparent';
                    if (val === 3) { bgCol = `${getSpaceColor(row)}30`; textCol = getSpaceColor(row); borderCol = textCol; } if (val === 1) { bgCol = `${getSpaceColor(col)}15`; textCol = getSpaceColor(col); borderCol = textCol; }
                    return (<td key={col.id} className="p-1 border border-[#14333b]/50 text-center"><button onClick={() => cycleRelation(row.id, col.id)} className="w-10 h-10 rounded-lg border mx-auto font-mono text-sm transition-all hover:bg-[#030f14]/80" style={{backgroundColor: bgCol, color: textCol, borderColor: borderCol}}>{val === 0 ? '-' : val}</button></td>);
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VISTA 3: TOPOLOGÍA FÍSICA (Metaball / Gooey)
// ==========================================
function DiagramView({ spaces, matrix, currentPalette, getSpaceColor, onNodesChange, showAreaText, setShowAreaText, topologyTextPos, setTopologyTextPos, topologyTextSize, setTopologyTextSize }) {
  const containerRef = useRef(null); const requestRef = useRef();
  const [nodes, setNodes] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1); const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [springLength, setSpringLength] = useState(150);
  const [gooeyStrength, setGooeyStrength] = useState(1.8);
  const [showGooey, setShowGooey] = useState(true);
  
  const nodesRef = useRef(nodes); const dragTarget = useRef(null); const mousePos = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false); const panStart = useRef({ x: 0, y: 0 });

  const unpinAll = () => { const unp = nodesRef.current.map(n => ({ ...n, pinned: false })); setNodes(unp); onNodesChange(unp); };

  useEffect(() => {
    if (spaces.length === 0) return;
    setNodes(currentNodes => {
      const existingMap = new Map(currentNodes.map(n => [n.id, n]));
      return spaces.map((s, i) => {
        const calculatedRadius = Math.max(30, Math.sqrt(s.area || 10) * 8);
        if (existingMap.has(s.id)) return { ...existingMap.get(s.id), ...s, radius: calculatedRadius };
        const goldenRatio = 1.61803398875; const angle = i * Math.PI * 2 * goldenRatio; const rSpread = 100 + Math.sqrt(i) * 60; 
        const initX = s.tx !== undefined ? s.tx : 400 + Math.cos(angle) * rSpread; const initY = s.ty !== undefined ? s.ty : 300 + Math.sin(angle) * rSpread;
        return { ...s, x: initX, y: initY, vx: 0, vy: 0, radius: calculatedRadius, pinned: s.pinned !== undefined ? s.pinned : false };
      });
    });
  }, [spaces]);

  useEffect(() => { const updateD = () => { if (containerRef.current) setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight }); }; window.addEventListener('resize', updateD); updateD(); return () => window.removeEventListener('resize', updateD); }, []);

  const simulatePhysics = useCallback(() => {
    setNodes(prevNodes => {
      if (prevNodes.length === 0) return prevNodes; const newNodes = prevNodes.map(n => ({ ...n })); const damping = 0.50, centerGravity = 0.015;
      for (let i = 0; i < newNodes.length; i++) {
        for (let j = i + 1; j < newNodes.length; j++) {
          const a = newNodes[i], b = newNodes[j]; 
          let dx = a.x - b.x, dy = a.y - b.y;
          
          // Anti-apilamiento y prevención de errores matemáticos (evita división por cero)
          if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) { 
             dx = (Math.random() - 0.5) * 5; 
             dy = (Math.random() - 0.5) * 5; 
          }
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          const minRequiredDist = a.radius + b.radius + 15; 
          const weight = matrix[[a.id, b.id].sort().join('-')] || 0; 
          
          // Fuerza Positiva (+) = REPELAR. Fuerza Negativa (-) = ATRAER.
          let force = 0; 
          
          // 1. Colisión Física Dura (Prioridad Absoluta)
          if (dist < minRequiredDist) { 
            force += (minRequiredDist - dist) * 0.4; // Las separa fuertemente
          } 
          
          // 2. Resortes por Matriz Funcional
          if (weight === 0) { 
            const maxRepulseDist = springLength * 1.5; 
            if (dist > minRequiredDist && dist < maxRepulseDist) { force += (maxRepulseDist - dist) * 0.01; } 
          } 
          else if (weight === 3) { 
            const idealDist = minRequiredDist + (springLength * 0.2); 
            force += (idealDist - dist) * 0.06; 
          } 
          else if (weight === 1) { 
            const idealDist = minRequiredDist + (springLength * 0.8); 
            force += (idealDist - dist) * 0.02; 
          }
          
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          
          // Aplicación corregida de vectores
          if(!a.pinned && a.id !== dragTarget.current) { a.vx += fx; a.vy += fy; } 
          if(!b.pinned && b.id !== dragTarget.current) { b.vx -= fx; b.vy -= fy; } 
        }
      }
      const cx = dimensions.width / 2, cy = dimensions.height / 2;
      newNodes.forEach(n => {
        if (n.id === dragTarget.current) { n.x = mousePos.current.x; n.y = mousePos.current.y; n.vx = 0; n.vy = 0; } 
        else if (n.pinned) { n.vx = 0; n.vy = 0; } 
        else { n.vx += (cx - n.x) * centerGravity; n.vy += (cy - n.y) * centerGravity; n.vx *= damping; n.vy *= damping; n.vx = Math.max(-15, Math.min(15, n.vx)); n.vy = Math.max(-15, Math.min(15, n.vy)); n.x += n.vx; n.y += n.vy; }
      });
      nodesRef.current = newNodes; return newNodes;
    });
    requestRef.current = requestAnimationFrame(simulatePhysics);
  }, [matrix, dimensions, springLength]);

  useEffect(() => { requestRef.current = requestAnimationFrame(simulatePhysics); return () => cancelAnimationFrame(requestRef.current); }, [simulatePhysics]);

  const getMouseCoord = (e) => { if (!containerRef.current) return {x:0, y:0}; const rect = containerRef.current.getBoundingClientRect(); return { x: (e.clientX - rect.left - cameraOffset.x) / zoom, y: (e.clientY - rect.top - cameraOffset.y) / zoom }; };

  const handlePointerDownNode = (id, e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); dragTarget.current = id; mousePos.current = getMouseCoord(e); };
  const handleDoubleClickNode = (id, e) => { e.stopPropagation(); setNodes(prev => prev.map(n => n.id === id ? { ...n, pinned: false } : n)); onNodesChange(nodesRef.current.map(n => n.id === id ? { ...n, pinned: false, tx: undefined, ty: undefined } : n)); };
  
  const handleContainerPointerDown = (e) => { 
    if (e.button === 1 || e.altKey) { e.currentTarget.setPointerCapture(e.pointerId); isPanning.current = true; panStart.current = { x: e.clientX, y: e.clientY }; } 
  };
  const handleContainerPointerMove = (e) => { 
    if (isPanning.current) { setCameraOffset(prev => ({ x: prev.x + e.clientX - panStart.current.x, y: prev.y + e.clientY - panStart.current.y })); panStart.current = { x: e.clientX, y: e.clientY }; }
    else if (dragTarget.current) { mousePos.current = getMouseCoord(e); } 
  };
  const handleContainerPointerUp = (e) => { 
    if (isPanning.current) { e.currentTarget.releasePointerCapture(e.pointerId); isPanning.current = false; }
    if (dragTarget.current) { const targetId = dragTarget.current; setNodes(prev => prev.map(n => n.id === targetId ? { ...n, pinned: true } : n)); onNodesChange(nodesRef.current.map(n => n.id === targetId ? { ...n, tx: n.x, ty: n.y, pinned: true } : n)); dragTarget.current = null; }
  };

  if (spaces.length < 2) return <div className="p-8 text-center text-[#6e939a]">Defina espacios primero.</div>;

  return (
    <div className="flex flex-col h-full relative" style={{ backgroundColor: currentPalette.bg }}>
      <div className="bg-[#051318]/90 backdrop-blur-md px-6 py-4 shadow-lg flex flex-wrap justify-between items-center z-20 border-b border-[#14333b] gap-4">
        <div><h2 className="text-xl font-light text-white tracking-wide">Topología <span className="font-bold text-[#00e5ff] text-[10px] bg-[#00e5ff]/10 border border-[#00e5ff]/30 px-2 py-1 rounded-full uppercase">Metaball</span></h2><p className="text-[10px] uppercase text-[#6e939a] mt-1">Arrastra para fijar. Doble clic libera. Rueda (click) para mover.</p></div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={unpinAll} className="px-3 py-1.5 rounded text-xs font-bold bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/30 hover:bg-[#ff3366] hover:text-white transition-all">Desbloquear</button>
          <div className="w-px h-6 bg-[#14333b]"></div>
          
          {/* FORMATO TEXTO */}
          <div className="flex items-center gap-2 bg-[#030f14] px-2 py-1.5 rounded-lg border border-[#14333b]">
             <span className="text-[9px] text-[#6e939a] uppercase">Posición:</span>
             <button onClick={()=>setTopologyTextPos('edge')} className={`px-2 py-0.5 text-[9px] rounded ${topologyTextPos === 'edge' ? 'bg-[#00e5ff] text-black font-bold' : 'text-white'}`}>Borde</button>
             <button onClick={()=>setTopologyTextPos('center')} className={`px-2 py-0.5 text-[9px] rounded ${topologyTextPos === 'center' ? 'bg-[#00e5ff] text-black font-bold' : 'text-white'}`}>Centro</button>
          </div>
          <div className="flex items-center gap-2 bg-[#030f14] px-2 py-1.5 rounded-lg border border-[#14333b]">
             <span className="text-[9px] text-[#6e939a] uppercase">Tam:</span>
             <input type="range" min="8" max="24" value={topologyTextSize} onChange={e=>setTopologyTextSize(parseInt(e.target.value))} className="w-16 accent-[#00e5ff]" />
          </div>
          <button onClick={() => setShowAreaText(!showAreaText)} className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase transition-all border ${showAreaText ? 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/30' : 'bg-[#030f14] text-[#6e939a] border-[#14333b] hover:text-white'}`}>Área: {showAreaText ? 'ON' : 'OFF'}</button>

          <div className="w-px h-6 bg-[#14333b]"></div>

          <div className="flex items-center gap-2 bg-[#030f14] px-3 py-1.5 rounded-lg border border-[#14333b]"><span className="text-[9px] text-[#6e939a] uppercase mr-2">Cuerda</span><input type="range" min="50" max="400" step="10" value={springLength} onChange={e => setSpringLength(parseInt(e.target.value))} className="w-16 accent-[#00ff9d]" /></div>
          <div className="flex items-center gap-2 bg-[#030f14] px-3 py-1.5 rounded-lg border border-[#14333b]"><span className="text-[9px] text-[#6e939a] uppercase mr-2">Masa</span><input type="range" min="0.1" max="3.0" step="0.1" value={gooeyStrength} onChange={e => setGooeyStrength(parseFloat(e.target.value))} className="w-16 accent-[#00e5ff]" /></div>
          <button onClick={() => setShowGooey(!showGooey)} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all border ${showGooey ? 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/30' : 'bg-[#030f14] text-[#6e939a] border-[#14333b] hover:text-white'}`}>Fusión: {showGooey ? 'ON' : 'OFF'}</button>
        </div>
      </div>

      <div className={`flex-1 relative overflow-hidden touch-none ${isPanning.current ? 'cursor-grabbing' : 'cursor-crosshair'}`} ref={containerRef} onWheel={(e) => { e.preventDefault(); setZoom(prev => Math.max(0.3, Math.min(3, prev * (e.deltaY > 0 ? 0.9 : 1.1)))); }} onPointerDown={handleContainerPointerDown} onPointerMove={handleContainerPointerMove} onPointerUp={handleContainerPointerUp} onPointerCancel={handleContainerPointerUp} onMouseDown={e => { if(e.button === 1) e.preventDefault(); }} onAuxClick={e => { if(e.button === 1) e.preventDefault(); }}>
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `linear-gradient(${currentPalette.lines} 1px, transparent 1px), linear-gradient(90deg, ${currentPalette.lines} 1px, transparent 1px)`, backgroundSize: `${40*zoom}px ${40*zoom}px`, backgroundPosition: `${cameraOffset.x}px ${cameraOffset.y}px` }}></div>
        <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${cameraOffset.x}px, ${cameraOffset.y}px) scale(${zoom})` }}>
          <svg width="4000" height="4000" className="absolute inset-0 overflow-visible" fontFamily="Roboto, sans-serif">
            <defs>
              <filter id="gooey"><feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" /><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10" result="goo" /><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter>
              {nodes.map((nodeA, i) => nodes.slice(i + 1).map(nodeB => {
                const weight = matrix[[nodeA.id, nodeB.id].sort().join('-')] || 0; if (weight === 0) return null;
                return (<linearGradient key={`grad-${nodeA.id}-${nodeB.id}`} id={`grad-${nodeA.id}-${nodeB.id}`} x1={nodeA.x} y1={nodeA.y} x2={nodeB.x} y2={nodeB.y} gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={getSpaceColor(nodeA)} /><stop offset="100%" stopColor={getSpaceColor(nodeB)} /></linearGradient>);
              }))}
            </defs>
            {showGooey && (
              <g opacity="0.6" filter="url(#gooey)">
                {nodes.map((nodeA, i) => nodes.slice(i + 1).map(nodeB => {
                  const weight = matrix[[nodeA.id, nodeB.id].sort().join('-')] || 0; if (weight === 0) return null;
                  const dx = nodeA.x - nodeB.x, dy = nodeA.y - nodeB.y; const dist = Math.sqrt(dx*dx + dy*dy); const optimalDist = nodeA.radius + nodeB.radius + springLength; const maxStretch = optimalDist * 1.5; 
                  if (dist > maxStretch) return null; 
                  const baseThickness = Math.min(nodeA.radius, nodeB.radius) * gooeyStrength; let currentThickness = baseThickness;
                  if (dist > optimalDist) { const stretchRatio = Math.max(0, 1 - ((dist - optimalDist) / (maxStretch - optimalDist))); currentThickness = baseThickness * stretchRatio; }
                  if (currentThickness < 2) return null;
                  return <line key={`goo-${nodeA.id}-${nodeB.id}`} x1={nodeA.x} y1={nodeA.y} x2={nodeB.x} y2={nodeB.y} stroke={`url(#grad-${nodeA.id}-${nodeB.id})`} strokeWidth={currentThickness} strokeLinecap="round" />;
                }))}
                {nodes.map(node => <circle key={`goo-node-${node.id}`} cx={node.x} cy={node.y} r={node.radius * gooeyStrength} fill={getSpaceColor(node)} />)}
              </g>
            )}
            <g>{nodes.map((nodeA, i) => nodes.slice(i + 1).map(nodeB => { const weight = matrix[[nodeA.id, nodeB.id].sort().join('-')] || 0; if (weight === 0) return null; return <line key={`dash-${nodeA.id}-${nodeB.id}`} x1={nodeA.x} y1={nodeA.y} x2={nodeB.x} y2={nodeB.y} stroke={currentPalette.text} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />; }))}</g>
            {nodes.map(node => {
               const zColor = getSpaceColor(node); const textRadius = node.radius + 6; const pathId = `text-path-${node.id}`;
               return (
                <g key={`node-group-${node.id}`}>
                  <g className={dragTarget.current === node.id ? 'cursor-grabbing' : 'cursor-grab'} onPointerDown={(e) => handlePointerDownNode(node.id, e)} onDoubleClick={(e) => handleDoubleClickNode(node.id, e)}>
                    {node.pinned && <circle cx={node.x} cy={node.y} r={node.radius + 12} fill="none" stroke={zColor} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />}
                    <circle cx={node.x} cy={node.y} r={node.radius} fill={currentPalette.bg} stroke={currentPalette.bg} strokeWidth="4" opacity="0.85" />
                    <circle cx={node.x} cy={node.y} r={node.radius} fill={zColor} fillOpacity="0.3" stroke={zColor} strokeWidth="2" />
                    
                    {/* Renderización de textos y núcleos dependiente de topologyTextPos */}
                    {topologyTextPos === 'edge' ? (
                       <>
                         <circle cx={node.x} cy={node.y} r="4" fill={currentPalette.bg} /><circle cx={node.x} cy={node.y} r="2" fill={currentPalette.text} />
                         {showAreaText && <text x={node.x} y={node.y + 14} textAnchor="middle" fill={zColor} className="text-[10px] font-mono font-bold opacity-90 pointer-events-none">{node.area} m²</text>}
                       </>
                    ) : (
                       <>
                         <text x={node.x} y={node.y - (showAreaText ? (topologyTextSize/2 - 2) : 0)} textAnchor="middle" dominantBaseline="central" fill={currentPalette.text} style={{ fontSize: `${topologyTextSize}px` }} className="font-bold uppercase tracking-wider pointer-events-none">{node.name.length > 15 ? node.name.substring(0, 13) + '.' : node.name}</text>
                         {showAreaText && <text x={node.x} y={node.y + (topologyTextSize/2 + 6)} textAnchor="middle" dominantBaseline="central" fill={zColor} className="text-[10px] font-mono font-bold opacity-90 pointer-events-none">{node.area} m²</text>}
                       </>
                    )}
                  </g>
                  {topologyTextPos === 'edge' && (
                    <g className="pointer-events-none">
                      <defs><path id={pathId} d={`M ${node.x - textRadius} ${node.y} A ${textRadius} ${textRadius} 0 1 1 ${node.x + textRadius} ${node.y}`} /></defs>
                      <text fill={currentPalette.text} style={{ fontSize: `${topologyTextSize}px` }} className="font-bold uppercase tracking-widest"><textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">{node.name.length > 20 ? node.name.substring(0, 18) + '.' : node.name}</textPath></text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VISTA 4: DIAGRAMA DE RELACIONES
// ==========================================
function FlowDiagramView({ spaces, matrix, currentPalette, getSpaceColor, onUpdatePosition, onUpdateSize, showAreaText, setShowAreaText }) {
  const [showFlows, setShowFlows] = useState(false); const containerRef = useRef(null);
  const [lineDirectColor, setLineDirectColor] = useState(currentPalette.text); const [lineIndirectColor, setLineIndirectColor] = useState(currentPalette.text); const [boxTextColor, setBoxTextColor] = useState(currentPalette.text);
  const [draggingId, setDraggingId] = useState(null); const [resizingId, setResizingId] = useState(null); const mouseOffset = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1); const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 }); const isPanning = useRef(false); const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => { setLineDirectColor(currentPalette.text); setLineIndirectColor(currentPalette.text); setBoxTextColor(currentPalette.text); }, [currentPalette]);
  const drawOrthogonalLine = (n1, n2) => { const cx1 = n1.x + n1.w / 2, cy1 = n1.y + n1.h / 2, cx2 = n2.x + n2.w / 2, cy2 = n2.y + n2.h / 2; if (Math.abs(cx1 - cx2) > Math.abs(cy1 - cy2)) return `M ${cx1} ${cy1} H ${(cx1 + cx2) / 2} V ${cy2} H ${cx2}`; else return `M ${cx1} ${cy1} V ${(cy1 + cy2) / 2} H ${cx2} V ${cy2}`; };
  const drawOrganicCurve = (n1, n2) => { const cx1 = n1.x + n1.w / 2, cy1 = n1.y + n1.h / 2, cx2 = n2.x + n2.w / 2, cy2 = n2.y + n2.h / 2; return `M ${cx1} ${cy1} C ${cx1 + (cx2-cx1)/2} ${cy1}, ${cx1 + (cx2-cx1)/2} ${cy2}, ${cx2} ${cy2}`; };
  const getMouseCoord = (e) => { if (!containerRef.current) return {x:0, y:0}; const rect = containerRef.current.getBoundingClientRect(); return { x: (e.clientX - rect.left - cameraOffset.x) / zoom, y: (e.clientY - rect.top - cameraOffset.y) / zoom }; };

  const handlePointerDownNode = (e, id) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); const node = spaces.find(s => s.id === id); const coords = getMouseCoord(e); mouseOffset.current = { x: coords.x - node.x, y: coords.y - node.y }; setDraggingId(id); };
  const handlePointerDownResize = (e, id) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); const node = spaces.find(s => s.id === id); const coords = getMouseCoord(e); mouseOffset.current = { x: coords.x - node.w, y: coords.y - node.h }; setResizingId(id); };
  const handleContainerPointerDown = (e) => { if (e.button === 1 || e.altKey) { e.currentTarget.setPointerCapture(e.pointerId); isPanning.current = true; panStart.current = { x: e.clientX, y: e.clientY }; } };
  const handleContainerPointerMove = (e) => { if (isPanning.current) { setCameraOffset(prev => ({ x: prev.x + e.clientX - panStart.current.x, y: prev.y + e.clientY - panStart.current.y })); panStart.current = { x: e.clientX, y: e.clientY }; } else if (draggingId) { const coords = getMouseCoord(e); onUpdatePosition(draggingId, coords.x - mouseOffset.current.x, coords.y - mouseOffset.current.y); } else if (resizingId) { const coords = getMouseCoord(e); onUpdateSize(resizingId, coords.x - mouseOffset.current.x, coords.y - mouseOffset.current.y); } };
  const handleContainerPointerUp = (e) => { if (isPanning.current) { e.currentTarget.releasePointerCapture(e.pointerId); isPanning.current = false; } setDraggingId(null); setResizingId(null); };

  if (spaces.length === 0) return <div className="p-8 text-center text-[#6e939a]">Defina espacios primero.</div>;
  return (
    <div className="flex flex-col h-full relative" style={{ backgroundColor: currentPalette.bg }}>
      <div className="bg-[#051318]/90 backdrop-blur-md px-6 py-4 shadow-lg flex justify-between items-center z-20 border-b border-[#14333b] flex-wrap gap-4">
        <div><h2 className="text-xl font-light text-white tracking-wide">Diagrama de <span className="font-bold text-[#00e5ff]">Relaciones</span></h2><p className="text-[10px] uppercase text-[#6e939a] mt-1">Arrastra esquinas para redimensionar. Click rueda para mover.</p></div>
        <div className="flex items-center gap-4 bg-[#030f14] p-2 rounded-xl border border-[#14333b]">
          <div className="flex flex-col"><span className="text-[9px] text-[#6e939a] px-1 uppercase">Línea Directa</span><input type="color" value={lineDirectColor} onChange={e=>setLineDirectColor(e.target.value)} className="w-8 h-6 p-0 border-0 rounded bg-transparent cursor-pointer" /></div>
          <div className="flex flex-col"><span className="text-[9px] text-[#6e939a] px-1 uppercase">Línea Punteada</span><input type="color" value={lineIndirectColor} onChange={e=>setLineIndirectColor(e.target.value)} className="w-8 h-6 p-0 border-0 rounded bg-transparent cursor-pointer" /></div>
          <div className="flex flex-col"><span className="text-[9px] text-[#6e939a] px-1 uppercase">Texto Caja</span><input type="color" value={boxTextColor} onChange={e=>setBoxTextColor(e.target.value)} className="w-8 h-6 p-0 border-0 rounded bg-transparent cursor-pointer" /></div>
          <div className="w-px h-6 bg-[#14333b]"></div>
          <button onClick={() => setShowAreaText(!showAreaText)} className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase transition-all border ${showAreaText ? 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/30' : 'bg-[#030f14] text-[#6e939a] border-[#14333b] hover:text-white'}`}>Área: {showAreaText ? 'ON' : 'OFF'}</button>
          <div className="w-px h-6 bg-[#14333b]"></div>
          <button onClick={() => setShowFlows(!showFlows)} className={`px-4 py-1.5 rounded-lg font-bold flex items-center gap-2 text-xs transition-all ${showFlows ? 'bg-[#00ff9d] text-[#030f14]' : 'text-[#6e939a] border border-[#14333b] hover:text-white'}`}><MoveRight size={14} /> USER FLOW: {showFlows ? 'ON' : 'OFF'}</button>
        </div>
      </div>
      <div className={`flex-1 overflow-hidden relative touch-none ${isPanning.current ? 'cursor-grabbing' : 'cursor-crosshair'}`} ref={containerRef} onWheel={(e)=>{e.preventDefault(); setZoom(prev => Math.max(0.3, Math.min(3, prev * (e.deltaY > 0 ? 0.9 : 1.1))));}} onPointerDown={handleContainerPointerDown} onPointerMove={handleContainerPointerMove} onPointerUp={handleContainerPointerUp} onPointerCancel={handleContainerPointerUp} onMouseDown={e=>{if(e.button===1)e.preventDefault();}} onAuxClick={e=>{if(e.button===1)e.preventDefault();}}>
         <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `linear-gradient(${currentPalette.lines} 1px, transparent 1px), linear-gradient(90deg, ${currentPalette.lines} 1px, transparent 1px)`, backgroundSize: `${40*zoom}px ${40*zoom}px`, backgroundPosition: `${cameraOffset.x}px ${cameraOffset.y}px` }}></div>
         <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${cameraOffset.x}px, ${cameraOffset.y}px) scale(${zoom})` }}>
           <svg width="4000" height="4000" className="absolute inset-0 overflow-visible" fontFamily="Roboto, sans-serif">
              <defs><marker id="arrowHead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={currentPalette.zones.circulation} opacity="0.8" /></marker></defs>
              {spaces.map((n1, i) => spaces.slice(i+1).map(n2 => { const weight = matrix[[n1.id, n2.id].sort().join('-')] || 0; if (weight === 0 || (showFlows && (n1.zone === 'circulation' || n2.zone === 'circulation'))) return null; const isDirect = weight === 3; return <path key={`ortho-${n1.id}-${n2.id}`} d={drawOrthogonalLine(n1, n2)} fill="none" stroke={isDirect ? lineDirectColor : lineIndirectColor} strokeWidth={isDirect ? 2.5 : 1.5} strokeDasharray={isDirect ? 'none' : '4,4'} opacity={isDirect ? 0.6 : 0.3} />; }))}
              {showFlows && spaces.map((n1, i) => spaces.slice(i+1).map(n2 => { const weight = matrix[[n1.id, n2.id].sort().join('-')] || 0; if (weight > 0 && (n1.zone === 'circulation' || n2.zone === 'circulation')) { return <path key={`flow-${n1.id}-${n2.id}`} d={drawOrganicCurve(n1, n2)} fill="none" stroke={currentPalette.zones.circulation} strokeWidth="5" strokeDasharray="10,10" opacity="0.8" markerEnd="url(#arrowHead)"/>; } return null; }))}
              {spaces.map(node => {
                 const zColor = getSpaceColor(node); const isHovered = draggingId === node.id || resizingId === node.id;
                 return (
                  <g key={`box-${node.id}`} transform={`translate(${node.x || 0}, ${node.y || 0})`}>
                    {isHovered && <rect width={node.w} height={node.h} rx="12" ry="12" fill="none" stroke={zColor} strokeWidth="6" opacity="0.3" />}
                    <g onPointerDown={(e) => handlePointerDownNode(e, node.id)} style={{ cursor: draggingId ? 'grabbing' : 'grab' }}>
                      <rect width={node.w} height={node.h} rx="12" ry="12" fill={currentPalette.bg} stroke={zColor} strokeWidth="2" />
                      <rect width={node.w} height={node.h} rx="12" ry="12" fill={zColor} opacity="0.15" />
                      <text x={node.w/2} y={node.h/2 - (showAreaText ? 5 : 0)} textAnchor="middle" dominantBaseline="central" fill={boxTextColor} className="font-bold text-[11px] uppercase tracking-wider pointer-events-none">{node.name.length > 20 ? node.name.substring(0, 18) + '.' : node.name}</text>
                      {showAreaText && <text x={node.w/2} y={node.h/2 + 12} textAnchor="middle" dominantBaseline="central" fill={zColor} className="font-mono text-[9px] opacity-80 pointer-events-none">{node.area} m²</text>}
                    </g>
                    <path d={`M ${node.w - 12} ${node.h - 2} L ${node.w - 2} ${node.h - 12} M ${node.w - 8} ${node.h - 2} L ${node.w - 2} ${node.h - 8}`} stroke={currentPalette.text} strokeWidth="1.5" opacity="0.5" className="cursor-nwse-resize" onPointerDown={(e) => handlePointerDownResize(e, node.id)} />
                  </g>
                 )
              })}
           </svg>
         </div>
      </div>
    </div>
  );
}

// ==========================================
// VISTA 5: PLANTA ARQUITECTÓNICA (Motor Evolutivo)
// ==========================================
function FloorPlanView({ spaces, matrix, proposals, setProposals, currentPalette, getSpaceColor }) {
  const [isSimulating, setIsSimulating] = useState(false); const [progress, setProgress] = useState(0); const [aspectRatio, setAspectRatio] = useState(1.5); const scale = 30;
  const runFloorPlanEvolution = async () => { setIsSimulating(true); setProgress(0); setProposals([]); await new Promise(r => setTimeout(r, 50)); try { setProposals(await FloorPlanEngine.runFloorPlanEvolutionAsync(spaces, matrix, { popSize:40, generations:50, mutationRate:0.2, topK:6, aspectRatio }, setProgress)); } finally { setIsSimulating(false); } };
  if (spaces.length === 0) return <div className="p-8 text-center text-[#6e939a]">Defina el programa primero.</div>;
  return (
    <div className="flex flex-col h-full bg-[#030f14]">
      <div className="bg-[#051318]/90 px-6 py-4 shadow-lg flex flex-col gap-4 z-10 border-b border-[#14333b]"><div className="flex justify-between items-center"><h2 className="text-xl font-light text-white">FloorPlan <span className="font-bold text-[#00ff9d]">AI Evolutivo</span></h2><button onClick={runFloorPlanEvolution} disabled={isSimulating} className="bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 px-8 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-[#00ff9d]/20 transition-all disabled:opacity-50">{isSimulating ? <Settings2 className="animate-spin" size={18} /> : <Play size={18} />} EVOLUCIONAR PLANTAS</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-[#081b21] p-4 rounded-xl border border-[#14333b]"><span className="text-xs text-[#6e939a] uppercase mb-3 block"><Square size={14} className="inline mr-2"/>Contenedor</span><select value={aspectRatio} onChange={e => setAspectRatio(Number(e.target.value))} className="w-full bg-[#030f14] border border-[#14333b] rounded text-white p-2"><option value={1.0}>1:1 Cuadrado</option><option value={1.5}>3:2 Apaisado</option><option value={2.0}>2:1 Alargado</option><option value={0.6}>2:3 Vertical</option></select></div></div></div>
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar" style={{ backgroundColor: currentPalette.bg }}>
        {isSimulating && (<div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ backgroundColor: `${currentPalette.bg}E6` }}><LayoutTemplate size={48} className="animate-pulse mb-4" color={currentPalette.text} /><div className="w-64 h-1.5 bg-[#081b21] rounded-full overflow-hidden border border-[#14333b]"><div className="h-full bg-gradient-to-r from-[#00e5ff] to-[#00ff9d] transition-all" style={{ width: `${progress}%` }}></div></div></div>)}
        {proposals.length === 0 && !isSimulating ? (<div className="h-full flex flex-col items-center justify-center" style={{ color: currentPalette.lines }}><LayoutTemplate size={64} className="opacity-50" /><p className="mt-4 text-sm uppercase tracking-widest">Ejecuta la evolución para generar plantas.</p></div>) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">{proposals.map((prop, index) => (<div key={prop.id} className="p-5 rounded-2xl shadow-2xl relative" style={{ backgroundColor: currentPalette.bg, border: `1px solid ${currentPalette.lines}` }}><div className="flex justify-between mb-4"><span className="text-xs font-bold uppercase" style={{ color: currentPalette.text }}>Planta Top {index + 1}</span></div><div className="w-full rounded-xl overflow-hidden p-6 relative"><svg viewBox={`-5 -5 ${prop.boundary.w*scale + 10} ${prop.boundary.h*scale + 10}`} style={{ width: '100%', height: 'auto', maxHeight: '400px' }} className="relative z-10" fontFamily="Roboto, sans-serif"><rect width={prop.boundary.w*scale} height={prop.boundary.h*scale} fill="none" stroke={currentPalette.text} strokeWidth="6" strokeLinejoin="round" />{prop.layout.map(rect => { const zColor = getSpaceColor(rect); return (<g key={`rect-${rect.id}`} transform={`translate(${rect.x * scale}, ${rect.y * scale})`}><rect width={rect.w * scale} height={rect.h * scale} fill={zColor} fillOpacity="0.15" stroke="none" /><rect width={rect.w * scale} height={rect.h * scale} fill="none" stroke={currentPalette.lines} strokeWidth="3" strokeLinejoin="round" /><g transform={`translate(${(rect.w * scale)/2}, ${(rect.h * scale)/2})`}><rect x="-40" y="-12" width="80" height="24" fill={currentPalette.bg} fillOpacity="0.9" rx="2" /><text textAnchor="middle" dy="-2" fill={currentPalette.text} className="text-[7px] font-bold tracking-widest uppercase">{rect.name.substring(0, 12)}</text><text textAnchor="middle" dy="8" fill={zColor} className="text-[6px] font-mono">{rect.area.toFixed(1)} m²</text></g></g>); })}</svg></div></div>))}</div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// VISTA 6: ESTUDIO DE IMPRESIÓN
// ==========================================
function PrintStudioView({ spaces, matrix, getRelation, currentPalette, getSpaceColor, selectedPaletteId, setSelectedPaletteId, customPalette, handleImageUpload, shuffleCustomPalette, customBgMode, setCustomBackground, showAreaText, topologyTextPos, topologyTextSize }) {
  const [selectedViews, setSelectedViews] = useState({ matrix: true, topology: true, flowdiagram: true }); const [isExporting, setIsExporting] = useState(false); const [pageFormat, setPageFormat] = useState({ w: 420, h: 297 }); const fileInputRef = useRef(null);
  const toggleView = (v) => setSelectedViews(prev => ({ ...prev, [v]: !prev[v] }));
  const getBBox = (mode) => { let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; spaces.forEach(s => { if (mode === 'flow') { minX = Math.min(minX, s.x); minY = Math.min(minY, s.y); maxX = Math.max(maxX, s.x + (s.w || 100)); maxY = Math.max(maxY, s.y + (s.h || 100)); } else { const rad = Math.max(30, Math.sqrt(s.area || 10) * 8); minX = Math.min(minX, s.x - rad); minY = Math.min(minY, s.y - rad); maxX = Math.max(maxX, s.x + rad); maxY = Math.max(maxY, s.y + rad); } }); if(minX === Infinity) return "0 0 800 600"; const pad = 100; return `${minX - pad} ${minY - pad} ${maxX - minX + pad*2} ${maxY - minY + pad*2}`; };

  const exportBatch = async (type) => {
    setIsExporting(true); const activeKeys = Object.keys(selectedViews).filter(k => selectedViews[k]);
    if (type === 'pdf' && window.html2pdf) {
      const element = document.createElement('div');
      activeKeys.forEach((key, index) => { const wrapper = document.createElement('div'); wrapper.style.width = `${pageFormat.w}mm`; wrapper.style.height = `${pageFormat.h}mm`; wrapper.style.backgroundColor = currentPalette.bg; wrapper.style.position = 'relative'; wrapper.style.overflow = 'hidden'; if(index < activeKeys.length - 1) wrapper.style.pageBreakAfter = 'always'; const content = document.getElementById(`print-node-${key}`); if(content) { const clone = content.cloneNode(true); clone.style.display = 'flex'; clone.style.width = '100%'; clone.style.height = '100%'; wrapper.appendChild(clone); } element.appendChild(wrapper); });
      const opt = { margin: 0, filename: `GenPlan_Batch_Export.pdf`, image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: [pageFormat.w, pageFormat.h], orientation: pageFormat.w > pageFormat.h ? 'landscape' : 'portrait' } };
      await window.html2pdf().set(opt).from(element).save();
    } else if ((type === 'png' || type === 'jpg') && window.html2canvas) {
       for(const key of activeKeys) { const content = document.getElementById(`print-node-${key}`); if (content) { content.style.display = 'flex'; content.style.width = `${pageFormat.w}mm`; content.style.height = `${pageFormat.h}mm`; const canvas = await window.html2canvas(content, { scale: 2, backgroundColor: currentPalette.bg, useCORS: true }); const link = document.createElement('a'); link.download = `GenPlan_${key}.${type}`; link.href = canvas.toDataURL(`image/${type === 'jpg' ? 'jpeg' : 'png'}`); link.click(); content.style.display = 'none'; } }
    }
    setIsExporting(false);
  };

  const MatrixContent = () => (
     <table className="border-collapse mx-auto" style={{fontFamily: "'Roboto', sans-serif"}}>
        <thead><tr><th className="p-2"></th>{spaces.map((s, i) => (<th key={s.id} className="p-2 border-0"><div className="h-32 w-10 relative"><span className="absolute bottom-4 left-1/2 -translate-x-1/2 -rotate-45 whitespace-nowrap text-xs uppercase font-bold" style={{color: getSpaceColor(s)}}>{i + 1}. {s.name}</span></div></th>))}</tr></thead>
        <tbody>
          {spaces.map((row, rowIndex) => (
            <tr key={row.id}>
              <td className="p-3 text-right text-xs uppercase pr-4 font-bold whitespace-nowrap" style={{color: getSpaceColor(row), borderRight: `2px solid ${currentPalette.lines}`}}>{rowIndex + 1}. {row.name}</td>
              {spaces.map((col, colIndex) => {
                if (colIndex === rowIndex || colIndex > rowIndex) return <td key={col.id} className="p-1 border-0"></td>;
                const val = getRelation(row.id, col.id); let bgCol = 'transparent', textCol = currentPalette.lines;
                if (val === 3) { bgCol = `${getSpaceColor(row)}30`; textCol = getSpaceColor(row); } if (val === 1) { bgCol = `${getSpaceColor(col)}15`; textCol = getSpaceColor(col); }
                return (<td key={col.id} className="p-1 border" style={{borderColor: currentPalette.lines}}><div className="w-10 h-10 flex items-center justify-center font-bold" style={{backgroundColor: val===0?'transparent':bgCol, color: val===0?currentPalette.lines:textCol}}>{val===0?'-':val}</div></td>);
              })}
            </tr>
          ))}
        </tbody>
      </table>
  );

  const FlowContent = () => (
     <svg viewBox={getBBox('flow')} className="w-full h-full relative z-10" fontFamily="Roboto, sans-serif">
        {spaces.map((n1, i) => spaces.slice(i+1).map(n2 => {
             const weight = matrix[[n1.id, n2.id].sort().join('-')] || 0; if (weight === 0) return null;
             const cx1 = n1.x+n1.w/2, cy1 = n1.y+n1.h/2, cx2 = n2.x+n2.w/2, cy2 = n2.y+n2.h/2, isDirect = weight===3;
             const d = Math.abs(cx1-cx2) > Math.abs(cy1-cy2) ? `M ${cx1} ${cy1} H ${(cx1+cx2)/2} V ${cy2} H ${cx2}` : `M ${cx1} ${cy1} V ${(cy1+cy2)/2} H ${cx2} V ${cy2}`;
             return <path key={`ortho-${n1.id}-${n2.id}`} d={d} fill="none" stroke={currentPalette.text} strokeWidth={isDirect ? 2.5 : 1} strokeDasharray={isDirect ? 'none' : '4,4'} opacity={isDirect ? 0.6 : 0.3} />;
        }))}
        {spaces.map(node => {
           const zColor = getSpaceColor(node);
           return (
            <g key={`box-${node.id}`} transform={`translate(${node.x}, ${node.y})`}>
              <rect width={node.w} height={node.h} rx="12" ry="12" fill={currentPalette.bg} stroke={zColor} strokeWidth="3" />
              <rect width={node.w} height={node.h} rx="12" ry="12" fill={zColor} opacity="0.15" />
              <text x={node.w/2} y={node.h/2 - (showAreaText ? 5 : 0)} textAnchor="middle" dominantBaseline="central" fill={currentPalette.text} className="font-bold text-[14px] uppercase tracking-wider">{node.name}</text>
              {showAreaText && <text x={node.w/2} y={node.h/2 + 14} textAnchor="middle" dominantBaseline="central" fill={zColor} className="font-mono text-[12px] opacity-80">{node.area} m²</text>}
            </g>
           )
        })}
     </svg>
  );

  const TopologyContent = () => (
     <svg viewBox={getBBox('topo')} className="w-full h-full relative z-10" fontFamily="Roboto, sans-serif">
        <defs>
          <filter id="print-gooey"><feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" /><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10" result="goo" /><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter>
          {spaces.map((nodeA, i) => spaces.slice(i + 1).map(nodeB => {
            const weight = matrix[[nodeA.id, nodeB.id].sort().join('-')] || 0; if (weight === 0) return null;
            return (<linearGradient key={`p-grad-${nodeA.id}-${nodeB.id}`} id={`p-grad-${nodeA.id}-${nodeB.id}`} x1={nodeA.x} y1={nodeA.y} x2={nodeB.x} y2={nodeB.y} gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={getSpaceColor(nodeA)} /><stop offset="100%" stopColor={getSpaceColor(nodeB)} /></linearGradient>);
          }))}
        </defs>
        <g opacity="0.6" filter="url(#print-gooey)">
          {spaces.map((nodeA, i) => spaces.slice(i + 1).map(nodeB => {
            const weight = matrix[[nodeA.id, nodeB.id].sort().join('-')] || 0; if (weight === 0) return null;
            const radA = Math.max(30, Math.sqrt(nodeA.area || 10) * 8), radB = Math.max(30, Math.sqrt(nodeB.area || 10) * 8);
            return <line key={`p-goo-${nodeA.id}-${nodeB.id}`} x1={nodeA.x} y1={nodeA.y} x2={nodeB.x} y2={nodeB.y} stroke={`url(#p-grad-${nodeA.id}-${nodeB.id})`} strokeWidth={Math.min(radA, radB)*1.8} strokeLinecap="round" />;
          }))}
          {spaces.map(node => <circle key={`p-goo-node-${node.id}`} cx={node.x} cy={node.y} r={(Math.max(30, Math.sqrt(node.area || 10) * 8)) * 1.8} fill={getSpaceColor(node)} />)}
        </g>
        <g>{spaces.map((nodeA, i) => spaces.slice(i + 1).map(nodeB => { const weight = matrix[[nodeA.id, nodeB.id].sort().join('-')] || 0; if (weight === 0) return null; return <line key={`p-dash-${nodeA.id}-${nodeB.id}`} x1={nodeA.x} y1={nodeA.y} x2={nodeB.x} y2={nodeB.y} stroke={currentPalette.text} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />; }))}</g>
        {spaces.map(node => {
           const zColor = getSpaceColor(node); const rad = Math.max(30, Math.sqrt(node.area || 10) * 8); const textRadius = rad + 6;
           return (
            <g key={`p-node-${node.id}`}>
              <circle cx={node.x} cy={node.y} r={rad} fill={currentPalette.bg} stroke={currentPalette.bg} strokeWidth="4" />
              <circle cx={node.x} cy={node.y} r={rad} fill={zColor} fillOpacity="0.3" stroke={zColor} strokeWidth="2" />
              
              {topologyTextPos === 'edge' ? (
                  <>
                    <circle cx={node.x} cy={node.y} r="4" fill={currentPalette.bg} /><circle cx={node.x} cy={node.y} r="2" fill={currentPalette.text} />
                    {showAreaText && <text x={node.x} y={node.y + 14} textAnchor="middle" fill={zColor} className="text-[12px] font-mono font-bold">{node.area} m²</text>}
                    <defs><path id={`p-text-path-${node.id}`} d={`M ${node.x - textRadius} ${node.y} A ${textRadius} ${textRadius} 0 1 1 ${node.x + textRadius} ${node.y}`} /></defs>
                    <text fill={currentPalette.text} style={{ fontSize: `${topologyTextSize}px` }} className="font-bold uppercase tracking-widest"><textPath href={`#p-text-path-${node.id}`} startOffset="50%" textAnchor="middle">{node.name}</textPath></text>
                  </>
              ) : (
                  <>
                    <text x={node.x} y={node.y - (showAreaText ? (topologyTextSize/2 - 2) : 0)} textAnchor="middle" dominantBaseline="central" fill={currentPalette.text} style={{ fontSize: `${topologyTextSize}px` }} className="font-bold uppercase tracking-wider">{node.name}</text>
                    {showAreaText && <text x={node.x} y={node.y + (topologyTextSize/2 + 6)} textAnchor="middle" dominantBaseline="central" fill={zColor} className="text-[12px] font-mono font-bold">{node.area} m²</text>}
                  </>
              )}
            </g>
          )
        })}
     </svg>
  );

  return (
    <div className="flex flex-col h-full bg-[#030f14] overflow-hidden">
      <div id="print-node-matrix" className="items-center justify-center relative" style={{ display: 'none', backgroundColor: currentPalette.bg, padding: '40px' }}><div className="transform scale-125"><MatrixContent /></div></div>
      <div id="print-node-flowdiagram" className="items-center justify-center relative" style={{ display: 'none', backgroundColor: currentPalette.bg, padding: '40px' }}><div className="absolute inset-0 opacity-10" style={{ backgroundImage: `linear-gradient(${currentPalette.lines} 1px, transparent 1px), linear-gradient(90deg, ${currentPalette.lines} 1px, transparent 1px)`, backgroundSize: `40px 40px` }}></div><FlowContent /></div>
      <div id="print-node-topology" className="items-center justify-center relative" style={{ display: 'none', backgroundColor: currentPalette.bg, padding: '40px' }}><TopologyContent /></div>
      
      <div className="bg-[#051318]/90 px-6 py-4 shadow-lg flex items-center justify-between z-10 border-b border-[#14333b] flex-shrink-0">
        <h2 className="text-xl font-light text-white tracking-wide flex items-center gap-2"><Palette className="text-[#ff3366]"/> Batch <span className="font-bold text-[#ff3366]">Export</span></h2>
        <div className="flex items-center gap-4 bg-[#030f14] p-2 rounded-xl border border-[#14333b]">
          <div className="flex flex-col"><span className="text-[9px] text-[#6e939a] px-2 uppercase">Tema / Paleta</span>
            <div className="flex items-center">
              <select value={selectedPaletteId} onChange={e => setSelectedPaletteId(e.target.value)} className="bg-transparent text-[#00ff9d] font-bold text-sm outline-none px-2 w-32">{PRINT_PALETTES.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}{customPalette && <option value="custom_image" className="text-black">{customPalette.name}</option>}</select>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
              <button onClick={() => fileInputRef.current.click()} className="text-[#00e5ff] hover:text-white p-1 ml-1 bg-[#00e5ff]/10 rounded"><ImagePlus size={16} /></button>
              {selectedPaletteId === 'custom_image' && customPalette && (<div className="flex items-center gap-1 ml-1 bg-[#051318] p-1 rounded-lg border border-[#14333b]"><button onClick={shuffleCustomPalette} className="text-[#ff3366] p-1 bg-[#ff3366]/10 rounded"><Shuffle size={12} /></button><button onClick={() => setCustomBackground('light')} className={`w-3 h-3 rounded-sm border ${customBgMode === 'light' ? 'border-[#00e5ff]' : 'border-[#14333b]'} bg-white`}></button><button onClick={() => setCustomBackground('dark')} className={`w-3 h-3 rounded-sm border ${customBgMode === 'dark' ? 'border-[#00e5ff]' : 'border-[#14333b]'} bg-black`}></button></div>)}
            </div>
          </div>
          <div className="w-px h-6 bg-[#14333b]"></div>
          <div className="flex gap-2"><div className="flex flex-col"><span className="text-[9px] text-[#6e939a] uppercase">Ancho (mm)</span><input type="number" value={pageFormat.w} onChange={e=>setPageFormat({...pageFormat, w: Number(e.target.value)})} className="bg-[#030f14] text-white border border-[#14333b] w-16 text-center text-xs p-1 rounded" /></div><div className="flex flex-col"><span className="text-[9px] text-[#6e939a] uppercase">Alto (mm)</span><input type="number" value={pageFormat.h} onChange={e=>setPageFormat({...pageFormat, h: Number(e.target.value)})} className="bg-[#030f14] text-white border border-[#14333b] w-16 text-center text-xs p-1 rounded" /></div></div>
          <div className="w-px h-6 bg-[#14333b]"></div>
          <div className="flex gap-2">
            <button onClick={() => exportBatch('pdf')} disabled={isExporting} className="bg-[#ff3366] text-white px-4 py-2 rounded font-bold flex items-center gap-2 text-sm disabled:opacity-50">{isExporting ? <Loader2 className="animate-spin" size={14}/> : <Printer size={14}/>} PDF</button>
            <button onClick={() => exportBatch('png')} disabled={isExporting} className="bg-[#00e5ff] text-[#030f14] px-4 py-2 rounded font-bold flex items-center gap-2 text-sm disabled:opacity-50">PNG</button>
            <button onClick={() => exportBatch('jpg')} disabled={isExporting} className="bg-white text-black px-4 py-2 rounded font-bold flex items-center gap-2 text-sm disabled:opacity-50">JPG</button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center custom-scrollbar" style={{ backgroundColor: `${currentPalette.bg}10` }}>
         <div className="bg-[#051318] p-6 rounded-2xl border border-[#14333b] w-full max-w-2xl text-center mb-8 flex-shrink-0 shadow-xl"><h3 className="text-xl font-light text-white mb-2">Selecciona vistas a Exportar</h3><div className="grid grid-cols-3 gap-4 mt-6"><button onClick={()=>toggleView('matrix')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedViews.matrix ? 'bg-[#00ff9d]/10 border-[#00ff9d] text-[#00ff9d] shadow-[0_0_15px_rgba(0,255,157,0.1)]' : 'bg-[#030f14] border-[#14333b] text-[#6e939a]'}`}><Grid size={24}/> <span>Matriz Funcional</span></button><button onClick={()=>toggleView('flowdiagram')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedViews.flowdiagram ? 'bg-[#00ff9d]/10 border-[#00ff9d] text-[#00ff9d] shadow-[0_0_15px_rgba(0,255,157,0.1)]' : 'bg-[#030f14] border-[#14333b] text-[#6e939a]'}`}><Network size={24}/> <span>Diagrama Flujos</span></button><button onClick={()=>toggleView('topology')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedViews.topology ? 'bg-[#00ff9d]/10 border-[#00ff9d] text-[#00ff9d] shadow-[0_0_15px_rgba(0,255,157,0.1)]' : 'bg-[#030f14] border-[#14333b] text-[#6e939a]'}`}><BrainCircuit size={24}/> <span>Topología Metaball</span></button></div></div>
         <div className="w-full max-w-6xl"><div className="flex items-center gap-3 mb-6 border-b border-[#14333b] pb-2"><ZoomIn className="text-[#6e939a]" size={16} /><h4 className="text-sm font-bold text-white uppercase tracking-widest">Previsualización de Hojas</h4></div>
            <div className="flex flex-wrap gap-10 justify-center pb-12">
                {selectedViews.matrix && (<div className="flex flex-col items-center gap-3 group"><span className="text-[10px] text-[#00ff9d] uppercase font-bold tracking-widest bg-[#051318] px-3 py-1 rounded-full border border-[#14333b]">Pág 1: Matriz</span><div className="shadow-2xl border border-[#14333b] overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105" style={{ width: '280px', aspectRatio: `${pageFormat.w}/${pageFormat.h}`, backgroundColor: currentPalette.bg }}><div style={{ transform: 'scale(0.35)', transformOrigin: 'center' }}><MatrixContent /></div></div></div>)}
                {selectedViews.flowdiagram && (<div className="flex flex-col items-center gap-3 group"><span className="text-[10px] text-[#00ff9d] uppercase font-bold tracking-widest bg-[#051318] px-3 py-1 rounded-full border border-[#14333b]">Pág 2: Flujos</span><div className="shadow-2xl border border-[#14333b] overflow-hidden relative transition-transform group-hover:scale-105" style={{ width: '280px', aspectRatio: `${pageFormat.w}/${pageFormat.h}`, backgroundColor: currentPalette.bg, padding: '15px' }}><div className="absolute inset-0 opacity-10" style={{ backgroundImage: `linear-gradient(${currentPalette.lines} 1px, transparent 1px), linear-gradient(90deg, ${currentPalette.lines} 1px, transparent 1px)`, backgroundSize: `15px 15px` }}></div><FlowContent /></div></div>)}
                {selectedViews.topology && (<div className="flex flex-col items-center gap-3 group"><span className="text-[10px] text-[#00ff9d] uppercase font-bold tracking-widest bg-[#051318] px-3 py-1 rounded-full border border-[#14333b]">Pág 3: Topología</span><div className="shadow-2xl border border-[#14333b] overflow-hidden transition-transform group-hover:scale-105" style={{ width: '280px', aspectRatio: `${pageFormat.w}/${pageFormat.h}`, backgroundColor: currentPalette.bg, padding: '15px' }}><TopologyContent /></div></div>)}
            </div>
         </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap'); .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: #030f14; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #14333b; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #00e5ff; }`}} />
    </div>
  );
}