# Entrega 3 — CrowdStarter

Esta entrega amplía las pruebas de interfaz de CrowdStarter y las integra en el pipeline Jenkins. Cypress comprueba los flujos críticos contra el frontend Vue compilado, la API Bun y SQLite. Los resultados se publican como reportes y artefactos; Discord informa el resultado del trabajo y el commit evaluado.

## Documentación

- [Escenarios y cobertura](PRUEBAS.md).
- [Evidencias y resultados](evidencias/README.md).
- [Código de las pruebas](../../cypress/e2e/).
- [Pipeline](../../Jenkinsfile).
- [Ejecutor E2E](../../scripts/run-e2e.mjs).

## Alcance

Se conservan los 14 escenarios de edición de campañas, gestión de perfil y favoritas de la entrega anterior, y se agregan 6 escenarios de autenticación, navegación, CRUD de campañas, validaciones y búsqueda. La suite normal contiene **20 pruebas E2E distribuidas en cuatro archivos**.

La regresión Bun contiene **141 pruebas** de validaciones, API, componentes y helpers, incluidas cuatro pruebas del envío a Discord. Estas últimas verifican los mensajes de éxito y fallo, la identificación del commit y el tratamiento de errores sin enviar mensajes reales.

Cypress y Discord son las herramientas aceptadas para esta entrega. Los aportes mantienen el funcionamiento simulado de la aplicación. El pipeline compila el frontend y conserva artefactos; no despliega permanentemente la aplicación.

## Herramientas

| Herramienta | Función |
|---|---|
| Bun 1.4.2 | Dependencias, API, SQLite y pruebas Bun. |
| Vue y Vite | Interfaz y compilación de producción. |
| Cypress 16.1.1 | Pruebas E2E con Electron en modo headless. |
| Node.js | Ejecutor E2E y scripts de integración. En local se comprobó Node.js 24.22.3. |
| Jenkins | Ejecución del pipeline y publicación de reportes. |
| Discord | Notificación final de éxito o fallo. |

Las dependencias exactas del proyecto están fijadas en [bun.lock](../../bun.lock). SQLite está integrado en Bun y no requiere un servicio independiente.

## Ejecución local

Desde la raíz del repositorio, con Bun y Node.js disponibles:

```powershell
bun install --frozen-lockfile
bunx --no-install cypress install
bunx --no-install cypress verify
bun test
```

Para ejecutar toda la suite E2E con un entorno aislado:

```powershell
bun run test:e2e:ci
```

Este comando compila el frontend en modo producción, crea una base SQLite temporal, inicia la API y Vite preview, espera que estén disponibles y ejecuta Cypress sin navegador visible. Al finalizar detiene los servicios y elimina la base temporal, tanto en éxito como en fallo. No utiliza `data/app.sqlite`.

No es necesario iniciar manualmente API o frontend. Los puertos deben estar libres antes de ejecutar el comando. Los mismos comandos de Bun se utilizan en el agente Linux; [ci-e2e.sh](../../scripts/ci-e2e.sh) también delega en el ejecutor Node.js.

### URL y puertos

El ejecutor lee `CYPRESS_BASE_URL` y, si no está definida, `BASE_URL`. El valor por defecto es `http://localhost:5173`. `PORT` determina el puerto de la API, por defecto `3000`.

Para reproducir la configuración E2E de Jenkins en PowerShell:

```powershell
$env:BASE_URL = 'http://127.0.0.1:5173'
$env:CYPRESS_BASE_URL = $env:BASE_URL
$env:PORT = '3000'
bun run test:e2e:ci
```

En Bash:

```bash
BASE_URL=http://127.0.0.1:5173 CYPRESS_BASE_URL=http://127.0.0.1:5173 PORT=3000 bun run test:e2e:ci
```

Se pueden seleccionar otros puertos sin modificar las pruebas. El ejecutor aislado admite HTTP con `localhost` o `127.0.0.1`, y utiliza el mismo origen en el frontend, Cypress y la API. La base temporal y `APP_ORIGIN` se configuran automáticamente para los procesos de esa ejecución.

Para ejecutar solo los seis escenarios incorporados:

```powershell
bun run test:e2e:ci --spec cypress/e2e/E3-flujos-criticos.cy.js
```

`bun run test:e2e` ejecuta Cypress contra servicios ya iniciados y utiliza sus datos. Para mantener el aislamiento, la ejecución reproducible de esta entrega es `bun run test:e2e:ci`.

## Datos de prueba y aislamiento

Cada ejecución del ejecutor comienza con una base SQLite nueva. Las tablas se crean al iniciar la API. Los escenarios registran usuarios y crean las campañas necesarias; no dependen de cuentas personales ni de una base precargada.

Los correos de prueba incluyen identificadores de ejecución. Los helpers limpian cookies y reinician la aplicación para separar sesiones. En HU05 se crea una campaña antes de cada caso. La imagen utilizada es el fixture PNG del repositorio y los formularios se envían a la API real.

El límite de autenticación permanece habilitado. Cuando la API responde 429, el helper respeta `Retry-After` y reintenta una sola vez. Los errores inesperados hacen fallar la prueba.

## Integración con Jenkins

El trabajo `crowdstarter-ci` obtiene [Jenkinsfile](../../Jenkinsfile) del repositorio y sigue `*/develop`. Un push en esa rama puede iniciar la ejecución mediante el webhook de GitHub. Las ramas de trabajo y las PR no tienen una validación independiente en este trabajo.

| Etapa | Ejecución |
|---|---|
| Obtener código | Limpieza del workspace y `checkout scm`. |
| Estado pendiente | Publicación del estado del commit en GitHub. |
| Instalar dependencias | `bun install --frozen-lockfile`. |
| Pruebas Bun | Regresión y reporte `reports/entrega-3/bun.xml`. |
| Build | Compilación del frontend. |
| Preparar Cypress | Instalación y verificación del binario. |
| Pruebas E2E | `bun run test:e2e:ci`, con ambas variables de URL fijadas a `http://127.0.0.1:5173`. El ejecutor también compila antes de iniciar sus servicios. |
| Acciones finales | Publicación JUnit, archivo de artefactos, estado final en GitHub y notificación a Discord. |

Cypress devuelve un código distinto de cero si falla una prueba. El ejecutor conserva ese resultado y el paso `sh` marca el pipeline como fallido. Los reportes y artefactos disponibles se recopilan también en ejecuciones fallidas.

Jenkins impide ejecuciones concurrentes del trabajo, aplica un límite de 25 minutos y conserva 15 ejecuciones y los artefactos de las 5 más recientes. El agente utiliza la etiqueta `crowdstarter`.

## Reportes y notificaciones

La salida generada de esta entrega se agrupa en `reports/entrega-3/`:

- `bun.xml`: resultados Bun generados en Jenkins.
- `cypress-*.xml`: reportes JUnit de cada archivo E2E.
- `build.log`, `api.log`, `frontend.log` y `cypress.log`.
- `screenshots/`: capturas automáticas ante fallos.

Jenkins publica los resultados de `reports/**/*.xml` y conserva los artefactos. `dist/` se archiva cuando la ejecución resulta exitosa. Los archivos de `reports/` son salidas de ejecución y están excluidos de Git; las evidencias seleccionadas para revisión se conservan en [evidencias/](evidencias/).

[notify-discord.mjs](../../scripts/notify-discord.mjs) informa resultado, nombre y número del trabajo, commit y enlace de ejecución. Obtiene el SHA del checkout con Git, con respaldo en `GIT_COMMIT` si Git no está disponible. Las credenciales `discord-webhook` y `github-commit-status` se administran en Jenkins.

Un fallo de E2E produce `FAILURE`. Un error de comunicación final queda registrado y puede convertir una ejecución exitosa en `UNSTABLE`.

## Resultados comprobados

| Comprobación | Resultado y fuente |
|---|---|
| Jenkins #21, commit `08c66ff` | Ejecución automática exitosa; 141 pruebas Bun y 20 E2E aprobadas; Discord SUCCESS. |
| Jenkins #22, commit `3131229` | Fallo E2E intencional; Jenkins fallido y Discord FAILURE. |
| Restauración, commit `c4a1ad9` | Se revirtió la prueba temporal y se recuperó la suite normal. Recuperación confirmada por el equipo; no se adjunta una captura adicional de esta ejecución. |

El fallo controlado utilizó una prueba temporal que abría la aplicación y buscaba una marca de texto inexistente. Para esa demostración se ejecutó únicamente ese archivo. La prueba fue retirada mediante un revert; no pertenece a los 20 casos de la suite normal.

Los resultados y el alcance de cada captura están descritos en el [índice de evidencias](evidencias/README.md).

## Problemas y soluciones

| Situación | Solución aplicada |
|---|---|
| El selector exacto del botón Buscar no coincidía con el texto que incluía un icono. | Seleccionar el botón mediante su atributo `aria-label`. |
| Se necesitaba una ejecución consistente con direcciones IPv4 en CI. | Definir `BASE_URL` y `CYPRESS_BASE_URL` como `http://127.0.0.1:5173` dentro de la etapa E2E. |
| El aviso de Discord podía mostrar «Commit: no disponible». | Consultar el SHA del checkout mediante Git. La captura de #21 muestra el commit. |
| Los códigos ANSI dificultaban leer el resumen Cypress en la consola de Jenkins. | Conservar el log descargado y transcribir sus resultados en el índice de evidencias. |

## Organización del trabajo

El trabajo técnico se desarrolló en `testing/e2e-setup` y se integró en `develop`. La documentación se prepara en `documentacion/entrega3`, también desde `develop`. La gestión del tablero Kanban, sus prioridades y estimaciones corresponde al equipo y no se acredita con los archivos de esta carpeta.
