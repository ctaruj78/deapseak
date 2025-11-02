const { ObjectId } = require('mongodb');
const QRCode = require('qrcode');
const dbConnection = require('../config/database');
const Lift = require('../models/Lift');
const log = require('../utils/logger');

class LiftService {
  constructor() {
    this.collection = null;
  }

  async init() {
    this.collection = dbConnection.getCollection(Lift.collectionName);
    
    // Create indexes
    await this.collection.createIndex({ address: 1, liftNumber: 1 }, { unique: true });
    await this.collection.createIndex({ status: 1 });
    await this.collection.createIndex({ qrCode: 1 });
    log.info('Lift indexes created');
  }

  async create(liftData) {
    try {
      const validation = Lift.validate(liftData);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      // Check if lift exists
      const existingLift = await this.collection.findOne({
        address: liftData.address,
        liftNumber: liftData.liftNumber
      });

      if (existingLift) {
        return { success: false, error: 'Lift with this address and number already exists' };
      }

      const lift = {
        ...liftData,
        status: liftData.status || 'operational',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.collection.insertOne(lift);
      
      log.info('Lift created', { liftId: result.insertedId, address: liftData.address });

      return { success: true, liftId: result.insertedId.toString() };
    } catch (err) {
      log.error('Error creating lift', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  async findById(id) {
    try {
      const lift = await this.collection.findOne({ _id: new ObjectId(id) });
      return lift ? Lift.sanitize(lift) : null;
    } catch (err) {
      log.error('Error finding lift by ID', { error: err.message, liftId: id });
      return null;
    }
  }

  async findAll({ page = 1, limit = 20, status, address, search }) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      if (status) query.status = status;
      if (address) query.address = { $regex: address, $options: 'i' };
      if (search) {
        query.$or = [
          { address: { $regex: search, $options: 'i' } },
          { liftNumber: { $regex: search, $options: 'i' } },
          { manufacturer: { $regex: search, $options: 'i' } }
        ];
      }

      const [lifts, total] = await Promise.all([
        this.collection.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).toArray(),
        this.collection.countDocuments(query)
      ]);

      return {
        lifts: lifts.map(Lift.sanitize),
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (err) {
      log.error('Error finding lifts', { error: err.message });
      throw err;
    }
  }

  async update(id, updateData) {
    try {
      const validation = Lift.validate(updateData, true);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      updateData.updatedAt = new Date();

      const result = await this.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'Lift not found' };
      }

      log.info('Lift updated', { liftId: id });

      return { success: true };
    } catch (err) {
      log.error('Error updating lift', { error: err.message, liftId: id });
      return { success: false, error: err.message };
    }
  }

  async delete(id) {
    try {
      const result = await this.collection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return { success: false, error: 'Lift not found' };
      }

      log.info('Lift deleted', { liftId: id });

      return { success: true };
    } catch (err) {
      log.error('Error deleting lift', { error: err.message, liftId: id });
      return { success: false, error: err.message };
    }
  }

  async generateQRCode(liftId) {
    try {
      const lift = await this.findById(liftId);
      if (!lift) {
        return { success: false, error: 'Lift not found' };
      }

      // Generate QR code data
      const qrData = {
        liftId: liftId,
        address: lift.address,
        liftNumber: lift.liftNumber,
        url: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/request?liftId=${liftId}`
      };

      // Generate QR code as base64
      const qrCodeBase64 = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300
      });

      // Save QR code reference in database
      await this.collection.updateOne(
        { _id: new ObjectId(liftId) },
        { $set: { qrCode: qrCodeBase64, updatedAt: new Date() } }
      );

      log.info('QR code generated', { liftId });

      return { success: true, qrCode: qrCodeBase64 };
    } catch (err) {
      log.error('Error generating QR code', { error: err.message, liftId });
      return { success: false, error: err.message };
    }
  }

  async getStats() {
    try {
      const [total, byStatus] = await Promise.all([
        this.collection.countDocuments(),
        this.collection.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).toArray()
      ]);

      const stats = {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };

      return stats;
    } catch (err) {
      log.error('Error getting lift stats', { error: err.message });
      throw err;
    }
  }
}

module.exports = new LiftService();