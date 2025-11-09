require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const liftRoutes = require('./routes/liftRoutes');
const requestRoutes = require('./routes/requestRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const startServer = async (port = 3002) => {
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
╠════════════════════════════════════════════════╣
║  Endpoints:                                    ║
║  • http://localhost:${port}/                      ║
║  • http://localhost:${port}/health               ║
║  • http://localhost:${port}/api/auth             ║
║  • http://localhost:${port}/api/lifts            ║
║  • http://localhost:${port}/api/requests         ║
╚════════════════════════════════════════════════╝
            `);
        });
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
    const PORT = process.env.V2_PORT || process.env.PORT || 3002;
    startServer(PORT);
}
