/**
 * Tab Manager with Lazy Loading
 * Manages tab navigation and lazy loads content on demand
 */

export class TabManager {
  constructor() {
    this.currentTab = 'dashboard';
    this.listeners = [];
    this.tabs = new Map(); // Store tab loaders
    this.loadedTabs = new Set(); // Track which tabs have been loaded
  }

  /**
   * Register a tab with its loader function
   * @param {string} tabName - Name of the tab
   * @param {Function} loader - Async function to load tab content
   * @param {boolean} loadImmediately - Whether to load immediately (default: false)
   */
  registerTab(tabName, loader, loadImmediately = false) {
    this.tabs.set(tabName, loader);
    
    if (loadImmediately) {
      this.loadedTabs.add(tabName);
    }
  }

  /**
   * Check if a tab has been loaded
   * @param {string} tabName - Name of the tab
   * @returns {boolean}
   */
  isLoaded(tabName) {
    return this.loadedTabs.has(tabName);
  }

  /**
   * Get count of loaded tabs
   * @returns {number}
   */
  getLoadedCount() {
    return this.loadedTabs.size;
  }

  /**
   * Subscribe to tab changes
   */
  onChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notify listeners of tab change
   */
  notifyChange() {
    this.listeners.forEach((callback) => {
      callback(this.currentTab);
    });
  }

  /**
   * Switch to a tab and load content if needed
   * @param {string} tabName - Name of the tab to switch to
   */
  async switchTab(tabName) {
    this.currentTab = tabName;
    
    // If tab is not loaded yet, load it
    if (!this.loadedTabs.has(tabName)) {
      const loader = this.tabs.get(tabName);
      
      if (loader) {
        console.log(`[TabManager] Loading tab: ${tabName}`);
        try {
          await loader();
          this.loadedTabs.add(tabName);
          console.log(`[TabManager] Tab loaded: ${tabName}`);
        } catch (error) {
          console.error(`[TabManager] Error loading tab ${tabName}:`, error);
          throw error;
        }
      } else {
        console.warn(`[TabManager] No loader found for tab: ${tabName}`);
      }
    } else {
      console.log(`[TabManager] Tab already loaded: ${tabName}`);
    }
    
    this.notifyChange();
  }

  /**
   * Force reload a tab
   * @param {string} tabName - Name of the tab to reload
   */
  async reloadTab(tabName) {
    const loader = this.tabs.get(tabName);
    
    if (loader) {
      console.log(`[TabManager] Reloading tab: ${tabName}`);
      try {
        await loader();
        this.loadedTabs.add(tabName);
        console.log(`[TabManager] Tab reloaded: ${tabName}`);
      } catch (error) {
        console.error(`[TabManager] Error reloading tab ${tabName}:`, error);
        throw error;
      }
    } else {
      console.warn(`[TabManager] No loader found for tab: ${tabName}`);
    }
  }

  /**
   * Get current tab
   */
  getCurrentTab() {
    return this.currentTab;
  }

  /**
   * Clear loaded state for a tab (force reload next time)
   * @param {string} tabName - Name of the tab
   */
  invalidate(tabName) {
    this.loadedTabs.delete(tabName);
    console.log(`[TabManager] Tab invalidated: ${tabName}`);
  }

  /**
   * Clear all loaded states
   */
  invalidateAll() {
    this.loadedTabs.clear();
    console.log(`[TabManager] All tabs invalidated`);
  }
}

// Global instance
export const tabManager = new TabManager();
