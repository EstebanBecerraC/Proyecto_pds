# Evidencias de entrega 2

## Versión y fuentes

- Integración: [PR #5](https://github.com/EstebanBecerraC/Proyecto_pds/pull/5), merge [15613b6](https://github.com/EstebanBecerraC/Proyecto_pds/commit/15613b603612cdfce45821b20840aa4b1e01c31c) en develop.
- Pipeline: [Jenkins #10](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/10/), requiere autenticación.
- Revisión local previa: commit `c684be0`, 137 pruebas Bun y 14 escenarios Cypress aprobados, build correcto.
- Evidencias incorporadas: seis PNG y dos PDF. Los archivos se revisaron visualmente el 1 de noviembre de 2026.
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
| [08 — Pruebas Cypress](08-jenkins-10-cypress.png) | Resumen final: All specs passed!, 14 escenarios y 14 aprobados. | Los códigos ANSI dificultan leer la tabla; se transcribe debajo. |

Las pruebas automatizadas referenciadas en [Entrega 2](../../ENTREGA-2.md) complementan las impresiones de interfaz. Las fechas y horas visibles son las de cada interfaz capturada.

## Lectura del resumen Cypress

La [captura 08](08-jenkins-10-cypress.png) contiene códigos de formato ANSI que Jenkins muestra como texto. Por ese formato, las columnas y los bordes de la tabla no se distinguen con claridad. No son mensajes de fallo de las pruebas.

El bloque `(Run Finished)`, a las **13:37:45**, y la línea **`All specs passed!`** se transcriben a continuación a partir del log de esa ejecución:

| Archivo | Escenarios | Aprobados | Fallidos | Pendientes | Omitidos |
|---|---:|---:|---:|---:|---:|
| HU05-editar-campana.cy.js | 6 | 6 | 0 | 0 | 0 |
| HU09-gestionar-perfil.cy.js | 4 | 4 | 0 | 0 | 0 |
| HU10-campanas-favoritas.cy.js | 4 | 4 | 0 | 0 | 0 |
| **Total** | **14** | **14** | **0** | **0** | **0** |

La duración total indicada es **01:59**. Cypress representa con guiones las columnas sin casos; aquí se expresan como cero. Esta tabla es una transcripción para facilitar la lectura y no reemplaza la captura original.

## Cápsula de video

- [Cápsula de entrega 2](https://youtu.be/Fn5n3GNrePk), enlace proporcionado por el equipo. Verificar su reproducción sin solicitar acceso antes de entregar.

Los XML JUnit son opcionales si la captura muestra los resultados necesarios. Antes de publicar nuevos archivos, revisar que no expongan tokens, webhooks privados, contraseñas o datos personales reales.

Jenkins conserva 15 ejecuciones y artefactos de las últimas 5. Conservar copias de la evidencia relevante antes de que la retención la elimine.
