# Arqui Fácil — instrucciones de mantenimiento

- Leer README.md, docs/AUDITORIA.md y docs/REVISION_DIAGRAMAS.md antes de modificar código.
- Usar únicamente herramientas gratuitas. No activar facturación, IA de pago, cuentas ni servicios nuevos sin autorización de Teddy.
- Consultar antes de añadir funciones de producto. Se permiten preparación técnica y corrección de errores existentes.
- Conservar docs/original/ sin modificaciones y conservar el trabajo de otras ramas.
- Trabajar en una rama; registrar cambios y resultados reales. No confundir compilación con validación funcional.
- Ejecutar npm ci y npm run build. Para cambios de interfaz, ejecutar las pruebas existentes contra un servidor local si el entorno permite navegador.
- npm run audit:original es un diagnóstico que falla deliberadamente; nunca usarlo como comprobación obligatoria de CI.
- Las plantas son esquemas conceptuales: no afirmar cumplimiento normativo ni calidad constructiva.
- No describir como IA real las demostraciones aleatorias.
- No guardar secretos, node_modules, dist ni datos personales en Git.
- Antes de publicar comprobar que README y la documentación describen las limitaciones vigentes.
- Mantener ROADMAP.md y CHANGELOG.md actualizados para que otra IA pueda continuar.
