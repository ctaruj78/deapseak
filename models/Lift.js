const { ObjectId } = require('mongodb');

class Lift {
  static collectionName = 'lifts';

  static schema = {
    address: { type: 'string', required: true },
    liftNumber: { type: 'string', required: true },
    manufacturer: { type: 'string', required: false },
    model: { type: 'string', required: false },
    installationDate: { type: 'date', required: false },
    capacity: { type: 'number', required: false },
    floors: { type: 'number', required: false },
    status: { type: 'string', enum: ['operational', 'maintenance', 'broken', 'offline'], default: 'operational' },
    lastMaintenanceDate: { type: 'date', required: false },
    nextMaintenanceDate: { type: 'date', required: false },
    qrCode: { type: 'string', required: false },
    createdAt: { type: 'date', default: () => new Date() },
    updatedAt: { type: 'date', default: () => new Date() }
  };

  static sanitize(lift) {
    const sanitized = { ...lift };
    if (sanitized._id) {
      sanitized.id = sanitized._id.toString();
      delete sanitized._id;
    }
    return sanitized;
  }

  static validate(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.address) {
      if (!data.address || data.address.length < 5) {
        errors.push('Address must be at least 5 characters');
      }
    }

    if (!isUpdate || data.liftNumber) {
      if (!data.liftNumber) {
        errors.push('Lift number is required');
      }
    }

    if (data.capacity && (data.capacity < 1 || data.capacity > 10000)) {
      errors.push('Capacity must be between 1 and 10000 kg');
    }

    if (data.floors && (data.floors < 1 || data.floors > 200)) {
      errors.push('Floors must be between 1 and 200');
    }

    if (data.status) {
      const validStatuses = ['operational', 'maintenance', 'broken', 'offline'];
      if (!validStatuses.includes(data.status)) {
        errors.push('Invalid status');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

module.exports = Lift;