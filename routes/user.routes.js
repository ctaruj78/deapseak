const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (admin, dispatcher)
 */
router.get(
  '/',
  authenticateJWT,
  authorizeRoles('admin', 'dispatcher'),
  validatePagination,
  UserController.getAll
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (self or admin/dispatcher)
 */
router.get(
  '/:id',
  authenticateJWT,
  validateObjectId,
  UserController.getById
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (self or admin)
 */
router.put(
  '/:id',
  authenticateJWT,
  validateObjectId,
  UserController.update
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (admin only)
 */
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  validateObjectId,
  UserController.delete
);

module.exports = router;