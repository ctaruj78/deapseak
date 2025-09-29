const express = require('express');
const router = express.Router();
const controller = require('../controllers/liftController');

// MongoDB routes
router.get('/mongo', controller.getAllLiftsMongo);
router.post('/mongo', controller.createLiftMongo);
router.put('/mongo/:id', controller.updateLiftMongo);
router.delete('/mongo/:id', controller.deleteLiftMongo);

// PostgreSQL routes
router.get('/sql', controller.getAllLiftsSQL);
router.post('/sql', controller.createLiftSQL);
router.put('/sql/:id', controller.updateLiftSQL);
router.delete('/sql/:id', controller.deleteLiftSQL);

module.exports = router;
