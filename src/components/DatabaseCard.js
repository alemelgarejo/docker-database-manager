// Database Card Component
import { getIcon } from '../icons.js';

export class DatabaseCard {
  static render(container, _actions) {
    const dbIconMap = {
      postgresql: 'postgresql',
      mysql: 'mysql',
      mongodb: 'mongodb',
      redis: 'redis',
      mariadb: 'mariadb',
    };
    const dbIcon = getIcon(dbIconMap[container.db_type] || 'database');
    const statusClass = container.status === 'running' ? 'running' : 'stopped';
    const statusIcon =
      container.status === 'running' ? getIcon('play') : getIcon('pause');

    return `
      <div class="db-card">
        <div class="db-card-header">
          <div class="db-card-icon" data-db-type="${container.db_type}">
            ${dbIcon}
          </div>
          <div class="db-card-title-section">
            <h3 class="db-card-title">${container.name}</h3>
            <span class="db-card-subtitle">${container.db_type.toUpperCase()} ${container.version || ''}</span>
          </div>
          <div class="db-status db-status-${statusClass}">
            ${statusIcon}
            <span>${container.status}</span>
          </div>
        </div>
        
        <div class="db-card-info">
          <div class="db-info-item clickable" onclick="copyToClipboard('localhost', this)" data-tooltip="Click to copy">
            <span class="db-info-label">Host</span>
            <span class="db-info-value">localhost</span>
          </div>
          <div class="db-info-item clickable" onclick="copyToClipboard('${container.port}', this)" data-tooltip="Click to copy">
            <span class="db-info-label">Port</span>
            <span class="db-info-value">${container.port}</span>
          </div>
          ${
            container.username
              ? `
          <div class="db-info-item clickable" onclick="copyToClipboard('${container.username}', this)" data-tooltip="Click to copy">
            <span class="db-info-label">Username</span>
            <span class="db-info-value">${container.username}</span>
          </div>
          `
              : ''
          }
          ${
            container.password
              ? `
          <div class="db-info-item clickable" onclick="copyToClipboard('${container.password}', this)" data-tooltip="Click to copy">
            <span class="db-info-label">Password</span>
            <span class="db-info-value">••••••••</span>
          </div>
          `
              : ''
          }
        </div>

        <div class="db-card-actions">
          ${
            container.status === 'running'
              ? `
            <button class="action-btn" onclick="stopC('${container.id}')" data-tooltip="Stop database">
              ${getIcon('pause')}
            </button>
            <button class="action-btn" onclick="restartC('${container.id}')" data-tooltip="Restart database">
              ${getIcon('refresh')}
            </button>
            ${
              container.db_type !== 'redis'
                ? `
            <button class="action-btn" onclick="showSQL('${container.id}', '${container.db_type}')" data-tooltip="Execute SQL">
              ${getIcon('terminal')}
            </button>
            `
                : ''
            }
          `
              : `
            <button class="action-btn" onclick="startC('${container.id}')" data-tooltip="Start database">
              ${getIcon('play')}
            </button>
          `
          }
          <button class="action-btn" onclick="showLogs('${container.id}')" data-tooltip="View logs">
            ${getIcon('fileText')}
          </button>
          <button class="action-btn action-btn-danger" onclick="confirmRemove('${container.id}', '${container.name}')" data-tooltip="Delete database">
            ${getIcon('trash')}
          </button>
        </div>
      </div>
    `;
  }
}
