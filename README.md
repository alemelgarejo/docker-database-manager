# 🐘 Docker PostgreSQL Manager

Aplicación de escritorio moderna para macOS que permite gestionar bases de datos PostgreSQL en contenedores Docker con una interfaz gráfica intuitiva.

![Made with Rust](https://img.shields.io/badge/Made%20with-Rust-orange?logo=rust)
![Made with Tauri](https://img.shields.io/badge/Made%20with-Tauri-blue?logo=tauri)
![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey?logo=apple)

## ✨ Características

- 🚀 **Crear bases de datos PostgreSQL** con solo unos clics
- 📊 **Visualizar todas tus bases de datos** en un panel intuitivo
- ⚡ **Controlar contenedores**: Iniciar, detener, reiniciar
- 🗑️ **Eliminar contenedores** y volúmenes de datos
- 📋 **Ver logs en tiempo real** de tus contenedores
- 💻 **Consola SQL integrada** para ejecutar consultas
- 🔄 **Auto-actualización** cada 10 segundos
- 🎨 **Interfaz moderna** con diseño limpio
- ⚙️ **Múltiples versiones** de PostgreSQL (12, 13, 14, 15, 16)

## 📋 Requisitos

- **macOS** (versión 10.15 o superior)
- **Docker Desktop** instalado y ejecutándose
  - [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop/)

## 🚀 Instalación

### Para Usuarios

1. Descarga el archivo `.dmg` de la última release
2. Arrastra la aplicación a tu carpeta de Aplicaciones
3. Abre la aplicación (puede que necesites aprobarla en Preferencias del Sistema)

### Para Desarrolladores

```bash
# Clonar el repositorio
git clone <repository-url>
cd docker-db-manager

# Instalar dependencias
pnpm install

# Ejecutar en modo desarrollo
pnpm tauri dev

# Compilar para producción
pnpm tauri build
```

## 🎯 Cómo Usar

### Crear una Nueva Base de Datos

1. Haz clic en **"➕ Nueva Base de Datos"**
2. Completa el formulario:
   - **Nombre**: El nombre de tu base de datos
   - **Usuario**: Usuario de PostgreSQL (por defecto: `postgres`)
   - **Contraseña**: Contraseña para el usuario
   - **Puerto**: Puerto donde se expondrá (por defecto: `5544`)
   - **Versión**: Versión de PostgreSQL (12-16)
3. Haz clic en **"Crear"**

### Gestionar Contenedores

Cada tarjeta de contenedor tiene botones para:
- ▶️ **Iniciar** / ⏸️ **Detener** / 🔄 **Reiniciar**
- 📋 **Ver Logs**
- 💻 **Consola SQL**
- 🗑️ **Eliminar** (con opción de borrar datos)

### Conectar desde Aplicaciones Externas

**Configuración:**
```
Host: localhost
Port: [Puerto configurado]
Database: [Nombre de la BD]
Username: [Usuario]
Password: [Contraseña]
```

**Ejemplo con psql:**
```bash
psql -h localhost -p 5544 -U postgres -d mi_database
```

## 🏗️ Arquitectura

- **Backend**: Rust + Tauri + Bollard (cliente Docker)
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla
- **Comunicación**: IPC de Tauri entre frontend y backend

## 📁 Estructura del Proyecto

```
docker-db-manager/
├── src/                    # Frontend
│   ├── index.html         # UI
│   ├── styles.css         # Estilos
│   └── main.js            # Lógica
├── src-tauri/             # Backend Rust
│   ├── src/lib.rs         # Comandos Tauri
│   ├── Cargo.toml         # Dependencias
│   └── tauri.conf.json    # Configuración
└── package.json           # Dependencias Node
```

## 🐛 Solución de Problemas

**Docker no disponible:**
- Verifica que Docker Desktop esté corriendo
- Comprueba con: `docker ps`

**Error al crear contenedor:**
- Verifica que el puerto no esté en uso
- Prueba con otro puerto

**La aplicación no se abre:**
- Ve a Preferencias del Sistema > Seguridad y Privacidad
- Permite la ejecución de la aplicación

## 📝 Licencia

MIT License

## 🙏 Agradecimientos

- [Tauri](https://tauri.app/) - Framework de aplicaciones
- [Bollard](https://github.com/fussybeaver/bollard) - Cliente Docker para Rust
- [PostgreSQL](https://www.postgresql.org/) - Sistema de base de datos

---

Hecho con ❤️ usando Rust y Tauri
