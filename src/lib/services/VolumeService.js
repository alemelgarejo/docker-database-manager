/**
 * Volume Service
 * Handles Docker volume operations
 */

import { invoke } from '../utils/tauri.js';

export class VolumeService {
  /**
   * List all Docker volumes
   */
  static async listVolumes() {
    return invoke('list_volumes');
  }

  /**
   * Remove a Docker volume
   */
  static async removeVolume(volumeName) {
    return invoke('remove_volume', { volumeName });
  }

  /**
   * Prune unused volumes
   */
  static async pruneVolumes() {
    return invoke('prune_volumes');
  }

  /**
   * Backup a volume
   */
  static async backupVolume(volumeName, backupPath) {
    return invoke('backup_volume', { volumeName, backupPath });
  }

  /**
   * Restore a volume
   */
  static async restoreVolume(volumeName, backupFile) {
    return invoke('restore_volume', { volumeName, backupFile });
  }
}
