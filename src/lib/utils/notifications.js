/**
 * Notification utilities
 */

let notificationTimeout;

export function showNotification(message, type = 'info') {
  const colors = {
    success: '#10b981',
    error: '#dc2626',
    info: '#3b82f6',
    warning: '#f59e0b',
  };

  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 9999;
    background: ${colors[type] || colors.success};
    color: white;
    padding: 1rem 1.5rem;
    padding-right: 3rem;
    border-radius: 8px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
    max-width: 400px;
    display: flex;
    align-items: center;
    gap: 1rem;
    animation: slideIn 0.3s ease;
  `;
  
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  messageSpan.style.flex = '1';
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: transparent;
    border: none;
    color: white;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s ease;
  `;
  
  closeBtn.onmouseover = () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  };
  
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'transparent';
  };
  
  notif.appendChild(messageSpan);
  notif.appendChild(closeBtn);
  document.body.appendChild(notif);

  const duration = type === 'info' ? 5000 : 3000;
  const timeoutId = setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  }, duration);
  
  // Clear timeout if manually closed
  closeBtn.onclick = () => {
    clearTimeout(timeoutId);
    notif.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  };
}

export function hideNotification() {
  const notifications = document.querySelectorAll('[style*="slideIn"]');
  notifications.forEach(notif => {
    notif.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  });
}
