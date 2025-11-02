const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

/**
 * Sanitize string input
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/[<>]/g, '');
};

/**
 * Validation rules for user registration
 */
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .customSanitizer(sanitizeString),
  body('role')
    .isIn(['admin', 'dispatcher', 'technician', 'client'])
    .withMessage('Invalid role'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number'),
  handleValidationErrors
];

/**
 * Validation rules for login
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validation rules for lift creation
 */
const validateLiftCreation = [
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 500 })
    .withMessage('Address too long')
    .customSanitizer(sanitizeString),
  body('liftNumber')
    .trim()
    .notEmpty()
    .withMessage('Lift number is required')
    .isLength({ max: 50 })
    .withMessage('Lift number too long')
    .customSanitizer(sanitizeString),
  body('manufacturer')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Manufacturer name too long')
    .customSanitizer(sanitizeString),
  body('model')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Model name too long')
    .customSanitizer(sanitizeString),
  body('installationDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Invalid capacity'),
  handleValidationErrors
];

/**
 * Validation rules for request creation
 */
const validateRequestCreation = [
  body('liftId')
    .isMongoId()
    .withMessage('Invalid lift ID'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters')
    .customSanitizer(sanitizeString),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('type')
    .optional()
    .isIn(['maintenance', 'repair', 'emergency', 'inspection'])
    .withMessage('Invalid request type'),
  body('contactPhone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number'),
  handleValidationErrors
];

/**
 * Validation for status update
 */
const validateStatusUpdate = [
  body('status')
    .isIn(['pending', 'assigned', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment too long')
    .customSanitizer(sanitizeString),
  handleValidationErrors
];

/**
 * Validation for MongoDB ObjectId
 */
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

/**
 * Validation for pagination
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateLogin,
  validateLiftCreation,
  validateRequestCreation,
  validateStatusUpdate,
  validateObjectId,
  validatePagination,
  handleValidationErrors
};