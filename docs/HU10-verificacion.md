# HU-10 — Verificación de campañas favoritas

## Versión evaluada

La implementación se preparó sobre `develop` en `014231f` y se revisó en `c684be070b000c4138cdea9e3a7b28c90c8963af`. La [PR #5](https://github.com/EstebanBecerraC/Proyecto_pds/pull/5) se integró mediante `15613b603612cdfce45821b20840aa4b1e01c31c`.

Agrega tabla SQLite, API, botón en el detalle y pantalla Mis favoritas, sin dependencias adicionales. La tabla se crea al iniciar la API y conserva los datos existentes.

## Resultados locales

Pruebas ejecutadas el 1 de noviembre de 2026 en una copia temporal de la PR:

```text
Bun: 137 pass, 0 fail
851 expect() calls
13 archivos
Build Vite: correcto
Cypress: 14 aprobados, 0 fallidos
  HU05: 6
  HU09: 4
  HU10: 4
```

Las pruebas de HU10 incluyen 12 casos de API y 4 del botón dentro del componente de detalle. Cinco casos adicionales comprueban el helper E2E de autenticación, que respeta Retry-After ante HTTP 429 y reintenta una sola vez.

## Trazabilidad E2E

| Caso | Comprobación |
|---|---|
| HU10-CY-01 | Lista vacía, guardar, recargar, cerrar/iniciar sesión y quitar desde detalle. |
| HU10-CY-02 | Separación entre cuentas y ocultamiento de una campaña cancelada. |
| HU10-CY-03 | Errores simulados de guardado, listado y eliminación; reintentos sin anunciar éxito prematuro. |
| HU10-CY-04 | Redirección al login y respuesta 401 de la API sin sesión. |

## Validación en develop

[Jenkins #10](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/10/) finalizó correctamente después del merge. Las capturas 01, 02, 04 y 05 muestran el disparo automático, el SHA evaluado, el estado del merge y el aviso de Discord.

El pipeline requiere autenticación. Las capturas y PDF revisados están en el [índice de evidencias](evidencias/entrega-2/README.md). El resumen Cypress está incorporado con una transcripción de los 14 escenarios aprobados, porque los códigos ANSI dificultan leer la tabla original. Las impresiones de interfaz complementan las pruebas; no las reemplazan. La captura 03 documenta las 137 pruebas Bun y la captura 08 el resumen de los 14 escenarios Cypress.

## Repetir la comprobación

Seguir [E2E local con base temporal](CI-CD.md#ejecución-e2e-local-con-base-temporal). Cypress descubre automáticamente todos los specs. Para ejecutar solo HU10, con API y frontend disponibles:

```powershell
bun run test:e2e --spec cypress/e2e/HU10-campanas-favoritas.cy.js
```

## Recorrido para demostración

1. Entrar con cuenta A y abrir Mis favoritas para mostrar la lista vacía.
2. Abrir una campaña activa y guardarla.
3. Mostrar su tarjeta, abrir detalle, recargar y volver a iniciar sesión.
4. Entrar con cuenta B y comprobar que no comparte la selección.
5. Volver a A y quitar desde la lista; guardar otra vez y quitar desde detalle.
6. Guardar una campaña ajena, cancelarla como creador y comprobar que desaparece para A.

Los criterios completos están en [HU-10.md](../HU-10.md). El alcance de la entrega se describe en [ENTREGA-2.md](ENTREGA-2.md).
