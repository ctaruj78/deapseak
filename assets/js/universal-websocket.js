/**
 * Universal WebSocket Manager для всіх ролей користувачів
 * Підтримує admin, dispatcher, client, tech ролі
 */
class UniversalWebSocketManager {
    constructor(userRole, userId) {
        this.userRole = userRole;
        this.userId = userId;
        this.ws = null;
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
     * Підключення до WebSocket сервера
     */
    async connect() {
        try {
            const wsUrl = 'ws://localhost:3002';
            console.log(`[WebSocket] Підключення для ролі: ${this.userRole} до ${wsUrl}`);
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = (event) => {
                console.log('[WebSocket] Підключено успішно');
                this.reconnectAttempts = 0;
                this.handleOpen(event);
            };
            
            this.ws.onmessage = (event) => {
                this.handleMessage(event);
            };
            
            this.ws.onclose = (event) => {
                console.log('[WebSocket] З\'єднання закрито:', event.code, event.reason);
                this.handleClose(event);
            };
            
            this.ws.onerror = (error) => {
                console.error('[WebSocket] Помилка:', error);
                this.handleError(error);
            };
            
        } catch (error) {
            console.error('[WebSocket] Помилка підключення:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Обробка відкриття з'єднання
     */
    handleOpen(event) {
        const config = this.roleConfig[this.userRole];
        if (config) {
            // Приєднання до кімнати за роллю
            this.send({
                type: 'join_room',
                room: config.room,
                userId: this.userId,
                userRole: this.userRole
            });
        }
        
        // Повідомляємо про успішне підключення
        this.trigger('connected', { userRole: this.userRole });
    }

    /**
     * Обробка повідомлень
     */
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('[WebSocket] Отримано повідомлення:', data);
            
            // Спеціальна обробка для різних типів повідомлень
            switch (data.type) {
                case 'connection_id':
                    this.connectionId = data.connectionId;
                    console.log('[WebSocket] Connection ID:', this.connectionId);
                    break;
                    
                case 'room_joined':
                    console.log(`[WebSocket] Приєднано до кімнати: ${data.room}`);
                    this.trigger('room_joined', data);
                    break;
                    
                case 'lift_update':
                    this.trigger('lift_update', data.payload);
                    break;
                    
                case 'request_update':
                    this.trigger('request_update', data.payload);
                    break;
                    
                case 'assignment_update':
                    this.trigger('assignment_update', data.payload);
                    break;
                    
                case 'system_alert':
                    this.trigger('system_alert', data.payload);
                    break;
                    
                case 'heartbeat':
                    this.send({ type: 'heartbeat_response' });
                    break;
                    
                default:
                    this.trigger('message', data);
            }
        } catch (error) {
            console.error('[WebSocket] Помилка парсингу повідомлення:', error);
        }
    }

    /**
     * Обробка закриття з'єднання
     */
    handleClose(event) {
        this.connectionId = null;
        this.trigger('disconnected', { code: event.code, reason: event.reason });
        
        // Автоматичне перепідключення
        if (event.code !== 1000) { // Не нормальне закриття
            this.scheduleReconnect();
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
     * Відправка повідомлення
     */
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            console.log('[WebSocket] Відправлено:', data);
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
        if (this.ws) {
            this.ws.close(1000, 'Закрито користувачем');
            this.ws = null;
        }
    }

    /**
     * Перевірка стану з'єднання
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
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