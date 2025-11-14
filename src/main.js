// Import icons and components
import { getIcon } from './icons.js';
import { SearchFilters } from './components/SearchFilters.js';
import { loadChart } from './chart-loader.js';
import { templatesManager } from './components/Templates.js';
import { getAllTemplates, applyTemplate, saveCustomTemplate } from './templates.js';
import { CustomSelect } from './components/CustomSelect.js';
import { DockerCompose } from './components/DockerCompose.js';
import { cache } from './lib/utils/cache.js';
import { polling } from './lib/utils/polling.js';
import { VirtualScroll } from './lib/utils/virtualScroll.js';

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
          console.log('[Tauri] API loaded successfully');
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

// Componente de búsqueda y filtros
let searchFilters = null;
let imagesSearchFilters = null;
let migrationSearchFilters = null;
let composeManager = null;
let allContainers = []; // Cache de todos los contenedores
let allImages = []; // Cache de todas las imágenes

// Virtual scrolling instance for containers
let containersVirtualScroll = null;

console.log('[main.js] v3 loaded - improved Docker connection');
console.log('[main.js] Waiting for Tauri to be available...');

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
      console.log('[Update] App is up to date');
      if (!silent) {
        showNotification('La aplicación está actualizada', 'success');
      }
    }
  } catch (error) {
    console.error('[Update] Error checking for updates:', error);
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
    console.log('[Test] SUCCESS:', result);
  } catch (e) {
    console.error('[Test] FAILED:', e);
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
    warning: '#f59e0b',
  };

  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 9999;
    background: ${colors[type] || colors.success};
    color: white;
    padding: 1rem 1.5rem;
    padding-right: 3rem;
    border-radius: 8px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
    max-width: 400px;
    display: flex;
    align-items: center;
    gap: 1rem;
    animation: slideIn 0.3s ease;
  `;
  
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  messageSpan.style.flex = '1';
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: transparent;
    border: none;
    color: white;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s ease;
  `;
  
  closeBtn.onmouseover = () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  };
  
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'transparent';
  };
  
  closeBtn.onclick = () => {
    notif.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  };
  
  notif.appendChild(messageSpan);
  notif.appendChild(closeBtn);
  document.body.appendChild(notif);

  const duration = type === 'info' ? 5000 : 3000;
  const timeoutId = setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  }, duration);
  
  // Clear timeout if manually closed
  closeBtn.onclick = () => {
    clearTimeout(timeoutId);
    notif.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  };
}

/**
 * Check if Docker is running and available
 * @returns {Promise<boolean>} True if Docker is connected, false otherwise
 */
async function checkDocker() {
  try {
    const isConnected = await invoke('check_docker');
    if (isConnected) {
      document.getElementById('docker-status').textContent = 'Docker Connected';
      hideDockerError();
      return true;
    } else {
      document.getElementById('docker-status').textContent = 'Docker Disconnected';
      showDockerError();
      return false;
    }
  } catch (_e) {
    document.getElementById('docker-status').textContent = 'Docker Disconnected';
    showDockerError();
    return false;
  }
}

/**
 * Show Docker error overlay
 */
function showDockerError() {
  let errorOverlay = document.getElementById('docker-error-overlay');
  if (!errorOverlay) {
    errorOverlay = document.createElement('div');
    errorOverlay.id = 'docker-error-overlay';
    errorOverlay.className = 'docker-error-overlay';
    errorOverlay.innerHTML = `
      <div class="docker-error-content">
        <div class="docker-error-icon">🐳</div>
        <h2>Docker Not Running</h2>
        <p>Docker Desktop is not running or not accessible.</p>
        <p class="docker-error-subtitle">Please start Docker Desktop to continue.</p>
        <div class="docker-error-actions">
          <button class="btn btn-primary" onclick="openDockerDesktop()">
            ${getIcon('play')} Open Docker Desktop
          </button>
          <button class="btn btn-secondary" onclick="retryDockerConnection()">
            ${getIcon('refresh')} Retry Connection
          </button>
        </div>
        <p class="docker-error-help">
          <strong>Need help?</strong> Make sure Docker Desktop is installed and running.
        </p>
      </div>
    `;
    document.body.appendChild(errorOverlay);
  }
  errorOverlay.style.display = 'flex';
}

/**
 * Hide Docker error overlay
 */
function hideDockerError() {
  const errorOverlay = document.getElementById('docker-error-overlay');
  if (errorOverlay) {
    errorOverlay.style.display = 'none';
  }
}

/**
 * Open Docker Desktop application
 */
async function openDockerDesktop() {
  try {
    showNotification('Attempting to open Docker Desktop...', 'info');
    await invoke('open_docker_desktop');
    showNotification('Docker Desktop opened. Waiting for it to start...', 'info');
    
    // Wait a bit and retry connection
    setTimeout(async () => {
      await retryDockerConnection();
    }, 5000);
  } catch (e) {
    showNotification('Could not open Docker Desktop automatically. Please open it manually.', 'warning');
    console.error('Error opening Docker Desktop:', e);
  }
}

/**
 * Retry Docker connection
 */
async function retryDockerConnection() {
  showLoading('Checking Docker connection...');
  
  try {
    const connected = await checkDocker();
    
    if (connected) {
      showNotification('Docker connected successfully!', 'success');
      hideDockerError();
      
      // Clear all cache to get fresh data
      cache.clear();
      
      // Reload data
      await loadDashboardStats();
      await loadContainers(false, true);
      
      // Re-setup polling if it was cleared
      if (polling.getStats().total === 0) {
        setupPolling();
      }
    } else {
      showNotification('Docker is still not available. Please start Docker Desktop.', 'warning');
    }
  } catch (e) {
    showNotification('Failed to connect to Docker: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Render a single container card
 * @param {Object} c - Container object
 * @param {number} index - Container index
 * @returns {string} HTML string for container card
 */
function renderContainerCard(c, index) {
  const shortId = c.id.substring(0, 12);
  const dbTypeName = c.db_type.charAt(0).toUpperCase() + c.db_type.slice(1);

  const dbIconMap = {
    postgresql: 'postgresql',
    mysql: 'mysql',
    mongodb: 'mongodb',
    redis: 'redis',
    mariadb: 'mariadb',
  };
  const dbIcon = getIcon(dbIconMap[c.db_type] || 'database');
  
  // Store container data for URL generation
  window[`containerData_${index}`] = c;
  
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
        <div class="db-data-item" onclick="copyToClipboard('${c.port}', 'Port copied!')" data-tooltip="Click to copy">
          <span class="db-data-label">Port</span>
          <span class="db-data-value">${c.port}</span>
        </div>
        <div class="db-data-item" onclick="copyToClipboard('${shortId}', 'ID copied!')" data-tooltip="Click to copy">
          <span class="db-data-label">Container ID</span>
          <span class="db-data-value">${shortId}</span>
        </div>
        <div class="db-data-item" onclick="copyToClipboard('${c.created}', 'Date copied!')" data-tooltip="Click to copy">
          <span class="db-data-label">Created</span>
          <span class="db-data-value">${c.created}</span>
        </div>
        <div class="db-data-item" onclick="copyToClipboard('localhost:${c.port}', 'Connection copied!')" data-tooltip="Click to copy">
          <span class="db-data-label">Connection</span>
          <span class="db-data-value">localhost:${c.port}</span>
        </div>
      </div>
      
      <div class="db-card-actions">
        <button class="db-action-btn db-btn-copy-url" onclick="copyConnectionURL(window.containerData_${index})" data-tooltip="Copy connection URL">
          ${getIcon('link')}
        </button>
        ${
          c.status === 'running'
            ? `
          <button class="db-action-btn db-btn-monitor" onclick="openMonitoringModal('${c.id}', '${c.name}')" data-tooltip="Monitor resources">
            ${getIcon('chartBar')}
          </button>
          <button class="db-action-btn db-btn-stop" onclick="stopC('${c.id}')" data-tooltip="Stop container">
            ${getIcon('pause')}
          </button>
          <button class="db-action-btn db-btn-logs" onclick="showLogs('${c.id}')" data-tooltip="View logs">
            ${getIcon('fileText')}
          </button>
          ${
            c.db_type === 'postgresql' ||
            c.db_type === 'mysql' ||
            c.db_type === 'mariadb'
              ? `
            <button class="db-action-btn db-btn-sql" onclick="showSQL('${c.id}','${c.database_name}')" data-tooltip="Open SQL console">
              ${getIcon('terminal')}
            </button>
          `
              : ''
          }
          <button class="db-action-btn db-btn-restart" onclick="restartC('${c.id}')" data-tooltip="Restart container">
            ${getIcon('rotateCw')}
          </button>
        `
            : `
          <button class="db-action-btn db-btn-start" onclick="startC('${c.id}')" data-tooltip="Start container">
            ${getIcon('play')}
          </button>
          <button class="db-action-btn db-btn-restart" onclick="restartC('${c.id}')" data-tooltip="Restart container">
            ${getIcon('rotateCw')}
          </button>
        `
        }
        <button 
          class="db-action-btn db-btn-edit" 
          data-container-id="${c.id}" 
          data-container-name="${c.name.replace(/"/g, '&quot;')}" 
          onclick="openRenameModalFromButton(this)" 
          data-tooltip="Rename container"
        >
          ${getIcon('edit')}
        </button>
        <button class="db-action-btn db-btn-delete" onclick="confirmRemove('${c.id}', '${c.name.replace(/'/g, "\\'")}' )" data-tooltip="Delete container">
          ${getIcon('trash')}
        </button>
      </div>
    </div>
  `;
}

/**
 * Load containers with intelligent caching and virtual scrolling
 * @param {boolean} applyFilters - If true, use cached data with filters
 * @param {boolean} forceRefresh - If true, bypass cache and fetch fresh data
 */
async function loadContainers(applyFilters = false, forceRefresh = false) {
  try {
    // If not applying filters or force refresh, fetch from API with cache
    if (!applyFilters || forceRefresh) {
      if (forceRefresh) {
        cache.invalidate('containers');
      }
      
      allContainers = await cache.get(
        'containers',
        () => invoke('list_containers'),
        30000 // 30 second TTL
      );
    }
    
    const list = document.getElementById('containers-list');
    const noData = document.getElementById('no-containers');
    const resultsCount = document.getElementById('results-count');

    // Aplicar filtros si el componente existe
    let containers = allContainers;
    if (searchFilters) {
      containers = searchFilters.applyFilters(allContainers);
    }

    if (!containers.length) {
      // Destroy virtual scroll if exists
      if (containersVirtualScroll) {
        containersVirtualScroll.destroy();
        containersVirtualScroll = null;
      }
      
      list.innerHTML = '';
      noData.style.display = 'block';
      if (resultsCount) {
        resultsCount.textContent = allContainers.length > 0 
          ? 'No results found' 
          : '';
      }
      return;
    }

    noData.style.display = 'none';
    
    // Mostrar información de resultados
    if (resultsCount) {
      if (searchFilters && searchFilters.getActiveFiltersCount() > 0) {
        resultsCount.innerHTML = `
          Showing <strong>${containers.length}</strong> of <strong>${allContainers.length}</strong> databases
          <span class="filter-badge">${searchFilters.getActiveFiltersCount()} active filters</span>
        `;
      } else {
        resultsCount.textContent = `Showing ${containers.length} databases`;
      }
    }

    // Use virtual scrolling for large lists (>50 items)
    const VIRTUAL_SCROLL_THRESHOLD = 50;
    
    if (containers.length > VIRTUAL_SCROLL_THRESHOLD) {
      // Initialize or update virtual scroll
      if (!containersVirtualScroll) {
        // Find the scroll container (main-content or containers-section)
        const scrollContainer = document.querySelector('.main-content') || 
                               list.closest('.containers-section') || 
                               list.parentElement;
        
        // Mark list as using virtual scrolling
        list.classList.add('virtual-scrolling');
        list.classList.remove('containers-grid');
        
        containersVirtualScroll = new VirtualScroll({
          container: list,
          scrollContainer: scrollContainer,
          items: containers,
          renderItem: renderContainerCard,
          itemHeight: 180, // Estimated height of db-card
          buffer: 3
        });
      } else {
        containersVirtualScroll.setItems(containers);
      }
    } else {
      // For small lists, use traditional rendering
      if (containersVirtualScroll) {
        containersVirtualScroll.destroy();
        containersVirtualScroll = null;
        list.classList.remove('virtual-scrolling');
        list.classList.add('containers-grid');
      }
      
      list.innerHTML = containers
        .map((c, index) => renderContainerCard(c, index))
        .join('');
    }
  } catch (e) {
    showNotification('Error: ' + e, 'error');
  }
}

// ===== SEARCH & FILTERS =====
function initializeSearchFilters() {
  // Crear instancia del componente para databases
  searchFilters = new SearchFilters('databases');
  
  // Renderizar el componente en el DOM
  const searchContainer = document.getElementById('search-filters');
  if (searchContainer) {
    searchContainer.innerHTML = searchFilters.render();
    searchFilters.attachEventListeners();
    
    // Suscribirse a cambios de filtros
    searchFilters.onChange(() => {
      loadContainers(true); // true = aplicar filtros sin recargar desde API
    });
  }
}

function initializeImagesSearchFilters() {
  // Crear instancia del componente para images
  imagesSearchFilters = new SearchFilters('images');
  console.log('[initializeImagesSearchFilters] Component created');
  
  // Renderizar el componente en el DOM
  const searchContainer = document.getElementById('search-filters-images');
  if (searchContainer) {
    searchContainer.innerHTML = imagesSearchFilters.render();
    imagesSearchFilters.attachEventListeners();
    console.log('[initializeImagesSearchFilters] Component rendered and attached');
    
    // Suscribirse a cambios de filtros
    imagesSearchFilters.onChange(() => {
      console.log('[imagesSearchFilters] Filter changed, reloading...');
      loadImages(true); // true = aplicar filtros sin recargar desde API
    });
  } else {
    console.error('[initializeImagesSearchFilters] Container not found');
  }
}

function initializeMigrationSearchFilters() {
  // Crear instancia del componente para migration
  migrationSearchFilters = new SearchFilters('migration');
  console.log('[initializeMigrationSearchFilters] Component created');
  
  // Renderizar el componente en el DOM
  const searchContainer = document.getElementById('search-filters-migration');
  if (searchContainer) {
    searchContainer.innerHTML = migrationSearchFilters.render();
    migrationSearchFilters.attachEventListeners();
    console.log('[initializeMigrationSearchFilters] Component rendered and attached');
    
    // Suscribirse a cambios de filtros
    migrationSearchFilters.onChange(() => {
      console.log('[migrationSearchFilters] Filter changed, rendering...');
      renderLocalDatabases(); // Renderizar con filtros aplicados
    });
  } else {
    console.error('[initializeMigrationSearchFilters] Container not found');
  }
}

/**
 * Load dashboard statistics with caching
 */
async function loadDashboardStats() {
  try {
    console.log('Loading dashboard stats...');
    
    // Use cache for containers and images
    const [containers, images] = await Promise.all([
      cache.get('containers', () => invoke('list_containers'), 30000),
      cache.get('images', () => invoke('list_images'), 60000)
    ]);
    
    console.log('Containers loaded:', containers.length);
    console.log('Images loaded:', images.length);

    // Calculate stats
    const totalContainers = containers.length;
    const runningContainers = containers.filter(
      (c) => c.status === 'running',
    ).length;
    const stoppedContainers = containers.filter(
      (c) => c.status !== 'running',
    ).length;
    const totalImages = images.length;

    // Update stats
    const statTotal = document.getElementById('stat-total');
    const statRunning = document.getElementById('stat-running');
    const statStopped = document.getElementById('stat-stopped');
    const statImages = document.getElementById('stat-images');

    if (statTotal) {
      statTotal.textContent = totalContainers;
      console.log('Updated stat-total:', totalContainers);
    } else {
      console.error('Element #stat-total not found');
    }

    if (statRunning) {
      statRunning.textContent = runningContainers;
      console.log('Updated stat-running:', runningContainers);
    } else {
      console.error('Element #stat-running not found');
    }

    if (statStopped) {
      statStopped.textContent = stoppedContainers;
      console.log('Updated stat-stopped:', stoppedContainers);
    } else {
      console.error('Element #stat-stopped not found');
    }

    if (statImages) {
      statImages.textContent = totalImages;
      console.log('Updated stat-images:', totalImages);
    } else {
      console.error('Element #stat-images not found');
    }

    // Load recent containers
    loadRecentContainers(containers);
  } catch (e) {
    console.error('Error loading dashboard stats:', e);
  }
}


function loadRecentContainers(containers) {
  const recentContainer = document.getElementById('recent-containers');

  if (!recentContainer) {
    console.error('Element #recent-containers not found');
    return;
  }

  if (!containers || containers.length === 0) {
    recentContainer.innerHTML =
      '<div class="no-data"><p>No databases created yet. Create your first one!</p></div>';
    console.log('No containers to show in recent');
    return;
  }

  // Show last 5 containers
  const recent = containers.slice(0, 5);
  console.log('Showing recent containers:', recent.length);

  recentContainer.innerHTML = recent
    .map((c) => {
      const dbIconMap = {
        postgresql: 'postgresql',
        mysql: 'mysql',
        mongodb: 'mongodb',
        redis: 'redis',
        mariadb: 'mariadb',
      };
      const dbIcon = getIcon(dbIconMap[c.db_type] || 'database');
      const statusClass = c.status === 'running' ? 'running' : 'stopped';

      return `
      <div class="recent-card" onclick="switchTab('databases')" style="cursor: pointer;">
        <div class="recent-card-left">
          <div class="recent-db-icon" data-db-type="${c.db_type}">
            ${dbIcon}
          </div>
          <div class="recent-info">
            <h4 class="recent-title">${c.name}</h4>
            <span class="recent-meta">${c.db_type.toUpperCase()} · Port ${c.port}</span>
          </div>
        </div>
        <span class="recent-status recent-status-${statusClass}">${c.status}</span>
      </div>
    `;
    })
    .join('');
}

async function createDB(e) {
  e.preventDefault();

  if (!selectedDbType) {
    showNotification('Please select a database type', 'error');
    return;
  }
  showLoading('creatingDatabase');

  // Mostrar notificación informativa
  showNotification(
    'Creating database. First time may take 2-5 minutes to download the image...',
    'info',
  );

  try {
    let config = {
      name: document.getElementById('db-name').value,
      username: document.getElementById('db-username').value || '',
      password: document.getElementById('db-password').value || '',
      port: parseInt(document.getElementById('db-port').value, 10),
      version: versionSelect ? versionSelect.getValue() : '',
      type: selectedDbType,
    };

    // Apply template if selected
    if (selectedTemplateForDb) {
      console.log('[TEMPLATE] Applying template:', selectedTemplateForDb);
      console.log('[TEMPLATE] DB Type:', selectedDbType);
      console.log('[TEMPLATE] Base config before:', config);
      
      const templateConfig = applyTemplate(selectedTemplateForDb, selectedDbType, config);
      config = { ...config, ...templateConfig };
      
      console.log('[TEMPLATE] Applied template configuration:', templateConfig);
      console.log('[TEMPLATE] Final config:', config);
    }

    console.log('Creating database with config:', config);

    // Cambiar mensaje después de 3 segundos si sigue cargando
    const downloadTimer = setTimeout(() => {
      showLoading('downloadingImage');
    }, 3000);

    const result = await invoke('create_database', { config: config });

    clearTimeout(downloadTimer);
    console.log('Database created:', result);

    showNotification('Database created successfully', 'success');
    selectedTemplateForDb = null; // Reset template selection
    
    // Invalidate cache to show new database
    cache.invalidate('containers');
    cache.invalidate('images');
    
    window.closeCreateModal();
    await loadContainers(false, true);
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
    showNotification('Container started', 'success');
    
    // Invalidate cache to force refresh
    cache.invalidate('containers');
    await loadContainers(false, true);
    await loadDashboardStats();
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
    showNotification('Container stopped', 'success');
    
    // Invalidate cache to force refresh
    cache.invalidate('containers');
    await loadContainers(false, true);
    await loadDashboardStats();
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
    showNotification('Container restarted', 'success');
    
    // Invalidate cache to force refresh
    cache.invalidate('containers');
    await loadContainers(false, true);
    await loadDashboardStats();
  } catch (e) {
    showNotification('Error: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

// Función para generar URL de conexión para bases de datos
function generateConnectionURL(container) {
  const { db_type, port, username, password, database_name, name } = container;
  const host = 'localhost';
  let url = '';
  
  // Usar database_name si existe, si no usar name, si no usar valores por defecto
  const dbName = database_name || name || '';
  
  switch(db_type) {
    case 'postgresql':
      // postgresql://username:password@host:port/database?schema=public
      const pgUser = username || 'postgres';
      const pgPass = password || '';
      const pgDb = dbName || 'postgres';
      url = `postgresql://${pgUser}:${pgPass}@${host}:${port}/${pgDb}?schema=public`;
      break;
      
    case 'mysql':
    case 'mariadb':
      // mysql://username:password@host:port/database
      const mysqlUser = username || 'root';
      const mysqlPass = password || '';
      const mysqlDb = dbName || '';
      url = `mysql://${mysqlUser}:${mysqlPass}@${host}:${port}/${mysqlDb}`;
      break;
      
    case 'mongodb':
      // mongodb://username:password@host:port/database
      const mongoDb = dbName || '';
      if (username && password) {
        url = `mongodb://${username}:${password}@${host}:${port}/${mongoDb}`;
      } else {
        url = `mongodb://${host}:${port}/${mongoDb}`;
      }
      break;
      
    case 'redis':
      // redis://[:password@]host:port/0
      if (password) {
        url = `redis://:${password}@${host}:${port}/0`;
      } else {
        url = `redis://${host}:${port}/0`;
      }
      break;
      
    default:
      url = `${db_type}://${host}:${port}`;
  }
  
  return url;
}

// Función para copiar URL de conexión
function copyConnectionURL(container) {
  const url = generateConnectionURL(container);
  copyToClipboard(url, 'Connection URL copied to clipboard!');
}

// Función para copiar al portapapeles
function copyToClipboard(text, message = 'Copied!') {
  // Intentar con la API moderna
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showNotification(message, 'success');
      })
      .catch((err) => {
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

  showLoading('deletingContainer');
  try {
    const result = await invoke('remove_container', {
      containerId: id,
      removeVolumes: Boolean(removeVolumes),
    });
    showNotification(result, 'success');
    
    // Invalidate all related cache
    cache.invalidate('containers');
    cache.invalidate('volumes');
    await loadContainers(false, true);
    await loadDashboardStats();
  } catch (e) {
    showNotification('Error: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

async function removeC(id) {
  if (!confirm('Delete container?')) return;
  const vols = confirm('Also delete volumes?');
  showLoading();
  try {
    const result = await invoke('remove_container', {
      containerId: id,
      removeVolumes: Boolean(vols),
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

// Variables globales para el modal de rename
let currentRenameContainerId = null;

function openRenameModalFromButton(button) {
  const containerId = button.getAttribute('data-container-id');
  const currentName = button.getAttribute('data-container-name');
  console.log('[openRenameModalFromButton]', { containerId, currentName });
  openRenameModal(containerId, currentName);
}

function openRenameModal(containerId, currentName) {
  console.log('[openRenameModal]', { containerId, currentName });
  currentRenameContainerId = containerId;
  document.getElementById('rename-current-name').textContent = currentName;
  document.getElementById('rename-new-name').value = currentName;
  document.getElementById('rename-modal').classList.add('active');
  // Focus on input after modal animation
  setTimeout(() => {
    document.getElementById('rename-new-name').select();
  }, 100);
}

function closeRenameModal() {
  document.getElementById('rename-modal').classList.remove('active');
  document.getElementById('rename-form').reset();
  currentRenameContainerId = null;
}

async function executeRename(e) {
  e.preventDefault();
  const newName = document.getElementById('rename-new-name').value.trim();
  
  console.log('[executeRename] Starting...', {
    newName,
    currentRenameContainerId,
  });
  
  if (!newName) {
    showNotification('Container name cannot be empty', 'error');
    return;
  }

  if (!currentRenameContainerId) {
    console.error('[executeRename] currentRenameContainerId is null or undefined!');
    showNotification('No container selected', 'error');
    return;
  }

  // ¡GUARDAR EL ID EN UNA VARIABLE LOCAL ANTES DE CERRAR EL MODAL!
  const containerIdToRename = currentRenameContainerId;
  
  closeRenameModal();
  showLoading('Renaming container...');

  try {
    console.log('[executeRename] Calling invoke with:', {
      containerId: containerIdToRename,
      newName: newName,
    });
    
    const result = await invoke('rename_container', {
      containerId: containerIdToRename,
      newName: newName
    });
    
    console.log('[executeRename] Success:', result);
    showNotification(result, 'success');
    
    // Invalidate cache to force refresh
    cache.invalidate('containers');
    await loadContainers(false, true);
    await loadDashboardStats();
  } catch (e) {
    console.error('[executeRename] Error:', e);
    showNotification('Error renaming container: ' + e, 'error');
  } finally {
    hideLoading();
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

  // Load template options
  loadTemplateOptions();

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
  const versionItems = dbType.versions.map((v, i) => ({
    value: v,
    label: `${dbType.name} ${v}`
  }));

  // Destroy previous instance if exists
  if (versionSelect) {
    versionSelect.destroy();
  }

  // Create new CustomSelect for versions
  versionSelect = new CustomSelect('db-version-select', {
    placeholder: 'Select version',
    items: versionItems,
    value: versionItems[0]?.value || '',
    required: true
  });
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

// Expose Docker management functions
window.openDockerDesktop = openDockerDesktop;
window.retryDockerConnection = retryDockerConnection;

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
window.copyConnectionURL = copyConnectionURL;
window.generateConnectionURL = generateConnectionURL;
window.confirmRemove = confirmRemove;
window.executeRemove = executeRemove;
window.openRenameModal = openRenameModal;
window.openRenameModalFromButton = openRenameModalFromButton;
window.closeRenameModal = closeRenameModal;
window.executeRename = executeRename;

// Función para cambiar idioma
window.changeLanguage = (lang) => {
  console.log('Changing language to:', lang);
  showNotification(
    `Language changed to ${lang === 'es' ? 'Español' : 'English'}`,
    'success',
  );
  // TODO: Implementar i18n completo
};

/**
 * Setup intelligent polling system
 */
function setupPolling() {
  console.log('[Setup] Initializing intelligent polling...');
  
  // Register polling tasks
  
  // Task 1: Update containers when on databases tab
  polling.register(
    'containers',
    async () => {
      try {
        if (await checkDocker()) {
          cache.invalidate('containers');
          await loadContainers(false, true);
        }
      } catch (e) {
        console.error('[Polling] Error updating containers:', e);
      }
    },
    30000, // 30 seconds
    {
      immediate: false,
      onlyWhenVisible: true,
      tab: 'databases'
    }
  );
  
  // Task 2: Update dashboard stats when on dashboard tab
  polling.register(
    'dashboard',
    async () => {
      try {
        if (await checkDocker()) {
          // Only invalidate, don't force refresh (use cache if valid)
          await loadDashboardStats();
        }
      } catch (e) {
        console.error('[Polling] Error updating dashboard:', e);
      }
    },
    30000, // 30 seconds
    {
      immediate: false,
      onlyWhenVisible: true,
      tab: 'dashboard'
    }
  );
  
  // Task 3: Update images when on images tab (less frequently)
  polling.register(
    'images',
    async () => {
      try {
        if (await checkDocker()) {
          cache.invalidate('images');
          await loadImages(false, true);
        }
      } catch (e) {
        console.error('[Polling] Error updating images:', e);
      }
    },
    60000, // 60 seconds (images change less frequently)
    {
      immediate: false,
      onlyWhenVisible: true,
      tab: 'images'
    }
  );
  
  // Task 4: Check Docker connection health
  polling.register(
    'docker-health',
    async () => {
      try {
        await checkDocker();
      } catch (e) {
        console.error('[Polling] Docker health check failed:', e);
      }
    },
    60000, // 60 seconds
    {
      immediate: false,
      onlyWhenVisible: true,
      tab: null // Run on all tabs
    }
  );
  
  console.log('[Setup] Polling initialized:', polling.getStats());
}

/**
 * Cleanup polling on page unload
 */
window.addEventListener('beforeunload', () => {
  polling.clear();
  cache.clear();
});

// Development tools - only available in dev mode
if (window.location.hostname === 'localhost' || window.location.hostname === 'tauri.localhost') {
  window.__DEV__ = {
    cache: {
      stats: () => {
        const stats = cache.getStats();
        console.table(stats.entries);
        return stats;
      },
      clear: () => cache.clear(),
      invalidate: (key) => cache.invalidate(key),
      get: (key) => {
        const cached = cache.cache.get(key);
        return cached ? cached.data : null;
      }
    },
    polling: {
      stats: () => {
        const stats = polling.getStats();
        console.table(stats.tasks);
        return stats;
      },
      pause: (key) => polling.pause(key),
      resume: (key) => polling.resume(key),
      pauseAll: () => polling.pauseAll(),
      resumeAll: () => polling.resumeAll(),
    },
    state: {
      containers: () => allContainers,
      images: () => allImages,
    }
  };
  
  console.log('%c[DEV] Development tools available at window.__DEV__', 'color: #10b981; font-weight: bold');
  console.log('%cTry: __DEV__.cache.stats() or __DEV__.polling.stats()', 'color: #94a3b8');
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Esperar a que Tauri esté disponible
    const api = await getTauriAPI();
    invoke = api.invoke;
    check = api.check;
    ask = api.ask;
    relaunch = api.relaunch;

    console.log('[Tauri] API initialized');

    // APLICAR IDIOMA GUARDADO INMEDIATAMENTE    // Inyectar iconos en botones del header
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
      else if (tabName === 'images') iconName = 'package';
      else if (tabName === 'migration') iconName = 'package';
      else if (tabName === 'volumes') iconName = 'folder';
      else if (tabName === 'compose') iconName = 'layers';
      else if (tabName === 'templates') iconName = 'fileText';

      const text = btn.querySelector('span:last-child')?.textContent || '';
      if (text) {
        btn.innerHTML = `<span class="tab-icon">${getIcon(iconName)}</span><span>${text}</span>`;
      }
    });

    // Cargar tipos de bases de datos
    await loadDatabaseTypes();

    // Inicializar componentes de búsqueda y filtros
    initializeSearchFilters();
    initializeImagesSearchFilters();
    // migrationSearchFilters se inicializará cuando se carguen las bases de datos locales

    // Event listeners
    document.getElementById('new-db-btn').onclick = openCreateModal;
    document.getElementById('refresh-btn').onclick = async () => {
      cache.invalidatePattern('.*'); // Invalidate all cache
      await loadContainers(false, true);
      await loadDashboardStats();
    };
    document.getElementById('create-form').onsubmit = createDB;
    document.getElementById('sql-form').onsubmit = execSQL;

    // Verificar Docker y cargar contenedores (NO BLOQUEAR LA UI)
    checkDocker()
      .then(async (connected) => {
        if (connected) {
          console.log('✅ Docker connected, loading data...');
          // Cargar dashboard primero ya que es la tab activa por defecto
          await loadDashboardStats();
          // Luego cargar containers para la tab databases
          await loadContainers(false, true);
          document.getElementById('docker-status').textContent =
            'Docker connected';
          console.log('✅ Initial data loaded');
          
          // Setup intelligent polling
          setupPolling();
        } else {
          console.warn('⚠️ Docker not connected on startup');
          document.getElementById('docker-status').textContent =
            '❌ Docker not connected';
          // Show error overlay but don't block the UI
          showDockerError();
        }
      })
      .catch((error) => {
        console.error('❌ Error checking Docker:', error);
        document.getElementById('docker-status').textContent =
          '❌ Docker not connected';
        showDockerError();
      });

    // Verificar actualizaciones después de 3 segundos
    setTimeout(() => checkForUpdates(true), 3000);

    // Sistema de scroll para header/tabs - con debounce para evitar saltos
    let scrollTimeout;
    const headerHeight = 70;
    
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > headerHeight) {
          document.body.classList.add('scrolled');
        } else {
          document.body.classList.remove('scrolled');
        }
      }, 10); // Pequeño debounce para suavizar
    });
  } catch (error) {
    console.error('[App] Error initializing:', error);
    showNotification('Error initializing app. Please restart.', 'error');
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

  // Notify polling manager about tab change
  polling.setActiveTab(tabName);

  // Load data based on active tab - RECARGAR SIEMPRE CON TRADUCCIONES
  if (tabName === 'dashboard') {
    loadDashboardStats();
  } else if (tabName === 'databases') {
    loadContainers();
  } else if (tabName === 'images') {
    loadImages();
  } else if (tabName === 'migration') {
    checkLocalPostgres();
    loadMigratedDatabases();
  } else if (tabName === 'volumes') {
    loadVolumes();
  } else if (tabName === 'compose') {
    loadComposeTab();
  } else if (tabName === 'templates') {
    loadTemplatesTab();
  }
};

// ===== LOCAL POSTGRES MIGRATION =====
let localPostgresConfig = null;
let allLocalDatabases = [];
let allMigratedDatabases = [];

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
    const _result = await invoke('connect_local_postgres', { config });
    localPostgresConfig = config;

    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    statusDot.className = 'status-dot connected';
    statusText.textContent = `Connected to PostgreSQL at ${config.host}:${config.port}`;

    showNotification('Connected to local PostgreSQL', 'success');

    // Load databases after successful connection
    await loadLocalDatabases();
    await loadMigratedDatabases(); // Cargar migradas también
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
      allLocalDatabases = [];
      return;
    }

    noData.style.display = 'none';
    container.style.display = 'block';

    // Store all databases
    allLocalDatabases = databases;

    // Inicializar el componente de filtros si no existe
    if (!migrationSearchFilters) {
      initializeMigrationSearchFilters();
    }

    renderLocalDatabases();
  } catch (error) {
    showNotification(`Error loading databases: ${error}`, 'error');
  }
}

function renderLocalDatabases() {
  const list = document.getElementById('local-databases-list');
  const noData = document.getElementById('no-local-databases');
  const resultsCount = document.getElementById('results-count-migration');
  
  if (!list) return;

  console.log('[renderLocalDatabases] migrationSearchFilters exists:', !!migrationSearchFilters);
  console.log('[renderLocalDatabases] allLocalDatabases length:', allLocalDatabases?.length || 0);

  // Aplicar filtros si el componente existe
  let filteredDatabases = allLocalDatabases || [];
  if (migrationSearchFilters) {
    console.log('[renderLocalDatabases] Applying filters...');
    filteredDatabases = migrationSearchFilters.applyFilters(filteredDatabases);
    console.log('[renderLocalDatabases] After filters:', filteredDatabases.length, 'databases');
  }

  if (filteredDatabases.length === 0) {
    list.innerHTML = '';
    noData.style.display = 'block';
    if (resultsCount) {
      resultsCount.textContent = (allLocalDatabases && allLocalDatabases.length > 0) 
        ? 'No results found' 
        : '';
    }
    if (allLocalDatabases && allLocalDatabases.length > 0) {
      noData.querySelector('p').textContent = 'No databases match your search criteria.';
    } else {
      noData.querySelector('p').textContent = 'No databases found in local PostgreSQL';
    }
    return;
  }

  noData.style.display = 'none';
  
  // Mostrar información de resultados
  if (resultsCount) {
    if (migrationSearchFilters && migrationSearchFilters.getActiveFiltersCount() > 0) {
      resultsCount.innerHTML = `
        Showing <strong>${filteredDatabases.length}</strong> of <strong>${allLocalDatabases.length}</strong> databases
        <span class="filter-badge">${migrationSearchFilters.getActiveFiltersCount()} active filters</span>
      `;
    } else {
      resultsCount.textContent = `Showing ${filteredDatabases.length} databases`;
    }
  }
  
  list.innerHTML = filteredDatabases
    .map(
      (db) => {
        // Verificar si esta DB ha sido migrada
        const isMigrated = allMigratedDatabases && allMigratedDatabases.some(
          migrated => migrated.original_name === db.name
        );
        
        return `
    <div class="local-db-card ${isMigrated ? 'migrated' : ''}">
      <div class="local-db-header">
        <span class="local-db-icon">${getIcon('database')}</span>
        <h3 class="local-db-name">
          ${db.name}
          ${isMigrated ? '<span class="migrated-badge">✓ Migrated</span>' : ''}
        </h3>
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
        ${!isMigrated ? `
          <button 
            class="btn btn-primary btn-sm" 
            onclick="startMigration('${db.name}')"
          >
            ${getIcon('play')} Migrate to Docker
          </button>
        ` : `
          <button 
            class="btn btn-success btn-sm" 
            onclick="startMigration('${db.name}')"
            data-tooltip="Migrate again (creates new container)"
          >
            ${getIcon('refresh')} Migrate Again
          </button>
          <button 
            class="btn btn-danger btn-sm" 
            onclick="confirmDeleteOriginalDatabase('${db.name}')"
            data-tooltip="Delete original database"
          >
            ${getIcon('trash')} Delete Original
          </button>
        `}
      </div>
    </div>
  `;
      }
    )
    .join('');
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
    const _result = await invoke('migrate_database', {
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

function confirmDeleteOriginalDatabase(dbName) {
  // Crear modal de confirmación MUY CLARO
  const modalHTML = `
    <div class="confirm-modal active" id="delete-original-modal">
      <div class="confirm-modal-content" style="max-width: 500px;">
        <div class="confirm-modal-header">
          <h3>⚠️ Delete Original Database?</h3>
        </div>
        <div class="confirm-modal-body">
          <div style="background: #dc2626; color: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <strong style="font-size: 1.1em;">⚠️ DANGER ZONE - NO UNDO</strong>
          </div>
          <p style="font-size: 1.05em; font-weight: 600; margin-bottom: 1rem;">
            You are about to PERMANENTLY DELETE the original database:
          </p>
          <div style="background: var(--surface-hover); padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem;">
            <code style="color: #ef4444; font-size: 1.1em; font-weight: bold;">${dbName}</code>
          </div>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-weight: 600;">⚠️ THIS ACTION CANNOT BE UNDONE</p>
            <p style="margin: 0.5rem 0 0; color: #7f1d1d;">All data in the original database will be LOST FOREVER.</p>
          </div>
          <p style="margin-bottom: 0.5rem;"><strong>Before proceeding, make sure:</strong></p>
          <ul style="margin: 0; padding-left: 1.5rem; color: var(--text-secondary);">
            <li>The migration was successful</li>
            <li>You have verified the data in the Docker container</li>
            <li>You have tested the migrated database</li>
            <li>You understand this is PERMANENT</li>
          </ul>
          <p style="margin-top: 1rem; font-style: italic; color: var(--text-muted); font-size: 0.9em;">
            Tip: The migrated database is safe in Docker and will continue working normally.
          </p>
        </div>
        <div class="confirm-modal-actions">
          <button class="btn btn-secondary" onclick="closeDeleteOriginalModal()">
            Cancel - Keep Original
          </button>
          <button class="btn btn-danger" onclick="executeDeleteOriginalDatabase('${dbName}')">
            ${getIcon('trash')} Yes, DELETE Original Forever
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeDeleteOriginalModal() {
  const modal = document.getElementById('delete-original-modal');
  if (modal) {
    modal.remove();
  }
}

async function executeDeleteOriginalDatabase(dbName) {
  closeDeleteOriginalModal();
  showLoading('Deleting original database...');

  try {
    await invoke('delete_original_database', {
      config: localPostgresConfig,
      databaseName: dbName,
    });

    showNotification(`Original database "${dbName}" deleted successfully`, 'success');

    // Reload lists
    await loadLocalDatabases();
  } catch (error) {
    showNotification(`Error deleting database: ${error}`, 'error');
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
      allMigratedDatabases = [];
      return;
    }

    noData.style.display = 'none';
    container.style.display = 'block';

    // Store all migrated databases with name property
    allMigratedDatabases = databases.map(db => ({
      ...db,
      name: db.original_name
    }));

    renderMigratedDatabases();
  } catch (error) {
    console.error('Error loading migrated databases:', error);
  }
}

function renderMigratedDatabases() {
  const list = document.getElementById('migrated-databases-list');
  const noData = document.getElementById('no-migrated-databases');
  
  if (!list) return;

  // No aplicar filtros a las bases de datos migradas, solo mostrarlas
  const filteredDatabases = allMigratedDatabases;

  if (filteredDatabases.length === 0) {
    list.innerHTML = '';
    noData.style.display = 'block';
    noData.querySelector('p').textContent = 'No databases have been migrated yet';
    return;
  }

  noData.style.display = 'none';

  list.innerHTML = filteredDatabases
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
window.confirmDeleteOriginalDatabase = confirmDeleteOriginalDatabase;
window.closeDeleteOriginalModal = closeDeleteOriginalModal;
window.executeDeleteOriginalDatabase = executeDeleteOriginalDatabase;
window.removeMigratedDatabase = removeMigratedDatabase;

/**
 * Load images with intelligent caching
 * @param {boolean} applyFilters - If true, use cached data with filters
 * @param {boolean} forceRefresh - If true, bypass cache
 */
async function loadImages(applyFilters = false, forceRefresh = false) {
  const list = document.getElementById('images-list');
  const noData = document.getElementById('no-images');
  const resultsCount = document.getElementById('results-count-images');

  try {
    // Si no se está aplicando filtros, recargar desde la API
    if (!applyFilters || forceRefresh) {
      if (forceRefresh) {
        cache.invalidate('images');
      }
      
      showLoading('loadingImages');
      allImages = await cache.get(
        'images',
        () => invoke('list_images'),
        60000 // 60 second TTL (images change less frequently)
      );
      console.log('[loadImages] Loaded from API:', allImages.length, 'images');
    }

    console.log('[loadImages] imagesSearchFilters exists:', !!imagesSearchFilters);
    console.log('[loadImages] allImages length:', allImages?.length || 0);

    // Aplicar filtros si el componente existe
    let images = allImages || [];
    if (imagesSearchFilters) {
      console.log('[loadImages] Applying filters...');
      images = imagesSearchFilters.applyFilters(images);
      console.log('[loadImages] After filters:', images.length, 'images');
    }

    if (!images || images.length === 0) {
      list.innerHTML = '';
      noData.style.display = 'block';
      if (resultsCount) {
        resultsCount.textContent = (allImages && allImages.length > 0) 
          ? 'No results found' 
          : '';
      }
      return;
    }

    noData.style.display = 'none';

    // Mostrar información de resultados
    if (resultsCount) {
      if (imagesSearchFilters && imagesSearchFilters.getActiveFiltersCount() > 0) {
        resultsCount.innerHTML = `
          Showing <strong>${images.length}</strong> of <strong>${allImages.length}</strong> images
          <span class="filter-badge">${imagesSearchFilters.getActiveFiltersCount()} active filters</span>
        `;
      } else {
        resultsCount.textContent = `Showing ${images.length} images`;
      }
    }

    list.innerHTML = images
      .map((img) => {
        const mainTag = img.tags[0] || 'unknown';
        const shortId = img.id.substring(7, 19); // Quitar sha256:

        return `
      <div class="image-card">
        <div class="image-header">
          <div class="image-icon">${getIcon('package')}</div>
          <div class="image-info">
            <h3 class="image-title">${mainTag}</h3>
            <span class="image-meta">${img.size} • ${img.created}</span>
          </div>
        </div>
        
        <div class="image-data">
          <div class="image-data-item" onclick="copyToClipboard('${shortId}', 'ID copied!')" data-tooltip="Click to copy">
            <span class="image-data-label">ID</span>
            <span class="image-data-value">${shortId}</span>
          </div>
          ${
            img.tags.length > 1
              ? `
          <div class="image-data-item">
            <span class="image-data-label">Tags</span>
            <span class="image-data-value">${img.tags.length} tags</span>
          </div>
          `
              : ''
          }
        </div>
        
        <div class="image-actions">
          <button class="btn btn-danger btn-sm" onclick="confirmRemoveImage('${img.id}', '${mainTag}')" data-tooltip="Delete image">
            ${getIcon('trash')}
          </button>
        </div>
      </div>
    `;
      })
      .join('');
  } catch (e) {
    console.error('Error loading images:', e);
    showNotification('Error loading images: ' + e, 'error');
  } finally {
    if (!applyFilters) {
      hideLoading();
    }
  }
}

function confirmRemoveImage(id, name) {
  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.innerHTML = `
    <div class="confirm-modal-content">
      <div class="confirm-modal-header">
        <h3>Delete Image</h3>
        <button class="confirm-modal-close" onclick="this.closest('.confirm-modal').remove()">×</button>
      </div>
      <div class="confirm-modal-body">
        <p>Are you sure you want to delete <strong>${name}</strong>?</p>
        <p style="color: var(--danger); font-size: 0.875rem; margin-top: 0.5rem;">
          ⚠ This will remove the image from your system. You'll need to download it again if you want to use it.
        </p>
      </div>
      <div class="confirm-modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.confirm-modal').remove()">Cancel</button>
        <button class="btn btn-danger" onclick="executeRemoveImage('${id}')">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('active'), 10);
}

async function executeRemoveImage(id) {
  document.querySelector('.confirm-modal')?.remove();
  showLoading('deletingImage');
  try {
    await invoke('remove_image', { imageId: id });
    showNotification('Image removed successfully', 'success');
    
    // Invalidate cache
    cache.invalidate('images');
    await loadImages(false, true);
  } catch (e) {
    showNotification('Error: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

// NO TRANSLATIONS - ENGLISH ONLY
window.loadImages = loadImages;
window.confirmRemoveImage = confirmRemoveImage;
window.executeRemoveImage = executeRemoveImage;

// ===== VOLUMES MANAGEMENT =====
let currentVolume = null;

async function loadVolumes() {
  const list = document.getElementById('volumes-list');
  const noData = document.getElementById('no-volumes');
  showLoading('Loading volumes...');

  try {
    const volumes = await invoke('list_volumes');

    if (!volumes || volumes.length === 0) {
      list.innerHTML = '';
      noData.style.display = 'block';
      return;
    }

    noData.style.display = 'none';
    list.innerHTML = volumes
      .map((vol) => {
        const statusClass = vol.in_use ? 'in-use' : 'orphan';
        const statusText = vol.in_use ? 'In Use' : 'Unused';
        
        return `
      <div class="volume-card ${statusClass}">
        <div class="volume-header">
          <div class="volume-icon">${getIcon('database')}</div>
          <div class="volume-info">
            <h3 class="volume-title">${vol.name}</h3>
            <span class="volume-meta">${vol.driver} • ${vol.size}</span>
          </div>
          <span class="volume-status volume-status-${statusClass}">${statusText}</span>
        </div>
        
        <div class="volume-data">
          <div class="volume-data-item" onclick="copyToClipboard('${vol.mountpoint}', 'Path copied!')" data-tooltip="Click to copy">
            <span class="volume-data-label">Mount Point</span>
            <span class="volume-data-value volume-path">${vol.mountpoint}</span>
          </div>
          <div class="volume-data-item">
            <span class="volume-data-label">Created</span>
            <span class="volume-data-value">${vol.created || 'Unknown'}</span>
          </div>
          ${vol.containers.length > 0 ? `
          <div class="volume-data-item">
            <span class="volume-data-label">Used by</span>
            <span class="volume-data-value">${vol.containers.join(', ')}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="volume-actions">
          <button class="btn btn-primary btn-sm" onclick="openBackupVolumeModal('${vol.name}')" data-tooltip="Backup volume">
            ${getIcon('download')} Backup
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openRestoreVolumeModal('${vol.name}')" data-tooltip="Restore volume">
            ${getIcon('upload')} Restore
          </button>
          <button class="btn btn-danger btn-sm" onclick="confirmRemoveVolume('${vol.name}', ${vol.in_use})" data-tooltip="Delete volume">
            ${getIcon('trash')}
          </button>
        </div>
      </div>
    `;
      })
      .join('');
  } catch (e) {
    console.error('Error loading volumes:', e);
    showNotification('Error loading volumes: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

function confirmRemoveVolume(volumeName, inUse) {
  const warningMsg = inUse
    ? 'WARNING: This volume is currently in use by containers. This may cause data loss.'
    : '';
  
  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.innerHTML = `
    <div class="confirm-modal-content">
      <div class="confirm-modal-header">
        <h3>Delete Volume</h3>
        <button class="confirm-modal-close" onclick="this.closest('.confirm-modal').remove()">&times;</button>
      </div>
      <div class="confirm-modal-body">
        <p>Are you sure you want to delete volume <strong>${volumeName}</strong>?</p>
        ${warningMsg ? `<p style="color: var(--warning); margin-top: 0.5rem;">${warningMsg}</p>` : ''}
        <label class="confirm-checkbox">
          <input type="checkbox" id="force-remove-volume">
          <span>Force remove (even if in use)</span>
        </label>
      </div>
      <div class="confirm-modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.confirm-modal').remove()">Cancel</button>
        <button class="btn btn-danger" onclick="executeRemoveVolume('${volumeName}')">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('active'), 10);
}

async function executeRemoveVolume(volumeName) {
  const forceCheckbox = document.getElementById('force-remove-volume');
  const force = forceCheckbox ? forceCheckbox.checked : false;

  document.querySelector('.confirm-modal')?.remove();
  showLoading('Deleting volume...');

  try {
    const result = await invoke('remove_volume', { volumeName, force });
    showNotification(result, 'success');
    await loadVolumes();
  } catch (e) {
    showNotification('Error: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

function confirmPruneVolumes() {
  if (!confirm('Remove all unused volumes?\n\nThis will delete volumes that are not currently being used by any container.')) {
    return;
  }
  executePruneVolumes();
}

async function executePruneVolumes() {
  showLoading('Cleaning unused volumes...');
  try {
    const result = await invoke('prune_volumes');
    showNotification(result, 'success');
    await loadVolumes();
  } catch (e) {
    showNotification('Error: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

function openBackupVolumeModal(volumeName) {
  currentVolume = volumeName;
  document.getElementById('backup-volume-name').textContent = volumeName;
  document.getElementById('backup-path').value = '';
  document.getElementById('backup-volume-modal').classList.add('active');
}

function closeBackupVolumeModal() {
  document.getElementById('backup-volume-modal').classList.remove('active');
  currentVolume = null;
}

async function executeBackupVolume(e) {
  e.preventDefault();
  const backupPath = document.getElementById('backup-path').value;
  
  closeBackupVolumeModal();
  showLoading('Creating backup...');

  try {
    const result = await invoke('backup_volume', {
      volumeName: currentVolume,
      backupPath,
    });
    showNotification(result, 'success');
  } catch (e) {
    showNotification('Error creating backup: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

function openRestoreVolumeModal(volumeName) {
  currentVolume = volumeName;
  document.getElementById('restore-volume-name').textContent = volumeName;
  document.getElementById('restore-file').value = '';
  document.getElementById('restore-volume-modal').classList.add('active');
}

function closeRestoreVolumeModal() {
  document.getElementById('restore-volume-modal').classList.remove('active');
  currentVolume = null;
}

async function executeRestoreVolume(e) {
  e.preventDefault();
  const backupFile = document.getElementById('restore-file').value;
  
  if (!confirm(`Are you sure you want to restore volume "${currentVolume}"?\n\nWARNING: This will REPLACE all existing data in the volume.`)) {
    return;
  }
  
  closeRestoreVolumeModal();
  showLoading('Restoring volume...');

  try {
    const result = await invoke('restore_volume', {
      volumeName: currentVolume,
      backupFile,
    });
    showNotification(result, 'success');
    await loadVolumes();
  } catch (e) {
    showNotification('Error restoring volume: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

// Exponer funciones globalmente
window.loadVolumes = loadVolumes;
window.confirmRemoveVolume = confirmRemoveVolume;
window.executeRemoveVolume = executeRemoveVolume;
window.confirmPruneVolumes = confirmPruneVolumes;
window.openBackupVolumeModal = openBackupVolumeModal;
window.closeBackupVolumeModal = closeBackupVolumeModal;
window.executeBackupVolume = executeBackupVolume;
window.openRestoreVolumeModal = openRestoreVolumeModal;
window.closeRestoreVolumeModal = closeRestoreVolumeModal;
window.executeRestoreVolume = executeRestoreVolume;

// ===== MONITORING =====
let currentMonitoringContainer = null;
let monitoringInterval = null;
let cpuChart = null;
let memoryChart = null;
let cpuHistory = [];
let memoryHistory = [];
const MAX_HISTORY_POINTS = 30; // 30 puntos
let currentChartType = 'line'; // 'line', 'bar', 'area'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i];
}

async function openMonitoringModal(containerId, containerName) {
  currentMonitoringContainer = containerId;
  document.getElementById('monitoring-container-name').textContent = containerName;
  document.getElementById('monitoring-modal').classList.add('active');
  
  // Reset historiales
  cpuHistory = [];
  memoryHistory = [];
  
  try {
    // Cargar Chart.js
    const Chart = await loadChart();
    window.Chart = Chart;
    
    // Inicializar gráficas
    initializeCharts();
    
    // Cargar stats iniciales
    await updateMonitoringStats();
    
    // Actualizar cada 2 segundos
    monitoringInterval = setInterval(updateMonitoringStats, 2000);
  } catch (e) {
    console.error('Error loading charts:', e);
    // Continuar sin gráficas
    await updateMonitoringStats();
    monitoringInterval = setInterval(updateMonitoringStats, 2000);
    showNotification('Charts unavailable, showing stats only', 'warning');
  }
}

function closeMonitoringModal() {
  document.getElementById('monitoring-modal').classList.remove('active');
  
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  
  // Destruir gráficas
  if (cpuChart) {
    cpuChart.destroy();
    cpuChart = null;
  }
  if (memoryChart) {
    memoryChart.destroy();
    memoryChart = null;
  }
  
  currentMonitoringContainer = null;
}

function initializeCharts() {
  if (!window.Chart) {
    console.warn('Chart.js not available');
    return;
  }
  
  const Chart = window.Chart;
  
  // Destruir gráficas existentes
  if (cpuChart) cpuChart.destroy();
  if (memoryChart) memoryChart.destroy();
  
  const cpuCtx = document.getElementById('cpu-chart').getContext('2d');
  const memoryCtx = document.getElementById('memory-chart').getContext('2d');
  
  // Determinar configuración según el tipo de gráfica
  const isArea = currentChartType === 'area';
  const isBar = currentChartType === 'bar';
  const chartType = isArea ? 'line' : currentChartType;
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      y: {
        beginAtZero: true,
        // Escala dinámica - se ajusta en updateChartsData()
        ticks: {
          callback: (value) => value + '%',
          color: '#94a3b8'
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        }
      },
      x: {
        display: false,  // Ocultar eje X completamente (sin labels de hora)
        grid: {
          display: false  // Sin grid en X
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      point: {
        radius: isBar ? 0 : (currentChartType === 'line' ? 0 : 2),
        hitRadius: 10,
        hoverRadius: 4
      },
      line: {
        borderWidth: 2
      },
      bar: {
        borderRadius: 4,
        borderWidth: 0
      }
    }
  };
  
  cpuChart = new Chart(cpuCtx, {
    type: chartType,
    data: {
      labels: [],
      datasets: [{
        label: 'CPU %',
        data: cpuHistory,
        borderColor: '#3b82f6',
        backgroundColor: isArea ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.7)',
        tension: currentChartType === 'line' || isArea ? 0.4 : 0,
        fill: isArea || isBar
      }]
    },
    options: chartOptions
  });
  
  memoryChart = new Chart(memoryCtx, {
    type: chartType,
    data: {
      labels: [],
      datasets: [{
        label: 'Memory %',
        data: memoryHistory,
        borderColor: '#8b5cf6',
        backgroundColor: isArea ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.7)',
        tension: currentChartType === 'line' || isArea ? 0.4 : 0,
        fill: isArea || isBar
      }]
    },
    options: chartOptions
  });
}

// Función para cambiar el tipo de gráfica
function changeChartType(newType) {
  currentChartType = newType;
  
  // Actualizar botones activos
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-chart-type="${newType}"]`)?.classList.add('active');
  
  // Reinicializar gráficas con el nuevo tipo
  initializeCharts();
  
  // Actualizar inmediatamente con los datos actuales
  if (cpuChart && memoryChart && cpuHistory.length > 0) {
    updateChartsData();
  }
}

// Función helper para actualizar datos de las gráficas
function updateChartsData() {
  // SIN LABELS - Quitar las horas que funcionan mal
  const labels = Array(cpuHistory.length).fill('');
  
  // Calcular escala dinámica para CPU
  const cpuMax = Math.max(...cpuHistory, 1);
  const cpuMin = Math.min(...cpuHistory, 0);
  const cpuRange = cpuMax - cpuMin;
  
  // Si el rango es pequeño (< 5%), ajustar escala para mejor visualización
  let cpuScaleMax, cpuScaleMin;
  if (cpuRange < 5 && cpuMax < 95) {
    // Zoom in: mostrar solo el rango relevante con padding
    cpuScaleMin = Math.max(0, Math.floor(cpuMin - 1));
    cpuScaleMax = Math.min(100, Math.ceil(cpuMax + 2));
  } else if (cpuMax < 20) {
    // Si los valores son bajos, usar escala 0-20
    cpuScaleMin = 0;
    cpuScaleMax = 20;
  } else if (cpuMax < 50) {
    // Valores medios, usar 0-50
    cpuScaleMin = 0;
    cpuScaleMax = 50;
  } else {
    // Valores altos, usar escala completa 0-100
    cpuScaleMin = 0;
    cpuScaleMax = 100;
  }
  
  // Calcular escala dinámica para Memory
  const memMax = Math.max(...memoryHistory, 1);
  const memMin = Math.min(...memoryHistory, 0);
  const memRange = memMax - memMin;
  
  let memScaleMax, memScaleMin;
  if (memRange < 5 && memMax < 95) {
    memScaleMin = Math.max(0, Math.floor(memMin - 1));
    memScaleMax = Math.min(100, Math.ceil(memMax + 2));
  } else if (memMax < 20) {
    memScaleMin = 0;
    memScaleMax = 20;
  } else if (memMax < 50) {
    memScaleMin = 0;
    memScaleMax = 50;
  } else {
    memScaleMin = 0;
    memScaleMax = 100;
  }
  
  // Actualizar CPU chart con escala dinámica
  cpuChart.data.labels = labels;
  cpuChart.data.datasets[0].data = [...cpuHistory];
  cpuChart.options.scales.y.min = cpuScaleMin;
  cpuChart.options.scales.y.max = cpuScaleMax;
  cpuChart.options.scales.y.ticks.stepSize = Math.max(5, Math.ceil((cpuScaleMax - cpuScaleMin) / 4));
  cpuChart.update('none');
  
  // Actualizar Memory chart con escala dinámica
  memoryChart.data.labels = labels;
  memoryChart.data.datasets[0].data = [...memoryHistory];
  memoryChart.options.scales.y.min = memScaleMin;
  memoryChart.options.scales.y.max = memScaleMax;
  memoryChart.options.scales.y.ticks.stepSize = Math.max(5, Math.ceil((memScaleMax - memScaleMin) / 4));
  memoryChart.update('none');
}

async function updateMonitoringStats() {
  if (!currentMonitoringContainer) return;
  
  try {
    const stats = await invoke('get_container_stats', {
      containerId: currentMonitoringContainer
    });
    
    // Actualizar cards
    document.getElementById('monitor-cpu').textContent = stats.cpu_percentage.toFixed(2) + '%';
    document.getElementById('monitor-memory').textContent = formatBytes(stats.memory_usage);
    document.getElementById('monitor-memory-percent').textContent = stats.memory_percentage.toFixed(2) + '%';
    document.getElementById('monitor-network-rx').textContent = formatBytes(stats.network_rx_bytes);
    document.getElementById('monitor-network-tx').textContent = formatBytes(stats.network_tx_bytes);
    document.getElementById('monitor-disk-read').textContent = formatBytes(stats.block_read_bytes);
    document.getElementById('monitor-disk-write').textContent = formatBytes(stats.block_write_bytes);
    
    // Añadir a historial
    cpuHistory.push(stats.cpu_percentage);
    memoryHistory.push(stats.memory_percentage);
    
    // Limitar historial
    if (cpuHistory.length > MAX_HISTORY_POINTS) {
      cpuHistory.shift();
      memoryHistory.shift();
    }
    
    // Actualizar gráficas si existen
    if (window.Chart && cpuChart && memoryChart) {
      updateChartsData();
    }
    
    // Verificar alertas
    checkAlerts(stats);
    
  } catch (e) {
    console.error('Error updating monitoring stats:', e);
    showNotification('Error getting container stats: ' + e, 'error');
  }
}

function checkAlerts(stats) {
  const alertsContainer = document.getElementById('monitoring-alerts');
  const alerts = [];
  
  if (stats.cpu_percentage > 80) {
    alerts.push(`WARNING: High CPU usage: ${stats.cpu_percentage.toFixed(2)}%`);
  }
  
  if (stats.memory_percentage > 85) {
    alerts.push(`WARNING: High Memory usage: ${stats.memory_percentage.toFixed(2)}%`);
  }
  
  if (alerts.length > 0) {
    alertsContainer.innerHTML = alerts.map(alert => 
      `<div class="alert alert-warning">${alert}</div>`
    ).join('');
    alertsContainer.style.display = 'block';
  } else {
    alertsContainer.style.display = 'none';
  }
}

// Exponer funciones globalmente
window.openMonitoringModal = openMonitoringModal;
window.closeMonitoringModal = closeMonitoringModal;
window.changeChartType = changeChartType;

// ===== TEMPLATES =====
let selectedTemplateForDb = null;
let templateSelect = null;
let versionSelect = null;

function loadComposeTab() {
  if (!composeManager) {
    composeManager = new DockerCompose(invoke, showNotification, showLoading, hideLoading);
    window.composeManager = composeManager;
  }
  const content = document.getElementById('compose-tab-content');
  if (content) {
    content.innerHTML = composeManager.render();
    composeManager.loadProjects();
  }
}

function loadTemplatesTab() {
  templatesManager.render('templates-tab-content');
}

function loadTemplateOptions() {
  const templates = getAllTemplates();
  const dbType = selectedDbType;

  // Filter templates that support current db type
  const availableTemplates = Object.values(templates).filter(
    (t) => t.configurations[dbType]
  );

  const items = [
    { value: '', label: 'Default Configuration' },
    ...availableTemplates.map(t => ({
      value: t.id,
      label: `[${t.icon}] ${t.name} - ${t.description}`
    }))
  ];

  // Destroy previous instance if exists
  if (templateSelect) {
    templateSelect.destroy();
  }

  // Create new CustomSelect
  templateSelect = new CustomSelect('db-template-select', {
    placeholder: 'Default Configuration',
    items: items,
    value: '',
    onChange: (value) => {
      selectedTemplateForDb = value || null;
      if (selectedTemplateForDb) {
        const template = templates[selectedTemplateForDb];
        showNotification(`Template "${template.name}" selected. Configuration will be applied on creation.`, 'info');
      }
    }
  });
}

window.closeTemplateDetailsModal = () => {
  document.getElementById('template-details-modal')?.classList.remove('active');
};

window.closeCreateTemplateModal = () => {
  const modal = document.getElementById('create-template-modal');
  modal?.classList.remove('active');
  document.getElementById('create-template-form')?.reset();
  delete document.getElementById('create-template-form')?.dataset.editingId;
};

let templateDbConfigCounter = 0;

window.addTemplateDbConfig = () => {
  const container = document.getElementById('template-db-configs');
  const configId = `template-config-${templateDbConfigCounter++}`;

  const configHtml = `
    <div class="template-db-config-item" data-config-id="${configId}">
      <div class="form-row">
        <div class="form-group">
          <label>Database Type:</label>
          <div class="template-db-type-select" data-config-id="${configId}"></div>
        </div>
        <div class="form-group">
          <label>Memory Limit:</label>
          <input type="text" class="template-memory" placeholder="256m" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>CPU Limit:</label>
          <input type="text" class="template-cpus" placeholder="1" required />
        </div>
        <div class="form-group">
          <label>Restart Policy:</label>
          <div class="template-restart-policy-select" data-config-id="${configId}"></div>
        </div>
      </div>
      <div class="form-group">
        <label>Environment Variables (JSON):</label>
        <textarea class="template-env-vars" placeholder='{"KEY": "value"}' rows="3"></textarea>
      </div>
      <button type="button" class="btn btn-sm btn-danger" onclick="removeTemplateDbConfig('${configId}')">
        Remove
      </button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', configHtml);
  
  // Initialize CustomSelects for the new config
  const dbTypeItems = [
    { value: '', label: 'Select database' },
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'mongodb', label: 'MongoDB' },
    { value: 'redis', label: 'Redis' },
    { value: 'mariadb', label: 'MariaDB' }
  ];
  
  const restartPolicyItems = [
    { value: '', label: 'None' },
    { value: 'always', label: 'Always' },
    { value: 'unless-stopped', label: 'Unless Stopped' },
    { value: 'on-failure', label: 'On Failure' }
  ];
  
  new CustomSelect(container.querySelector(`.template-db-type-select[data-config-id="${configId}"]`), {
    placeholder: 'Select database',
    items: dbTypeItems,
    value: '',
    required: true
  });
  
  new CustomSelect(container.querySelector(`.template-restart-policy-select[data-config-id="${configId}"]`), {
    placeholder: 'None',
    items: restartPolicyItems,
    value: ''
  });
};

window.removeTemplateDbConfig = (configId) => {
  document.querySelector(`[data-config-id="${configId}"]`)?.remove();
};

window.handleCreateTemplate = async (e) => {
  e.preventDefault();

  const form = e.target;
  const name = form.querySelector('#template-name').value;
  const description = form.querySelector('#template-description').value;
  const icon = form.querySelector('#template-icon').value;
  const editingId = form.dataset.editingId;

  // Collect database configurations
  const configurations = {};
  const configItems = form.querySelectorAll('.template-db-config-item');

  try {
    configItems.forEach((item) => {
      const dbTypeSelectDiv = item.querySelector('.template-db-type-select');
      const restartPolicySelectDiv = item.querySelector('.template-restart-policy-select');
      
      // Get values from CustomSelects by finding the custom-select-value spans
      const dbTypeValue = dbTypeSelectDiv?.querySelector('.custom-select-value')?.textContent;
      const dbType = dbTypeValue && dbTypeValue !== 'Select database' ? 
        dbTypeSelectDiv.querySelector('.custom-select-option.selected')?.getAttribute('data-value') : '';
      
      const restartPolicyValue = restartPolicySelectDiv?.querySelector('.custom-select-value')?.textContent;
      const restartPolicy = restartPolicyValue && restartPolicyValue !== 'None' ? 
        restartPolicySelectDiv.querySelector('.custom-select-option.selected')?.getAttribute('data-value') : '';
      
      const memory = item.querySelector('.template-memory').value;
      const cpus = item.querySelector('.template-cpus').value;
      const envVarsText = item.querySelector('.template-env-vars').value;

      if (!dbType) {
        throw new Error('Please select a database type for all configurations');
      }

      let envVars = {};
      if (envVarsText.trim()) {
        try {
          envVars = JSON.parse(envVarsText);
        } catch (e) {
          throw new Error(`Invalid JSON in environment variables for ${dbType}`);
        }
      }

      configurations[dbType] = {
        memory,
        cpus,
        env: envVars,
      };

      if (restartPolicy) {
        configurations[dbType].restartPolicy = restartPolicy;
      }
    });

    if (Object.keys(configurations).length === 0) {
      throw new Error('Please add at least one database configuration');
    }

    const template = {
      id: editingId,
      name,
      description,
      icon,
      configurations,
    };

    saveCustomTemplate(template);
    closeCreateTemplateModal();
    loadTemplatesTab();
    showNotification(
      editingId ? 'Template updated successfully' : 'Template created successfully',
      'success'
    );
  } catch (error) {
    showNotification(error.message, 'error');
  }
};

// ===== PULL IMAGE MODAL =====
function openPullImageModal() {
  document.getElementById('pull-image-modal').classList.add('active');
  document.getElementById('image-name').value = '';
  document.getElementById('image-name').focus();
}

function closePullImageModal() {
  document.getElementById('pull-image-modal').classList.remove('active');
}

async function handlePullImage(e) {
  e.preventDefault();
  
  const imageName = document.getElementById('image-name').value.trim();
  
  if (!imageName) {
    showNotification('Please enter an image name', 'warning');
    return;
  }

  showLoading(`Pulling ${imageName}...`);
  closePullImageModal();

  try {
    // Por ahora, mostrar que la funcionalidad está disponible al crear una database
    // ya que create_database hace pull automáticamente
    showNotification(
      'Note: Images are automatically pulled when creating databases. ' +
      'To pull custom images, use "docker pull ' + imageName + '" in terminal.',
      'info'
    );
    
    // TODO: Implementar comando pull_image en el backend si se necesita
    // await invoke('pull_image', { imageName });
    
    await loadImages(); // Recargar la lista de imágenes
  } catch (error) {
    showNotification(`Error: ${error}`, 'error');
  } finally {
    hideLoading();
  }
}

window.openPullImageModal = openPullImageModal;
window.closePullImageModal = closePullImageModal;
window.handlePullImage = handlePullImage;

// Expose functions globally
window.loadTemplatesTab = loadTemplatesTab;
window.loadTemplateOptions = loadTemplateOptions;

