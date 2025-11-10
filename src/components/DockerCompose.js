/**
 * Docker Compose Component
 * Main component for Docker Compose functionality
 */

import { getIcon } from '../icons.js';
import { ComposeService } from '../lib/services/ComposeService.js';
import { getComposeTemplate } from '../lib/utils/yaml.js';

export class DockerCompose {
  constructor(invoke, showNotification, showLoading, hideLoading) {
    this.invoke = invoke;
    this.showNotification = showNotification;
    this.showLoading = showLoading;
    this.hideLoading = hideLoading;
    this.composeService = new ComposeService(invoke);
    this.projects = [];
  }

  /**
   * Render the main Docker Compose tab content
   * @returns {string} HTML content
   */
  render() {
    return `
      <div class="compose-container">
        <div class="compose-header">
          <h2>${getIcon('layers')} Docker Compose Projects</h2>
          <div class="compose-actions">
            <button class="btn btn-secondary" onclick="composeManager.openImportModal()" data-tooltip="Import compose file">
              ${getIcon('upload')} Import
            </button>
            <button class="btn btn-primary" onclick="composeManager.openCreateModal()" data-tooltip="Create new compose file">
              ${getIcon('plus')} New Compose
            </button>
          </div>
        </div>

        <div id="compose-projects-list" class="compose-projects-list">
          <div class="loading-state">
            <p>Loading projects...</p>
          </div>
        </div>

        <div id="no-compose-projects" class="no-data" style="display: none;">
          <div class="no-data-icon">${getIcon('layers')}</div>
          <h3>No Compose Projects Yet</h3>
          <p>Import a docker-compose.yml file or create a new one to get started</p>
          <div class="no-data-actions">
            <button class="btn btn-primary" onclick="composeManager.openImportModal()">
              ${getIcon('upload')} Import Compose File
            </button>
            <button class="btn btn-secondary" onclick="composeManager.openCreateModal()">
              ${getIcon('plus')} Create New
            </button>
          </div>
        </div>
      </div>

      <!-- Import Compose Modal -->
      <div id="import-compose-modal" class="modal">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3>${getIcon('upload')} Import Docker Compose File</h3>
            <button class="modal-close" onclick="composeManager.closeImportModal()">×</button>
          </div>
          <div class="modal-body">
            <form id="import-compose-form" onsubmit="composeManager.handleImportCompose(event)">
              <div class="form-group">
                <label>Compose File Content:</label>
                <textarea
                  id="import-compose-content"
                  class="yaml-editor"
                  rows="15"
                  placeholder="Paste your docker-compose.yml content here..."
                  required
                ></textarea>
                <small>Or paste the content of your docker-compose.yml file</small>
              </div>

              <div class="form-group">
                <label>Project Name:</label>
                <input
                  type="text"
                  id="import-project-name"
                  placeholder="my-app-stack"
                  pattern="[a-z0-9-_]+"
                  title="Only lowercase letters, numbers, hyphens and underscores"
                  required
                />
              </div>

              <div id="compose-preview" class="compose-preview" style="display: none;">
                <h4>Services Preview:</h4>
                <div id="compose-services-preview"></div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="composeManager.closeImportModal()">
                  Cancel
                </button>
                <button type="button" class="btn btn-ghost" onclick="composeManager.validateAndPreview()">
                  ${getIcon('eye')} Preview
                </button>
                <button type="submit" class="btn btn-primary">
                  ${getIcon('play')} Import & Deploy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Create Compose Modal -->
      <div id="create-compose-modal" class="modal">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3>${getIcon('fileCode')} Create Docker Compose File</h3>
            <button class="modal-close" onclick="composeManager.closeCreateModal()">×</button>
          </div>
          <div class="modal-body">
            <form id="create-compose-form" onsubmit="composeManager.handleCreateCompose(event)">
              <div class="form-group">
                <label>Project Name:</label>
                <input
                  type="text"
                  id="create-project-name"
                  placeholder="my-project"
                  pattern="[a-z0-9-_]+"
                  title="Only lowercase letters, numbers, hyphens and underscores"
                  required
                />
              </div>

              <div class="form-group">
                <label>Compose File Content:</label>
                <div class="editor-actions">
                  <button type="button" class="btn btn-sm btn-ghost" onclick="composeManager.loadTemplate()">
                    ${getIcon('fileText')} Load Template
                  </button>
                </div>
                <textarea
                  id="create-compose-content"
                  class="yaml-editor"
                  rows="20"
                  placeholder="version: '3.8'&#10;services:&#10;  web:&#10;    image: nginx:latest"
                  required
                ></textarea>
                <small>Write your docker-compose.yml content with YAML syntax</small>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="composeManager.closeCreateModal()">
                  Cancel
                </button>
                <button type="button" class="btn btn-ghost" onclick="composeManager.validateAndPreview()">
                  ${getIcon('eye')} Validate
                </button>
                <button type="submit" class="btn btn-primary">
                  ${getIcon('play')} Deploy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Generate from Containers Modal -->
      <div id="generate-compose-modal" class="modal">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3>${getIcon('layers')} Generated Docker Compose</h3>
            <button class="modal-close" onclick="composeManager.closeGenerateModal()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Generated Compose File:</label>
              <textarea
                id="generated-compose-content"
                class="yaml-editor"
                rows="20"
                readonly
              ></textarea>
            </div>

            <div class="form-group">
              <label>Project Name (for deployment):</label>
              <input
                type="text"
                id="generated-project-name"
                placeholder="generated-stack"
                pattern="[a-z0-9-_]+"
              />
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" onclick="composeManager.closeGenerateModal()">
                Close
              </button>
              <button type="button" class="btn btn-ghost" onclick="composeManager.downloadGeneratedCompose()">
                ${getIcon('download')} Download
              </button>
              <button type="button" class="btn btn-primary" onclick="composeManager.deployGeneratedCompose()">
                ${getIcon('play')} Deploy
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Load and display compose projects
   */
  async loadProjects() {
    try {
      this.projects = await this.composeService.listComposeProjects();
      this.renderProjects();
    } catch (error) {
      console.error('Error loading compose projects:', error);
      this.showNotification('Error loading compose projects: ' + error.message, 'error');
    }
  }

  /**
   * Render compose projects list
   */
  renderProjects() {
    const list = document.getElementById('compose-projects-list');
    const noData = document.getElementById('no-compose-projects');

    if (!this.projects || this.projects.length === 0) {
      list.style.display = 'none';
      noData.style.display = 'flex';
      return;
    }

    noData.style.display = 'none';
    list.style.display = 'grid';

    list.innerHTML = this.projects.map(project => this.renderProjectCard(project)).join('');
  }

  /**
   * Render a single project card
   * @param {Object} project - Project data
   * @returns {string} HTML for project card
   */
  renderProjectCard(project) {
    const allRunning = project.services.every(s => s.status === 'running');
    const allStopped = project.services.every(s => s.status === 'exited' || s.status === 'created');
    const statusClass = allRunning ? 'running' : allStopped ? 'stopped' : 'mixed';
    const statusText = allRunning ? 'Running' : allStopped ? 'Stopped' : 'Mixed';

    return `
      <div class="compose-project-card">
        <div class="compose-project-header">
          <div class="compose-project-title">
            <span class="compose-project-icon">${getIcon('layers')}</span>
            <div>
              <h3>${project.name}</h3>
              <span class="compose-project-meta">${project.services.length} service${project.services.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <span class="compose-status compose-status-${statusClass}">${statusText}</span>
        </div>

        <div class="compose-services">
          ${project.services.map(service => `
            <div class="compose-service-item">
              <span class="service-status service-status-${service.status === 'running' ? 'running' : 'stopped'}"></span>
              <span class="service-name">${service.name}</span>
              <span class="service-image">${service.image}</span>
            </div>
          `).join('')}
        </div>

        <div class="compose-project-actions">
          ${!allRunning ? `
            <button class="btn btn-sm btn-success" onclick="composeManager.startProject('${project.name}')" data-tooltip="Start all services">
              ${getIcon('play')}
            </button>
          ` : ''}
          ${!allStopped ? `
            <button class="btn btn-sm btn-warning" onclick="composeManager.stopProject('${project.name}')" data-tooltip="Stop all services">
              ${getIcon('pause')}
            </button>
          ` : ''}
          <button class="btn btn-sm btn-danger" onclick="composeManager.confirmRemoveProject('${project.name}')" data-tooltip="Remove project">
            ${getIcon('trash')}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Open import modal
   */
  openImportModal() {
    document.getElementById('import-compose-modal').classList.add('active');
    document.getElementById('import-compose-content').value = '';
    document.getElementById('import-project-name').value = '';
    document.getElementById('compose-preview').style.display = 'none';
  }

  /**
   * Close import modal
   */
  closeImportModal() {
    document.getElementById('import-compose-modal').classList.remove('active');
  }

  /**
   * Open create modal
   */
  openCreateModal() {
    document.getElementById('create-compose-modal').classList.add('active');
    document.getElementById('create-compose-content').value = '';
    document.getElementById('create-project-name').value = '';
  }

  /**
   * Close create modal
   */
  closeCreateModal() {
    document.getElementById('create-compose-modal').classList.remove('active');
  }

  /**
   * Load template into editor
   */
  loadTemplate() {
    const template = getComposeTemplate();
    document.getElementById('create-compose-content').value = template;
    this.showNotification('Template loaded!', 'success');
  }

  /**
   * Validate and preview compose file
   */
  async validateAndPreview() {
    const content = document.getElementById('import-compose-content')?.value ||
                    document.getElementById('create-compose-content')?.value;

    if (!content) {
      this.showNotification('Please enter compose file content', 'warning');
      return;
    }

    const validation = this.composeService.validateCompose(content);

    if (!validation.valid) {
      this.showNotification('Validation errors: ' + validation.errors.join(', '), 'error');
      return;
    }

    if (validation.warnings.length > 0) {
      this.showNotification('Warnings: ' + validation.warnings.join(', '), 'warning');
    }

    try {
      const config = await this.composeService.parseComposeFile(content);
      const servicesCount = Object.keys(config.services || {}).length;
      this.showNotification(`Valid compose file! Found ${servicesCount} service${servicesCount !== 1 ? 's' : ''}`, 'success');

      // Show preview
      const previewDiv = document.getElementById('compose-preview');
      const servicesPreview = document.getElementById('compose-services-preview');
      if (previewDiv && servicesPreview) {
        servicesPreview.innerHTML = Object.entries(config.services || {})
          .map(([name, service]) => `
            <div class="preview-service">
              ${getIcon('check')} <strong>${name}</strong>: ${service.image}
            </div>
          `).join('');
        previewDiv.style.display = 'block';
      }
    } catch (error) {
      this.showNotification('Parse error: ' + error.message, 'error');
    }
  }

  /**
   * Handle import compose form submission
   * @param {Event} e - Form event
   */
  async handleImportCompose(e) {
    e.preventDefault();

    const content = document.getElementById('import-compose-content').value;
    const projectName = document.getElementById('import-project-name').value;

    this.showLoading('Deploying compose project...');

    try {
      const containerIds = await this.composeService.deployComposeFile(content, projectName);
      this.showNotification(`Project "${projectName}" deployed successfully! Created ${containerIds.length} container${containerIds.length !== 1 ? 's' : ''}`, 'success');
      this.closeImportModal();
      await this.loadProjects();
    } catch (error) {
      this.showNotification('Deploy failed: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Handle create compose form submission
   * @param {Event} e - Form event
   */
  async handleCreateCompose(e) {
    e.preventDefault();

    const content = document.getElementById('create-compose-content').value;
    const projectName = document.getElementById('create-project-name').value;

    this.showLoading('Deploying compose project...');

    try {
      const containerIds = await this.composeService.deployComposeFile(content, projectName);
      this.showNotification(`Project "${projectName}" deployed successfully! Created ${containerIds.length} container${containerIds.length !== 1 ? 's' : ''}`, 'success');
      this.closeCreateModal();
      await this.loadProjects();
    } catch (error) {
      this.showNotification('Deploy failed: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Stop a compose project
   * @param {string} projectName - Project name
   */
  async stopProject(projectName) {
    this.showLoading('Stopping project...');

    try {
      await this.composeService.stopComposeProject(projectName);
      this.showNotification(`Project "${projectName}" stopped`, 'success');
      await this.loadProjects();
    } catch (error) {
      this.showNotification('Stop failed: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Start a compose project (restart stopped containers)
   * @param {string} projectName - Project name
   */
  async startProject(projectName) {
    this.showLoading('Starting project...');

    try {
      // Get containers for this project and start them
      const project = this.projects.find(p => p.name === projectName);
      if (project) {
        for (const service of project.services) {
          await this.invoke('start_container', { containerId: service.container_id });
        }
        this.showNotification(`Project "${projectName}" started`, 'success');
        await this.loadProjects();
      }
    } catch (error) {
      this.showNotification('Start failed: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Confirm remove project
   * @param {string} projectName - Project name
   */
  confirmRemoveProject(projectName) {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <div class="confirm-modal-content">
        <div class="confirm-modal-header">
          <h3>Remove Compose Project</h3>
          <button class="confirm-modal-close" onclick="this.closest('.confirm-modal').remove()">×</button>
        </div>
        <div class="confirm-modal-body">
          <p>Are you sure you want to remove <strong>${projectName}</strong>?</p>
          <p style="color: var(--warning); margin-top: 0.5rem;">
            This will stop and remove all containers in this project.
          </p>
          <label class="confirm-checkbox">
            <input type="checkbox" id="remove-compose-volumes">
            <span>Also remove volumes and data</span>
          </label>
        </div>
        <div class="confirm-modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.confirm-modal').remove()">Cancel</button>
          <button class="btn btn-danger" onclick="composeManager.executeRemoveProject('${projectName}')">Remove</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
  }

  /**
   * Execute remove project
   * @param {string} projectName - Project name
   */
  async executeRemoveProject(projectName) {
    const checkbox = document.getElementById('remove-compose-volumes');
    const removeVolumes = checkbox ? checkbox.checked : false;

    document.querySelector('.confirm-modal')?.remove();
    this.showLoading('Removing project...');

    try {
      await this.composeService.removeComposeProject(projectName, removeVolumes);
      this.showNotification(`Project "${projectName}" removed`, 'success');
      await this.loadProjects();
    } catch (error) {
      this.showNotification('Remove failed: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Generate compose from selected containers
   * @param {Array<string>} containerIds - Selected container IDs
   */
  async generateFromContainers(containerIds) {
    if (!containerIds || containerIds.length === 0) {
      this.showNotification('Please select at least one container', 'warning');
      return;
    }

    this.showLoading('Generating compose file...');

    try {
      const yamlContent = await this.composeService.generateComposeFromContainers(containerIds);
      
      document.getElementById('generated-compose-content').value = yamlContent;
      document.getElementById('generated-project-name').value = 'generated-stack-' + Date.now();
      document.getElementById('generate-compose-modal').classList.add('active');
      
      this.showNotification(`Compose file generated from ${containerIds.length} container${containerIds.length !== 1 ? 's' : ''}!`, 'success');
    } catch (error) {
      this.showNotification('Generate failed: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Close generate modal
   */
  closeGenerateModal() {
    document.getElementById('generate-compose-modal').classList.remove('active');
  }

  /**
   * Download generated compose file
   */
  downloadGeneratedCompose() {
    const content = document.getElementById('generated-compose-content').value;
    const projectName = document.getElementById('generated-project-name').value || 'docker-compose';
    this.composeService.downloadComposeFile(content, `${projectName}.yml`);
    this.showNotification('Compose file downloaded!', 'success');
  }

  /**
   * Deploy generated compose file
   */
  async deployGeneratedCompose() {
    const content = document.getElementById('generated-compose-content').value;
    const projectName = document.getElementById('generated-project-name').value;

    if (!projectName) {
      this.showNotification('Please enter a project name', 'warning');
      return;
    }

    this.showLoading('Deploying project...');

    try {
      const containerIds = await this.composeService.deployComposeFile(content, projectName);
      this.showNotification(`Project deployed! Created ${containerIds.length} container${containerIds.length !== 1 ? 's' : ''}`, 'success');
      this.closeGenerateModal();
      await this.loadProjects();
    } catch (error) {
      this.showNotification('Deploy failed: ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }
}
