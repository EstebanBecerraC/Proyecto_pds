# HU10 — Verificación de campañas favoritas y cierre de entrega 2

## Base y cambios

Implementación preparada sobre `develop` en el commit `014231f053698ccb95033aaba234bfaf14a469c7`.
Agrega una tabla SQLite, API de favoritas, botón en el detalle y pantalla Mis favoritas.
No agrega dependencias. El servidor crea la tabla al reiniciar sin borrar los datos existentes.

## Evidencia ejecutada durante la implementación

Fecha: 30 de octubre de 2026. Entorno aislado de desarrollo, Bun 1.4.2.

```text
bun test
132 pass
0 fail
834 expect() calls
Ran 132 tests across 12 files.
```

De las pruebas agregadas, 12 cubren la API de favoritas y 4 el comportamiento del botón dentro del componente real de detalle.
Compilación Vite completada correctamente.

Se verificó también en Chromium mediante automatización de navegador:

- Crear y activar una campaña, guardarla y abrirla en Mis favoritas.
- Quitar desde el detalle y desde la lista.
- Recargar y volver a iniciar sesión sin perder la selección.
- Separar las favoritas de dos cuentas.
- Cancelar la campaña como creador y comprobar que desaparece de la lista ajena.
- Simular fallos en PUT, GET y DELETE: mostrar errores, reintentar y conservar el estado correcto.
- Revisar la vista móvil de 390 px sin desplazamiento horizontal.
- Redirigir la ruta protegida a Login y devolver 401 desde la API sin sesión.
- Ningún error de JavaScript en la página durante ese recorrido.

Estas comprobaciones son evidencia del entorno de implementación. No equivalen a una ejecución de Jenkins.

## Primera ejecución completa en Windows y corrección del entorno E2E

La comprobación del equipo aprobó las 132 pruebas Bun (834 expectativas) y la compilación.
Cypress aprobó HU05 (6/6), HU09 (4/4) y tres de los cuatro casos HU10: 13/14 en total.
HU10-CY-01 quedó en Registro al intentar crear su cuenta, antes de guardar favoritas.

La API limita registros y logins a 20 intentos por IP y minuto. Las suites anteriores acumulan esos intentos.
Se reprodujo el caso en un navegador: el intento 21 devuelve 429, Retry-After=60 y conserva la ruta de Registro.

Se agregó `cypress/helpers/auth.js`, usado por las tres suites. Observa la respuesta real del formulario y, solo ante 429,
espera Retry-After y reintenta una vez. Un segundo 429 o cualquier otro estado inesperado falla con su código y mensaje.
La protección de la API permanece activa. Los logins que intencionalmente usan contraseñas incorrectas siguen comprobando el rechazo.
Cinco pruebas Bun del helper comprueban éxito sin espera, Retry-After, límite de reintentos y rechazo de otros errores.

La ejecución completa de Cypress con este ajuste queda pendiente en el equipo/Jenkins. No considerar la suite aprobada hasta adjuntar el resultado.

## Ejecución del equipo

Desde el repositorio actualizado y con Bun instalado:

```powershell
bun install --frozen-lockfile
bun test
bun run build
```

Para Cypress, iniciar API y frontend en terminales separadas con la configuración habitual, conservando el mismo origen.
Si se utiliza `http://127.0.0.1:5173`, configurar `APP_ORIGIN` con esa misma URL antes de iniciar la API.
No cambiar ni borrar la base de datos usada para las comprobaciones manuales existentes.

```powershell
bun run test:e2e --spec cypress/e2e/HU10-campanas-favoritas.cy.js --config "baseUrl=http://127.0.0.1:5173"
```

Si los servicios usan localhost, usar `baseUrl=http://localhost:5173`.
El spec incorpora cuatro escenarios. Está preparado para el pipeline, pero queda pendiente ejecutar y adjuntar su resultado en el entorno del equipo.

## Jenkins

El Jenkinsfile actual ejecuta `bun test` y `scripts/ci-e2e.sh`. Cypress descubre todos los archivos `cypress/e2e/**/*.cy.js`, por lo que incluye HU10 automáticamente.
El job debe ejecutar el commit o PR que contiene la funcionalidad; una ejecución anterior de develop no valida estos cambios.

Guardar en el PR/Wiki:

- Commit y enlace del PR revisado.
- Enlace de la ejecución exitosa de Jenkins con resultados Bun y Cypress.
- Reportes JUnit y artefactos disponibles en esa ejecución.
- Evidencia del estado del commit en GitHub y la notificación en Discord.
- Ejecución fallida controlada y recuperación, indicando el defecto o fallo introducido en una rama de prueba.

Pendiente: incorporar los enlaces reales después de publicar la rama y ejecutar el pipeline. No se han creado ejecuciones remotas ni notificaciones desde este parche.

## Comprobación manual para evidencias y video

1. Entrar con la cuenta A y abrir Mis favoritas: comprobar el estado vacío si no tiene selecciones.
2. Abrir una campaña activa desde Inicio y pulsar Guardar en favoritas.
3. Abrir Mis favoritas: comprobar imagen, título y acceso al detalle.
4. Recargar, cerrar sesión y volver a entrar como A: comprobar que se conserva.
5. Entrar con otra cuenta B: comprobar que la selección de A no se comparte.
6. Volver a A y quitar desde la lista: comprobar el mensaje y su desaparición. Volver a guardarla y quitar desde el detalle.
7. Para validar privacidad, guardar una campaña ajena, cancelarla con el creador y comprobar que ya no aparece para A.

Las evidencias deben identificar criterio, resultado esperado, resultado obtenido y versión probada. Evitar publicar datos personales o contraseñas.

## Guía de cápsula de video

- Presentar las dos mejoras: HU09 perfil y HU10 favoritas.
- Mostrar una demostración corta de cada una y explicar para qué usuario sirven.
- Explicar dónde están la aplicación, SQLite y Jenkins y cómo se conectan con GitHub y Discord.
- Mostrar un cambio de código, su PR y la ejecución automática del pipeline del commit correspondiente.
- Revisar etapas, resultados de pruebas, artefactos, estado del commit y notificación.
- Mostrar el fallo controlado y la recuperación, si esa evidencia se grabó aparte.
- Explicar problemas resueltos y límites: pagos simulados, favoritas ocultas si la campaña deja de ser accesible.
- Cerrar mostrando la Wiki y la release de entrega 2 cuando estén publicadas.

## Cierre de versión

1. Revisar el PR de HU10 con otro integrante y validar el pipeline.
2. Integrar a develop y verificar el conjunto con perfil y favoritas.
3. Actualizar la página Entrega 2 de la Wiki y su índice; agregar evidencias y video.
4. Abrir y revisar un PR de release de develop hacia main.
5. En el commit estable de main, crear `v2.0-entrega2` y su GitHub Release.
6. En las notas incluir funcionalidades, correcciones, resultados reales, limitaciones y la actualización automática de la tabla favorites.

Esta guía prepara el cierre; el video, los enlaces y la publicación de la release se completan después de validar el PR.
