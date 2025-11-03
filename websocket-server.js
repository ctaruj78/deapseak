/**
 * WebSocket Server для Real-Time функціональності
 * Заміна симуляції на справжній real-time
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const PORT = process.env.WS_PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'deapseak-super-secret-key-2024';

console.log('🔌 Запуск WebSocket сервера...');

const wss = new WebSocket.Server({ 
    port: PORT,
    host: '0.0.0.0'
});

console.log(`✅ WebSocket сервер запущено на ws://0.0.0.0:${PORT}`);

// Store authenticated connections
const authenticatedClients = new Map();

wss.on('connection', (ws, req) => {
    console.log('📱 Новий WebSocket клієнт підключився');
    
    ws.isAuthenticated = false;
    ws.userId = null;
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'WebSocket підключено. Будь ласка, авторизуйтеся.',
        timestamp: new Date().toISOString()
    }));
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString()); // Безпека
            console.log('📨 Отримано повідомлення:', data.type);
            
            switch (data.type) {
                case 'auth':
                    await handleAuth(ws, data);
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({
                        type: 'pong',
                        timestamp: new Date().toISOString()
                    }));
                    break;
                    
                default:
                    if (ws.isAuthenticated) {
                        // Handle authenticated messages
                        handleAuthenticatedMessage(ws, data);
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Потрібна авторизація',
                            timestamp: new Date().toISOString()
                        }));
                    }
                    break;
            }
            
        } catch (error) {
            console.error('❌ Помилка обробки повідомлення:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Помилка обробки повідомлення',
                timestamp: new Date().toISOString()
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('📱 WebSocket клієнт відключився');
        if (ws.userId) {
            authenticatedClients.delete(ws.userId);
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket помилка:', error);
    });
});

async function handleAuth(ws, data) {
    try {
        const { token } = data;
        
        if (!token) {
            ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Токен не надано',
                timestamp: new Date().toISOString()
            }));
            return;
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        ws.isAuthenticated = true;
        ws.userId = decoded.userId;
        authenticatedClients.set(decoded.userId, ws);
        
        ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'Авторизація успішна',
            userId: decoded.userId,
            timestamp: new Date().toISOString()
        }));
        
        console.log(`✅ Користувач ${decoded.userId} авторизований через WebSocket`);
        
    } catch (error) {
        console.error('❌ Помилка авторизації WebSocket:', error);
        ws.send(JSON.stringify({
            type: 'auth_error',
            message: 'Невірний токен',
            timestamp: new Date().toISOString()
        }));
    }
}

function handleAuthenticatedMessage(ws, data) {
    // Echo back for now
    ws.send(JSON.stringify({
        type: 'echo',
        originalType: data.type,
        data: data,
        timestamp: new Date().toISOString()
    }));
}

// Broadcast to all authenticated clients
function broadcast(message) {
    authenticatedClients.forEach((client, userId) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'broadcast',
                message: message,
                timestamp: new Date().toISOString()
            }));
        }
    });
}

wss.on('error', (error) => {
    console.error('❌ WebSocket сервер помилка:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Зупинка WebSocket сервера...');
    wss.close();
});

process.on('SIGINT', () => {
    console.log('🛑 Зупинка WebSocket сервера...');
    wss.close();
});

module.exports = { wss, broadcast };