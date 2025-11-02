const UserService = require('../services/UserService');
const log = require('../utils/logger');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      log.info('Login attempt', { email, ip: req.ip });
      
      const result = await UserService.authenticate(email, password);
      
      if (!result.success) {
        return res.status(401).json({ error: result.error });
      }
      
      res.json({
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user
      });
    } catch (err) {
      next(err);
    }
  }

  async signup(req, res, next) {
    try {
      const userData = req.body;
      
      log.info('Signup attempt', { email: userData.email, role: userData.role });
      
      const result = await UserService.create(userData);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          errors: result.errors 
        });
      }
      
      res.status(201).json({
        message: 'User created successfully',
        userId: result.userId
      });
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }
      
      // TODO: Implement refresh token logic
      res.status(501).json({ error: 'Not implemented yet' });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      // TODO: Implement token blacklist
      log.info('User logged out', { userId: req.user?.id });
      
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const user = await UserService.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();