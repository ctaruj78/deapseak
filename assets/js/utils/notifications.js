/**
 * Notification Helper - toast messages
 */
class Notifier {
  static show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.role = 'alert';
    toast.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const container = document.getElementById('toastContainer') || 
                     document.querySelector('.toast-container') ||
                     document.body;
    
    container.appendChild(toast);

    if (duration) {
      setTimeout(() => toast.remove(), duration);
    }

    return toast;
  }

  static success(message) { this.show(message, 'success'); }
  static error(message) { this.show(message, 'danger'); }
  static warning(message) { this.show(message, 'warning'); }
  static info(message) { this.show(message, 'info'); }
}
