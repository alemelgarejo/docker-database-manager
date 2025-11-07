/**
 * SearchFilters Component
 * Handles search and filter functionality for databases, images and migration
 */

export class SearchFilters {
  constructor(mode = 'databases') {
    // mode can be: 'databases', 'images', 'migration'
    this.mode = mode;
    
    // Initialize filters based on mode
    if (mode === 'images') {
      this.filters = {
        search: '',
        sortBy: 'name',
        sortOrder: 'asc'
      };
    } else if (mode === 'migration') {
      this.filters = {
        search: '',
        sortBy: 'name',
        sortOrder: 'asc'
      };
    } else {
      // Default for databases
      this.filters = {
        search: '',
        type: 'all',
        status: 'all',
        port: '',
        sortBy: 'name',
        sortOrder: 'asc'
      };
    }
    
    this.listeners = [];
  }

  /**
   * Subscribe to filter changes
   */
  onChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notify all listeners of filter changes
   */
  notifyChange() {
    for (const callback of this.listeners) {
      callback(this.filters);
    }
  }

  /**
   * Update a specific filter
   */
  updateFilter(key, value) {
    this.filters[key] = value;
    
    // Update reset button badge when filters change
    if (key !== 'sortBy' && key !== 'sortOrder') {
      const count = this.getActiveFiltersCount();
      this.updateResetButton(count);
    }
    
    this.notifyChange();
  }

  /**
   * Reset all filters
   */
  resetFilters() {
    if (this.mode === 'images' || this.mode === 'migration') {
      this.filters = {
        search: '',
        sortBy: 'name',
        sortOrder: 'asc'
      };
    } else {
      this.filters = {
        search: '',
        type: 'all',
        status: 'all',
        port: '',
        sortBy: 'name',
        sortOrder: 'asc'
      };
    }
    this.notifyChange();
  }

  /**
   * Filter and sort items (databases, images, or migration databases)
   */
  applyFilters(items) {
    let filtered = [...items];

    // Search filter
    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      filtered = filtered.filter(item => {
        if (this.mode === 'images') {
          // For images: search by tags and id
          return (item.tags?.some(tag => tag.toLowerCase().includes(searchLower))) ||
                 item.id?.toLowerCase().includes(searchLower);
        } else if (this.mode === 'migration') {
          // For migration: search by database name
          return item.name?.toLowerCase().includes(searchLower);
        } else {
          // For databases: search by name and type
          return item.name.toLowerCase().includes(searchLower) ||
                 item.db_type.toLowerCase().includes(searchLower);
        }
      });
    }

    // Type filter (only for databases)
    if (this.mode === 'databases' && this.filters.type !== 'all') {
      filtered = filtered.filter(db => db.db_type === this.filters.type);
    }

    // Status filter (only for databases)
    if (this.mode === 'databases' && this.filters.status !== 'all') {
      filtered = filtered.filter(db => db.status === this.filters.status);
    }

    // Port filter (only for databases)
    if (this.mode === 'databases' && this.filters.port) {
      filtered = filtered.filter(db => 
        db.port?.toString().includes(this.filters.port)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let compareA, compareB;

      switch (this.filters.sortBy) {
        case 'name':
          if (this.mode === 'images') {
            // For images, use the first tag as the name
            compareA = (a.tags?.[0] || '').toLowerCase();
            compareB = (b.tags?.[0] || '').toLowerCase();
          } else {
            compareA = a.name?.toLowerCase() || '';
            compareB = b.name?.toLowerCase() || '';
          }
          break;
        case 'type':
          if (this.mode === 'databases') {
            compareA = a.db_type;
            compareB = b.db_type;
          } else {
            compareA = a.name?.toLowerCase() || '';
            compareB = b.name?.toLowerCase() || '';
          }
          break;
        case 'status':
          compareA = a.status || '';
          compareB = b.status || '';
          break;
        case 'port':
          compareA = a.port || 0;
          compareB = b.port || 0;
          break;
        case 'size':
          // For images - need to parse size string for proper sorting
          if (this.mode === 'images') {
            const parseSize = (sizeStr) => {
              if (!sizeStr) return 0;
              const match = sizeStr.match(/(\d+\.?\d*)\s*(MB|GB|KB|B)/i);
              if (!match) return 0;
              const value = parseFloat(match[1]);
              const unit = match[2].toUpperCase();
              const multipliers = { B: 1, KB: 1024, MB: 1024*1024, GB: 1024*1024*1024 };
              return value * (multipliers[unit] || 1);
            };
            compareA = parseSize(a.size);
            compareB = parseSize(b.size);
          } else {
            compareA = a.size || 0;
            compareB = b.size || 0;
          }
          break;
        case 'created':
          compareA = new Date(a.created || 0).getTime();
          compareB = new Date(b.created || 0).getTime();
          break;
        default:
          if (this.mode === 'images') {
            compareA = (a.tags?.[0] || '').toLowerCase();
            compareB = (b.tags?.[0] || '').toLowerCase();
          } else {
            compareA = a.name || '';
            compareB = b.name || '';
          }
      }

      if (compareA < compareB) return this.filters.sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return this.filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  /**
   * Render the search and filters UI
   */
  render() {
    const activeFilters = this.getActiveFiltersCount();
    const placeholderText = this.mode === 'images' ? 'Search by image name or tag...' : 
                            this.mode === 'migration' ? 'Search by database name...' : 
                            'Search by name or type...';
    
    // Generate unique IDs based on mode
    const searchId = `search-input-${this.mode}`;
    const clearBtnId = `clear-search-btn-${this.mode}`;
    const sortById = `sort-by-${this.mode}`;
    const sortOrderBtnId = `sort-order-btn-${this.mode}`;
    const resetBtnId = `reset-filters-btn-${this.mode}`;
    
    return `
      <div class="search-filters-container">
        <!-- Search Bar -->
        <div class="search-bar">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            id="${searchId}" 
            placeholder="${placeholderText}" 
            value="${this.filters.search}"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
          ${this.filters.search ? `
            <button class="clear-search-btn" id="${clearBtnId}" data-tooltip="Clear search">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          ` : ''}
        </div>

        <!-- Filters Row -->
        <div class="filters-row">
          ${this.mode === 'databases' ? this.renderDatabaseFilters() : ''}
          
          <!-- Sort By -->
          <div class="filter-group">
            <label for="${sortById}">Sort by</label>
            <select id="${sortById}" class="filter-select">
              ${this.mode === 'images' ? `
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="created">Date</option>
              ` : this.mode === 'migration' ? `
                <option value="name">Name</option>
                <option value="created">Date</option>
              ` : `
                <option value="name">Name</option>
                <option value="type">Type</option>
                <option value="status">Status</option>
                <option value="port">Port</option>
                <option value="created">Date</option>
              `}
            </select>
          </div>

          <div class="filter-actions">
            <!-- Sort Order -->
            <button id="${sortOrderBtnId}" class="filter-action-btn" data-tooltip="Sort order: ${this.filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m7 15 5 5 5-5" opacity="${this.filters.sortOrder === 'desc' ? '1' : '0.3'}"></path>
                <path d="m7 9 5-5 5 5" opacity="${this.filters.sortOrder === 'asc' ? '1' : '0.3'}"></path>
              </svg>
            </button>

            <!-- Reset Filters -->
            <button id="${resetBtnId}" class="filter-action-btn ${activeFilters > 0 ? 'has-filters' : ''}" data-tooltip="Reset filters">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
              ${activeFilters > 0 ? `<span class="filter-badge">${activeFilters}</span>` : ''}
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render database-specific filters
   */
  renderDatabaseFilters() {
    return `
      <!-- Type Filter -->
      <div class="filter-group">
        <label for="filter-type">Type</label>
        <select id="filter-type" class="filter-select">
          <option value="all">All types</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="mongodb">MongoDB</option>
          <option value="redis">Redis</option>
          <option value="mariadb">MariaDB</option>
        </select>
      </div>

      <!-- Status Filter -->
      <div class="filter-group">
        <label for="filter-status">Status</label>
        <select id="filter-status" class="filter-select">
          <option value="all">All status</option>
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
          <option value="exited">Exited</option>
        </select>
      </div>

      <!-- Port Filter -->
      <div class="filter-group">
        <label for="filter-port">Port</label>
        <input 
          type="text" 
          id="filter-port" 
          class="filter-input" 
          placeholder="Filter..."
          value="${this.filters.port || ''}"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
      </div>
    `;
  }

  /**
   * Attach event listeners after rendering
   */
  attachEventListeners() {
    // Generate unique IDs based on mode
    const searchId = `search-input-${this.mode}`;
    const clearBtnId = `clear-search-btn-${this.mode}`;
    const sortById = `sort-by-${this.mode}`;
    const sortOrderBtnId = `sort-order-btn-${this.mode}`;
    const resetBtnId = `reset-filters-btn-${this.mode}`;
    
    // Search input
    const searchInput = document.getElementById(searchId);
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.updateFilter('search', e.target.value);
        // Only update the clear button, not the whole component
        this.updateClearButton(e.target.value);
      });
    }

    // Clear search button
    const clearSearchBtn = document.getElementById(clearBtnId);
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        this.updateFilter('search', '');
        const searchInput = document.getElementById(searchId);
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        // Update the clear button visibility
        this.updateClearButton('');
      });
    }

    // Database-specific filters
    if (this.mode === 'databases') {
      // Type filter
      const filterType = document.getElementById('filter-type');
      if (filterType) {
        filterType.value = this.filters.type;
        filterType.addEventListener('change', (e) => {
          this.updateFilter('type', e.target.value);
        });
      }

      // Status filter
      const filterStatus = document.getElementById('filter-status');
      if (filterStatus) {
        filterStatus.value = this.filters.status;
        filterStatus.addEventListener('change', (e) => {
          this.updateFilter('status', e.target.value);
        });
      }

      // Port filter
      const filterPort = document.getElementById('filter-port');
      if (filterPort) {
        filterPort.addEventListener('input', (e) => {
          this.updateFilter('port', e.target.value);
        });
      }
    }

    // Sort by
    const sortBy = document.getElementById(sortById);
    if (sortBy) {
      sortBy.value = this.filters.sortBy;
      sortBy.addEventListener('change', (e) => {
        this.updateFilter('sortBy', e.target.value);
      });
    }

    // Sort order button
    const sortOrderBtn = document.getElementById(sortOrderBtnId);
    if (sortOrderBtn) {
      sortOrderBtn.addEventListener('click', () => {
        const newOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc';
        this.updateFilter('sortOrder', newOrder);
        // Update only the icon and tooltip
        this.updateSortOrderButton(newOrder);
      });
    }

    // Reset filters button
    const resetBtn = document.getElementById(resetBtnId);
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
        // Reset UI values
        const searchInput = document.getElementById(searchId);
        const sortBy = document.getElementById(sortById);
        
        if (searchInput) searchInput.value = '';
        if (sortBy) sortBy.value = 'name';
        
        // For database mode, reset additional filters
        if (this.mode === 'databases') {
          const filterType = document.getElementById('filter-type');
          const filterStatus = document.getElementById('filter-status');
          const filterPort = document.getElementById('filter-port');
          
          if (filterType) filterType.value = 'all';
          if (filterStatus) filterStatus.value = 'all';
          if (filterPort) filterPort.value = '';
        }
        
        // Update UI elements
        this.updateClearButton('');
        this.updateSortOrderButton('asc');
        this.updateResetButton(0);
      });
    }
  }

  /**
   * Re-render the component (helper method)
   */
  reRender() {
    const container = document.querySelector('.search-filters-container');
    if (container?.parentElement) {
      container.parentElement.innerHTML = this.render();
      this.attachEventListeners();
    }
  }

  /**
   * Update only the clear button without re-rendering
   */
  updateClearButton(searchValue) {
    const searchBar = document.querySelector('.search-bar');
    if (!searchBar) return;

    const clearBtnId = `clear-search-btn-${this.mode}`;
    const searchId = `search-input-${this.mode}`;
    const existingClearBtn = document.getElementById(clearBtnId);
    
    if (searchValue && !existingClearBtn) {
      // Add clear button
      const clearBtn = document.createElement('button');
      clearBtn.className = 'clear-search-btn';
      clearBtn.id = clearBtnId;
      clearBtn.setAttribute('data-tooltip', 'Clear search');
      clearBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      clearBtn.addEventListener('click', () => {
        this.updateFilter('search', '');
        const searchInput = document.getElementById(searchId);
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        this.updateClearButton('');
      });
      searchBar.appendChild(clearBtn);
    } else if (!searchValue && existingClearBtn) {
      // Remove clear button
      existingClearBtn.remove();
    }
  }

  /**
   * Update only the sort order button without re-rendering
   */
  updateSortOrderButton(order) {
    const sortOrderBtnId = `sort-order-btn-${this.mode}`;
    const sortOrderBtn = document.getElementById(sortOrderBtnId);
    if (!sortOrderBtn) return;

    sortOrderBtn.setAttribute('data-tooltip', `Sort order: ${order === 'asc' ? 'Ascending' : 'Descending'}`);
    sortOrderBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m7 15 5 5 5-5" opacity="${order === 'desc' ? '1' : '0.3'}"></path>
        <path d="m7 9 5-5 5 5" opacity="${order === 'asc' ? '1' : '0.3'}"></path>
      </svg>
    `;
  }

  /**
   * Update only the reset filters button badge
   */
  updateResetButton(count) {
    const resetBtnId = `reset-filters-btn-${this.mode}`;
    const resetBtn = document.getElementById(resetBtnId);
    if (!resetBtn) return;

    if (count > 0) {
      resetBtn.classList.add('has-filters');
      const existingBadge = resetBtn.querySelector('.filter-badge');
      if (existingBadge) {
        existingBadge.textContent = count;
      } else {
        const badge = document.createElement('span');
        badge.className = 'filter-badge';
        badge.textContent = count;
        resetBtn.appendChild(badge);
      }
    } else {
      resetBtn.classList.remove('has-filters');
      const existingBadge = resetBtn.querySelector('.filter-badge');
      if (existingBadge) {
        existingBadge.remove();
      }
    }
  }

  /**
   * Get active filters count (excluding sort)
   */
  getActiveFiltersCount() {
    let count = 0;
    if (this.filters.search) count++;
    
    // Database-specific filters
    if (this.mode === 'databases') {
      if (this.filters.type !== 'all') count++;
      if (this.filters.status !== 'all') count++;
      if (this.filters.port) count++;
    }
    
    return count;
  }
}
