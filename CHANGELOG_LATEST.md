# 📝 Changelog - Latest Updates

## 🚀 Sistema de Releases Automáticos

### ✨ Nuevo: GitHub Actions Workflow para Releases Multi-Plataforma

Se ha implementado un sistema completo de releases automáticos que genera builds para múltiples plataformas y habilita auto-actualización en la aplicación.

#### 📦 Archivos creados:

```
.github/
├── workflows/
│   └── release.yml                  # Workflow principal
├── RELEASE_SETUP.md                 # Guía detallada de configuración
├── QUICK_RELEASE.md                 # Guía rápida
└── setup-release.sh                 # Script de configuración automática

RELEASES.md                          # Documentación completa del sistema
MIGRATION_DELETE_FEATURE.md          # Documentación de feature de eliminación
```

#### 🎯 Características:

**Builds automáticos al hacer push de un tag:**
- ✅ **macOS Apple Silicon** (M1/M2/M3) - `.dmg`
- ✅ **macOS Intel** (x86_64) - `.dmg`  
- ✅ **Windows x64** - `.exe` installer

**Auto-actualización:**
- ✅ Genera `latest.json` automáticamente
- ✅ Firma digital de todos los binarios
- ✅ Verificación segura antes de actualizar
- ✅ Notificación in-app de actualizaciones

**Proceso simplificado:**
```bash
# 1. Configuración inicial (una sola vez)
./.github/setup-release.sh

# 2. Crear release
git tag v1.0.0
git push origin v1.0.0

# 3. ¡Listo! GitHub Actions hace el resto
```

#### 📖 Uso:

1. **Primera vez**: Ejecutar `./.github/setup-release.sh`
2. **Añadir secrets** en GitHub: `TAURI_PRIVATE_KEY` y `TAURI_KEY_PASSWORD`
3. **Actualizar** `tauri.conf.json` con la clave pública
4. **Crear tag** con formato `v*.*.*` (ej: `v1.0.0`)
5. **Push del tag**: `git push origin v1.0.0`

GitHub Actions generará automáticamente:
- Instaladores para todas las plataformas
- Archivos de actualización firmados
- Archivo `latest.json` para auto-update

#### 📚 Documentación:

- **Completa**: `RELEASES.md`
- **Configuración**: `.github/RELEASE_SETUP.md`
- **Guía rápida**: `.github/QUICK_RELEASE.md`

---

## 🗑️ Feature: Eliminación de Base de Datos Original Post-Migración

### ✨ Nuevo: Opción de borrar la base de datos original después de migración exitosa

Ahora después de una migración exitosa, el usuario puede opcionalmente eliminar la base de datos original con múltiples capas de seguridad.

#### 🔒 Capas de protección:

1. **Solo después de éxito**: No se pregunta si la migración falla
2. **Primera confirmación**: Diálogo simple con advertencia clara
3. **Segunda confirmación**: Modal detallado tipo "DANGER ZONE"
4. **Eliminación segura**: Cierra conexiones activas antes de borrar

#### 🎯 Flujo actualizado:

```
Migración exitosa
      ↓
Pregunta: "¿Borrar original?"
      ↓
┌─────┴─────┐
↓           ↓
NO          SI → Modal DANGER ZONE → Confirmación
↓                                         ↓
Mantiene                              Elimina original
ambas DBs                             (seguro)
```

#### ⏱️ Características:

- **Delay de 800ms** antes de preguntar (evita clicks accidentales)
- **Modal visual** con advertencias claras
- **Checklist** de verificación para el usuario
- **Backend seguro** que cierra conexiones antes de borrar
- **Notificaciones** de éxito/error

#### 📄 Archivos modificados:

- `src/main.js` - Función `startMigration()` actualizada
- Ya existía `delete_original_database()` en Rust - no requiere cambios

#### 📖 Documentación:

Ver `MIGRATION_DELETE_FEATURE.md` para detalles completos.

---

## 🐛 Fixes: Problemas de Migración a Docker

### ✅ Solucionado: Error "No such file or directory" en pg_dump

**Problema**: El código intentaba ejecutar `pg_dump` desde el sistema local, pero no estaba instalado.

**Solución**: Ahora usa contenedores Docker temporales para ejecutar `pg_dump`:
- Crea contenedor con PostgreSQL
- Ejecuta `pg_dump` dentro del contenedor via `docker exec`
- Captura la salida directamente
- Limpia el contenedor temporal

### ✅ Solucionado: Incompatibilidad de versiones PostgreSQL

**Problema**: 
```
pg_dump: error: aborting because of server version mismatch
server version: 16.1; pg_dump version: 15.15
```

**Solución**: 
- **Detección automática** de la versión de PostgreSQL local
- Usa la **misma versión de imagen Docker** para dump y contenedor destino
- Compatible con PostgreSQL 12, 13, 14, 15, 16, 17+

#### 🔧 Implementación técnica:

```rust
// Detecta versión del servidor
SELECT version() → "PostgreSQL 16.1..."

// Extrae versión mayor
"16.1" → "16"

// Usa imagen correcta
postgres:16  // ✅ Compatible
```

### ✅ Solucionado: Error "waiting for dump container"

**Problema**: El contenedor terminaba inmediatamente y `wait_container` fallaba.

**Solución**: 
- Contenedor con `sleep 300` que se mantiene corriendo
- Ejecuta `pg_dump` via `docker exec` (más robusto)
- Captura salida directamente sin esperar terminación
- Limpia contenedor después

#### 📦 Dependencias agregadas:

**Cargo.toml**:
- `tar = "0.4"` - Para copiar archivos al contenedor
- `flate2 = "1.0"` - Para comprimir archivos

#### 📄 Archivos modificados:

- `src-tauri/src/lib.rs` - Función `migrate_database()` reescrita
- `src-tauri/Cargo.toml` - Dependencias agregadas

---

## 📊 Resumen de cambios

### Archivos nuevos:
- ✅ `.github/workflows/release.yml` - Workflow de releases
- ✅ `.github/RELEASE_SETUP.md` - Guía de configuración
- ✅ `.github/QUICK_RELEASE.md` - Guía rápida
- ✅ `.github/setup-release.sh` - Script de setup
- ✅ `RELEASES.md` - Documentación del sistema
- ✅ `MIGRATION_DELETE_FEATURE.md` - Docs de feature
- ✅ `CHANGELOG_LATEST.md` - Este archivo

### Archivos modificados:
- 🔧 `src/main.js` - Feature de eliminación post-migración
- 🔧 `src-tauri/src/lib.rs` - Fix de migración a Docker
- 🔧 `src-tauri/Cargo.toml` - Nuevas dependencias

### Líneas cambiadas:
```
src-tauri/Cargo.toml     |   2 +
src-tauri/src/lib.rs     | 336 insertions(+), 112 deletions(-)
src/main.js              |  20 insertions(+), 4 deletions(-)
.github/workflows/       | 287 new lines
Documentation            | 23,000+ characters
```

---

## 🎯 Testing

### Probar releases automáticos:
```bash
# 1. Configurar
./.github/setup-release.sh

# 2. Crear tag de prueba
git tag v0.1.0-beta.1
git push origin v0.1.0-beta.1

# 3. Verificar en Actions
# https://github.com/alemelgarejo/docker-database-manager/actions
```

### Probar migración:
```bash
# 1. Tener PostgreSQL local corriendo
# 2. Configurar conexión en la app
# 3. Seleccionar base de datos
# 4. Click en "Migrate"
# 5. Verificar que funciona con tu versión de PG
# 6. Después de migración exitosa, probar eliminar original
```

---

## 📚 Próximos pasos

Para usar el sistema de releases:

1. **Configurar GitHub Secrets** (ver `.github/RELEASE_SETUP.md`)
2. **Actualizar tauri.conf.json** con la clave pública
3. **Crear primer tag** para testear el workflow
4. **Verificar que latest.json** se genera correctamente

Para más información, ver:
- `RELEASES.md` - Sistema completo de releases
- `.github/RELEASE_SETUP.md` - Configuración detallada
- `MIGRATION_DELETE_FEATURE.md` - Feature de eliminación

---

**Fecha**: 20 de Noviembre, 2024  
**Versión**: Pre-release (pendiente de configurar sistema de releases)
