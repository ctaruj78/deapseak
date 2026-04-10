// ============================================
// AUTH MIDDLEWARE - JWT Authentication
// ============================================

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

// 🔐 SECURITY: окремі секрети для access і refresh токенів
// Якщо JWT_REFRESH_SECRET не вказано — використовуємо похідний від основного
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ||
    (process.env.JWT_SECRET ? process.env.JWT_SECRET + '_refresh_v1' : null);

if (!JWT_SECRET) {
    console.error('⚠️  CRITICAL: JWT_SECRET не вказано в .env! Сервер буде вразливий.');
    process.exit(1);
}

// Перевірка JWT токена — ТІЛЬКИ Authorization header (query param небезпечний)
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

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

// Генерація Access токена (7 днів)
const generateToken = (payload, expiresIn = '30d') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Генерація Refresh токена — ОКРЕМИЙ секрет!
const generateRefreshToken = (payload, expiresIn = '30d') => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn });
};

// Перевірка Refresh токена — ОКРЕМИЙ секрет!
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
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
