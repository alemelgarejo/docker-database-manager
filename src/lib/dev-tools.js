/**
 * Development Tools
 * Global utilities for debugging and development
 */

'use strict';

import { cache } from './utils/cache.js';
import { polling } from './utils/polling.js';
import { getStoredLogs, exportLogs, clearStoredLogs, configureLogger } from './utils/logger.js';

/**
 * Setup global dev tools
 */
export function setupDevTools() {
  if (typeof window === 'undefined') return;
  
  window.__DEV__ = {
    cache: {
      stats: () => cache.getStats(),
      clear: () => cache.clear(),
      invalidate: (key) => cache.invalidate(key),
      invalidatePattern: (pattern) => cache.invalidatePattern(pattern),
      cleanup: () => cache.cleanup(),
    },
    polling: {
      stats: () => polling.getStats(),
      pauseAll: () => polling.pauseAll(),
      resumeAll: () => polling.resumeAll(),
      pause: (key) => polling.pause(key),
      resume: (key) => polling.resume(key),
      clear: () => polling.clear(),
    },
    logger: {
      getLogs: () => getStoredLogs(),
      exportLogs: () => exportLogs(),
      clearLogs: () => clearStoredLogs(),
      configure: (options) => configureLogger(options),
    },
  };
  
  console.log('%c🛠️ Dev Tools Ready', 'color: #10b981; font-size: 14px; font-weight: bold');
  console.log('%cAccess via: window.__DEV__', 'color: #64748b; font-size: 12px');
  console.log('%cExamples:', 'color: #94a3b8; font-size: 12px');
  console.log('  __DEV__.cache.stats()');
  console.log('  __DEV__.polling.stats()');
  console.log('  __DEV__.logger.getLogs()');
}
