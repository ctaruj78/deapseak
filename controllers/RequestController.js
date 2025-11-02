const RequestService = require('../services/RequestService');
const log = require('../utils/logger');

class RequestController {
  async getAll(req, res, next) {
    try {
      const { page, limit, status, priority, liftId, type } = req.query;
      
      // Clients can only see their own requests
      const filter = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        priority,
        liftId,
        type
      };
      
      if (req.user.role === 'client') {
        filter.createdBy = req.user.id;
      }
      
      if (req.user.role === 'technician') {
        filter.assignedTo = req.user.id;
      }
      
      const result = await RequestService.findAll(filter);
      
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      
      const request = await RequestService.findById(id);
      
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      // Check permission
      if (req.user.role === 'client' && request.createdBy !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (req.user.role === 'technician' && request.assignedTo !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(request);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      log.info('Creating request', { 
        createdBy: req.user.id, 
        liftId: req.body.liftId 
      });
      
      const requestData = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const result = await RequestService.create(requestData);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          errors: result.errors 
        });
      }
      
      res.status(201).json({
        message: 'Request created successfully',
        requestId: result.requestId
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, comment } = req.body;
      
      log.info('Updating request status', { 
        requestId: id, 
        newStatus: status, 
        updatedBy: req.user.id 
      });
      
      const result = await RequestService.updateStatus(id, status, {
        updatedBy: req.user.id,
        comment
      });
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ message: 'Request status updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async assign(req, res, next) {
    try {
      const { id } = req.params;
      const { technicianId } = req.body;
      
      if (!technicianId) {
        return res.status(400).json({ error: 'Technician ID is required' });
      }
      
      log.info('Assigning request', { 
        requestId: id, 
        technicianId, 
        assignedBy: req.user.id 
      });
      
      const result = await RequestService.assignTechnician(id, technicianId, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ message: 'Request assigned successfully' });
    } catch (err) {
      next(err);
    }
  }

  async addNote(req, res, next) {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      
      if (!comment) {
        return res.status(400).json({ error: 'Comment is required' });
      }
      
      const noteData = {
        createdBy: req.user.id,
        comment
      };
      
      const result = await RequestService.addNote(id, noteData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ message: 'Note added successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req, res, next) {
    try {
      const { liftId, technicianId } = req.query;
      
      // Technicians can only see their own stats
      const filter = {};
      if (req.user.role === 'technician') {
        filter.technicianId = req.user.id;
      } else if (technicianId) {
        filter.technicianId = technicianId;
      }
      
      if (liftId) {
        filter.liftId = liftId;
      }
      
      const stats = await RequestService.getStats(filter);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RequestController();