const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');

/**
 * Публічні маршрути (без автентифікації)
 */

// POST /api/auth/register - Реєстрація нового користувача
router.post('/register', authController.register);

// POST /api/auth/login - Вхід користувача
router.post('/login', authController.login);

/**
 * Захищені маршрути (потребують автентифікації)
 */

// GET /api/auth/profile - Отримання профілю поточного користувача
router.get('/profile', authenticate, authController.getProfile);

// PUT /api/auth/profile - Оновлення профілю користувача
router.put('/profile', authenticate, authController.updateProfile);

// POST /api/auth/change-password - Зміна пароля
router.post('/change-password', authenticate, authController.changePassword);

/**
 * Адміністративні маршрути (тільки для admin)
 */

// GET /api/auth/users - Отримання списку всіх користувачів
router.get('/users', authenticate, authorizeRoles('admin'), authController.getAllUsers);

// GET /api/auth/users/:id - Отримання користувача по ID
router.get('/users/:id', authenticate, authorizeRoles('admin'), authController.getUserById);

// PUT /api/auth/users/:id/role - Оновлення ролі користувача
router.put('/users/:id/role', authenticate, authorizeRoles('admin'), authController.updateUserRole);

// DELETE /api/auth/users/:id - Видалення користувача
router.delete('/users/:id', authenticate, authorizeRoles('admin'), authController.deleteUser);

module.exports = router;
