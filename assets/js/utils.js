// DeapSeaK System - Common Utilities
// ==================================

// API Helper Functions
const API = {
    baseURL: '/api',
    token: localStorage.getItem('token'),
    
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    },
    
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    },
    
    async request(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API Error');
            }
            
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    },
    
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// Utility Functions
const Utils = {
    // Date formatting
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(date).toLocaleDateString('uk-UA', { ...defaultOptions, ...options });
    },
    
    // Relative time formatting
    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'щойно';
        if (minutes < 60) return `${minutes} хв тому`;
        if (hours < 24) return `${hours} год тому`;
        return `${days} дн тому`;
    },
    
    // Status badge generation
    getStatusBadge(status) {
        const statusMap = {
            'active': { text: 'Активний', class: 'badge-success' },
            'inactive': { text: 'Неактивний', class: 'badge-secondary' },
            'maintenance': { text: 'Обслуговування', class: 'badge-warning' },
            'broken': { text: 'Поломка', class: 'badge-danger' },
            'pending': { text: 'Очікування', class: 'badge-warning' },
            'in_progress': { text: 'В процесі', class: 'badge-primary' },
            'completed': { text: 'Завершено', class: 'badge-success' },
            'cancelled': { text: 'Скасовано', class: 'badge-secondary' }
        };
        
        const config = statusMap[status] || { text: status, class: 'badge-secondary' };
        return `<span class="badge ${config.class}">${config.text}</span>`;
    },
    
    // Priority badge generation
    getPriorityBadge(priority) {
        const priorityMap = {
            'low': { text: 'Низький', class: 'badge-success' },
            'medium': { text: 'Середній', class: 'badge-warning' },
            'high': { text: 'Високий', class: 'badge-danger' },
            'critical': { text: 'КРИТИЧНИЙ', class: 'badge-danger' }
        };
        
        const config = priorityMap[priority] || { text: priority, class: 'badge-secondary' };
        return `<span class="badge ${config.class}">${config.text}</span>`;
    },
    
    // Form validation
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    validatePhone(phone) {
        const re = /^[\+]?3?[\s]?8?[\s]?\(?0\d{2}?\)?[\s]?\d{3}[\s|-]?\d{2}[\s|-]?\d{2}$/;
        return re.test(phone);
    },
    
    // Generate random ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },
    
    // Deep clone object
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Capitalize first letter
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    // Truncate text
    truncate(str, length = 50) {
        return str.length > length ? str.substring(0, length) + '...' : str;
    }
};

// Notification System
const Notifications = {
    container: null,
    
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notifications-container';
            this.container.className = 'position-fixed top-0 end-0 p-3';
            this.container.style.zIndex = '1055';
            document.body.appendChild(this.container);
        }
    },
    
    show(message, type = 'info', duration = 5000) {
        this.init();
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0 mb-2`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${this.getIcon(type)} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        this.container.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast, { delay: duration });
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
        
        return toast;
    },
    
    success(message, duration) {
        return this.show(message, 'success', duration);
    },
    
    error(message, duration) {
        return this.show(message, 'danger', duration);
    },
    
    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },
    
    info(message, duration) {
        return this.show(message, 'info', duration);
    },
    
    getIcon(type) {
        const icons = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle',
            'primary': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
};

// Loading Indicator
const Loading = {
    element: null,
    
    show(message = 'Завантаження...') {
        if (this.element) return;
        
        this.element = document.createElement('div');
        this.element.className = 'loading-overlay position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
        this.element.style.backgroundColor = 'rgba(0,0,0,0.7)';
        this.element.style.zIndex = '9999';
        this.element.innerHTML = `
            <div class="text-center text-white">
                <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="fs-5">${message}</div>
            </div>
        `;
        
        document.body.appendChild(this.element);
    },
    
    hide() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
};

// Modal Helper
const Modal = {
    show(modalId, data = null) {
        const modal = document.getElementById(modalId);
        if (!modal) return null;
        
        if (data) {
            this.populateModal(modal, data);
        }
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        return bsModal;
    },
    
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    },
    
    populateModal(modal, data) {
        Object.keys(data).forEach(key => {
            const element = modal.querySelector(`[data-field="${key}"]`);
            if (element) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                    element.value = data[key];
                } else {
                    element.textContent = data[key];
                }
            }
        });
    }
};

// Form Helper
const Form = {
    getData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            // Handle checkboxes
            if (form.querySelector(`[name="${key}"][type="checkbox"]`)) {
                data[key] = form.querySelector(`[name="${key}"]`).checked;
            } else {
                data[key] = value;
            }
        }
        
        return data;
    },
    
    setData(formId, data) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        Object.keys(data).forEach(key => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = data[key];
                } else {
                    field.value = data[key];
                }
            }
        });
    },
    
    validate(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;
        
        return form.checkValidity();
    },
    
    reset(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }
};

// Local Storage Helper
const Storage = {
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },
    
    remove(key) {
        localStorage.removeItem(key);
    },
    
    clear() {
        localStorage.clear();
    }
};

// QR Code Helper
const QR = {
    generate(elementId, text, options = {}) {
        const defaultOptions = {
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        };
        
        const element = document.getElementById(elementId);
        if (!element) return null;
        
        // Clear existing QR code
        element.innerHTML = '';
        
        return new QRCode(element, {
            text: text,
            ...defaultOptions,
            ...options
        });
    }
};

// Export for global use
window.API = API;
window.Utils = Utils;
window.Notifications = Notifications;
window.Loading = Loading;
window.Modal = Modal;
window.Form = Form;
window.Storage = Storage;
window.QR = QR;

// Initialize notifications on DOM load
document.addEventListener('DOMContentLoaded', () => {
    Notifications.init();
});