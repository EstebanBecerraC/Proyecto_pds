# Evidencias de entrega 2

## Fuentes y estado

| Evidencia | Referencia | Estado |
|---|---|---|
| Revisión de favoritas | [PR #5](https://github.com/EstebanBecerraC/Proyecto_pds/pull/5), commit `c684be0` | Revisión local: 137 Bun, build y 14 Cypress aprobados. |
| Integración | [Commit 15613b6](https://github.com/EstebanBecerraC/Proyecto_pds/commit/15613b603612cdfce45821b20840aa4b1e01c31c) | Merge en develop confirmado en Git. |
| Pipeline posterior al merge | [Jenkins #10](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/10/) | Ejecución automática exitosa confirmada por el equipo; acceso autenticado. |
| Estado GitHub | Estado del commit integrado, contexto `ci/jenkins/crowdstarter` | Confirmado por el equipo; captura pendiente de incorporar. |
| Notificación Discord | Aviso correspondiente a Jenkins #10 | Confirmado por el equipo; captura pendiente de incorporar. |
| Cápsula de entrega 2 | Aún sin enlace | Se prepara después de la documentación. |

El panel de Jenkins requiere permisos. Para evaluación sin acceso, esta carpeta debe incluir copias seleccionadas de los resultados; el enlace privado por sí solo no reemplaza esas evidencias. Este índice todavía no contiene capturas ni XML exportados.

## Archivos por incorporar

| Nombre propuesto | Contenido |
|---|---|
| `01-jenkins-10-resumen.png` | Número de build, resultado y commit evaluado. |
| `02-jenkins-10-disparo.png` | Causa de ejecución automática y checkout de develop. |
| `03-jenkins-10-pruebas.png` | Resultados Bun y Cypress. |
| `04-github-estado.png` | Estado del commit y enlace al pipeline. |
| `05-discord.png` | Aviso de resultado con número de ejecución. |
| `06-hu09-perfil.png` | Perfil con datos de demostración. |
| `07-hu10-favoritas.png` | Guardado y lista de favoritas. |

Exportar los JUnit de la ejecución si se desea conservar evidencia detallada. Registrar junto a cada archivo su fuente, fecha y commit cuando esté disponible. No incluir tokens, webhooks privados, contraseñas ni datos personales reales.

Jenkins conserva solo 15 ejecuciones y artefactos de las últimas 5. Guardar la evidencia de #10 antes de que la retención la elimine.
