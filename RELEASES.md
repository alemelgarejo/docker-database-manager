# 🚀 Sistema de Releases Automáticos

Este proyecto está configurado con un sistema de **releases automáticos** que genera builds para múltiples plataformas y habilita **auto-actualización** desde la aplicación.

## 📦 Qué se genera automáticamente

Cuando haces push de un tag (ej: `v1.0.0`), GitHub Actions automáticamente:

### Builds multi-plataforma:
- ✅ **macOS Apple Silicon (M1/M2/M3)** - `.dmg`
- ✅ **macOS Intel (x86_64)** - `.dmg`
- ✅ **Windows x64** - `.exe` installer

### Auto-actualización:
- ✅ **latest.json** - Archivo de actualización para Tauri
- ✅ **Archivos firmados** - Todos los builds incluyen firma digital
- ✅ **Verificación segura** - La app verifica la firma antes de actualizar

## 🎯 Inicio rápido

### 1️⃣ Configuración inicial (solo una vez)

```bash
# Ejecutar script de configuración
./.github/setup-release.sh
```

Este script:
- ✅ Genera claves de firma
- ✅ Muestra las instrucciones para GitHub Secrets
- ✅ Proporciona la clave pública para tauri.conf.json

### 2️⃣ Añadir secrets en GitHub

Ve a: [Settings → Secrets → Actions](https://github.com/alemelgarejo/docker-database-manager/settings/secrets/actions)

Añade:
- **TAURI_PRIVATE_KEY** - La clave privada mostrada por el script
- **TAURI_KEY_PASSWORD** - (opcional) Si protegiste la clave con contraseña

### 3️⃣ Actualizar tauri.conf.json

```json
{
  "updater": {
    "pubkey": "PEGAR_CLAVE_PUBLICA_AQUI"
  }
}
```

### 4️⃣ Crear release

```bash
# Actualizar versión en:
# - package.json
# - src-tauri/Cargo.toml  
# - src-tauri/tauri.conf.json

# Commit y tag
git add .
git commit -m "chore: bump version to 1.0.0"
git push origin main

git tag v1.0.0
git push origin v1.0.0
```

**¡Listo!** GitHub Actions se encarga del resto.

## 📋 Workflow proceso

```
┌─────────────────────────────────────────────────────────────┐
│  git push origin v1.0.0                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions detecta el tag                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────┬──────────────────────────────────┐
│  Build macOS (M1)        │  Build macOS (Intel)             │
│  • Compila Rust          │  • Compila Rust                  │
│  • Crea DMG              │  • Crea DMG                      │
│  • Firma binarios        │  • Firma binarios                │
│  • Genera .sig           │  • Genera .sig                   │
└──────────────────────────┴──────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Build Windows                                              │
│  • Compila Rust                                             │
│  • Crea installer .exe                                      │
│  • Firma binarios                                           │
│  • Genera .msi + .sig                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Genera latest.json                                         │
│  • Lee todos los assets                                     │
│  • Extrae firmas de archivos .sig                           │
│  • Crea JSON con URLs y firmas                              │
│  • Sube a GitHub Release                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  ✅ Release completado                                      │
│     Usuarios pueden:                                        │
│     • Descargar instaladores                                │
│     • Auto-actualizar desde la app                          │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Auto-actualización

### Cómo funciona:

1. **Usuario abre la app**
2. Tauri consulta: `https://github.com/.../latest.json`
3. Compara versión actual vs disponible
4. Si hay actualización → Muestra diálogo
5. Usuario acepta → Descarga y verifica firma
6. Instala actualización → Reinicia app

### Para el usuario final:

```
┌──────────────────────────────────────────┐
│  ⚡ Update Available                     │
│                                          │
│  Version 1.0.0 → 1.1.0                  │
│                                          │
│  Changes:                                │
│  • New features                          │
│  • Bug fixes                             │
│  • Performance improvements              │
│                                          │
│  [Install and Restart]  [Later]          │
└──────────────────────────────────────────┘
```

## 📁 Estructura de archivos generados

```
GitHub Release v1.0.0/
├── docker-db-manager_1.0.0_aarch64.dmg           # macOS M1/M2/M3 installer
├── docker-db-manager_1.0.0_aarch64.app.tar.gz    # macOS M1 update file
├── docker-db-manager_1.0.0_aarch64.app.tar.gz.sig  # Signature
├── docker-db-manager_1.0.0_x64.dmg               # macOS Intel installer
├── docker-db-manager_1.0.0_x64.app.tar.gz        # macOS Intel update file
├── docker-db-manager_1.0.0_x64.app.tar.gz.sig    # Signature
├── docker-db-manager_1.0.0_x64-setup.exe         # Windows installer
├── docker-db-manager_1.0.0_x64-setup.msi.zip     # Windows update file
├── docker-db-manager_1.0.0_x64-setup.msi.zip.sig # Signature
└── latest.json                                    # Update manifest
```

## 🛠️ Versioning

Sigue **Semantic Versioning (semver)**:

- **MAJOR** (v2.0.0) - Cambios incompatibles con versión anterior
- **MINOR** (v1.1.0) - Nuevas funcionalidades compatibles
- **PATCH** (v1.0.1) - Bug fixes

Ejemplos:
```bash
git tag v1.0.0    # Primera release
git tag v1.0.1    # Bug fix
git tag v1.1.0    # Nueva feature
git tag v2.0.0    # Breaking change
```

Pre-releases (opcional):
```bash
git tag v1.0.0-beta.1    # Beta testing
git tag v1.0.0-rc.1      # Release candidate
```

## ⚙️ Configuración avanzada

### Customizar el updater

Edita `src-tauri/tauri.conf.json`:

```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://github.com/alemelgarejo/docker-database-manager/releases/latest/download/latest.json"
    ],
    "dialog": true,              // Mostrar diálogo de actualización
    "pubkey": "YOUR_PUBLIC_KEY"
  }
}
```

### Modificar el workflow

Edita `.github/workflows/release.yml` para:
- Añadir más plataformas (Linux)
- Cambiar opciones de build
- Personalizar el release body
- Añadir tests antes del build

## 📊 Monitoreo

Ver progreso del build:
1. Ve a: [Actions tab](https://github.com/alemelgarejo/docker-database-manager/actions)
2. Busca "Release Build"
3. Click para ver logs detallados

## ❗ Importante

- ✅ **Nunca compartas** la clave privada
- ✅ **Haz backup** de la clave privada
- ✅ **Testea pre-releases** antes de la versión final
- ✅ **Verifica** que `latest.json` se genere correctamente

## 🆘 Troubleshooting

### Build falla
```bash
# Ver logs en GitHub Actions
# Verificar que todas las versiones coincidan
grep -r "version" package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
```

### Auto-update no funciona
```bash
# Verificar endpoint
curl https://github.com/alemelgarejo/docker-database-manager/releases/latest/download/latest.json

# Verificar que la pubkey sea correcta
cat src-tauri/tauri.conf.json | grep pubkey
```

### latest.json no se genera
- Espera a que todos los builds terminen (~15-20 min)
- Verifica que los archivos `.sig` existan
- Revisa logs del job `generate-update-json`

## 📚 Documentación completa

Ver: [.github/RELEASE_SETUP.md](.github/RELEASE_SETUP.md)

## 🤝 Contribuir

Para hacer releases:
1. Fork el repo
2. Crea feature branch
3. Haz PR a `main`
4. Una vez merged, los maintainers crean el tag

## 📝 Licencia

MIT License - Ver LICENSE file

---

**¿Dudas?** Abre un issue en GitHub
