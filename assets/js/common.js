// assets/js/common.js

class CommonUtils {
    static formatDate(date, format = 'dd.MM.yyyy') {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        
        return format.replace('dd', day).replace('MM', month).replace('yyyy', year);
    }

    static formatCurrency(amount, currency = 'EUR') {
        return new Intl.NumberFormat('uk-UA', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.hideNotification(notification);
        });

        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
    }

    static getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    static hideNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePhone(phone) {
        const re = /^\+?[0-9]{10,15}$/;
        return re.test(phone);
    }

    // НОВІ МЕТОДИ ДЛЯ QR-СИСТЕМИ
    static loadQRCodeLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof QRCode !== 'undefined') {
                resolve(QRCode);
                return;
            }

            // Спробуємо завантажити бібліотеку
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
            script.onload = () => resolve(QRCode);
            script.onerror = () => reject(new Error('Не вдалося завантажити бібліотеку QRCode'));
            document.head.appendChild(script);
        });
    }

    static async generateQRCode(elementId, data, options = {}) {
        try {
            const QRCode = await this.loadQRCodeLibrary();
            const container = document.getElementById(elementId);
            
            if (!container) {
                throw new Error(`Елемент з ID ${elementId} не знайдено`);
            }

            // Очищаємо контейнер
            container.innerHTML = '';

            const defaultOptions = {
                text: JSON.stringify(data),
                width: 250,
                height: 250,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            };

            const mergedOptions = { ...defaultOptions, ...options };
            return new QRCode(container, mergedOptions);
        } catch (error) {
            console.error('Помилка генерації QR-коду:', error);
            this.showNotification('Помилка генерації QR-коду', 'error');
            throw error;
        }
    }

    static downloadQRCode(canvas, filename = 'qr-code.png') {
        if (!canvas) {
            this.showNotification('QR-код не знайдено для завантаження', 'error');
            return;
        }

        try {
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
            this.showNotification('QR-код успішно завантажено', 'success');
        } catch (error) {
            console.error('Помилка завантаження QR-коду:', error);
            this.showNotification('Помилка завантаження QR-коду', 'error');
        }
    }

    static printQRCode(canvas, title = 'QR Code') {
        if (!canvas) {
            this.showNotification('QR-код не знайдено для друку', 'error');
            return;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { 
                            text-align: center; 
                            margin: 40px; 
                            font-family: Arial, sans-serif;
                        }
                        h2 { 
                            margin-bottom: 20px; 
                            color: #333;
                        }
                        .print-info {
                            margin: 20px 0;
                            font-size: 14px;
                            color: #666;
                        }
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h2>${title}</h2>
                    <div class="print-info">
                        <strong>Згенеровано:</strong> ${new Date().toLocaleString('uk-UA')}
                    </div>
                    <img src="${canvas.toDataURL('image/png')}" alt="QR Code" style="max-width: 300px;">
                    <div class="print-info">
                        LiftMaster Pro - Система управління ліфтами
                    </div>
                    <button class="no-print" onclick="window.print()">Друкувати</button>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    static validateJSON(jsonString) {
        try {
            JSON.parse(jsonString);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Методи для роботи з localStorage
    static getLifts() {
        try {
            return JSON.parse(localStorage.getItem('lifts')) || [];
        } catch (error) {
            console.error('Помилка читання ліфтів з localStorage:', error);
            return [];
        }
    }

    static saveLifts(lifts) {
        try {
            localStorage.setItem('lifts', JSON.stringify(lifts));
            return true;
        } catch (error) {
            console.error('Помилка збереження ліфтів:', error);
            this.showNotification('Помилка збереження даних', 'error');
            return false;
        }
    }

    static getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('currentUser')) || null;
        } catch (error) {
            console.error('Помилка читання поточного користувача:', error);
            return null;
        }
    }
}

// Глобальні обробники подій
document.addEventListener('DOMContentLoaded', function() {
    // Ініціалізація теми
    const settings = JSON.parse(localStorage.getItem('lm_settings') || '{}');
    if (settings.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
    }

    // Додаємо глобальний обробник помилок
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error);
        CommonUtils.showNotification('Сталася помилка в роботі системи', 'error');
    });

    // Додаємо обробник для всіх форм для запобігання стандартної поведінки
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            // Тут може бути ваша логіка обробки форми
        });
    });

    // Ініціалізація всіх тултіпів
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltipText = this.getAttribute('data-tooltip');
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            document.body.appendChild(tooltip);

            const rect = this.getBoundingClientRect();
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
            tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';

            this.addEventListener('mouseleave', function() {
                tooltip.remove();
            });
        });
    });
});

// Додаємо CSS для сповіщень і тултіпів
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-left: 4px solid #3498db;
        border-radius: 4px;
        padding: 15px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 10000;
        max-width: 350px;
    }

    .notification.show {
        transform: translateX(0);
    }

    .notification.success {
        border-left-color: #27ae60;
    }

    .notification.error {
        border-left-color: #e74c3c;
    }

    .notification.warning {
        border-left-color: #f39c12;
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .notification-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.6;
    }

    .notification-close:hover {
        opacity: 1;
    }

    .tooltip {
        position: fixed;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        z-index: 1000;
        pointer-events: none;
    }
`;
document.head.appendChild(style);

// Глобальний об'єкт для доступу до утиліт
window.CommonUtils = CommonUtils;
// assets/js/common.js

class CommonUtils {
    // ... (існуючий код залишаємо без змін) ...

    // ДОДАЄМО НОВІ МЕТОДИ ДЛЯ РОБОТИ З ЛІФТАМИ
    
    static getLifts() {
        try {
            return JSON.parse(localStorage.getItem('lifts')) || [];
        } catch (error) {
            console.error('Помилка читання ліфтів з localStorage:', error);
            return [];
        }
    }

    static saveLifts(lifts) {
        try {
            localStorage.setItem('lifts', JSON.stringify(lifts));
            return true;
        } catch (error) {
            console.error('Помилка збереження ліфтів:', error);
            this.showNotification('Помилка збереження даних', 'error');
            return false;
        }
    }

    static getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('currentUser')) || null;
        } catch (error) {
            console.error('Помилка читання поточного користувача:', error);
            return null;
        }
    }

    static saveCurrentUser(user) {
        try {
            localStorage.setItem('currentUser', JSON.stringify(user));
            return true;
        } catch (error) {
            console.error('Помилка збереження користувача:', error);
            return false;
        }
    }

    static getServiceRequests() {
        try {
            return JSON.parse(localStorage.getItem('serviceRequests')) || [];
        } catch (error) {
            console.error('Помилка читання заявок:', error);
            return [];
        }
    }

    static saveServiceRequests(requests) {
        try {
            localStorage.setItem('serviceRequests', JSON.stringify(requests));
            return true;
        } catch (error) {
            console.error('Помилка збереження заявок:', error);
            return false;
        }
    }

    // Методи для роботи з геолокацією
    static async geocodeAddress(address) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    display_name: data[0].display_name
                };
            }
            return null;
        } catch (error) {
            console.error('Помилка геокодування:', error);
            this.showNotification('Помилка отримання координат', 'error');
            return null;
        }
    }

    // Методи для фільтрації та пошуку
    static filterLifts(lifts, filters = {}) {
        return lifts.filter(lift => {
            let matches = true;

            if (filters.status && filters.status !== 'all') {
                matches = matches && lift.status === filters.status;
            }

            if (filters.type && filters.type !== 'all') {
                matches = matches && lift.type === filters.type;
            }

            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                matches = matches && (
                    (lift.model && lift.model.toLowerCase().includes(searchTerm)) ||
                    (lift.address && lift.address.toLowerCase().includes(searchTerm)) ||
                    (lift.client && lift.client.toLowerCase().includes(searchTerm)) ||
                    (lift.serial && lift.serial.toLowerCase().includes(searchTerm)) ||
                    (lift.id && lift.id.toLowerCase().includes(searchTerm))
                );
            }

            return matches;
        });
    }

    static sortLifts(lifts, sortBy = 'model') {
        const sortedLifts = [...lifts];
        
        switch (sortBy) {
            case 'model':
                return sortedLifts.sort((a, b) => (a.model || '').localeCompare(b.model || ''));
            case 'address':
                return sortedLifts.sort((a, b) => (a.address || '').localeCompare(b.address || ''));
            case 'status':
                return sortedLifts.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
            case 'maintenance':
                return sortedLifts.sort((a, b) => new Date(a.nextMaintenance || 0) - new Date(b.nextMaintenance || 0));
            case 'client':
                return sortedLifts.sort((a, b) => (a.client || '').localeCompare(b.client || ''));
            default:
                return sortedLifts;
        }
    }

    // Методи для валідації даних ліфтів
    static validateLiftData(liftData) {
        const errors = [];

        if (!liftData.model) errors.push('Модель ліфта обов\'язкова');
        if (!liftData.type) errors.push('Тип ліфта обов\'язковий');
        if (!liftData.address) errors.push('Адреса обов\'язкова');
        if (!liftData.client) errors.push('Клієнт обов\'язковий');
        if (!liftData.lastMaintenance) errors.push('Дата останнього ТО обов\'язкова');
        if (!liftData.nextMaintenance) errors.push('Дата наступного ТО обов\'язкова');

        if (liftData.clientEmail && !this.validateEmail(liftData.clientEmail)) {
            errors.push('Невірний формат email');
        }

        if (liftData.clientPhone && !this.validatePhone(liftData.clientPhone)) {
            errors.push('Невірний формат телефону');
        }

        return errors;
    }

    // Методи для роботи з датами ТО
    static calculateNextMaintenance(lastMaintenance, frequencyMonths = 6) {
        const lastDate = new Date(lastMaintenance);
        const nextDate = new Date(lastDate);
        nextDate.setMonth(lastDate.getMonth() + frequencyMonths);
        return nextDate.toISOString().split('T')[0];
    }

    static getMaintenanceStatus(nextMaintenance) {
        const nextDate = new Date(nextMaintenance);
        const today = new Date();
        const diffTime = nextDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { status: 'overdue', days: Math.abs(diffDays) };
        } else if (diffDays <= 7) {
            return { status: 'urgent', days: diffDays };
        } else if (diffDays <= 30) {
            return { status: 'warning', days: diffDays };
        } else {
            return { status: 'normal', days: diffDays };
        }
    }

    // Методи для експорту даних
    static exportToCSV(data, filename = 'export.csv') {
        try {
            if (!data || data.length === 0) {
                this.showNotification('Немає даних для експорту', 'warning');
                return;
            }

            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => {
                    const value = row[header] || '';
                    return `"${value.toString().replace(/"/g, '""')}"`;
                }).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('Дані експортовано успішно', 'success');
        } catch (error) {
            console.error('Помилка експорту CSV:', error);
            this.showNotification('Помилка експорту даних', 'error');
        }
    }

    static exportToJSON(data, filename = 'export.json') {
        try {
            if (!data || data.length === 0) {
                this.showNotification('Немає даних для експорту', 'warning');
                return;
            }

            const jsonContent = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('Дані експортовано успішно', 'success');
        } catch (error) {
            console.error('Помилка експорту JSON:', error);
            this.showNotification('Помилка експорту даних', 'error');
        }
    }

    // Методи для статистики
    static getLiftsStats(lifts) {
        const stats = {
            total: lifts.length,
            byStatus: {
                active: lifts.filter(l => l.status === 'active').length,
                maintenance: lifts.filter(l => l.status === 'maintenance').length,
                inactive: lifts.filter(l => l.status === 'inactive').length,
                out_of_service: lifts.filter(l => l.status === 'out_of_service').length
            },
            byType: {},
            maintenance: {
                overdue: lifts.filter(l => {
                    if (!l.nextMaintenance) return false;
                    const status = this.getMaintenanceStatus(l.nextMaintenance);
                    return status.status === 'overdue';
                }).length,
                urgent: lifts.filter(l => {
                    if (!l.nextMaintenance) return false;
                    const status = this.getMaintenanceStatus(l.nextMaintenance);
                    return status.status === 'urgent';
                }).length
            }
        };

        // Статистика по типах
        lifts.forEach(lift => {
            const type = lift.type || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        });

        return stats;
    }

    // Методи для роботи з QR кодами (оновлені)
    static async generateLiftQRCode(lift, elementId, options = {}) {
        try {
            const qrData = {
                id: lift.id,
                model: lift.model,
                serial: lift.serial,
                address: lift.address,
                client: lift.client,
                timestamp: new Date().toISOString(),
                type: 'lift_info'
            };

            const defaultOptions = {
                width: 250,
                height: 250,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            };

            return await this.generateQRCode(elementId, qrData, { ...defaultOptions, ...options });
        } catch (error) {
            console.error('Помилка генерації QR коду для ліфта:', error);
            throw error;
        }
    }

    // Додаткові утиліти
    static generateLiftId() {
        return 'LFT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    static formatLiftStatus(status) {
        const statusMap = {
            'active': 'Активний',
            'maintenance': 'Обслуговування',
            'inactive': 'Неактивний',
            'out_of_service': 'Не працює'
        };
        return statusMap[status] || status;
    }

    static formatLiftType(type) {
        const typeMap = {
            'passenger': 'Пасажирський',
            'cargo': 'Вантажний',
            'hospital': 'Лікарняний',
            'residential': 'Житловий',
            'commercial': 'Комерційний'
        };
        return typeMap[type] || type;
    }
}

// Глобальні змінні та ініціалізація
let allLifts = CommonUtils.getLifts();
let currentUser = CommonUtils.getCurrentUser();
let allServiceRequests = CommonUtils.getServiceRequests();

// Глобальні обробники подій (оновлені)
document.addEventListener('DOMContentLoaded', function() {
    // Ініціалізація теми
    const settings = JSON.parse(localStorage.getItem('lm_settings') || '{}');
    if (settings.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
    }

    // Додаємо глобальний обробник помилок
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error);
        CommonUtils.showNotification('Сталася помилка в роботі системи', 'error');
    });

    // Автоматичне збереження даних при закритті сторінки
    window.addEventListener('beforeunload', function() {
        CommonUtils.saveLifts(allLifts);
        CommonUtils.saveServiceRequests(allServiceRequests);
        if (currentUser) {
            CommonUtils.saveCurrentUser(currentUser);
        }
    });

    // Періодичне автозбереження (кожні 30 секунд)
    setInterval(() => {
        CommonUtils.saveLifts(allLifts);
        CommonUtils.saveServiceRequests(allServiceRequests);
        console.log('Автозбереження виконано');
    }, 30000);

    // Ініціалізація всіх тултіпів
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltipText = this.getAttribute('data-tooltip');
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            document.body.appendChild(tooltip);

            const rect = this.getBoundingClientRect();
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
            tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';

            this.addEventListener('mouseleave', function() {
                tooltip.remove();
            });
        });
    });
});

// Глобальний об'єкт для доступу до утиліт
window.CommonUtils = CommonUtils;
window.allLifts = allLifts;
window.currentUser = currentUser;
window.allServiceRequests = allServiceRequests;