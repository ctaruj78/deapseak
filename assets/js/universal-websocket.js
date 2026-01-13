/**
 * Universal WebSocket Manager для всіх ролей користувачів
 * Підтримує admin, dispatcher, client, tech ролі
 * Використовує Socket.IO для real-time комунікації
 */
class UniversalWebSocketManager {
    constructor(userRole, userId) {
        this.userRole = userRole;
        this.userId = userId;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.connectionId = null;
        this.eventHandlers = {};
        
        // Налаштування за ролями
        this.roleConfig = {
            admin: {
                events: ['lift_update', 'request_update', 'user_activity', 'system_alert'],
                room: 'admin_room'
            },
            dispatcher: {
                events: ['request_update', 'lift_update', 'tech_assignment', 'emergency_alert'],
                room: 'dispatcher_room'
            },
            client: {
                events: ['request_status_update', 'lift_availability', 'service_notification'],
                room: 'client_room'
            },
            tech: {
                events: ['assignment_update', 'priority_alert', 'lift_diagnostic'],
                room: 'tech_room'
            },
            technician: {
                events: ['assignment_update', 'priority_alert', 'lift_diagnostic'],
                room: 'tech_room'
            }
        };
    }

    /**
     * Підключення до WebSocket сервера через Socket.IO
     */
    async connect() {
        try {
            // Перевірка наявності Socket.IO
            if (typeof io === 'undefined') {
                console.error('[WebSocket] Socket.IO client не завантажено!');
                return;
            }

            const wsUrl = window.location.protocol === 'https:' 
                ? `${window.location.protocol}//${window.location.host}` 
                : 'http://localhost:5000';
            
            console.log(`[WebSocket] Підключення для ролі: ${this.userRole} до ${wsUrl}`);
            
            // Створюємо Socket.IO з'єднання
            this.socket = io(wsUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay
            });
            
            // Обробка подій Socket.IO
            this.socket.on('connect', () => {
                console.log('[WebSocket] Підключено успішно, Socket ID:', this.socket.id);
                this.reconnectAttempts = 0;
                this.handleOpen();
            });
            
            this.socket.on('authenticated', (data) => {
                if (data.success) {
                    console.log('[WebSocket] Автентифіковано:', data.user);
                    this.trigger('connected', { userRole: this.userRole });
                } else {
                    console.error('[WebSocket] Помилка автентифікації:', data.error);
                }
            });
            
            this.socket.on('disconnect', (reason) => {
                console.log('[WebSocket] Відключено:', reason);
                this.handleClose(reason);
            });
            
            this.socket.on('error', (error) => {
                console.error('[WebSocket] Помилка:', error);
                this.handleError(error);
            });

            // Підписка на події ролі
            const config = this.roleConfig[this.userRole];
            if (config && config.events) {
                config.events.forEach(eventName => {
                    this.socket.on(eventName, (data) => {
                        this.trigger(eventName, data);
                    });
                });
            }
            
        } catch (error) {
            console.error('[WebSocket] Помилка підключення:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Обробка відкриття з'єднання
     */
    handleOpen() {
        // Автентифікація через JWT
        const token = localStorage.getItem('token');
        if (token) {
            this.socket.emit('authenticate', token);
        }

        const config = this.roleConfig[this.userRole];
        if (config) {
            // Приєднання до кімнати за роллю
            this.socket.emit('join_room', {
                room: config.room,
                userId: this.userId,
                userRole: this.userRole
            });
        }
    }

    /**
     * Обробка закриття з'єднання
     */
    handleClose(reason) {
        this.connectionId = null;
        this.trigger('disconnected', { reason });
        
        // Автоматичне перепідключення (Socket.IO робить це автоматично)
        if (reason !== 'io client disconnect') {
            console.log('[WebSocket] Спроба автоматичного перепідключення...');
        }
    }

    /**
     * Обробка помилок
     */
    handleError(error) {
        this.trigger('error', error);
    }

    /**
     * Планування перепідключення
     */
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[WebSocket] Спроба перепідключення ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${this.reconnectDelay}мс`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
            
            this.reconnectDelay *= 1.5; // Експоненціальна затримка
        } else {
            console.error('[WebSocket] Максимальна кількість спроб перепідключення вичерпана');
            this.trigger('max_reconnect_attempts_reached');
        }
    }

    /**
     * Відправка повідомлення через Socket.IO
     */
    send(eventName, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(eventName, data);
            console.log(`[WebSocket] Відправлено ${eventName}:`, data);
        } else {
            console.warn('[WebSocket] Неможливо відправити повідомлення - з\'єднання не активне');
        }
    }

    /**
     * Підписка на події
     */
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    /**
     * Відписка від подій
     */
    off(event, handler) {
        if (this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[event].splice(index, 1);
            }
        }
    }

    /**
     * Виклик обробників подій
     */
    trigger(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`[WebSocket] Помилка в обробнику події ${event}:`, error);
                }
            });
        }
    }

    /**
     * Закриття з'єднання
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Перевірка стану з'єднання
     */
    isConnected() {
        return this.socket && this.socket.connected;
    }

    /**
     * Отримання статистики з'єднання
     */
    getConnectionStats() {
        return {
            userRole: this.userRole,
            userId: this.userId,
            connectionId: this.connectionId,
            isConnected: this.isConnected(),
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
}

// Експорт для використання в різних середовищах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalWebSocketManager;
} else if (typeof window !== 'undefined') {
    window.UniversalWebSocketManager = UniversalWebSocketManager;
}