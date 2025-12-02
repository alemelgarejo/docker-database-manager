

/**
 * FavoritesManager - Manages favorite databases with localStorage persistence
 * 
 * Responsibilities:
 * - Store and retrieve favorite database IDs
 * - Toggle favorite status for containers
 * - Check if a container is favorited
 * - Persist favorites across sessions
 */
export class FavoritesManager {
  /**
   * Create a new FavoritesManager instance
   */
  constructor() {
    this.storageKey = 'docker-db-favorites';
    this.favorites = this.loadFavorites();
  }

  /**
   * Load favorites from localStorage
   * @returns {Set<string>} Set of favorite container IDs
   */
  loadFavorites() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      }
    } catch (error) {
      console.error('[FavoritesManager] Error loading favorites:', error);
    }
    return new Set();
  }

  /**
   * Save favorites to localStorage
   */
  saveFavorites() {
    try {
      const array = Array.from(this.favorites);
      localStorage.setItem(this.storageKey, JSON.stringify(array));
    } catch (error) {
      console.error('[FavoritesManager] Error saving favorites:', error);
    }
  }

  /**
   * Add a container to favorites
   * @param {string} containerId - Container ID to favorite
   * @returns {boolean} True if added, false if already favorited
   */
  addFavorite(containerId) {
    if (this.favorites.has(containerId)) {
      return false;
    }
    this.favorites.add(containerId);
    this.saveFavorites();
    return true;
  }

  /**
   * Remove a container from favorites
   * @param {string} containerId - Container ID to unfavorite
   * @returns {boolean} True if removed, false if wasn't favorited
   */
  removeFavorite(containerId) {
    if (!this.favorites.has(containerId)) {
      return false;
    }
    this.favorites.delete(containerId);
    this.saveFavorites();
    return true;
  }

  /**
   * Toggle favorite status of a container
   * @param {string} containerId - Container ID to toggle
   * @returns {boolean} New favorite status (true = favorited, false = not favorited)
   */
  toggleFavorite(containerId) {
    const isFavorite = this.favorites.has(containerId);
    if (isFavorite) {
      this.removeFavorite(containerId);
      return false;
    }
    this.addFavorite(containerId);
    return true;
  }

  /**
   * Check if a container is favorited
   * @param {string} containerId - Container ID to check
   * @returns {boolean} True if favorited
   */
  isFavorite(containerId) {
    return this.favorites.has(containerId);
  }

  /**
   * Get all favorite container IDs
   * @returns {string[]} Array of favorite container IDs
   */
  getFavorites() {
    return Array.from(this.favorites);
  }

  /**
   * Get count of favorites
   * @returns {number} Number of favorited containers
   */
  getCount() {
    return this.favorites.size;
  }

  /**
   * Clear all favorites
   */
  clear() {
    this.favorites.clear();
    this.saveFavorites();
  }

  /**
   * Sort containers by favorite status (favorites first)
   * @param {Array<Object>} containers - Array of container objects
   * @returns {Array<Object>} Sorted array with favorites first
   */
  sortByFavorites(containers) {
    return containers.sort((a, b) => {
      const aFav = this.isFavorite(a.id);
      const bFav = this.isFavorite(b.id);
      
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }

  /**
   * Filter containers to show only favorites
   * @param {Array<Object>} containers - Array of container objects
   * @returns {Array<Object>} Filtered array with only favorites
   */
  filterFavorites(containers) {
    return containers.filter(c => this.isFavorite(c.id));
  }
}
