# Registro de cambios

## Entrega 2

Cambios respecto a `v1.0-entrega1`. Las funcionalidades de esta entrega se integraron en `develop` mediante `15613b6`; la documentación y las evidencias se incorporaron mediante `4aa3fef`.

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
- [Jenkins #10](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/10/) exitoso tras el merge, con evidencia de disparo automático, pruebas, estado GitHub y notificación Discord.
- Seis capturas PNG y dos impresiones PDF revisadas, con tabla Cypress transcrita.
- [Video de entrega 2](https://youtu.be/Fn5n3GNrePk) incorporado a la documentación.

## v1.0-entrega1

Versión anterior identificada por el tag `v1.0-entrega1`. Consultar las historias HU-00 a HU-08 y el historial del repositorio para su alcance.
