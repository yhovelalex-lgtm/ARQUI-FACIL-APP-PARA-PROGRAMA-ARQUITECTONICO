# Validación de la primera propuesta

Entorno: Node.js 24.19, npm 11.9 y Chromium 154 sobre Linux. Fecha: 20 de octubre de 2026.

## Resultados

| Comprobación | Resultado y límite |
| --- | --- |
| Instalación reproducible | `npm ci --cache /tmp/arquifacil-npm-cache` con lockfile. |
| Compilación de producción | `npm run build` completa; genera `dist/`. |
| Dependencias npm | `npm audit` sin vulnerabilidades conocidas notificadas al ejecutar. No cubre el script remoto de SheetJS ni defectos de aplicación. |
| Navegador | 27 comprobaciones de interfaz completadas: alta, área, borrado, ciclo 0/1/3, dos formas de matriz, controles de topología, arrastre de caja, recorridos y generación de seis tarjetas. La calidad de las plantas no queda validada. |
| Revisión posterior de matriz y navegación | `npm run test:diagrams`: 36 comprobaciones completadas tras corregir la pérdida de desplazamiento y el conflicto entre gestos de cámara y edición. Detalles en [REVISION_DIAGRAMAS.md](REVISION_DIAGRAMAS.md). |
| Puntas pentagonales y sumatorias | Siete pruebas de geometría y sumas, y 27 comprobaciones de interfaz y exportación PNG. Se normalizaron las diez claves de relación del ejemplo. Detalles en [MATRIZ_PENTAGONAL.md](MATRIZ_PENTAGONAL.md). |
| Exportaciones | Se descargaron 1 PDF, 3 PNG y 3 JPG con contenido. Revisada visualmente una página rasterizada del PDF. |
| Calidad del PDF | **Falla**: cinco páginas para tres vistas. No se ha certificado escala, fidelidad de todas las páginas ni impresión profesional. |
| Vista móvil | Programa comprobado a 390 × 844 sin desbordamiento horizontal de la página ni del formulario. Los diagramas y las tablas necesitan navegación propia; no es una auditoría exhaustiva de dispositivos. |
| Motor original | **Falla confirmada**, código de salida 1: siete relaciones ignoradas y propuestas con ambientes repetidos/ausentes. Evidencia con semilla fija en `engine-audit.json`. |
| Excepciones de ejecución | Sin excepciones JavaScript no capturadas durante el recorrido de la interfaz. Sí hay avisos React de claves repetidas al generar plantas, explicados por el defecto del motor. |
| Importación Excel | **No validada**. El proxy devuelve 403 al solicitar `cdn.sheetjs.com`; Chromium también rechaza el certificado de la carga remota en este entorno. Se conserva la verificación TLS. |
| Publicación web | No realizada. No hay dominio público, autenticación, almacenamiento ni sistema de cobros. |

Las capturas de escritorio y móvil están en `previews/`. La evidencia del recorrido de navegador está en `evidence/smoke-results.json`. Una ejecución de interfaz aprobada no convierte los fallos matemáticos ni el PDF en resultados correctos.

## Configuración reutilizable

Se guardan en el borrador del entorno las instrucciones de instalación y arranque, y se añade `cdn.sheetjs.com` a los dominios personalizados permitidos. Guardar el borrador no aplica la red, ejecuta comandos ni publica. El usuario debe revisar y guardar los cambios en la configuración del entorno y publicar el entorno cuando corresponda. Eso es distinto de desplegar la aplicación a una web pública.

Tras un cambio efectivo de red o confianza de certificados hay que volver a comprobar SheetJS e importar un archivo real antes de declarar Excel operativo. No se ha solicitado ninguna clave ni se ha debilitado la comprobación de certificados.
