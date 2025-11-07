#!/bin/bash

echo "🚀 Creando contenedor para probar el monitoreo..."
echo ""

# Crear un contenedor de PostgreSQL
docker run -d \
  --name test-monitoring \
  -e POSTGRES_PASSWORD=secret \
  -p 5555:5432 \
  postgres:latest

echo ""
echo "✅ Contenedor creado: test-monitoring"
echo ""
echo "📊 CÓMO VER EL MONITOREO:"
echo "========================"
echo ""
echo "1. Ve a la app → pestaña 'Databases'"
echo "2. Busca el contenedor 'test-monitoring' (debería estar en estado 'running')"
echo "3. En las acciones del contenedor, verás un botón con el icono 📈 (gráfica)"
echo "4. Es el PRIMER botón de la izquierda (antes del botón de Stop)"
echo "5. Click en ese botón para abrir el modal de monitoreo"
echo ""
echo "El botón tiene el tooltip: 'Monitor resources'"
echo ""
echo "⚠️  NOTA: El botón SOLO aparece en contenedores RUNNING"
echo ""
echo "🧹 Para limpiar después:"
echo "   docker stop test-monitoring && docker rm test-monitoring"
echo ""
