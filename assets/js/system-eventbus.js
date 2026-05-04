/**
 * 🚀 DeapSeaK System EventBus
 * Централізована система комунікації між всіма модулями системи
 * 
 * Приклади використання:
 * eventBus.emit('lift:created', { liftId: 'LIFT_123', data: liftData });
 * eventBus.on('qr:generated', (data) => { console.log('QR код створено', data); });
 */

class DeapSeaKEventBus {
    constructor() {
        this.listeners = new Map();
        this.history = [];
        this.maxHistorySize = 1000;
        
        console.log('🚀 DeapSeaK EventBus ініціалізовано');
        this.setupSystemEvents();
    }

    /**
     * Підписка на подію
     * @param {string} event - назва події  
     * @param {function} callback - функція обробник
     * @param {object} options - додаткові опції
     */
    on(event, callback, options = {}) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            module: options.module || 'unknown',
            id: this.generateId()
        };

        this.listeners.get(event).push(listener);
        
        // Сортуємо за пріоритетом (вищий пріоритет = першим виконується)
        this.listeners.get(event).sort((a, b) => b.priority - a.priority);
        
        console.log(`📡 Підписка на подію "${event}" від модуля "${listener.module}"`);
        return listener.id;
    }

    /**
     * Одноразова підписка на подію
     */
    once(event, callback, options = {}) {
        return this.on(event, callback, { ...options, once: true });
    }

    /**
     * Відправка події
     * @param {string} event - назва події
     * @param {*} data - дані події
     * @param {object} metadata - метадані
     */
    emit(event, data = null, metadata = {}) {
        const eventData = {
            event,
            data,
            metadata: {
                timestamp: new Date().toISOString(),
                source: metadata.source || 'system',
                ...metadata
            },
            id: this.generateId()
        };

        // Додаємо в історію
        this.addToHistory(eventData);

        console.log(`📢 Подія "${event}" відправлена:`, eventData);

        // Виконуємо обробники
        if (this.listeners.has(event)) {
            const listeners = [...this.listeners.get(event)];
            
            listeners.forEach(listener => {
                try {
                    listener.callback(eventData.data, eventData.metadata);
                    
                    // Видаляємо одноразові обробники
                    if (listener.once) {
                        this.off(event, listener.id);
                    }
                } catch (error) {
                    console.error(`❌ Erro в обробнику події "${event}":`, error);
                }
            });
        }

        // Автоматичні системні реакції
        this.handleSystemEvent(eventData);
    }

    /**
     * Відписка від події
     */
    off(event, listenerId) {
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.findIndex(l => l.id === listenerId);
            if (index > -1) {
                listeners.splice(index, 1);
                console.log(`📡 Відписка від події "${event}" (ID: ${listenerId})`);
            }
        }
    }

    /**
     * Системні події для автоматичної інтеграції модулів
     */
    setupSystemEvents() {
        // Elevador створено → Автоматично генеруємо QR код
        this.on('lift:created', (data) => {
            console.log('🏢 Elevador створено, генеруємо QR код...');
            
            setTimeout(() => {
                const qrData = {
                    liftId: data.id,
                    liftName: data.name,
                    type: 'lift_access',
                    data: JSON.stringify(data)
                };
                
                this.emit('qr:auto-generated', qrData, { source: 'lift-system' });
            }, 500);
        });

        // QR код згенеровано → Оновлюємо статистику
        this.on('qr:generated', (data) => {
            console.log('🏷️ QR код створено, оновлюємо статистику...');
            this.emit('analytics:qr-created', data, { source: 'qr-system' });
        });

        // Inspeção заплановано → Налаштовуємо email сповіщення
        this.on('inspection:scheduled', (data) => {
            console.log('📅 Inspeção заплановано, налаштовуємо сповіщення...');
            
            if (data.autoEmails) {
                this.emit('email:schedule-notification', {
                    type: 'inspection_reminder',
                    recipientEmail: data.clientEmail,
                    scheduleDate: data.notificationDate,
                    data: data
                }, { source: 'inspection-system' });
            }
        });

        // Email надіслано → Логуємо в систему
        this.on('email:sent', (data) => {
            console.log('📧 Email надіслано, логуємо подію...');
            this.emit('analytics:email-sent', data, { source: 'email-system' });
        });
    }

    /**
     * Автоматична обробка системних подій
     */
    handleSystemEvent(eventData) {
        const { event, data, metadata } = eventData;

        // Критичні події логуємо в localStorage для відстеження
        const criticalEvents = [
            'lift:created', 'lift:deleted', 
            'qr:generated', 'qr:scanned',
            'inspection:completed', 'inspection:failed',
            'email:sent', 'email:failed'
        ];

        if (criticalEvents.includes(event)) {
            this.logCriticalEvent(eventData);
        }

        // Автоматичні сповіщення для користувача
        this.showUserNotification(eventData);
    }

    /**
     * Логування критичних подій
     */
    logCriticalEvent(eventData) {
        let criticalLog = JSON.parse(localStorage.getItem('system_critical_log') || '[]');
        criticalLog.push(eventData);
        
        // Обмежуємо розмір логу
        if (criticalLog.length > 100) {
            criticalLog = criticalLog.slice(-50);
        }
        
        localStorage.setItem('system_critical_log', JSON.stringify(criticalLog));
    }

    /**
     * Показ сповіщень користувачу
     */
    showUserNotification(eventData) {
        const { event, data } = eventData;
        
        // Definições сповіщень для користувача
        const notificationConfig = {
            'lift:created': { type: 'success', message: 'Elevador com sucesso створено!' },
            'qr:generated': { type: 'info', message: 'QR код автоматично згенеровано' },
            'inspection:scheduled': { type: 'success', message: 'Inspeção заплановано, email буде надіслано автоматично' },
            'email:sent': { type: 'success', message: 'Notificações por email надіслано' },
            'system:error': { type: 'error', message: 'Виникла системна помилка' }
        };

        const config = notificationConfig[event];
        if (config && window.toastr) {
            toastr[config.type](config.message);
        }
    }

    /**
     * Додавання події в історію
     */
    addToHistory(eventData) {
        this.history.push(eventData);
        
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize / 2);
        }
    }

    /**
     * Отримання історії подій
     */
    getHistory(filter = {}) {
        let filteredHistory = [...this.history];

        if (filter.event) {
            filteredHistory = filteredHistory.filter(e => e.event === filter.event);
        }

        if (filter.source) {
            filteredHistory = filteredHistory.filter(e => e.metadata.source === filter.source);
        }

        if (filter.limit) {
            filteredHistory = filteredHistory.slice(-filter.limit);
        }

        return filteredHistory;
    }

    /**
     * Estatísticas do sistema
     */
    getSystemStats() {
        const stats = {
            totalEvents: this.history.length,
            activeListeners: Array.from(this.listeners.entries()).reduce((sum, [event, listeners]) => sum + listeners.length, 0),
            eventTypes: {},
            sources: {}
        };

        this.history.forEach(event => {
            stats.eventTypes[event.event] = (stats.eventTypes[event.event] || 0) + 1;
            stats.sources[event.metadata.source] = (stats.sources[event.metadata.source] || 0) + 1;
        });

        return stats;
    }

    /**
     * Генерація унікального ID
     */
    generateId() {
        return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Debug інформація
     */
    debug() {
        console.group('🔍 DeapSeaK EventBus Debug');
        console.log('📊 Статистика:', this.getSystemStats());
        console.log('📡 Активні підписки:', Object.fromEntries(this.listeners));
        console.log('📜 Остання історія (10 подій):', this.getHistory({ limit: 10 }));
        console.groupEnd();
    }
}

// Створюємо глобальний інстанс EventBus
window.DeapSeaKEventBus = new DeapSeaKEventBus();

// Alias для зручності
window.eventBus = window.DeapSeaKEventBus;

console.log('✅ DeapSeaK EventBus готовий до роботи!');