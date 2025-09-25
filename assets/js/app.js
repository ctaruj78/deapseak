/**
 * LiftMaster Pro - Головний JavaScript файл
 * Ініціалізація додатку, утиліти та базовий функціонал
 */

// Глобальний об'єкт додатку
window.LiftMaster = {
    config: {
        apiBaseUrl: '/api',
        mapCenter: [50.4501, 30.5234], // Київ по дефолту
        mapZoom: 12,
        itemsPerPage: 10,
        dateFormat: 'uk-UA',
        currency: 'EUR'
    },
    
    // Стан додатку
    state: {
        user: null,
        lifts: [],
        currentPage: 1,
        filters: {
            status: 'all',
            type: 'all',
            search: ''
        },
        sort: {
            field: 'id',
            direction: 'asc'
        }
    },
    
    // Ініціалізація додатку
    init: function() {
        console.log('🚀 LiftMaster Pro ініціалізація...');
        
        this.initAdminLTE();
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadUserData();
        this.setupInterceptors();
        this.setupServiceWorker();
        
        console.log('✅ LiftMaster Pro успішно ініціалізовано');
    },
    
    // Ініціалізація AdminLTE
    initAdminLTE: function() {
        if (typeof $ !== 'undefined' && typeof $.fn !== 'undefined') {
            // Ініціалізація деревовидного меню
            if ($.fn.tree) {
                $('[data-widget="tree"]').tree();
            }
            
            // Ініціалізація сайдбару
            if ($.fn.pushMenu) {
                $('[data-widget="pushmenu"]').pushMenu();
            }
            
            // Ініціалізація тултіпів
            if ($.fn.tooltip) {
                $('[data-toggle="tooltip"]').tooltip({
                    trigger: 'hover',
                    placement: 'top'
                });
            }
            
            // Ініціалізація поповерів
            if ($.fn.popover) {
                $('[data-toggle="popover"]').popover();
            }
        }
    },
    
    // Перевірка автентифікації
    checkAuthentication: function() {
        const token = this.getAuthToken();
        const currentPath = window.location.pathname;
        
        // Сторінки, які не потребують автентифікації
        const publicPages = ['/login.html', '/register.html', '/forgot-password.html'];
        
        if (!token && !publicPages.includes(currentPath)) {
            this.redirectToLogin();
            return false;
        }
        
        if (token && publicPages.includes(currentPath)) {
            this.redirectToDashboard();
            return false;
        }
        
        return true;
    },
    
    // Налаштування обробників подій
    setupEventListeners: function() {
        // Глобальні обробники
        $(document).on('click', '[data-toggle="modal"]', this.handleModalOpen);
        $(document).on('hidden.bs.modal', this.handleModalClose);
        $(document).on('submit', 'form', this.handleFormSubmit);
        
        // Обробник виходу
        $(document).on('click', '.logout-btn', this.handleLogout);
        
        // Обробник пошуку
        $(document).on('input', '.search-input', this.debounce(this.handleSearch, 300));
        
        // Обробник фільтрів
        $(document).on('change', '.filter-select', this.handleFilterChange);
        
        // Обробник сортування
        $(document).on('click', '.sortable-header', this.handleSort);
        
        // Обробник пагінації
        $(document).on('click', '.page-btn', this.handlePagination);
        
        // Обробник клавіш
        $(document).on('keydown', this.handleKeyboardShortcuts);
        
        // Обробник зміни теми
        $(document).on('change', '#themeSwitch', this.handleThemeChange);
    },
    
    // Налаштування перехоплювачів запитів
    setupInterceptors: function() {
        // Перехоплення AJAX запитів
        if (typeof $ !== 'undefined' && $.ajax) {
            $(document).ajaxSend(function(event, xhr, settings) {
                const token = LiftMaster.getAuthToken();
                if (token) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                }
                
                // Додаємо індикатор завантаження
                LiftMaster.showLoading();
            });
            
            $(document).ajaxComplete(function() {
                LiftMaster.hideLoading();
            });
            
            $(document).ajaxError(function(event, xhr) {
                if (xhr.status === 401) {
                    LiftMaster.handleUnauthorized();
                } else if (xhr.status === 403) {
                    LiftMaster.showNotification('Доступ заборонено', 'error');
                } else if (xhr.status >= 500) {
                    LiftMaster.showNotification('Помилка сервера', 'error');
                }
            });
        }
    },
    
    // Налаштування Service Worker
    setupServiceWorker: function() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then(function(registration) {
                    console.log('✅ Service Worker зареєстровано:', registration);
                })
                .catch(function(error) {
                    console.log('❌ Помилка реєстрації Service Worker:', error);
                });
        }
    },
    
    // Завантаження даних користувача
    loadUserData: function() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                this.state.user = JSON.parse(userData);
                this.updateUserInterface();
            } catch (error) {
                console.error('Помилка парсингу даних користувача:', error);
                localStorage.removeItem('userData');
            }
        }
    },
    
    // Оновлення інтерфейсу користувача
    updateUserInterface: function() {
        if (this.state.user) {
            // Оновлення імені користувача
            $('.user-name').text(this.state.user.name || 'Користувач');
            $('.user-email').text(this.state.user.email || '');
            $('.user-role').text(this.state.user.role ? this.state.user.role.toUpperCase() : 'USER');
            
            // Оновлення аватара
            if (this.state.user.avatar) {
                $('.user-avatar').attr('src', this.state.user.avatar);
            }
        }
    },
    
    // Робота з автентифікацією
    getAuthToken: function() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    },
    
    setAuthToken: function(token, remember = false) {
        if (remember) {
            localStorage.setItem('authToken', token);
        } else {
            sessionStorage.setItem('authToken', token);
        }
    },
    
    removeAuthToken: function() {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
    },
    
    // Перенаправлення
    redirectToLogin: function() {
        window.location.href = '/login.html';
    },
    
    redirectToDashboard: function() {
        window.location.href = '/pages/admin/dashboard.html';
    },
    
    redirectTo: function(url) {
        window.location.href = url;
    },
    
    // Робота з повідомленнями
    showNotification: function(message, type = 'info', duration = 3000) {
        const types = {
            success: 'alert-success',
            error: 'alert-danger',
            warning: 'alert-warning',
            info: 'alert-info'
        };
        
        const icon = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        
        const alertClass = types[type] || types.info;
        const alertIcon = icon[type] || icon.info;
        
        const notification = $(`
            <div class="alert ${alertClass} alert-dismissible fade show notification-global" 
                 role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                <strong>${alertIcon}</strong> ${message}
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `);
        
        $('body').append(notification);
        
        // Автоматичне закриття
        if (duration > 0) {
            setTimeout(() => {
                notification.alert('close');
            }, duration);
        }
        
        return notification;
    },
    
    // Індикатор завантаження
    showLoading: function(message = 'Завантаження...') {
        // Перевіряємо, чи вже є індикатор
        if ($('#loadingOverlay').length === 0) {
            const overlay = $(`
                <div id="loadingOverlay" 
                     style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                            background: rgba(0,0,0,0.7); z-index: 9999; 
                            display: flex; align-items: center; justify-content: center;">
                    <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;">
                        <span class="sr-only">${message}</span>
                    </div>
                    <div class="ml-3 text-white">${message}</div>
                </div>
            `);
            $('body').append(overlay);
        }
    },
    
    hideLoading: function() {
        $('#loadingOverlay').remove();
    },
    
    // Робота з модальними вікнами
    openModal: function(modalId, options = {}) {
        const modal = $(modalId);
        if (modal.length) {
            if (options.data) {
                this.fillModalWithData(modal, options.data);
            }
            
            modal.modal('show');
            
            // Фокус на першому полі вводу
            setTimeout(() => {
                modal.find('input:visible, select:visible, textarea:visible').first().focus();
            }, 100);
        }
    },
    
    closeModal: function(modalId) {
        $(modalId).modal('hide');
    },
    
    fillModalWithData: function(modal, data) {
        $.each(data, function(key, value) {
            const field = modal.find(`[name="${key}"], #${key}`);
            if (field.length) {
                if (field.is('select')) {
                    field.val(value).trigger('change');
                } else if (field.is('input[type="checkbox"]') || field.is('input[type="radio"]')) {
                    field.prop('checked', value);
                } else {
                    field.val(value);
                }
            }
        });
    },
    
    // Утиліти
    debounce: function(func, wait) {
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
    
    formatDate: function(date, format = 'datetime') {
        if (!date) return '-';
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '-';
        
        const options = {
            date: { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            },
            time: {
                hour: '2-digit',
                minute: '2-digit'
            },
            datetime: {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        };
        
        return dateObj.toLocaleDateString(this.config.dateFormat, options[format] || options.datetime);
    },
    
    formatCurrency: function(amount) {
        return new Intl.NumberFormat(this.config.dateFormat, {
            style: 'currency',
            currency: this.config.currency
        }).format(amount);
    },
    
    generateId: function(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return prefix + timestamp + random;
    },
    
    // Обробники подій
    handleModalOpen: function(e) {
        e.preventDefault();
        const modalId = $(this).data('target');
        LiftMaster.openModal(modalId);
    },
    
    handleModalClose: function() {
        // Очищення форми при закритті модального вікна
        $(this).find('form').trigger('reset');
        $(this).find('.invalid-feedback').remove();
        $(this).find('.is-invalid').removeClass('is-invalid');
    },
    
    handleFormSubmit: function(e) {
        e.preventDefault();
        const form = $(this);
        LiftMaster.submitForm(form);
    },
    
    handleLogout: function(e) {
        e.preventDefault();
        LiftMaster.logout();
    },
    
    handleSearch: function(e) {
        const searchTerm = $(this).val().trim();
        LiftMaster.state.filters.search = searchTerm;
        LiftMaster.applyFilters();
    },
    
    handleFilterChange: function() {
        const filterType = $(this).data('filter');
        const value = $(this).val();
        LiftMaster.state.filters[filterType] = value;
        LiftMaster.applyFilters();
    },
    
    handleSort: function() {
        const field = $(this).data('sort');
        const currentDirection = LiftMaster.state.sort.direction;
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        
        LiftMaster.state.sort = {
            field: field,
            direction: newDirection
        };
        
        LiftMaster.applySorting();
    },
    
    handlePagination: function() {
        const page = $(this).data('page');
        LiftMaster.state.currentPage = page;
        LiftMaster.renderTable();
    },
    
    handleKeyboardShortcuts: function(e) {
        // Ctrl + S для збереження
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            $('form:visible').submit();
        }
        
        // Esc для закриття модальних вікон
        if (e.key === 'Escape') {
            $('.modal:visible').modal('hide');
        }
        
        // / для фокусу на пошук
        if (e.key === '/' && !$(e.target).is('input, textarea, select')) {
            e.preventDefault();
            $('.search-input').focus();
        }
    },
    
    handleThemeChange: function() {
        const isDark = $(this).is(':checked');
        LiftMaster.toggleTheme(isDark);
    },
    
    handleUnauthorized: function() {
        this.showNotification('Сесія закінчилася. Будь ласка, увійдіть знову.', 'error');
        this.logout();
    },
    
    // Основні методи
    submitForm: function(form) {
        const formData = new FormData(form[0]);
        const url = form.attr('action') || window.location.href;
        const method = form.attr('method') || 'POST';
        
        this.showLoading('Збереження...');
        
        // Валідація форми
        if (!this.validateForm(form)) {
            this.hideLoading();
            return false;
        }
        
        // Відправка форми
        fetch(url, {
            method: method,
            body: formData,
            headers: {
                'Authorization': 'Bearer ' + this.getAuthToken()
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Помилка сервера');
            }
            return response.json();
        })
        .then(data => {
            this.hideLoading();
            this.showNotification('Дані успішно збережено', 'success');
            
            // Закриття модального вікна
            form.closest('.modal').modal('hide');
            
            // Оновлення даних
            if (typeof window.liftManager !== 'undefined') {
                window.liftManager.loadLifts();
            }
        })
        .catch(error => {
            this.hideLoading();
            this.showNotification('Помилка збереження: ' + error.message, 'error');
        });
    },
    
    validateForm: function(form) {
        let isValid = true;
        form.find(':input[required]').each(function() {
            if (!$(this).val().trim()) {
                $(this).addClass('is-invalid');
                isValid = false;
            } else {
                $(this).removeClass('is-invalid');
            }
        });
        
        return isValid;
    },
    
    logout: function() {
        this.removeAuthToken();
        localStorage.removeItem('userData');
        this.showNotification('Вихід успішний', 'success');
        setTimeout(() => {
            this.redirectToLogin();
        }, 1000);
    },
    
    applyFilters: function() {
        // Цей метод буде перевизначено в lifts-manager.js
        if (typeof window.liftManager !== 'undefined') {
            window.liftManager.applyFilters();
        }
    },
    
    applySorting: function() {
        // Цей метод буде перевизначено в lifts-manager.js
        if (typeof window.liftManager !== 'undefined') {
            window.liftManager.applySorting();
        }
    },
    
    renderTable: function() {
        // Цей метод буде перевизначено в lifts-manager.js
        if (typeof window.liftManager !== 'undefined') {
            window.liftManager.renderTable();
        }
    },
    
    toggleTheme: function(isDark) {
        if (isDark) {
            $('body').addClass('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            $('body').removeClass('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    },
    
    // Експорт та імпорт
    exportToCSV: function(data, filename) {
        const csv = this.convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename || 'export.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },
    
    convertToCSV: function(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header] || '';
                const escaped = value.toString().replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    },
    
    // Статистика та аналітика
    trackEvent: function(category, action, label) {
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                'event_category': category,
                'event_label': label
            });
        }
        
        console.log(`📊 Analytics: ${category} - ${action} - ${label}`);
    }
};

// Ініціалізація додатку при завантаженні документа
$(document).ready(function() {
    // Перевірка підключених бібліотек
    if (typeof $ === 'undefined') {
        console.error('jQuery не підключено!');
        return;
    }
    
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap не підключено!');
        return;
    }
    
    // Ініціалізація додатку
    LiftMaster.init();
    
    // Завантаження теми
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        $('body').addClass('dark-theme');
        $('#themeSwitch').prop('checked', true);
    }
    
    // Відстеження відкриття сторінки
    LiftMaster.trackEvent('Navigation', 'Page View', window.location.pathname);
});

// Глобальні обробники помилок
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    LiftMaster.showNotification('Сталася неочікувана помилка', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    LiftMaster.showNotification('Помилка виконання операції', 'error');
});

// Експорт для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LiftMaster;
}
// Додаткові утиліти для роботи з даними
class CommonUtils {
    /**
     * Отримання ліфтів синхронно
     */
    static getLiftsSync() {
        try {
            if (typeof Database !== 'undefined' && Database.getLiftsSync) {
                return Database.getLiftsSync();
            }
            
            const liftsData = localStorage.getItem('lifts');
            return liftsData ? JSON.parse(liftsData) : [];
            
        } catch (error) {
            console.error('Помилка отримання ліфтів:', error);
            return [];
        }
    }

    /**
     * Форматування дати
     */
    static formatDate(dateString, format = 'dd.MM.yyyy') {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            return format
                .replace('dd', day)
                .replace('MM', month)
                .replace('yyyy', year)
                .replace('HH', hours)
                .replace('mm', minutes);
                
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Валідація JSON
     */
    static isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Додаємо глобально
window.CommonUtils = CommonUtils;