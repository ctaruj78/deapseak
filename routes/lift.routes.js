const express = require('express');
const router = express.Router();
const LiftController = require('../controllers/LiftController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { 
  validateLiftCreation, 
  validateObjectId, 
  validatePagination 
} = require('../middleware/validation');

/**
 * @route   GET /api/lifts
 * @desc    Get all lifts
 * @access  Private
 */
router.get(
  '/',
  authenticateJWT,
  validatePagination,
  LiftController.getAll
);

/**
 * @route   GET /api/lifts/stats
 * @desc    Get lift statistics
 * @access  Private (admin, dispatcher)
 */
router.get(
  '/stats',
  authenticateJWT,
  authorizeRoles('admin', 'dispatcher'),
  LiftController.getStats
);

/**
 * @route   GET /api/lifts/:id
 * @desc    Get lift by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticateJWT,
  validateObjectId,
  LiftController.getById
);

/**
 * @route   POST /api/lifts
 * @desc    Create new lift
 * @access  Private (admin, dispatcher)
 */
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('admin', 'dispatcher'),
  validateLiftCreation,
  LiftController.create
);

/**
 * @route   PUT /api/lifts/:id
 * @desc    Update lift
 * @access  Private (admin, dispatcher, technician)
 */
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin', 'dispatcher', 'technician'),
  validateObjectId,
  LiftController.update
);

/**
 * @route   DELETE /api/lifts/:id
 * @desc    Delete lift
 * @access  Private (admin only)
 */
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  validateObjectId,
  LiftController.delete
);

/**
 * @route   GET /api/lifts/:id/qr
 * @desc    Generate QR code for lift
 * @access  Private (admin, dispatcher)
 */
router.get(
  '/:id/qr',
  authenticateJWT,
  authorizeRoles('admin', 'dispatcher'),
  validateObjectId,
  LiftController.generateQR
);

module.exports = router;