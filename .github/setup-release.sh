#!/bin/bash

# Script para configurar el sistema de releases automáticos

set -e

echo "🚀 Docker DB Manager - Release Setup"
echo "======================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si tauri-cli está instalado
echo "📦 Checking dependencies..."
if ! command -v tauri &> /dev/null; then
    echo -e "${YELLOW}Installing @tauri-apps/cli...${NC}"
    npm install -g @tauri-apps/cli
fi

echo -e "${GREEN}✓ Dependencies OK${NC}"
echo ""

# Generar claves
KEY_PATH="$HOME/.tauri/docker-db-manager.key"
echo "🔑 Generating signing keys..."
echo "Key will be saved to: $KEY_PATH"
echo ""

if [ -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}Warning: Key already exists at $KEY_PATH${NC}"
    read -p "Do you want to generate new keys? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing keys."
    else
        npm run tauri signer generate -- -w "$KEY_PATH" --force
    fi
else
    mkdir -p "$HOME/.tauri"
    npm run tauri signer generate -- -w "$KEY_PATH"
fi

echo ""
echo -e "${GREEN}✓ Keys generated successfully${NC}"
echo ""

# Mostrar clave privada
echo "================================================"
echo "📋 TAURI_PRIVATE_KEY (for GitHub Secret):"
echo "================================================"
cat "$KEY_PATH"
echo "================================================"
echo ""

# Obtener clave pública
echo "================================================"
echo "🔓 Public Key (for tauri.conf.json):"
echo "================================================"
echo "Add this to src-tauri/tauri.conf.json under 'pubkey':"
echo ""
# La clave pública está en la última línea del comentario del archivo de clave
grep "^# " "$KEY_PATH" | tail -1 | sed 's/^# //'
echo "================================================"
echo ""

# Instrucciones finales
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo ""
echo "1. Add GitHub Secrets:"
echo "   - Go to: https://github.com/alemelgarejo/docker-database-manager/settings/secrets/actions"
echo "   - Add secret: TAURI_PRIVATE_KEY"
echo "   - Value: Copy the content shown above (between the === lines)"
echo ""
echo "2. Update tauri.conf.json:"
echo "   - Open: src-tauri/tauri.conf.json"
echo "   - Find: 'pubkey': 'YOUR_PUBLIC_KEY_HERE'"
echo "   - Replace with the public key shown above"
echo ""
echo "3. Create a release:"
echo "   - Update version in package.json, Cargo.toml, and tauri.conf.json"
echo "   - git tag v1.0.0"
echo "   - git push origin v1.0.0"
echo ""
echo -e "${GREEN}✨ Setup complete! See .github/RELEASE_SETUP.md for detailed instructions.${NC}"

