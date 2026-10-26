# Pipeline de CrowdStarter

## Configuracion en Jenkins

- Tipo de tarea: Pipeline; definicion: Pipeline script from SCM.
- SCM: Git; repositorio: https://github.com/EstebanBecerraC/Proyecto_pds.git.
- Para preparar la entrega: rama */feature/ci-cd. Script Path: Jenkinsfile.
- Tras integrar la configuracion: cambiar la rama a */develop.
- Agente con etiqueta crowdstarter y un solo ejecutor. No ejecutar dos tareas
  de este proyecto simultaneamente en el mismo agente: usan puertos 3000 y 5173.
- Complementos: Pipeline, Git, GitHub, Credentials Binding, JUnit y Timestamper.
- Credencial global Secret text con ID discord-webhook. Su valor es la URL
  del webhook de Discord; nunca se incluye en Git.
- Conservar la configuracion del secreto compartido del webhook de GitHub.

## Ejecucion

El Jenkinsfile obtiene la rama configurada con checkout scm, instala las
dependencias del lockfile, ejecuta Bun Test, compila y ejecuta Cypress.
El evento push de GitHub solicita comprobar cambios en esa rama.
Para la validacion previa, ejecutar Construir ahora sobre feature/ci-cd.
No cambiar develop ni configurar su tarea hasta completar esta comprobacion.

Las pruebas E2E usan el build con Vite preview y una base SQLite temporal.
Esperan que el frontend y su proxy de API respondan y detienen los servicios
al finalizar normalmente o ante errores. Una interrupcion forzada del agente
puede requerir revisar procesos residuales.

Jenkins publica los XML JUnit y conserva logs, screenshots y videos disponibles,
incluso si las pruebas fallan. El build dist se conserva solo en ejecuciones
exitosas. Se retienen 15 ejecuciones y artefactos de las 5 mas recientes.

La notificacion final incluye resultado, trabajo, commit y enlace a Jenkins.
Un error de notificacion se registra y puede marcar como inestable un build
exitoso; no convierte una prueba fallida en exitosa.

## Validacion realizada en Azure

- Pipeline desde SCM: 105 pruebas Bun y 6 escenarios Cypress aprobados.
- Build de Vue generado correctamente.
- Ejecucion #4: fallo controlado, commit 82529d2, estado failure en GitHub.
- Ejecucion #5: recuperacion, commit 58f74ef, estado success en GitHub.
- Ambas ejecuciones se iniciaron tras publicar cambios en feature/ci-cd.
- El equipo confirmo la recepcion de ambos avisos en Discord.
- La etapa temporal fue retirada; no se modifico develop.

Evidencias:
- Fallo: https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/4/
- Recuperacion: https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/5/
- El historial se limita a 15 ejecuciones: guardar las capturas de estas evidencias.

Pendiente: integrar el Jenkinsfile a develop, cambiar la rama configurada y
comprobar el disparo automatico de un cambio real en develop.
## Herramientas comprobadas en el agente

Debian 13 x86_64, Java Temurin 21.0.13, Node.js 22.23.4, Bun 1.4.2 y Git 2.47.3.
La etapa Preparar Cypress muestra su version exacta en cada ejecucion.

## Correccion de los escenarios E2E

Los helpers de autenticacion borran todas las cookies y recargan la aplicacion
antes de navegar al login o registro. La navegacion por hash puede conservar
el usuario Vue en memoria aunque se hayan borrado las cookies.

Se utiliza un PNG real en cypress/fixtures/campana.png y se evita interceptar
los cuerpos multipart de creacion y edicion: al reproducir el fallo, la
interceptacion alteraba bytes binarios de la imagen. Las comprobaciones de
guardado se realizan mediante la ruta de detalle, la confirmacion visible
y las consultas a la API real.

Validacion local: Cypress 16.1.1, Electron headless, API Bun con SQLite temporal
y frontend compilado con Vite preview: 6 escenarios aprobados, 0 fallidos.
La ejecucion posterior en el agente Debian de Azure tambien fue exitosa.

## Estados de commits en GitHub

Crear un token fine-grained del propietario del repositorio, limitado a
Proyecto_pds, con Commit statuses: Read and write. Guardarlo en Jenkins como
Secret text con ID github-commit-status. Metadata de lectura es automatico.
No se requieren permisos de escritura de codigo ni de administracion.

El pipeline publica pending tras obtener el codigo y el estado final despues
de procesar los reportes y artefactos. El contexto es ci/jenkins/crowdstarter.
El SHA se obtiene con git rev-parse HEAD para asociar el resultado al commit
realmente probado, aunque la rama avance durante la ejecucion.
SUCCESS publica success; FAILURE y UNSTABLE publican failure; ABORTED y
NOT_BUILT publican error. El enlace apunta a BUILD_URL y requiere Jenkins URL HTTPS.

Un error al publicar el estado queda visible en consola. Si ocurre al inicio,
el pipeline falla; si ocurre al finalizar, puede marcar un build exitoso como
inestable, sin ocultar un fallo previo. GitHub puede conservar el ultimo
estado recibido cuando existe un problema de red o de credenciales.

La publicacion requiere validacion real en Jenkins y GitHub con la credencial
configurada. Los permisos de red del panel siguen aplicandose al enlace Details.

## Infraestructura y acceso

- VM Ubuntu Server 24.04 LTS en Azure, North Central US, tamano B2als_v2.
- Controlador Jenkins en Docker, con cero ejecutores y volumen jenkins_home.
- Agente Docker independiente, etiqueta crowdstarter y un ejecutor.
- Caddy recibe HTTP/HTTPS y administra el certificado del subdominio DuckDNS.
- URL: https://crowdstarter-jenkins.duckdns.org/
- Puerto 8080 publicado solo en 127.0.0.1; no exponerlo en Azure.
- Puertos 80 y 443 permiten trafico publico; SSH 22 permanece limitado a la IP
  publica del administrador y requiere clave privada.
- El acceso por IP en Caddy se retiro por decision del equipo: el login puede
  abrirse desde cualquier red. El equipo usa una cuenta administradora compartida.
- Comprobar en Seguridad de Jenkins que el registro publico y la lectura anonima
  esten desactivados. Verificar en incognito que los trabajos requieren login.
- El webhook /github-webhook/ valida el secreto compartido; GitHub no usa
  la cuenta administradora ni la clave SSH.
- La aplicacion se levanta durante las pruebas; generar dist no implica
  desplegar la aplicacion publicamente de manera permanente.

Flujo: GitHub push -> Caddy HTTPS -> Jenkins -> agente -> pruebas/build ->
reportes y artefactos -> estado en GitHub y aviso en Discord.

## Iniciar y usar Jenkins

1. Iniciar vm-jenkins desde Azure si esta detenida.
2. Abrir la URL HTTPS e iniciar sesion.
3. Los contenedores tienen restart: unless-stopped. Si fueron detenidos
   manualmente o no arrancan, conectarse por SSH y ejecutar:

```bash
cd ~/jenkins
sudo docker compose -f compose.yaml -f compose.agent.yaml -f compose.tools.yaml -f compose.web.yaml up -d
sudo docker compose -f compose.yaml -f compose.agent.yaml -f compose.tools.yaml -f compose.web.yaml ps
```

Abrir crowdstarter-ci -> Construir ahora para una ejecucion manual.
Revisar Salida de consola, Resultados de pruebas y Artefactos.
Los archivos Compose, Dockerfile del agente, agent.env y Caddyfile estan en
~/jenkins de la VM. agent.env contiene un secreto y no debe subirse al repositorio.

## Pausa y reactivacion

- Detener y desasignar la VM desde Azure durante las semanas de pausa;
  no eliminar la VM ni su disco. El disco y ciertos recursos de red siguen
  consumiendo credito aunque no haya computo activo.
- No ejecutar docker compose down -v: eliminaria los volumenes persistentes.
- Revisar el saldo de Azure y la fecha de caducidad del token GitHub.
- Al reactivar, comprobar la IP publica. Si cambio, actualizar DuckDNS.
- Si cambio la IP del administrador, actualizar la regla SSH de Azure.
- Verificar HTTPS, agente online y ejecutar manualmente el pipeline.
- Mantener una copia segura de la configuracion y del volumen jenkins_home
  antes de eliminar recursos. Esa copia puede contener credenciales y no
  debe publicarse en GitHub.