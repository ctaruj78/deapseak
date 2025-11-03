// validation-schemas.js
const { body } = require('express-validator');

const validateLogin = [
    body('email').optional().isEmail().withMessage('Невалідна email адреса').normalizeEmail(),
    body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Ім\'я користувача має бути від 3 до 50 символів'),
    body('password').exists().withMessage('Пароль обов\'язковий').isLength({ min: 6 }).withMessage('Пароль має містити мінімум 6 символів')
];

const validateRegister = [
    body('username').isLength({ min: 3, max: 50 }).withMessage('Ім\'я користувача має бути від 3 до 50 символів'),
    body('email').isEmail().withMessage('Невалідна email адреса').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Пароль має містити мінімум 6 символів'),
    body('firstName').optional().isLength({ max: 50 }).withMessage('Ім\'я має бути до 50 символів'),
    body('lastName').optional().isLength({ max: 50 }).withMessage('Прізвище має бути до 50 символів')
];

const validateLift = [
    body('name').optional().isLength({ min: 1, max: 100 }),
    body('address').optional().isLength({ min: 1, max: 200 })
];

const validateRequestSchema = [
    body('liftId').optional().isMongoId(),
    body('description').isLength({ min: 10, max: 1000 })
];

const validateAssignment = [
    body('title').isLength({ min: 5, max: 200 }),
    body('description').isLength({ min: 10, max: 1000 })
];

const validateQRCode = [
    body('type').isIn(['lift', 'request', 'technician']),
    body('data').exists()
];

const validateAlert = [
    body('type').isLength({ min: 1, max: 50 }),
    body('title').isLength({ min: 5, max: 200 }),
    body('description').isLength({ min: 10, max: 1000 }),
    body('severity').isIn(['info', 'warning', 'critical'])
];

const validateChatMessage = [
    body('text').optional().isLength({ max: 2000 }),
    body('chatId').exists(),
    body('type').isIn(['direct', 'channel'])
];

const validateFileUpload = [
    body('fileName').isLength({ min: 1, max: 255 }),
    body('fileData').exists(),
    body('chatId').optional()
];

module.exports = {
    validateLogin,
    validateRegister,
    validateLift,
    validateRequest: validateRequestSchema,
    validateAssignment,
    validateQRCode,
    validateAlert,
    validateChatMessage,
    validateFileUpload
};