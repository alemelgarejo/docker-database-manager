#!/bin/bash

# Script para preparar una nueva release
# Uso: ./scripts/prepare-release.sh 1.0.0

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones helper
error() {
    echo -e "${RED}❌ Error: $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar que se pasó una versión
if [ -z "$1" ]; then
    error "Debes especificar una versión. Uso: ./scripts/prepare-release.sh 1.0.0"
fi

VERSION=$1
VERSION_TAG="v${VERSION}"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        🚀 Preparando Release ${VERSION_TAG}                "
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar que estamos en la rama main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    warning "No estás en la rama 'main' (estás en '$CURRENT_BRANCH')"
    read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Verificar que no hay cambios sin commitear
if [[ -n $(git status -s) ]]; then
    error "Tienes cambios sin commitear. Haz commit primero."
fi

# Verificar que estamos sincronizados con remote
info "Verificando sincronización con remote..."
git fetch
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "no-remote")
if [ "$REMOTE" != "no-remote" ] && [ $LOCAL != $REMOTE ]; then
    warning "Tu rama local no está sincronizada con remote"
    read -p "¿Hacer pull primero? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        git pull
        success "Pull completado"
    fi
fi

# Actualizar package.json
info "Actualizando package.json..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json
success "package.json actualizado"

# Actualizar Cargo.toml
info "Actualizando Cargo.toml..."
sed -i '' "s/^version = \".*\"/version = \"${VERSION}\"/" src-tauri/Cargo.toml
success "Cargo.toml actualizado"

# Actualizar tauri.conf.json
info "Actualizando tauri.conf.json..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" src-tauri/tauri.conf.json
success "tauri.conf.json actualizado"

# Verificar que los cambios son correctos
echo ""
info "Verificando cambios..."
echo ""
echo "package.json:"
grep '"version"' package.json
echo ""
echo "Cargo.toml:"
grep '^version' src-tauri/Cargo.toml
echo ""
echo "tauri.conf.json:"
grep '"version"' src-tauri/tauri.conf.json
echo ""

read -p "¿Los cambios son correctos? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    git checkout package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
    error "Cambios revertidos. Abortando."
fi

# Commit de los cambios de versión
info "Creando commit de versión..."
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to ${VERSION}"
success "Commit creado"

# Crear tag
info "Creando tag ${VERSION_TAG}..."
git tag -a "${VERSION_TAG}" -m "Release ${VERSION_TAG}"
success "Tag ${VERSION_TAG} creado"

# Push cambios y tag
echo ""
warning "Listo para hacer push a GitHub"
echo ""
echo "Se ejecutarán los siguientes comandos:"
echo "  git push origin ${CURRENT_BRANCH}"
echo "  git push origin ${VERSION_TAG}"
echo ""
read -p "¿Continuar con el push? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    info "Haciendo push..."
    git push origin "${CURRENT_BRANCH}"
    git push origin "${VERSION_TAG}"
    success "Push completado!"
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  ✅ Release ${VERSION_TAG} preparada exitosamente!        "
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Próximos pasos:"
    echo ""
    echo "1. Crear el build de producción:"
    echo "   npm run build"
    echo ""
    echo "2. El archivo .dmg estará en:"
    echo "   src-tauri/target/release/bundle/dmg/"
    echo ""
    echo "3. Crear la release en GitHub:"
    echo "   - Ve a: https://github.com/tu-usuario/docker-db-manager/releases/new"
    echo "   - Selecciona el tag: ${VERSION_TAG}"
    echo "   - Sube el archivo .dmg"
    echo "   - Publica la release"
    echo ""
    echo "O usa GitHub CLI:"
    echo "   gh release create ${VERSION_TAG} ./src-tauri/target/release/bundle/dmg/*.dmg"
    echo ""
else
    warning "Push cancelado. Los cambios y el tag están en tu repositorio local."
    echo ""
    echo "Para hacer push manualmente:"
    echo "  git push origin ${CURRENT_BRANCH}"
    echo "  git push origin ${VERSION_TAG}"
    echo ""
fi
