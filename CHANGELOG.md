# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Structured Logging System** - Professional logging with levels (DEBUG, INFO, WARN, ERROR), context tracking, timestamps, and color-coded output
- **Centralized State Management (AppState)** - Single source of truth for application state
- **State Observers** - Reactive UI updates when state changes
- **State Persistence** - Automatic localStorage persistence for user preferences
- **State History (Undo/Redo)** - Full undo/redo support for state changes
- **Unit Tests for AppState** - Comprehensive test suite with 15+ tests
- **Development Tools Enhancement** - Added state management and testing tools to `window.__DEV__`
- **Lazy Loading for Tabs** - Tabs now load content on demand, improving initial load time
- **Virtual Scrolling** - Efficient rendering for lists with 100+ items
- **Intelligent Caching** - Reduces Docker API calls by 80%
- **Smart Polling** - Only polls active tabs and pauses when window is hidden

### Changed
- **Migrated from global variables to AppState** - Removed 20+ global variables, now using centralized state
- **Improved Tab Management** - TabManager now handles lazy loading and state tracking
- **Better Docker Connection Handling** - Fixed false-positive Docker error overlay on startup
- **Enhanced Observer Pattern** - UI components automatically update when data changes

### Fixed
- **Docker error overlay showing when Docker is actually connected** - Now only shows when truly disconnected
- **Tabs not loading data automatically** - All tabs now properly lazy-load when opened
- **Migration, Template, and Volume tabs not showing content** - Fixed initialization issues

### Technical Improvements
- **Code Organization** - Better separation of concerns with managers, services, and utilities
- **Type Safety** - Explicit type validation in AppState
- **Error Handling** - Structured error logging and user-friendly messages
- **Performance** - Reduced re-renders and optimized DOM manipulation
- **Developer Experience** - Enhanced dev tools for debugging and testing

## [0.1.0] - 2024-11-14

### Added
- Initial release
- Multi-database support (PostgreSQL, MySQL, MariaDB, MongoDB, Redis)
- Container management (create, start, stop, restart, delete)
- Real-time monitoring (CPU, Memory, Network, Disk)
- Volume management with backup/restore
- Image management
- Docker Compose import/export
- Migration from local PostgreSQL
- Template system
- Search and filtering
- Dashboard with statistics

### Technical Stack
- **Frontend**: JavaScript (ES6+), HTML5, CSS3
- **Backend**: Rust with Tauri 2.0
- **Docker Integration**: Bollard (Docker API)
- **Charts**: Chart.js
- **Architecture**: MVC with centralized state management

---

## Legend

- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security fixes
