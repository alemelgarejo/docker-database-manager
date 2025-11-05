// Función para obtener la API de Tauri de forma segura
function getTauriAPI() {
  return new Promise((resolve) => {
    const checkTauri = () => {
      if (window.__TAURI__) {
        const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
        const check = window.__TAURI__?.plugin?.updater?.check;
        const ask = window.__TAURI__?.plugin?.dialog?.ask;
        const relaunch = window.__TAURI__?.plugin?.process?.relaunch;
        
        if (invoke) {
          console.log('✅ Tauri API cargada correctamente');
          resolve({ invoke, check, ask, relaunch });
        } else {
          setTimeout(checkTauri, 50);
        }
      } else {
        setTimeout(checkTauri, 50);
      }
    };
    checkTauri();
  });
}

// Variables globales para la API
let invoke, check, ask, relaunch;

console.log('🔄 main.js v3 cargado - conexión mejorada con Docker');
console.log('✅ Esperando a que Tauri esté disponible...');

// Función para verificar actualizaciones
async function checkForUpdates(silent = true) {
  try {
    if (!check) {
      console.log('⚠️ Plugin de actualización no disponible');
      return;
    }
    
    console.log('🔍 Verificando actualizaciones...');
    const update = await check();
    
    if (update?.available) {
      console.log('✨ Nueva versión disponible:', update.version);
      
      const shouldUpdate = await ask(
        `¡Nueva versión ${update.version} disponible!\n\n¿Deseas actualizar ahora?`,
        {
          title: 'Actualización Disponible',
          kind: 'info'
        }
      );

      if (shouldUpdate) {
        showNotification('Descargando actualización...', 'info');
        await update.downloadAndInstall();
        
        const shouldRelaunch = await ask(
          'Actualización completada. ¿Reiniciar la aplicación ahora?',
          {
            title: 'Actualización Completada',
            kind: 'info'
          }
        );

        if (shouldRelaunch) {
          await relaunch();
        }
      }
    } else {
      console.log('✅ La aplicación está actualizada');
      if (!silent) {
        showNotification('La aplicación está actualizada', 'success');
      }
    }
  } catch (error) {
    console.error('❌ Error al verificar actualizaciones:', error);
    if (!silent) {
      showNotification('Error al verificar actualizaciones', 'error');
    }
  }
}

// Función para verificar actualizaciones manualmente
window.checkUpdatesManually = () => checkForUpdates(false);

// TEST: Verificar que las funciones están correctas
window.testRemove = async (id) => {
  console.log('TEST remove_container con:', { containerId: id, removeVolumes: true });
  try {
    const result = await invoke('remove_container', { 
      containerId: String(id), 
      removeVolumes: Boolean(true)
    });
    console.log('✅ TEST EXITOSO:', result);
  } catch (e) {
    console.error('❌ TEST FALLÓ:', e);
  }
};

function showLoading() {
  document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

function showNotification(message, type = 'success') {
  const notif = document.createElement('div');
  notif.style.cssText = `position:fixed;top:80px;right:20px;z-index:9999;background:${type==='error'?'#dc2626':'#10b981'};color:white;padding:1rem 1.5rem;border-radius:8px;box-shadow:0 10px 20px rgba(0,0,0,0.3);`;
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

async function checkDocker() {
  try {
    await invoke('check_docker');
    document.getElementById('docker-status').textContent = '✅ Docker conectado';
    return true;
  } catch (e) {
    document.getElementById('docker-status').textContent = '❌ Docker no conectado';
    return false;
  }
}

async function loadContainers() {
  try {
    const containers = await invoke('list_containers');
    const list = document.getElementById('containers-list');
    const noData = document.getElementById('no-containers');
    
    if (!containers.length) {
      list.innerHTML = '';
      noData.style.display = 'block';
      return;
    }
    
    noData.style.display = 'none';
    list.innerHTML = containers.map(c => {
      const shortId = c.id.substring(0, 12);
      const dbTypeName = c.db_type.charAt(0).toUpperCase() + c.db_type.slice(1);
      return `
      <div class="container-card">
        <div class="container-header">
          <h3 class="container-title">${c.db_icon} ${c.name}</h3>
          <span class="status-badge status-${c.status}">${c.status}</span>
        </div>
        <div class="container-info">
          <div class="info-row"><span class="info-label">Tipo:</span><span>${dbTypeName}</span></div>
          <div class="info-row"><span class="info-label">BD:</span><span>${c.database_name}</span></div>
          <div class="info-row"><span class="info-label">Puerto:</span><span>${c.port}</span></div>
          <div class="info-row"><span class="info-label">ID:</span><span title="${c.id}">${shortId}</span></div>
          <div class="info-row"><span class="info-label">Creado:</span><span>${c.created}</span></div>
        </div>
        <div class="container-actions">
          ${c.status === 'running' ? `
            <button class="btn btn-warning btn-sm" onclick="stopC('${c.id}')">⏸️ Detener</button>
            <button class="btn btn-primary btn-sm" onclick="showLogs('${c.id}')">📋 Logs</button>
            ${c.db_type === 'postgresql' || c.db_type === 'mysql' || c.db_type === 'mariadb' ? `
              <button class="btn btn-success btn-sm" onclick="showSQL('${c.id}','${c.database_name}')">💻 SQL</button>
            ` : ''}
          ` : `
            <button class="btn btn-success btn-sm" onclick="startC('${c.id}')">▶️ Iniciar</button>
          `}
          <button class="btn btn-secondary btn-sm" onclick="restartC('${c.id}')">🔄</button>
          <button class="btn btn-danger btn-sm" onclick="removeC('${c.id}')">🗑️</button>
        </div>
      </div>
    `}).join('');
  } catch (e) {
    showNotification('Error: ' + e, 'error');
  }
}

async function createDB(e) {
  e.preventDefault();
  
  if (!selectedDbType) {
    showNotification('Selecciona un tipo de base de datos', 'error');
    return;
  }
  
  showLoading();
  try {
    const config = {
      name: document.getElementById('db-name').value,
      username: document.getElementById('db-username').value || '',
      password: document.getElementById('db-password').value || '',
      port: parseInt(document.getElementById('db-port').value),
      version: document.getElementById('db-version').value,
      type: selectedDbType
    };
    
    const result = await invoke('create_database', { config: config });
    
    showNotification(result, 'success');
    window.closeCreateModal();
    await loadContainers();
  } catch (e) {
    showNotification('Error al crear BD: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

async function startC(id) {
  showLoading();
  try {
    await invoke('start_container', { containerId: id });
    showNotification('Iniciado');
    await loadContainers();
  } catch (e) {
    showNotification('Error: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

async function stopC(id) {
  showLoading();
  try {
    await invoke('stop_container', { containerId: id });
    showNotification('Detenido');
    await loadContainers();
  } catch (e) {
    showNotification('Error: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

async function restartC(id) {
  showLoading();
  try {
    await invoke('restart_container', { containerId: id });
    showNotification('Reiniciado');
    await loadContainers();
  } catch (e) {
    showNotification('Error: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

async function removeC(id) {
  if (!confirm('¿Eliminar contenedor?')) return;
  const vols = confirm('¿Eliminar datos también?');
  showLoading();
  try {
    const result = await invoke('remove_container', { 
      containerId: id, 
      removeVolumes: Boolean(vols)
    });
    
    showNotification(result, 'success');
    await loadContainers();
  } catch (e) {
    showNotification('Error al eliminar: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

async function showLogs(id) {
  document.getElementById('logs-modal').classList.add('active');
  const content = document.getElementById('logs-content');
  content.innerHTML = 'Cargando...';
  try {
    const logs = await invoke('get_logs', { containerId: id });
    content.innerHTML = logs.map(l => `<div>[${l.timestamp}] ${l.message}</div>`).join('') || 'Sin logs';
  } catch (e) {
    content.innerHTML = 'Error: ' + e;
  }
}

let currentSQL = null;
function showSQL(id, db) {
  currentSQL = { id, db };
  document.getElementById('sql-modal').classList.add('active');
}

async function execSQL(e) {
  e.preventDefault();
  const sql = document.getElementById('sql-query').value.trim();
  if (!sql) return;
  const output = document.getElementById('sql-output');
  output.textContent = 'Ejecutando...';
  try {
    const result = await invoke('exec_sql', {
      containerId: currentSQL.id,
      database: currentSQL.db,
      username: 'postgres',
      sql: sql
    });
    output.textContent = result || 'OK';
  } catch (e) {
    output.textContent = 'Error: ' + e;
  }
}

// Variables globales para el modal de creación
let selectedDbType = null;
let databaseTypes = [];

// Cargar tipos de bases de datos
async function loadDatabaseTypes() {
  try {
    databaseTypes = await invoke('get_database_types');
    console.log('Database types loaded:', databaseTypes);
  } catch (e) {
    console.error('Error loading database types:', e);
    showNotification('Error cargando tipos de BD: ' + e, 'error');
  }
}

// Mostrar paso 1: Selección de tipo de BD
function showStep1() {
  document.getElementById('step-1').style.display = 'block';
  document.getElementById('step-2').style.display = 'none';
  
  const grid = document.getElementById('db-types-grid');
  grid.innerHTML = databaseTypes.map(type => `
    <div class="db-type-card" onclick="selectDatabaseType('${type.id}')">
      <div class="db-type-icon">${type.icon}</div>
      <div class="db-type-name">${type.name}</div>
    </div>
  `).join('');
}

// Mostrar paso 2: Configuración de la BD
function showStep2() {
  document.getElementById('step-1').style.display = 'none';
  document.getElementById('step-2').style.display = 'block';
  
  const dbType = databaseTypes.find(t => t.id === selectedDbType);
  if (!dbType) return;
  
  // Actualizar encabezado
  document.getElementById('selected-db-icon').textContent = dbType.icon;
  document.getElementById('selected-db-name').textContent = dbType.name;
  document.getElementById('modal-title').textContent = `Crear ${dbType.name}`;
  
  // Configurar valores por defecto
  document.getElementById('db-port').value = dbType.default_port;
  document.getElementById('db-username').value = dbType.default_user;
  
  // Mostrar/ocultar campos según el tipo
  const usernameGroup = document.getElementById('username-group');
  const passwordGroup = document.getElementById('password-group');
  
  if (selectedDbType === 'redis') {
    // Redis no requiere usuario, contraseña es opcional
    usernameGroup.style.display = 'none';
    passwordGroup.querySelector('input').required = false;
    passwordGroup.querySelector('label').textContent = 'Contraseña (opcional):';
  } else if (selectedDbType === 'mongodb') {
    // MongoDB puede funcionar sin autenticación
    usernameGroup.style.display = 'block';
    passwordGroup.style.display = 'block';
    usernameGroup.querySelector('input').required = false;
    passwordGroup.querySelector('input').required = false;
    usernameGroup.querySelector('label').textContent = 'Usuario (opcional):';
    passwordGroup.querySelector('label').textContent = 'Contraseña (opcional):';
  } else {
    // PostgreSQL, MySQL, MariaDB requieren usuario y contraseña
    usernameGroup.style.display = 'block';
    passwordGroup.style.display = 'block';
    usernameGroup.querySelector('input').required = true;
    passwordGroup.querySelector('input').required = true;
    usernameGroup.querySelector('label').textContent = 'Usuario:';
    passwordGroup.querySelector('label').textContent = 'Contraseña:';
  }
  
  // Cargar versiones
  const versionSelect = document.getElementById('db-version');
  versionSelect.innerHTML = dbType.versions.map((v, i) => 
    `<option value="${v}" ${i === 0 ? 'selected' : ''}>${dbType.name} ${v}</option>`
  ).join('');
}

// Seleccionar tipo de base de datos
window.selectDatabaseType = (typeId) => {
  selectedDbType = typeId;
  showStep2();
};

// Volver al paso 1
window.goBackToStep1 = () => {
  selectedDbType = null;
  showStep1();
  document.getElementById('create-form').reset();
};

// Abrir modal de creación
window.openCreateModal = () => {
  document.getElementById('create-modal').classList.add('active');
  showStep1();
};

window.closeCreateModal = () => {
  document.getElementById('create-modal').classList.remove('active');
  document.getElementById('create-form').reset();
  selectedDbType = null;
  showStep1();
};

window.closeLogsModal = () => document.getElementById('logs-modal').classList.remove('active');
window.closeSqlModal = () => document.getElementById('sql-modal').classList.remove('active');
window.startC = startC;
window.stopC = stopC;
window.restartC = restartC;
window.removeC = removeC;
window.showLogs = showLogs;
window.showSQL = showSQL;

window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Esperar a que Tauri esté disponible
    const api = await getTauriAPI();
    invoke = api.invoke;
    check = api.check;
    ask = api.ask;
    relaunch = api.relaunch;
    
    console.log('✅ Tauri API inicializada');
    
    // Cargar tipos de bases de datos
    await loadDatabaseTypes();
    
    // Event listeners
    document.getElementById('new-db-btn').onclick = openCreateModal;
    document.getElementById('refresh-btn').onclick = loadContainers;
    document.getElementById('create-form').onsubmit = createDB;
    document.getElementById('sql-form').onsubmit = execSQL;
    
    // Verificar Docker y cargar contenedores
    if (await checkDocker()) {
      await loadContainers();
    } else {
      console.error('❌ No se pudo conectar con Docker');
      showNotification('No se pudo conectar con Docker. Asegúrate de que Docker Desktop esté corriendo.', 'error');
    }
    
    // Actualizar cada 10 segundos
    setInterval(async () => { 
      if (await checkDocker()) {
        await loadContainers(); 
      }
    }, 10000);
    
    // Verificar actualizaciones después de 3 segundos
    setTimeout(() => checkForUpdates(true), 3000);
  } catch (error) {
    console.error('❌ Error al inicializar la aplicación:', error);
    alert('Error al inicializar la aplicación. Por favor, reinicia la aplicación.');
  }
});
