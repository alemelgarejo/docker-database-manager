# 🚀 Guía para Crear una Release en GitHub

Esta guía te explica paso a paso cómo crear tu primera release de **Docker DB Manager** y generar el archivo descargable para macOS.

---

## 📋 Pre-requisitos

Antes de crear la release, asegúrate de tener:

- [x] Xcode Command Line Tools instalado
- [x] Rust y Cargo instalados
- [x] Node.js y npm instalados
- [x] Tauri CLI instalado
- [x] Git configurado
- [x] Repositorio en GitHub
- [x] Todos los cambios committed

---

## 🔧 Paso 1: Verificar que todo compila

```bash
# Limpiar builds anteriores
npm run clean

# Verificar que el código compila sin errores
cd src-tauri
cargo check
cd ..

# Verificar sintaxis JavaScript
npm run lint
```

---

## 📦 Paso 2: Crear el Build de Producción

### Opción A: Build local (recomendado para primera vez)

```bash
# Ejecutar el build de producción
npm run build
```

Esto creará el archivo `.dmg` en:
```
src-tauri/target/release/bundle/dmg/
```

El archivo se llamará algo como:
```
Docker DB Manager_0.1.0_aarch64.dmg  (Apple Silicon)
o
Docker DB Manager_0.1.0_x64.dmg      (Intel)
```

**Tiempo estimado:** 5-10 minutos (primera vez puede ser más)

---

## 🏷️ Paso 3: Actualizar la Versión

Antes de hacer la release, actualiza el número de versión:

### 3.1. Actualizar package.json
```json
{
  "version": "1.0.0"  // Cambiar de 0.1.0 a 1.0.0
}
```

### 3.2. Actualizar Cargo.toml
```toml
[package]
version = "1.0.0"  # Cambiar de 0.1.0 a 1.0.0
```

### 3.3. Actualizar tauri.conf.json
```json
{
  "version": "1.0.0"  // Cambiar de 0.1.0 a 1.0.0
}
```

### 3.4. Commit los cambios
```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to 1.0.0"
git push origin main
```

---

## 🏗️ Paso 4: Crear el Tag de Git

```bash
# Crear un tag anotado
git tag -a v1.0.0 -m "Release v1.0.0 - First stable release"

# Ver el tag creado
git tag -l

# Subir el tag a GitHub
git push origin v1.0.0
```

---

## 📤 Paso 5: Crear la Release en GitHub

### 5.1. Via Web (Recomendado)

1. Ve a tu repositorio en GitHub
2. Click en **"Releases"** (lado derecho)
3. Click en **"Create a new release"** o **"Draft a new release"**
4. En **"Choose a tag"**, selecciona `v1.0.0` (el que acabas de crear)
5. En **"Release title"**, escribe: `v1.0.0 - First Stable Release`
6. En **"Describe this release"**, escribe algo como:

```markdown
# 🎉 Docker DB Manager v1.0.0

First stable release of Docker DB Manager - A modern macOS app for managing Docker databases.

## ✨ Features

- 🐘 PostgreSQL support with multiple versions
- 🐬 MySQL / MariaDB support
- 🍃 MongoDB support
- 🔴 Redis support
- 📊 Real-time monitoring and resource usage
- 🔄 Database migration from local PostgreSQL
- 📦 Docker image management
- 💾 Volume backup and restore
- 🎨 Modern, native macOS UI
- 🐳 Docker Compose integration
- 📋 Database templates

## 📥 Installation

1. Download the `.dmg` file below
2. Open the `.dmg` file
3. Drag **Docker DB Manager** to Applications folder
4. Open the app (you may need to allow it in System Preferences > Security & Privacy)
5. Enjoy!

## ⚙️ Requirements

- macOS 11.0 (Big Sur) or later
- Docker Desktop installed and running
- Apple Silicon or Intel Mac

## 🐛 Known Issues

- None reported yet!

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for full list of changes.
```

7. **Adjuntar el archivo .dmg**:
   - Click en **"Attach binaries by dropping them here or selecting them"**
   - Selecciona el archivo `.dmg` que generaste en el Paso 2
   - Espera a que se suba (puede tardar unos minutos)

8. Si quieres que sea un draft (borrador), deja marcado **"This is a pre-release"**
   - Para la primera release estable, NO marques esto

9. Click en **"Publish release"**

### 5.2. Via GitHub CLI (Alternativa)

Si tienes GitHub CLI instalado:

```bash
# Instalar GitHub CLI si no lo tienes
brew install gh

# Autenticarte
gh auth login

# Crear la release
gh release create v1.0.0 \
  ./src-tauri/target/release/bundle/dmg/*.dmg \
  --title "v1.0.0 - First Stable Release" \
  --notes "First stable release with full Docker Compose support"
```

---

## 🔄 Paso 6: Configurar GitHub Actions (Opcional pero Recomendado)

Para automatizar futuras releases, crea `.github/workflows/release.yml`:

```yaml
name: Release Build

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Tauri app
        run: npm run build
      
      - name: Upload Release Asset
        uses: softprops/action-gh-release@v1
        with:
          files: src-tauri/target/release/bundle/dmg/*.dmg
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Con esto, cada vez que hagas un `git push --tags`, GitHub Actions compilará y subirá automáticamente el `.dmg`.

---

## 📝 Paso 7: Crear un CHANGELOG.md

Documenta los cambios de cada versión:

```markdown
# Changelog

All notable changes to Docker DB Manager will be documented in this file.

## [1.0.0] - 2024-XX-XX

### Added
- Initial stable release
- PostgreSQL, MySQL, MariaDB, MongoDB, and Redis support
- Real-time resource monitoring
- Docker Compose integration
- Volume backup and restore
- Database migration from local PostgreSQL
- Docker image management
- Database templates system
- Modern macOS native UI

### Fixed
- Modal alignment issues
- Section headers consistency
- Responsive design improvements

### Security
- Secure password handling
- Input validation
```

---

## 🎯 Checklist Final

Antes de publicar la release:

- [ ] ✅ Código compila sin errores
- [ ] ✅ Tests pasan (si los tienes)
- [ ] ✅ Versión actualizada en todos los archivos
- [ ] ✅ `.dmg` generado correctamente
- [ ] ✅ `.dmg` funciona en tu Mac (pruébalo!)
- [ ] ✅ Tag creado y pusheado
- [ ] ✅ README.md actualizado
- [ ] ✅ CHANGELOG.md creado/actualizado
- [ ] ✅ Screenshots en el README (opcional)
- [ ] ✅ Release notes escritas
- [ ] ✅ Release publicada en GitHub

---

## 🚨 Troubleshooting

### Error: "Developer cannot be verified"

Si los usuarios ven este error al abrir la app:

1. **Solución rápida para usuarios:**
   - Click derecho en la app
   - Selecciona "Abrir"
   - Click "Abrir" en el diálogo

2. **Solución permanente (para ti como desarrollador):**
   - Firma la app con un Apple Developer Certificate
   - Notariza la app con Apple
   - Requiere cuenta de Apple Developer ($99/año)

### Build falla

```bash
# Limpiar completamente
npm run clean
rm -rf src-tauri/target

# Reinstalar dependencias
npm install
cd src-tauri
cargo clean
cd ..

# Intentar build de nuevo
npm run build
```

### El .dmg no se genera

Verifica que tienes instalado:
```bash
# Verificar Xcode Command Line Tools
xcode-select --install

# Verificar Rust
rustc --version
cargo --version

# Verificar Tauri CLI
npm list @tauri-apps/cli
```

---

## 📚 Recursos Adicionales

- [Tauri Build Documentation](https://tauri.app/v1/guides/building/)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Semantic Versioning](https://semver.org/)
- [Apple Code Signing Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

---

## 🎉 ¡Felicidades!

Tu primera release está lista. Los usuarios ahora pueden:
1. Ir a `github.com/tu-usuario/docker-db-manager/releases`
2. Descargar el `.dmg`
3. Instalar y usar tu app!

---

## 🔄 Para Futuras Releases

1. Actualiza la versión (siguiendo [Semantic Versioning](https://semver.org/)):
   - `1.0.x` - Bug fixes
   - `1.x.0` - Nuevas features
   - `x.0.0` - Breaking changes

2. Actualiza CHANGELOG.md

3. Commit los cambios:
   ```bash
   git commit -am "chore: bump version to X.Y.Z"
   git push
   ```

4. Crea el tag:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

5. Si tienes GitHub Actions configurado, la release se creará automáticamente
6. Si no, sigue los pasos 2 y 5 de esta guía

---

**Nota:** Para distribución masiva y evitar el mensaje de "Developer cannot be verified", necesitarás una Apple Developer Account y firmar/notarizar tu app. Para uso personal o interno, la versión sin firmar funciona perfectamente.
