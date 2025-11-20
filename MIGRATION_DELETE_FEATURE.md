# 🗑️ Feature: Eliminar base de datos original después de migración

## Resumen

Esta funcionalidad permite al usuario **opcionalmente** borrar la base de datos original después de una migración exitosa a Docker, con múltiples capas de seguridad para prevenir pérdida accidental de datos.

## 🎯 Comportamiento

### Flujo de migración actualizado:

```
1. Usuario inicia migración → [Migrate Button]
                ↓
2. Confirmación inicial → "Migrate database 'X' to Docker?"
                ↓
3. Proceso de migración:
   • Detecta versión PostgreSQL (ej: 16.1)
   • Usa imagen Docker correcta (postgres:16)
   • Crea dump de la base de datos
   • Crea nuevo contenedor Docker
   • Restaura datos en el contenedor
   • Verifica integridad
                ↓
4. ✅ MIGRACIÓN EXITOSA
                ↓
5. 🆕 PREGUNTA: "¿Deseas borrar la base de datos original?"
                ↓
       ┌─────────┴─────────┐
       ↓                   ↓
   Usuario → NO       Usuario → SI
       ↓                   ↓
   Base original      Modal de confirmación
   permanece          PELIGROSO
       ↓                   ↓
   ✅ Ambas            [Cancel] [DELETE Forever]
   disponibles             ↓
                      ✅ Base original eliminada
                      ✅ Solo queda la en Docker
```

## 🔒 Capas de seguridad

### 1️⃣ Solo después de migración exitosa

```javascript
// ❌ NO se pregunta si la migración falla
catch (error) {
  showNotification(`Migration failed: ${error}`, 'error');
  hideLoading();
  // NO PREGUNTA SOBRE BORRAR
}

// ✅ Solo se pregunta después de éxito
showNotification(`Database migrated successfully!`, 'success');
await loadLocalDatabases();
await loadContainers();
// AHORA SÍ PREGUNTA
setTimeout(() => {
  if (confirm("Would you like to DELETE the original?")) {
    confirmDeleteOriginalDatabase(dbName);
  }
}, 800);
```

### 2️⃣ Primera confirmación (simple)

Mensaje claro con advertencias:
```
Migration completed successfully!

Would you like to DELETE the original database "mydb"?

⚠️ WARNING: This action cannot be undone.
Only proceed if you've verified the migrated data is correct.

[No] [Yes]
```

### 3️⃣ Segunda confirmación (modal detallado)

Solo si el usuario dijo "Sí" en la primera:

```
┌────────────────────────────────────────────┐
│ ⚠️ DANGER ZONE - NO UNDO                   │
├────────────────────────────────────────────┤
│ You are about to PERMANENTLY DELETE:       │
│                                            │
│  📦 mydb                                   │
│                                            │
│ ⚠️ WARNING: THIS ACTION CANNOT BE UNDONE   │
│ All data will be LOST FOREVER.             │
│                                            │
│ Before proceeding, make sure:              │
│  ✓ Migration was successful                │
│  ✓ You verified data in Docker container   │
│  ✓ You tested the migrated database        │
│  ✓ You understand this is PERMANENT        │
│                                            │
│ 💡 Tip: The migrated database is safe     │
│    in Docker and will continue working.    │
│                                            │
│ [Cancel - Keep Original] [🗑️ DELETE Forever]│
└────────────────────────────────────────────┘
```

### 4️⃣ Eliminación segura (Backend)

```rust
async fn delete_original_database(config, database_name) {
  // 1. Conectar a 'postgres' (no a la DB que vamos a borrar)
  let client = connect("dbname=postgres");
  
  // 2. Terminar TODAS las conexiones activas
  client.execute(
    "SELECT pg_terminate_backend(pid) 
     FROM pg_stat_activity 
     WHERE datname = $1 
     AND pid <> pg_backend_pid()",
    [database_name]
  );
  
  // 3. Esperar 500ms para que se cierren las conexiones
  sleep(500ms);
  
  // 4. Eliminar la base de datos
  client.execute("DROP DATABASE IF EXISTS $1", [database_name]);
  
  // ✅ Éxito
}
```

## 📊 Casos de uso

### Caso 1: Usuario borra la original ✅

```
1. Migra "produccion_db"
2. Dice "Sí, quiero borrar"
3. Confirma en el modal
4. ✅ Base original eliminada
5. ✅ Datos siguen en Docker
6. ✅ Espacio liberado en disco
```

### Caso 2: Usuario mantiene ambas ✅

```
1. Migra "produccion_db"
2. Dice "No, mantenerla"
3. ✅ Base original intacta
4. ✅ Copia en Docker disponible
5. ✅ Puede comparar ambas
```

### Caso 3: Migración falla ❌ → No pregunta

```
1. Intenta migrar "corrupted_db"
2. ❌ Error: "pg_dump failed..."
3. ❌ NO pregunta sobre borrar
4. ✅ Base original segura
```

## 🎨 UI/UX

### Timing del diálogo

- **Delay de 800ms** antes de preguntar
- Permite al usuario:
  - ✅ Ver notificación de éxito
  - ✅ Ver que las listas se actualizaron
  - ✅ Procesar que la migración fue exitosa
  - ✅ Evita clicks accidentales

### Colores y diseño

- 🔴 **Rojo** - Acciones destructivas
- ⚠️ **Amarillo** - Advertencias
- ✅ **Verde** - Éxito/confirmación
- ⬜ **Gris** - Cancelar/mantener

## 🔧 Implementación técnica

### Frontend (JavaScript)

**Archivo**: `src/main.js`

```javascript
async function startMigration(dbName) {
  // ... proceso de migración ...
  
  // Después de éxito
  await loadLocalDatabases();
  await loadContainers();
  hideLoading();
  
  // Pregunta con delay
  setTimeout(() => {
    if (confirm(`...DELETE original?...`)) {
      confirmDeleteOriginalDatabase(dbName);
    }
  }, 800);
}

function confirmDeleteOriginalDatabase(dbName) {
  // Crea modal con advertencias
  const modalHTML = `...DANGER ZONE...`;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function executeDeleteOriginalDatabase(dbName) {
  await invoke('delete_original_database', {
    config: appState.getMigration("localPostgresConfig"),
    databaseName: dbName,
  });
  await loadLocalDatabases();
}
```

### Backend (Rust)

**Archivo**: `src-tauri/src/lib.rs`

```rust
#[tauri::command]
async fn delete_original_database(
    config: LocalPostgresConfig,
    database_name: String,
) -> Result<String, String> {
    // Conectar a postgres
    let (client, connection) = tokio_postgres::connect(
        &format!("...dbname=postgres..."),
        NoTls
    ).await?;
    
    // Terminar conexiones
    client.execute(
        "SELECT pg_terminate_backend(...)",
        &[]
    ).await?;
    
    tokio::time::sleep(Duration::from_millis(500)).await;
    
    // Drop database
    client.execute(
        "DROP DATABASE IF EXISTS \"{}\"",
        &[]
    ).await?;
    
    Ok(format!("Database '{}' deleted successfully", database_name))
}
```

## ⚠️ Consideraciones importantes

### Lo que SÍ hace:
- ✅ Pregunta solo después de migración exitosa
- ✅ Múltiples confirmaciones
- ✅ Advertencias claras y visibles
- ✅ Cierra conexiones activas antes de borrar
- ✅ Notifica éxito/error

### Lo que NO hace:
- ❌ No hace backup automático
- ❌ No permite recuperar después de borrar
- ❌ No pregunta si la migración falla

### Recomendaciones para usuarios:

1. **Verificar primero** - Conectarse al contenedor Docker y verificar datos
2. **Hacer backup manual** - Si es producción, hacer backup externo
3. **Testear migración** - Probar con DB de desarrollo primero
4. **No tener prisa** - Mantener ambas bases unos días si no estás seguro

## 🧪 Testing

### Casos a probar:

1. **Migración exitosa + borrar**: ✅
   ```
   1. Migrar DB
   2. Decir "Sí" a borrar
   3. Confirmar en modal
   4. Verificar que original desapareció
   5. Verificar que Docker sigue funcionando
   ```

2. **Migración exitosa + mantener**: ✅
   ```
   1. Migrar DB
   2. Decir "No" a borrar
   3. Verificar que ambas existen
   4. Conectar a ambas y verificar datos
   ```

3. **Migración fallida**: ✅
   ```
   1. Intentar migrar DB inaccesible
   2. Verificar que falla
   3. Verificar que NO pregunta sobre borrar
   4. Verificar que original sigue intacta
   ```

4. **Cancelar en modal**: ✅
   ```
   1. Migrar DB
   2. Decir "Sí" a borrar
   3. Click en "Cancel" en modal
   4. Verificar que original sigue intacta
   ```

## 📝 Notas de desarrollo

### Archivos modificados:
- `src/main.js` - Función `startMigration()` actualizada
- `src-tauri/src/lib.rs` - Ya tenía `delete_original_database()`

### No se requirió:
- ❌ Cambios en CSS (modal ya existía)
- ❌ Nuevo comando Rust (ya existía)
- ❌ Cambios en estado de la app

### Beneficios:
- ✅ Código mínimo añadido
- ✅ Usa infraestructura existente
- ✅ Consistente con el resto de la app
- ✅ Seguro por diseño

## 🎯 Conclusión

Esta feature permite a los usuarios **opcionalmente** liberar espacio después de migrar, pero con **múltiples capas de protección** para evitar pérdida accidental de datos. El enfoque de "confirmación doble" garantiza que solo usuarios que realmente entienden las consecuencias puedan eliminar la base de datos original.

La implementación es **quirúrgica** - solo modifica lo necesario y aprovecha código existente para mantener consistencia y minimizar riesgo de bugs.
