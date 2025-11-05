# Guía de Protección de Ramas (Branch Protection)

## 🎯 Objetivo
Proteger la rama `main` para que nadie pueda hacer push directo y todos los cambios pasen por Pull Requests con revisión.

## 📋 Pasos para Configurar en GitHub

### 1. Acceder a la Configuración del Repositorio
1. Ve a tu repositorio: https://github.com/alemelgarejo/docker-database-manager
2. Click en **Settings** (⚙️) en la parte superior
3. En el menú lateral izquierdo, busca **Code and automation** → **Branches**

### 2. Agregar Regla de Protección
1. Click en **Add branch protection rule** o **Add rule**
2. En **Branch name pattern** escribe: `main`

### 3. Configurar las Protecciones Recomendadas

Marca las siguientes opciones:

#### ✅ Protecciones Básicas (Recomendadas)
- **Require a pull request before merging** ✓
  - **Require approvals**: 1 (puedes ajustar el número según tu equipo)
  - **Dismiss stale pull request approvals when new commits are pushed** ✓
  - **Require review from Code Owners** (opcional, si usas CODEOWNERS)

#### ✅ Protección contra Push Directo
- **Require status checks to pass before merging** ✓ (si tienes CI/CD configurado)
  - Selecciona los checks que deben pasar (tests, linting, etc.)
  
- **Require branches to be up to date before merging** ✓

#### ✅ Protecciones Adicionales
- **Require conversation resolution before merging** ✓
  - Esto asegura que todos los comentarios en el PR se resuelvan antes de hacer merge

- **Include administrators** ✓
  - **IMPORTANTE**: Esto hace que incluso los administradores (tú) tengan que seguir las reglas

- **Restrict who can dismiss pull request reviews** (opcional)

- **Allow force pushes**: ❌ (DESACTIVADO - No marques esto)
- **Allow deletions**: ❌ (DESACTIVADO - No marques esto)

#### ✅ Reglas Adicionales de Seguridad
- **Require signed commits** (opcional pero recomendado)
- **Require linear history** ✓ (evita merge commits complicados)

### 4. Guardar los Cambios
1. Scroll hasta el final
2. Click en **Create** o **Save changes**

## 🔄 Flujo de Trabajo Después de la Configuración

### Crear una Nueva Feature
```bash
# 1. Asegúrate de estar en main y actualizado
git checkout main
git pull origin main

# 2. Crea una nueva rama para tu feature
git checkout -b feature/nombre-de-tu-feature

# 3. Haz tus cambios y commits
git add .
git commit -m "feat: descripción de los cambios"

# 4. Sube la rama a GitHub
git push origin feature/nombre-de-tu-feature
```

### Crear Pull Request
1. Ve a GitHub y verás un banner para crear el PR
2. O ve a: https://github.com/alemelgarejo/docker-database-manager/pulls
3. Click en **New pull request**
4. Selecciona:
   - **base**: `main`
   - **compare**: `feature/nombre-de-tu-feature`
5. Escribe un título y descripción descriptivos
6. Click en **Create pull request**

### Revisar y Hacer Merge
1. Revisa los cambios en el PR
2. Espera que pasen los checks (si los hay)
3. Solicita revisión de otros miembros del equipo (si aplica)
4. Una vez aprobado, click en **Merge pull request**
5. Selecciona el tipo de merge (recomendado: **Squash and merge**)
6. Confirma el merge
7. Elimina la rama (GitHub te dará la opción)

### Actualizar tu Rama Local
```bash
# Volver a main y actualizar
git checkout main
git pull origin main

# Eliminar la rama local (opcional)
git branch -d feature/nombre-de-tu-feature
```

## 🚫 Lo Que NO Podrás Hacer (Esto es lo que queremos)
- ❌ `git push origin main` - Esto fallará
- ❌ Hacer cambios directos en main sin PR
- ❌ Force push a main (`git push -f`)
- ❌ Eliminar la rama main

## ✅ Lo Que SÍ Podrás Hacer
- ✓ Crear ramas desde main
- ✓ Push a cualquier rama que no sea main
- ✓ Crear Pull Requests
- ✓ Revisar y aprobar PRs
- ✓ Hacer merge a través de PRs aprobados

## 🔧 Configuración Adicional: GitHub Actions (Opcional)

Si quieres automatizar checks, puedes crear workflows de GitHub Actions:

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Run linting
        run: npm run lint
```

## 📝 Notas Importantes

1. **Para Equipos**: Si trabajas con más personas, asegúrate de que tengan los permisos correctos:
   - **Write**: Para crear PRs
   - **Maintain/Admin**: Para hacer merge de PRs

2. **Para Trabajo Solo**: Aunque trabajes solo, esta práctica es excelente porque:
   - Te obliga a revisar tus cambios
   - Mantiene un historial limpio
   - Facilita hacer rollbacks si algo sale mal
   - Es la práctica estándar en la industria

3. **Emergencias**: Si necesitas hacer un cambio de emergencia, puedes:
   - Temporalmente desactivar la protección
   - Hacer el cambio
   - Reactivar la protección
   - (Pero intenta evitar esto)

## 🎓 Comandos de Git Útiles

```bash
# Ver estado de tu repositorio
git status

# Ver todas las ramas (locales y remotas)
git branch -a

# Crear y cambiar a una nueva rama en un comando
git checkout -b feature/nueva-feature

# Ver diferencias antes de hacer commit
git diff

# Ver el historial de commits
git log --oneline --graph --all

# Actualizar tu rama con los últimos cambios de main
git checkout feature/tu-rama
git pull origin main
```

## 🔗 Enlaces Útiles

- [Documentación oficial de Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Best Practices for Git](https://docs.github.com/en/get-started/using-git/about-git)
- [Pull Request Best Practices](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests)

---

**Creado**: $(date)
**Repositorio**: https://github.com/alemelgarejo/docker-database-manager
