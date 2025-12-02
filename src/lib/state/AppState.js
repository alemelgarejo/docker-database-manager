/**
 * Centralized Application State Manager
 * 
 * Features:
 * - Type-safe state updates
 * - State change listeners/observers  
 * - Automatic persistence (localStorage)
 * - State history (undo/redo)
 * - Dev tools integration
 */



import { createLogger } from '../utils/logger.js';

const logger = createLogger('AppState');

class AppState {
  constructor() {
    this.tauri = { invoke: null, check: null, ask: null, relaunch: null };
    this.components = {
      searchFilters: null,
      imagesSearchFilters: null,
      migrationSearchFilters: null,
      composeManager: null,
      containersVirtualScroll: null,
      templateSelect: null,
      versionSelect: null,
    };
    this.data = {
      allContainers: [],
      allImages: [],
      allLocalDatabases: [],
      allMigratedDatabases: [],
      databaseTypes: [],
    };
    this.ui = {
      activeTab: 'dashboard',
      selectedDbType: null,
      selectedTemplateForDb: null,
      currentChartType: 'line',
    };
    this.modals = {
      currentRenameContainerId: null,
      currentSQL: null,
      currentVolume: null,
      currentMonitoringContainer: null,
    };
    this.monitoring = {
      interval: null,
      cpuChart: null,
      memoryChart: null,
      cpuHistory: [],
      memoryHistory: [],
      maxHistoryPoints: 30,
    };
    this.migration = { localPostgresConfig: null };
    this.listeners = new Map();
    this.history = { past: [], present: null, future: [], maxHistory: 50, enabled: false };
    this.persistence = { enabled: false, prefix: 'docker-db-manager', keys: [] };
    
    logger.info('AppState initialized');
    this.loadPersistedState();
  }

  enablePersistence(keys = []) {
    this.persistence.enabled = true;
    if (keys.length > 0) this.persistence.keys = keys;
    logger.info('Persistence enabled', { keys: this.persistence.keys });
  }

  disablePersistence() {
    this.persistence.enabled = false;
    logger.info('Persistence disabled');
  }

  loadPersistedState() {
    if (!this.persistence.enabled || typeof localStorage === 'undefined') return;

    try {
      for (const key of this.persistence.keys) {
        const storageKey = `${this.persistence.prefix}.${key}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const value = JSON.parse(stored);
          this.setStateByPath(key, value, false);
          logger.debug(`Loaded persisted state: ${key}`);
        }
      }
    } catch (error) {
      logger.error('Error loading persisted state', { error: error.message });
    }
  }

  persistState(key, value) {
    if (!this.persistence.enabled || typeof localStorage === 'undefined') return;

    try {
      const storageKey = `${this.persistence.prefix}.${key}`;
      localStorage.setItem(storageKey, JSON.stringify(value));
      logger.debug(`Persisted state: ${key}`);
    } catch (error) {
      logger.error('Error persisting state', { error: error.message });
    }
  }

  setStateByPath(path, value, persist = true) {
    const parts = path.split('.');
    const category = parts[0];
    const key = parts[1];

    switch (category) {
      case 'ui': if (key) this.setUI(key, value); break;
      case 'data': if (key) this.setData(key, value); break;
      case 'modal': if (key) this.setModal(key, value); break;
      default: logger.warn(`Unknown state path: ${path}`);
    }

    if (persist && this.persistence.enabled && this.persistence.keys.includes(path)) {
      this.persistState(path, value);
    }
  }

  enableHistory() {
    this.history.enabled = true;
    logger.info('State history enabled');
  }

  disableHistory() {
    this.history.enabled = false;
    logger.info('State history disabled');
  }

  saveToHistory() {
    if (!this.history.enabled) return;

    const snapshot = this.getSnapshot();
    this.history.past.push(this.history.present);
    this.history.present = snapshot;
    this.history.future = [];

    if (this.history.past.length > this.history.maxHistory) {
      this.history.past.shift();
    }

    logger.debug('State saved to history', { 
      pastLength: this.history.past.length,
      futureLength: this.history.future.length
    });
  }

  undo() {
    if (!this.history.enabled || this.history.past.length === 0) {
      logger.warn('Cannot undo: no history available');
      return false;
    }

    this.history.future.unshift(this.history.present);
    const previousState = this.history.past.pop();
    this.history.present = previousState;
    this.restoreSnapshot(previousState);
    
    logger.info('State undone', { pastLength: this.history.past.length });
    this.notify('history.undo', previousState);
    return true;
  }

  redo() {
    if (!this.history.enabled || this.history.future.length === 0) {
      logger.warn('Cannot redo: no future history available');
      return false;
    }

    this.history.past.push(this.history.present);
    const nextState = this.history.future.shift();
    this.history.present = nextState;
    this.restoreSnapshot(nextState);
    
    logger.info('State redone', { futureLength: this.history.future.length });
    this.notify('history.redo', nextState);
    return true;
  }

  restoreSnapshot(snapshot) {
    if (snapshot.data) {
      Object.keys(snapshot.data).forEach(key => {
        this.data[key] = snapshot.data[key];
      });
    }
    if (snapshot.ui) {
      Object.keys(snapshot.ui).forEach(key => {
        this.ui[key] = snapshot.ui[key];
      });
    }
    if (snapshot.modals) {
      Object.keys(snapshot.modals).forEach(key => {
        this.modals[key] = snapshot.modals[key];
      });
    }
    this.notify('state.restored', snapshot);
  }

  getHistoryInfo() {
    return {
      enabled: this.history.enabled,
      canUndo: this.history.past.length > 0,
      canRedo: this.history.future.length > 0,
      pastLength: this.history.past.length,
      futureLength: this.history.future.length,
      maxHistory: this.history.maxHistory,
    };
  }

  setTauriAPI(api) {
    this.tauri = { ...this.tauri, ...api };
    logger.debug('Tauri API set', { hasInvoke: !!api.invoke });
    this.notify('tauri', this.tauri);
  }

  getTauriAPI() {
    return this.tauri;
  }

  setComponent(name, component) {
    if (this.components.hasOwnProperty(name)) {
      this.components[name] = component;
      logger.debug(`Component set: ${name}`);
      this.notify(`component.${name}`, component);
    } else {
      logger.warn(`Unknown component: ${name}`);
    }
  }

  getComponent(name) {
    return this.components[name];
  }

  setData(key, value, saveHistory = false) {
    if (this.data.hasOwnProperty(key)) {
      if (saveHistory) this.saveToHistory();
      
      this.data[key] = value;
      logger.debug(`Data set: ${key}`, { itemCount: Array.isArray(value) ? value.length : null });
      
      const path = `data.${key}`;
      if (this.persistence.enabled && this.persistence.keys.includes(path)) {
        this.persistState(path, value);
      }
      
      this.notify(`data.${key}`, value);
    } else {
      logger.warn(`Unknown data key: ${key}`);
    }
  }

  getData(key) {
    return this.data[key];
  }

  setUI(key, value, saveHistory = false) {
    if (this.ui.hasOwnProperty(key)) {
      if (saveHistory) this.saveToHistory();
      
      const oldValue = this.ui[key];
      this.ui[key] = value;
      logger.debug(`UI state changed: ${key}`, { from: oldValue, to: value });
      
      const path = `ui.${key}`;
      if (this.persistence.enabled && this.persistence.keys.includes(path)) {
        this.persistState(path, value);
      }
      
      this.notify(`ui.${key}`, value);
    } else {
      logger.warn(`Unknown UI state key: ${key}`);
    }
  }

  getUI(key) {
    return this.ui[key];
  }

  setModal(key, value) {
    if (this.modals.hasOwnProperty(key)) {
      this.modals[key] = value;
      logger.debug(`Modal state set: ${key}`);
      this.notify(`modal.${key}`, value);
    } else {
      logger.warn(`Unknown modal key: ${key}`);
    }
  }

  getModal(key) {
    return this.modals[key];
  }

  setMonitoring(key, value) {
    if (this.monitoring.hasOwnProperty(key)) {
      this.monitoring[key] = value;
      this.notify(`monitoring.${key}`, value);
    } else {
      logger.warn(`Unknown monitoring key: ${key}`);
    }
  }

  getMonitoring(key) {
    return this.monitoring[key];
  }

  setMigration(key, value) {
    if (this.migration.hasOwnProperty(key)) {
      this.migration[key] = value;
      logger.debug(`Migration state set: ${key}`);
      this.notify(`migration.${key}`, value);
    } else {
      logger.warn(`Unknown migration key: ${key}`);
    }
  }

  getMigration(key) {
    return this.migration[key];
  }

  addCPUHistory(value) {
    this.monitoring.cpuHistory.push(value);
    if (this.monitoring.cpuHistory.length > this.monitoring.maxHistoryPoints) {
      this.monitoring.cpuHistory.shift();
    }
    this.notify('monitoring.cpuHistory', this.monitoring.cpuHistory);
  }

  addMemoryHistory(value) {
    this.monitoring.memoryHistory.push(value);
    if (this.monitoring.memoryHistory.length > this.monitoring.maxHistoryPoints) {
      this.monitoring.memoryHistory.shift();
    }
    this.notify('monitoring.memoryHistory', this.monitoring.memoryHistory);
  }

  clearMonitoringHistory() {
    this.monitoring.cpuHistory = [];
    this.monitoring.memoryHistory = [];
    logger.debug('Monitoring history cleared');
    this.notify('monitoring.history.cleared', true);
  }

  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);

    logger.debug(`Subscribed to: ${path}`, { totalListeners: this.listeners.get(path).size });

    return () => {
      const listeners = this.listeners.get(path);
      if (listeners) {
        listeners.delete(callback);
        logger.debug(`Unsubscribed from: ${path}`);
      }
    };
  }

  notify(path, value) {
    const listeners = this.listeners.get(path);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          logger.error(`Error in listener for ${path}`, { error: error.message });
        }
      });
    }
  }

  getSnapshot() {
    return {
      tauri: { ...this.tauri, invoke: null },
      components: Object.keys(this.components).reduce((acc, key) => {
        acc[key] = this.components[key] !== null ? 'initialized' : null;
        return acc;
      }, {}),
      data: { ...this.data },
      ui: { ...this.ui },
      modals: { ...this.modals },
      monitoring: {
        ...this.monitoring,
        cpuChart: this.monitoring.cpuChart !== null ? 'initialized' : null,
        memoryChart: this.monitoring.memoryChart !== null ? 'initialized' : null,
      },
      migration: { ...this.migration },
    };
  }

  reset() {
    logger.info('Resetting state');
    
    const tauriAPI = this.tauri;
    
    this.components = {
      searchFilters: null,
      imagesSearchFilters: null,
      migrationSearchFilters: null,
      composeManager: null,
      containersVirtualScroll: null,
      templateSelect: null,
      versionSelect: null,
    };
    this.data = {
      allContainers: [],
      allImages: [],
      allLocalDatabases: [],
      allMigratedDatabases: [],
      databaseTypes: [],
    };
    this.ui = {
      activeTab: 'dashboard',
      selectedDbType: null,
      selectedTemplateForDb: null,
      currentChartType: 'line',
    };
    this.modals = {
      currentRenameContainerId: null,
      currentSQL: null,
      currentVolume: null,
      currentMonitoringContainer: null,
    };
    this.monitoring = {
      interval: null,
      cpuChart: null,
      memoryChart: null,
      cpuHistory: [],
      memoryHistory: [],
      maxHistoryPoints: 30,
    };
    this.migration = { localPostgresConfig: null };
    this.history.past = [];
    this.history.present = null;
    this.history.future = [];
    
    this.tauri = tauriAPI;
    this.notify('reset', true);
  }

  getStats() {
    return {
      containers: this.data.allContainers.length,
      images: this.data.allImages.length,
      localDatabases: this.data.allLocalDatabases.length,
      migratedDatabases: this.data.allMigratedDatabases.length,
      cpuHistoryPoints: this.monitoring.cpuHistory.length,
      memoryHistoryPoints: this.monitoring.memoryHistory.length,
      activeListeners: Array.from(this.listeners.entries()).map(([path, listeners]) => ({
        path,
        count: listeners.size,
      })),
      history: this.getHistoryInfo(),
      persistence: {
        enabled: this.persistence.enabled,
        keys: this.persistence.keys,
      },
    };
  }
}

export const appState = new AppState();
export { AppState };
