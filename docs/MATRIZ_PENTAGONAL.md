# Matriz con puntas integradas y sumatorias

La fila del recinto y el rombo identificador se unen en una sola pieza pentagonal coloreada. Se elimina la columna de rombos con puntos grises. El círculo situado en la punta muestra **Σ**, la suma de los valores de relación de ese recinto: 0 nula, 1 indirecta y 2 directa. La diagonal queda excluida.

La cifra cambia al editar cualquiera de sus relaciones, tanto con el ratón como con Enter o Espacio. Las filas respetan la paleta de zonas seleccionada; la captura en color usa la paleta Bauhaus ya disponible. La paleta inicial Minimalista se conserva.

Los rombos editables encajan directamente entre las puntas de dos recintos, sin una columna intermedia. Se mantienen los modos gráfico, numérico y mixto, la alternativa cuadrada, el desplazamiento horizontal en móvil y la leyenda arrastrable. Las láminas utilizan el mismo componente que la vista de trabajo.

## Coherencia de los datos

Se normalizan las claves de las diez relaciones del ejemplo mediante `relationKey`. Así se recuperan las siete conexiones declaradas que antes no se leían. El valor heredado 3 se sustituye por 2 en la conexión Café–Scène en Direct, de acuerdo con la escala vigente 0/1/2.

El ejemplo suma 19 puntos entre pares y 38 al sumar todas las filas, porque cada relación participa en los dos recintos. Hall muestra Σ = 6 y Reception Σ = 9. Los datos del archivo original archivado permanecen intactos.

## Validación

- `npm run test:matrix`: siete pruebas de geometría, escala y sumatoria.
- `npm run test:matrix-ui`: 27 comprobaciones de interacción, forma, sumas, teclado, paletas, leyenda, móvil y exportación PNG.
- `npm run build`: compilación completada.
- Revisada visualmente la lámina PNG exportada, además de las capturas de la matriz.

La prueba geométrica comprueba que el círculo completo de la suma esté dentro del pentágono y que las filas no tapen los centros de las 55 celdas editables. También se comprueba una matriz de solo dos recintos para verificar la cabecera y el único par de relación.

Evidencia: [matrix-pentagonal.json](evidence/matrix-pentagonal.json). Capturas: [paleta minimalista](previews/matriz-pentagonal.png) y [paleta en color](previews/matriz-pentagonal-color.png).
