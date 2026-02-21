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
            let lifts = JSON.parse(localStorage.getItem('lifts'));
            if (!lifts || lifts.length === 0) {
                // Завантажуємо тестові дані, якщо localStorage порожній
                lifts = this.loadTestLiftsData();
                this.saveLifts(lifts);
            }
            return lifts;
        } catch (error) {
            console.error('Помилка читання ліфтів з localStorage:', error);
            return this.loadTestLiftsData();
        }
    }

    static loadTestLiftsData() {
        // Завантажуємо тестові дані з файлу
        try {
            // Спробуємо завантажити з локального файлу (якщо можливо)
            const testData = [
                {
                    "id": "LFT-001",
                    "municipalNumber": "МН-001",
                    "model": "Otis Gen2",
                    "type": "passenger",
                    "location": "Lisboa, Rua da Liberdade 123, 1000-001",
                    "address": "Rua da Liberdade 123",
                    "postcode": "1000-001",
                    "lat": 38.7167,
                    "lng": -9.1395,
                    "capacity": 8,
                    "speed": 1.0,
                    "status": "active",
                    "lastMaintenance": "2024-01-15",
                    "nextMaintenance": "2024-07-15",
                    "inspectionFrequency": 6,
                    "clientName": "Тестовий клієнт 1",
                    "clientEmail": "client1@example.com",
                    "liftCount": "1",
                    "createdAt": "2024-01-01T00:00:00.000Z",
                    "updatedAt": "2024-01-01T00:00:00.000Z"
                },
                {
                    "id": "LFT-002",
                    "municipalNumber": "МН-002",
                    "model": "Schindler 7000",
                    "type": "passenger",
                    "location": "Porto, Av. dos Aliados 45, 4000-001",
                    "address": "Av. dos Aliados 45",
                    "postcode": "4000-001",
                    "lat": 41.1496,
                    "lng": -8.6109,
                    "capacity": 10,
                    "speed": 1.5,
                    "status": "maintenance",
                    "lastMaintenance": "2024-02-01",
                    "nextMaintenance": "2024-08-01",
                    "inspectionFrequency": 6,
                    "clientName": "Тестовий клієнт 2",
                    "clientEmail": "client2@example.com",
                    "liftCount": "1",
                    "createdAt": "2024-02-01T00:00:00.000Z",
                    "updatedAt": "2024-02-01T00:00:00.000Z"
                },
                {
                    "id": "LFT-003",
                    "municipalNumber": "МН-003",
                    "model": "Kone EcoDisc",
                    "type": "cargo",
                    "location": "Setúbal, Av. da República 22, 2900-001",
                    "address": "Av. da República 22",
                    "postcode": "2900-001",
                    "lat": 38.5244,
                    "lng": -8.8882,
                    "capacity": 1000,
                    "speed": 0.5,
                    "status": "active",
                    "lastMaintenance": "2024-03-01",
                    "nextMaintenance": "2024-09-01",
                    "inspectionFrequency": 6,
                    "clientName": "Тестовий клієнт 3",
                    "clientEmail": "client3@example.com",
                    "liftCount": "1",
                    "createdAt": "2024-03-01T00:00:00.000Z",
                    "updatedAt": "2024-03-01T00:00:00.000Z"
                }
            ];
            return testData;
        } catch (error) {
            console.error('Помилка завантаження тестових даних:', error);
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

    static filterLifts(lifts, filters = {}) {
        return lifts.filter(lift => {
            let matches = true;

            if (filters.status && filters.status !== 'all') {
                matches = matches && lift.status === filters.status;
            }

            if (filters.client) {
                matches = matches && lift.client === filters.client;
            }

            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                matches = matches && (
                    lift.municipalNumber?.toLowerCase().includes(searchLower) ||
                    lift.address?.toLowerCase().includes(searchLower) ||
                    lift.client?.toLowerCase().includes(searchLower)
                );
            }

            return matches;
        });
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
