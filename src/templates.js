// Database Templates System
// Predefined and custom templates for database configurations

export const predefinedTemplates = {
  development: {
    id: 'development',
    name: 'Local Development',
    description: 'Optimized for local development with standard configurations',
    icon: '💻',
    category: 'predefined',
    configurations: {
      postgres: {
        memory: '256m',
        cpus: '1',
        env: {
          POSTGRES_SHARED_BUFFERS: '128MB',
          POSTGRES_MAX_CONNECTIONS: '100',
          POSTGRES_WORK_MEM: '4MB',
        },
      },
      mysql: {
        memory: '256m',
        cpus: '1',
        env: {
          MYSQL_INNODB_BUFFER_POOL_SIZE: '128M',
          MYSQL_MAX_CONNECTIONS: '100',
        },
      },
      mongodb: {
        memory: '256m',
        cpus: '1',
        env: {
          MONGO_CACHE_SIZE_GB: '0.25',
        },
      },
      redis: {
        memory: '128m',
        cpus: '1',
        env: {
          REDIS_MAXMEMORY: '100mb',
          REDIS_MAXMEMORY_POLICY: 'allkeys-lru',
        },
      },
      mariadb: {
        memory: '256m',
        cpus: '1',
        env: {
          MARIADB_INNODB_BUFFER_POOL_SIZE: '128M',
          MARIADB_MAX_CONNECTIONS: '100',
        },
      },
    },
  },
  testing: {
    id: 'testing',
    name: 'Testing Environment',
    description: 'Lightweight setup for automated testing and CI/CD',
    icon: '🧪',
    category: 'predefined',
    configurations: {
      postgres: {
        memory: '128m',
        cpus: '0.5',
        env: {
          POSTGRES_SHARED_BUFFERS: '64MB',
          POSTGRES_MAX_CONNECTIONS: '50',
          POSTGRES_FSYNC: 'off',
          POSTGRES_SYNCHRONOUS_COMMIT: 'off',
          POSTGRES_FULL_PAGE_WRITES: 'off',
        },
      },
      mysql: {
        memory: '128m',
        cpus: '0.5',
        env: {
          MYSQL_INNODB_BUFFER_POOL_SIZE: '64M',
          MYSQL_MAX_CONNECTIONS: '50',
          MYSQL_INNODB_FLUSH_LOG_AT_TRX_COMMIT: '0',
        },
      },
      mongodb: {
        memory: '128m',
        cpus: '0.5',
        env: {
          MONGO_CACHE_SIZE_GB: '0.125',
        },
      },
      redis: {
        memory: '64m',
        cpus: '0.5',
        env: {
          REDIS_MAXMEMORY: '50mb',
          REDIS_MAXMEMORY_POLICY: 'allkeys-lru',
          REDIS_SAVE: '',
        },
      },
      mariadb: {
        memory: '128m',
        cpus: '0.5',
        env: {
          MARIADB_INNODB_BUFFER_POOL_SIZE: '64M',
          MARIADB_MAX_CONNECTIONS: '50',
        },
      },
    },
  },
  production: {
    id: 'production',
    name: 'Production Optimized',
    description: 'High-performance configuration for production workloads',
    icon: '🚀',
    category: 'predefined',
    configurations: {
      postgres: {
        memory: '2g',
        cpus: '2',
        env: {
          POSTGRES_SHARED_BUFFERS: '512MB',
          POSTGRES_MAX_CONNECTIONS: '200',
          POSTGRES_WORK_MEM: '16MB',
          POSTGRES_EFFECTIVE_CACHE_SIZE: '1536MB',
          POSTGRES_MAINTENANCE_WORK_MEM: '256MB',
          POSTGRES_CHECKPOINT_COMPLETION_TARGET: '0.9',
          POSTGRES_WAL_BUFFERS: '16MB',
          POSTGRES_DEFAULT_STATISTICS_TARGET: '100',
        },
      },
      mysql: {
        memory: '2g',
        cpus: '2',
        env: {
          MYSQL_INNODB_BUFFER_POOL_SIZE: '1G',
          MYSQL_MAX_CONNECTIONS: '200',
          MYSQL_INNODB_LOG_FILE_SIZE: '256M',
        },
      },
      mongodb: {
        memory: '2g',
        cpus: '2',
        env: {
          MONGO_CACHE_SIZE_GB: '1',
        },
      },
      redis: {
        memory: '512m',
        cpus: '1',
        env: {
          REDIS_MAXMEMORY: '400mb',
          REDIS_MAXMEMORY_POLICY: 'allkeys-lru',
          REDIS_SAVE: '900 1 300 10 60 10000',
        },
      },
      mariadb: {
        memory: '2g',
        cpus: '2',
        env: {
          MARIADB_INNODB_BUFFER_POOL_SIZE: '1G',
          MARIADB_MAX_CONNECTIONS: '200',
        },
      },
    },
  },
  'high-availability': {
    id: 'high-availability',
    name: 'High Availability',
    description: 'Configuration for high availability and reliability',
    icon: '🛡️',
    category: 'predefined',
    configurations: {
      postgres: {
        memory: '4g',
        cpus: '4',
        env: {
          POSTGRES_SHARED_BUFFERS: '1GB',
          POSTGRES_MAX_CONNECTIONS: '500',
          POSTGRES_WORK_MEM: '32MB',
          POSTGRES_EFFECTIVE_CACHE_SIZE: '3GB',
          POSTGRES_MAINTENANCE_WORK_MEM: '512MB',
          POSTGRES_CHECKPOINT_COMPLETION_TARGET: '0.9',
          POSTGRES_WAL_BUFFERS: '32MB',
          POSTGRES_DEFAULT_STATISTICS_TARGET: '500',
          POSTGRES_MAX_WAL_SIZE: '4GB',
          POSTGRES_MIN_WAL_SIZE: '1GB',
        },
        restartPolicy: 'always',
      },
      mysql: {
        memory: '4g',
        cpus: '4',
        env: {
          MYSQL_INNODB_BUFFER_POOL_SIZE: '2G',
          MYSQL_MAX_CONNECTIONS: '500',
          MYSQL_INNODB_LOG_FILE_SIZE: '512M',
          MYSQL_INNODB_FLUSH_METHOD: 'O_DIRECT',
        },
        restartPolicy: 'always',
      },
      mongodb: {
        memory: '4g',
        cpus: '4',
        env: {
          MONGO_CACHE_SIZE_GB: '2',
        },
        restartPolicy: 'always',
      },
      redis: {
        memory: '1g',
        cpus: '2',
        env: {
          REDIS_MAXMEMORY: '800mb',
          REDIS_MAXMEMORY_POLICY: 'allkeys-lru',
          REDIS_SAVE: '900 1 300 10 60 10000',
          REDIS_APPENDONLY: 'yes',
        },
        restartPolicy: 'always',
      },
      mariadb: {
        memory: '4g',
        cpus: '4',
        env: {
          MARIADB_INNODB_BUFFER_POOL_SIZE: '2G',
          MARIADB_MAX_CONNECTIONS: '500',
        },
        restartPolicy: 'always',
      },
    },
  },
};

// Custom templates storage key
const CUSTOM_TEMPLATES_KEY = 'docker-db-manager-custom-templates';

// Get all templates (predefined + custom)
export function getAllTemplates() {
  const customTemplates = getCustomTemplates();
  return { ...predefinedTemplates, ...customTemplates };
}

// Get custom templates from localStorage
export function getCustomTemplates() {
  try {
    const stored = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading custom templates:', error);
    return {};
  }
}

// Save custom template
export function saveCustomTemplate(template) {
  try {
    const customTemplates = getCustomTemplates();
    const templateId = template.id || `custom-${Date.now()}`;
    
    customTemplates[templateId] = {
      ...template,
      id: templateId,
      category: 'custom',
      createdAt: new Date().toISOString(),
    };
    
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
    return templateId;
  } catch (error) {
    console.error('Error saving custom template:', error);
    throw error;
  }
}

// Delete custom template
export function deleteCustomTemplate(templateId) {
  try {
    const customTemplates = getCustomTemplates();
    delete customTemplates[templateId];
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
    return true;
  } catch (error) {
    console.error('Error deleting custom template:', error);
    return false;
  }
}

// Apply template to database configuration
export function applyTemplate(templateId, dbType, baseConfig) {
  const templates = getAllTemplates();
  const template = templates[templateId];
  
  if (!template) {
    console.warn(`Template ${templateId} not found`);
    return baseConfig;
  }
  
  const dbConfig = template.configurations[dbType];
  if (!dbConfig) {
    console.warn(`No configuration for ${dbType} in template ${templateId}`);
    return baseConfig;
  }
  
  return {
    ...baseConfig,
    ...dbConfig,
    env: {
      ...baseConfig.env,
      ...dbConfig.env,
    },
  };
}

// Export template to JSON file
export function exportTemplate(templateId) {
  const templates = getAllTemplates();
  const template = templates[templateId];
  
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }
  
  const dataStr = JSON.stringify(template, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `db-template-${template.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Import template from JSON file
export function importTemplate(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const template = JSON.parse(e.target.result);
        
        // Validate template structure
        if (!template.name || !template.configurations) {
          throw new Error('Invalid template format');
        }
        
        // Remove predefined category to prevent conflicts
        if (template.category === 'predefined') {
          template.category = 'custom';
        }
        
        const templateId = saveCustomTemplate(template);
        resolve(templateId);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
}

// Create template from current configuration
export function createTemplateFromConfig(name, description, dbType, config) {
  const template = {
    name,
    description,
    icon: '⭐',
    category: 'custom',
    configurations: {
      [dbType]: {
        memory: config.memory || '256m',
        cpus: config.cpus || '1',
        env: config.env || {},
        restartPolicy: config.restartPolicy,
      },
    },
  };
  
  return saveCustomTemplate(template);
}
