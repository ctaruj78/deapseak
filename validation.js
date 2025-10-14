// Input Validation and Sanitization Module
// Захищає API від некоректних даних та потенційних атак

class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.statusCode = 400;
    }
}

// Основні валідаційні функції
const validators = {
    // Перевірка обов'язкових полів
    required: (value, fieldName) => {
        if (value === undefined || value === null || value === '') {
            throw new ValidationError(`${fieldName} обов'язкове поле`, fieldName);
        }
        return value;
    },

    // Перевірка рядків
    string: (value, fieldName, options = {}) => {
        if (typeof value !== 'string') {
            throw new ValidationError(`${fieldName} має бути рядком`, fieldName);
        }

        const { minLength, maxLength, pattern } = options;

        if (minLength && value.length < minLength) {
            throw new ValidationError(`${fieldName} має містити мінімум ${minLength} символів`, fieldName);
        }

        if (maxLength && value.length > maxLength) {
            throw new ValidationError(`${fieldName} має містити максимум ${maxLength} символів`, fieldName);
        }

        if (pattern && !pattern.test(value)) {
            throw new ValidationError(`${fieldName} має невірний формат`, fieldName);
        }

        return value.trim();
    },

    // Перевірка email
    email: (value, fieldName) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            throw new ValidationError(`${fieldName} має бути валідною електронною адресою`, fieldName);
        }
        return value.toLowerCase().trim();
    },

    // Перевірка пароля
    password: (value, fieldName) => {
        if (value.length < 6) {
            throw new ValidationError(`${fieldName} має містити мінімум 6 символів`, fieldName);
        }

        // Перевірка на наявність цифр та літер
        const hasLetter = /[a-zA-Z]/.test(value);
        const hasNumber = /\d/.test(value);

        if (!hasLetter || !hasNumber) {
            throw new ValidationError(`${fieldName} має містити як літери, так і цифри`, fieldName);
        }

        return value;
    },

    // Перевірка чисел
    number: (value, fieldName, options = {}) => {
        const num = Number(value);
        if (isNaN(num)) {
            throw new ValidationError(`${fieldName} має бути числом`, fieldName);
        }

        const { min, max, integer = false } = options;

        if (integer && !Number.isInteger(num)) {
            throw new ValidationError(`${fieldName} має бути цілим числом`, fieldName);
        }

        if (min !== undefined && num < min) {
            throw new ValidationError(`${fieldName} має бути не менше ${min}`, fieldName);
        }

        if (max !== undefined && num > max) {
            throw new ValidationError(`${fieldName} має бути не більше ${max}`, fieldName);
        }

        return num;
    },

    // Перевірка MongoDB ObjectId
    objectId: (value, fieldName) => {
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        if (!objectIdRegex.test(value)) {
            throw new ValidationError(`${fieldName} має бути валідним ObjectId`, fieldName);
        }
        return value;
    },

    // Перевірка телефонного номера (український формат)
    phone: (value, fieldName) => {
        // Видаляємо всі нецифрові символи для перевірки
        const cleanPhone = value.replace(/\D/g, '');

        // Перевірка на український формат: +380XXXXXXXXX або 0XXXXXXXXX
        const phoneRegex = /^(\+?380|0)[0-9]{9}$/;
        if (!phoneRegex.test(value.replace(/\s+/g, ''))) {
            throw new ValidationError(`${fieldName} має бути валідним українським номером телефону`, fieldName);
        }

        return value.trim();
    },

    // Перевірка дати
    date: (value, fieldName) => {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            throw new ValidationError(`${fieldName} має бути валідною датою`, fieldName);
        }
        return date;
    },

    // Перевірка булевих значень
    boolean: (value, fieldName) => {
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
            throw new ValidationError(`${fieldName} має бути булевим значенням`, fieldName);
        }
        return value === true || value === 'true';
    },

    // Перевірка масивів
    array: (value, fieldName, options = {}) => {
        if (!Array.isArray(value)) {
            throw new ValidationError(`${fieldName} має бути масивом`, fieldName);
        }

        const { minLength, maxLength, itemValidator } = options;

        if (minLength && value.length < minLength) {
            throw new ValidationError(`${fieldName} має містити мінімум ${minLength} елементів`, fieldName);
        }

        if (maxLength && value.length > maxLength) {
            throw new ValidationError(`${fieldName} має містити максимум ${maxLength} елементів`, fieldName);
        }

        // Якщо є валідатор для елементів масиву
        if (itemValidator && typeof itemValidator === 'function') {
            value.forEach((item, index) => {
                try {
                    itemValidator(item, `${fieldName}[${index}]`);
                } catch (error) {
                    throw new ValidationError(`${fieldName}: ${error.message}`, fieldName);
                }
            });
        }

        return value;
    },

    // Перевірка об'єктів
    object: (value, fieldName, schema = {}) => {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new ValidationError(`${fieldName} має бути об'єктом`, fieldName);
        }

        const validated = {};

        // Перевірка обов'язкових полів
        for (const [key, rules] of Object.entries(schema)) {
            const fieldValue = value[key];

            if (rules.required && (fieldValue === undefined || fieldValue === null)) {
                throw new ValidationError(`Поле ${key} обов'язкове`, key);
            }

            if (fieldValue !== undefined && fieldValue !== null) {
                validated[key] = rules.validator(fieldValue, key, rules.options);
            }
        }

        return validated;
    }
};

// Санітизація даних (очищення від потенційно небезпечного контенту)
const sanitizers = {
    // Очищення HTML та скриптів
    html: (value) => {
        if (typeof value !== 'string') return value;
        // Базова очистка від HTML тегів
        return value.replace(/<[^>]*>/g, '').trim();
    },

    // Очищення SQL ін'єкцій (базова)
    sql: (value) => {
        if (typeof value !== 'string') return value;
        // Видаляємо потенційно небезпечні символи
        return value.replace(/['";\\]/g, '').trim();
    },

    // Загальна санітизація рядків
    string: (value) => {
        if (typeof value !== 'string') return value;
        return value.trim().replace(/\s+/g, ' ');
    }
};

// Middleware для Express.js
function validateRequest(schema) {
    return (req, res, next) => {
        try {
            const validated = {};

            // Валідація body
            if (schema.body) {
                validated.body = validators.object(req.body, 'body', schema.body);
            }

            // Валідація query параметрів
            if (schema.query) {
                validated.query = validators.object(req.query, 'query', schema.query);
            }

            // Валідація params
            if (schema.params) {
                validated.params = validators.object(req.params, 'params', schema.params);
            }

            // Зберігаємо валідовані дані в req.validated
            req.validated = validated;

            next();
        } catch (error) {
            // Перетворюємо ValidationError в APIError для сумісності з errorHandler
            const APIError = require('./api-server.js').APIError ||
                class APIError extends Error {
                    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
                        super(message);
                        this.statusCode = statusCode;
                        this.errorCode = errorCode;
                        this.name = 'APIError';
                    }
                };

            if (error instanceof ValidationError) {
                throw new APIError(error.message, 400, 'VALIDATION_ERROR');
            }

            throw error;
        }
    };
}

module.exports = {
    ValidationError,
    validators,
    sanitizers,
    validateRequest
};