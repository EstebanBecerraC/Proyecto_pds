# CrowdStarter — Release 2

La segunda entrega incorpora gestión del perfil, campañas favoritas e integración continua con Jenkins.

## Novedades

- **Mi perfil (HU-09):** consulta y edición de nombre y correo, cambio de contraseña y eliminación de cuenta con confirmación. La eliminación se bloquea cuando existen campañas activas y conserva los aportes mediante anonimización.
- **Mis favoritas (HU-10):** guardado y eliminación de campañas activas, selección privada por usuario y persistencia entre sesiones.
- **Integración continua:** pipeline Jenkins en Azure que obtiene el código, instala dependencias, ejecuta pruebas, compila el frontend y conserva reportes y artefactos.
- **Integraciones:** webhook GitHub → Jenkins, estados de commits en GitHub y notificaciones finales en Discord.

## Validación

| Entorno | Resultado |
|---|---|
| Local, commit `c684be0` | 137 pruebas Bun, 14 escenarios Cypress y compilación aprobados. |
| Jenkins #10, commit `15613b6` | Ejecución automática exitosa después del merge de HU10 en develop. |

Los 14 escenarios Cypress se distribuyen en HU05 (6), HU09 (4) y HU10 (4). El [índice de evidencias](evidencias/entrega-2/README.md) contiene las capturas de Jenkins, GitHub y Discord y las impresiones PDF de las funcionalidades. Incluye una transcripción de la tabla Cypress para facilitar su lectura.

[Jenkins #10](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/10/) requiere autenticación; las ocho evidencias están disponibles en el repositorio.

## Instalación y datos

La instalación y ejecución se describen en [README.md](../README.md). HU10 no agrega dependencias. Al iniciar la API, se crean la tabla favorites y los campos de perfil necesarios sin requerir una base vacía.

SQLite conserva los datos en `data/app.sqlite` por defecto; `DATABASE_PATH` permite seleccionar otra ubicación. Las pruebas E2E de Jenkins utilizan una base temporal separada.

## Alcance

- El pipeline genera `dist/` y conserva artefactos; no despliega permanentemente frontend, API ni base de datos.
- Los aportes utilizan el flujo simulado de la aplicación.
- Las campañas canceladas se ocultan de las favoritas de otros usuarios.
- La lista de favoritas no tiene paginación.
- Los escenarios E2E cubren HU05, HU09 y HU10.

## Documentación y demostración

- [Entrega 2 y arquitectura](ENTREGA-2.md).
- [Operación de Jenkins](CI-CD.md).
- [HU-09](../HU-09.md) y [HU-10](../HU-10.md).
- [Registro de cambios](../CHANGELOG.md).
- [Evidencias](evidencias/entrega-2/README.md).
- [Cápsula de entrega 2](https://youtu.be/Fn5n3GNrePk).
