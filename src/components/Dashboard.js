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
        this.invoke('list_images'),
      ]);

      const totalContainers = containers.length;
      const runningContainers = containers.filter(
        (c) => c.status === 'running',
      ).length;
      const stoppedContainers = containers.filter(
        (c) => c.status !== 'running',
      ).length;
      const totalImages = images.length;

      this.updateStatsUI(
        totalContainers,
        runningContainers,
        stoppedContainers,
        totalImages,
      );
      this.renderRecentContainers(containers.slice(0, 5));

      console.log('Dashboard stats loaded successfully');
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }

  updateStatsUI(total, running, stopped, images) {
    const statsData = [
      {
        id: 'stat-total',
        value: total,
        label: 'Total Databases',
        icon: 'database',
        color: 'blue',
      },
      {
        id: 'stat-running',
        value: running,
        label: 'Running',
        icon: 'play',
        color: 'green',
      },
      {
        id: 'stat-stopped',
        value: stopped,
        label: 'Stopped',
        icon: 'pause',
        color: 'red',
      },
      {
        id: 'stat-images',
        value: images,
        label: 'Images',
        icon: 'package',
        color: 'purple',
      },
    ];

    statsData.forEach((stat) => {
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

    recentContainer.innerHTML = containers
      .map((c) => this.renderRecentCard(c))
      .join('');
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
    const statusIcon =
      container.status === 'running' ? getIcon('play') : getIcon('pause');
    const statusClass = container.status === 'running' ? 'running' : 'stopped';

    return `
      <div class="recent-card" onclick="switchTab('databases')">
        <div class="recent-card-left">
          <div class="recent-db-icon" data-db-type="${container.db_type}">
            ${dbIcon}
          </div>
          <div class="recent-info">
            <div class="recent-title">${container.name}</div>
            <div class="recent-meta">
              ${container.db_type.toUpperCase()} ${container.version || ''} • Port ${container.port}
            </div>
          </div>
        </div>
        <div class="recent-status-badge status-${statusClass}">
          ${statusIcon}
          <span>${container.status}</span>
        </div>
      </div>
    `;
  }
}
