const UserService = require('../services/UserService');
const log = require('../utils/logger');

class UserController {
  async getAll(req, res, next) {
    try {
      const { page, limit, role, search } = req.query;
      
      const result = await UserService.findAll({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        role,
        search
      });
      
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      
      // Check permission
      if (req.user.id !== id && !['admin', 'dispatcher'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const user = await UserService.findById(id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      
      // Check permission
      if (req.user.id !== id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const result = await UserService.update(id, req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          errors: result.errors 
        });
      }
      
      res.json({ message: 'User updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      
      const result = await UserService.delete(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();