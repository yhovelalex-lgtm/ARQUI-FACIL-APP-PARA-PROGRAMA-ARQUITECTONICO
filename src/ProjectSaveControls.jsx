import React, { useRef } from 'react';
import { Download, HardDriveDownload, Upload, Save, CheckCircle2, AlertTriangle } from 'lucide-react';

/** Controles de seguridad del proyecto: el usuario siempre puede descargar su propio archivo. */
export default function ProjectSaveControls({
  projectName, setProjectName, saveStatus, savedAt, onSave, onExport, onImport
}) {
  const inputRef=useRef(null);
  const label=saveStatus==='saved'?'Guardado automáticamente':saveStatus==='saving'?'Guardando…':saveStatus==='error'?'No se pudo guardar':'Cambios pendientes';
  const time=savedAt&&!Number.isNaN(Date.parse(savedAt))?new Date(savedAt).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}):null;
  return <div className="af-project-save" role="group" aria-label="Guardar y recuperar proyecto">
    <label className="af-project-name-field">
      <span className="sr-only">Nombre del proyecto</span>
      <input aria-label="Nombre del proyecto" maxLength="100" value={projectName} onChange={e=>setProjectName(e.target.value)}
        placeholder="Nombre del proyecto" title="Puedes cambiar el nombre del proyecto"/>
    </label>
    <span className={'af-project-status af-project-status-'+saveStatus} role="status" aria-live="polite"
      title={time?'Último guardado local: '+time:label}>
      {saveStatus==='error'?<AlertTriangle size={13}/>:saveStatus==='saved'?<CheckCircle2 size={13}/>:<Save size={13}/>}
      <span>{label}{saveStatus==='saved'&&time?' · '+time:''}</span>
    </span>
    <button type="button" className="af-project-action" onClick={onSave} title="Guardar ahora en este navegador">
      <Save size={14}/> Guardar
    </button>
    <button type="button" className="af-project-action" onClick={onExport} title="Descargar respaldo para abrirlo en otra computadora">
      <HardDriveDownload size={14}/> Descargar copia
    </button>
    <button type="button" className="af-project-action" onClick={()=>inputRef.current?.click()} title="Importar un proyecto de ARQUI-FÁCIL">
      <Upload size={14}/> Abrir copia
    </button>
    <input ref={inputRef} type="file" accept=".json,application/json" className="af-hidden-input"
      aria-label="Seleccionar copia JSON del proyecto" onChange={async event=>{
        const file=event.target.files?.[0];
        event.target.value='';
        if(file)await onImport(file);
      }}/>
  </div>;
}
