/**
 * Database Service
 * Handles all database-related operations via Tauri backend
 */

import { invoke } from '../utils/tauri.js';

export class DatabaseService {
  /**
   * Create a new database container
   */
  static async createDatabase(config) {
    return invoke('create_database', { config });
  }

  /**
   * List all database containers
   */
  static async listContainers() {
    return invoke('list_containers');
  }

  /**
   * Start a container
   */
  static async startContainer(containerId) {
    return invoke('start_container', { containerId });
  }

  /**
   * Stop a container
   */
  static async stopContainer(containerId) {
    return invoke('stop_container', { containerId });
  }

  /**
   * Restart a container
   */
  static async restartContainer(containerId) {
    return invoke('restart_container', { containerId });
  }

  /**
   * Remove a container
   */
  static async removeContainer(containerId, removeVolumes = false) {
    return invoke('remove_container', { containerId, removeVolumes });
  }

  /**
   * Update container port
   * @param {string} containerId - Container ID
   * @param {number} newPort - New host port number
   * @returns {Promise<string>} Success message
   */
  static async updateContainerPort(containerId, newPort) {
    return invoke('update_container_port', { containerId, newPort });
  }

  /**
   * Get container logs
   */
  static async getContainerLogs(containerId) {
    return invoke('get_container_logs', { containerId });
  }

  /**
   * Get container stats (CPU, memory, etc)
   */
  static async getContainerStats(containerId) {
    return invoke('get_container_stats', { containerId });
  }

  /**
   * Execute SQL query in a container
   */
  static async executeSql(containerId, database, username, sql) {
    return invoke('execute_sql', {
      containerId,
      database,
      username,
      sql,
    });
  }

  /**
   * Get available database types
   */
  static async getDatabaseTypes() {
    return invoke('get_database_types');
  }

  /**
   * Check Docker connection
   */
  static async checkDockerConnection() {
    return invoke('check_docker_connection');
  }
}
