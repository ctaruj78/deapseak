require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const liftRoutes = require('./routes/liftRoutes');
const requestRoutes = require('./routes/requestRoutes');
const websocketService = require('./services/websocketService');

const app = express();

// CORS налаштування для GitHub Codespaces та локальної розробки
const corsOptions = {
    origin: function (origin, callback) {
        console.log('🔍 CORS Request from origin:', origin);
        
        // Дозволяємо запити без origin (наприклад, curl)
        if (!origin) return callback(null, true);
        
        // Дозволяємо всі localhost порти
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        
        // Дозволяємо всі GitHub Codespaces домени
        if (origin.includes('github.dev') || origin.includes('app.github.dev')) {
            return callback(null, true);
        }
        
        // Логування відхиленого origin
        console.log('⚠️ CORS: Unknown origin', origin);
        callback(null, true); // Дозволяємо всі для розробки
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 години
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Явна обробка OPTIONS для всіх маршрутів
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статична папка для завантажених файлів
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/lifts', liftRoutes);
app.use('/api/requests', requestRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'DeapSeaK v2 API',
        version: '2.0.0',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            lifts: '/api/lifts',
            requests: '/api/requests'
        }
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path
    });
});

app.use(errorHandler);

const startServer = async (port = 3001) => {
    try {
        await connectDB();
        const server = app.listen(port, () => {
            console.log(`
╔════════════════════════════════════════════════╗
║         DeapSeaK v2 API Server                 ║
╠════════════════════════════════════════════════╣
║  Status: Running ✓                             ║
║  Port: ${port}                                    ║
║  Environment: ${process.env.NODE_ENV || 'development'}                    ║
║  MongoDB: Connected ✓                          ║
║  WebSocket: Enabled ✓                          ║
╠════════════════════════════════════════════════╣
║  Endpoints:                                    ║
║  • http://localhost:${port}/                      ║
║  • http://localhost:${port}/health               ║
║  • http://localhost:${port}/api/auth             ║
║  • http://localhost:${port}/api/lifts            ║
║  • http://localhost:${port}/api/requests         ║
║  • ws://localhost:${port} (WebSocket)            ║
╚════════════════════════════════════════════════╝
            `);
        });
        
        // Ініціалізація WebSocket
        websocketService.initialize(server);
        
        process.on('SIGTERM', () => {
            console.log('SIGTERM received. Closing server...');
            server.close(() => {
                console.log('HTTP server closed');
                process.exit(0);
            });
        });
        return server;
    } catch (error) {
        console.error('Server startup error:', error);
        process.exit(1);
    }
};

module.exports = { app, startServer };

if (require.main === module) {
    const PORT = process.env.V2_PORT || process.env.PORT || 3001;
    startServer(PORT);
}
