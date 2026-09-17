// ============================================
// AUTH MIDDLEWARE - JWT Authentication
// ============================================

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const { isTokenRevoked } = require('./tokenRevocation');

// 🔐 SECURITY: окремі секрети для access і refresh токенів
// Якщо JWT_REFRESH_SECRET не вказано — використовуємо похідний від основного
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ||
    (process.env.JWT_SECRET ? process.env.JWT_SECRET + '_refresh_v1' : null);

if (!JWT_SECRET) {
    console.error('⚠️  CRITICAL: JWT_SECRET não definido em .env! Servidor vulnerável.');
    process.exit(1);
}

// Перевірка JWT токена — ТІЛЬКИ Authorization header (query param небезпечний)
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return next(new AppError('Token de acesso não fornecido', 401));
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return next(new AppError('Недійсний ou прострочений токен', 403));
            }
            if (isTokenRevoked(decoded.id, decoded.iat)) {
                return next(new AppError('Sessão inválida — inicie sessão novamente', 403));
            }
            req.user = decoded;
            next();
        });
    } catch (error) {
        next(new AppError('Erro de autenticação', 401));
    }
};

// Access token: short-lived — refresh token handles session continuity.
// CLAUDE.md documents 15min; NOT set that low yet — ~83 pages call fetch()
// with a raw Authorization header instead of AuthManager.fetchWithAuth()
// (which silently refreshes on 401), so a 15min token would surface visible
// login-expiry friction across most of the app. 2h is a real reduction from
// the previous 8h with much lower risk; drop further once fetchWithAuth
// adoption is closer to universal.
const generateToken = (payload, expiresIn = '2h') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Refresh token: longer-lived, matches CLAUDE.md's documented 7d
const generateRefreshToken = (payload, expiresIn = '7d') => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn });
};

// Перевірка Refresh токена — ОКРЕМИЙ секрет!
const verifyRefreshToken = (token) => {
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
        throw new AppError('Refresh token inválido', 403);
    }
    if (isTokenRevoked(decoded.id, decoded.iat)) {
        throw new AppError('Refresh token inválido', 403);
    }
    return decoded;
};

module.exports = {
    authenticate,
    generateToken,
    generateRefreshToken,
    verifyRefreshToken
};
