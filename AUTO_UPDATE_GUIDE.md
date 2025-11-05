# 🔄 Guía de Auto-Actualización (Tauri Updater)

## ✨ ¿Qué es esto?

Ahora tu aplicación puede **actualizarse automáticamente** sin necesidad de descargar manualmente el instalador. Los usuarios verán una notificación cuando haya una nueva versión disponible y podrán actualizar con un solo clic.

## 🎯 Características Implementadas

- ✅ **Verificación automática** al iniciar la app (3 segundos después de cargar)
- ✅ **Botón manual** "🔄 Actualizar" en la barra superior
- ✅ **Diálogo de confirmación** antes de actualizar
- ✅ **Descarga e instalación** automática
- ✅ **Reinicio opcional** después de actualizar
- ✅ **Verificación silenciosa** (no molesta si ya está actualizado)

## 🔧 Configuración Necesaria

### Paso 1: Generar Claves de Firma (Solo una vez)

Las actualizaciones deben estar firmadas por seguridad. Genera tu par de claves:

```bash
# Instalar el CLI de Tauri si no lo tienes
npm install -g @tauri-apps/cli

# Generar las claves
cd src-tauri
cargo install tauri-cli
cargo tauri signer generate -- -w ~/.tauri/myapp.key

# O con npm
npm run tauri signer generate -- -w ~/.tauri/myapp.key
```

Esto genera:
- **Clave privada**: `~/.tauri/myapp.key` (⚠️ ¡NUNCA la subas a Git!)
- **Clave pública**: Se muestra en la terminal (cópiala)

### Paso 2: Configurar la Clave Pública

Reemplaza `YOUR_PUBLIC_KEY_HERE` en `src-tauri/tauri.conf.json` con tu clave pública:

```json
"plugins": {
  "updater": {
    "active": true,
    "endpoints": [
      "https://github.com/alemelgarejo/docker-database-manager/releases/latest/download/latest.json"
    ],
    "dialog": true,
    "pubkey": "TU_CLAVE_PUBLICA_AQUI"
  }
}
```

### Paso 3: Configurar GitHub Actions para Releases

Crea el archivo `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest]

    runs-on: ${{ matrix.platform }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies
        run: npm ci

      - name: Build and Release
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
          TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Docker Database Manager ${{ github.ref_name }}'
          releaseBody: 'See the CHANGELOG.md for details.'
          releaseDraft: false
          prerelease: false
```

### Paso 4: Agregar Secretos a GitHub

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Agrega estos secretos:

   **TAURI_PRIVATE_KEY**:
   ```bash
   # Copiar el contenido de tu clave privada
   cat ~/.tauri/myapp.key
   # Pegar todo el contenido en GitHub
   ```

   **TAURI_KEY_PASSWORD**:
   ```
   # Si estableciste una contraseña al generar la clave
   # Si no, déjalo vacío o pon un string vacío
   ```

### Paso 5: Crear una Release

```bash
# 1. Actualizar la versión en los archivos
# - package.json
# - src-tauri/tauri.conf.json
# - src-tauri/Cargo.toml

# 2. Commitear los cambios
git add .
git commit -m "chore: bump version to 0.2.0"

# 3. Crear y subir el tag
git tag v0.2.0
git push origin main
git push origin v0.2.0

# GitHub Actions automáticamente:
# - Compilará la app
# - Creará la release
# - Subirá los instaladores
# - Generará el archivo latest.json
```

## 📝 Formato del archivo latest.json

GitHub Actions genera automáticamente este archivo, pero si necesitas crearlo manualmente:

```json
{
  "version": "0.2.0",
  "notes": "Nueva versión con mejoras y correcciones",
  "pub_date": "2024-11-05T10:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "FIRMA_GENERADA_AUTOMATICAMENTE",
      "url": "https://github.com/alemelgarejo/docker-database-manager/releases/download/v0.2.0/Docker-Database-Manager_0.2.0_x64.dmg.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "FIRMA_GENERADA_AUTOMATICAMENTE",
      "url": "https://github.com/alemelgarejo/docker-database-manager/releases/download/v0.2.0/Docker-Database-Manager_0.2.0_aarch64.dmg.tar.gz"
    }
  }
}
```

## 🎮 Cómo Usar

### Para Usuarios Finales

1. **Automático**: La app verifica actualizaciones al iniciar
2. **Manual**: Click en el botón "🔄 Actualizar" en la barra superior
3. **Notificación**: Si hay actualización, aparece un diálogo
4. **Un Click**: Click "Sí" para descargar e instalar
5. **Reiniciar**: Click "Sí" para reiniciar con la nueva versión

### Para Desarrolladores

```javascript
// En la consola del navegador (DevTools)
window.checkUpdatesManually();
```

## 🔒 Seguridad

- ✅ **Firmas criptográficas**: Cada actualización está firmada
- ✅ **Verificación**: La app verifica la firma antes de instalar
- ✅ **HTTPS**: Las descargas usan conexiones seguras
- ✅ **Clave privada segura**: Guardada en GitHub Secrets

## 🐛 Solución de Problemas

### "No se encontró la clave pública"
- Verifica que reemplazaste `YOUR_PUBLIC_KEY_HERE` en `tauri.conf.json`

### "Error al verificar actualizaciones"
- Verifica que existe el archivo `latest.json` en la release
- Verifica la URL del endpoint en `tauri.conf.json`

### "Firma inválida"
- Asegúrate de usar la misma clave privada para firmar todas las releases
- Verifica que `TAURI_PRIVATE_KEY` en GitHub Secrets es correcto

### La actualización no funciona en desarrollo
- El updater solo funciona en builds de producción
- En desarrollo, verás errores (esto es normal)

## 📦 Ejemplo Completo de Flujo

```bash
# 1. Hacer cambios en el código
git add .
git commit -m "feat: nueva característica"

# 2. Actualizar versiones
# Editar: package.json, tauri.conf.json, Cargo.toml
# Cambiar version: "0.1.0" → "0.2.0"

# 3. Commitear cambios de versión
git add .
git commit -m "chore: bump version to 0.2.0"

# 4. Crear tag y subir
git tag v0.2.0
git push origin main
git push origin v0.2.0

# 5. GitHub Actions hace el resto:
#    ✓ Compila
#    ✓ Crea release
#    ✓ Genera latest.json
#    ✓ Firma los binarios

# 6. Los usuarios reciben la actualización automáticamente
```

## 🎨 Personalización

### Cambiar el endpoint de actualizaciones

Edita `src-tauri/tauri.conf.json`:

```json
"endpoints": [
  "https://tu-servidor.com/updates/latest.json"
]
```

### Cambiar la frecuencia de verificación

Edita `src/main.js`:

```javascript
// Verificar cada 30 minutos
setInterval(() => checkForUpdates(true), 30 * 60 * 1000);
```

### Deshabilitar el diálogo de actualización

Edita `src-tauri/tauri.conf.json`:

```json
"dialog": false  // Las actualizaciones se descargan automáticamente
```

## 📊 Estadísticas

Con este sistema:
- ⚡ **Actualizaciones instantáneas** para todos los usuarios
- 📉 **Reducción de soporte** (todos usan la última versión)
- 🔄 **Adopción rápida** de nuevas características
- 🐛 **Corrección rápida** de bugs críticos

## 🔗 Referencias

- [Documentación Tauri Updater](https://tauri.app/v1/guides/distribution/updater/)
- [GitHub Actions para Tauri](https://github.com/tauri-apps/tauri-action)
- [Conventional Commits](https://www.conventionalcommits.org/)

## ✅ Checklist de Implementación

- [ ] Generar claves de firma
- [ ] Configurar clave pública en `tauri.conf.json`
- [ ] Crear workflow de GitHub Actions (`.github/workflows/release.yml`)
- [ ] Agregar secretos a GitHub (`TAURI_PRIVATE_KEY`, `TAURI_KEY_PASSWORD`)
- [ ] Crear primera release de prueba
- [ ] Verificar que `latest.json` se genera correctamente
- [ ] Probar actualización en build de producción
- [ ] Documentar el proceso para el equipo

---

**Última actualización**: 5 de Noviembre, 2024
**Versión**: 1.0
