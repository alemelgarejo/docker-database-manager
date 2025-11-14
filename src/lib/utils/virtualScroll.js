/**
 * Virtual Scrolling Utility
 * 
 * Implements virtual scrolling for large lists to improve performance by only
 * rendering visible items in the viewport plus a buffer.
 * 
 * @class VirtualScroll
 */

export class VirtualScroll {
  /**
   * Creates a new VirtualScroll instance
   * 
   * @param {Object} config - Configuration object
   * @param {HTMLElement} config.container - Container element that holds the list
   * @param {HTMLElement} config.scrollContainer - Element that scrolls (may be same as container)
   * @param {Array} config.items - Array of items to render
   * @param {Function} config.renderItem - Function that returns HTML string for an item (item, index) => string
   * @param {number} [config.itemHeight=150] - Estimated height of each item in pixels
   * @param {number} [config.buffer=5] - Number of items to render outside viewport
   */
  constructor(config) {
    this.container = config.container;
    this.scrollContainer = config.scrollContainer || config.container;
    this.items = config.items || [];
    this.renderItem = config.renderItem;
    this.itemHeight = config.itemHeight || 150;
    this.buffer = config.buffer || 5;
    
    // State
    this.startIndex = 0;
    this.endIndex = 0;
    this.visibleCount = 0;
    this.scrollTop = 0;
    this.containerHeight = 0;
    
    // Spacer elements for maintaining scroll position
    this.topSpacer = null;
    this.bottomSpacer = null;
    this.contentWrapper = null;
    
    // Debounce scroll handler
    this.scrollTimeout = null;
    this.scrollHandler = this.handleScroll.bind(this);
    
    this.init();
  }

  /**
   * Initialize virtual scroll
   */
  init() {
    // Create spacers and content wrapper
    this.container.innerHTML = '';
    
    this.topSpacer = document.createElement('div');
    this.topSpacer.style.height = '0px';
    
    this.contentWrapper = document.createElement('div');
    this.contentWrapper.className = 'virtual-scroll-content';
    
    this.bottomSpacer = document.createElement('div');
    this.bottomSpacer.style.height = '0px';
    
    this.container.appendChild(this.topSpacer);
    this.container.appendChild(this.contentWrapper);
    this.container.appendChild(this.bottomSpacer);
    
    // Attach scroll listener
    this.scrollContainer.addEventListener('scroll', this.scrollHandler);
    
    // Initial render
    this.update();
  }

  /**
   * Handle scroll event with debouncing
   */
  handleScroll() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    this.scrollTimeout = setTimeout(() => {
      this.update();
    }, 16); // ~60fps
  }

  /**
   * Update visible items based on scroll position
   */
  update() {
    if (!this.items || this.items.length === 0) {
      this.contentWrapper.innerHTML = '';
      this.topSpacer.style.height = '0px';
      this.bottomSpacer.style.height = '0px';
      return;
    }
    
    // Get current scroll position and container height
    this.scrollTop = this.scrollContainer.scrollTop;
    this.containerHeight = this.scrollContainer.clientHeight;
    
    // Calculate visible range
    this.visibleCount = Math.ceil(this.containerHeight / this.itemHeight) + this.buffer * 2;
    this.startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.buffer);
    this.endIndex = Math.min(this.items.length, this.startIndex + this.visibleCount);
    
    // Update spacer heights
    const topSpacerHeight = this.startIndex * this.itemHeight;
    const bottomSpacerHeight = (this.items.length - this.endIndex) * this.itemHeight;
    
    this.topSpacer.style.height = `${topSpacerHeight}px`;
    this.bottomSpacer.style.height = `${bottomSpacerHeight}px`;
    
    // Render visible items
    this.render();
  }

  /**
   * Render visible items
   */
  render() {
    const visibleItems = this.items.slice(this.startIndex, this.endIndex);
    
    this.contentWrapper.innerHTML = visibleItems
      .map((item, localIndex) => {
        const globalIndex = this.startIndex + localIndex;
        return this.renderItem(item, globalIndex);
      })
      .join('');
  }

  /**
   * Update items and re-render
   * 
   * @param {Array} newItems - New array of items
   */
  setItems(newItems) {
    this.items = newItems || [];
    this.update();
  }

  /**
   * Scroll to specific item index
   * 
   * @param {number} index - Item index to scroll to
   */
  scrollToIndex(index) {
    const targetScroll = index * this.itemHeight;
    this.scrollContainer.scrollTop = targetScroll;
    this.update();
  }

  /**
   * Get current scroll info
   * 
   * @returns {Object} Scroll information
   */
  getScrollInfo() {
    return {
      startIndex: this.startIndex,
      endIndex: this.endIndex,
      visibleCount: this.visibleCount,
      totalItems: this.items.length,
      scrollTop: this.scrollTop
    };
  }

  /**
   * Destroy virtual scroll and clean up
   */
  destroy() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
    this.container.innerHTML = '';
  }

  /**
   * Refresh/re-render current view
   */
  refresh() {
    this.update();
  }
}
