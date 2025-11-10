/**
 * Tab Manager
 * Manages tab navigation
 */

export class TabManager {
  constructor() {
    this.currentTab = 'dashboard';
    this.listeners = [];
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
    this.listeners.forEach(callback => callback(this.currentTab));
  }

  /**
   * Switch to a tab
   */
  switchTab(tabName) {
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

    this.currentTab = tabName;
    this.notifyChange();
  }

  /**
   * Get current tab
   */
  getCurrentTab() {
    return this.currentTab;
  }
}

// Global instance
export const tabManager = new TabManager();
