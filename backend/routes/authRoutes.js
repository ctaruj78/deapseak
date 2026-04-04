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

// POST /api/auth/forgot-password - Запит на відновлення пароля
router.post('/forgot-password', authController.requestPasswordReset);

// POST /api/auth/reset-password - Скидання пароля за токеном
router.post('/reset-password', authController.resetPassword);

/**
 * Захищені маршрути (потребують автентифікації)
 */

// GET /api/auth/profile - Отримання профілю поточного користувача
router.get('/profile', authenticate, authController.getProfile);

// GET /api/auth/me - Alias для /profile (зворотна сумісність)
router.get('/me', authenticate, authController.getProfile);

// PUT /api/auth/profile - Оновлення профілю користувача
router.put('/profile', authenticate, authController.updateProfile);

// POST /api/auth/change-password - Зміна пароля
router.post('/change-password', authenticate, authController.changePassword);

/**
 * Адміністративні маршрути (тільки для admin)
 */

// GET /api/auth/users - Отримання списку всіх користувачів
router.get('/users', authenticate, authorizeRoles('admin'), authController.getAllUsers);

// POST /api/auth/users - Створення користувача адміністратором (з тимчасовим паролем + email)
router.post('/users', authenticate, authorizeRoles('admin'), authController.adminCreateUser);

// GET /api/auth/users/:id - Отримання користувача по ID
router.get('/users/:id', authenticate, authorizeRoles('admin'), authController.getUserById);

// PUT /api/auth/users/:id/role - Оновлення ролі користувача
router.put('/users/:id/role', authenticate, authorizeRoles('admin'), authController.updateUserRole);

// PATCH /api/auth/users/:id/role - Alias PATCH для сумісності
router.patch('/users/:id/role', authenticate, authorizeRoles('admin'), authController.updateUserRole);

// POST /api/auth/users/:id/reset-password - Скидання пароля адміністратором
router.post('/users/:id/reset-password', authenticate, authorizeRoles('admin'), authController.adminResetUserPassword);

// PATCH /api/auth/users/:id/ban - Блокування/розблокування користувача
router.patch('/users/:id/ban', authenticate, authorizeRoles('admin'), authController.toggleUserBan);

// DELETE /api/auth/users/:id - Видалення користувача
router.delete('/users/:id', authenticate, authorizeRoles('admin'), authController.deleteUser);

// POST /api/auth/refresh - Оновлення access token через refresh token
router.post('/refresh', authController.refreshToken);

module.exports = router;
