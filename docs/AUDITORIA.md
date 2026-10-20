# Auditoría inicial — Arqui Fácil

Fecha: 20 de octubre de 2026. Revisadas las 829 líneas del archivo recibido. Las referencias de líneas de esta auditoría corresponden a `original/matriz_y_diagrama_generativo.tsx`, no a la copia rediseñada.

El archivo es un componente React escrito en JSX con extensión `.tsx`; necesita React, lucide-react y las clases de Tailwind. No es una página HTML que pueda abrirse directamente. El repositorio estaba vacío: se añadió el proyecto ejecutable sin reemplazar trabajo existente.

La revisión posterior centrada en la matriz triangular y la navegación, con correcciones de los gestos de cámara, está en [REVISION_DIAGRAMAS.md](REVISION_DIAGRAMAS.md). Los hallazgos de esta auditoría general sobre el motor y los datos siguen pendientes.

## Qué existe

| Módulo | Comportamiento actual |
| --- | --- |
| Programa | Alta, edición y eliminación de espacios; áreas, macrozonas, subzonas e importación de Excel con mapeo. |
| Matriz | Relaciones simétricas 0/1/3 y representación triangular o cuadrada. |
| Topología | Simulación de fuerzas, masas orgánicas, arrastre, fijación, zoom y controles de texto. |
| Relaciones | Cajas desplazables y redimensionables, enlaces ortogonales y visualización de recorridos. |
| Plantas | Partición rectangular BSP y búsqueda evolutiva con seis resultados. |
| Láminas | Paletas, extracción de colores de una imagen, vistas previas y exportación PDF/PNG/JPG. |

## Hallazgos prioritarios

| Prioridad | Hallazgo y evidencia | Efecto / corrección propuesta |
| --- | --- | --- |
| Crítica | El cruce del motor selecciona cada posición de uno de dos padres sin mantener una permutación (líneas 55–58). | Repite ambientes y omite otros. Usar cruce de permutaciones y validar que cada resultado contenga exactamente una vez todos los ID. |
| Crítica | El contenedor usa el área inicial, pero los hijos del cruce pueden contener otras sumas de áreas (líneas 48, 58). | Las superficies rotuladas dejan de corresponder a la geometría. Validar conservación de áreas e integridad del programa antes de puntuar. |
| Alta | Siete claves de la matriz inicial no están ordenadas; todos los lectores ordenan los ID (líneas 87–89 y 172). | Solo se leen 3 de las 10 relaciones declaradas. Normalizar las claves y centralizar su creación. |
| Alta | No hay persistencia: el estado del proyecto solo existe en `useState` (líneas 70–116). | Recargar pierde el trabajo. Se propone guardado local y un archivo de proyecto descargable, pendientes de autorización. |
| Alta | La supuesta generación por IA devuelve siempre la misma clínica e ignora el texto (líneas 246–255). | Cualquier descripción produce el mismo programa y reemplaza el trabajo. En la propuesta visual se identifica como demo; una IA real requiere implementación posterior. |
| Alta | “Resolver con IA” asigna números al azar (líneas 347–361). | No analiza la función arquitectónica. Ahora se identifica como matriz aleatoria de demostración. |
| Alta | Áreas negativas o cero se aceptan en edición, alta e importación (líneas 170, 196, 324). | Pueden producir raíces inválidas, divisiones por cero y geometría no finita. Validar áreas finitas mayores que cero y rechazar datos inválidos con mensajes por fila. |
| Alta | PDF: tres vistas seleccionadas generan cinco páginas A3 en la prueba (líneas 721–726). | La descarga no equivale a una lámina correcta. Corregir dimensiones y saltos de página, y verificar páginas, escala y recortes. |
| Alta | La topología actualiza `x/y` del mismo objeto usado por las cajas; la exportación consulta ese mismo objeto (líneas 505, 615 y 713). | Se mezclan posiciones de dos diagramas. Separar coordenadas y sincronizar explícitamente la topología representada y exportada. |
| Alta | No hay `try/catch/finally` en exportación (líneas 715–732). | Un fallo de renderizado o descarga puede dejar los botones bloqueados. Restaurar el estado y los estilos incluso con error. |
| Media | PDF, PNG y JPG no comparten el mismo manejo de estilos y visibilidad (líneas 721–729). | PNG/JPG modifican nodos vivos y los ocultan después. Conviene exportar copias aisladas y restaurar estado. |
| Media | Borrar un espacio elimina relaciones por coincidencia parcial con `includes(id)` (línea 169). | Un ID contenido en otro puede eliminar relaciones ajenas. Comparar los extremos de la relación. |
| Media | Los colores de subzona son `hsl(...)`, pero algunas vistas añaden `30` o `15` suponiendo un hexadecimal (líneas 125, 330, 383). | Se producen colores CSS inválidos. Usar una función de transparencia compatible con ambos formatos. |
| Media | Importar áreas usa `parseFloat` y un valor de respaldo de 10 (línea 196). | `12,5` se lee como 12, y valores vacíos o cero pueden convertirse silenciosamente en 10. Normalizar formatos y prevalidar. |
| Media | Las cabeceras de Excel se infieren de la primera fila de datos (línea 185). | Columnas vacías en la primera fila pueden perderse del mapeo. Leer una fila de cabecera explícita. |
| Media | La simulación de topología ejecuta comparaciones por pares y actualiza React en cada fotograma (líneas 426–483). | El coste crece aproximadamente con el cuadrado del número de ambientes. Medir límites y considerar detenerse al converger o usar un worker. |
| Media | Los resultados de plantas no se invalidan al cambiar el programa o la matriz (líneas 92 y 695). | Se pueden seguir mostrando propuestas calculadas sobre un proyecto anterior. Asociar resultados a una revisión del proyecto. |
| Media | El flujo de circulación coloca flechas según el orden del array, sin dirección de recorrido definida (línea 646). | La flecha puede interpretarse como una decisión funcional que el modelo no contiene. Distinguir conexión de recorrido dirigido. |
| Media | El objetivo evolutivo recompensa adyacencias, pero no impone puertas, acceso a cada recinto, muros, medidas mínimas o normativa (líneas 27–37). | Los resultados son esquemas conceptuales. No deben ofrecerse como planos construibles ni cumplimiento normativo. |
| Media | El ejemplo usa nombres en varios idiomas; varios controles carecían de nombre accesible y el borrado dependía del hover. | La propuesta añade etiquetas a controles esenciales, foco visible y borrado visible en pantallas táctiles. Queda pendiente una auditoría completa de accesibilidad y manejo de diagramas con teclado. |
| Media | Bibliotecas remotas se inyectaban sin estado de error ni limpieza (líneas 128–134). | PDF e imágenes se empaquetaron localmente. SheetJS sigue bloqueado y debe actualizarse y empaquetarse antes de publicar. |

## Reproducción de los errores del motor

`npm run audit:original` ejecuta el motor del archivo recibido en un contexto aislado con semilla 1, los mismos 40 individuos, 50 generaciones, tasa 0,2 y seis resultados.

- Programa esperado: **11 ambientes distintos / 1760 m²**.
- Resultado reproducido: **4 ambientes distintos**, repetidos hasta completar 11 entradas; suma de áreas rotuladas **740 m²** dentro de un contenedor de **1760 m²**.
- Los seis resultados de esa ejecución son iguales; el puntaje alto no detecta la pérdida del programa.
- Relaciones ignoradas: `hall-biblio`, `hall-esc1`, `recep-cine`, `recep-cafe`, `recep-exhib`, `exhib-audi`, `exhib-esc2`.

El JSON de esa ejecución está en [evidence/engine-audit.json](evidence/engine-audit.json). Las pruebas en navegador también observaron avisos de claves React duplicadas al generar plantas. Estos hallazgos siguen pendientes: el rediseño no corrige el algoritmo.

## Alcance de la primera propuesta visual

Se tomaron como referencia las dos capturas facilitadas: fondo claro, contraste negro, jerarquía editorial y una figura técnica de líneas. No se descargó ni copió el código del sitio enlazado. La figura es una ilustración SVG decorativa, no un resultado del generador.

Se añadió una estructura Vite ejecutable, navegación revisada, resumen del programa con datos reales, fuentes locales, adaptación a móvil y etiquetas honestas para las simulaciones. Se conserva la lógica funcional de los módulos. No se incorporaron servicios de IA, cuentas ni cobros.

## Funciones propuestas — no implementadas

| Orden | Propuesta | Valor para el usuario | Decisión pendiente |
| --- | --- | --- | --- |
| 1 | Guardado local y abrir/descargar proyecto JSON con versión de formato. | Evitar pérdida de trabajo y transportar proyectos. | Aprobar alcance y advertencia de que un archivo local no es copia en la nube. |
| 2 | Deshacer/rehacer y confirmación de reemplazos. | Explorar con menos riesgo de borrar trabajo. | Aprobar historial y operaciones cubiertas. |
| 3 | Resumen de áreas por zona, porcentaje de circulación y objetivo de superficie. | Detectar desviaciones del programa. | Definir criterios; no afirmar cumplimiento normativo automático. |
| 4 | Informe de relaciones cumplidas, faltantes y conflictos de cada alternativa. | Explicar por qué una distribución es mejor. | Aprobar indicadores y criterios de evaluación. |
| 5 | Exportación vectorial SVG y láminas con título, escala y leyenda. | Facilitar edición y presentación profesional. | Confirmar formatos; DXF sería una fase adicional. |
| 6 | Proyectos en la nube, versiones y colaboración. | Continuar en otros dispositivos y compartir trabajo. | Elegir autenticación, almacenamiento y política de datos. |
| 7 | IA real con programa editable, referencias y explicación de sugerencias. | Asistir el análisis de necesidades. | Acordar proveedor, coste, privacidad y límites antes de integrar. |

## Publicación e ingresos: secuencia recomendada

1. Corregir integridad de relaciones, áreas, motor y exportación. Incorporar el guardado que se apruebe.
2. Validar con proyectos reales de arquitectos y estudiantes; comprobar escritorio, móvil, teclado y exportaciones.
3. Publicar una beta en alojamiento estático con HTTPS y dominio; los servicios con claves privadas requerirán backend.
4. Evaluar qué ahorra tiempo de forma medible. Una base gratuita y planes de pago por proyectos en la nube, versiones o colaboración son opciones para investigar, no funciones añadidas ni ingresos garantizados.

Antes de cobrar harán falta soporte, privacidad, condiciones de uso y una descripción precisa de los resultados conceptuales. El siguiente paso recomendado es fiabilidad y conservación del trabajo; el modelo comercial se decidirá después de validar el producto.
