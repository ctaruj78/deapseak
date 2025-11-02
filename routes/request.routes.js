const express = require('express');
const router = express.Router();
const RequestController = require('../controllers/RequestController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { 
  validateRequestCreation,
  validateStatusUpdate,
  validateObjectId, 
  validatePagination 
} = require('../middleware/validation');

/**
 * @route   GET /api/requests
 * @desc    Get all requests
 * @access  Private (filtered by role)
 */
router.get(
  '/',
  authenticateJWT,
  validatePagination,
  RequestController.getAll
);

/**
 * @route   GET /api/requests/stats
 * @desc    Get request statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticateJWT,
  RequestController.getStats
);

/**
 * @route   GET /api/requests/:id
 * @desc    Get request by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticateJWT,
  validateObjectId,
  RequestController.getById
);

/**
 * @route   POST /api/requests
 * @desc    Create new request
 * @access  Private
 */
router.post(
  '/',
  authenticateJWT,
  validateRequestCreation,
  RequestController.create
);

/**
 * @route   PUT /api/requests/:id/status
 * @desc    Update request status
 * @access  Private (admin, dispatcher, technician)
 */
router.put(
  '/:id/status',
  authenticateJWT,
  authorizeRoles('admin', 'dispatcher', 'technician'),
  validateObjectId,
  validateStatusUpdate,
  RequestController.updateStatus
);

/**
 * @route   PUT /api/requests/:id/assign
 * @desc    Assign request to technician
 * @access  Private (admin, dispatcher)
 */
router.put(
  '/:id/assign',
  authenticateJWT,
  authorizeRoles('admin', 'dispatcher'),
  validateObjectId,
  RequestController.assign
);

/**
 * @route   POST /api/requests/:id/notes
 * @desc    Add note to request
 * @access  Private
 */
router.post(
  '/:id/notes',
  authenticateJWT,
  validateObjectId,
  RequestController.addNote
);

module.exports = router;