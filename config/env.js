require('dotenv').config();

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
  
  // Ports
  webPort1: process.env.WEB_PORT_1 || 8080,
  webPort2: process.env.WEB_PORT_2 || 8081,
  
  // Database
  mongoUri: process.env.MONGODB_URI,
  
  // Auth
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET
  },
  
  // API
  apiKey: process.env.API_KEY,
  
  // Services
  qrServiceKey: process.env.QR_SERVICE_API_KEY,
  notificationKey: process.env.NOTIFICATION_SERVICE_KEY,
  
  // CORS
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3001').split(','),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL,
    initialPassword: process.env.ADMIN_INITIAL_PASSWORD
  }
};

// Validation
const required = ['MONGODB_URI', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'];
required.forEach(key => {
  if (!process.env[key]) {
    // logger.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
});

module.exports = config;