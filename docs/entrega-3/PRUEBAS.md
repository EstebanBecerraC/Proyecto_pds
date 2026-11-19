# Escenarios E2E — Entrega 3

La suite contiene 20 casos `it` de Cypress: 6 nuevos y 14 conservados de la entrega anterior. Los flujos se ejecutan en el navegador contra la aplicación y su base de datos; HU10-CY-03 intercepta respuestas concretas para comprobar errores y reintentos de la interfaz.

## Flujos críticos incorporados

Archivo: [E3-flujos-criticos.cy.js](../../cypress/e2e/E3-flujos-criticos.cy.js).

| Caso | Flujo y comprobación |
|---|---|
| E3-CY-01 | Registro, conservación de sesión al recargar, navegación por Mis campañas, perfil y favoritas, cierre de sesión, protección de ruta y nuevo login. |
| E3-CY-02 | Login con campos vacíos y credenciales incorrectas; mensajes visibles, permanencia en login y conservación del correo. |
| E3-CY-03 | Registro rechaza correo inválido, confirmación distinta y correo ya registrado. |
| E3-CY-04 | CRUD completo de borrador: crear, listar, abrir detalle, comprobar imagen y descripción, editar, recargar, cancelar la confirmación de borrado y finalmente eliminar. El detalle deja de estar disponible. |
| E3-CY-05 | Creación rechaza los seis campos obligatorios vacíos, meta cero y fecha vencida; no aparece una campaña guardada. |
| E3-CY-06 | Activación y búsqueda por título y descripción, coincidencia sin distinguir mayúsculas, búsqueda sin resultados, limpieza y apertura del detalle. |

## Edición y permisos

Archivo: [HU05-editar-campana.cy.js](../../cypress/e2e/HU05-editar-campana.cy.js).

| Caso | Flujo y comprobación |
|---|---|
| HU05-CY-01 | Precarga y actualización de campos; persistencia al recargar y conservación de imagen. |
| HU05-CY-02 | Selección y guardado de una imagen de reemplazo. |
| HU05-CY-03 | Validaciones de edición y conservación de datos ante campos o imagen inválidos. |
| HU05-CY-04 | Cancelación de la edición sin guardar. |
| HU05-CY-05 | Bloqueo de edición de campañas activas y canceladas mediante URL directa. |
| HU05-CY-06 | Otro usuario no puede consultar un borrador ni editar una campaña ajena. |

## Gestión del perfil y aportes

Archivo: [HU09-gestionar-perfil.cy.js](../../cypress/e2e/HU09-gestionar-perfil.cy.js).

| Caso | Flujo y comprobación |
|---|---|
| HU09-CY-01 | Consulta y actualización del perfil; cambio de contraseña, rechazo de la anterior y acceso con la nueva. |
| HU09-CY-02 | Eliminación de cuenta exige escribir exactamente `entiendo`; la cuenta eliminada no puede iniciar sesión. |
| HU09-CY-03 | Bloqueo de eliminación de una cuenta con campañas activas. |
| HU09-CY-04 | Aporte desde la interfaz y conservación del historial con «Usuario eliminado» después de eliminar la cuenta aportante. |

## Campañas favoritas

Archivo: [HU10-campanas-favoritas.cy.js](../../cypress/e2e/HU10-campanas-favoritas.cy.js).

| Caso | Flujo y comprobación |
|---|---|
| HU10-CY-01 | Lista vacía, guardado, recarga, persistencia entre sesiones y eliminación desde el detalle. |
| HU10-CY-02 | Selección privada por cuenta y ocultamiento de una campaña cancelada por su creador. |
| HU10-CY-03 | Errores simulados al guardar, listar y quitar; reintentos sin anunciar éxito antes de confirmarlo. |
| HU10-CY-04 | Redirección a login al abrir favoritas sin sesión y respuesta 401 de la API. |

## Correspondencia con los flujos solicitados

| Flujo | Casos |
|---|---|
| Crear, listar, ver detalle, editar y eliminar | E3-CY-04. |
| Campos obligatorios, valores inválidos y mensajes | E3-CY-02, E3-CY-03, E3-CY-05 y HU05-CY-03. |
| Búsqueda | E3-CY-06. |
| Login, sesión y permisos | E3-CY-01, E3-CY-02, HU05-CY-05, HU05-CY-06 y HU10-CY-04. |
| Navegación principal | E3-CY-01 y E3-CY-04. |
| Aportes e historial | HU09-CY-04. |
| Perfil y favoritas | HU09-CY-01 a HU09-CY-04 y HU10-CY-01 a HU10-CY-04. |

La cobertura E2E complementa las 141 pruebas Bun; no pretende probar desde la interfaz todas las combinaciones de API y validaciones. La eliminación física se prueba sobre un borrador sin aportes, conforme a las reglas de la aplicación. Una campaña activa se cancela en lugar de eliminarse.

## Resultados de Jenkins #21

| Archivo | Casos | Aprobados | Fallidos |
|---|---:|---:|---:|
| E3-flujos-criticos.cy.js | 6 | 6 | 0 |
| HU05-editar-campana.cy.js | 6 | 6 | 0 |
| HU09-gestionar-perfil.cy.js | 4 | 4 | 0 |
| HU10-campanas-favoritas.cy.js | 4 | 4 | 0 |
| **Total** | **20** | **20** | **0** |

Fuente: [log Cypress descargado](evidencias/reportes/cypress.log.txt). El resumen indica `All specs passed!` y una duración de 02:16. Las instrucciones para repetir la ejecución están en [README.md](README.md).
