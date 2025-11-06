// Import icons
import { getIcon } from './icons.js';

// Función para obtener la API de Tauri de forma segura
function getTauriAPI() {
  return new Promise((resolve) => {
    const checkTauri = () => {
      if (window.__TAURI__) {
        const invoke =
          window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
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
          kind: 'info',
        },
      );

      if (shouldUpdate) {
        showNotification('Descargando actualización...', 'info');
        await update.downloadAndInstall();

        const shouldRelaunch = await ask(
          'Actualización completada. ¿Reiniciar la aplicación ahora?',
          {
            title: 'Actualización Completada',
            kind: 'info',
          },
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
  console.log('TEST remove_container con:', {
    containerId: id,
    removeVolumes: true,
  });
  try {
    const result = await invoke('remove_container', {
      containerId: String(id),
      removeVolumes: Boolean(true),
    });
    console.log('✅ TEST EXITOSO:', result);
  } catch (e) {
    console.error('❌ TEST FALLÓ:', e);
  }
};

function showLoading(message = 'Loading...') {
  document.getElementById('loading-overlay').style.display = 'flex';
  document.getElementById('loading-text').textContent = message;
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

function showNotification(message, type = 'success') {
  const colors = {
    success: '#10b981',
    error: '#dc2626',
    info: '#3b82f6',
    warning: '#f59e0b'
  };
  
  const notif = document.createElement('div');
  notif.style.cssText = `position:fixed;top:80px;right:20px;z-index:9999;background:${colors[type] || colors.success};color:white;padding:1rem 1.5rem;border-radius:8px;box-shadow:0 10px 20px rgba(0,0,0,0.3);max-width:400px;`;
  notif.textContent = message;
  document.body.appendChild(notif);
  
  const duration = type === 'info' ? 5000 : 3000;
  setTimeout(() => notif.remove(), duration);
}

async function checkDocker() {
  try {
    await invoke('check_docker');
    document.getElementById('docker-status').textContent = 'Docker Connected';
    return true;
  } catch (_e) {
    document.getElementById('docker-status').textContent =
      'Docker Disconnected';
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
    list.innerHTML = containers
      .map((c) => {
        const shortId = c.id.substring(0, 12);
        const dbTypeName =
          c.db_type.charAt(0).toUpperCase() + c.db_type.slice(1);

        const dbIconMap = {
          postgresql: 'postgresql',
          mysql: 'mysql',
          mongodb: 'mongodb',
          redis: 'redis',
          mariadb: 'mariadb',
        };
        const dbIcon = getIcon(dbIconMap[c.db_type] || 'database');

        return `
      <div class="db-card" data-db-type="${c.db_type}">
        <div class="db-card-header">
          <div class="db-card-icon">${dbIcon}</div>
          <div class="db-card-info">
            <h3 class="db-card-title">${c.name}</h3>
            <span class="db-card-meta">${dbTypeName} ${c.database_name}</span>
          </div>
          <span class="db-status db-status-${c.status}">${c.status}</span>
        </div>
        
        <div class="db-card-data">
          <div class="db-data-item" onclick="copyToClipboard('${c.port}', 'Port copied!')" title="Click to copy">
            <span class="db-data-label">Port</span>
            <span class="db-data-value">${c.port}</span>
          </div>
          <div class="db-data-item" onclick="copyToClipboard('${shortId}', 'ID copied!')" title="Click to copy">
            <span class="db-data-label">Container ID</span>
            <span class="db-data-value">${shortId}</span>
          </div>
          <div class="db-data-item" onclick="copyToClipboard('${c.created}', 'Date copied!')" title="Click to copy">
            <span class="db-data-label">Created</span>
            <span class="db-data-value">${c.created}</span>
          </div>
          <div class="db-data-item" onclick="copyToClipboard('localhost:${c.port}', 'Connection copied!')" title="Click to copy">
            <span class="db-data-label">Connection</span>
            <span class="db-data-value">localhost:${c.port}</span>
          </div>
        </div>
        
        <div class="db-card-actions">
          ${
            c.status === 'running'
              ? `
            <button class="db-action-btn db-btn-stop" onclick="stopC('${c.id}')" title="Stop container">
              ${getIcon('pause')}
            </button>
            <button class="db-action-btn db-btn-logs" onclick="showLogs('${c.id}')" title="View logs">
              ${getIcon('fileText')}
            </button>
            ${
              c.db_type === 'postgresql' ||
              c.db_type === 'mysql' ||
              c.db_type === 'mariadb'
                ? `
              <button class="db-action-btn db-btn-sql" onclick="showSQL('${c.id}','${c.database_name}')" title="Open SQL console">
                ${getIcon('terminal')}
              </button>
            `
                : ''
            }
            <button class="db-action-btn db-btn-restart" onclick="restartC('${c.id}')" title="Restart container">
              ${getIcon('rotateCw')}
            </button>
          `
              : `
            <button class="db-action-btn db-btn-start" onclick="startC('${c.id}')" title="Start container">
              ${getIcon('play')}
            </button>
            <button class="db-action-btn db-btn-restart" onclick="restartC('${c.id}')" title="Restart container">
              ${getIcon('rotateCw')}
            </button>
          `
          }
          <button class="db-action-btn db-btn-delete" onclick="confirmRemove('${c.id}', '${c.name}')" title="Delete container">
            ${getIcon('trash')}
          </button>
        </div>
      </div>
    `;
      })
      .join('');
  } catch (e) {
    showNotification('Error: ' + e, 'error');
  }
}

// ===== DASHBOARD =====
async function loadDashboardStats() {
  try {
    const containers = await invoke('list_containers');

    // Calcular estadísticas
    const total = containers.length;
    const running = containers.filter((c) => c.status === 'running').length;
    const stopped = containers.filter((c) => c.status !== 'running').length;

    // Contar volúmenes únicos
    const volumes = new Set();
    containers.forEach((c) => {
      if (c.volume) volumes.add(c.volume);
    });

    // Actualizar UI
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-running').textContent = running;
    document.getElementById('stat-stopped').textContent = stopped;
    document.getElementById('stat-volumes').textContent = volumes.size;

    // Cargar contenedores recientes
    loadRecentContainers(containers);
  } catch (e) {
    console.error('Error loading dashboard stats:', e);
  }
}

function loadRecentContainers(containers) {
  const recentContainer = document.getElementById('recent-containers');

  if (!containers || containers.length === 0) {
    recentContainer.innerHTML =
      '<div class="no-data"><p>No containers yet</p></div>';
    return;
  }

  // Mostrar últimos 5 contenedores
  const recent = containers.slice(0, 5);

  recentContainer.innerHTML = recent
    .map((c) => {
      const dbIconHtml = getIcon(c.db_type?.toLowerCase() || 'database');
      const statusClass = c.status === 'running' ? 'running' : 'stopped';

      return `
      <div class="recent-container-item">
        <div class="recent-container-info">
          <div class="recent-container-icon">${dbIconHtml}</div>
          <div class="recent-container-details">
            <div class="recent-container-name">${c.name}</div>
            <div class="recent-container-type">${c.db_type.toUpperCase()} • Port ${c.port}</div>
          </div>
        </div>
        <div class="recent-container-status">
          <div class="status-dot-small ${statusClass}"></div>
          <span style="font-size: 0.813rem; color: var(--text-secondary)">${c.status}</span>
        </div>
      </div>
    `;
    })
    .join('');
}

async function createDB(e) {
  e.preventDefault();

  if (!selectedDbType) {
    showNotification('Selecciona un tipo de base de datos', 'error');
    return;
  }

  showLoading('Creating database...');
  
  // Mostrar notificación informativa
  showNotification('Creating database. First time may take 2-5 minutes to download the image...', 'info');
  
  try {
    const config = {
      name: document.getElementById('db-name').value,
      username: document.getElementById('db-username').value || '',
      password: document.getElementById('db-password').value || '',
      port: parseInt(document.getElementById('db-port').value, 10),
      version: document.getElementById('db-version').value,
      type: selectedDbType,
    };

    console.log('Creating database with config:', config);
    
    // Cambiar mensaje después de 3 segundos si sigue cargando
    const downloadTimer = setTimeout(() => {
      showLoading('Downloading Docker image... This may take 2-5 minutes on first use.');
    }, 3000);
    
    const result = await invoke('create_database', { config: config });
    
    clearTimeout(downloadTimer);
    console.log('Database created:', result);

    showNotification(result, 'success');
    window.closeCreateModal();
    await loadContainers();
    await loadDashboardStats(); // Actualizar dashboard también
  } catch (e) {
    console.error('Error creating database:', e);
    showNotification('Error creating database: ' + e, 'error');
  } finally {
    hideLoading();
    console.log('Loading hidden');
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

// Función para copiar al portapapeles
function copyToClipboard(text, message = 'Copied!') {
  // Intentar con la API moderna
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification(message, 'success');
    }).catch(err => {
      console.error('Failed to copy:', err);
      // Fallback
      copyToClipboardFallback(text, message);
    });
  } else {
    // Fallback para contextos sin HTTPS
    copyToClipboardFallback(text, message);
  }
}

// Fallback para copiar
function copyToClipboardFallback(text, message) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showNotification(message, 'success');
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showNotification('Failed to copy', 'error');
  }
  document.body.removeChild(textarea);
}

// Función para confirmar borrado con modal
function confirmRemove(id, name) {
  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.innerHTML = `
    <div class="confirm-modal-content">
      <div class="confirm-modal-header">
        <h3>Delete Container</h3>
        <button class="confirm-modal-close" onclick="this.closest('.confirm-modal').remove()">×</button>
      </div>
      <div class="confirm-modal-body">
        <p>Are you sure you want to delete <strong>${name}</strong>?</p>
        <label class="confirm-checkbox">
          <input type="checkbox" id="delete-volumes-${id}">
          <span>Also delete volumes and data</span>
        </label>
      </div>
      <div class="confirm-modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.confirm-modal').remove()">Cancel</button>
        <button class="btn btn-danger" onclick="executeRemove('${id}')">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('active'), 10);
}

// Ejecutar el borrado
async function executeRemove(id) {
  const checkbox = document.getElementById(`delete-volumes-${id}`);
  const removeVolumes = checkbox ? checkbox.checked : false;
  
  // Cerrar modal
  document.querySelector('.confirm-modal')?.remove();
  
  showLoading('Deleting container...');
  try {
    const result = await invoke('remove_container', {
      containerId: id,
      removeVolumes: Boolean(removeVolumes),
    });
    showNotification(result, 'success');
    await loadContainers();
    await loadDashboardStats();
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
      removeVolumes: Boolean(vols),
    });
    showNotification(result, 'success');
    await loadContainers();
  } catch (e) {
    showNotification('Error: ' + e, 'error');
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
    content.innerHTML =
      logs.map((l) => `<div>[${l.timestamp}] ${l.message}</div>`).join('') ||
      'Sin logs';
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
      sql: sql,
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

// Helper para obtener el icono SVG de la base de datos
function getDbIcon(type) {
  const iconMap = {
    postgresql: 'postgresql',
    mysql: 'mysql',
    mongodb: 'mongodb',
    redis: 'redis',
    mariadb: 'mariadb',
  };
  return getIcon(iconMap[type.id] || 'database');
}

// Mostrar paso 1: Selección de tipo de BD
function showStep1() {
  document.getElementById('step-1').style.display = 'block';
  document.getElementById('step-2').style.display = 'none';

  const grid = document.getElementById('db-types-grid');
  grid.innerHTML = databaseTypes
    .map(
      (type) => `
    <div class="db-type-card" data-db-type="${type.id}" onclick="selectDatabaseType('${type.id}')">
      <div class="db-type-icon">${getDbIcon(type)}</div>
      <div class="db-type-name">${type.name}</div>
    </div>
  `,
    )
    .join('');
}

// Mostrar paso 2: Configuración de la BD
function showStep2() {
  document.getElementById('step-1').style.display = 'none';
  document.getElementById('step-2').style.display = 'block';

  const dbType = databaseTypes.find((t) => t.id === selectedDbType);
  if (!dbType) return;

  // Actualizar encabezado
  document.getElementById('selected-db-icon').innerHTML = getDbIcon(dbType);
  document.getElementById('selected-db-name').textContent = dbType.name;
  document.getElementById('modal-title').textContent = `Create ${dbType.name}`;

  // Añadir data attribute al contenedor seleccionado
  const selectedDbTypeDiv = document.querySelector('.selected-db-type');
  if (selectedDbTypeDiv) {
    selectedDbTypeDiv.setAttribute('data-db-type', selectedDbType);
  }

  // Inyectar icono en botón back
  updateBackButton();

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
  versionSelect.innerHTML = dbType.versions
    .map(
      (v, i) =>
        `<option value="${v}" ${i === 0 ? 'selected' : ''}>${dbType.name} ${v}</option>`,
    )
    .join('');
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

// Función helper para inyectar icono en botón back
function updateBackButton() {
  const backBtn = document.querySelector('.btn-back');
  if (backBtn) {
    backBtn.innerHTML = `${getIcon('arrowLeft')} <span>Back</span>`;
  }
}

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

window.closeLogsModal = () =>
  document.getElementById('logs-modal').classList.remove('active');
window.closeSqlModal = () =>
  document.getElementById('sql-modal').classList.remove('active');
window.startC = startC;
window.stopC = stopC;
window.restartC = restartC;
window.removeC = removeC;
window.showLogs = showLogs;
window.showSQL = showSQL;
window.copyToClipboard = copyToClipboard;
window.confirmRemove = confirmRemove;
window.executeRemove = executeRemove;

window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Esperar a que Tauri esté disponible
    const api = await getTauriAPI();
    invoke = api.invoke;
    check = api.check;
    ask = api.ask;
    relaunch = api.relaunch;

    console.log('✅ Tauri API inicializada');

    // Inyectar iconos en botones del header
    const refreshBtn = document.getElementById('refresh-btn');
    const newDbBtn = document.getElementById('new-db-btn');
    const updateBtn = document.querySelector('.update-btn');
    const refreshLocalBtn = document.getElementById('refresh-local-btn');

    if (refreshBtn) {
      refreshBtn.innerHTML = `${getIcon('refresh')} <span>Refresh</span>`;
    }
    if (newDbBtn) {
      newDbBtn.innerHTML = `${getIcon('plus')} <span>New Database</span>`;
    }
    if (updateBtn) {
      updateBtn.innerHTML = `${getIcon('download')} <span>Check Updates</span>`;
    }
    if (refreshLocalBtn) {
      refreshLocalBtn.innerHTML = `${getIcon('refresh')} <span>Refresh</span>`;
    }

    // Inyectar iconos en tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach((btn) => {
      const tabName = btn.getAttribute('data-tab');
      let iconName = 'database';
      if (tabName === 'dashboard') iconName = 'chartBar';
      else if (tabName === 'databases') iconName = 'database';
      else if (tabName === 'migration') iconName = 'package';

      const text = btn.querySelector('span:last-child')?.textContent || '';
      if (text) {
        btn.innerHTML = `<span class="tab-icon">${getIcon(iconName)}</span><span>${text}</span>`;
      }
    });

    // Cargar tipos de bases de datos
    await loadDatabaseTypes();

    // Event listeners
    document.getElementById('new-db-btn').onclick = openCreateModal;
    document.getElementById('refresh-btn').onclick = loadContainers;
    document.getElementById('create-form').onsubmit = createDB;
    document.getElementById('sql-form').onsubmit = execSQL;

    // Verificar Docker y cargar contenedores (NO BLOQUEAR LA UI)
    checkDocker()
      .then((connected) => {
        if (connected) {
          loadContainers();
          loadDashboardStats(); // Cargar dashboard también
          document.getElementById('docker-status').textContent =
            '✅ Docker conectado';
        } else {
          console.error('❌ No se pudo conectar con Docker');
          document.getElementById('docker-status').textContent =
            '❌ Docker no conectado';
        }
      })
      .catch((error) => {
        console.error('❌ Error al verificar Docker:', error);
        document.getElementById('docker-status').textContent =
          '❌ Docker no conectado';
      });

    // Actualizar cada 10 segundos
    setInterval(async () => {
      try {
        if (await checkDocker()) {
          await loadContainers();
          // Actualizar dashboard si está activo
          const dashboardTab = document.getElementById('tab-dashboard');
          if (dashboardTab && dashboardTab.classList.contains('active')) {
            loadDashboardStats();
          }
        }
      } catch (e) {
        console.error('Error en actualización periódica:', e);
      }
    }, 10000);

    // Verificar actualizaciones después de 3 segundos
    setTimeout(() => checkForUpdates(true), 3000);
  } catch (error) {
    console.error('❌ Error al inicializar la aplicación:', error);
    alert(
      'Error al inicializar la aplicación. Por favor, reinicia la aplicación.',
    );
  }
});

// ===== TAB SYSTEM =====
window.switchTab = (tabName) => {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`)?.classList.add('active');

  // Load data based on active tab
  if (tabName === 'dashboard') {
    loadDashboardStats();
  } else if (tabName === 'migration') {
    checkLocalPostgres();
    loadMigratedDatabases();
  }
};

// ===== LOCAL POSTGRES MIGRATION =====
let localPostgresConfig = null;

async function checkLocalPostgres() {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const connectionForm = document.getElementById('connection-form');
  const databasesContainer = document.getElementById(
    'local-databases-container',
  );

  statusDot.className = 'status-dot checking';
  statusText.textContent = 'Checking local PostgreSQL...';
  databasesContainer.style.display = 'none';

  try {
    // Try to detect local postgres
    const detected = await invoke('detect_local_postgres');

    if (detected) {
      statusDot.className = 'status-dot connected';
      statusText.textContent = `PostgreSQL detected on ${detected.host}:${detected.port} - Enter credentials to connect`;
      connectionForm.style.display = 'block';

      // Pre-fill detected values
      document.getElementById('local-host').value = detected.host;
      document.getElementById('local-port').value = detected.port;
    } else {
      statusDot.className = 'status-dot disconnected';
      statusText.textContent =
        'Local PostgreSQL not detected - Enter connection details manually';
      connectionForm.style.display = 'block';
    }
  } catch (error) {
    console.error('Error detecting local postgres:', error);
    statusDot.className = 'status-dot disconnected';
    statusText.textContent =
      'Could not auto-detect - Enter connection details manually';
    connectionForm.style.display = 'block';
  }
}

async function connectLocalPostgres(e) {
  e.preventDefault();
  showLoading();

  const config = {
    host: document.getElementById('local-host').value,
    port: parseInt(document.getElementById('local-port').value, 10),
    user: document.getElementById('local-user').value,
    password: document.getElementById('local-password').value,
  };

  try {
    const result = await invoke('connect_local_postgres', { config });
    localPostgresConfig = config;

    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    statusDot.className = 'status-dot connected';
    statusText.textContent = `Connected to PostgreSQL at ${config.host}:${config.port}`;

    showNotification('Connected to local PostgreSQL', 'success');

    // Load databases after successful connection
    await loadLocalDatabases();
  } catch (error) {
    showNotification(`Connection failed: ${error}`, 'error');

    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    statusDot.className = 'status-dot disconnected';
    statusText.textContent = 'Connection failed - Check credentials';
  } finally {
    hideLoading();
  }
}

async function loadLocalDatabases() {
  const list = document.getElementById('local-databases-list');
  const noData = document.getElementById('no-local-databases');
  const container = document.getElementById('local-databases-container');

  try {
    const databases = await invoke('list_local_databases', {
      config: localPostgresConfig,
    });

    if (!databases.length) {
      list.innerHTML = '';
      noData.style.display = 'block';
      container.style.display = 'block';
      return;
    }

    noData.style.display = 'none';
    container.style.display = 'block';

    list.innerHTML = databases
      .map(
        (db) => `
      <div class="local-db-card">
        <div class="local-db-header">
          <span class="local-db-icon">${getIcon('database')}</span>
          <h3 class="local-db-name">${db.name}</h3>
        </div>
        <div class="local-db-info">
          <div class="local-db-info-row">
            <span class="local-db-info-label">Size:</span>
            <span class="local-db-info-value">${db.size || 'Unknown'}</span>
          </div>
          <div class="local-db-info-row">
            <span class="local-db-info-label">Owner:</span>
            <span class="local-db-info-value">${db.owner || 'Unknown'}</span>
          </div>
          <div class="local-db-info-row">
            <span class="local-db-info-label">Tables:</span>
            <span class="local-db-info-value">${db.tables || 'Unknown'}</span>
          </div>
        </div>
        <div class="local-db-actions">
          <button 
            class="btn btn-primary btn-sm" 
            onclick="startMigration('${db.name}')"
          >
            ${getIcon('play')} Migrate to Docker
          </button>
        </div>
      </div>
    `,
      )
      .join('');
  } catch (error) {
    showNotification(`Error loading databases: ${error}`, 'error');
  }
}

async function startMigration(dbName) {
  if (
    !confirm(
      `Migrate database "${dbName}" to Docker?\n\nThis will create a new Docker container with a copy of your database.`,
    )
  ) {
    return;
  }

  showLoading();

  try {
    const result = await invoke('migrate_database', {
      config: localPostgresConfig,
      databaseName: dbName,
    });

    showNotification(`Database "${dbName}" migrated successfully!`, 'success');

    // Reload both lists
    await loadLocalDatabases();
    await loadMigratedDatabases();
    await loadContainers();
  } catch (error) {
    showNotification(`Migration failed: ${error}`, 'error');
  } finally {
    hideLoading();
  }
}

async function loadMigratedDatabases() {
  const list = document.getElementById('migrated-databases-list');
  const noData = document.getElementById('no-migrated-databases');
  const container = document.getElementById('migrated-databases-container');

  try {
    const databases = await invoke('get_migrated_databases');

    if (!databases.length) {
      list.innerHTML = '';
      noData.style.display = 'block';
      container.style.display = 'none';
      return;
    }

    noData.style.display = 'none';
    container.style.display = 'block';

    list.innerHTML = databases
      .map(
        (db) => `
      <div class="local-db-card migrated-db-card">
        <div class="local-db-header">
          <span class="local-db-icon">${getIcon('check')}</span>
          <h3 class="local-db-name">${db.original_name}</h3>
        </div>
        <div class="local-db-info">
          <div class="local-db-info-row">
            <span class="local-db-info-label">Container:</span>
            <span class="local-db-info-value">${db.container_name}</span>
          </div>
          <div class="local-db-info-row">
            <span class="local-db-info-label">Migrated:</span>
            <span class="local-db-info-value">${new Date(db.migrated_at).toLocaleString()}</span>
          </div>
          <div class="local-db-info-row">
            <span class="local-db-info-label">Status:</span>
            <span class="local-db-info-value" style="color: var(--success)">Running in Docker</span>
          </div>
        </div>
        <div class="local-db-actions">
          <button 
            class="btn btn-danger btn-sm" 
            onclick="removeMigratedDatabase('${db.container_id}')"
          >
            ${getIcon('trash')} Delete Container
          </button>
          <button 
            class="btn btn-ghost btn-sm" 
            onclick="switchTab('databases')"
          >
            ${getIcon('eye')} View in Databases
          </button>
        </div>
      </div>
    `,
      )
      .join('');
  } catch (error) {
    console.error('Error loading migrated databases:', error);
  }
}

async function removeMigratedDatabase(containerId) {
  if (
    !confirm(
      'Delete this migrated database container?\n\nThis will remove the container and all its data.',
    )
  ) {
    return;
  }

  showLoading();

  try {
    await invoke('remove_migrated_database', { containerId });
    showNotification('Migrated database removed successfully', 'success');

    // Reload all lists
    await loadMigratedDatabases();
    await loadContainers();
  } catch (error) {
    showNotification(`Error removing database: ${error}`, 'error');
  } finally {
    hideLoading();
  }
}

window.checkLocalPostgres = checkLocalPostgres;
window.connectLocalPostgres = connectLocalPostgres;
window.startMigration = startMigration;
window.removeMigratedDatabase = removeMigratedDatabase;
window.startMigration = startMigration;
