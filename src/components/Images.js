// Images Component
import { getIcon } from '../icons.js';

export class Images {
  constructor(invoke) {
    this.invoke = invoke;
  }

  async load() {
    try {
      console.log('Loading images...');
      const images = await this.invoke('list_images');
      this.render(images);
    } catch (error) {
      console.error('Error loading images:', error);
      this.renderError();
    }
  }

  render(images) {
    const container = document.getElementById('images-grid');
    
    if (!container) {
      console.error('Element #images-grid not found');
      return;
    }

    if (!images || images.length === 0) {
      container.innerHTML = `
        <div class="no-data">
          <p>No database images found. Images are downloaded automatically when you create a database.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = images.map(img => this.renderImageCard(img)).join('');
  }

  renderImageCard(image) {
    const tags = image.tags.join(', ') || 'No tags';
    const dbType = this.detectDbType(image.tags);
    const icon = this.getDbIcon(dbType);

    return `
      <div class="db-card">
        <div class="db-card-header">
          <div class="db-card-icon" data-db-type="${dbType}">
            ${icon}
          </div>
          <div class="db-card-title-section">
            <h3 class="db-card-title">${tags}</h3>
            <span class="db-card-subtitle">${image.size}</span>
          </div>
        </div>
        
        <div class="db-card-info">
          <div class="db-info-item">
            <span class="db-info-label">Created</span>
            <span class="db-info-value">${image.created || 'Unknown'}</span>
          </div>
          <div class="db-info-item">
            <span class="db-info-label">Image ID</span>
            <span class="db-info-value">${image.id.substring(0, 12)}</span>
          </div>
        </div>

        <div class="db-card-actions">
          <button class="action-btn action-btn-danger" onclick="confirmRemoveImage('${image.id}', '${tags}')" data-tooltip="Delete image">
            ${getIcon('trash')}
          </button>
        </div>
      </div>
    `;
  }

  detectDbType(tags) {
    const tagStr = tags.join(' ').toLowerCase();
    if (tagStr.includes('postgres')) return 'postgresql';
    if (tagStr.includes('mysql')) return 'mysql';
    if (tagStr.includes('mongo')) return 'mongodb';
    if (tagStr.includes('redis')) return 'redis';
    if (tagStr.includes('mariadb')) return 'mariadb';
    return 'database';
  }

  getDbIcon(dbType) {
    const iconMap = {
      postgresql: 'postgresql',
      mysql: 'mysql',
      mongodb: 'mongodb',
      redis: 'redis',
      mariadb: 'mariadb',
      database: 'database'
    };
    return getIcon(iconMap[dbType]);
  }

  renderError() {
    const container = document.getElementById('images-grid');
    if (container) {
      container.innerHTML = `
        <div class="no-data">
          <p>Error loading images. Please try again.</p>
        </div>
      `;
    }
  }
}
