# 🗄️ Docker Database Manager

Aplicación de escritorio moderna para macOS que permite gestionar múltiples bases de datos en contenedores Docker con una interfaz gráfica intuitiva y profesional.

![Made with Rust](https://img.shields.io/badge/Made%20with-Rust-orange?logo=rust)
![Made with Tauri](https://img.shields.io/badge/Made%20with-Tauri-blue?logo=tauri)
![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey?logo=apple)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Características

- 🗄️ **Soporte Multi-Base de Datos**: PostgreSQL, MySQL, MongoDB, Redis y más
- 🚀 **Crear bases de datos** con solo unos clics
- 📊 **Visualizar todas tus bases de datos** en un panel intuitivo
- ⚡ **Controlar contenedores**: Iniciar, detener, reiniciar
- 🗑️ **Eliminar contenedores** y volúmenes de datos
- 📋 **Ver logs en tiempo real** de tus contenedores
- 💻 **Consola SQL integrada** para ejecutar consultas (bases de datos compatibles)
- 📝 **Plantillas de Bases de Datos**: Configuraciones predefinidas y personalizables
  - 💻 Local Development
  - 🧪 Testing Environment
  - 🚀 Production Optimized
  - 🛡️ High Availability
  - ⭐ Crear, exportar e importar plantillas personalizadas
- 🔄 **Auto-actualización** integrada - Actualiza la app con un solo click, sin reinstalar
- 🔄 **Actualización de contenedores** cada 10 segundos
- 🎨 **Interfaz moderna** con diseño limpio y responsive
- ⚙️ **Múltiples versiones** disponibles para cada base de datos
- 🐳 **Gestión completa de Docker** desde una sola aplicación

## 🎯 Bases de Datos Soportadas

### Actualmente Disponibles
- 🐘 **PostgreSQL** (versiones 12, 13, 14, 15, 16)

### Próximamente
- 🐬 **MySQL / MariaDB**
- 🍃 **MongoDB**
- 🔴 **Redis**
- 🐘 **Elasticsearch**
- 📊 **ClickHouse**
- Y más...

## 📋 Requisitos

- **macOS** (versión 10.15 o superior)
- **Docker Desktop** instalado y ejecutándose
  - [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **4GB RAM** mínimo recomendado
- **Conexión a Internet** (para descargar imágenes Docker)

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
2. Selecciona el **tipo de base de datos** (PostgreSQL, MySQL, etc.)
3. Completa el formulario:
   - **Nombre**: El nombre de tu base de datos
   - **Usuario**: Usuario de la base de datos (por defecto varía según el tipo)
   - **Contraseña**: Contraseña para el usuario
   - **Puerto**: Puerto donde se expondrá (por defecto varía según el tipo)
   - **Versión**: Versión de la base de datos
4. Haz clic en **"Crear"**

> **Nota**: Actualmente solo PostgreSQL está completamente implementado. Otras bases de datos se agregarán próximamente.

### Gestionar Contenedores

Cada tarjeta de contenedor tiene botones para:
- ▶️ **Iniciar** / ⏸️ **Detener** / 🔄 **Reiniciar**
- 📋 **Ver Logs**
- 💻 **Consola SQL**
- 🗑️ **Eliminar** (con opción de borrar datos)

### Conectar desde Aplicaciones Externas

#### PostgreSQL
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

**Ejemplo con código:**
```javascript
// Node.js
const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5544,
  user: 'postgres',
  password: 'tu_password',
  database: 'mi_database'
});
```

```python
# Python
import psycopg2
conn = psycopg2.connect(
    host="localhost",
    port=5544,
    user="postgres",
    password="tu_password",
    database="mi_database"
)
```

## 🔄 Auto-Actualización

La aplicación incluye un sistema de actualización automática integrado. No necesitas descargar e instalar manualmente cada nueva versión.

### Cómo Funciona

1. **Verificación Automática**: La app verifica actualizaciones al iniciar
2. **Notificación**: Si hay una nueva versión, aparece un diálogo
3. **Un Click**: Acepta y la actualización se descarga e instala automáticamente
4. **Reinicio**: Reinicia la app para usar la nueva versión

### Manual

También puedes verificar actualizaciones manualmente:
- Click en el botón **"🔄 Actualizar"** en la barra superior de la aplicación

### Para Desarrolladores

Si quieres configurar el sistema de actualizaciones para tu fork, consulta la guía completa:
- Ver [AUTO_UPDATE_GUIDE.md](AUTO_UPDATE_GUIDE.md) para instrucciones detalladas

## 🏗️ Arquitectura

- **Backend**: Rust + Tauri + Bollard (cliente Docker oficial para Rust)
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla (sin frameworks)
- **Comunicación**: IPC de Tauri entre frontend y backend
- **Contenedores**: Docker Engine para gestión de bases de datos
- **Actualizaciones**: Tauri Updater con firmas criptográficas

### Stack Tecnológico

```
┌─────────────────────────────────────────┐
│         Frontend (JavaScript)            │
│  - UI/UX intuitiva                      │
│  - Manejo de estado local               │
│  - Comunicación con backend vía Tauri   │
└─────────────────┬───────────────────────┘
                  │ IPC
┌─────────────────▼───────────────────────┐
│         Backend (Rust)                   │
│  - Comandos Tauri                       │
│  - Lógica de negocio                    │
│  - Cliente Docker (Bollard)             │
└─────────────────┬───────────────────────┘
                  │ Docker API
┌─────────────────▼───────────────────────┐
│         Docker Engine                    │
│  - Gestión de contenedores              │
│  - Imágenes de bases de datos           │
│  - Redes y volúmenes                    │
└─────────────────────────────────────────┘
```

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

## 🛣️ Roadmap

### Versión 0.2.0 (Próxima)
- [ ] Soporte para MySQL/MariaDB
- [ ] Soporte para MongoDB
- [ ] Temas claro/oscuro
- [ ] Exportar/Importar configuraciones

### Versión 0.3.0
- [ ] Soporte para Redis
- [ ] Backup y restore de bases de datos
- [ ] Métricas y monitoreo de recursos
- [ ] Editor SQL mejorado con syntax highlighting

### Versión 1.0.0
- [ ] Soporte para Elasticsearch
- [ ] Multi-plataforma (Windows, Linux)
- [ ] Gestión de usuarios y permisos
- [ ] Sincronización de configuraciones en la nube

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

Ver [BRANCH_PROTECTION_GUIDE.md](BRANCH_PROTECTION_GUIDE.md) para más detalles sobre el flujo de trabajo.

### 📝 Estilo de Código

Este proyecto utiliza [Biome](https://biomejs.dev/) para formateo y linting:

```bash
# Formatear código
pnpm format

# Verificar formato
pnpm format:check

# Ejecutar linting
pnpm lint

# Corregir problemas automáticamente
pnpm check
```

Ver [BIOME_CONFIG.md](BIOME_CONFIG.md) para más detalles sobre la configuración de Biome.

## 📚 Documentación

- [📝 Templates Guide](TEMPLATES-GUIDE.md) - Guía completa sobre plantillas de bases de datos
- [🔀 Branch Protection Guide](BRANCH_PROTECTION_GUIDE.md) - Flujo de trabajo con Git
- [🎨 Biome Configuration](BIOME_CONFIG.md) - Configuración de formateo y linting
- [📊 Monitoring Guide](MONITORING-GUIDE.md) - Monitoreo de contenedores

## 📝 Licencia

MIT License - Ver [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- [Tauri](https://tauri.app/) - Framework de aplicaciones de escritorio
- [Bollard](https://github.com/fussybeaver/bollard) - Cliente Docker para Rust
- [Docker](https://www.docker.com/) - Plataforma de contenedores
- [PostgreSQL](https://www.postgresql.org/) - Sistema de base de datos relacional
- Comunidad Open Source ❤️

## 📧 Contacto

- GitHub: [@alemelgarejo](https://github.com/alemelgarejo)
- Proyecto: [docker-database-manager](https://github.com/alemelgarejo/docker-database-manager)

## ⭐ Apoya el Proyecto

Si este proyecto te resulta útil, considera darle una estrella ⭐ en GitHub!

---

Hecho con ❤️ usando Rust y Tauri
