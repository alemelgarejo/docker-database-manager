/**
 * Docker Compose Service
 * Handles all Docker Compose related operations
 */

import { validateComposeYAML } from '../utils/yaml.js';

export class ComposeService {
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * Parse a docker-compose.yml file content
   * @param {string} yamlContent - YAML content
   * @returns {Promise<Object>} Parsed compose configuration
   */
  async parseComposeFile(yamlContent) {
    try {
      const result = await this.invoke('parse_compose_file', { yamlContent });
      return result;
    } catch (error) {
      throw new Error(`Failed to parse compose file: ${error}`);
    }
  }

  /**
   * Generate docker-compose.yml from existing containers
   * @param {Array<string>} containerIds - List of container IDs
   * @returns {Promise<string>} Generated YAML content
   */
  async generateComposeFromContainers(containerIds) {
    try {
      const yamlContent = await this.invoke('generate_compose_from_containers', {
        containerIds
      });
      return yamlContent;
    } catch (error) {
      throw new Error(`Failed to generate compose file: ${error}`);
    }
  }

  /**
   * Deploy a docker-compose file
   * @param {string} yamlContent - YAML content
   * @param {string} projectName - Project name
   * @returns {Promise<Array<string>>} List of created container IDs
   */
  async deployComposeFile(yamlContent, projectName) {
    try {
      const containerIds = await this.invoke('deploy_compose_file', {
        yamlContent,
        projectName
      });
      return containerIds;
    } catch (error) {
      throw new Error(`Failed to deploy compose file: ${error}`);
    }
  }

  /**
   * List all compose projects
   * @returns {Promise<Array<Object>>} List of compose projects
   */
  async listComposeProjects() {
    try {
      const projects = await this.invoke('list_compose_projects');
      return projects;
    } catch (error) {
      throw new Error(`Failed to list compose projects: ${error}`);
    }
  }

  /**
   * Stop a compose project
   * @param {string} projectName - Project name
   * @returns {Promise<void>}
   */
  async stopComposeProject(projectName) {
    try {
      await this.invoke('stop_compose_project', { projectName });
    } catch (error) {
      throw new Error(`Failed to stop compose project: ${error}`);
    }
  }

  /**
   * Remove a compose project
   * @param {string} projectName - Project name
   * @param {boolean} removeVolumes - Whether to remove volumes
   * @returns {Promise<void>}
   */
  async removeComposeProject(projectName, removeVolumes = false) {
    try {
      await this.invoke('remove_compose_project', {
        projectName,
        removeVolumes
      });
    } catch (error) {
      throw new Error(`Failed to remove compose project: ${error}`);
    }
  }

  /**
   * Validate compose file content
   * @param {string} yamlContent - YAML content
   * @returns {Object} Validation result
   */
  validateCompose(yamlContent) {
    return validateComposeYAML(yamlContent);
  }

  /**
   * Download compose file content as .yml file
   * @param {string} yamlContent - YAML content
   * @param {string} fileName - File name (default: docker-compose.yml)
   */
  downloadComposeFile(yamlContent, fileName = 'docker-compose.yml') {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
