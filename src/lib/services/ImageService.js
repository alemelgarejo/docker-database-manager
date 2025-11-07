/**
 * Image Service
 * Handles Docker image operations
 */

import { invoke } from '../utils/tauri.js';

export class ImageService {
  /**
   * List all Docker images
   */
  static async listImages() {
    return invoke('list_images');
  }

  /**
   * Remove a Docker image
   */
  static async removeImage(imageId) {
    return invoke('remove_image', { imageId });
  }

  /**
   * Pull a Docker image
   */
  static async pullImage(imageName) {
    return invoke('pull_image', { imageName });
  }
}
