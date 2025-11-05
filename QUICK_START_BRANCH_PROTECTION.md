# 🚀 Guía Rápida: Branch Protection

## ⚡ Configuración en 5 Minutos

### 1️⃣ Configurar en GitHub (hazlo ahora)
1. Ve a: https://github.com/alemelgarejo/docker-database-manager/settings/branches
2. Click **Add branch protection rule**
3. Branch name: `main`
4. Marca:
   - ✅ **Require a pull request before merging**
   - ✅ **Require approvals**: 1
   - ✅ **Include administrators**
   - ❌ **Allow force pushes** (NO marcar)
5. Click **Create**

### 2️⃣ Flujo de Trabajo Diario

```bash
# Crear nueva feature
git checkout -b feature/mi-cambio
# Hacer cambios
git add .
git commit -m "feat: mi cambio"
# Subir
git push origin feature/mi-cambio
# Ir a GitHub y crear Pull Request
```

### 3️⃣ Lo Que Cambió
- ❌ **ANTES**: `git push origin main` (funcionaba)
- ✅ **AHORA**: Debes crear una rama → hacer PR → revisar → merge

## 📚 Más Detalles
Ver `BRANCH_PROTECTION_GUIDE.md` para la guía completa.

## 🤖 Automatización
- Se creó GitHub Actions en `.github/workflows/pr-checks.yml`
- Cada PR ejecutará automáticamente:
  - ✅ Linting
  - ✅ Build check
  - ✅ Tests
  - ✅ Security audit

## ✨ Beneficios
- 🛡️ Protección contra errores
- 📝 Historial limpio
- 🔍 Revisión obligatoria
- 🤝 Mejor colaboración
