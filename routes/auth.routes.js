const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticateJWT } = require('../middleware/auth');
const { validateLogin, validateUserRegistration } = require('../middleware/validation');

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', validateLogin, AuthController.login);

/**
 * @route   POST /api/auth/signup
 * @desc    User registration
 * @access  Public
 */
router.post('/signup', validateUserRegistration, AuthController.signup);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', AuthController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateJWT, AuthController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticateJWT, AuthController.me);

module.exports = router;
