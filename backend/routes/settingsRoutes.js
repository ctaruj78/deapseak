const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');

/**
 * Settings Routes
 * Всі маршрути захищені автентифікацією
 */

// GET /api/settings - Отримати налаштування користувача
router.get('/', authenticate, settingsController.getUserSettings);

// PUT /api/settings - Оновити налаштування користувача
router.put('/', authenticate, settingsController.updateUserSettings);

// POST /api/settings/reset - Скинути налаштування до дефолтних
router.post('/reset', authenticate, settingsController.resetSettings);

// PUT /api/settings/language - Оновити мову
router.put('/language', authenticate, settingsController.updateLanguage);

// PUT /api/settings/theme - Оновити тему
router.put('/theme', authenticate, settingsController.updateTheme);

// PUT /api/settings/notifications - Оновити налаштування сповіщень
router.put('/notifications', authenticate, settingsController.updateNotifications);

module.exports = router;
