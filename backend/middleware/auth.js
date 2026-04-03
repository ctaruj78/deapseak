// ============================================
// AUTH MIDDLEWARE - JWT Authentication
// ============================================

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'deapseak_secret_key_2024';

// Перевірка JWT токена (підтримує Authorization header АБО query parameter)
const authenticate = (req, res, next) => {
    try {
        // Спробуємо отримати token з Authorization header
        const authHeader = req.headers['authorization'];
        let token = authHeader && authHeader.split(' ')[1];
        
        // WORKAROUND для GitHub Codespaces CORS:
        // Якщо token немає в header, шукаємо в query parameter
        if (!token && req.query.token) {
            token = req.query.token;
            console.log('🔑 Token from query parameter (CORS workaround)');
        }

        if (!token) {
            return next(new AppError('Токен доступу відсутній', 401));
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return next(new AppError('Недійсний або прострочений токен', 403));
            }

            req.user = decoded;
            next();
        });
    } catch (error) {
        next(new AppError('Помилка автентифікації', 401));
    }
};

// Генерація JWT токена
const generateToken = (payload, expiresIn = '7d') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Генерація Refresh токена
const generateRefreshToken = (payload, expiresIn = '30d') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Перевірка Refresh токена
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new AppError('Недійсний refresh токен', 403);
    }
};

module.exports = {
    authenticate,
    generateToken,
    generateRefreshToken,
    verifyRefreshToken
};
