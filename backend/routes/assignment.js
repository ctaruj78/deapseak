const express = require('express');
const router = express.Router();
const controller = require('../controllers/assignmentController');

// MongoDB routes
router.get('/mongo', controller.getAllAssignmentsMongo);
router.post('/mongo', controller.createAssignmentMongo);
router.put('/mongo/:id', controller.updateAssignmentMongo);
router.delete('/mongo/:id', controller.deleteAssignmentMongo);

// PostgreSQL routes
router.get('/sql', controller.getAllAssignmentsSQL);
router.post('/sql', controller.createAssignmentSQL);
router.put('/sql/:id', controller.updateAssignmentSQL);
router.delete('/sql/:id', controller.deleteAssignmentSQL);

module.exports = router;
