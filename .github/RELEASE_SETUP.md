# Release Workflow Setup Guide

Este documento explica cómo configurar el workflow de release para generar builds automáticos con auto-actualización.

## 📋 Requisitos previos

1. Repositorio en GitHub
2. Acceso para crear tags
3. Permisos de escritura en releases

## 🔑 Paso 1: Generar claves de firma para Tauri Updater

Las claves son necesarias para firmar las actualizaciones y garantizar seguridad.

### Generar las claves:

```bash
# Instalar tauri-cli si no lo tienes
npm install -g @tauri-apps/cli

# Generar par de claves
npm run tauri signer generate -- -w ~/.tauri/docker-db-manager.key

# Esto generará:
# - Clave privada: ~/.tauri/docker-db-manager.key
# - Clave pública: Se mostrará en la terminal
```

### Ejemplo de salida:

```
Private key saved to: ~/.tauri/docker-db-manager.key
Public key: dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEJGQ0Y5N...
```

## 🔐 Paso 2: Configurar GitHub Secrets

Añade estos secrets en tu repositorio: **Settings → Secrets and variables → Actions → New repository secret**

### Secrets necesarios:

1. **TAURI_PRIVATE_KEY**
   - Contenido del archivo `~/.tauri/docker-db-manager.key`
   - Copia todo el contenido del archivo
   ```bash
   cat ~/.tauri/docker-db-manager.key
   ```

2. **TAURI_KEY_PASSWORD** (opcional)
   - Si protegiste la clave con contraseña, añádela aquí
   - Si no usaste contraseña, deja este secret vacío o usa una cadena vacía

### Cómo añadir los secrets:

```bash
# Ver contenido de la clave privada
cat ~/.tauri/docker-db-manager.key

# Copiar y pegar en GitHub:
# 1. Ve a: https://github.com/alemelgarejo/docker-database-manager/settings/secrets/actions
# 2. Click en "New repository secret"
# 3. Name: TAURI_PRIVATE_KEY
# 4. Value: [pegar contenido del archivo]
# 5. Click "Add secret"
```

## 📝 Paso 3: Actualizar tauri.conf.json con la clave pública

Edita `src-tauri/tauri.conf.json`:

```json
{
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

Reemplaza `"TU_CLAVE_PUBLICA_AQUI"` con la clave pública generada en el Paso 1.

## 🚀 Paso 4: Crear un release

### Método 1: Desde la terminal

```bash
# Asegúrate de estar en la rama main y tener commits pusheados
git checkout main
git pull origin main

# Actualizar versión en los archivos
# - package.json: "version": "1.0.0"
# - src-tauri/Cargo.toml: version = "1.0.0"
# - src-tauri/tauri.conf.json: "version": "1.0.0"

# Commit de versión
git add .
git commit -m "chore: bump version to 1.0.0"
git push origin main

# Crear y pushear tag
git tag v1.0.0
git push origin v1.0.0
```

### Método 2: Desde GitHub UI

1. Ve a: `https://github.com/alemelgarejo/docker-database-manager/releases/new`
2. Click en "Choose a tag"
3. Escribe el tag: `v1.0.0` (debe empezar con 'v')
4. Click "Create new tag: v1.0.0 on publish"
5. Título: `Release v1.0.0`
6. Descripción: Notas del release
7. Click "Publish release"

## 📦 Qué se genera automáticamente

Cuando pusheas un tag (ej: `v1.0.0`), el workflow genera:

### Builds:
- ✅ **macOS Apple Silicon** (M1/M2/M3): `docker-db-manager_1.0.0_aarch64.dmg`
- ✅ **macOS Intel**: `docker-db-manager_1.0.0_x64.dmg`
- ✅ **Windows x64**: `docker-db-manager_1.0.0_x64-setup.exe`

### Archivos de firma (para auto-update):
- `docker-db-manager_1.0.0_aarch64.app.tar.gz` + `.sig`
- `docker-db-manager_1.0.0_x64.app.tar.gz` + `.sig`
- `docker-db-manager_1.0.0_x64-setup.msi.zip` + `.sig`

### Archivo de actualización:
- ✅ **latest.json** - Usado por Tauri para verificar actualizaciones

## 🔄 Cómo funciona el auto-update

1. **Usuario abre la app** → Tauri verifica `latest.json`
2. **Si hay nueva versión** → Muestra diálogo de actualización
3. **Usuario acepta** → Descarga la actualización firmada
4. **Verifica firma** → Usando la clave pública en `tauri.conf.json`
5. **Instala actualización** → Reinicia la app con la nueva versión

## 🔧 Estructura del latest.json

```json
{
  "version": "v1.0.0",
  "notes": "Docker Database Manager v1.0.0 - See release notes for details",
  "pub_date": "2024-01-20T12:00:00.000Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "url": "https://github.com/.../docker-db-manager_1.0.0_aarch64.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "url": "https://github.com/.../docker-db-manager_1.0.0_x64.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "url": "https://github.com/.../docker-db-manager_1.0.0_x64-setup.msi.zip"
    }
  }
}
```

## ⚠️ Importante

1. **Nunca compartas la clave privada** - Solo debe estar en GitHub Secrets
2. **Guarda backup de la clave privada** - Si la pierdes, no podrás firmar actualizaciones
3. **Las versiones deben seguir semver** - `v1.0.0`, `v1.0.1`, `v2.0.0`, etc.
4. **El tag debe empezar con 'v'** - El workflow se activa con `v*.*.*`

## 📊 Monitoreo del workflow

Ver el progreso del build:
1. Ve a: `https://github.com/alemelgarejo/docker-database-manager/actions`
2. Busca el workflow "Release Build"
3. Click para ver logs y progreso

## 🐛 Troubleshooting

### El workflow no se ejecuta
- ✅ Verifica que el tag empiece con 'v' (ej: `v1.0.0`)
- ✅ Asegúrate de hacer push del tag: `git push origin v1.0.0`

### Build falla en firma
- ✅ Verifica que `TAURI_PRIVATE_KEY` esté configurado correctamente
- ✅ Si usaste contraseña, añade `TAURI_KEY_PASSWORD`

### Auto-update no funciona
- ✅ Verifica que la `pubkey` en `tauri.conf.json` sea correcta
- ✅ Asegúrate de que `latest.json` exista en el release
- ✅ Verifica que el endpoint en `tauri.conf.json` sea correcto

### latest.json no se genera
- ✅ Espera a que todos los builds terminen (el job espera 30s)
- ✅ Verifica que los archivos `.sig` se hayan generado
- ✅ Revisa los logs del job `generate-update-json`

## 📚 Referencias

- [Tauri Updater Documentation](https://tauri.app/v1/guides/distribution/updater)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)

## 💡 Tips

- Usa tags pre-release para testing: `v1.0.0-beta.1`
- Puedes editar el release después en GitHub para añadir notas detalladas
- El workflow mantiene un histórico de todos los releases
- Los usuarios actualizarán automáticamente desde la app
