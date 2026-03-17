const express = require('express');
const router = express.Router();
const controller = require('../controllers/technicianController');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');

// 🔐 Всі роути вимагають автентифікацію + роль admin або dispatcher
const adminOrDispatcher = [authenticate, authorizeRoles('admin', 'dispatcher')];

// MongoDB routes
router.get('/', ...adminOrDispatcher, controller.getAllTechniciansMongo);
router.get('/mongo', ...adminOrDispatcher, controller.getAllTechniciansMongo);
router.post('/mongo', ...adminOrDispatcher,
	[
		body('firstName').isString().notEmpty(),
		body('lastName').isString().notEmpty(),
		body('status').isString().notEmpty(),
		body('battery').isInt({ min: 0, max: 100 }),
		body('signal').isInt({ min: 0, max: 100 })
	],
	controller.createTechnicianMongo
);
router.put('/mongo/:id', ...adminOrDispatcher,
	[
		body('firstName').optional().isString(),
		body('lastName').optional().isString(),
		body('status').optional().isString(),
		body('battery').optional().isInt({ min: 0, max: 100 }),
		body('signal').optional().isInt({ min: 0, max: 100 })
	],
	controller.updateTechnicianMongo
);
router.delete('/mongo/:id', ...adminOrDispatcher, controller.deleteTechnicianMongo);

// PostgreSQL routes
router.get('/sql', ...adminOrDispatcher, controller.getAllTechniciansSQL);
router.post('/sql', ...adminOrDispatcher,
	[
		body('firstName').isString().notEmpty(),
		body('lastName').isString().notEmpty(),
		body('status').isString().notEmpty(),
		body('battery').isInt({ min: 0, max: 100 }),
		body('signal').isInt({ min: 0, max: 100 })
	],
	controller.createTechnicianSQL
);
router.put('/sql/:id', ...adminOrDispatcher,
	[
		body('firstName').optional().isString(),
		body('lastName').optional().isString(),
		body('status').optional().isString(),
		body('battery').optional().isInt({ min: 0, max: 100 }),
		body('signal').optional().isInt({ min: 0, max: 100 })
	],
	controller.updateTechnicianSQL
);
router.delete('/sql/:id', ...adminOrDispatcher, controller.deleteTechnicianSQL);

module.exports = router;
