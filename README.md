# 🐳 Docker Database Manager

<div align="center">

![Docker Database Manager](https://img.shields.io/badge/Docker-Database%20Manager-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=for-the-badge&logo=tauri&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**Gestiona múltiples bases de datos Docker desde una interfaz moderna y elegante**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 📸 Screenshots

<!-- TODO: Add screenshots -->

---

## ✨ Features

### 🗃️ **Multi-Database Support**
- ✅ **PostgreSQL** - Versiones 12, 13, 14, 15, 16
- ✅ **MySQL** - Versiones 5.7, 8.0, 8.2
- ✅ **MariaDB** - Versiones 10.6, 10.11, 11.2
- ✅ **MongoDB** - Versiones 4.4, 5.0, 6.0, 7.0
- ✅ **Redis** - Versiones 6.2, 7.0, 7.2

### 🎯 **Core Functionality**
- 🚀 **Create** - Crea contenedores con configuración personalizada
- ⚙️ **Manage** - Start, stop, restart, rename, delete
- 📊 **Monitor** - Estadísticas en tiempo real (CPU, RAM, Network, Disk)
- 📝 **Logs** - Visualiza logs de contenedores
- 💾 **Volumes** - Gestión completa de volúmenes Docker
- 🔄 **Backup/Restore** - Crea backups y restaura volúmenes
- 📦 **Images** - Gestiona imágenes Docker (pull, remove)

### 🔧 **Advanced Features**
- 🎨 **Templates** - Plantillas predefinidas (Development, Testing, Production)
- 🎨 **Custom Templates** - Crea tus propias plantillas
- 🔄 **Migration** - Migra bases de datos locales a Docker
- 📄 **Docker Compose** - Importa y exporta docker-compose.yml
- 🔍 **Search & Filter** - Búsqueda avanzada y filtros
- 📈 **Dashboard** - Vista general con estadísticas

### ⚡ **Performance Optimizations**
- 🚀 **Intelligent Caching** - Reduce requests en 80%
- 🎯 **Smart Polling** - Solo actualiza la tab activa
- 💤 **Visibility Detection** - Pausa cuando la ventana está oculta
- 📦 **Virtual Scrolling** - Maneja 100+ contenedores sin lag
- 🔍 **Structured Logging** - Sistema de logs profesional con niveles y contexto

---

## 🚀 Installation

### Prerequisites

- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
- **Node.js** (v18+) - [Download](https://nodejs.org/)
- **Rust** (latest) - [Install](https://rustup.rs/)

### Quick Start

```bash
# Clone repository
git clone https://github.com/alemelgarejo/docker-database-manager.git
cd docker-database-manager

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Build Output

- **macOS**: `src-tauri/target/release/bundle/macos/Docker Database Manager.app`
- **Windows**: `src-tauri/target/release/bundle/msi/Docker Database Manager.msi`
- **Linux**: `src-tauri/target/release/bundle/appimage/docker-database-manager.AppImage`

---

## 📖 Usage

### 1. Create a Database

1. Click **"New Database"** button
2. Select database type (PostgreSQL, MySQL, etc.)
3. Configure:
   - Database name
   - Username & password
   - Port
   - Version
   - (Optional) Apply a template
4. Click **"Create"**

### 2. Manage Containers

- **Start**: ▶️ button
- **Stop**: ⏸️ button
- **Restart**: 🔄 button
- **Rename**: ✏️ button
- **Delete**: 🗑️ button
- **View Logs**: 📝 button
- **Monitor**: 📊 button

### 3. Connection Strings

Each container card shows the connection string:

```bash
# PostgreSQL
postgresql://user:password@localhost:5432/dbname

# MySQL
mysql://user:password@localhost:3306/dbname

# MongoDB
mongodb://user:password@localhost:27017/dbname

# Redis
redis://:password@localhost:6379
```

### 4. Templates

#### Predefined Templates:
- **Development** - Optimized for local dev (256MB RAM, 1 CPU)
- **Testing** - Lightweight for CI/CD (128MB RAM, 0.5 CPU)
- **Production** - High performance (1GB+ RAM, 2+ CPUs)
- **Analytics** - Big data workloads
- **Gaming** - Low latency
- **Microservices** - Containerized apps

#### Custom Templates:
1. Go to **Templates** tab
2. Click **"Create Template"**
3. Configure for each database type
4. Save and use in future containers

### 5. Migration

Migrate local PostgreSQL databases to Docker:

1. Go to **Migration** tab
2. Connect to local PostgreSQL
3. Select databases to migrate
4. Click **"Migrate"**
5. New Docker containers created automatically

### 6. Docker Compose

1. Go to **Compose** tab
2. **Import**: Load existing docker-compose.yml
3. **Export**: Generate compose file from containers
4. **Deploy**: Create containers from compose file

---

## 🏗️ Architecture

### Tech Stack

**Frontend**:
- Vanilla JavaScript (ES Modules)
- HTML5 + CSS3
- Chart.js (monitoring)

**Backend**:
- Rust
- Tauri 2.0
- Bollard (Docker API)

**Features**:
- No framework overhead
- Native performance
- Small bundle size (~10MB)
- Cross-platform

### Project Structure

```
docker-db-manager/
├── src/                          # Frontend
│   ├── components/              # UI components
│   │   ├── Dashboard.js
│   │   ├── DatabaseCard.js
│   │   ├── SearchFilters.js
│   │   ├── Templates.js
│   │   └── ...
│   ├── lib/                     # Business logic
│   │   ├── managers/           # State managers
│   │   ├── services/           # API services
│   │   └── utils/              # Utilities
│   │       ├── cache.js        # Cache system
│   │       ├── polling.js      # Polling system
│   │       ├── logger.js       # Structured logging
│   │       ├── virtualScroll.js # Virtual scrolling
│   │       ├── formatters.js
│   │       └── notifications.js
│   ├── main.js                 # App entry point
│   ├── index.html             # HTML template
│   └── styles.css             # Styles
├── src-tauri/                  # Backend (Rust)
│   ├── src/
│   │   ├── lib.rs            # Main logic
│   │   └── main.rs           # App entry
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri config
├── package.json              # Node dependencies
└── README.md                 # This file
```

### Key Systems

#### Cache System
- Intelligent caching with TTL
- Reduces API calls by 80%
- Auto-invalidation on data changes

#### Polling System
- Smart polling (only active tab)
- Visibility detection (pause when hidden)
- Configurable intervals

#### Virtual Scrolling
- Handles 100+ items efficiently
- Only renders visible elements
- 90% memory reduction
- Auto-enables for large lists (>50 items)

#### Structured Logging
- Log levels: DEBUG, INFO, WARN, ERROR
- Context-based logging (Cache, Polling, etc.)
- Color-coded console output
- Performance timing
- Production/Development modes

See [CACHE_POLLING_IMPLEMENTATION.md](CACHE_POLLING_IMPLEMENTATION.md) for details.

---

## 🎨 Customization

### Change Theme

Currently dark theme only. Light theme coming soon.

### Add Database Type

1. Edit `src-tauri/src/lib.rs`:
   ```rust
   pub enum DatabaseType {
       PostgreSQL,
       MySQL,
       // Add new type here
       NewDB,
   }
   ```

2. Implement configuration methods

3. Update frontend components

### Add Template

Go to Templates tab → Create Template → Configure → Save

---

## 🧪 Development

### Run Tests

```bash
# JavaScript syntax check
npm run lint

# Rust tests
npm run test

# Format code
npm run format
```

### Debug Mode

Dev tools available in browser console:

```javascript
// Cache stats
__DEV__.cache.stats()

// Polling stats
__DEV__.polling.stats()

// Logger - Get stored logs
__DEV__.logger.getLogs()

// Logger - Export logs
__DEV__.logger.exportLogs()

// Clear cache
__DEV__.cache.clear()

// Pause/resume polling
__DEV__.polling.pauseAll()
__DEV__.polling.resumeAll()

// Virtual scroll info (when enabled)
if (containersVirtualScroll) {
  containersVirtualScroll.getScrollInfo()
}
```

### Hot Reload

Changes to JavaScript/CSS reload automatically.
Changes to Rust require restart.

---

## 📝 Scripts

```json
{
  "dev": "npm run tauri dev",           // Development mode
  "build": "npm run tauri build",       // Production build
  "lint": "biome lint ./src",           // Lint code
  "lint:fix": "biome lint --write ./src", // Fix linting
  "format": "biome format --write ./src", // Format code
  "test": "cd src-tauri && cargo test"  // Run tests
}
```

---

## 🐛 Troubleshooting

### Docker Not Running

**Issue**: "Docker not running or not accessible"

**Solution**:
1. Click "Open Docker Desktop" button
2. Wait for Docker to start
3. Click "Retry Connection"

### Port Already in Use

**Issue**: "Port 5432 is already in use"

**Solution**:
1. Change port in create modal
2. Or stop container using that port

### Container Won't Start

**Issue**: Container shows "exited" status

**Solution**:
1. Click logs button to see error
2. Check if port is available
3. Check if credentials are correct

### High CPU Usage

**Issue**: App using too much CPU

**Solution**:
- Close unused tabs
- Cache system reduces this by 80%
- Check `__DEV__.polling.stats()` for issues

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Style

- JavaScript: ES Modules, no var, strict mode
- Rust: Idiomatic Rust, handle errors properly
- Comments: JSDoc for functions
- Format: Run `npm run format` before commit

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 👨‍💻 Author

**Alejandro Melgarejo**
- GitHub: [@alemelgarejo](https://github.com/alemelgarejo)

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Amazing framework
- [Bollard](https://github.com/fussybeaver/bollard) - Docker API for Rust
- [Chart.js](https://www.chartjs.org/) - Beautiful charts
- [Lucide](https://lucide.dev/) - Icon inspiration

---

## 📊 Stats

- **Language**: JavaScript + Rust
- **Lines of Code**: ~11,000
- **Bundle Size**: ~10MB (native app)
- **Supported Databases**: 5
- **Performance**: 80% less resource usage

---

## 🗺️ Roadmap

- [ ] Light theme
- [ ] Multi-language support (i18n)
- [ ] Backup scheduling
- [ ] Cloud sync (optional)
- [ ] More database types (Cassandra, CouchDB)
- [ ] Kubernetes support
- [ ] Container networking
- [ ] Health checks
- [ ] Auto-updates

---

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/alemelgarejo/docker-database-manager/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/alemelgarejo/docker-database-manager/discussions)
- 📧 **Email**: [Contact](mailto:your-email@example.com)

---

<div align="center">

**Made with ❤️ and 🦀**

⭐ Star us on GitHub if you like this project!

</div>
