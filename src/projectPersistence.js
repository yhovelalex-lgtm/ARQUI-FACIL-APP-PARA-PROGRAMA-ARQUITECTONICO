/**
 * Persistencia local de ARQUI-FÁCIL.
 * Las copias se guardan en este navegador, sin subir datos del proyecto a servidores.
 * El documento es versionado para admitir futuras migraciones.
 */
export const PROJECT_STORAGE_KEY = 'arqui-facil:workspace:v1';
export const PROJECT_FORMAT = 'arqui-facil-project';
export const PROJECT_VERSION = 1;

export const PROJECT_FIELDS = Object.freeze([
  'projectName','activeTab','spaces','matrix','floorPlanProposals',
  'colorMode','colorSeed','styleOverrides','matrixTriangular','topologyNodes',
  'matrixDisplayMode','showGooey','gooeyStrength','showFlows','legendPositions',
  'printSelectedViews','printPageFormat','printDpi','printLegendPlacement','flowGuides','flowSnap','flowGridSize','selectedPaletteId',
  'customPalette','extractedColors','customBgMode','showAreaText',
  'topologyTextPos','topologyTextSize','typography'
]);

const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = n => typeof n === 'number' && Number.isFinite(n);

export function validateProjectEnvelope(input) {
  if (!plainObject(input) || input.format !== PROJECT_FORMAT || input.version !== PROJECT_VERSION) {
    throw new Error('El archivo no es un proyecto compatible de ARQUI-FÁCIL V1.');
  }
  if (!plainObject(input.data)) throw new Error('La copia no contiene datos de proyecto.');
  const data = input.data;
  if (!Array.isArray(data.spaces) || data.spaces.length > 2000 || !data.spaces.every(space =>
    plainObject(space) && typeof space.id === 'string' && space.id.length > 0 &&
    typeof space.name === 'string' && finite(Number(space.area)) &&
    (!('x' in space) || finite(Number(space.x))) &&
    (!('y' in space) || finite(Number(space.y)))
  )) throw new Error('Los recintos del proyecto no tienen un formato válido.');
  if (!plainObject(data.matrix) || Object.values(data.matrix).some(value => ![0,1,2,3].includes(value))) {
    throw new Error('Las relaciones de la matriz no tienen un formato válido.');
  }
  if (data.floorPlanProposals !== undefined && !Array.isArray(data.floorPlanProposals)) {
    throw new Error('Las propuestas de planta no tienen un formato válido.');
  }
  if (data.topologyNodes !== undefined && !Array.isArray(data.topologyNodes)) {
    throw new Error('Las posiciones de burbujas no tienen un formato válido.');
  }
  if (data.customPalette != null && (!plainObject(data.customPalette) || !plainObject(data.customPalette.zones))) {
    throw new Error('La paleta del proyecto no tiene un formato válido.');
  }
  const project={};
  for (const field of PROJECT_FIELDS) if (Object.hasOwn(data,field)) project[field]=data[field];
  if (!['spaces','matrix','diagram','flowdiagram','floorplan','print'].includes(project.activeTab)) project.activeTab='spaces';
  if (typeof project.projectName !== 'string') project.projectName='Mi proyecto';
  return {data:project,savedAt:typeof input.savedAt === 'string'?input.savedAt:null};
}

export function makeProjectEnvelope(data) {
  const filtered={};
  for(const field of PROJECT_FIELDS) if (Object.hasOwn(data,field)) filtered[field]=data[field];
  const envelope={format:PROJECT_FORMAT,version:PROJECT_VERSION,savedAt:new Date().toISOString(),data:filtered};
  validateProjectEnvelope(envelope);
  return envelope;
}

export function saveProjectToBrowser(data, storage=globalThis.localStorage) {
  const envelope=makeProjectEnvelope(data);
  if (!storage) throw new Error('El navegador no permite utilizar el almacenamiento local.');
  try {
    storage.setItem(PROJECT_STORAGE_KEY,JSON.stringify(envelope));
  } catch {
    throw new Error('No se pudo guardar en este navegador. Comprueba el espacio disponible o exporta una copia JSON.');
  }
  return envelope.savedAt;
}

export function loadProjectFromBrowser(storage=globalThis.localStorage) {
  try {
    if (!storage) return {data:null,savedAt:null,error:'Almacenamiento local no disponible.'};
    const saved=storage.getItem(PROJECT_STORAGE_KEY);
    if (!saved) return {data:null,savedAt:null,error:null};
    return {...validateProjectEnvelope(JSON.parse(saved)),error:null};
  } catch (error) {
    return {data:null,savedAt:null,error:'No se pudo recuperar el guardado anterior: '+(error.message||'archivo inválido')};
  }
}

export function parseProjectFile(text) {
  if (typeof text !== 'string' || text.length>12_000_000) throw new Error('La copia del proyecto supera el tamaño admitido.');
  try { return validateProjectEnvelope(JSON.parse(text)); }
  catch(error) {
    if (error instanceof SyntaxError) throw new Error('El archivo JSON está incompleto o dañado.');
    throw error;
  }
}
