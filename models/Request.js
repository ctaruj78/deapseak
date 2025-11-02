const { ObjectId } = require('mongodb');

class Request {
  static collectionName = 'requests';

  static schema = {
    liftId: { type: 'ObjectId', required: true },
    createdBy: { type: 'ObjectId', required: true },
    assignedTo: { type: 'ObjectId', required: false },
    description: { type: 'string', required: true },
    type: { type: 'string', enum: ['maintenance', 'repair', 'emergency', 'inspection'], default: 'repair' },
    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    status: { type: 'string', enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    contactPhone: { type: 'string', required: false },
    notes: { type: 'array', default: [] },
    attachments: { type: 'array', default: [] },
    createdAt: { type: 'date', default: () => new Date() },
    updatedAt: { type: 'date', default: () => new Date() },
    completedAt: { type: 'date', required: false }
  };

  static sanitize(request) {
    const sanitized = { ...request };
    if (sanitized._id) {
      sanitized.id = sanitized._id.toString();
      delete sanitized._id;
    }
    if (sanitized.liftId instanceof ObjectId) {
      sanitized.liftId = sanitized.liftId.toString();
    }
    if (sanitized.createdBy instanceof ObjectId) {
      sanitized.createdBy = sanitized.createdBy.toString();
    }
    if (sanitized.assignedTo instanceof ObjectId) {
      sanitized.assignedTo = sanitized.assignedTo.toString();
    }
    return sanitized;
  }

  static validate(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.liftId) {
      if (!data.liftId) {
        errors.push('Lift ID is required');
      }
    }

    if (!isUpdate || data.description) {
      if (!data.description || data.description.length < 10) {
        errors.push('Description must be at least 10 characters');
      }
      if (data.description && data.description.length > 1000) {
        errors.push('Description must be less than 1000 characters');
      }
    }

    if (data.type) {
      const validTypes = ['maintenance', 'repair', 'emergency', 'inspection'];
      if (!validTypes.includes(data.type)) {
        errors.push('Invalid request type');
      }
    }

    if (data.priority) {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(data.priority)) {
        errors.push('Invalid priority');
      }
    }

    if (data.status) {
      const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(data.status)) {
        errors.push('Invalid status');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

module.exports = Request;