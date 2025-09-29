const express = require('express');
const router = express.Router();
const controller = require('../controllers/technicianController');
const { body } = require('express-validator');

// MongoDB routes
router.get('/mongo', controller.getAllTechniciansMongo);
router.post('/mongo',
	[
		body('firstName').isString().notEmpty(),
		body('lastName').isString().notEmpty(),
		body('status').isString().notEmpty(),
		body('battery').isInt({ min: 0, max: 100 }),
		body('signal').isInt({ min: 0, max: 100 })
	],
	controller.createTechnicianMongo
);
router.put('/mongo/:id',
	[
		body('firstName').optional().isString(),
		body('lastName').optional().isString(),
		body('status').optional().isString(),
		body('battery').optional().isInt({ min: 0, max: 100 }),
		body('signal').optional().isInt({ min: 0, max: 100 })
	],
	controller.updateTechnicianMongo
);
router.delete('/mongo/:id', controller.deleteTechnicianMongo);

// PostgreSQL routes
router.get('/sql', controller.getAllTechniciansSQL);
router.post('/sql',
	[
		body('firstName').isString().notEmpty(),
		body('lastName').isString().notEmpty(),
		body('status').isString().notEmpty(),
		body('battery').isInt({ min: 0, max: 100 }),
		body('signal').isInt({ min: 0, max: 100 })
	],
	controller.createTechnicianSQL
);
router.put('/sql/:id',
	[
		body('firstName').optional().isString(),
		body('lastName').optional().isString(),
		body('status').optional().isString(),
		body('battery').optional().isInt({ min: 0, max: 100 }),
		body('signal').optional().isInt({ min: 0, max: 100 })
	],
	controller.updateTechnicianSQL
);
router.delete('/sql/:id', controller.deleteTechnicianSQL);

module.exports = router;
