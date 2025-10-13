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
    console.log('🚨 Error Handler активовано:');
    console.log('Час:', new Date().toISOString());
    console.log('Метод:', req ? req.method : 'N/A');
    console.log('URL:', req ? req.url : 'N/A');

    if (err instanceof APIError) {
        console.log('✅ Це APIError:');
        console.log('Повідомлення:', err.message);
        console.log('Статус код:', err.statusCode);
        console.log('Код помилки:', err.errorCode);

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
    console.log('⚠️  Це звичайна помилка:');
    console.log('Повідомлення:', err.message);
    console.log('Stack:', err.stack);

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
            console.log(`📤 Відправка статусу: ${code}`);
            return this;
        },
        json: function(data) {
            console.log('📤 Відправка JSON:', JSON.stringify(data, null, 2));
            return this;
        }
    };
    return res;
}

// Тестування з APIError
console.log('=== Тест 1: APIError ===');
const mockReq1 = { method: 'POST', url: '/api/login' };
const mockRes1 = createMockRes();
const apiError = new APIError("Неправильний логін або пароль", 401, "INVALID_CREDENTIALS");

errorHandler(apiError, mockReq1, mockRes1);

console.log('\n=== Тест 2: Звичайна помилка ===');
const mockReq2 = { method: 'GET', url: '/api/users' };
const mockRes2 = createMockRes();
const regularError = new Error("Database connection failed");

errorHandler(regularError, mockReq2, mockRes2);

console.log('\n🎉 Тестування errorHandler завершено!');