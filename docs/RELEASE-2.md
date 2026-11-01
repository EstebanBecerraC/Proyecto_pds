# Borrador de notas — CrowdStarter 2.0.0

Estado: preparación. El tag `v2.0.0` y la GitHub Release aún no se han publicado. Estas notas deben completarse antes de publicarlas.

## Novedades

- **Mi perfil (HU-09):** consulta y edición de datos, cambio de contraseña y eliminación con confirmación. Se impide eliminar cuentas con campañas activas y se conservan sus aportes.
- **Mis favoritas (HU-10):** guardar y quitar campañas activas, consultar una selección personal y recuperarla entre sesiones.
- **Integración continua:** Jenkins en Azure ejecuta pruebas, compila y conserva artefactos tras cambios en develop. GitHub muestra el estado y Discord recibe el resultado.

## Validación disponible

- Revisión local del commit `c684be0`: 137 pruebas Bun, 14 escenarios Cypress y build aprobados.
- Integración de HU10 en develop: `15613b6`.
- [Jenkins #10](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/10/) posterior al merge: éxito confirmado por el equipo; requiere autenticación.
- [Índice de evidencias](evidencias/entrega-2/README.md).

Antes de publicar, agregar también el commit final elegido y la ejecución que respalda esa versión si difiere de la funcionalidad evaluada.

## Instalación y datos

Seguir [README.md](../README.md). No se agregan dependencias para HU10. Al iniciar la API se crean la tabla favorites y los campos de perfil necesarios sin requerir una base vacía. Conservar una copia del archivo SQLite antes de actualizar una instalación con datos.

## Alcance y límites

- El pipeline genera dist y conserva artefactos; no despliega permanentemente frontend, API ni base de datos.
- Los aportes utilizan el flujo simulado de la aplicación.
- Las favoritas canceladas se ocultan a otros usuarios; la lista no tiene paginación.
- Los 14 escenarios E2E cubren HU05, HU09 y HU10.
- Jenkins requiere una cuenta autorizada para consultar sus ejecuciones.

## Documentación

- [Entrega 2 y arquitectura](ENTREGA-2.md).
- [Operación de Jenkins](CI-CD.md).
- [HU-09](../HU-09.md) y [HU-10](../HU-10.md).
- [Cambios de la versión](../CHANGELOG.md).
- [Video de entrega 2](https://youtu.be/Fn5n3GNrePk).

## Lista previa a publicación

- [ ] Integrar la documentación y revisar sus enlaces.
- [x] Incorporar y revisar seis capturas PNG y dos PDF accesibles al evaluador.
- [x] Incorporar el resumen Cypress de Jenkins #10 y transcribir su tabla para facilitar la lectura.
- [x] Agregar el [video de entrega 2](https://youtu.be/Fn5n3GNrePk).
- [ ] Confirmar que el video puede reproducirse sin solicitar acceso.
- [ ] Revisar e integrar la versión estable en main.
- [ ] Identificar el SHA final y su validación.
- [ ] Crear el tag v2.0.0 y publicar las notas completas en GitHub Releases.

Al crear la release, convertir los enlaces relativos de estas notas en enlaces a archivos del tag definitivo para que funcionen desde GitHub Releases.
