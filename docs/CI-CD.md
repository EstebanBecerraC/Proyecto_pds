# Pipeline de CrowdStarter

Documento de operación técnica. El alcance, la arquitectura y los resultados de la entrega se reúnen en [ENTREGA-2.md](ENTREGA-2.md).

## Configuración en Jenkins

- Tarea: `crowdstarter-ci`, tipo Pipeline, definición **Pipeline script from SCM**.
- Repositorio: `https://github.com/EstebanBecerraC/Proyecto_pds.git`.
- Rama: `*/develop`. Script Path: `Jenkinsfile`.
- Agente: etiqueta `crowdstarter`, un ejecutor; controlador con cero ejecutores.
- Complementos: Pipeline, Git, GitHub, Credentials Binding, JUnit y Timestamper.
- No ejecutar otra tarea de este proyecto simultáneamente en el mismo agente: utiliza puertos 3000 y 5173.
- Límite: 25 minutos por ejecución; concurrencia desactivada en la tarea.

### Credenciales

| ID | Uso |
|---|---|
| `discord-webhook` | URL privada para avisos finales. |
| `github-commit-status` | Token limitado al repositorio, con Commit statuses: Read and write. |
| `github-webhook-secret` | Secreto compartido configurado para validar el webhook de GitHub. |

Los secretos se guardan en Jenkins y no se incluyen en el repositorio ni en capturas. La URL global de Jenkins debe usar HTTPS para que los enlaces de estados sean válidos.

## Ejecución

[Jenkinsfile](../Jenkinsfile) obtiene el código con `checkout scm`, publica `pending`, instala con `bun install --frozen-lockfile`, ejecuta Bun Test con JUnit, compila, prepara Cypress y ejecuta [scripts/ci-e2e.sh](../scripts/ci-e2e.sh).

El webhook de eventos push apunta a `https://crowdstarter-jenkins.duckdns.org/github-webhook/`. El evento solicita comprobar cambios en la rama configurada. Un merge o push directo a `develop` puede iniciar el trabajo; abrir una PR por sí solo no valida su rama.

Las pruebas E2E usan Vite preview con el frontend compilado, la API Bun y un archivo SQLite temporal. El script espera una respuesta 401 de `/api/auth/me` a través del proxy y que el frontend responda. Un trap detiene los servicios y elimina el directorio temporal al finalizar normalmente o ante errores. Una interrupción forzada del agente puede requerir revisar procesos residuales.

Los helpers de autenticación limpian cookies y recargan la aplicación para aislar sesiones. Usan un PNG real sin interceptar cuerpos multipart de creación/edición. Ante HTTP 429, el helper respeta `Retry-After` y reintenta una vez; los demás errores inesperados hacen fallar el escenario. El límite de autenticación de la API permanece activo.

## Reportes y resultado

- JUnit: `reports/bun.xml` y reportes XML Cypress.
- Artefactos disponibles: `reports/**`, capturas y videos Cypress.
- Frontend compilado: `dist/**`, solo si la ejecución es exitosa.
- Retención: 15 ejecuciones y artefactos de las últimas 5.

[github-status.mjs](../scripts/github-status.mjs) obtiene el SHA mediante `git rev-parse HEAD`. El contexto es `ci/jenkins/crowdstarter`; el enlace apunta a la ejecución.

| Resultado Jenkins | Estado GitHub |
|---|---|
| PENDING | pending |
| SUCCESS | success |
| FAILURE / UNSTABLE | failure |
| ABORTED / NOT_BUILT | error |

Un error al publicar el estado inicial falla el pipeline. Un error de publicación final o de Discord queda visible y puede marcar una ejecución exitosa como inestable. GitHub conserva el último estado recibido si no se puede publicar uno nuevo.

[notify-discord.mjs](../scripts/notify-discord.mjs) notifica resultado, trabajo, número, commit y enlace. El equipo confirmó que Discord está aceptado como sustitución de Slack.

## Validación de entrega 2

La revisión local de `c684be0` aprobó **137 pruebas Bun**, **851 expectativas en 13 archivos**, build y **14 escenarios Cypress**: HU05 (6), HU09 (4), HU10 (4).

La [PR #5](https://github.com/EstebanBecerraC/Proyecto_pds/pull/5) se integró en `develop` mediante `15613b603612cdfce45821b20840aa4b1e01c31c`. El equipo confirmó que [Jenkins #10](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/10/) se inició automáticamente y terminó correctamente, con estado GitHub y aviso Discord. Su panel requiere autenticación. Las capturas y reportes para consulta externa están pendientes de incorporación en el [índice de evidencias](evidencias/entrega-2/README.md).

Existen referencias históricas a las ejecuciones [#4](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/4/) (fallo controlado) y [#5](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/5/) (recuperación), sobre la configuración inicial de CI. No validan HU09/HU10 y pueden caducar por retención.

## Herramientas del agente

Versiones registradas durante la configuración: Debian 13 x86_64, Java Temurin 21.0.13, Node.js 22.23.4, Bun 1.4.2 y Git 2.47.3. Cypress comprobado: 16.1.1; su etapa muestra la versión exacta en cada ejecución. Son versiones del entorno comprobado, no requisitos de actualización automática.

## Infraestructura y acceso

- VM `vm-jenkins`: Ubuntu Server 24.04 LTS, North Central US, B2als_v2.
- Controlador Docker con volumen `jenkins_home`.
- Agente Docker independiente conectado por WebSocket.
- Caddy administra HTTPS para el subdominio DuckDNS.
- Puerto 8080 publicado solo en `127.0.0.1`; web pública por 80 y 443.
- SSH restringido a la IP del administrador y autenticado con clave.
- El panel se puede abrir desde cualquier red y requiere autenticación. Verificar que registro público y lectura anónima estén desactivados.

La aplicación se levanta dentro del agente durante E2E. Conservar `dist/` no despliega un sitio público ni la API/SQLite de forma permanente.

## Iniciar y usar Jenkins

1. Iniciar la VM en Azure si está desasignada.
2. Abrir [Jenkins](https://crowdstarter-jenkins.duckdns.org/) e iniciar sesión.
3. Comprobar que el agente `crowdstarter-agent` esté conectado.
4. Si los contenedores no arrancan, conectarse por SSH y ejecutar:

```bash
cd ~/jenkins
sudo docker compose -f compose.yaml -f compose.agent.yaml -f compose.tools.yaml -f compose.web.yaml up -d
sudo docker compose -f compose.yaml -f compose.agent.yaml -f compose.tools.yaml -f compose.web.yaml ps
```

Los archivos Compose, Dockerfile del agente, `agent.env` y Caddyfile están en `~/jenkins` de la VM. `agent.env` contiene un secreto.

Para una ejecución manual: abrir `crowdstarter-ci` → **Construir ahora**. Consultar consola, resultados de pruebas y artefactos.

Para probar el webhook: integrar una PR hacia `develop`, esperar una ejecución automática sin pulsar el botón y cotejar causa y SHA. Revisar además el estado del commit y Discord.

## Ejecución E2E local con base temporal

Las pruebas crean y modifican datos. Usar una base separada. Desde la raíz del repositorio en PowerShell:

```powershell
bun install --frozen-lockfile
bun run build
$demoDatabase = Join-Path ([System.IO.Path]::GetTempPath()) ('crowdstarter-e2e-' + [guid]::NewGuid().ToString('N') + '.sqlite')
$env:DATABASE_PATH = $demoDatabase
$env:APP_ORIGIN = 'http://localhost:5173'
bun run start:server
```

En otra terminal, desde la raíz:

```powershell
bun run preview
```

En una tercera terminal, desde la raíz:

```powershell
bun run test:e2e
```

Al terminar, detener API y preview con Ctrl+C. En la terminal de la API, ejecutar `Remove-Item Env:DATABASE_PATH,Env:APP_ORIGIN`. El archivo temporal puede conservarse para inspección; repetir el procedimiento genera una base distinta.

En el agente Linux, Jenkins automatiza el ciclo completo con `bash scripts/ci-e2e.sh`, después del build. Este script necesita Bash, curl, Bun y las dependencias de sistema de Cypress.

## Pausa y reactivación

Durante una pausa, detener y desasignar la VM desde Azure conservando disco y volúmenes. Disco y ciertos recursos de red pueden seguir consumiendo crédito. No ejecutar `docker compose down -v`, porque elimina volúmenes persistentes.

Antes de reactivar, revisar saldo, vigencia del token GitHub, IP pública y DuckDNS; actualizar la regla SSH si cambió la IP del administrador. Comprobar HTTPS, agente online y una ejecución manual. Mantener una copia segura de configuración y `jenkins_home`; puede contener credenciales y no debe publicarse.
