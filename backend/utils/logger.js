// ═══════════════════════════════════════════════════════════
// STRUCTURED LOGGER — Winston
// ═══════════════════════════════════════════════════════════
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format for console (human-readable)
const consoleFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
        return `${timestamp} [${level}] ${stack || message}${metaStr}`;
    })
);

// JSON format for file (machine-readable, grep-friendly)
const fileFormat = combine(
    timestamp(),
    errors({ stack: true }),
    winston.format.json()
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    transports: [
        // Console — always on
        new winston.transports.Console({ format: consoleFormat }),

        // Error log — only errors (persistent, rotates at 5 MB)
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5 * 1024 * 1024,  // 5 MB
            maxFiles: 5,
            tailable: true,
        }),

        // Combined log — all levels (info+)
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: fileFormat,
            maxsize: 10 * 1024 * 1024, // 10 MB
            maxFiles: 3,
            tailable: true,
        }),
    ],
    // Don't crash on uncaught exceptions — log them
    exceptionHandlers: [
        new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') }),
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') }),
    ],
});

// Convenience: Express request logger middleware
logger.requestMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        const level = res.statusCode >= 500 ? 'error'
                    : res.statusCode >= 400 ? 'warn'
                    : 'http';
        logger.log(level, `${req.method} ${req.originalUrl}`, {
            status: res.statusCode,
            ms,
            ip: req.ip,
            user: req.user?.username || null,
        });
    });
    next();
};

module.exports = logger;
