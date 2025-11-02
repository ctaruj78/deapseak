require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Check if essential modules exist
let log, errorHandler, notFoundHandler, dbConnection, apiRoutes;

try {
  log = require('./utils/logger');
} catch (err) {
  console.log('⚠️  Logger not found, using console');
  log = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    http: console.log
  };
}

try {
  const errorHandlerModule = require('./middleware/errorHandler');
  errorHandler = errorHandlerModule.errorHandler;
  notFoundHandler = errorHandlerModule.notFoundHandler;
} catch (err) {
  console.log('⚠️  Error handlers not found, using defaults');
  notFoundHandler = (req, res) => {
    res.status(404).json({ error: 'Not found' });
  };
  errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  };
}

try {
  dbConnection = require('./config/database');
} catch (err) {
  console.log('⚠️  Database config not found');
  dbConnection = null;
}

try {
  apiRoutes = require('./routes');
} catch (err) {
  console.log('⚠️  Routes not found, creating basic routes');
  const router = express.Router();
  router.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    });
  });
  apiRoutes = router;
}

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  log.http(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// API ROUTES
// ============================================

app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'DeapSeak API Server',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      lifts: '/api/lifts',
      requests: '/api/requests'
    }
  });
});

// ============================================
// ERROR HANDLERS
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// DATABASE & SERVER START
// ============================================

async function startServer() {
  try {
    log.info('🚀 Starting DeapSeak API Server...');
    
    // Connect to database if available
    if (dbConnection) {
      log.info('📡 Connecting to database...');
      await dbConnection.connect();
      log.info('✅ Database connected');
      
      // Initialize services if they exist
      try {
        const UserService = require('./services/UserService');
        const LiftService = require('./services/LiftService');
        const RequestService = require('./services/RequestService');
        
        log.info('🔧 Initializing services...');
        await Promise.all([
          UserService.init(),
          LiftService.init(),
          RequestService.init()
        ]);
        log.info('✅ Services initialized');
      } catch (err) {
        log.warn('⚠️  Services not initialized:', err.message);
      }
    } else {
      log.warn('⚠️  Running without database connection');
    }
    
    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('========================================');
      console.log('🎉 DeapSeak API Server Started!');
      console.log('========================================');
      console.log('');
      console.log(`🌐 Server URL:  http://localhost:${PORT}`);
      console.log(`📊 API Health:  http://localhost:${PORT}/api/health`);
      console.log(`📚 API Docs:    http://localhost:${PORT}/api`);
      console.log('');
      console.log(`Environment:    ${process.env.NODE_ENV || 'development'}`);
      console.log(`Node Version:   ${process.version}`);
      console.log('');
      console.log('========================================');
      console.log('');
      
      log.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      log.info(`${signal} received: closing server...`);
      
      server.close(async () => {
        log.info('HTTP server closed');
        
        if (dbConnection) {
          try {
            await dbConnection.disconnect();
            log.info('Database connection closed');
          } catch (err) {
            log.error('Error closing database:', err.message);
          }
        }
        
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        log.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (err) => {
      log.error('Uncaught Exception:', err.message);
      console.error(err.stack);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      log.error('Unhandled Rejection:', reason);
      gracefulShutdown('unhandledRejection');
    });
    
  } catch (err) {
    log.error('❌ Failed to start server:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
