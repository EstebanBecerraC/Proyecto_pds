# Registro de cambios

## Release 2 — preparada, aún no publicada

Tag propuesto: `v2.0.0`. La base funcional está integrada en `develop` mediante `15613b6`. La fecha y el commit de publicación se fijarán al crear la release.

### Aplicación

- HU-09: consulta y edición de perfil, cambio de contraseña y eliminación con confirmación y restricción por campañas activas.
- Anonimización de cuentas eliminadas y conservación de aportes.
- HU-10: guardado y eliminación de favoritas desde detalle y lista.
- Persistencia de favoritas por cuenta en SQLite, sin duplicados y respetando privacidad de campañas canceladas.

### Integración continua

- Jenkins en Azure, controlador y agente Docker, acceso HTTPS con Caddy.
- Ejecución automática al integrar cambios en develop.
- Pruebas Bun, build Vite y Cypress con SQLite temporal.
- JUnit, logs y artefactos; estados en GitHub y avisos en Discord.

### Documentación y verificación

- Documento de entrega 2, operación de Jenkins y trazabilidad de HU09/HU10.
- Revisión local: 137 pruebas Bun y 14 E2E aprobadas; compilación correcta.
- Jenkins #10 exitoso tras el merge, confirmado por el equipo.
- Evidencias y cápsula pendientes de completar antes de publicar.

## v1.0-entrega1

Versión anterior identificada por el tag `v1.0-entrega1`. Consultar las historias HU-00 a HU-08 y el historial del repositorio para su alcance.
