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
import { createLogger } from './lib/utils/logger.js';
import { setupDevTools } from './lib/dev-tools.js';
import { appState } from './lib/state/AppState.js';
import { TabManager } from './lib/managers/TabManager.js';
import { FavoritesManager } from './lib/managers/FavoritesManager.js';

// Create loggers for different contexts
const logger = createLogger('Main');
const tauriLogger = createLogger('Tauri');
const updateLogger = createLogger('Updates');

// Create tab manager and favorites manager instances
const tabManager = new TabManager();
const favoritesManager = new FavoritesManager();

// Store favorites manager in appState for global access
appState.setComponent('favoritesManager', favoritesManager);

// Global search filter instances and migration data
let migrationSearchFilters = null;
let allMigratedDatabases = [];

// Global settings cache
let globalSettings = null;

// Function to get current settings
function getSettings() {
  if (!globalSettings) {
    globalSettings = loadSettings();
  }
  return globalSettings;
}

// Function to refresh settings cache
function refreshSettings() {
  globalSettings = loadSettings();
  applySettings(globalSettings);
}

// Function to apply settings to the app
function applySettings(settings) {
  console.log('[applySettings] Applying settings:', settings);
  
  // Apply compact mode
  if (settings.compactMode) {
    document.documentElement.classList.add('compact-mode');
    console.log('[applySettings] Compact mode enabled');
  } else {
    document.documentElement.classList.remove('compact-mode');
    console.log('[applySettings] Compact mode disabled');
  }
  
  // Apply animations
  if (!settings.animations) {
    document.documentElement.classList.add('no-animations');
    console.log('[applySettings] Animations disabled');
  } else {
    document.documentElement.classList.remove('no-animations');
    console.log('[applySettings] Animations enabled');
  }
  
  // Apply other settings that need immediate effect
  console.log('[applySettings] Settings applied successfully');
}

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
          tauriLogger.info('API loaded successfully');
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

// Backward compatibility getters (deprecated - use appState instead)
let invoke, check, ask, relaunch;

logger.info('Application starting...');
logger.debug('Waiting for Tauri API...');

// Función para verificar actualizaciones
async function checkForUpdates(silent = true) {
  try {
    if (!check) {
      console.log('[Update] Plugin not available');
      return;
    }

    console.log('[Update] Checking for updates...');
    const update = await check();

    if (update?.available) {
      console.log('[Update] New version available:', update.version);

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
  // Load settings
  const settings = loadSettings();
  
  // Check if we should show success notifications
  if (type === 'success' && !settings.showSuccess) {
    return;
  }
  
  const colors = {
    success: '#10b981',
    error: '#dc2626',
    info: '#3b82f6',
    warning: '#f59e0b',
  };

  const notif = document.createElement('div');
  const animationClass = settings.animations ? 'slideIn' : 'none';
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
    animation: ${animationClass} ${settings.animations ? '0.3s' : '0s'} ease;
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
    transition: ${settings.animations ? 'background 0.2s ease' : 'none'};
  `;
  
  closeBtn.onmouseover = () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  };
  
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'transparent';
  };
  
  closeBtn.onclick = () => {
    if (settings.animations) {
      notif.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    } else {
      notif.remove();
    }
  };
  
  notif.appendChild(messageSpan);
  notif.appendChild(closeBtn);
  document.body.appendChild(notif);

  // Play sound if enabled
  if (settings.soundNotifications && (type === 'error' || type === 'warning')) {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57+adTgwOTqXh8bllHgU2jdXyz3cqBSJ1xe/glEILElyx6OyrWBUIRJze8btoIgQnfsz...'); 
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {
      // Silence errors
    }
  }

  // Use notification duration from settings
  const duration = settings.notificationDuration || 3000;
  const timeoutId = setTimeout(() => {
    if (settings.animations) {
      notif.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    } else {
      notif.remove();
    }
  }, duration);
  
  // Clear timeout if manually closed
  closeBtn.onclick = () => {
    clearTimeout(timeoutId);
    if (settings.animations) {
      notif.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    } else {
      notif.remove();
    }
  };
}

/**
 * Check if Docker is running and available
 * @returns {Promise<boolean>} True if Docker is connected, false otherwise
 */
async function checkDocker() {
  try {
    const isConnected = await invoke('check_docker');
    logger.info(`[checkDocker] Docker status: ${isConnected ? 'Connected' : 'Disconnected'}`);
    
    if (isConnected) {
      document.getElementById('docker-status').textContent = 'Docker Connected';
      return true;
    } else {
      document.getElementById('docker-status').textContent = 'Docker Disconnected';
      return false;
    }
  } catch (error) {
    logger.error('[checkDocker] Error checking Docker:', error);
    document.getElementById('docker-status').textContent = 'Docker Disconnected';
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
        <div class="docker-error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
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
  logger.info('[Retry] Starting Docker reconnection attempt...');
  showLoading('Reconnecting to Docker...');
  
  try {
    // First, try to reconnect the Docker client (creates new connection)
    logger.debug('[Retry] Calling reconnect_docker command...');
    try {
      await invoke('reconnect_docker');
      logger.info('[Retry] Docker client reconnected successfully');
    } catch (reconnectError) {
      logger.warn('[Retry] Reconnect command failed:', reconnectError);
      // Continue anyway, maybe it's already connected
    }
    
    // Now check if Docker is actually connected
    logger.debug('[Retry] Checking Docker status...');
    const connected = await checkDocker();
    logger.info('[Retry] Docker check result:', connected);
    
    if (connected) {
      logger.info('[Retry] Docker is connected! Starting reconnection process...');
      
      // Hide loading and Docker error overlay first
      hideLoading();
      hideDockerError();
      
      showNotification('Docker connected successfully! Reloading data...', 'success');
      
      // Clear all cache to get fresh data
      logger.debug('[Retry] Clearing cache...');
      cache.clear();
      
      // Reload data with loading indicator
      showLoading('Loading data...');
      try {
        logger.debug('[Retry] Loading dashboard stats...');
        await loadDashboardStats();
        
        logger.debug('[Retry] Loading containers...');
        await loadContainers(false, true);
        
        logger.info('[Retry] Data loaded successfully');
      } catch (dataError) {
        logger.error('[Retry] Error loading data:', dataError);
        showNotification('Data loaded with some errors: ' + dataError, 'warning');
      }
      
      // Re-setup or resume polling
      try {
        const pollingStats = polling.getStats();
        logger.debug('[Retry] Current polling stats:', pollingStats);
        
        if (pollingStats.total === 0) {
          // No polling tasks registered, setup new ones
          logger.info('[Retry] No polling tasks found, setting up new ones...');
          setupPolling();
          logger.info('[Retry] Polling setup completed');
        } else {
          // Polling tasks exist, resume them and reset errors
          logger.info('[Retry] Resuming existing polling tasks...');
          polling.resumeAll();
          logger.info('[Retry] Polling resumed successfully', pollingStats);
        }
      } catch (pollingError) {
        logger.error('[Retry] Error with polling:', pollingError);
        // Try to setup fresh polling
        try {
          polling.clear();
          setupPolling();
          logger.info('[Retry] Fresh polling setup completed');
        } catch (freshPollingError) {
          logger.error('[Retry] Failed to setup fresh polling:', freshPollingError);
        }
      }
      
      showNotification('Reconnected successfully!', 'success');
      logger.info('[Retry] Reconnection completed successfully');
    } else {
      logger.warn('[Retry] Docker is still not available');
      showNotification('Docker is still not available. Please make sure Docker Desktop is running.', 'warning');
    }
  } catch (e) {
    logger.error('[Retry] Error during reconnection:', e);
    showNotification('Failed to connect to Docker: ' + e, 'error');
  } finally {
    hideLoading();
    logger.info('[Retry] Reconnection attempt finished');
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
  
  // Check if this container is favorited
  const isFavorite = favoritesManager.isFavorite(c.id);
  const favoriteClass = isFavorite ? 'is-favorite' : '';
  
  // Store container data for URL generation
  window[`containerData_${index}`] = c;
  
  return `
    <div class="db-card ${favoriteClass}" data-db-type="${c.db_type}" data-container-id="${c.id}">
      <div class="db-card-header">
        <button 
          class="favorite-btn ${isFavorite ? 'active' : ''}" 
          onclick="toggleFavorite('${c.id}')"
          data-tooltip="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
        >
          ${getIcon(isFavorite ? 'starFilled' : 'star')}
        </button>
        <div class="db-card-icon">${dbIcon}</div>
        <div class="db-card-info">
          <h3 class="db-card-title">${c.name}</h3>
          <span class="db-card-meta">${dbTypeName} ${c.database_name}</span>
        </div>
        <span class="db-status db-status-${c.status}">${c.status}</span>
      </div>
      
      <div class="db-card-data">
        <div class="db-data-item" style="position: relative;">
          <span class="db-data-label">Port</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="db-data-value" onclick="copyToClipboard('${c.port}', 'Port copied!')" style="cursor: pointer;" data-tooltip="Click to copy">${c.port}</span>
            ${c.status !== 'running' ? `
              <button class="db-action-btn-mini" onclick="openEditPortModal('${c.id}', '${c.port}', '${c.name.replace(/'/g, "\\'")}' )" data-tooltip="Edit port" style="padding: 4px;">
                ${getIcon('edit')}
              </button>
            ` : ''}
          </div>
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
 * Render containers from appState without fetching
 * Used by observers to update UI when state changes
 */
function renderContainers() {
  const allContainers = appState.getData('allContainers');
  if (!allContainers || allContainers.length === 0) return;
  
  const list = document.getElementById('containers-list');
  const noData = document.getElementById('no-containers');
  const resultsCount = document.getElementById('results-count');
  const searchFilters = appState.getComponent('searchFilters');

  // Apply filters if component exists
  let containers = allContainers;
  if (searchFilters) {
    containers = searchFilters.applyFilters(allContainers);
  }

  if (!containers.length) {
    list.innerHTML = '';
    noData.style.display = 'block';
    if (resultsCount) {
      resultsCount.textContent = allContainers.length > 0 ? 'No results found' : '';
    }
    return;
  }

  noData.style.display = 'none';
  
  // Update results count
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

  // Simple render without virtual scroll (observer updates should be lightweight)
  list.innerHTML = containers.map((c, i) => renderContainerCard(c, i)).join('');
}

/**
 * Render images from appState without fetching
 * Used by observers to update UI when state changes
 */
function renderImages() {
  const allImages = appState.getData('allImages');
  if (!allImages || allImages.length === 0) return;
  
  const list = document.getElementById('images-list');
  const noData = document.getElementById('no-images');
  const resultsCount = document.getElementById('results-count-images');
  const imagesSearchFilters = appState.getComponent('imagesSearchFilters');

  // Apply filters if component exists
  let images = allImages;
  if (imagesSearchFilters) {
    images = imagesSearchFilters.applyFilters(allImages);
  }

  if (!images.length) {
    list.innerHTML = '';
    noData.style.display = 'block';
    if (resultsCount) {
      resultsCount.textContent = allImages.length > 0 ? 'No results found' : '';
    }
    return;
  }

  noData.style.display = 'none';
  
  // Update results count
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

  // Render images
  list.innerHTML = images.map((img) => {
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
  }).join('');
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
      
      const containers = await cache.get(
        'containers',
        () => invoke('list_containers'),
        30000 // 30 second TTL
      );
      
      // Update state
      appState.setData('allContainers', containers);
    }
    
    const list = document.getElementById('containers-list');
    const noData = document.getElementById('no-containers');
    const resultsCount = document.getElementById('results-count');

    // Get data from state
    const allContainers = appState.getData('allContainers');
    const searchFilters = appState.getComponent('searchFilters');

    // Aplicar filtros si el componente existe
    let containers = allContainers;
    if (searchFilters) {
      containers = searchFilters.applyFilters(allContainers);
    }
    
    // Sort by favorites (favorites first)
    containers = favoritesManager.sortByFavorites(containers);

    if (!containers.length) {
      // Destroy virtual scroll if exists
      const virtualScroll = appState.getComponent('containersVirtualScroll');
      if (virtualScroll) {
        virtualScroll.destroy();
        appState.setComponent('containersVirtualScroll', null);
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
      const favCount = favoritesManager.getCount();
      if (searchFilters && searchFilters.getActiveFiltersCount() > 0) {
        resultsCount.innerHTML = `
          Showing <strong>${containers.length}</strong> of <strong>${allContainers.length}</strong> databases
          <span class="filter-badge">${searchFilters.getActiveFiltersCount()} active filters</span>
          ${favCount > 0 ? `<span class="filter-badge favorite-badge">${getIcon('star')} ${favCount} favorites</span>` : ''}
        `;
      } else {
        resultsCount.innerHTML = `
          Showing ${containers.length} databases
          ${favCount > 0 ? `<span class="filter-badge favorite-badge">${getIcon('star')} ${favCount} favorites</span>` : ''}
        `;
      }
    }

    // Use virtual scrolling for large lists (>50 items)
    const VIRTUAL_SCROLL_THRESHOLD = 50;
    
    if (containers.length > VIRTUAL_SCROLL_THRESHOLD) {
      // Initialize or update virtual scroll
      let virtualScroll = appState.getComponent('containersVirtualScroll');
      
      if (!virtualScroll) {
        // Find the scroll container (main-content or containers-section)
        const scrollContainer = document.querySelector('.main-content') || 
                               list.closest('.containers-section') || 
                               list.parentElement;
        
        // Mark list as using virtual scrolling
        list.classList.add('virtual-scrolling');
        list.classList.remove('containers-grid');
        
        virtualScroll = new VirtualScroll({
          container: list,
          scrollContainer: scrollContainer,
          items: containers,
          renderItem: renderContainerCard,
          itemHeight: 180, // Estimated height of db-card
          buffer: 3
        });
        
        appState.setComponent('containersVirtualScroll', virtualScroll);
      } else {
        virtualScroll.setItems(containers);
      }
    } else {
      // For small lists, use traditional rendering
      const virtualScroll = appState.getComponent('containersVirtualScroll');
      
      if (virtualScroll) {
        virtualScroll.destroy();
        appState.setComponent('containersVirtualScroll', null);
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
  const searchFilters = new SearchFilters('databases');
  appState.setComponent('searchFilters', searchFilters);
  
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
  const imagesSearchFilters = new SearchFilters('images');
  appState.setComponent("imagesSearchFilters", imagesSearchFilters);
  console.log('[initializeImagesSearchFilters] Component created');
  
  // Renderizar el componente en el DOM
  const searchContainer = document.getElementById('search-filters-images');
  if (searchContainer) {
    searchContainer.innerHTML = appState.getComponent("imagesSearchFilters").render();
    appState.getComponent("imagesSearchFilters").attachEventListeners();
    console.log('[initializeImagesSearchFilters] Component rendered and attached');
    
    // Suscribirse a cambios de filtros
    appState.getComponent("imagesSearchFilters").onChange(() => {
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

  const selectedDbType = appState.getUI('selectedDbType');
  const selectedTemplateForDb = appState.getUI('selectedTemplateForDb');
  
  if (!appState.getUI("selectedDbType")) {
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
      version: appState.getComponent('versionSelect') ? appState.getComponent('versionSelect').getValue() : '',
      type: appState.getUI("selectedDbType"),
    };

    // Apply template if selected
    if (appState.getUI("selectedTemplateForDb")) {
      console.log('[TEMPLATE] Applying template:', appState.getUI("selectedTemplateForDb"));
      console.log('[TEMPLATE] DB Type:', appState.getUI("selectedDbType"));
      console.log('[TEMPLATE] Base config before:', config);
      
      const templateConfig = applyTemplate(appState.getUI("selectedTemplateForDb"), appState.getUI("selectedDbType"), config);
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
    appState.setUI("selectedTemplateForDb", null); // Reset template selection
    
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
// Removed: currentRenameContainerId = null; // Now using appState

function openRenameModalFromButton(button) {
  const containerId = button.getAttribute('data-container-id');
  const currentName = button.getAttribute('data-container-name');
  console.log('[openRenameModalFromButton]', { containerId, currentName });
  openRenameModal(containerId, currentName);
}

function openRenameModal(containerId, currentName) {
  console.log('[openRenameModal]', { containerId, currentName });
  appState.setModal("currentRenameContainerId", containerId);
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
  appState.setModal("currentRenameContainerId", null);
}

async function executeRename(e) {
  e.preventDefault();
  const newName = document.getElementById('rename-new-name').value.trim();
  
  console.log('[executeRename] Starting...', {
    newName,
    containerId: appState.getModal("currentRenameContainerId"),
  });
  
  if (!newName) {
    showNotification('Container name cannot be empty', 'error');
    return;
  }

  if (!appState.getModal("currentRenameContainerId")) {
    console.error('[executeRename] currentRenameContainerId is null or undefined!');
    showNotification('No container selected', 'error');
    return;
  }

  // ¡GUARDAR EL ID EN UNA VARIABLE LOCAL ANTES DE CERRAR EL MODAL!
  const containerIdToRename = appState.getModal("currentRenameContainerId");
  
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

// ==================== EDIT PORT MODAL ====================

/**
 * Open edit port modal
 * @param {string} containerId - Container ID
 * @param {string} currentPort - Current port number
 * @param {string} containerName - Container name
 */
function openEditPortModal(containerId, currentPort, containerName) {
  console.log('[openEditPortModal]', { containerId, currentPort, containerName });
  
  appState.setModal("currentEditPortContainerId", containerId);
  document.getElementById('edit-port-container-name').textContent = containerName;
  document.getElementById('edit-port-current').value = currentPort;
  document.getElementById('edit-port-new').value = '';
  document.getElementById('edit-port-modal').classList.add('active');
  
  // Focus on input after modal animation
  setTimeout(() => {
    document.getElementById('edit-port-new').focus();
  }, 100);
}

/**
 * Close edit port modal
 */
function closeEditPortModal() {
  document.getElementById('edit-port-modal').classList.remove('active');
  document.getElementById('edit-port-form').reset();
  appState.setModal("currentEditPortContainerId", null);
}

/**
 * Execute port update
 * @param {Event} e - Form submit event
 */
async function executeEditPort(e) {
  e.preventDefault();
  const newPortStr = document.getElementById('edit-port-new').value.trim();
  const newPort = parseInt(newPortStr, 10);
  
  console.log('[executeEditPort] Starting...', {
    newPort,
    containerId: appState.getModal("currentEditPortContainerId"),
  });
  
  if (!newPort || newPort < 1024 || newPort > 65535) {
    showNotification('Port must be between 1024 and 65535', 'error');
    return;
  }

  if (!appState.getModal("currentEditPortContainerId")) {
    console.error('[executeEditPort] currentEditPortContainerId is null or undefined!');
    showNotification('No container selected', 'error');
    return;
  }

  // Save the ID in a local variable before closing modal
  const containerIdToUpdate = appState.getModal("currentEditPortContainerId");
  
  closeEditPortModal();
  showLoading('Updating container port...');

  try {
    console.log('[executeEditPort] Calling invoke with:', {
      containerId: containerIdToUpdate,
      newPort: newPort,
    });
    
    const result = await invoke('update_container_port', {
      containerId: containerIdToUpdate,
      newPort: newPort
    });
    
    console.log('[executeEditPort] Success:', result);
    showNotification(result, 'success');
    
    // Invalidate cache to force refresh
    cache.invalidate('containers');
    await loadContainers(false, true);
    await loadDashboardStats();
  } catch (e) {
    console.error('[executeEditPort] Error:', e);
    showNotification('Error updating port: ' + e, 'error');
  } finally {
    hideLoading();
  }
}

// ==================== SQL MODAL ====================

// Removed: currentSQL = null; // Now using appState
function showSQL(id, db) {
  appState.setModal("currentSQL", { id, db });
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
      containerId: appState.getModal("currentSQL").id,
      database: appState.getModal("currentSQL").db,
      username: 'postgres',
      sql: sql,
    });
    output.textContent = result || 'OK';
  } catch (e) {
    output.textContent = 'Error: ' + e;
  }
}

// Variables globales para el modal de creación
// Database types - now in appState.data.databaseTypes

// Cargar tipos de bases de datos
async function loadDatabaseTypes() {
  try {
    const types = await invoke('get_database_types');
    appState.setData('databaseTypes', types);
    console.log('Database types loaded:', types);
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
  const databaseTypes = appState.getData('databaseTypes') || [];
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

  const databaseTypes = appState.getData('databaseTypes') || [];
  const dbType = databaseTypes.find((t) => t.id === appState.getUI("selectedDbType"));
  if (!dbType) return;

  // Actualizar encabezado
  document.getElementById('selected-db-icon').innerHTML = getDbIcon(dbType);
  document.getElementById('selected-db-name').textContent = dbType.name;
  document.getElementById('modal-title').textContent = `Create ${dbType.name}`;

  // Añadir data attribute al contenedor seleccionado
  const selectedDbTypeDiv = document.querySelector('.selected-db-type');
  if (selectedDbTypeDiv) {
    selectedDbTypeDiv.setAttribute('data-db-type', appState.getUI('selectedDbType'));
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

  if (appState.getUI('selectedDbType') === 'redis') {
    // Redis no requiere usuario, contraseña es opcional
    usernameGroup.style.display = 'none';
    passwordGroup.querySelector('input').required = false;
    passwordGroup.querySelector('label').textContent = 'Contraseña (opcional):';
  } else if (appState.getUI('selectedDbType') === 'mongodb') {
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
  if (appState.getComponent("versionSelect")) {
    appState.getComponent("versionSelect").destroy();
  }

  // Create new CustomSelect for versions
  const versionSelect = new CustomSelect('db-version-select', {
    placeholder: 'Select version',
    items: versionItems,
    value: versionItems[0]?.value || '',
    required: true
  });
  appState.setComponent("versionSelect", versionSelect);
}

// Seleccionar tipo de base de datos
window.selectDatabaseType = (typeId) => {
  appState.setUI("selectedDbType", typeId);
  showStep2();
};

// Volver al paso 1
window.goBackToStep1 = () => {
  appState.setUI("selectedDbType", null);
  appState.setUI("selectedTemplateForDb", null);
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
  appState.setUI("selectedDbType", null);
  appState.setUI("selectedTemplateForDb", null);
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
window.openEditPortModal = openEditPortModal;
window.closeEditPortModal = closeEditPortModal;
window.executeEditPort = executeEditPort;

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
  
  // Get settings for refresh interval and auto-refresh
  const settings = getSettings();
  const refreshInterval = settings.refreshInterval || 30000;
  const autoRefresh = settings.autoRefresh !== false;
  
  if (!autoRefresh) {
    console.log('[Setup] Auto-refresh is disabled in settings');
    return;
  }
  
  console.log('[Setup] Using refresh interval:', refreshInterval + 'ms');
  
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
    refreshInterval,
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
    refreshInterval,
    {
      immediate: false,
      onlyWhenVisible: true,
      tab: 'dashboard'
    }
  );
  
  // Task 3: Update images when on images tab
  polling.register(
    'images',
    async () => {
      try {
        if (await checkDocker()) {
          const lazyLoad = settings.lazyLoad !== false;
          if (!lazyLoad) {
            cache.invalidate('images');
            await loadImages(false, true);
          }
        }
      } catch (e) {
        console.error('[Polling] Error updating images:', e);
      }
    },
    refreshInterval * 2, // Doble de intervalo para images
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
      containers: () => appState.getData('allContainers') || [],
      images: () => appState.getData('allImages') || [],
      volumes: () => appState.getData('allVolumes') || [],
      networks: () => appState.getData('allNetworks') || [],
      get: (key) => appState.getData(key),
      set: (key, value) => appState.setData(key, value),
      getAll: () => appState.getAllData(),
    }
  };
  
  console.log('%c[DEV] Development tools available at window.__DEV__', 'color: #10b981; font-weight: bold');
  console.log('%cTry: __DEV__.cache.stats() or __DEV__.polling.stats()', 'color: #94a3b8');
}

/**
 * Initialize Dark Mode functionality
 * Creates toggle button and manages theme persistence
 */
function initializeDarkMode() {
  // Check if dark mode button already exists
  if (document.getElementById('dark-mode-toggle')) return;
  
  // Get saved preference or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
  
  // Apply initial theme
  if (isDark) {
    document.body.classList.add('dark-mode');
  }
  
  // Create dark mode toggle button
  const darkModeToggle = document.createElement('button');
  darkModeToggle.id = 'dark-mode-toggle';
  darkModeToggle.className = 'dark-mode-toggle';
  darkModeToggle.setAttribute('data-tooltip', isDark ? 'Light Mode' : 'Dark Mode');
  darkModeToggle.innerHTML = isDark ? '☀' : '☾';
  
  // Add click handler
  darkModeToggle.addEventListener('click', () => {
    const isCurrentlyDark = document.body.classList.contains('dark-mode');
    
    if (isCurrentlyDark) {
      document.body.classList.remove('dark-mode');
      darkModeToggle.innerHTML = '☾';
      darkModeToggle.setAttribute('data-tooltip', 'Dark Mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.add('dark-mode');
      darkModeToggle.innerHTML = '☀';
      darkModeToggle.setAttribute('data-tooltip', 'Light Mode');
      localStorage.setItem('theme', 'dark');
    }
  });
  
  // Insert button in header-right container
  const headerRight = document.querySelector('.header-right');
  
  if (headerRight) {
    // Insert at the beginning of header-right (before other buttons)
    headerRight.insertBefore(darkModeToggle, headerRight.firstChild);
  } else {
    // Fallback: try old structure
    const header = document.querySelector('.header');
    const headerActions = document.querySelector('.header-actions');
    
    if (headerActions && header) {
      header.insertBefore(darkModeToggle, headerActions);
    } else if (header) {
      header.appendChild(darkModeToggle);
    }
  }
  
  logger.info('[Dark Mode] Initialized', { theme: isDark ? 'dark' : 'light' });
}

// Expose dark mode toggle globally
window.toggleDarkMode = () => {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.click();
  }
};

/**
 * Update footer timestamp
 */
function updateFooterTime() {
  const footerTime = document.getElementById('footer-time');
  if (footerTime) {
    footerTime.textContent = new Date().toLocaleTimeString('es-ES');
  }
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

    // ===== DARK MODE SETUP =====
    initializeDarkMode();
    
    // ===== APPLY SETTINGS =====
    const initialSettings = getSettings();
    applySettings(initialSettings);

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

    // Enable AppState features
    logger.info('[AppState] Enabling persistence and history...');
    
    // Enable state persistence for specific keys
    appState.enablePersistence([
      'ui.currentChartType',
      'ui.selectedDbType',
      // Don't persist runtime data like containers/images
    ]);
    
    // Enable state history (undo/redo)
    appState.enableHistory();
    
    logger.info('[AppState] Features enabled', appState.getStats());

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

    // Initialize tabs first (before checking Docker)
    initializeTabs();
    logger.info('[App] Tabs initialized');
    
    // Setup state observers
    setupStateObservers();
    logger.info('[App] State observers configured');
    
    // Verificar Docker y cargar contenedores
    const dockerConnected = await checkDocker();
    
    if (dockerConnected) {
      logger.info('[App] Docker connected, loading initial data...');
      hideDockerError(); // Ensure overlay is hidden
      
      // Cargar dashboard primero ya que es la tab activa por defecto
      await loadDashboardStats();
      
      // Luego cargar containers para la tab databases
      await loadContainers(false, true);
      
      logger.info('[App] Initial data loaded');
      
      // Setup intelligent polling
      setupPolling();
      logger.info('[App] Polling system started');
      
      // Update footer time
      updateFooterTime();
      setInterval(updateFooterTime, 1000);
    } else {
      logger.warn('[App] Docker not connected on startup');
      showDockerError(); // Show overlay only if really not connected
    }

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

// ===== TAB SYSTEM WITH LAZY LOADING =====

/**
 * Initialize all tabs with their lazy loaders
 */
function initializeTabs() {
  logger.info('[initializeTabs] Registering tab loaders...');
  
  // Dashboard - load immediately (first view)
  tabManager.registerTab('dashboard', async () => {
    logger.info('[Tab] Loading dashboard...');
    await loadDashboardStats();
  }, true);

  // Databases - lazy load
  tabManager.registerTab('databases', async () => {
    logger.info('[Tab] Loading databases...');
    await loadContainers();
  });

  // Images - lazy load
  tabManager.registerTab('images', async () => {
    logger.info('[Tab] Loading images...');
    await loadImages();
  });

  // Migration - lazy load
  tabManager.registerTab('migration', async () => {
    logger.info('[Tab] Loading migration...');
    await checkLocalPostgres();
    await loadMigratedDatabases();
  });

  // Volumes - lazy load
  tabManager.registerTab('volumes', async () => {
    logger.info('[Tab] Loading volumes...');
    await loadVolumes();
  });

  // Compose - lazy load
  tabManager.registerTab('compose', async () => {
    logger.info('[Tab] Loading compose...');
    loadComposeTab();
  });

  // Templates - lazy load
  tabManager.registerTab('templates', async () => {
    logger.info('[Tab] Loading templates...');
    loadTemplatesTab();
  });
  
  // Settings - lazy load
  tabManager.registerTab('settings', async () => {
    logger.info('[Tab] Loading settings...');
    initializeSettings();
  });
  
  logger.info('[initializeTabs] Tabs registered. Loaded:', tabManager.getLoadedCount());
}

/**
 * Setup state observers to react to data changes
 */
function setupStateObservers() {
  logger.info('[State] Setting up observers...');
  
  // Observer for containers data changes
  appState.subscribe('data.allContainers', (containers) => {
    logger.debug('[Observer] Containers changed', { count: containers?.length || 0 });
    
    // Auto-update databases tab if it's active and visible
    const currentTab = tabManager.getCurrentTab();
    if (currentTab === 'databases' && document.getElementById('tab-databases')?.style.display !== 'none') {
      renderContainers();
    }
    
    // Update dashboard stats if visible
    if (currentTab === 'dashboard' || document.getElementById('tab-dashboard')?.style.display !== 'none') {
      updateDashboardContainersCount(containers?.length || 0);
    }
  });
  
  // Observer for images data changes
  appState.subscribe('data.allImages', (images) => {
    logger.debug('[Observer] Images changed', { count: images?.length || 0 });
    
    // Auto-update images tab if it's active
    const currentTab = tabManager.getCurrentTab();
    if (currentTab === 'images' && document.getElementById('tab-images')?.style.display !== 'none') {
      renderImages();
    }
  });
  
  // Observer for UI changes
  appState.subscribe('ui.currentChartType', (chartType) => {
    logger.debug('[Observer] Chart type changed', { chartType });
  });
  
  // Observer for tab changes (via TabManager)
  tabManager.onChange((tabName) => {
    logger.debug('[Observer] Tab changed', { tab: tabName });
    appState.setUI('activeTab', tabName);
  });
  
  logger.info('[State] Observers configured');
}

/**
 * Update dashboard containers count
 * @param {number} count - Number of containers
 */
function updateDashboardContainersCount(count) {
  const elem = document.getElementById('total-containers');
  if (elem) {
    elem.textContent = count;
  }
}

/**
 * Switch between tabs with lazy loading
 * Delegates to TabManager for loading and state management
 */
window.switchTab = async (tabName) => {
  logger.info(`[switchTab] Switching to: ${tabName}`);
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  
  const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
  if (tabButton) {
    tabButton.classList.add('active');
  }

  // Update tab content visibility
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
    content.style.display = 'none';
  });
  
  const tabContent = document.getElementById(`tab-${tabName}`);
  if (tabContent) {
    tabContent.classList.add('active');
    tabContent.style.display = 'block';
  }

  // Notify polling manager about tab change
  polling.setActiveTab(tabName);

  // Use TabManager to handle loading
  try {
    await tabManager.switchTab(tabName);
    logger.info(`[switchTab] Tab ${tabName} loaded successfully`);
  } catch (error) {
    logger.error(`[switchTab] Error loading tab ${tabName}:`, error);
    showNotification(`Error loading ${tabName}: ${error}`, 'error');
  }
};

// ===== LOCAL POSTGRES MIGRATION =====
// Removed: localPostgresConfig = null; // Now using appState
// Removed: allLocalDatabases = []; // Now using appState
// Removed: allMigratedDatabases = []; // Now using appState

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
  appState.setMigration("localPostgresConfig", config);

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
      config: appState.getMigration("localPostgresConfig"),
    });

    if (!databases.length) {
      list.innerHTML = '';
      noData.style.display = 'block';
      container.style.display = 'block';
  appState.setData("allLocalDatabases", []);
      return;
    }

    noData.style.display = 'none';
    container.style.display = 'block';

    // Store all databases
  appState.setData("allLocalDatabases", databases);

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
  console.log('[renderLocalDatabases] appState.getData("allLocalDatabases") length:', appState.getData("allLocalDatabases")?.length || 0);

  // Aplicar filtros si el componente existe
  let filteredDatabases = appState.getData("allLocalDatabases") || [];
  if (migrationSearchFilters) {
    console.log('[renderLocalDatabases] Applying filters...');
    filteredDatabases = migrationSearchFilters.applyFilters(filteredDatabases);
    console.log('[renderLocalDatabases] After filters:', filteredDatabases.length, 'databases');
  }

  if (filteredDatabases.length === 0) {
    list.innerHTML = '';
    noData.style.display = 'block';
    if (resultsCount) {
      resultsCount.textContent = (appState.getData("allLocalDatabases") && appState.getData("allLocalDatabases").length > 0) 
        ? 'No results found' 
        : '';
    }
    if (appState.getData("allLocalDatabases") && appState.getData("allLocalDatabases").length > 0) {
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
        Showing <strong>${filteredDatabases.length}</strong> of <strong>${appState.getData("allLocalDatabases").length}</strong> databases
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
      config: appState.getMigration("localPostgresConfig"),
      databaseName: dbName,
    });

    showNotification(`Database "${dbName}" migrated successfully!`, 'success');

    // Reload both lists
    await loadLocalDatabases();
    await loadMigratedDatabases();
    await loadContainers();

    // Preguntar si quiere borrar la base de datos original DESPUÉS de migración exitosa
    hideLoading();
    
    // Pequeño delay para que el usuario vea que la migración fue exitosa
    setTimeout(() => {
      if (confirm(
        `Migration completed successfully!\n\n` +
        `Would you like to DELETE the original database "${dbName}"?\n\n` +
        `⚠️ WARNING: This action cannot be undone.\n` +
        `Only proceed if you've verified the migrated data is correct.`
      )) {
        confirmDeleteOriginalDatabase(dbName);
      }
    }, 800);
    
  } catch (error) {
    showNotification(`Migration failed: ${error}`, 'error');
    hideLoading();
  }
}

function confirmDeleteOriginalDatabase(dbName) {
  // Crear modal de confirmación MUY CLARO
  const modalHTML = `
    <div class="confirm-modal active" id="delete-original-modal">
      <div class="confirm-modal-content" style="max-width: 500px;">
        <div class="confirm-modal-header">
          <h3>Delete Original Database?</h3>
        </div>
        <div class="confirm-modal-body">
          <div style="background: #dc2626; color: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <strong style="font-size: 1.1em;">DANGER ZONE - NO UNDO</strong>
          </div>
          <p style="font-size: 1.05em; font-weight: 600; margin-bottom: 1rem;">
            You are about to PERMANENTLY DELETE the original database:
          </p>
          <div style="background: var(--surface-hover); padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem;">
            <code style="color: #ef4444; font-size: 1.1em; font-weight: bold;">${dbName}</code>
          </div>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-weight: 600;">WARNING: THIS ACTION CANNOT BE UNDONE</p>
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
      config: appState.getMigration("localPostgresConfig"),
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
  appState.setData("allMigratedDatabases", []);
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
      const images = await cache.get(
        'images',
        () => invoke('list_images'),
        60000 // 60 second TTL (images change less frequently)
      );
      appState.setData('allImages', images);
      console.log('[loadImages] Loaded from API:', images.length, 'images');
    }

    const imagesSearchFilters = appState.getComponent('imagesSearchFilters');
    const allImages = appState.getData('allImages');
    
    console.log('[loadImages] appState.getComponent("imagesSearchFilters") exists:', !!imagesSearchFilters);
    console.log('[loadImages] allImages length:', allImages?.length || 0);

    // Aplicar filtros si el componente existe
    let images = allImages || [];
    if (appState.getComponent("imagesSearchFilters")) {
      console.log('[loadImages] Applying filters...');
      images = appState.getComponent("imagesSearchFilters").applyFilters(images);
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
      if (imagesSearchFilters && appState.getComponent("imagesSearchFilters").getActiveFiltersCount() > 0) {
        resultsCount.innerHTML = `
          Showing <strong>${images.length}</strong> of <strong>${allImages.length}</strong> images
          <span class="filter-badge">${appState.getComponent("imagesSearchFilters").getActiveFiltersCount()} active filters</span>
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
// Removed: currentVolume = null; // Now using appState

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
  appState.setModal("currentVolume", volumeName);
  document.getElementById('backup-volume-name').textContent = volumeName;
  document.getElementById('backup-path').value = '';
  document.getElementById('backup-volume-modal').classList.add('active');
}

function closeBackupVolumeModal() {
  document.getElementById('backup-volume-modal').classList.remove('active');
  appState.setModal("currentVolume", null);
}

async function executeBackupVolume(e) {
  e.preventDefault();
  const backupPath = document.getElementById('backup-path').value;
  
  closeBackupVolumeModal();
  showLoading('Creating backup...');

  try {
    const result = await invoke('backup_volume', {
      volumeName: appState.getModal("currentVolume"),
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
  appState.setModal("currentVolume", volumeName);
  document.getElementById('restore-volume-name').textContent = volumeName;
  document.getElementById('restore-file').value = '';
  document.getElementById('restore-volume-modal').classList.add('active');
}

function closeRestoreVolumeModal() {
  document.getElementById('restore-volume-modal').classList.remove('active');
  appState.setModal("currentVolume", null);
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
      volumeName: appState.getModal("currentVolume"),
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
// Removed: currentMonitoringContainer = null; // Now using appState
// Removed: monitoringInterval = null; // Now using appState
// Removed: appState.setMonitoring("cpuChart", null); // Now using appState
// Removed: appState.setMonitoring("memoryChart", null); // Now using appState
// Removed: cpuHistory = []; // Now using appState
// Removed: memoryHistory = []; // Now using appState
const MAX_HISTORY_POINTS = 60; // 60 puntos = 30 segundos a 500ms
let currentChartType = 'line'; // 'line', 'bar', 'area'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i];
}

async function openMonitoringModal(containerId, containerName) {
  appState.setModal("currentMonitoringContainer", containerId);
  document.getElementById('monitoring-container-name').textContent = containerName;
  document.getElementById('monitoring-modal').classList.add('active');
  
  // Reset historiales
  appState.setMonitoring("cpuHistory", []);
  appState.setMonitoring("memoryHistory", []);
  
  try {
    // Cargar Chart.js
    const Chart = await loadChart();
    window.Chart = Chart;
    
    // Inicializar gráficas
    initializeCharts();
    
    // Cargar stats iniciales
    await updateMonitoringStats();
    
    // Get monitoring interval from settings
    const settings = getSettings();
    const interval = settings.monitoringInterval || 500;
    
    // Actualizar según intervalo configurado
    appState.setMonitoring("interval", setInterval(updateMonitoringStats, interval));
  } catch (e) {
    console.error('Error loading charts:', e);
    // Continuar sin gráficas
    await updateMonitoringStats();
    
    // Get monitoring interval from settings
    const settings = getSettings();
    const interval = settings.monitoringInterval || 500;
    
    appState.setMonitoring("interval", setInterval(updateMonitoringStats, interval));
    showNotification('Charts unavailable, showing stats only', 'warning');
  }
}

function closeMonitoringModal() {
  document.getElementById('monitoring-modal').classList.remove('active');
  
  if (appState.getMonitoring("interval")) {
    clearInterval(appState.getMonitoring("interval"));
  appState.setMonitoring("interval", null);
  }
  
  // Destruir gráficas
  if (appState.getMonitoring("cpuChart")) {
    appState.getMonitoring("cpuChart").destroy();
    appState.setMonitoring("cpuChart", null);
  }
  if (appState.getMonitoring("memoryChart")) {
    appState.getMonitoring("memoryChart").destroy();
    appState.setMonitoring("memoryChart", null);
  }
  appState.setModal("currentMonitoringContainer", null);
}

function initializeCharts() {
  if (!window.Chart) {
    console.warn('Chart.js not available');
    return;
  }
  
  const Chart = window.Chart;
  
  // Destruir gráficas existentes
  const existingCpuChart = appState.getMonitoring("cpuChart");
  const existingMemoryChart = appState.getMonitoring("memoryChart");
  if (existingCpuChart) existingCpuChart.destroy();
  if (existingMemoryChart) existingMemoryChart.destroy();
  
  const cpuCtx = document.getElementById('cpu-chart').getContext('2d');
  const memoryCtx = document.getElementById('memory-chart').getContext('2d');
  
  // Determinar configuración según el tipo de gráfica
  const currentChartType = appState.getMonitoring("currentChartType") || 'line';
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
  
  const cpuChart = new Chart(cpuCtx, {
    type: chartType,
    data: {
      labels: [],
      datasets: [{
        label: 'CPU %',
        data: appState.getMonitoring("cpuHistory") || [],
        borderColor: '#3b82f6',
        backgroundColor: isArea ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.7)',
        tension: currentChartType === 'line' || isArea ? 0.4 : 0,
        fill: isArea || isBar
      }]
    },
    options: chartOptions
  });
  
  const memoryChart = new Chart(memoryCtx, {
    type: chartType,
    data: {
      labels: [],
      datasets: [{
        label: 'Memory %',
        data: appState.getMonitoring("memoryHistory") || [],
        borderColor: '#8b5cf6',
        backgroundColor: isArea ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.7)',
        tension: currentChartType === 'line' || isArea ? 0.4 : 0,
        fill: isArea || isBar
      }]
    },
    options: chartOptions
  });
  
  // Guardar charts en appState
  appState.setMonitoring("cpuChart", cpuChart);
  appState.setMonitoring("memoryChart", memoryChart);
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
  if (cpuChart && memoryChart && appState.getMonitoring("cpuHistory").length > 0) {
    updateChartsData();
  }
}

// Función helper para actualizar datos de las gráficas
function updateChartsData() {
  // SIN LABELS - Quitar las horas que funcionan mal
  const labels = Array(appState.getMonitoring("cpuHistory").length).fill('');
  
  // Calcular escala dinámica para CPU
  const cpuMax = Math.max(...appState.getMonitoring("cpuHistory"), 1);
  const cpuMin = Math.min(...appState.getMonitoring("cpuHistory"), 0);
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
  const memMax = Math.max(...appState.getMonitoring("memoryHistory"), 1);
  const memMin = Math.min(...appState.getMonitoring("memoryHistory"), 0);
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
  appState.getMonitoring("cpuChart").data.labels = labels;
  appState.getMonitoring("cpuChart").data.datasets[0].data = [...appState.getMonitoring("cpuHistory")];
  appState.getMonitoring("cpuChart").options.scales.y.min = cpuScaleMin;
  appState.getMonitoring("cpuChart").options.scales.y.max = cpuScaleMax;
  appState.getMonitoring("cpuChart").options.scales.y.ticks.stepSize = Math.max(5, Math.ceil((cpuScaleMax - cpuScaleMin) / 4));
  appState.getMonitoring("cpuChart").update('none');
  
  // Actualizar Memory chart con escala dinámica
  appState.getMonitoring("memoryChart").data.labels = labels;
  appState.getMonitoring("memoryChart").data.datasets[0].data = [...appState.getMonitoring("memoryHistory")];
  appState.getMonitoring("memoryChart").options.scales.y.min = memScaleMin;
  appState.getMonitoring("memoryChart").options.scales.y.max = memScaleMax;
  appState.getMonitoring("memoryChart").options.scales.y.ticks.stepSize = Math.max(5, Math.ceil((memScaleMax - memScaleMin) / 4));
  appState.getMonitoring("memoryChart").update('none');
}

async function updateMonitoringStats() {
  const currentMonitoringContainer = appState.getModal("currentMonitoringContainer");
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
    
    // Obtener historiales de appState
    const cpuHistory = appState.getMonitoring("cpuHistory") || [];
    const memoryHistory = appState.getMonitoring("memoryHistory") || [];
    
    // Añadir a historial
    cpuHistory.push(stats.cpu_percentage);
    memoryHistory.push(stats.memory_percentage);
    
    // Limitar historial
    const MAX_HISTORY_POINTS = 60; // 60 puntos = 30 segundos a 500ms
    if (cpuHistory.length > MAX_HISTORY_POINTS) {
      cpuHistory.shift();
      memoryHistory.shift();
    }
    
    // Guardar historiales actualizados
    appState.setMonitoring("cpuHistory", cpuHistory);
    appState.setMonitoring("memoryHistory", memoryHistory);
    
    // Actualizar gráficas si existen
    const cpuChart = appState.getMonitoring("cpuChart");
    const memoryChart = appState.getMonitoring("memoryChart");
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
// Removed: selectedTemplateForDb = null; // Now using appState
// Removed: templateSelect = null; // Now using appState
// Removed: versionSelect = null; // Now using appState

function loadComposeTab() {
  if (!appState.getComponent("composeManager")) {
  const composeManager = new DockerCompose(invoke, showNotification, showLoading, hideLoading);
    appState.setComponent("composeManager", composeManager);
    window.composeManager = composeManager;
  }
  const content = document.getElementById('compose-tab-content');
  if (content) {
    content.innerHTML = appState.getComponent("composeManager").render();
    appState.getComponent("composeManager").loadProjects();
  }
}

function loadTemplatesTab() {
  templatesManager.render('templates-tab-content');
}

function loadTemplateOptions() {
  const templates = getAllTemplates();
  const dbType = appState.getUI("selectedDbType");

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
  if (appState.getComponent("templateSelect")) {
    appState.getComponent("templateSelect").destroy();
  }

  // Create new CustomSelect
  const templateSelect = new CustomSelect('db-template-select', {
    placeholder: 'Default Configuration',
    items: items,
    value: '',
    onChange: (value) => {
      appState.setUI("selectedTemplateForDb", value || null);
      if (appState.getUI("selectedTemplateForDb")) {
        const template = templates[appState.getUI("selectedTemplateForDb")];
        showNotification(`Template "${template.name}" selected. Configuration will be applied on creation.`, 'info');
      }
    }
  });
  
  // Store in appState
  appState.setComponent("templateSelect", templateSelect);
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

// =====================================================
// SETTINGS MANAGEMENT
// =====================================================

const DEFAULT_SETTINGS = {
  // Appearance
  theme: 'dark',
  compactMode: false,
  animations: true,
  
  // Migration
  migrationHost: 'localhost',
  migrationPort: 5432,
  migrationUser: 'postgres',
  migrationPassword: '',
  rememberCredentials: true,
  
  // Monitoring
  monitoringInterval: 500,
  chartType: 'line',
  historyDuration: 60,
  showAlerts: true,
  
  // Database
  autoStart: true,
  showUrl: true,
  defaultDbType: 'none',
  confirmDelete: true,
  
  // Notifications
  notificationDuration: 3000,
  soundNotifications: false,
  showSuccess: true,
  
  // Performance
  autoRefresh: true,
  refreshInterval: 30000,
  lazyLoad: true
};

function loadSettings() {
  const saved = localStorage.getItem('app-settings');
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Error loading settings:', e);
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

function saveSettingsToStorage(settings) {
  try {
    localStorage.setItem('app-settings', JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('Error saving settings:', e);
    return false;
  }
}

function initializeSettings() {
  const settings = loadSettings();
  
  // Apply theme
  if (settings.theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (settings.theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (settings.theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  }
  
  // Initialize CustomSelects
  new CustomSelect('setting-theme', {
    placeholder: 'Select theme',
    value: settings.theme,
    items: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'auto', label: 'Auto (System)' }
    ]
  });
  
  new CustomSelect('setting-monitoring-interval', {
    placeholder: 'Select interval',
    value: settings.monitoringInterval.toString(),
    items: [
      { value: '500', label: 'Fast (0.5s)' },
      { value: '1000', label: 'Normal (1s)' },
      { value: '2000', label: 'Slow (2s)' },
      { value: '5000', label: 'Very Slow (5s)' }
    ]
  });
  
  new CustomSelect('setting-chart-type', {
    placeholder: 'Select chart type',
    value: settings.chartType,
    items: [
      { value: 'line', label: 'Line' },
      { value: 'area', label: 'Area' },
      { value: 'bar', label: 'Bar' }
    ]
  });
  
  new CustomSelect('setting-history-duration', {
    placeholder: 'Select duration',
    value: settings.historyDuration.toString(),
    items: [
      { value: '30', label: '30 seconds' },
      { value: '60', label: '1 minute' },
      { value: '120', label: '2 minutes' },
      { value: '300', label: '5 minutes' }
    ]
  });
  
  new CustomSelect('setting-default-db-type', {
    placeholder: 'Select database',
    value: settings.defaultDbType,
    items: [
      { value: 'none', label: 'None (Ask every time)' },
      { value: 'postgresql', label: 'PostgreSQL' },
      { value: 'mysql', label: 'MySQL' },
      { value: 'mongodb', label: 'MongoDB' },
      { value: 'redis', label: 'Redis' },
      { value: 'mariadb', label: 'MariaDB' }
    ]
  });
  
  new CustomSelect('setting-notification-duration', {
    placeholder: 'Select duration',
    value: settings.notificationDuration.toString(),
    items: [
      { value: '2000', label: '2 seconds' },
      { value: '3000', label: '3 seconds' },
      { value: '5000', label: '5 seconds' },
      { value: '10000', label: '10 seconds' }
    ]
  });
  
  new CustomSelect('setting-refresh-interval', {
    placeholder: 'Select interval',
    value: settings.refreshInterval.toString(),
    items: [
      { value: '10000', label: '10 seconds' },
      { value: '30000', label: '30 seconds' },
      { value: '60000', label: '1 minute' },
      { value: '300000', label: '5 minutes' }
    ]
  });
  
  // Update input fields
  const hostInput = document.getElementById('setting-migration-host');
  if (hostInput) hostInput.value = settings.migrationHost;
  
  const portInput = document.getElementById('setting-migration-port');
  if (portInput) portInput.value = settings.migrationPort;
  
  const userInput = document.getElementById('setting-migration-user');
  if (userInput) userInput.value = settings.migrationUser;
  
  const passwordInput = document.getElementById('setting-migration-password');
  if (passwordInput) passwordInput.value = settings.migrationPassword;
  
  // Update checkboxes
  const compactModeCheckbox = document.getElementById('setting-compact-mode');
  if (compactModeCheckbox) compactModeCheckbox.checked = settings.compactMode;
  
  const animationsCheckbox = document.getElementById('setting-animations');
  if (animationsCheckbox) animationsCheckbox.checked = settings.animations;
  
  const rememberCredentialsCheckbox = document.getElementById('setting-remember-credentials');
  if (rememberCredentialsCheckbox) rememberCredentialsCheckbox.checked = settings.rememberCredentials;
  
  const showAlertsCheckbox = document.getElementById('setting-show-alerts');
  if (showAlertsCheckbox) showAlertsCheckbox.checked = settings.showAlerts;
  
  const autoStartCheckbox = document.getElementById('setting-auto-start');
  if (autoStartCheckbox) autoStartCheckbox.checked = settings.autoStart;
  
  const showUrlCheckbox = document.getElementById('setting-show-url');
  if (showUrlCheckbox) showUrlCheckbox.checked = settings.showUrl;
  
  const confirmDeleteCheckbox = document.getElementById('setting-confirm-delete');
  if (confirmDeleteCheckbox) confirmDeleteCheckbox.checked = settings.confirmDelete;
  
  const soundNotificationsCheckbox = document.getElementById('setting-sound-notifications');
  if (soundNotificationsCheckbox) soundNotificationsCheckbox.checked = settings.soundNotifications;
  
  const showSuccessCheckbox = document.getElementById('setting-show-success');
  if (showSuccessCheckbox) showSuccessCheckbox.checked = settings.showSuccess;
  
  const autoRefreshCheckbox = document.getElementById('setting-auto-refresh');
  if (autoRefreshCheckbox) autoRefreshCheckbox.checked = settings.autoRefresh;
  
  const lazyLoadCheckbox = document.getElementById('setting-lazy-load');
  if (lazyLoadCheckbox) lazyLoadCheckbox.checked = settings.lazyLoad;
}

function saveSettings() {
  // Get CustomSelect values
  const themeContainer = document.getElementById('setting-theme');
  const theme = themeContainer?.querySelector('.custom-select-value')?.textContent?.toLowerCase().includes('light') ? 'light' 
    : themeContainer?.querySelector('.custom-select-value')?.textContent?.toLowerCase().includes('dark') ? 'dark' 
    : 'auto';
  
  const monitoringIntervalContainer = document.getElementById('setting-monitoring-interval');
  const monitoringIntervalText = monitoringIntervalContainer?.querySelector('.custom-select-value')?.textContent || 'Fast (0.5s)';
  const monitoringInterval = parseInt(monitoringIntervalText.match(/\d+/)?.[0]) === 0 ? 500 
    : parseInt(monitoringIntervalText.match(/\d+/)?.[0]) * 1000 || 500;
  
  const chartTypeContainer = document.getElementById('setting-chart-type');
  const chartType = chartTypeContainer?.querySelector('.custom-select-value')?.textContent?.toLowerCase() || 'line';
  
  const historyDurationContainer = document.getElementById('setting-history-duration');
  const historyDurationText = historyDurationContainer?.querySelector('.custom-select-value')?.textContent || '60';
  const historyDuration = parseInt(historyDurationText.match(/\d+/)?.[0]) || 60;
  
  const defaultDbTypeContainer = document.getElementById('setting-default-db-type');
  const defaultDbTypeText = defaultDbTypeContainer?.querySelector('.custom-select-value')?.textContent?.toLowerCase() || 'none';
  const defaultDbType = defaultDbTypeText.includes('postgresql') ? 'postgresql'
    : defaultDbTypeText.includes('mysql') ? 'mysql'
    : defaultDbTypeText.includes('mongodb') ? 'mongodb'
    : defaultDbTypeText.includes('redis') ? 'redis'
    : defaultDbTypeText.includes('mariadb') ? 'mariadb'
    : 'none';
  
  const notificationDurationContainer = document.getElementById('setting-notification-duration');
  const notificationDurationText = notificationDurationContainer?.querySelector('.custom-select-value')?.textContent || '3';
  const notificationDuration = parseInt(notificationDurationText.match(/\d+/)?.[0]) * 1000 || 3000;
  
  const refreshIntervalContainer = document.getElementById('setting-refresh-interval');
  const refreshIntervalText = refreshIntervalContainer?.querySelector('.custom-select-value')?.textContent || '30';
  const refreshInterval = parseInt(refreshIntervalText.match(/\d+/)?.[0]) * 1000 || 30000;
  
  // Get input values
  const hostInput = document.getElementById('setting-migration-host');
  const portInput = document.getElementById('setting-migration-port');
  const userInput = document.getElementById('setting-migration-user');
  const passwordInput = document.getElementById('setting-migration-password');
  
  // Get checkbox values
  const compactModeCheckbox = document.getElementById('setting-compact-mode');
  const animationsCheckbox = document.getElementById('setting-animations');
  const rememberCredentialsCheckbox = document.getElementById('setting-remember-credentials');
  const showAlertsCheckbox = document.getElementById('setting-show-alerts');
  const autoStartCheckbox = document.getElementById('setting-auto-start');
  const showUrlCheckbox = document.getElementById('setting-show-url');
  const confirmDeleteCheckbox = document.getElementById('setting-confirm-delete');
  const soundNotificationsCheckbox = document.getElementById('setting-sound-notifications');
  const showSuccessCheckbox = document.getElementById('setting-show-success');
  const autoRefreshCheckbox = document.getElementById('setting-auto-refresh');
  const lazyLoadCheckbox = document.getElementById('setting-lazy-load');
  
  const settings = {
    theme,
    compactMode: compactModeCheckbox?.checked || false,
    animations: animationsCheckbox?.checked !== false,
    migrationHost: hostInput?.value || 'localhost',
    migrationPort: parseInt(portInput?.value) || 5432,
    migrationUser: userInput?.value || 'postgres',
    migrationPassword: passwordInput?.value || '',
    rememberCredentials: rememberCredentialsCheckbox?.checked !== false,
    monitoringInterval,
    chartType,
    historyDuration,
    showAlerts: showAlertsCheckbox?.checked !== false,
    autoStart: autoStartCheckbox?.checked !== false,
    showUrl: showUrlCheckbox?.checked !== false,
    defaultDbType,
    confirmDelete: confirmDeleteCheckbox?.checked !== false,
    notificationDuration,
    soundNotifications: soundNotificationsCheckbox?.checked || false,
    showSuccess: showSuccessCheckbox?.checked !== false,
    autoRefresh: autoRefreshCheckbox?.checked !== false,
    refreshInterval,
    lazyLoad: lazyLoadCheckbox?.checked !== false
  };
  
  if (saveSettingsToStorage(settings)) {
    // Refresh global settings cache
    globalSettings = settings;
    
    // Apply theme immediately
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
      localStorage.setItem('theme', 'auto');
    }
    
    // Apply all settings
    applySettings(settings);
    
    showNotification('Settings saved successfully', 'success');
  } else {
    showNotification('Error saving settings', 'error');
  }
}

function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }
  
  if (saveSettingsToStorage(DEFAULT_SETTINGS)) {
    initializeSettings();
    showNotification('Settings reset to defaults', 'success');
  } else {
    showNotification('Error resetting settings', 'error');
  }
}

function applyMigrationDefaults() {
  const settings = loadSettings();
  
  const hostInput = document.getElementById('local-host');
  const portInput = document.getElementById('local-port');
  const userInput = document.getElementById('local-user');
  const passwordInput = document.getElementById('local-password');
  
  if (hostInput) hostInput.value = settings.migrationHost;
  if (portInput) portInput.value = settings.migrationPort;
  if (userInput) userInput.value = settings.migrationUser;
  if (passwordInput) passwordInput.value = settings.migrationPassword;
}

// Expose settings functions globally
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;
window.loadSettings = loadSettings;
window.applyMigrationDefaults = applyMigrationDefaults;

// ===== FAVORITES MANAGEMENT =====

/**
 * Toggle favorite status of a container
 * @param {string} containerId - Container ID to toggle
 */
function toggleFavorite(containerId) {
  const isFavorite = favoritesManager.toggleFavorite(containerId);
  
  // Update the card UI immediately
  const card = document.querySelector(`.db-card[data-container-id="${containerId}"]`);
  if (card) {
    const favoriteBtn = card.querySelector('.favorite-btn');
    if (favoriteBtn) {
      favoriteBtn.classList.toggle('active', isFavorite);
      favoriteBtn.innerHTML = getIcon(isFavorite ? 'starFilled' : 'star');
      favoriteBtn.setAttribute('data-tooltip', isFavorite ? 'Remove from favorites' : 'Add to favorites');
    }
    card.classList.toggle('is-favorite', isFavorite);
  }
  
  // Show notification
  showNotification(
    isFavorite ? 'Added to favorites' : 'Removed from favorites',
    'success'
  );
  
  // Reload to re-sort (favorites first)
  loadContainers(true);
}

/**
 * Filter to show only favorite databases
 */
function showOnlyFavorites() {
  const searchFilters = appState.getComponent('searchFilters');
  if (searchFilters) {
    // Toggle favorites filter
    const currentlyShowingFavorites = appState.getUI('showingOnlyFavorites') || false;
    appState.setUI('showingOnlyFavorites', !currentlyShowingFavorites);
    
    if (!currentlyShowingFavorites) {
      // Show only favorites
      const allContainers = appState.getData('allContainers');
      const favorites = favoritesManager.filterFavorites(allContainers);
      
      if (favorites.length === 0) {
        showNotification('No favorite databases found', 'info');
        return;
      }
      
      showNotification(`Showing ${favorites.length} favorite databases`, 'info');
    } else {
      // Show all
      showNotification('Showing all databases', 'info');
    }
    
    loadContainers(true);
  }
}

// Expose favorites functions globally
window.toggleFavorite = toggleFavorite;
window.showOnlyFavorites = showOnlyFavorites;
window.favoritesManager = favoritesManager;

