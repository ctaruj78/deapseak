/**
 * WebSocket Server для Real-Time функціональності
 * Заміна симуляції на справжній real-time
 */

const WebSocket = require('ws');
const http = require('http');

class WebSocketServer {
    constructor(port = 3002) {
        this.port = port;
        this.clients = new Map(); // userId -> WebSocket connection
        this.rooms = new Map(); // roomId -> Set of userIds
        this.userRooms = new Map(); // userId -> Set of roomIds
        
        this.setupServer();
        this.setupHeartbeat();
    }

    setupServer() {
        // Створюємо HTTP сервер для WebSocket
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });

        this.wss.on('connection', (ws, req) => {
            console.log('🔌 Новий WebSocket клієнт підключився');
            
            ws.isAlive = true;
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(ws, message);
                } catch (error) {
                    console.error('❌ Помилка обробки повідомлення:', error);
                    this.sendError(ws, 'Invalid JSON format');
                }
            });

            ws.on('close', () => {
                this.handleDisconnection(ws);
                console.log('🔌 WebSocket клієнт відключився');
            });

            ws.on('error', (error) => {
                console.error('❌ WebSocket помилка:', error);
            });
        });

        this.server.listen(this.port, () => {
            console.log(`🚀 WebSocket сервер запущено на порту ${this.port}`);
        });
    }

    setupHeartbeat() {
        // Ping клієнтів кожні 30 секунд для підтримки з'єднання
        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) {
                    this.handleDisconnection(ws);
                    return ws.terminate();
                }
                
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }

    handleMessage(ws, message) {
        const { type, data, userId, room } = message;

        switch (type) {
            case 'auth':
                this.handleAuth(ws, data);
                break;
            case 'join_room':
                this.handleJoinRoom(ws, room, userId);
                break;
            case 'leave_room':
                this.handleLeaveRoom(ws, room, userId);
                break;
            case 'chat_message':
                this.handleChatMessage(ws, data);
                break;
            case 'assignment_update':
                this.handleAssignmentUpdate(ws, data);
                break;
            case 'monitoring_alert':
                this.handleMonitoringAlert(ws, data);
                break;
            case 'typing_status':
                this.handleTypingStatus(ws, data);
                break;
            case 'user_status':
                this.handleUserStatus(ws, data);
                break;
            default:
                this.sendError(ws, `Unknown message type: ${type}`);
        }
    }

    handleAuth(ws, data) {
        const { userId, token } = data;
        
        // TODO: Перевірка JWT токена
        if (userId && token) {
            ws.userId = userId;
            this.clients.set(userId, ws);
            
            this.send(ws, {
                type: 'auth_success',
                data: { userId, timestamp: new Date().toISOString() }
            });

            // Повідомити інших про онлайн статус
            this.broadcastUserStatus(userId, 'online');
            
            console.log(`✅ Користувач ${userId} авторизовано`);
        } else {
            this.sendError(ws, 'Authentication failed');
        }
    }

    handleJoinRoom(ws, roomId, userId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        
        if (!this.userRooms.has(userId)) {
            this.userRooms.set(userId, new Set());
        }

        this.rooms.get(roomId).add(userId);
        this.userRooms.get(userId).add(roomId);
        
        ws.currentRoom = roomId;

        this.send(ws, {
            type: 'room_joined',
            data: { roomId, userId, timestamp: new Date().toISOString() }
        });

        // Повідомити інших у кімнаті
        this.broadcastToRoom(roomId, {
            type: 'user_joined_room',
            data: { userId, roomId, timestamp: new Date().toISOString() }
        }, userId);

        console.log(`📢 Користувач ${userId} приєднався до кімнати ${roomId}`);
    }

    handleLeaveRoom(ws, roomId, userId) {
        if (this.rooms.has(roomId)) {
            this.rooms.get(roomId).delete(userId);
            if (this.rooms.get(roomId).size === 0) {
                this.rooms.delete(roomId);
            }
        }
        
        if (this.userRooms.has(userId)) {
            this.userRooms.get(userId).delete(roomId);
        }

        ws.currentRoom = null;

        this.broadcastToRoom(roomId, {
            type: 'user_left_room',
            data: { userId, roomId, timestamp: new Date().toISOString() }
        }, userId);
    }

    handleChatMessage(ws, data) {
        const { roomId, message, userId, messageId } = data;
        
        const messageData = {
            type: 'new_message',
            data: {
                messageId,
                roomId,
                userId,
                message,
                timestamp: new Date().toISOString()
            }
        };

        this.broadcastToRoom(roomId, messageData);
        console.log(`💬 Повідомлення в кімнаті ${roomId} від ${userId}`);
    }

    handleAssignmentUpdate(ws, data) {
        const { assignmentId, status, userId, description } = data;
        
        const updateData = {
            type: 'assignment_updated',
            data: {
                assignmentId,
                status,
                userId,
                description,
                timestamp: new Date().toISOString()
            }
        };

        // Відправити всім адміністраторам та диспетчерам
        this.broadcastToRole(['admin', 'dispatcher'], updateData);
        console.log(`📋 Оновлення заявки ${assignmentId}: ${status}`);
    }

    handleMonitoringAlert(ws, data) {
        const { alertId, type, severity, message, liftId } = data;
        
        const alertData = {
            type: 'monitoring_alert',
            data: {
                alertId,
                alertType: type,
                severity,
                message,
                liftId,
                timestamp: new Date().toISOString()
            }
        };

        // Критичні алерти - всім, інші - тільки техніки та адміни
        const targetRoles = severity === 'critical' 
            ? ['admin', 'dispatcher', 'tech', 'client']
            : ['admin', 'tech'];
            
        this.broadcastToRole(targetRoles, alertData);
        console.log(`🚨 ${severity.toUpperCase()} алерт: ${message}`);
    }

    handleTypingStatus(ws, data) {
        const { roomId, userId, isTyping } = data;
        
        const typingData = {
            type: 'typing_status',
            data: { roomId, userId, isTyping, timestamp: new Date().toISOString() }
        };

        this.broadcastToRoom(roomId, typingData, userId);
    }

    handleUserStatus(ws, data) {
        const { userId, status } = data;
        this.broadcastUserStatus(userId, status);
    }

    handleDisconnection(ws) {
        if (ws.userId) {
            // Видалити з усіх кімнат
            if (this.userRooms.has(ws.userId)) {
                this.userRooms.get(ws.userId).forEach(roomId => {
                    this.handleLeaveRoom(ws, roomId, ws.userId);
                });
                this.userRooms.delete(ws.userId);
            }

            // Повідомити про офлайн статус
            this.broadcastUserStatus(ws.userId, 'offline');
            
            this.clients.delete(ws.userId);
        }
    }

    broadcastToRoom(roomId, message, excludeUserId = null) {
        if (!this.rooms.has(roomId)) return;

        this.rooms.get(roomId).forEach(userId => {
            if (userId !== excludeUserId && this.clients.has(userId)) {
                const ws = this.clients.get(userId);
                this.send(ws, message);
            }
        });
    }

    broadcastToRole(roles, message) {
        // TODO: Отримати список користувачів по ролях з бази даних
        // Поки що відправляємо всім підключеним клієнтам
        this.clients.forEach((ws, userId) => {
            this.send(ws, message);
        });
    }

    broadcastUserStatus(userId, status) {
        const statusMessage = {
            type: 'user_status_changed',
            data: { userId, status, timestamp: new Date().toISOString() }
        };

        this.clients.forEach((ws, clientId) => {
            if (clientId !== userId) {
                this.send(ws, statusMessage);
            }
        });
    }

    send(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    sendError(ws, error) {
        this.send(ws, {
            type: 'error',
            data: { error, timestamp: new Date().toISOString() }
        });
    }

    // Публічні методи для інтеграції з API
    broadcastMessage(roomId, message) {
        this.broadcastToRoom(roomId, message);
    }

    getOnlineUsers() {
        return Array.from(this.clients.keys());
    }

    getUsersInRoom(roomId) {
        return this.rooms.has(roomId) ? Array.from(this.rooms.get(roomId)) : [];
    }
}

// Запуск WebSocket сервера
const wsServer = new WebSocketServer(process.env.WS_PORT || 3002);

module.exports = WebSocketServer;