/**
 * WebSocket Client - Real-Time функціональність
 * Замінює симуляцію на справжній WebSocket зв'язок
 */

class WebSocketClient {
    constructor(serverUrl = 'ws://localhost:3002') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.isConnected = false;
        this.reconnectInterval = 5000; // 5 секунд
        this.maxReconnectAttempts = 10;
        this.reconnectAttempts = 0;
        this.messageQueue = [];
        this.eventHandlers = new Map();
        this.userId = null;
        this.currentRoom = null;
        
        this.connect();
    }

    connect() {
        // logger.log('🔌 Підключення до WebSocket сервера...');
        
        try {
            this.ws = new WebSocket(this.serverUrl);
            this.setupEventHandlers();
        } catch (error) {
            // logger.error('❌ Помилка підключення WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    setupEventHandlers() {
        this.ws.onopen = () => {
            // logger.log('✅ WebSocket підключено');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Надіслати повідомлення з черги
            this.flushMessageQueue();
            
            // Викликати обробник підключення
            this.emit('connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                // logger.error('❌ Помилка парсингу повідомлення:', error);
            }
        };

        this.ws.onclose = (event) => {
            // logger.log('🔌 WebSocket відключено:', event.reason);
            this.isConnected = false;
            this.emit('disconnected', event);
            
            if (!event.wasClean) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            // logger.error('❌ WebSocket помилка:', error);
            this.emit('error', error);
        };
    }

    handleMessage(message) {
        const { type, data } = message;

        switch (type) {
            case 'auth_success':
                // logger.log('✅ Авторизація успішна');
                this.emit('authenticated', data);
                break;
                
            case 'room_joined':
                // logger.log(`📢 Приєдналися до кімнати: ${data.roomId}`);
                this.currentRoom = data.roomId;
                this.emit('room_joined', data);
                break;
                
            case 'user_joined_room':
                // logger.log(`👤 Користувач ${data.userId} приєднався до кімнати`);
                this.emit('user_joined', data);
                break;
                
            case 'user_left_room':
                // logger.log(`👤 Користувач ${data.userId} покинув кімнату`);
                this.emit('user_left', data);
                break;
                
            case 'new_message':
                // logger.log(`💬 Нове повідомлення від ${data.userId}`);
                this.emit('message', data);
                break;
                
            case 'assignment_updated':
                // logger.log(`📋 Оновлення заявки ${data.assignmentId}`);
                this.emit('assignment_update', data);
                break;
                
            case 'monitoring_alert':
                // logger.log(`🚨 ${data.severity.toUpperCase()} алерт: ${data.message}`);
                this.emit('monitoring_alert', data);
                break;
                
            case 'typing_status':
                this.emit('typing', data);
                break;
                
            case 'user_status_changed':
                // logger.log(`👤 ${data.userId} тепер ${data.status}`);
                this.emit('user_status', data);
                break;
                
            case 'error':
                // logger.error('❌ Серверна помилка:', data.error);
                this.emit('server_error', data);
                break;
                
            default:
                // logger.warn('⚠️ Невідомий тип повідомлення:', type);
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            // logger.log(`🔄 Спроба перепідключення ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${this.reconnectInterval}мс`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectInterval);
        } else {
            // logger.error('❌ Досягнуто максимум спроб перепідключення');
            this.emit('max_reconnect_attempts');
        }
    }

    send(message) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Додати до черги якщо не підключено
            this.messageQueue.push(message);
        }
    }

    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }

    // Публічні методи для користування

    authenticate(userId, token) {
        this.userId = userId;
        this.send({
            type: 'auth',
            data: { userId, token }
        });
    }

    joinRoom(roomId) {
        this.send({
            type: 'join_room',
            room: roomId,
            userId: this.userId
        });
    }

    leaveRoom(roomId) {
        this.send({
            type: 'leave_room',
            room: roomId,
            userId: this.userId
        });
    }

    sendChatMessage(roomId, message, messageId) {
        this.send({
            type: 'chat_message',
            data: {
                roomId,
                message,
                userId: this.userId,
                messageId
            }
        });
    }

    updateAssignment(assignmentId, status, description) {
        this.send({
            type: 'assignment_update',
            data: {
                assignmentId,
                status,
                userId: this.userId,
                description
            }
        });
    }

    sendMonitoringAlert(alertId, alertType, severity, message, liftId) {
        this.send({
            type: 'monitoring_alert',
            data: {
                alertId,
                type: alertType,
                severity,
                message,
                liftId
            }
        });
    }

    setTypingStatus(roomId, isTyping) {
        this.send({
            type: 'typing_status',
            data: {
                roomId,
                userId: this.userId,
                isTyping
            }
        });
    }

    updateUserStatus(status) {
        this.send({
            type: 'user_status',
            data: {
                userId: this.userId,
                status
            }
        });
    }

    // Event система
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    // logger.error(`❌ Помилка в обробнику події ${event}:`, error);
                }
            });
        }
    }

    // Утиліти
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
        }
    }

    getConnectionState() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            currentRoom: this.currentRoom,
            userId: this.userId,
            queuedMessages: this.messageQueue.length
        };
    }
}

// Глобальний екземпляр для використання в додатку
let wsClient = null;

// Утилітарні функції для легкого використання
window.WebSocketUtils = {
    // Ініціалізація WebSocket клієнта
    init(userId, token, serverUrl = 'ws://localhost:3002') {
        if (wsClient) {
            wsClient.disconnect();
        }
        
        wsClient = new WebSocketClient(serverUrl);
        
        wsClient.on('connected', () => {
            if (userId && token) {
                wsClient.authenticate(userId, token);
            }
        });
        
        return wsClient;
    },

    // Отримати поточний клієнт
    getClient() {
        return wsClient;
    },

    // Швидкий доступ до подій
    onMessage(handler) {
        if (wsClient) wsClient.on('message', handler);
    },

    onAssignmentUpdate(handler) {
        if (wsClient) wsClient.on('assignment_update', handler);
    },

    onMonitoringAlert(handler) {
        if (wsClient) wsClient.on('monitoring_alert', handler);
    },

    onUserStatus(handler) {
        if (wsClient) wsClient.on('user_status', handler);
    },

    // Швидкі методи
    sendMessage(roomId, message) {
        if (wsClient) {
            wsClient.sendChatMessage(roomId, message, Date.now().toString());
        }
    },

    joinRoom(roomId) {
        if (wsClient) wsClient.joinRoom(roomId);
    },

    leaveRoom(roomId) {
        if (wsClient) wsClient.leaveRoom(roomId);
    }
};

// logger.log('🔌 WebSocket Client завантажено');