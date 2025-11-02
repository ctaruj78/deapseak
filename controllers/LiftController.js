const LiftService = require('../services/LiftService');
const log = require('../utils/logger');

class LiftController {
  async getAll(req, res, next) {
    try {
      const { page, limit, status, address, search } = req.query;
      
      const result = await LiftService.findAll({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        address,
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
      
      const lift = await LiftService.findById(id);
      
      if (!lift) {
        return res.status(404).json({ error: 'Lift not found' });
      }
      
      res.json(lift);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      log.info('Creating lift', { 
        createdBy: req.user.id, 
        address: req.body.address 
      });
      
      const result = await LiftService.create(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          errors: result.errors 
        });
      }
      
      res.status(201).json({
        message: 'Lift created successfully',
        liftId: result.liftId
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      
      log.info('Updating lift', { liftId: id, updatedBy: req.user.id });
      
      const result = await LiftService.update(id, req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          errors: result.errors 
        });
      }
      
      res.json({ message: 'Lift updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      
      log.info('Deleting lift', { liftId: id, deletedBy: req.user.id });
      
      const result = await LiftService.delete(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ message: 'Lift deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async generateQR(req, res, next) {
    try {
      const { id } = req.params;
      
      log.info('Generating QR code', { liftId: id, requestedBy: req.user.id });
      
      const result = await LiftService.generateQRCode(id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ 
        message: 'QR code generated successfully',
        qrCode: result.qrCode 
      });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await LiftService.getStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LiftController();