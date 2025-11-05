# 📝 Nota: Subir Workflow de GitHub Actions

## ⚠️ Problema
El workflow `.github/workflows/pr-checks.yml` no se pudo subir porque el token de acceso personal (PAT) 
necesita el scope `workflow` para crear o modificar workflows.

## ✅ Solución: Subir Manualmente

### Opción 1: Desde la Interfaz de GitHub
1. Ve a: https://github.com/alemelgarejo/docker-database-manager
2. Click en **Add file** → **Create new file**
3. Nombre del archivo: `.github/workflows/pr-checks.yml`
4. Copia el contenido del archivo local `.github/workflows/pr-checks.yml`
5. Commit directamente a `main` (por esta única vez)

### Opción 2: Actualizar Token PAT
1. Ve a: https://github.com/settings/tokens
2. Edita tu token actual o crea uno nuevo
3. Asegúrate de marcar el scope **workflow**
4. Guarda y actualiza tu token localmente
5. Luego ejecuta:
```bash
git add .github/workflows/pr-checks.yml
git commit -m "ci: add GitHub Actions workflow for PR checks"
git push origin main
```

### Opción 3: Subir Después de Configurar Branch Protection
Una vez que configures branch protection, puedes crear una rama para subir el workflow:
```bash
git checkout -b feature/add-github-actions
git add .github/workflows/pr-checks.yml
git commit -m "ci: add GitHub Actions workflow for PR checks"
git push origin feature/add-github-actions
# Luego crea un PR en GitHub
```

## 📄 Contenido del Workflow
El archivo está disponible localmente en:
`.github/workflows/pr-checks.yml`

Este workflow automáticamente ejecuta en cada PR:
- ✅ Linting
- ✅ Build check
- ✅ Tests
- ✅ Security audit

## 🎯 Recomendación
Por ahora, configura primero la Branch Protection (ver QUICK_START_BRANCH_PROTECTION.md).
El workflow puede agregarse después usando la Opción 3.
