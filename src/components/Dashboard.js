// Dashboard Component
import { getIcon } from '../icons.js';

export class Dashboard {
  constructor(invoke) {
    this.invoke = invoke;
  }

  async loadStats() {
    try {
      console.log('Loading dashboard stats...');
      const [containers, images] = await Promise.all([
        this.invoke('list_containers'),
        this.invoke('list_images')
      ]);

      const totalContainers = containers.length;
      const runningContainers = containers.filter(c => c.status === 'running').length;
      const stoppedContainers = containers.filter(c => c.status !== 'running').length;
      const totalImages = images.length;

      this.updateStatsUI(totalContainers, runningContainers, stoppedContainers, totalImages);
      this.renderRecentContainers(containers.slice(0, 5));

      console.log('Dashboard stats loaded successfully');
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }

  updateStatsUI(total, running, stopped, images) {
    const statsData = [
      { id: 'stat-total', value: total, label: 'Total Databases', icon: 'database', color: 'blue' },
      { id: 'stat-running', value: running, label: 'Running', icon: 'play', color: 'green' },
      { id: 'stat-stopped', value: stopped, label: 'Stopped', icon: 'pause', color: 'red' },
      { id: 'stat-images', value: images, label: 'Images', icon: 'package', color: 'purple' }
    ];

    statsData.forEach(stat => {
      const element = document.getElementById(stat.id);
      if (element) {
        element.textContent = stat.value;
      }
    });
  }

  renderRecentContainers(containers) {
    const recentContainer = document.getElementById('recent-containers');
    
    if (!recentContainer) {
      console.error('Element #recent-containers not found');
      return;
    }
    
    if (!containers || containers.length === 0) {
      recentContainer.innerHTML = `
        <div class="no-data">
          <p>No databases created yet. Create your first one!</p>
        </div>
      `;
      return;
    }

    recentContainer.innerHTML = containers.map(c => this.renderRecentCard(c)).join('');
  }

  renderRecentCard(container) {
    const dbIconMap = {
      postgresql: 'postgresql',
      mysql: 'mysql',
      mongodb: 'mongodb',
      redis: 'redis',
      mariadb: 'mariadb',
    };
    const dbIcon = getIcon(dbIconMap[container.db_type] || 'database');
    const statusClass = container.status === 'running' ? 'running' : 'stopped';
    const statusIcon = container.status === 'running' ? getIcon('play') : getIcon('pause');

    return `
      <div class="db-card" onclick="switchTab('databases')">
        <div class="db-card-header">
          <div class="db-card-icon" data-db-type="${container.db_type}">
            ${dbIcon}
          </div>
          <div class="db-card-title-section">
            <h3 class="db-card-title">${container.name}</h3>
            <span class="db-card-subtitle">${container.db_type.toUpperCase()}</span>
          </div>
          <div class="db-status db-status-${statusClass}">
            ${statusIcon}
            <span>${container.status}</span>
          </div>
        </div>
        
        <div class="db-card-info">
          <div class="db-info-item">
            <span class="db-info-label">Port</span>
            <span class="db-info-value">${container.port}</span>
          </div>
        </div>
      </div>
    `;
  }
}
