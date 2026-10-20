/**
 * LUNAR Toast Notification Component (toast.js)
 * Accessible, minimalist feedback message for cart and form interactions.
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (typeof document === 'undefined') return;
    
    let container = document.getElementById('lunar-toast-region');
    if (!container) {
      container = document.createElement('div');
      container.id = 'lunar-toast-region';
      container.className = 'toast-region';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }
    this.container = container;
  }

  show(message, type = 'info', duration = 3500) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');

    const glyph = type === 'success' ? '&#x25CB;' : type === 'warning' ? '&#x25D1;' : '&#x25D0;';
    toast.innerHTML = `
      <span class="lunar-glyph" aria-hidden="true">${glyph}</span>
      <span class="toast-message">${message}</span>
      <button type="button" class="toast-close" aria-label="Dismiss notification">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 250);
    };

    closeBtn.addEventListener('click', dismiss);
    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
  }
}

export const Toast = new ToastManager();
if (typeof window !== 'undefined') {
  window.LunarToast = Toast;
}
