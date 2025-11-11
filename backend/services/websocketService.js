const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

class WebSocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // userId -> socketId
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:5000',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        // Автентифікація при підключенні
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                return next(new Error('Authentication error'));
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.id;
                socket.userRole = decoded.role;
                next();
            } catch (err) {
                next(new Error('Invalid token'));
            }
        });

        this.io.on('connection', (socket) => {
            console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`);
            
            // Зберегти з'єднання
            this.connectedUsers.set(socket.userId, socket.id);

            // Приєднатися до кімнати по ролі
            socket.join(socket.userRole);
            
            // Обробники подій
            socket.on('disconnect', () => {
                console.log(`❌ User disconnected: ${socket.userId}`);
                this.connectedUsers.delete(socket.userId);
            });

            socket.on('join-request', (requestId) => {
                socket.join(`request-${requestId}`);
                console.log(`User ${socket.userId} joined request ${requestId}`);
            });

            socket.on('leave-request', (requestId) => {
                socket.leave(`request-${requestId}`);
            });
        });

        console.log('✅ WebSocket server initialized');
    }

    // Надіслати повідомлення всім користувачам певної ролі
    emitToRole(role, event, data) {
        if (this.io) {
            this.io.to(role).emit(event, data);
        }
    }

    // Надіслати повідомлення конкретному користувачу
    emitToUser(userId, event, data) {
        const socketId = this.connectedUsers.get(userId);
        if (socketId && this.io) {
            this.io.to(socketId).emit(event, data);
        }
    }

    // Надіслати повідомлення всім, хто підписаний на заявку
    emitToRequest(requestId, event, data) {
        if (this.io) {
            this.io.to(`request-${requestId}`).emit(event, data);
        }
    }

    // Повідомити про нову заявку
    notifyNewRequest(request) {
        this.emitToRole('admin', 'request:new', request);
        this.emitToRole('dispatcher', 'request:new', request);
    }

    // Повідомити про призначення техніка
    notifyRequestAssigned(request) {
        if (request.client) {
            this.emitToUser(request.client.toString(), 'request:assigned', request);
        }
        if (request.assignedTo) {
            this.emitToUser(request.assignedTo.toString(), 'request:assigned', request);
        }
        this.emitToRequest(request._id.toString(), 'request:assigned', request);
    }

    // Повідомити про зміну статусу
    notifyStatusChange(request, oldStatus, newStatus) {
        const notification = {
            request,
            oldStatus,
            newStatus
        };

        if (request.client) {
            this.emitToUser(request.client.toString(), 'request:status-changed', notification);
        }
        if (request.assignedTo) {
            this.emitToUser(request.assignedTo.toString(), 'request:status-changed', notification);
        }
        this.emitToRequest(request._id.toString(), 'request:status-changed', notification);
        this.emitToRole('admin', 'request:status-changed', notification);
        this.emitToRole('dispatcher', 'request:status-changed', notification);
    }

    // Повідомити про завершення заявки
    notifyRequestCompleted(request) {
        if (request.client) {
            this.emitToUser(request.client.toString(), 'request:completed', request);
        }
        this.emitToRequest(request._id.toString(), 'request:completed', request);
        this.emitToRole('admin', 'request:completed', request);
        this.emitToRole('dispatcher', 'request:completed', request);
    }

    // Повідомити про новий коментар
    notifyNewComment(request, comment) {
        const notification = {
            request: request._id,
            comment
        };

        if (request.client) {
            this.emitToUser(request.client.toString(), 'request:new-comment', notification);
        }
        if (request.assignedTo) {
            this.emitToUser(request.assignedTo.toString(), 'request:new-comment', notification);
        }
        this.emitToRequest(request._id.toString(), 'request:new-comment', notification);
    }
}

module.exports = new WebSocketService();
