/**
 * Intelligent Polling Manager
 * Handles periodic updates with smart optimizations
 */

import { createLogger } from './logger.js';

const logger = createLogger('Polling');

export class PollingManager {
  constructor() {
    this.intervals = new Map();
    this.isVisible = !document.hidden;
    this.activeTab = null;
    
    // Listen to visibility changes
    this.setupVisibilityListener();
    
    logger.info('Polling Manager initialized');
  }

  /**
   * Setup page visibility listener
   */
  setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      
      if (this.isVisible) {
        logger.info('Page visible - resuming all intervals');
        this.resumeAll();
      } else {
        logger.info('Page hidden - pausing all intervals');
        this.pauseAll();
      }
    });
  }

  /**
   * Register a polling task
   * @param {string} key - Unique key for the task
   * @param {Function} callback - Async function to execute
   * @param {number} interval - Interval in milliseconds
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.immediate] - Execute immediately on registration
   * @param {boolean} [options.onlyWhenVisible] - Only run when page is visible
   * @param {string} [options.tab] - Only run when specific tab is active
   */
  register(key, callback, interval, options = {}) {
    const {
      immediate = false,
      onlyWhenVisible = true,
      tab = null,
    } = options;

    // Clear existing interval if any
    this.unregister(key);

    const task = {
      key,
      callback,
      interval,
      intervalId: null,
      paused: false,
      onlyWhenVisible,
      tab,
      lastRun: null,
      runCount: 0,
      errors: 0,
    };

    // Execute immediately if requested
    if (immediate) {
      this.executeTask(task);
    }

    // Start the interval
    this.startInterval(task);
    this.intervals.set(key, task);

    logger.debug(`Registered: ${key}`, { 
      interval: `${interval}ms`, 
      tab: tab || 'all',
      immediate
    });
  }

  /**
   * Start interval for a task
   */
  startInterval(task) {
    if (task.intervalId) {
      clearInterval(task.intervalId);
    }

    task.intervalId = setInterval(() => {
      this.executeTask(task);
    }, task.interval);
  }

  /**
   * Execute a polling task
   */
  async executeTask(task) {
    // Check if should run
    if (task.paused) {
      logger.debug(`Skipped (paused): ${task.key}`);
      return;
    }

    if (task.onlyWhenVisible && !this.isVisible) {
      logger.debug(`Skipped (not visible): ${task.key}`);
      return;
    }

    if (task.tab && task.tab !== this.activeTab) {
      logger.debug(`Skipped (wrong tab): ${task.key}`, { 
        needed: task.tab, 
        active: this.activeTab 
      });
      return;
    }

    // Execute task
    const endTimer = logger.time(`Execute ${task.key}`);
    try {
      logger.debug(`Running: ${task.key}`);
      await task.callback();
      task.lastRun = Date.now();
      task.runCount++;
      endTimer();
    } catch (error) {
      task.errors++;
      endTimer();
      logger.error(`Error in ${task.key}`, { error: error.message });
      
      // If too many errors, pause the task
      if (task.errors >= 5) {
        logger.error(`Too many errors, pausing: ${task.key}`, { errors: task.errors });
        this.pause(task.key);
      }
    }
  }

  /**
   * Unregister a polling task
   * @param {string} key - Task key
   */
  unregister(key) {
    const task = this.intervals.get(key);
    if (task) {
      if (task.intervalId) {
        clearInterval(task.intervalId);
      }
      this.intervals.delete(key);
      logger.debug(`Unregistered: ${key}`);
      return true;
    }
    return false;
  }

  /**
   * Pause a specific task
   * @param {string} key - Task key
   */
  pause(key) {
    const task = this.intervals.get(key);
    if (task) {
      task.paused = true;
      logger.debug(`Paused: ${key}`);
      return true;
    }
    return false;
  }

  /**
   * Resume a specific task
   * @param {string} key - Task key
   */
  resume(key) {
    const task = this.intervals.get(key);
    if (task) {
      task.paused = false;
      task.errors = 0; // Reset error count
      logger.debug(`Resumed: ${key}`);
      return true;
    }
    return false;
  }

  /**
   * Pause all tasks
   */
  pauseAll() {
    for (const task of this.intervals.values()) {
      task.paused = true;
    }
    logger.info('All tasks paused');
  }

  /**
   * Resume all tasks
   */
  resumeAll() {
    for (const task of this.intervals.values()) {
      task.paused = false;
      task.errors = 0;
    }
    logger.info('All tasks resumed');
  }

  /**
   * Set active tab (for tab-specific polling)
   * @param {string} tabName - Active tab name
   */
  setActiveTab(tabName) {
    const oldTab = this.activeTab;
    this.activeTab = tabName;
    logger.info('Active tab changed', { from: oldTab, to: tabName });
    
    // Trigger tasks for the new active tab
    for (const task of this.intervals.values()) {
      if (task.tab === tabName) {
        this.executeTask(task);
      }
    }
  }

  /**
   * Get stats for all polling tasks
   * @returns {Object} Statistics
   */
  getStats() {
    const stats = {
      total: this.intervals.size,
      active: 0,
      paused: 0,
      tasks: [],
    };

    for (const [key, task] of this.intervals.entries()) {
      if (task.paused) {
        stats.paused++;
      } else {
        stats.active++;
      }

      stats.tasks.push({
        key,
        interval: task.interval,
        tab: task.tab,
        paused: task.paused,
        runCount: task.runCount,
        errors: task.errors,
        lastRun: task.lastRun ? new Date(task.lastRun).toISOString() : null,
        timeSinceLastRun: task.lastRun ? Date.now() - task.lastRun : null,
      });
    }

    return stats;
  }

  /**
   * Clear all polling tasks
   */
  clear() {
    for (const task of this.intervals.values()) {
      if (task.intervalId) {
        clearInterval(task.intervalId);
      }
    }
    const count = this.intervals.size;
    this.intervals.clear();
    logger.info('All tasks cleared', { tasksCleared: count });
  }
}

// Global polling instance
export const polling = new PollingManager();
