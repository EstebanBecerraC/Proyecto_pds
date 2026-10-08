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

## 7. Instalación

### 7.1. Clonar el repositorio

Clona el repositorio de CrowdStarter:

git clone https://github.com/EstebanBecerraC/Proyecto_pds.git


Ingresa al directorio del proyecto:

cd .\Proyecto_pds\


### 7.2. Instalar dependencias

Ejecuta:

bun install

## 8. Ejecución

CrowdStarter requiere ejecutar el servidor de la API y el servidor de desarrollo del frontend.

### 8.1. Ejecutar la API

bun run dev:server

### 8.2. Ejecutar el frontend

En otra terminal:

bun run dev


### 8.3. URLs de desarrollo

Una vez iniciados ambos servicios:

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000

## 9. Ejecución de pruebas

### 9.1. Tests unitarios

Para ejecutar las pruebas unitarias:

bun test


### 9.2. Tests end-to-end

El proyecto utiliza Cypress para realizar pruebas end-to-end.


### 9.3. Build

Para generar el build de producción:

bun run build


## 10. Uso básico

### 10.1. Registro e inicio de sesión

Al ingresar a CrowdStarter, el usuario debe registrarse o iniciar sesión para acceder a las funcionalidades de la plataforma.

### 10.2. Explorar campañas

Una vez autenticado, el usuario puede visualizar las campañas actualmente activas.

La plataforma también cuenta con un buscador que permite encontrar campañas de acuerdo con el interés del usuario.

### 10.3. Consultar una campaña

Al seleccionar una campaña, el usuario puede acceder a su información y conocer los detalles del proyecto.

### 10.4. Realizar un aporte

Desde la página de una campaña, el usuario puede realizar un aporte al proyecto.

Los aportes realizados quedan registrados y posteriormente pueden consultarse desde el historial de aportes del usuario.

### 10.5. Gestionar campañas propias

Los usuarios cuentan con una sección destinada a sus propias campañas.

Desde allí pueden:

- Crear nuevas campañas.
- Modificar campañas existentes.
- Activar campañas.
- Cancelar campañas.
- Eliminar campañas.


## Integrantes

- Esteban Becerra
- Javiera Cortés
- Beatriz Vázquez

## Enlaces

- Repositorio: https://github.com/EstebanBecerraC/Proyecto_pds.git
- Video de presentación/demostración: Link_Aqui
- Wiki: Link_Aqui
- Release: Link_Aqui
- Documentación detallada: Link_Aqui
