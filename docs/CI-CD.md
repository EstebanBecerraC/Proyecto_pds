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

## Validacion pendiente en Azure

- Ejecutar el pipeline desde SCM y comprobar todos los escenarios Cypress.
- Probar fallo controlado, reportes y aviso a Discord; revertir el fallo.
- Configurar credencial y publicacion de estados en GitHub (aun no implementada).
- Tras el merge, verificar el disparo automatico sobre develop.

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
La comprobacion final en el agente Debian de Azure sigue pendiente.
