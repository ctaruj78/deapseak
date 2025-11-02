const { ObjectId } = require('mongodb');

class User {
  static collectionName = 'users';

  static schema = {
    email: { type: 'string', required: true, unique: true },
    password: { type: 'string', required: true },
    name: { type: 'string', required: true },
    role: { type: 'string', required: true, enum: ['admin', 'dispatcher', 'technician', 'client'] },
    phone: { type: 'string', required: false },
    createdAt: { type: 'date', default: () => new Date() },
    updatedAt: { type: 'date', default: () => new Date() },
    isActive: { type: 'boolean', default: true }
  };

  static sanitize(user) {
    const sanitized = { ...user };
    delete sanitized.password;
    if (sanitized._id) {
      sanitized.id = sanitized._id.toString();
      delete sanitized._id;
    }
    return sanitized;
  }

  static validate(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.email) {
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Invalid email address');
      }
    }

    if (!isUpdate && !data.password) {
      errors.push('Password is required');
    }

    if (data.password && data.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!isUpdate || data.name) {
      if (!data.name || data.name.length < 2) {
        errors.push('Name must be at least 2 characters');
      }
    }

    if (!isUpdate || data.role) {
      const validRoles = ['admin', 'dispatcher', 'technician', 'client'];
      if (!data.role || !validRoles.includes(data.role)) {
        errors.push('Invalid role');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

module.exports = User;