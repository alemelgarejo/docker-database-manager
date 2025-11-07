// Templates Component
// UI for managing database templates

import {
  getAllTemplates,
  predefinedTemplates,
  getCustomTemplates,
  deleteCustomTemplate,
  exportTemplate,
  importTemplate,
  applyTemplate,
  createTemplateFromConfig,
} from '../templates.js';
import { getIcon } from '../icons.js';

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

        ${predefined.length > 0 ? `
          <div class="templates-section">
            <h4 class="templates-section-title">
              ${getIcon('star')} Predefined Templates
            </h4>
            <div class="templates-grid">
              ${predefined.map((t) => this.renderTemplateCard(t)).join('')}
            </div>
          </div>
        ` : ''}

        ${custom.length > 0 ? `
          <div class="templates-section">
            <h4 class="templates-section-title">
              ${getIcon('folder')} Custom Templates
            </h4>
            <div class="templates-grid">
              ${custom.map((t) => this.renderTemplateCard(t)).join('')}
            </div>
          </div>
        ` : `
          <div class="templates-empty">
            <p>No custom templates yet. Create one to get started!</p>
          </div>
        `}
      </div>
    `;
  }

  // Render single template card
  renderTemplateCard(template) {
    const dbTypes = Object.keys(template.configurations);
    const isCustom = template.category === 'custom';

    return `
      <div class="template-card" data-template-id="${template.id}">
        <div class="template-card-header">
          <span class="template-icon">${template.icon}</span>
          <h4 class="template-name">${template.name}</h4>
        </div>
        <p class="template-description">${template.description}</p>
        <div class="template-db-types">
          <span class="template-label">Supports:</span>
          ${dbTypes.map((type) => `
            <span class="db-type-badge" data-db-type="${type}">
              ${type}
            </span>
          `).join('')}
        </div>
        <div class="template-card-actions">
          <button 
            class="btn btn-sm btn-ghost" 
            onclick="templatesManager.viewTemplate('${template.id}')"
            data-tooltip="View details"
          >
            ${getIcon('eye')}
          </button>
          ${isCustom ? `
            <button 
              class="btn btn-sm btn-ghost" 
              onclick="templatesManager.editTemplate('${template.id}')"
              data-tooltip="Edit"
            >
              ${getIcon('edit')}
            </button>
          ` : ''}
          <button 
            class="btn btn-sm btn-ghost" 
            onclick="templatesManager.exportTemplate('${template.id}')"
            data-tooltip="Export"
          >
            ${getIcon('download')}
          </button>
          ${isCustom ? `
            <button 
              class="btn btn-sm btn-ghost btn-danger" 
              onclick="templatesManager.deleteTemplate('${template.id}')"
              data-tooltip="Delete"
            >
              ${getIcon('trash')}
            </button>
          ` : ''}
          <button 
            class="btn btn-sm btn-primary" 
            onclick="templatesManager.selectTemplate('${template.id}')"
          >
            Use Template
          </button>
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
          .map(([key, value]) => `<li><code>${key}</code>: ${value}</li>`)
          .join('');

        return `
          <div class="template-db-config">
            <h5>${dbType.toUpperCase()}</h5>
            <div class="config-details">
              <p><strong>Memory:</strong> ${config.memory || 'N/A'}</p>
              <p><strong>CPUs:</strong> ${config.cpus || 'N/A'}</p>
              ${config.restartPolicy ? `<p><strong>Restart Policy:</strong> ${config.restartPolicy}</p>` : ''}
              ${envVars ? `
                <div class="env-vars">
                  <strong>Environment Variables:</strong>
                  <ul>${envVars}</ul>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      })
      .join('');

    const modalContent = modal.querySelector('.modal-body');
    modalContent.innerHTML = `
      <div class="template-details">
        <div class="template-details-header">
          <span class="template-icon-large">${template.icon}</span>
          <div>
            <h3>${template.name}</h3>
            <p class="template-meta">${template.description}</p>
            ${template.category === 'custom' && template.createdAt ? `
              <p class="template-meta-date">Created: ${new Date(template.createdAt).toLocaleDateString()}</p>
            ` : ''}
          </div>
        </div>
        <div class="template-configurations">
          <h4>Configurations</h4>
          ${dbConfigs}
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
      window.showNotification(`Template "${template.name}" selected`, 'success');
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
          window.showNotification(`Error importing template: ${error.message}`, 'error');
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
