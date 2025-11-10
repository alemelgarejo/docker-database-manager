/**
 * Simple YAML utilities for Docker Compose
 * Note: This is a lightweight implementation for basic compose file handling
 */

/**
 * Parse YAML content to JavaScript object
 * This is a basic parser - for production, consider using a full YAML library
 * @param {string} yamlContent - YAML content as string
 * @returns {Object} Parsed JavaScript object
 */
export function parseYAML(yamlContent) {
  try {
    // Remove comments
    const lines = yamlContent.split('\n').filter(line => !line.trim().startsWith('#'));
    const cleaned = lines.join('\n');
    
    // For now, we'll let the backend handle parsing with serde_yaml
    // This function is mainly for validation and preview
    return { valid: true, content: cleaned };
  } catch (error) {
    console.error('YAML parse error:', error);
    return { valid: false, error: error.message };
  }
}

/**
 * Convert JavaScript object to YAML string
 * @param {Object} obj - JavaScript object
 * @param {number} indent - Indentation level
 * @returns {string} YAML formatted string
 */
export function stringifyYAML(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      yaml += stringifyYAML(value, indent + 1);
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      value.forEach(item => {
        if (typeof item === 'object') {
          yaml += `${spaces}  -\n`;
          yaml += stringifyYAML(item, indent + 2);
        } else {
          yaml += `${spaces}  - ${item}\n`;
        }
      });
    } else {
      const needsQuotes = typeof value === 'string' && (value.includes(':') || value.includes('#'));
      const finalValue = needsQuotes ? `"${value}"` : value;
      yaml += `${spaces}${key}: ${finalValue}\n`;
    }
  }

  return yaml;
}

/**
 * Validate Docker Compose YAML structure
 * @param {string} yamlContent - YAML content
 * @returns {Object} Validation result with errors if any
 */
export function validateComposeYAML(yamlContent) {
  const errors = [];
  const warnings = [];

  // Check for required fields
  if (!yamlContent.includes('services:')) {
    errors.push('Missing required field: services');
  }

  // Check for common issues
  if (yamlContent.includes('\t')) {
    errors.push('YAML should use spaces, not tabs for indentation');
  }

  // Check indentation
  const lines = yamlContent.split('\n');
  lines.forEach((line, index) => {
    const leadingSpaces = line.match(/^(\s*)/)[0].length;
    if (leadingSpaces % 2 !== 0 && line.trim()) {
      warnings.push(`Line ${index + 1}: Inconsistent indentation (should be multiples of 2)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get a basic Docker Compose template
 * @returns {string} Template YAML content
 */
export function getComposeTemplate() {
  return `version: '3.8'

services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  db:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=mypassword
      - POSTGRES_DB=mydb
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  db_data:
`;
}
