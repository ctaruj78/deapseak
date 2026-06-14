require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const liftRoutes = require('./routes/liftRoutes');
const requestRoutes = require('./routes/requestRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const emailRoutes = require('./routes/emailRoutes');
const orcamentosRoutes = require('./routes/orcamentos');
const technicianRoutes = require('./routes/technician');
const reportsRoutes = require('./routes/reportsRoutes');
const inspectionsRoutes = require('./routes/inspections');
const notificationRoutes = require('./routes/notification');
const saftRoutes = require('./routes/saftRoutes');
const websocketService = require('./services/websocketService');

const app = express();

// CORS налаштування - МАКСИМАЛЬНО PERMISSIVE для GitHub Codespaces
// Codespaces має проблеми з preflight запитами, тому дозволяємо ВСЕ
const corsOptions = {
    origin: '*', // Дозволяємо всі origins (для development)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: '*', // Дозволяємо всі headers
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'Authorization'],
    maxAge: 86400, // 24 години
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Застосовуємо CORS ПЕРЕД усіма іншими middleware
app.use(cors(corsOptions));

// Додатковий middleware для примусового додавання CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD');
    res.header('Access-Control-Allow-Headers', req.get('Access-Control-Request-Headers') || '*');
    res.header('Access-Control-Max-Age', '86400');
    
    // Логування
    if (req.method === 'OPTIONS') {
        console.log(`📡 OPTIONS ${req.path} from ${req.get('origin') || 'no-origin'}`);
        // Відразу відповідаємо на OPTIONS без подальшої обробки
        return res.status(204).end();
    }
    
    console.log(`🔍 ${req.method} ${req.path} from ${req.get('origin') || 'no-origin'}`);
    next();
});

// Явна обробка OPTIONS для всіх маршрутів (backup)
app.options('*', (req, res) => {
    console.log(`✅ Explicit OPTIONS handler for ${req.path}`);
    res.status(204).end();
});
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
app.use('/api/settings', settingsRoutes);
app.use('/api', emailRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/saft', saftRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'DeapSeaK v2 API',
        version: '2.0.0',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            lifts: '/api/lifts',
            requests: '/api/requests',
            settings: '/api/settings',
            email: '/api/send-email'
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
