/**
 * CustomSelect Component
 * Replaces native select elements with styled custom dropdowns
 */

export class CustomSelect {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.options = {
      placeholder: options.placeholder || 'Select an option',
      onChange: options.onChange || null,
      value: options.value || '',
      items: options.items || [],
      required: options.required || false,
      disabled: options.disabled || false,
    };
    
    this.selectedValue = this.options.value;
    this.isOpen = false;
    
    this.render();
    this.attachEvents();
  }

  render() {
    if (!this.container) return;
    
    const selectedItem = this.options.items.find(item => item.value === this.selectedValue);
    const displayText = selectedItem ? selectedItem.label : this.options.placeholder;
    
    this.container.innerHTML = `
      <div class="custom-select ${this.options.disabled ? 'disabled' : ''}" data-required="${this.options.required}">
        <div class="custom-select-trigger">
          <span class="custom-select-value">${displayText}</span>
          <svg class="custom-select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="custom-select-dropdown">
          ${this.options.items.map(item => `
            <div class="custom-select-option ${item.value === this.selectedValue ? 'selected' : ''}" data-value="${item.value}">
              ${item.label}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  attachEvents() {
    if (!this.container) return;
    
    const trigger = this.container.querySelector('.custom-select-trigger');
    const dropdown = this.container.querySelector('.custom-select-dropdown');
    const options = this.container.querySelectorAll('.custom-select-option');
    
    if (!trigger || !dropdown) return;
    
    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
      if (this.options.disabled) return;
      e.stopPropagation();
      this.toggle();
    });
    
    // Select option
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.getAttribute('data-value');
        this.setValue(value);
        this.close();
      });
    });
    
    // Close on outside click
    const closeOnOutsideClick = (e) => {
      if (!this.container.contains(e.target)) {
        this.close();
      }
    };
    document.addEventListener('click', closeOnOutsideClick);
    
    // Close on scroll (to prevent floating dropdown)
    const closeOnScroll = () => {
      if (this.isOpen) {
        this.close();
      }
    };
    
    // Listen to scroll on window and modal body
    window.addEventListener('scroll', closeOnScroll, true);
    
    // Store cleanup function
    this._cleanupFn = () => {
      document.removeEventListener('click', closeOnOutsideClick);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.options.disabled) return;
    
    const selectEl = this.container.querySelector('.custom-select');
    const dropdown = this.container.querySelector('.custom-select-dropdown');
    const trigger = this.container.querySelector('.custom-select-trigger');
    
    if (!selectEl || !dropdown || !trigger) return;
    
    // Close all other custom selects first
    document.querySelectorAll('.custom-select.open').forEach(el => {
      if (el !== selectEl) {
        const otherDropdown = el.querySelector('.custom-select-dropdown');
        if (otherDropdown) {
          otherDropdown.style.cssText = '';
        }
        el.classList.remove('open', 'open-upward', 'in-modal');
      }
    });
    
    // Get measurements
    const triggerRect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    
    // Temporarily show dropdown to measure it
    dropdown.style.visibility = 'hidden';
    dropdown.style.display = 'block';
    const dropdownHeight = dropdown.scrollHeight;
    dropdown.style.display = '';
    dropdown.style.visibility = '';
    
    const isInModal = !!this.container.closest('.modal');
    const shouldOpenUpward = spaceBelow < dropdownHeight + 20 && spaceAbove > spaceBelow;
    
    // Setup positioning
    if (isInModal) {
      selectEl.classList.add('in-modal');
      dropdown.style.position = 'fixed';
      dropdown.style.left = triggerRect.left + 'px';
      dropdown.style.width = triggerRect.width + 'px';
      dropdown.style.right = 'auto';
      
      if (shouldOpenUpward) {
        selectEl.classList.add('open-upward');
        dropdown.style.bottom = (window.innerHeight - triggerRect.top) + 'px';
        dropdown.style.top = 'auto';
      } else {
        dropdown.style.top = triggerRect.bottom + 'px';
        dropdown.style.bottom = 'auto';
      }
    } else {
      if (shouldOpenUpward) {
        selectEl.classList.add('open-upward');
      }
    }
    
    // Force reflow to ensure position is applied
    dropdown.offsetHeight;
    
    // Now add open class for animation
    selectEl.classList.add('open');
    this.isOpen = true;
  }

  close() {
    const selectEl = this.container.querySelector('.custom-select');
    const dropdown = this.container.querySelector('.custom-select-dropdown');
    
    if (selectEl) {
      selectEl.classList.remove('open', 'open-upward', 'in-modal');
    }
    
    if (dropdown) {
      // Reset all inline styles
      dropdown.style.cssText = '';
    }
    
    this.isOpen = false;
  }

  setValue(value, silent = false) {
    this.selectedValue = value;
    
    // Update UI
    const valueSpan = this.container.querySelector('.custom-select-value');
    const options = this.container.querySelectorAll('.custom-select-option');
    
    const selectedItem = this.options.items.find(item => item.value === value);
    if (valueSpan && selectedItem) {
      valueSpan.textContent = selectedItem.label;
    }
    
    options.forEach(option => {
      if (option.getAttribute('data-value') === value) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
    
    // Call onChange callback
    if (!silent && this.options.onChange) {
      this.options.onChange(value);
    }
  }

  getValue() {
    return this.selectedValue;
  }

  setItems(items) {
    this.options.items = items;
    this.render();
    this.attachEvents();
  }

  enable() {
    this.options.disabled = false;
    const selectEl = this.container.querySelector('.custom-select');
    if (selectEl) {
      selectEl.classList.remove('disabled');
    }
  }

  disable() {
    this.options.disabled = true;
    this.close();
    const selectEl = this.container.querySelector('.custom-select');
    if (selectEl) {
      selectEl.classList.add('disabled');
    }
  }

  destroy() {
    // Call cleanup function if exists
    if (this._cleanupFn) {
      this._cleanupFn();
    }
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
