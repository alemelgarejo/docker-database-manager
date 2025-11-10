# Changelog

All notable changes to Docker DB Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-11-10

### Added
- 🐘 PostgreSQL database support with versions 12-16
- 🐬 MySQL database support with versions 5.7-8.2
- 🦭 MariaDB database support with versions 10.6-11.2
- 🍃 MongoDB database support with versions 4.4-7.0
- 🔴 Redis database support with versions 6.2-7.2
- 📊 Real-time resource monitoring (CPU, Memory, Network I/O)
- 🔄 Database migration from local PostgreSQL to Docker
- 📦 Docker image management (list, remove, pull)
- 💾 Volume backup and restore functionality
- 🎨 Modern native macOS UI with dark theme
- 🐳 Docker Compose integration:
  - Import docker-compose.yml files
  - Generate compose files from existing containers
  - Deploy multiple services from compose
  - Manage compose projects (start/stop/remove)
  - YAML editor with syntax highlighting
- 📋 Database templates system for quick deployment
- 🔗 Copy connection URL button for easy .env integration
- 🎯 Section headers with action buttons in each tab
- 🔍 Search and filter functionality for databases and images
- 📈 Dashboard with statistics and quick actions
- ⚡ Performance monitoring with resource alerts
- 🎨 Responsive design for different window sizes

### Features Highlights
- **No Docker Compose CLI Required**: All compose operations handled natively
- **Visual Monitoring**: Real-time charts and statistics
- **Template System**: Pre-configured setups for common use cases
- **Migration Tool**: Move local databases to Docker seamlessly
- **Backup & Restore**: Full volume backup and restore capabilities
- **Connection URLs**: One-click copy of connection strings
- **Multi-version Support**: Run multiple versions of the same database

### Technical
- Built with Tauri 2.x for native macOS performance
- Rust backend using Bollard for Docker API
- Vanilla JavaScript frontend with modern ES2020+ syntax
- No external dependencies for compose functionality
- Efficient resource usage with native APIs

### Fixed
- Modal alignment and spacing issues
- Section header consistency across tabs
- YAML editor rendering and box-sizing
- Responsive design for mobile viewports
- Form input styling and focus states

### Security
- Secure password handling (never logged)
- Input validation for all user inputs
- Sanitized HTML output to prevent XSS
- Proper use of Tauri's permission system

### Documentation
- Comprehensive README with features and screenshots
- Step-by-step installation guide
- Release guide for creating distributions
- Docker Compose implementation documentation
- Architecture and best practices guide

## [0.1.0] - 2024-11-01

### Added
- Initial development release
- Basic Docker container management
- PostgreSQL and MySQL support
- Simple UI for database creation

---

## Release Notes Template

For future releases, use this template:

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements
