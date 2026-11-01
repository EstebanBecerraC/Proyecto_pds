# Evidencias de entrega 2

## Versión y fuentes

- Integración: [PR #5](https://github.com/EstebanBecerraC/Proyecto_pds/pull/5), merge [15613b6](https://github.com/EstebanBecerraC/Proyecto_pds/commit/15613b603612cdfce45821b20840aa4b1e01c31c) en develop.
- Pipeline: [Jenkins #10](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/10/), requiere autenticación.
- Revisión local previa: commit `c684be0`, 137 pruebas Bun y 14 escenarios Cypress aprobados, build correcto.
- Evidencias incorporadas: cinco PNG y dos PDF. Los archivos se revisaron visualmente el 1 de noviembre de 2026.
- Las impresiones de aplicación usan la cuenta de demostración Jose Juan, con datos ficticios. Son evidencia de interfaz, no reportes automatizados.

El evaluador puede abrir los archivos de esta carpeta sin una cuenta de Jenkins. La disponibilidad del enlace al pipeline depende de los permisos y la retención del servidor.

## Archivos revisados

| Archivo | Qué acredita | Límites |
|---|---|---|
| [01 — Resumen Jenkins](01-jenkins-10-resumen.png) | Ejecución #10 exitosa, artefactos, SHA `15613b603612cdfce45821b20840aa4b1e01c31c`, rama develop y resultado sin fallas. | No desglosa todos los escenarios. |
| [02 — Disparo automático](02-jenkins-10-disparo.png) | En #10 se destaca «Started by GitHub push by EstebanBecerraC». | Es la misma ejecución de la captura 01. |
| [03 — Pruebas Bun](03-jenkins-10-pruebas.png) | Consola: 137 aprobadas, 0 fallidas y 851 expectativas en 13 archivos. | No muestra el resumen Cypress. |
| [04 — Estado GitHub](04-github-estado.png) | Merge de PR #5 y marca verde en su historial. | No muestra el detalle del contexto ni su enlace al pipeline. |
| [05 — Notificación Discord](05-discord.png) | SUCCESS del trabajo crowdstarter-ci #10 y enlace a esa ejecución. | El aviso muestra «Commit: no disponible»; el SHA se acredita con la captura 01. |
| [06 — Mi perfil (PDF)](06-hu09-perfil.pdf) | Nombre Jose Juan, correo de prueba, campos de contraseña y sección de eliminación. | Dos páginas; es una impresión de la pantalla, no demuestra por sí sola el guardado o la eliminación. |
| [07 — Mis favoritas (PDF)](07-hu10-favoritas.pdf) | Campaña activa «Huerto comunitario de Jose Juan», categoría, meta, porcentaje y acción para quitar de favoritas. | Una página; no demuestra por sí sola la persistencia entre sesiones. |

Las pruebas automatizadas referenciadas en [Entrega 2](../../ENTREGA-2.md) complementan las impresiones de interfaz. Las fechas y horas visibles son las de cada interfaz capturada.

## Evidencia complementaria por incorporar

- `08-jenkins-10-cypress.png`: resumen de consola con **14 escenarios Cypress aprobados** (HU05: 6, HU09: 4, HU10: 4), o el reporte JUnit equivalente. La ejecución exitosa se observa en 01 y el equipo confirmó los resultados; falta el desglose E2E entre los archivos adjuntos.
- Cápsula de entrega 2: pendiente de grabar y enlazar.

Los XML JUnit son opcionales si la captura muestra los resultados necesarios. Antes de publicar nuevos archivos, revisar que no expongan tokens, webhooks privados, contraseñas o datos personales reales.

Jenkins conserva 15 ejecuciones y artefactos de las últimas 5. Conservar copias de la evidencia relevante antes de que la retención la elimine.
