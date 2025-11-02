// Тест errorHandler middleware
const APIError = require('./api-server.js').APIError || class APIError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.name = 'APIError';
    }
};

// Симуляція errorHandler middleware
function errorHandler(err, req, res, next) {
    // logger.log('🚨 Error Handler активовано:');
    // logger.log('Час:', new Date().toISOString());
    // logger.log('Метод:', req ? req.method : 'N/A');
    // logger.log('URL:', req ? req.url : 'N/A');

    if (err instanceof APIError) {
        // logger.log('✅ Це APIError:');
        // logger.log('Повідомлення:', err.message);
        // logger.log('Статус код:', err.statusCode);
        // logger.log('Код помилки:', err.errorCode);

        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.errorCode,
                message: err.message,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Для звичайних помилок
    // logger.log('⚠️  Це звичайна помилка:');
    // logger.log('Повідомлення:', err.message);
    // logger.log('Stack:', err.stack);

    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Внутрішня помилка сервера',
            timestamp: new Date().toISOString()
        }
    });
}

// Симуляція Express response
function createMockRes() {
    const res = {
        status: function(code) {
            // logger.log(`📤 Відправка статусу: ${code}`);
            return this;
        },
        json: function(data) {
            // logger.log('📤 Відправка JSON:', JSON.stringify(data, null, 2));
            return this;
        }
    };
    return res;
}

// Тестування з APIError
// logger.log('=== Тест 1: APIError ===');
const mockReq1 = { method: 'POST', url: '/api/login' };
const mockRes1 = createMockRes();
const apiError = new APIError("Неправильний логін або пароль", 401, "INVALID_CREDENTIALS");

errorHandler(apiError, mockReq1, mockRes1);

// logger.log('\n=== Тест 2: Звичайна помилка ===');
const mockReq2 = { method: 'GET', url: '/api/users' };
const mockRes2 = createMockRes();
const regularError = new Error("Database connection failed");

errorHandler(regularError, mockReq2, mockRes2);

// logger.log('\n🎉 Тестування errorHandler завершено!');