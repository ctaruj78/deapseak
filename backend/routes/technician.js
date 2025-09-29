const express = require('express');
const router = express.Router();
const controller = require('../controllers/technicianController');

// MongoDB routes
router.get('/mongo', controller.getAllTechniciansMongo);
router.post('/mongo', controller.createTechnicianMongo);
router.put('/mongo/:id', controller.updateTechnicianMongo);
router.delete('/mongo/:id', controller.deleteTechnicianMongo);

// PostgreSQL routes
router.get('/sql', controller.getAllTechniciansSQL);
router.post('/sql', controller.createTechnicianSQL);
router.put('/sql/:id', controller.updateTechnicianSQL);
router.delete('/sql/:id', controller.deleteTechnicianSQL);

module.exports = router;
