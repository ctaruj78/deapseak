const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/send-email
 * @desc    Надіслати email (загальний endpoint)
 * @access  Private - Admin only
 */
router.post('/send-email', protect, authorize('admin'), emailController.sendEmail);

/**
 * @route   POST /api/send-password-email
 * @desc    Надіслати пароль користувачу
 * @access  Private - Admin only
 */
router.post('/send-password-email', protect, authorize('admin'), emailController.sendPasswordEmail);

module.exports = router;
