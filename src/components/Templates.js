// Templates Component
// UI for managing database templates

import { getIcon } from '../icons.js';
import {
  applyTemplate,
  deleteCustomTemplate,
  exportTemplate,
  getAllTemplates,
  importTemplate,
} from '../templates.js';

export class TemplatesManager {
  constructor() {
    this.templates = getAllTemplates();
    this.selectedTemplate = null;
    this.onTemplateSelected = null;
  }

  // Render templates grid
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const templates = getAllTemplates();
    const predefined = Object.values(templates).filter(
      (t) => t.category === 'predefined',
    );
    const custom = Object.values(templates).filter(
      (t) => t.category === 'custom',
    );

    container.innerHTML = `
      <div class="templates-container">
        <div class="templates-header">
          <h3>Database Templates</h3>
          <div class="templates-actions">
            <button class="btn btn-ghost" onclick="templatesManager.showImportDialog()">
              ${getIcon('upload')} Import
            </button>
            <button class="btn btn-primary" onclick="templatesManager.showCreateDialog()">
              ${getIcon('plus')} New Template
            </button>
          </div>
        </div>

        ${
          predefined.length > 0
            ? `
          <div class="templates-section">
            <h4 class="templates-section-title">
              ${getIcon('star')} Predefined Templates
            </h4>
            <div class="templates-grid">
              ${predefined.map((t) => this.renderTemplateCard(t)).join('')}
            </div>
          </div>
        `
            : ''
        }

        ${
          custom.length > 0
            ? `
          <div class="templates-section">
            <h4 class="templates-section-title">
              ${getIcon('folder')} Custom Templates
            </h4>
            <div class="templates-grid">
              ${custom.map((t) => this.renderTemplateCard(t)).join('')}
            </div>
          </div>
        `
            : `
          <div class="templates-empty">
            <p>No custom templates yet. Create one to get started!</p>
          </div>
        `
        }
      </div>
    `;
  }

  // Render single template card
  renderTemplateCard(template) {
    const dbTypes = Object.keys(template.configurations);
    const isCustom = template.category === 'custom';
    
    // Get database type icons
    const dbTypeIcons = {
      postgresql: 'database',
      mysql: 'database',
      mongodb: 'database',
      redis: 'database',
      mariadb: 'database'
    };

    return `
      <div class="template-card" data-template-id="${template.id}">
        <div class="template-card-header">
          <div class="template-icon-wrapper">
            <span class="template-icon-large">${template.icon}</span>
          </div>
          <div class="template-header-content">
            <h4 class="template-name">${template.name}</h4>
            ${isCustom ? '<span class="template-badge custom">Custom</span>' : '<span class="template-badge official">Official</span>'}
          </div>
        </div>
        
        <p class="template-description">${template.description}</p>
        
        <div class="template-db-types">
          <div class="template-label">Compatible with:</div>
          <div class="db-types-list">
            ${dbTypes.map(type => `
              <div class="db-type-chip" data-db-type="${type}">
                ${getIcon(dbTypeIcons[type] || 'database')}
                <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="template-actions">
          <button 
            class="btn btn-primary btn-sm" 
            onclick="templatesManager.viewTemplate('${template.id}')"
          >
            ${getIcon('eye')} View Details
          </button>
          <div class="template-actions-right">
            ${isCustom ? `
              <button 
                class="btn btn-ghost btn-sm" 
                onclick="templatesManager.editTemplate('${template.id}')"
                data-tooltip="Edit template"
              >
                ${getIcon('edit')}
              </button>
            ` : ''}
            <button 
              class="btn btn-ghost btn-sm" 
              onclick="templatesManager.exportTemplate('${template.id}')"
              data-tooltip="Export template"
            >
              ${getIcon('download')}
            </button>
            ${isCustom ? `
              <button 
                class="btn btn-ghost btn-sm btn-danger" 
                onclick="templatesManager.deleteTemplate('${template.id}')"
                data-tooltip="Delete template"
              >
                ${getIcon('trash')}
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Show template details
  viewTemplate(templateId) {
    const templates = getAllTemplates();
    const template = templates[templateId];
    if (!template) return;

    const modal = document.getElementById('template-details-modal');
    if (!modal) return;

    const dbConfigs = Object.entries(template.configurations)
      .map(([dbType, config]) => {
        const envVars = Object.entries(config.env || {})
          .map(([key, value]) => `
            <div class="env-var-item">
              <span class="env-var-key">${key}</span>
              <span class="env-var-value">${value}</span>
            </div>
          `)
          .join('');

        return `
          <div class="template-db-config-card">
            <div class="config-card-header">
              ${getIcon('database')}
              <h5>${dbType.charAt(0).toUpperCase() + dbType.slice(1)}</h5>
            </div>
            <div class="config-card-body">
              <div class="config-row">
                <div class="config-item">
                  <span class="config-label">Memory Limit</span>
                  <span class="config-value">${config.memory || 'No limit'}</span>
                </div>
                <div class="config-item">
                  <span class="config-label">CPU Limit</span>
                  <span class="config-value">${config.cpus || 'No limit'}</span>
                </div>
              </div>
              ${config.restartPolicy ? `
                <div class="config-row">
                  <div class="config-item full-width">
                    <span class="config-label">Restart Policy</span>
                    <span class="config-value">${config.restartPolicy}</span>
                  </div>
                </div>
              ` : ''}
              ${envVars ? `
                <div class="env-vars-section">
                  <div class="env-vars-header">
                    ${getIcon('settings')}
                    <span>Environment Variables</span>
                  </div>
                  <div class="env-vars-list">
                    ${envVars}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      })
      .join('');

    const modalContent = modal.querySelector('.modal-body');
    modalContent.innerHTML = `
      <div class="template-details-container">
        <div class="template-details-hero">
          <div class="template-hero-icon">
            ${template.icon}
          </div>
          <div class="template-hero-content">
            <h3 class="template-hero-title">${template.name}</h3>
            <p class="template-hero-description">${template.description}</p>
            <div class="template-meta-info">
              <span class="meta-badge ${template.category}">
                ${getIcon(template.category === 'custom' ? 'user' : 'star')}
                ${template.category === 'custom' ? 'Custom' : 'Official'}
              </span>
              ${template.category === 'custom' && template.createdAt ? `
                <span class="meta-date">
                  ${getIcon('calendar')}
                  Created ${new Date(template.createdAt).toLocaleDateString()}
                </span>
              ` : ''}
            </div>
          </div>
        </div>
        
        <div class="template-configurations-section">
          <div class="configurations-header">
            <h4>Database Configurations</h4>
            <p>Available configurations for different database types</p>
          </div>
          <div class="configurations-grid">
            ${dbConfigs}
          </div>
        </div>
      </div>
    `;

    modal.querySelector('.modal-header h2').textContent = 'Template Details';
    modal.classList.add('active');
  }

  // Select template for use
  selectTemplate(templateId) {
    this.selectedTemplate = templateId;
    if (this.onTemplateSelected) {
      this.onTemplateSelected(templateId);
    }

    // Show notification
    if (window.showNotification) {
      const template = getAllTemplates()[templateId];
      window.showNotification(
        `Template "${template.name}" selected`,
        'success',
      );
    }
  }

  // Export template
  exportTemplate(templateId) {
    try {
      exportTemplate(templateId);
      if (window.showNotification) {
        window.showNotification('Template exported successfully', 'success');
      }
    } catch (error) {
      console.error('Error exporting template:', error);
      if (window.showNotification) {
        window.showNotification('Error exporting template', 'error');
      }
    }
  }

  // Show import dialog
  showImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        await importTemplate(file);
        this.render('templates-tab-content');
        if (window.showNotification) {
          window.showNotification('Template imported successfully', 'success');
        }
      } catch (error) {
        console.error('Error importing template:', error);
        if (window.showNotification) {
          window.showNotification(
            `Error importing template: ${error.message}`,
            'error',
          );
        }
      }
    };
    input.click();
  }

  // Show create template dialog
  showCreateDialog() {
    const modal = document.getElementById('create-template-modal');
    if (!modal) return;

    modal.classList.add('active');
  }

  // Edit template
  editTemplate(templateId) {
    const templates = getAllTemplates();
    const template = templates[templateId];
    if (!template || template.category !== 'custom') return;

    // Open create modal with template data for editing
    const modal = document.getElementById('create-template-modal');
    if (!modal) return;

    // Populate form with template data
    const form = modal.querySelector('#create-template-form');
    form.querySelector('#template-name').value = template.name;
    form.querySelector('#template-description').value = template.description;
    form.querySelector('#template-icon').value = template.icon;
    form.dataset.editingId = templateId;

    modal.querySelector('.modal-header h2').textContent = 'Edit Template';
    modal.classList.add('active');
  }

  // Delete template
  async deleteTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      deleteCustomTemplate(templateId);
      this.render('templates-tab-content');
      if (window.showNotification) {
        window.showNotification('Template deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      if (window.showNotification) {
        window.showNotification('Error deleting template', 'error');
      }
    }
  }

  // Apply template to database configuration
  applyToDatabase(templateId, dbType, baseConfig) {
    return applyTemplate(templateId, dbType, baseConfig);
  }
}

// Global instance
export const templatesManager = new TemplatesManager();

// Export for use in window scope
if (typeof window !== 'undefined') {
  window.templatesManager = templatesManager;
}
