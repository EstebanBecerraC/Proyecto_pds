# Evidencias — Entrega 3

## Ejecuciones identificadas

| Ejecución | Commit | Resultado |
|---|---|---|
| [Jenkins #21](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/21/) | `08c66ff` | Inicio por GitHub push, resultado exitoso y notificación Discord SUCCESS. |
| [Jenkins #22](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/22/) | `3131229` | Prueba E2E intencionalmente fallida y notificación Discord FAILURE. |

Las siete capturas se revisaron visualmente el 19 de noviembre de 2026. El panel de Jenkins requiere autenticación y su historial está sujeto a retención. Los archivos de esta carpeta permiten revisar las evidencias sin acceder al panel.

## Archivos y alcance

| Archivo | Qué acredita | Alcance |
|---|---|---|
| [01 — Resumen Jenkins](01-jenkins-resumen.png) | Ejecución #21 con indicador verde y artefactos disponibles. | No muestra por sí sola el SHA ni el desglose E2E. |
| [02 — Disparo automático](02-disparo-automatico.png) | Consola de #21: `Started by GitHub push by EstebanBecerraC`, repositorio y agente. | Se capturó al inicio; el resultado final se acredita con 01 y 05. |
| [03 — Pruebas Bun](03-pruebas-bun.png) | #21: 141 aprobadas, 0 fallidas, 870 expectativas y 14 archivos. | Corresponde a la regresión Bun. |
| [04 — Pruebas E2E](04-pruebas-e2e.png) | Consola de #21 con `All specs passed!`. | Los códigos ANSI dificultan leer las columnas; el log descargado contiene el resumen legible. |
| [05 — Discord: éxito](05-discord-exito.png) | SUCCESS de crowdstarter-ci #21, SHA `08c66ffde07015970ec8749f902e1a23857c1964` y enlace. | Identifica el commit evaluado y el resultado notificado. |
| [06 — Jenkins: fallo](06-jenkins-fallo.png) | #22 con indicador rojo y artefactos de la ejecución fallida. | No muestra la aserción fallida; la prueba temporal se conserva en el historial Git. |
| [07 — Discord: fallo](07-discord-fallo.png) | FAILURE de crowdstarter-ci #22, SHA `313122920dd657e24bfa1433e2cece09bad9da6c` y enlace. | Permite relacionar el aviso con la ejecución y el cambio controlado. |
| [Log Cypress de #21](reportes/cypress.log.txt) | Cuatro archivos E2E, 20 casos aprobados, cero fallidos y resumen final. | El log no incorpora el número de Jenkins; se identifica como el artefacto descargado de #21 por el equipo y concuerda con su resumen de consola. |

Las fechas y horas visibles corresponden a la zona horaria de cada interfaz. No se utiliza la diferencia de horas entre capturas como indicador de ejecuciones distintas.

## Resumen legible de Cypress

Transcripción del bloque final del log descargado:

| Archivo | Duración | Casos | Aprobados | Fallidos | Pendientes | Omitidos |
|---|---|---:|---:|---:|---:|---:|
| E3-flujos-criticos.cy.js | 00:16 | 6 | 6 | 0 | 0 | 0 |
| HU05-editar-campana.cy.js | 00:21 | 6 | 6 | 0 | 0 | 0 |
| HU09-gestionar-perfil.cy.js | 01:22 | 4 | 4 | 0 | 0 | 0 |
| HU10-campanas-favoritas.cy.js | 00:16 | 4 | 4 | 0 | 0 | 0 |
| **Total indicado por Cypress** | **02:16** | **20** | **20** | **0** | **0** | **0** |

El log expresa con guiones las columnas sin casos; en esta tabla se muestran como cero. Las duraciones individuales están redondeadas y se conserva el total indicado por Cypress.

## Fallo controlado y restauración

El [commit 3131229](https://github.com/EstebanBecerraC/Proyecto_pds/commit/3131229) agregó temporalmente `E3-fallo-controlado.cy.js`. La prueba abría la aplicación y esperaba el texto inexistente `E3_FALLO_CONTROLADO_INTENCIONAL`. Para esa ejecución, el pipeline seleccionaba únicamente ese archivo mediante `--spec`.

Las capturas 06 y 07 acreditan el resultado fallido y su notificación. No corresponden a un defecto funcional descubierto en la aplicación: el fallo fue provocado para comprobar la propagación del resultado E2E.

El [commit c4a1ad9](https://github.com/EstebanBecerraC/Proyecto_pds/commit/c4a1ad9) revirtió el cambio temporal y restauró la suite normal. El equipo confirmó la recuperación posterior. Esta carpeta contiene capturas de #21 y #22; no incluye una captura adicional de la recuperación.

La descripción de los 20 escenarios normales está en [PRUEBAS.md](../PRUEBAS.md).
