#!/bin/bash

# Script para actualizar el logo de la aplicación
# Uso: ./scripts/update-logo.sh /ruta/a/tu/nuevo-logo.png

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Docker DB Manager - Logo Update Script              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que se proporcionó un archivo
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: No se proporcionó archivo de logo${NC}"
    echo ""
    echo "Uso:"
    echo "  ./scripts/update-logo.sh /ruta/a/tu/logo.png"
    echo ""
    echo "Requisitos:"
    echo "  • El logo debe ser PNG o SVG"
    echo "  • Tamaño recomendado: 1024x1024 o mayor"
    echo "  • Fondo transparente preferiblemente"
    echo ""
    exit 1
fi

LOGO_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$LOGO_FILE" ]; then
    echo -e "${RED}❌ Error: Archivo no encontrado: $LOGO_FILE${NC}"
    exit 1
fi

# Verificar extensión
EXTENSION="${LOGO_FILE##*.}"
if [[ ! "$EXTENSION" =~ ^(png|PNG|svg|SVG)$ ]]; then
    echo -e "${RED}❌ Error: El archivo debe ser PNG o SVG${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Archivo encontrado: $LOGO_FILE${NC}"
echo ""

# Verificar dependencias
echo "📦 Verificando dependencias..."

if ! command -v convert &> /dev/null && ! command -v sips &> /dev/null; then
    echo -e "${YELLOW}⚠️  No se encontró ImageMagick ni sips${NC}"
    echo ""
    echo "Instala ImageMagick para generación automática:"
    echo "  brew install imagemagick"
    echo ""
    echo "O continúa para copiar el logo base y generar manualmente."
    read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    MANUAL_MODE=true
else
    echo -e "${GREEN}✓ Herramientas de conversión encontradas${NC}"
    MANUAL_MODE=false
fi

echo ""

# Directorio de destino
ICONS_DIR="$(dirname "$0")/../src-tauri/icons"
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"
ICONS_DIR="$PROJECT_ROOT/src-tauri/icons"

echo "📂 Directorio de iconos: $ICONS_DIR"
echo ""

# Crear backup
BACKUP_DIR="$ICONS_DIR/backup-$(date +%Y%m%d-%H%M%S)"
echo "💾 Creando backup en: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp "$ICONS_DIR"/*.png "$ICONS_DIR"/*.icns "$ICONS_DIR"/*.ico "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Backup creado${NC}"
echo ""

# Función para generar iconos con ImageMagick
generate_with_imagemagick() {
    local source="$1"
    local size="$2"
    local output="$3"
    
    convert "$source" -resize "${size}x${size}" -background none -gravity center -extent "${size}x${size}" "$output"
}

# Función para generar iconos con sips (macOS)
generate_with_sips() {
    local source="$1"
    local size="$2"
    local output="$3"
    
    sips -z "$size" "$size" "$source" --out "$output" &>/dev/null
}

# Generar iconos
if [ "$MANUAL_MODE" = false ]; then
    echo "🎨 Generando iconos en diferentes tamaños..."
    echo ""
    
    # Función para generar icono
    generate_icon() {
        local size=$1
        local filename=$2
        
        echo -n "  • Generando ${filename} (${size}x${size})... "
        
        if command -v convert &> /dev/null; then
            generate_with_imagemagick "$LOGO_FILE" "$size" "$ICONS_DIR/$filename"
        else
            generate_with_sips "$LOGO_FILE" "$size" "$ICONS_DIR/$filename"
        fi
        
        echo -e "${GREEN}✓${NC}"
    }
    
    # Generar todos los tamaños necesarios
    generate_icon 32 "32x32.png"
    generate_icon 128 "128x128.png"
    generate_icon 256 "128x128@2x.png"
    generate_icon 1024 "icon.png"
    
    # Windows Store logos
    generate_icon 30 "Square30x30Logo.png"
    generate_icon 44 "Square44x44Logo.png"
    generate_icon 71 "Square71x71Logo.png"
    generate_icon 89 "Square89x89Logo.png"
    generate_icon 107 "Square107x107Logo.png"
    generate_icon 142 "Square142x142Logo.png"
    generate_icon 150 "Square150x150Logo.png"
    generate_icon 284 "Square284x284Logo.png"
    generate_icon 310 "Square310x310Logo.png"
    generate_icon 50 "StoreLogo.png"
    
    echo ""
    echo -e "${GREEN}✓ Iconos PNG generados${NC}"
    echo ""
    
    # Generar .icns para macOS
    if command -v iconutil &> /dev/null; then
        echo "🍎 Generando icono macOS (.icns)..."
        
        # Crear iconset temporal
        ICONSET_DIR="$ICONS_DIR/icon.iconset"
        mkdir -p "$ICONSET_DIR"
        
        # Generar todos los tamaños necesarios para .icns
        generate_with_imagemagick "$LOGO_FILE" 16 "$ICONSET_DIR/icon_16x16.png"
        generate_with_imagemagick "$LOGO_FILE" 32 "$ICONSET_DIR/icon_16x16@2x.png"
        generate_with_imagemagick "$LOGO_FILE" 32 "$ICONSET_DIR/icon_32x32.png"
        generate_with_imagemagick "$LOGO_FILE" 64 "$ICONSET_DIR/icon_32x32@2x.png"
        generate_with_imagemagick "$LOGO_FILE" 128 "$ICONSET_DIR/icon_128x128.png"
        generate_with_imagemagick "$LOGO_FILE" 256 "$ICONSET_DIR/icon_128x128@2x.png"
        generate_with_imagemagick "$LOGO_FILE" 256 "$ICONSET_DIR/icon_256x256.png"
        generate_with_imagemagick "$LOGO_FILE" 512 "$ICONSET_DIR/icon_256x256@2x.png"
        generate_with_imagemagick "$LOGO_FILE" 512 "$ICONSET_DIR/icon_512x512.png"
        generate_with_imagemagick "$LOGO_FILE" 1024 "$ICONSET_DIR/icon_512x512@2x.png"
        
        # Convertir a .icns
        iconutil -c icns "$ICONSET_DIR" -o "$ICONS_DIR/icon.icns"
        
        # Limpiar
        rm -rf "$ICONSET_DIR"
        
        echo -e "${GREEN}✓ Icono macOS (.icns) generado${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠️  iconutil no encontrado, .icns no generado${NC}"
        echo "   Genera manualmente o usa: https://cloudconvert.com/png-to-icns"
        echo ""
    fi
    
    # Generar .ico para Windows
    if command -v convert &> /dev/null; then
        echo "🪟 Generando icono Windows (.ico)..."
        
        convert "$LOGO_FILE" \
            \( -clone 0 -resize 16x16 \) \
            \( -clone 0 -resize 32x32 \) \
            \( -clone 0 -resize 48x48 \) \
            \( -clone 0 -resize 64x64 \) \
            \( -clone 0 -resize 128x128 \) \
            \( -clone 0 -resize 256x256 \) \
            -delete 0 "$ICONS_DIR/icon.ico"
        
        echo -e "${GREEN}✓ Icono Windows (.ico) generado${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠️  ImageMagick no encontrado, .ico no generado${NC}"
        echo "   Genera manualmente o usa: https://cloudconvert.com/png-to-ico"
        echo ""
    fi
else
    echo "📋 Modo manual activado"
    echo ""
    echo "Copia tu logo a estas ubicaciones y genera los tamaños necesarios:"
    echo "  • icon.png (1024x1024)"
    echo "  • icon.icns (macOS)"
    echo "  • icon.ico (Windows)"
    echo ""
    
    # Al menos copiar el logo base
    cp "$LOGO_FILE" "$ICONS_DIR/icon.png"
    echo -e "${GREEN}✓ Logo base copiado a icon.png${NC}"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Logo actualizado exitosamente${NC}"
echo ""
echo "📝 Próximos pasos:"
echo ""
echo "1. Verifica los iconos generados:"
echo "   open $ICONS_DIR"
echo ""
echo "2. Si necesitas ajustes, edita manualmente los iconos"
echo ""
echo "3. Reconstruye la aplicación:"
echo "   npm run build"
echo ""
echo "4. El nuevo logo aparecerá en:"
echo "   • Aplicación macOS"
echo "   • Instalador DMG"
echo "   • Ejecutable Windows"
echo "   • Taskbar/Dock"
echo ""
echo "💾 Backup guardado en:"
echo "   $BACKUP_DIR"
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    ✨ Completado                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
