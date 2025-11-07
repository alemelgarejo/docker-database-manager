# 📊 Guía de Monitoreo en Tiempo Real

## ✅ Implementación Completa

### **Backend (Rust/Tauri):**
- ✅ `get_container_stats` - Obtiene stats de un contenedor (CPU, RAM, Network, Disk)
- ✅ `get_all_containers_stats` - Obtiene stats de todos los contenedores
- ✅ `check_resource_alerts` - Verifica alertas de recursos

### **Frontend:**
- ✅ Modal de monitoreo con gráficas en tiempo real
- ✅ Chart.js para visualización
- ✅ Actualización cada 2 segundos
- ✅ Historial de 30 puntos (últimos 60 segundos)
- ✅ Alertas cuando CPU > 80% o RAM > 85%

---

## 🚀 Cómo Probar

### 1. **Crear un contenedor para monitorear**

```bash
# PostgreSQL (genera algo de carga)
docker run -d --name test-postgres \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  postgres:latest

# O MySQL
docker run -d --name test-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -p 3306:3306 \
  mysql:latest
```

### 2. **Abrir el modal de monitoreo**

1. Ir a la pestaña "Databases"
2. Buscar el contenedor en ejecución
3. Click en el botón **📈** (Monitor resources)

### 3. **Ver Métricas en Tiempo Real**

El modal mostrará:

#### 📊 Cards de Estadísticas:
- **CPU Usage**: Porcentaje de uso de CPU
- **Memory Usage**: Memoria usada / Porcentaje
- **Network I/O**: Download ↓ / Upload ↑
- **Disk I/O**: Read / Write

#### 📈 Gráficas:
- **CPU Usage History**: Línea de tendencia de CPU
- **Memory Usage History**: Línea de tendencia de RAM

#### ⚠️ Alertas:
- Aparecen cuando CPU > 80% o Memory > 85%

---

## 🔥 Generar Carga para Probar Alertas

### **Prueba 1: Carga de CPU**

```bash
# En PostgreSQL
docker exec -it test-postgres psql -U postgres -c "
  SELECT pg_sleep(0.001) 
  FROM generate_series(1,1000000);
"

# En MySQL
docker exec -it test-mysql mysql -uroot -proot -e "
  SELECT SLEEP(0.001) 
  FROM (SELECT 1 UNION SELECT 2 UNION SELECT 3) a, 
       (SELECT 1 UNION SELECT 2 UNION SELECT 3) b, 
       (SELECT 1 UNION SELECT 2 UNION SELECT 3) c;
"

# Contenedor Alpine con carga CPU
docker run -d --name cpu-stress alpine sh -c "
  while true; do :; done
"
```

### **Prueba 2: Carga de Memoria**

```bash
# Contenedor que consume memoria
docker run -d --name memory-stress --memory="512m" progrium/stress --vm 2 --vm-bytes 256M --timeout 60s

# PostgreSQL con caché grande
docker exec -it test-postgres psql -U postgres -c "
  CREATE TABLE test_data AS 
  SELECT generate_series(1,1000000) as id, 
         md5(random()::text) as data;
"
```

### **Prueba 3: Carga de Red**

```bash
# Nginx descargando archivos
docker run -d --name network-test nginx

# Generar tráfico
for i in {1..100}; do
  curl -s http://localhost:80 > /dev/null
done
```

### **Prueba 4: Carga de Disco**

```bash
# Escribir datos al disco
docker exec -it test-postgres sh -c "
  dd if=/dev/zero of=/tmp/testfile bs=1M count=500
  rm /tmp/testfile
"
```

---

## 📋 Verificaciones

### ✅ Checklist de Pruebas

- [ ] Modal se abre correctamente
- [ ] Cards muestran valores numéricos
- [ ] Gráficas se dibujan
- [ ] Gráficas se actualizan cada 2 segundos
- [ ] CPU % cambia cuando hay carga
- [ ] Memory % cambia cuando hay carga
- [ ] Network I/O muestra valores
- [ ] Disk I/O muestra valores
- [ ] Alerta aparece cuando CPU > 80%
- [ ] Alerta aparece cuando Memory > 85%
- [ ] Modal se cierra correctamente
- [ ] Intervalo se detiene al cerrar
- [ ] Botón de monitoreo solo visible en contenedores corriendo

---

## 🎯 Casos de Uso

### **Contenedor Idle (Sin carga)**
- CPU: ~0.5%
- Memory: Bajo uso
- Network: 0 KB
- Disk: 0 KB

### **Contenedor con Carga Normal**
- CPU: 5-20%
- Memory: Uso moderado
- Network: KB/s
- Disk: KB/s

### **Contenedor con Alta Carga**
- CPU: >80% → ⚠️ Alerta
- Memory: >85% → ⚠️ Alerta
- Network: MB/s
- Disk: MB/s

---

## 🐛 Troubleshooting

### "No stats available"
- **Causa**: Contenedor detenido
- **Solución**: Iniciar el contenedor

### Gráficas no se actualizan
- **Causa**: Error en Chart.js
- **Solución**: Abrir DevTools y verificar errores de consola

### CPU siempre en 0%
- **Causa**: Contenedor sin actividad
- **Solución**: Generar carga (ver sección arriba)

### Memory percentage > 100%
- **Causa**: Límite de memoria no configurado
- **Efecto**: Mostrará valores extraños, es normal

---

## 💡 Comandos Útiles

```bash
# Ver stats de Docker (comparar con la app)
docker stats test-postgres

# Inspeccionar contenedor
docker inspect test-postgres

# Ver procesos en el contenedor
docker top test-postgres

# Limitar recursos
docker update --cpus=".5" --memory="256m" test-postgres

# Crear contenedor con límites
docker run -d --name limited-postgres \
  --cpus=".5" \
  --memory="512m" \
  -e POSTGRES_PASSWORD=secret \
  postgres:latest
```

---

## 📊 Interpretación de Métricas

### **CPU Usage**
- **0-20%**: Normal, contenedor idle o poco uso
- **20-50%**: Carga moderada
- **50-80%**: Carga alta
- **>80%**: ⚠️ Muy alta, verificar queries o procesos

### **Memory Usage**
- **<50%**: Normal
- **50-70%**: Moderado
- **70-85%**: Alto
- **>85%**: ⚠️ Crítico, puede causar OOM

### **Network I/O**
- Depende de la aplicación
- DB: KB/s a MB/s normal
- Web: puede ser GB/s

### **Disk I/O**
- Depende de operaciones de lectura/escritura
- DB con índices: alto
- Redis/cache: bajo

---

## 🎨 Personalización (Futuras mejoras)

### Ideas para extender:

1. **Histórico más largo**:
   - Cambiar `MAX_HISTORY_POINTS` en main.js
   - Guardar en localStorage

2. **Más intervalos**:
   - Botones: 1s, 2s, 5s, 10s

3. **Exportar datos**:
   - CSV de estadísticas
   - Gráficas como imagen

4. **Más tipos de gráficas**:
   - Gráfica de Network combinada
   - Gráfica de Disk I/O

5. **Comparación**:
   - Ver múltiples contenedores a la vez

6. **Alertas persistentes**:
   - Notificaciones desktop
   - Log de alertas

---

## 🧹 Limpieza

```bash
# Detener contenedores de prueba
docker stop test-postgres test-mysql cpu-stress memory-stress network-test limited-postgres 2>/dev/null

# Eliminar contenedores
docker rm test-postgres test-mysql cpu-stress memory-stress network-test limited-postgres 2>/dev/null

# Verificar limpieza
docker ps -a | grep -E "(test-|stress|limited)"
```

---

¡Listo para monitorear! 🚀📊
