const jwt = require('jsonwebtoken');
const log = require('../utils/logger');

/**
 * JWT Authentication Middleware
 */
const authenticateJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      log.warn('Access denied: No token provided', { 
        ip: req.ip, 
        path: req.path 
      });
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      log.warn('Access denied: Invalid token format', { 
        ip: req.ip, 
        path: req.path 
      });
      return res.status(401).json({ 
        error: 'Access denied. Invalid token format.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    log.debug('User authenticated', { 
      userId: decoded.id, 
      role: decoded.role 
    });
    
    next();
  } catch (err) {
    log.error('Token verification failed', { 
      error: err.message, 
      ip: req.ip 
    });
    return res.status(403).json({ 
      error: 'Invalid or expired token.' 
    });
  }
};

/**
 * Role-based authorization middleware
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      log.warn('Authorization failed: Not authenticated', { 
        ip: req.ip, 
        path: req.path 
      });
      return res.status(401).json({ 
        error: 'Access denied. Not authenticated.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      log.warn('Authorization failed: Insufficient permissions', { 
        userId: req.user.id, 
        userRole: req.user.role, 
        requiredRoles: roles 
      });
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }

    log.debug('User authorized', { 
      userId: req.user.id, 
      role: req.user.role 
    });
    
    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      }
    }
  } catch (err) {
    // Ignore errors for optional auth
  }
  
  next();
};

module.exports = {
  authenticateJWT,
  authorizeRoles,
  optionalAuth
};