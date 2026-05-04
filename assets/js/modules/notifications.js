class NotificationManager {
    static NOTIFICATION_TYPES = {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info',
        MAINTENANCE: 'maintenance',
        PAYMENT: 'payment',
        ASSIGNMENT: 'assignment'
    };

    static NOTIFICATION_CHANNELS = {
        IN_APP: 'in_app',
        PUSH: 'push',
        EMAIL: 'email',
        SMS: 'sms'
    };

    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.listeners = [];
        this.init();
    }

    init() {
        // A carregar збережених нотифікацій
        this.notifications = StorageManager.load('notifications') || [];
        this.updateUnreadCount();

        // Ініціалізація push notifications
        this.initPushNotifications();

        // Синхронізація з сервером
        this.syncWithServer();
    }

    // Додавання нової нотифікації
    add(notification) {
        const newNotification = {
            id: Date.now() + Math.random(),
            type: notification.type || this.NOTIFICATION_TYPES.INFO,
            title: notification.title,
            message: notification.message,
            data: notification.data || {},
            channels: notification.channels || [this.NOTIFICATION_CHANNELS.IN_APP],
            read: false,
            createdAt: new Date().toISOString(),
            expiresAt: notification.expiresAt || null
        };

        this.notifications.unshift(newNotification);
        this.updateUnreadCount();
        this.save();

        // Відправка через канали
        this.sendThroughChannels(newNotification);

        // Повідомлення слухачів
        this.notifyListeners('new', newNotification);

        return newNotification;
    }

    // Позначення як прочитане
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            notification.readAt = new Date().toISOString();
            this.updateUnreadCount();
            this.save();
            this.notifyListeners('read', notification);
        }
    }

    // Позначення всіх як прочитаних
    markAllAsRead() {
        this.notifications.forEach(n => {
            if (!n.read) {
                n.read = true;
                n.readAt = new Date().toISOString();
            }
        });
        this.unreadCount = 0;
        this.save();
        this.notifyListeners('all_read');
    }

    // Видалення нотифікації
    remove(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index > -1) {
            const removed = this.notifications.splice(index, 1)[0];
            if (!removed.read) {
                this.updateUnreadCount();
            }
            this.save();
            this.notifyListeners('removed', removed);
        }
    }

    // Отримання нотифікацій з фільтрами
    getNotifications(filters = {}) {
        let filtered = [...this.notifications];

        if (filters.type) {
            filtered = filtered.filter(n => n.type === filters.type);
        }

        if (filters.read !== undefined) {
            filtered = filtered.filter(n => n.read === filters.read);
        }

        if (filters.limit) {
            filtered = filtered.slice(0, filters.limit);
        }

        return filtered;
    }

    // Atualização кількості непрочитаних
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
    }

    // Збереження в localStorage
    save() {
        // Обмеження кількості збережених нотифікацій (останні 100)
        const toSave = this.notifications.slice(0, 100);
        StorageManager.save('notifications', toSave);
    }

    // Ініціалізація push notifications
    async initPushNotifications() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered for notifications');

                // Перевірка дозволу
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log('Push notifications enabled');
                }
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    // Відправка через канали
    async sendThroughChannels(notification) {
        for (const channel of notification.channels) {
            switch (channel) {
                case this.NOTIFICATION_CHANNELS.PUSH:
                    await this.sendPushNotification(notification);
                    break;
                case this.NOTIFICATION_CHANNELS.EMAIL:
                    await this.sendEmailNotification(notification);
                    break;
                case this.NOTIFICATION_CHANNELS.SMS:
                    await this.sendSMSNotification(notification);
                    break;
                case this.NOTIFICATION_CHANNELS.IN_APP:
                    this.showInAppNotification(notification);
                    break;
            }
        }
    }

    // Push notification
    async sendPushNotification(notification) {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(notification.title, {
                    body: notification.message,
                    icon: '/assets/img/logo.png',
                    badge: '/assets/img/logo.png',
                    data: notification.data,
                    tag: notification.id.toString(),
                    requireInteraction: notification.type === this.NOTIFICATION_TYPES.ERROR
                });
            } catch (error) {
                console.error('Push notification failed:', error);
            }
        }
    }

    // In-app notification (toast)
    showInAppNotification(notification) {
        // Використовуємо Toastr або власний toast
        if (typeof toastr !== 'undefined') {
            const toastrMethod = this.getToastrMethod(notification.type);
            toastr[toastrMethod](notification.message, notification.title, {
                timeOut: 5000,
                extendedTimeOut: 2000
            });
        } else {
            // Fallback до alert або власного toast
            this.showCustomToast(notification);
        }
    }

    getToastrMethod(type) {
        switch (type) {
            case this.NOTIFICATION_TYPES.SUCCESS: return 'success';
            case this.NOTIFICATION_TYPES.ERROR: return 'error';
            case this.NOTIFICATION_TYPES.WARNING: return 'warning';
            case this.NOTIFICATION_TYPES.INFO: return 'info';
            default: return 'info';
        }
    }

    showCustomToast(notification) {
        const toast = document.createElement('div');
        toast.className = `custom-toast custom-toast-${notification.type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <strong>${notification.title}</strong>
                <button type="button" class="close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="toast-body">${notification.message}</div>
        `;

        document.body.appendChild(toast);

        // Автоматичне видалення через 5 секунд
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // Email notification (через EmailJS або API)
    async sendEmailNotification(notification) {
        try {
            // Тут можна інтегрувати EmailJS або відправити на API
            console.log('Sending email notification:', notification);

            // Приклад з EmailJS
            if (typeof emailjs !== 'undefined') {
                await emailjs.send('service_id', 'template_id', {
                    to_email: notification.data.email || 'user@example.com',
                    subject: notification.title,
                    message: notification.message
                });
            }
        } catch (error) {
            console.error('Email notification failed:', error);
        }
    }

    // SMS notification (через Twilio API)
    async sendSMSNotification(notification) {
        try {
            console.log('Sending SMS notification:', notification);

            // Відправка на API endpoint
            if (notification.data.phone) {
                await LiftAPI.request('/notifications/sms', 'POST', {
                    phone: notification.data.phone,
                    message: `${notification.title}: ${notification.message}`
                });
            }
        } catch (error) {
            console.error('SMS notification failed:', error);
        }
    }

    // Синхронізація з сервером
    async syncWithServer() {
        try {
            const serverNotifications = await LiftAPI.request('/notifications', 'GET');
            if (serverNotifications && Array.isArray(serverNotifications)) {
                // Злиття з локальними
                this.mergeServerNotifications(serverNotifications);
            }
        } catch (error) {
            console.error('Failed to sync notifications:', error);
        }
    }

    mergeServerNotifications(serverNotifications) {
        const existingIds = new Set(this.notifications.map(n => n.id));

        for (const serverNotif of serverNotifications) {
            if (!existingIds.has(serverNotif.id)) {
                this.notifications.unshift(serverNotif);
            }
        }

        this.updateUnreadCount();
        this.save();
    }

    // Event listeners
    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => callback(event, data));
    }

    // Швидкі методи для поширених нотифікацій
    static success(title, message, data = {}) {
        return window.notificationManager.add({
            type: this.NOTIFICATION_TYPES.SUCCESS,
            title,
            message,
            data
        });
    }

    static error(title, message, data = {}) {
        return window.notificationManager.add({
            type: this.NOTIFICATION_TYPES.ERROR,
            title,
            message,
            data
        });
    }

    static warning(title, message, data = {}) {
        return window.notificationManager.add({
            type: this.NOTIFICATION_TYPES.WARNING,
            title,
            message,
            data
        });
    }

    static info(title, message, data = {}) {
        return window.notificationManager.add({
            type: this.NOTIFICATION_TYPES.INFO,
            title,
            message,
            data
        });
    }

    static maintenance(liftName, message, data = {}) {
        return window.notificationManager.add({
            type: this.NOTIFICATION_TYPES.MAINTENANCE,
            title: `Manutenção: ${liftName}`,
            message,
            data,
            channels: [this.NOTIFICATION_CHANNELS.IN_APP, this.NOTIFICATION_CHANNELS.PUSH]
        });
    }

    static assignment(technicianName, liftName, data = {}) {
        return window.notificationManager.add({
            type: this.NOTIFICATION_TYPES.ASSIGNMENT,
            title: 'Нове завдання',
            message: `${technicianName}, вам призначено обслуговування ліфта: ${liftName}`,
            data,
            channels: [this.NOTIFICATION_CHANNELS.IN_APP, this.NOTIFICATION_CHANNELS.PUSH, this.NOTIFICATION_CHANNELS.SMS]
        });
    }

    static payment(amount, description, data = {}) {
        return window.notificationManager.add({
            type: this.NOTIFICATION_TYPES.PAYMENT,
            title: 'Оплата послуг',
            message: `Отримано оплату: ${amount} за ${description}`,
            data,
            channels: [this.NOTIFICATION_CHANNELS.IN_APP, this.NOTIFICATION_CHANNELS.EMAIL]
        });
    }
}

// Ініціалізація
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
    window.notificationManager = new NotificationManager();
}

// CSS для custom toast
const toastStyles = `
.custom-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    min-width: 300px;
    max-width: 500px;
    background: white;
    border-radius: 5px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
}

.custom-toast-success { border-left: 4px solid #28a745; }
.custom-toast-error { border-left: 4px solid #dc3545; }
.custom-toast-warning { border-left: 4px solid #ffc107; }
.custom-toast-info { border-left: 4px solid #17a2b8; }

.toast-header {
    padding: 10px 15px;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.toast-body {
    padding: 10px 15px;
}

.close {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #6c757d;
}

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
`;

// Додавання стилів
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = toastStyles;
    document.head.appendChild(style);
}

// Exportar для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}