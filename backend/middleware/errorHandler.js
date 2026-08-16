// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

const logger = require('../utils/logger');

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message,
            stack: err.stack,
            error: err
        });
    } else {
        // Production - приховуємо деталі помилок
        if (err.isOperational) {
            res.status(err.statusCode).json({
                success: false,
                status: err.status,
                message: err.message
            });
        } else {
            // Непередбачувані помилки — vão para logs/error.log (winston) além do
            // console.error que só sobrevive via captura de stdout/stderr do PM2.
            console.error('❌ ERROR:', err);
            logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`, { stack: err.stack });
            res.status(500).json({
                success: false,
                status: 'error',
                message: 'Algo correu mal!'
            });
        }
    }
};

module.exports = { AppError, errorHandler };
