# Arqui Fácil

Primera propuesta visual y auditoría de la aplicación de programa arquitectónico. React + Vite. La aplicación original se conserva íntegra en `docs/original/`.

## Ejecutar

Requiere Node.js 22.12 o superior (validado con Node 24.19) y npm.

```sh
npm ci --cache /tmp/arquifacil-npm-cache
npm run dev
```

Vite utiliza el puerto 5173. El proyecto de ejemplo contiene 11 espacios y 1760 m². Los cambios viven únicamente en la sesión del navegador: todavía no existe guardado permanente.

```sh
npm run build
npm run preview
```

`build` genera `dist/`. No se ha desplegado a un alojamiento público.

## Comprobar

Con el servidor de desarrollo activo, ejecutar:

```sh
npm run test:smoke
npm run test:diagrams
```

Usa Chromium del sistema si existe; alternativamente instalarlo con `npx playwright install chromium`. Se pueden configurar `BROWSER_PATH`, `BASE_URL` y `ARTIFACT_DIR`. El resultado y las capturas se escriben por defecto en `/tmp/arquifacil-validation`.

```sh
npm run audit:original
```

Este diagnóstico termina con **código 1** porque reproduce defectos reales del archivo recibido. No es una suite aprobada. No modificar la copia del original para hacerlo pasar.

## Estado y alcance

- Diseño claro, tipografía local, navegación de seis módulos, ilustración arquitectónica vectorial y adaptación del programa a móvil.
- Los algoritmos de relaciones y plantas conservan sus defectos originales, documentados en [la auditoría](docs/AUDITORIA.md).
- Las dos herramientas presentadas como IA en el archivo recibido son simulaciones. Ahora están rotuladas como demostraciones.
- Las exportaciones se empaquetan localmente y se cargan al solicitarlas. El PDF todavía tiene problemas de paginación.
- La importación Excel conserva la dependencia remota original de SheetJS. No está validada: la red actual impide cargar `cdn.sheetjs.com`. No se desactiva la verificación TLS.
- No se han añadido cuentas, pagos, almacenamiento, IA real ni otras funciones de producto. Son propuestas sujetas a aprobación.

Resultados y límites de las pruebas: [VALIDACION.md](docs/VALIDACION.md).

Revisión específica de la matriz triangular, controles de cámara y correcciones de desplazamiento: [REVISION_DIAGRAMAS.md](docs/REVISION_DIAGRAMAS.md).

## Mantenimiento y publicación

Consultar [ROADMAP.md](ROADMAP.md), [CHANGELOG.md](CHANGELOG.md) y [AGENTS.md](AGENTS.md).
La comprobación de GitHub Actions instala dependencias y compila; no certifica el motor ni las exportaciones.

Para Vercel: importar este repositorio, elegir Vite, raíz del repositorio, `npm ci`, `npm run build` y salida `dist`. `vercel.json` fija estos valores. No se requieren variables secretas para la versión actual. Usar Hobby únicamente para este uso personal no comercial y revisar cuotas antes de activar servicios adicionales.

La primera publicación debe considerarse una beta de prueba: no existe guardado permanente y los defectos de la auditoría siguen abiertos. La conexión de ChatGPT a Vercel no implica por sí sola que Vercel tenga acceso al repositorio de GitHub.
