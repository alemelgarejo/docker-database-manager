/**
 * Structured Logging System
 * 
 * Provides a centralized, structured logging system with:
 * - Log levels (DEBUG, INFO, WARN, ERROR)
 * - Context/module tracking
 * - Timestamp formatting
 * - Color-coded output
 * - Performance monitoring
 * - Production mode support
 */

'use strict';

/**
 * Log levels with priority
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Log level names
 */
const LOG_LEVEL_NAMES = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * Console colors for each log level
 */
const LOG_COLORS = {
  [LogLevel.DEBUG]: 'color: #64748b', // Gray
  [LogLevel.INFO]: 'color: #3b82f6',  // Blue
  [LogLevel.WARN]: 'color: #f59e0b',  // Orange
  [LogLevel.ERROR]: 'color: #ef4444', // Red
};

/**
 * Logger configuration
 */
const config = {
  // Minimum log level to display (DEBUG, INFO, WARN, ERROR)
  minLevel: LogLevel.DEBUG,
  
  // Enable/disable logging
  enabled: true,
  
  // Show timestamps
  showTimestamp: true,
  
  // Show context/module
  showContext: true,
  
  // Use colors in console
  useColors: true,
  
  // Store logs in memory (for debugging)
  storeLogs: false,
  
  // Max logs to store
  maxStoredLogs: 100,
};

/**
 * Stored logs (when enabled)
 */
const storedLogs = [];

/**
 * Format timestamp
 * @returns {string} Formatted timestamp
 */
function formatTimestamp() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Format log message
 * @param {number} level - Log level
 * @param {string} context - Context/module name
 * @param {string} message - Log message
 * @param {Array} args - Additional arguments
 * @returns {Object} Formatted log entry
 */
function formatLog(level, context, message, args) {
  const timestamp = formatTimestamp();
  const levelName = LOG_LEVEL_NAMES[level];
  
  return {
    timestamp,
    level: levelName,
    context,
    message,
    args,
  };
}

/**
 * Store log entry
 * @param {Object} logEntry - Formatted log entry
 */
function storeLog(logEntry) {
  if (!config.storeLogs) return;
  
  storedLogs.push(logEntry);
  
  // Limit stored logs
  if (storedLogs.length > config.maxStoredLogs) {
    storedLogs.shift();
  }
}

/**
 * Output log to console
 * @param {number} level - Log level
 * @param {Object} logEntry - Formatted log entry
 */
function outputLog(level, logEntry) {
  if (!config.enabled) return;
  if (level < config.minLevel) return;
  
  const parts = [];
  const styles = [];
  
  // Timestamp
  if (config.showTimestamp) {
    parts.push(`%c[${logEntry.timestamp}]`);
    styles.push('color: #94a3b8; font-weight: normal');
  }
  
  // Level
  parts.push(`%c[${logEntry.level}]`);
  styles.push(config.useColors ? LOG_COLORS[level] : '');
  
  // Context
  if (config.showContext && logEntry.context) {
    parts.push(`%c[${logEntry.context}]`);
    styles.push('color: #8b5cf6; font-weight: bold');
  }
  
  // Message
  parts.push(`%c${logEntry.message}`);
  styles.push('color: inherit; font-weight: normal');
  
  // Output based on level
  const consoleMethod = {
    [LogLevel.DEBUG]: console.log,
    [LogLevel.INFO]: console.log,
    [LogLevel.WARN]: console.warn,
    [LogLevel.ERROR]: console.error,
  }[level];
  
  consoleMethod(parts.join(' '), ...styles, ...logEntry.args);
}

/**
 * Core logging function
 * @param {number} level - Log level
 * @param {string} context - Context/module name
 * @param {string} message - Log message
 * @param {...*} args - Additional arguments
 */
function log(level, context, message, ...args) {
  const logEntry = formatLog(level, context, message, args);
  storeLog(logEntry);
  outputLog(level, logEntry);
}

/**
 * Logger class - Creates a logger for a specific context
 */
export class Logger {
  /**
   * Create a logger instance
   * @param {string} context - Context/module name
   */
  constructor(context) {
    this.context = context;
  }
  
  /**
   * Log debug message
   * @param {string} message - Message
   * @param {...*} args - Additional arguments
   */
  debug(message, ...args) {
    log(LogLevel.DEBUG, this.context, message, ...args);
  }
  
  /**
   * Log info message
   * @param {string} message - Message
   * @param {...*} args - Additional arguments
   */
  info(message, ...args) {
    log(LogLevel.INFO, this.context, message, ...args);
  }
  
  /**
   * Log warning message
   * @param {string} message - Message
   * @param {...*} args - Additional arguments
   */
  warn(message, ...args) {
    log(LogLevel.WARN, this.context, message, ...args);
  }
  
  /**
   * Log error message
   * @param {string} message - Message
   * @param {...*} args - Additional arguments
   */
  error(message, ...args) {
    log(LogLevel.ERROR, this.context, message, ...args);
  }
  
  /**
   * Log function execution time
   * @param {string} label - Timer label
   * @returns {Function} End function to call when done
   */
  time(label) {
    const start = performance.now();
    this.debug(`⏱️ Starting: ${label}`);
    
    return () => {
      const duration = (performance.now() - start).toFixed(2);
      this.debug(`⏱️ Finished: ${label} (${duration}ms)`);
    };
  }
  
  /**
   * Log grouped messages
   * @param {string} label - Group label
   * @param {Function} fn - Function to execute in group
   */
  group(label, fn) {
    this.debug(`📦 ${label}`);
    console.group();
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  }
}

/**
 * Create a logger for a specific context
 * @param {string} context - Context/module name
 * @returns {Logger} Logger instance
 */
export function createLogger(context) {
  return new Logger(context);
}

/**
 * Configure logger
 * @param {Object} options - Configuration options
 */
export function configureLogger(options) {
  Object.assign(config, options);
}

/**
 * Get all stored logs
 * @returns {Array} Stored logs
 */
export function getStoredLogs() {
  return [...storedLogs];
}

/**
 * Clear stored logs
 */
export function clearStoredLogs() {
  storedLogs.length = 0;
}

/**
 * Export logs as JSON
 * @returns {string} JSON string of logs
 */
export function exportLogs() {
  return JSON.stringify(storedLogs, null, 2);
}

/**
 * Set production mode (minimal logging)
 */
export function setProductionMode() {
  configureLogger({
    minLevel: LogLevel.WARN,
    showTimestamp: false,
    useColors: false,
    storeLogs: false,
  });
}

/**
 * Set development mode (full logging)
 */
export function setDevelopmentMode() {
  configureLogger({
    minLevel: LogLevel.DEBUG,
    showTimestamp: true,
    useColors: true,
    storeLogs: true,
  });
}

// Default logger
export const logger = createLogger('App');

// Auto-detect environment
if (import.meta.env?.MODE === 'production') {
  setProductionMode();
} else {
  setDevelopmentMode();
}
