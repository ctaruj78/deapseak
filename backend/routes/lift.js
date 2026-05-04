const express = require('express');
const router = express.Router();
const controller = require('../controllers/liftController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');

// 🔐 Всі роути захищені автентифікацією + роллю admin ou dispatcher
const adminOrDispatcher = [authenticate, authorizeRoles('admin', 'dispatcher')];

// MongoDB routes
router.get('/mongo', ...adminOrDispatcher, controller.getAllLiftsMongo);
router.post('/mongo', ...adminOrDispatcher, controller.createLiftMongo);
router.put('/mongo/:id', ...adminOrDispatcher, controller.updateLiftMongo);
router.delete('/mongo/:id', ...adminOrDispatcher, controller.deleteLiftMongo);

// PostgreSQL routes
router.get('/sql', ...adminOrDispatcher, controller.getAllLiftsSQL);
router.post('/sql', ...adminOrDispatcher, controller.createLiftSQL);
router.put('/sql/:id', ...adminOrDispatcher, controller.updateLiftSQL);
router.delete('/sql/:id', ...adminOrDispatcher, controller.deleteLiftSQL);

module.exports = router;
