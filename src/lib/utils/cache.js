/**
 * Cache Manager with TTL (Time To Live)
 * Manages intelligent caching to reduce unnecessary API calls
 */

export class CacheManager {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 30000; // 30 seconds default
  }

  /**
   * Get cached data or fetch fresh data
   * @param {string} key - Cache key
   * @param {Function} fetcher - Async function to fetch fresh data
   * @param {number} [ttl] - Time to live in milliseconds
   * @returns {Promise<any>} Cached or fresh data
   */
  async get(key, fetcher, ttl = this.defaultTTL) {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Return cached data if valid
    if (cached && cached.timestamp && (now - cached.timestamp < ttl)) {
      console.log(`[Cache] HIT: ${key} (age: ${now - cached.timestamp}ms)`);
      return cached.data;
    }

    // Cache miss or expired - fetch fresh data
    console.log(`[Cache] MISS: ${key} - fetching...`);
    try {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      // If fetch fails but we have stale cache, return it
      if (cached && cached.data) {
        console.warn(`[Cache] Fetch failed, returning stale data for ${key}`);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Set cache data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} [ttl] - Time to live in milliseconds
   */
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    console.log(`[Cache] SET: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Invalidate cached data
   * @param {string} key - Cache key to invalidate
   */
  invalidate(key) {
    if (this.cache.has(key)) {
      console.log(`[Cache] INVALIDATE: ${key}`);
      this.cache.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Invalidate multiple keys matching a pattern
   * @param {string|RegExp} pattern - Pattern to match keys
   */
  invalidatePattern(pattern) {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern) 
      : pattern;
    
    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      console.log(`[Cache] INVALIDATE PATTERN: ${pattern} (${count} keys)`);
    }
    return count;
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[Cache] CLEAR ALL (${size} keys cleared)`);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const stats = {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries: [],
    };

    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      stats.entries.push({
        key,
        age: now - value.timestamp,
        ttl: value.ttl,
        expired: (now - value.timestamp) >= value.ttl,
        size: JSON.stringify(value.data).length,
      });
    }

    return stats;
  }

  /**
   * Check if key exists and is valid
   * @param {string} key - Cache key
   * @returns {boolean} True if exists and valid
   */
  has(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;

    const now = Date.now();
    const isValid = (now - cached.timestamp) < cached.ttl;
    
    if (!isValid) {
      this.cache.delete(key);
    }
    
    return isValid;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) >= value.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] CLEANUP: ${cleaned} expired entries removed`);
    }
    return cleaned;
  }
}

// Global cache instance
export const cache = new CacheManager();

// Auto cleanup every 5 minutes
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);
