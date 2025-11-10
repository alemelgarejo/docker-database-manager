/**
 * Container Manager
 * Manages database containers state and UI
 */

import { DatabaseService } from '../services/DatabaseService.js';
import { hideLoading, showLoading } from '../utils/loading.js';
import { showNotification } from '../utils/notifications.js';

export class ContainerManager {
  constructor() {
    this.containers = [];
    this.listeners = [];
  }

  /**
   * Subscribe to container changes
   */
  onChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notify all listeners
   */
  notifyChange() {
    this.listeners.forEach((callback) => {
      callback(this.containers);
    });
  }

  /**
   * Load all containers
   */
  async loadContainers() {
    try {
      this.containers = await DatabaseService.listContainers();
      this.notifyChange();
      return this.containers;
    } catch (error) {
      console.error('Error loading containers:', error);
      showNotification('Error loading containers: ' + error, 'error');
      throw error;
    }
  }

  /**
   * Create a new database container
   */
  async createDatabase(config) {
    showLoading('creatingDatabase');

    try {
      const result = await DatabaseService.createDatabase(config);
      showNotification('Database created successfully', 'success');
      await this.loadContainers();
      return result;
    } catch (error) {
      console.error('Error creating database:', error);
      showNotification('Error creating database: ' + error, 'error');
      throw error;
    } finally {
      hideLoading();
    }
  }

  /**
   * Start a container
   */
  async startContainer(containerId) {
    showLoading();

    try {
      await DatabaseService.startContainer(containerId);
      showNotification('Container started', 'success');
      await this.loadContainers();
    } catch (error) {
      console.error('Error starting container:', error);
      showNotification('Error: ' + error, 'error');
      throw error;
    } finally {
      hideLoading();
    }
  }

  /**
   * Stop a container
   */
  async stopContainer(containerId) {
    showLoading();

    try {
      await DatabaseService.stopContainer(containerId);
      showNotification('Container stopped', 'success');
      await this.loadContainers();
    } catch (error) {
      console.error('Error stopping container:', error);
      showNotification('Error: ' + error, 'error');
      throw error;
    } finally {
      hideLoading();
    }
  }

  /**
   * Restart a container
   */
  async restartContainer(containerId) {
    showLoading();

    try {
      await DatabaseService.restartContainer(containerId);
      showNotification('Container restarted', 'success');
      await this.loadContainers();
    } catch (error) {
      console.error('Error restarting container:', error);
      showNotification('Error: ' + error, 'error');
      throw error;
    } finally {
      hideLoading();
    }
  }

  /**
   * Remove a container
   */
  async removeContainer(containerId, removeVolumes = false) {
    showLoading();

    try {
      await DatabaseService.removeContainer(containerId, removeVolumes);
      showNotification('Container removed', 'success');
      await this.loadContainers();
    } catch (error) {
      console.error('Error removing container:', error);
      showNotification('Error: ' + error, 'error');
      throw error;
    } finally {
      hideLoading();
    }
  }

  /**
   * Get container by ID
   */
  getContainer(containerId) {
    return this.containers.find((c) => c.id === containerId);
  }

  /**
   * Get containers count
   */
  getCount() {
    return this.containers.length;
  }

  /**
   * Get running containers count
   */
  getRunningCount() {
    return this.containers.filter((c) => c.state === 'running').length;
  }

  /**
   * Get stopped containers count
   */
  getStoppedCount() {
    return this.containers.filter(
      (c) => c.state === 'exited' || c.state === 'stopped',
    ).length;
  }
}

// Global instance
export const containerManager = new ContainerManager();
