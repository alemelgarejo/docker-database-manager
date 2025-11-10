/**
 * Modal Manager
 * Manages modal states and operations
 */

export class ModalManager {
  /**
   * Open a modal
   */
  static open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }

  /**
   * Close a modal
   */
  static close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  /**
   * Toggle a modal
   */
  static toggle(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.toggle('active');
    }
  }

  /**
   * Close all modals
   */
  static closeAll() {
    document.querySelectorAll('.modal.active').forEach((modal) => {
      modal.classList.remove('active');
    });
  }

  /**
   * Check if a modal is open
   */
  static isOpen(modalId) {
    const modal = document.getElementById(modalId);
    return modal ? modal.classList.contains('active') : false;
  }
}
