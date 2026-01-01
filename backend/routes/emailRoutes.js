const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');

/**
 * @route   POST /api/send-email
 * @desc    Надіслати email (загальний endpoint)
 * @access  Private - Admin only
 */
router.post('/send-email', authenticate, authorizeRoles('admin'), emailController.sendEmail);

/**
 * @route   POST /api/send-password-email
 * @desc    Надіслати пароль користувачу
 * @access  Private - Admin only
 */
router.post('/send-password-email', authenticate, authorizeRoles('admin'), emailController.sendPasswordEmail);

module.exports = router;
