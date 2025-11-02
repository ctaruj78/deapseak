const { ObjectId } = require('mongodb');
const dbConnection = require('../config/database');
const Request = require('../models/Request');
const log = require('../utils/logger');

class RequestService {
  constructor() {
    this.collection = null;
  }

  async init() {
    this.collection = dbConnection.getCollection(Request.collectionName);
    
    // Create indexes
    await this.collection.createIndex({ liftId: 1 });
    await this.collection.createIndex({ createdBy: 1 });
    await this.collection.createIndex({ assignedTo: 1 });
    await this.collection.createIndex({ status: 1 });
    await this.collection.createIndex({ priority: 1 });
    await this.collection.createIndex({ createdAt: -1 });
    log.info('Request indexes created');
  }

  async create(requestData) {
    try {
      const validation = Request.validate(requestData);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      const request = {
        ...requestData,
        liftId: new ObjectId(requestData.liftId),
        createdBy: new ObjectId(requestData.createdBy),
        assignedTo: requestData.assignedTo ? new ObjectId(requestData.assignedTo) : null,
        status: requestData.status || 'pending',
        priority: requestData.priority || 'normal',
        type: requestData.type || 'repair',
        notes: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.collection.insertOne(request);
      
      log.info('Request created', { 
        requestId: result.insertedId, 
        liftId: requestData.liftId,
        createdBy: requestData.createdBy 
      });

      return { success: true, requestId: result.insertedId.toString() };
    } catch (err) {
      log.error('Error creating request', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  async findById(id) {
    try {
      const request = await this.collection.findOne({ _id: new ObjectId(id) });
      return request ? Request.sanitize(request) : null;
    } catch (err) {
      log.error('Error finding request by ID', { error: err.message, requestId: id });
      return null;
    }
  }

  async findAll({ page = 1, limit = 20, status, priority, liftId, createdBy, assignedTo, type }) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (type) query.type = type;
      if (liftId) query.liftId = new ObjectId(liftId);
      if (createdBy) query.createdBy = new ObjectId(createdBy);
      if (assignedTo) query.assignedTo = new ObjectId(assignedTo);

      const [requests, total] = await Promise.all([
        this.collection.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).toArray(),
        this.collection.countDocuments(query)
      ]);

      return {
        requests: requests.map(Request.sanitize),
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (err) {
      log.error('Error finding requests', { error: err.message });
      throw err;
    }
  }

  async updateStatus(id, status, { updatedBy, comment }) {
    try {
      const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return { success: false, error: 'Invalid status' };
      }

      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'completed') {
        updateData.completedAt = new Date();
      }

      // Add note if comment provided
      const note = {
        createdBy: new ObjectId(updatedBy),
        comment: comment || `Status changed to ${status}`,
        createdAt: new Date()
      };

      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: updateData,
          $push: { notes: note }
        }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'Request not found' };
      }

      log.info('Request status updated', { requestId: id, status, updatedBy });

      return { success: true };
    } catch (err) {
      log.error('Error updating request status', { error: err.message, requestId: id });
      return { success: false, error: err.message };
    }
  }

  async assignTechnician(id, technicianId, assignedBy) {
    try {
      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            assignedTo: new ObjectId(technicianId),
            status: 'assigned',
            updatedAt: new Date()
          },
          $push: {
            notes: {
              createdBy: new ObjectId(assignedBy),
              comment: `Assigned to technician ${technicianId}`,
              createdAt: new Date()
            }
          }
        }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'Request not found' };
      }

      log.info('Request assigned', { requestId: id, technicianId, assignedBy });

      return { success: true };
    } catch (err) {
      log.error('Error assigning request', { error: err.message, requestId: id });
      return { success: false, error: err.message };
    }
  }

  async addNote(id, noteData) {
    try {
      const note = {
        createdBy: new ObjectId(noteData.createdBy),
        comment: noteData.comment,
        createdAt: new Date()
      };

      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $push: { notes: note },
          $set: { updatedAt: new Date() }
        }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'Request not found' };
      }

      log.info('Note added to request', { requestId: id });

      return { success: true };
    } catch (err) {
      log.error('Error adding note', { error: err.message, requestId: id });
      return { success: false, error: err.message };
    }
  }

  async getStats({ liftId, technicianId }) {
    try {
      const query = {};
      if (liftId) query.liftId = new ObjectId(liftId);
      if (technicianId) query.assignedTo = new ObjectId(technicianId);

      const [total, byStatus, byPriority, byType] = await Promise.all([
        this.collection.countDocuments(query),
        this.collection.aggregate([
          { $match: query },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).toArray(),
        this.collection.aggregate([
          { $match: query },
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]).toArray(),
        this.collection.aggregate([
          { $match: query },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]).toArray()
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };
    } catch (err) {
      log.error('Error getting request stats', { error: err.message });
      throw err;
    }
  }
}

module.exports = new RequestService();