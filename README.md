# CrowdStarter

CrowdStarter es una plataforma web de crowdfunding que permite a personas y organizaciones presentar sus proyectos, obtener visibilidad y buscar financiamiento directamente dentro de una comunidad interesada en apoyar nuevas iniciativas.

La plataforma busca conectar a quienes tienen una idea o proyecto con personas dispuestas a contribuir a su desarrollo, facilitando tanto la publicación de campañas como la búsqueda y realización de aportes.

## 1. Visión general

Convertir una buena idea en un proyecto real suele requerir algo más que motivación: también se necesitan financiamiento, visibilidad y personas dispuestas a confiar en ella.

CrowdStarter busca abordar esta problemática mediante una plataforma que facilite la conexión entre personas u organizaciones que necesitan financiamiento y una comunidad interesada en apoyar proyectos.

## 2. Objetivo y alcance

### Objetivo

El objetivo principal de CrowdStarter es proporcionar una plataforma web de crowdfunding que permita publicar campañas, descubrir proyectos y realizar aportes de manera sencilla.

### Alcance actual

Actualmente, la plataforma permite:

- Registrar usuarios.
- Iniciar y cerrar sesión.
- Crear campañas de crowdfunding.
- Consultar campañas disponibles.
- Buscar campañas.
- Aportar a campañas.
- Consultar el historial de aportes realizados.
- Gestionar las campañas creadas por un usuario.
- Activar campañas.
- Modificar campañas.
- Cancelar campañas.
- Eliminar campañas.
- Consultar y actualizar el perfil, cambiar contraseña y eliminar la cuenta con restricciones.
- Guardar y consultar campañas favoritas por usuario.

## 3. Funcionalidades actualmente implementadas

### Autenticación de usuarios

Los usuarios pueden registrarse e iniciar sesión en la plataforma para acceder a las funcionalidades que requieren autenticación.

### Gestión de campañas

Los usuarios pueden administrar sus propias campañas, incluyendo:

- Creación.
- Modificación.
- Activación.
- Cancelación.
- Eliminación.

### Exploración de campañas

Los usuarios pueden visualizar las campañas actualmente disponibles y utilizar un buscador para encontrar proyectos de su interés.

### Aportes

Los usuarios pueden realizar aportes a las campañas y consultar posteriormente su historial de aportes.

## 4. Tecnologías

CrowdStarter utiliza las siguientes tecnologías:

| Tecnología | Uso |
|---|---|
| **Bun** | Runtime, gestión de dependencias y testing unitario |
| **Vue** | Desarrollo del frontend |
| **Vite** | Herramienta de desarrollo y build del frontend |
| **SQLite** | Base de datos |
| **JavaScript** | Lenguaje principal |
| **Cypress** | Testing end-to-end |
| **Bun Test** | Testing unitario |


## 5. Requisitos previos

Antes de instalar CrowdStarter es necesario contar con:

- **Bun 1.4.2** o una versión compatible.
- Un sistema operativo compatible con Bun.
- Conexión a internet para instalar las dependencias.

No es necesario instalar Node.js para ejecutar el proyecto.

### Sistema operativo

El proyecto está pensado para funcionar en cualquier sistema operativo compatible con Bun, incluyendo:

- Windows
- Linux
- macOS

## 6. Instalación

### 6.1. Clonar el repositorio

Clona el repositorio de CrowdStarter:

- git clone https://github.com/EstebanBecerraC/Proyecto_pds.git


Ingresa al directorio del proyecto:

- cd .\Proyecto_pds\


### 6.2. Instalar dependencias

Ejecuta:

- bun install

## 7. Ejecución

CrowdStarter requiere ejecutar el servidor de la API y el servidor de desarrollo del frontend.

### 7.1. Ejecutar la API

- bun run dev:server

### 7.2. Ejecutar el frontend

En otra terminal:

- bun run dev


### 7.3. URLs de desarrollo

Una vez iniciados ambos servicios:

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000

## 8. Ejecución de pruebas

### 8.1. Tests unitarios

Para ejecutar las pruebas unitarias:

- bun test


### 8.2. Tests end-to-end

El proyecto utiliza Cypress para realizar pruebas end-to-end. Con API y frontend disponibles, ejecutar `bun run test:e2e`. Para usar una base separada y el frontend compilado, seguir [E2E local con base temporal](docs/CI-CD.md#ejecución-e2e-local-con-base-temporal).


### 8.3. Build

Para generar el build de producción:

- bun run build


## 9. Uso básico

### 9.1. Registro e inicio de sesión

Al ingresar a CrowdStarter, el usuario debe registrarse o iniciar sesión para acceder a las funcionalidades de la plataforma.

### 9.2. Explorar campañas

Una vez autenticado, el usuario puede visualizar las campañas actualmente activas.

La plataforma también cuenta con un buscador que permite encontrar campañas de acuerdo con el interés del usuario.

### 9.3. Consultar una campaña

Al seleccionar una campaña, el usuario puede acceder a su información y conocer los detalles del proyecto.

### 9.4. Realizar un aporte

Desde la página de una campaña, el usuario puede realizar un aporte al proyecto.

Los aportes realizados quedan registrados y posteriormente pueden consultarse desde el historial de aportes del usuario.

### 9.5. Gestionar campañas propias

Los usuarios cuentan con una sección destinada a sus propias campañas.

Desde allí pueden:

- Crear nuevas campañas.
- Modificar campañas existentes.
- Activar campañas.
- Cancelar campañas.
- Eliminar campañas.


## Gestión del perfil — HU09

Desde **Mi perfil** puedes consultar y modificar nombre y correo, cambiar tu contraseña o eliminar la cuenta. La eliminación exige escribir `entiendo`, se bloquea si tienes campañas activas y conserva los aportes mediante anonimización.

- [Historia, criterios, API y pruebas](HU-09.md)

## Campañas favoritas — HU10

Desde el detalle de una campaña activa, selecciona **Guardar en favoritas**.
En **Mis favoritas** puedes abrir sus detalles o quitarlas de la selección.
Las favoritas se conservan entre sesiones y pertenecen únicamente a tu cuenta.
Las campañas canceladas dejan de ser visibles para otros usuarios, también en esta lista.

- [Historia, criterios y API](HU-10.md)
- [Verificación de favoritas](docs/HU10-verificacion.md)

## Integrantes

- Esteban Becerra
- Javiera Cortés
- Beatriz Vázquez

## Enlaces

- [Repositorio](https://github.com/EstebanBecerraC/Proyecto_pds)
- [Video existente](https://youtu.be/O6EkOwl1mQY)
- Cápsula de entrega 2: pendiente de grabar y agregar su enlace.
- [Wiki](https://github.com/EstebanBecerraC/Proyecto_pds/wiki)
- [Releases](https://github.com/EstebanBecerraC/Proyecto_pds/releases)

## Integración continua — Entrega 2

El pipeline de Jenkins ejecuta las pruebas Bun, compila el frontend y ejecuta
Cypress con una base SQLite temporal. Publica reportes y artefactos, actualiza
el estado del commit en GitHub y envía notificaciones a Discord.

- [Configuración y operación de CI/CD](docs/CI-CD.md)
- [Jenkins](https://crowdstarter-jenkins.duckdns.org/) (requiere autenticación)

La tarea sigue `develop`: los merges y pushes a esa rama pueden iniciar Jenkins automáticamente. La validación local de HU10 obtuvo **137 pruebas Bun y 14 escenarios Cypress aprobados**, además del build. El equipo confirmó el éxito del pipeline posterior al merge en [Jenkins #10](https://crowdstarter-jenkins.duckdns.org/job/crowdstarter-ci/10/) (requiere autenticación).

El pipeline conserva `dist/`; no despliega la aplicación públicamente de forma permanente. Discord está aceptado para esta entrega en lugar de Slack.

- [Documento principal de entrega 2 y arquitectura](docs/ENTREGA-2.md)
- [Índice de evidencias](docs/evidencias/entrega-2/README.md)
- [Registro de cambios](CHANGELOG.md)
- [Borrador de notas para la release 2](docs/RELEASE-2.md)

La release 2 aún está en preparación; quedan por incorporar el resumen Cypress y el enlace del nuevo video antes de publicar el tag propuesto `v2.0.0`.
