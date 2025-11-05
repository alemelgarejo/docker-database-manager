const { invoke } = window.__TAURI__.core;
const { check } = window.__TAURI__.plugin.updater;
const { ask } = window.__TAURI__.plugin.dialog;
const { relaunch } = window.__TAURI__.plugin.process;

console.log('🔄 main.js v2 cargado - containerId y removeVolumes');
console.log('✅ Versión CORRECTA del código cargada');

// Función para verificar actualizaciones
async function checkForUpdates(silent = true) {
  try {
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

// Verificar actualizaciones al iniciar (silencioso)
window.addEventListener('DOMContentLoaded', () => {
  // Esperar 3 segundos después de cargar para verificar actualizaciones
  setTimeout(() => checkForUpdates(true), 3000);
});

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
      const shortId = c.id.substring(0, 12); // Mostrar solo los primeros 12 caracteres
      return `
      <div class="container-card">
        <div class="container-header">
          <h3 class="container-title">${c.name}</h3>
          <span class="status-badge status-${c.status}">${c.status}</span>
        </div>
        <div class="container-info">
          <div class="info-row"><span class="info-label">BD:</span><span>${c.database_name}</span></div>
          <div class="info-row"><span class="info-label">Puerto:</span><span>${c.port}</span></div>
          <div class="info-row"><span class="info-label">ID:</span><span title="${c.id}">${shortId}</span></div>
          <div class="info-row"><span class="info-label">Creado:</span><span>${c.created}</span></div>
        </div>
        <div class="container-actions">
          ${c.status === 'running' ? `
            <button class="btn btn-warning btn-sm" onclick="stopC('${c.id}')">⏸️ Detener</button>
            <button class="btn btn-primary btn-sm" onclick="showLogs('${c.id}')">📋 Logs</button>
            <button class="btn btn-success btn-sm" onclick="showSQL('${c.id}','${c.database_name}')">💻 SQL</button>
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
  showLoading();
  try {
    const config = {
      name: document.getElementById('db-name').value,
      username: document.getElementById('db-username').value,
      password: document.getElementById('db-password').value,
      port: parseInt(document.getElementById('db-port').value),
      version: document.getElementById('db-version').value
    };
    
    const result = await invoke('create_database', { config: config });
    
    showNotification(result, 'success');
    document.getElementById('create-modal').classList.remove('active');
    document.getElementById('create-form').reset();
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

window.closeCreateModal = () => {
  document.getElementById('create-modal').classList.remove('active');
  document.getElementById('create-form').reset();
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
  document.getElementById('new-db-btn').onclick = () => document.getElementById('create-modal').classList.add('active');
  document.getElementById('refresh-btn').onclick = loadContainers;
  document.getElementById('create-form').onsubmit = createDB;
  document.getElementById('sql-form').onsubmit = execSQL;
  
  if (await checkDocker()) await loadContainers();
  setInterval(async () => { if (await checkDocker()) await loadContainers(); }, 10000);
});
