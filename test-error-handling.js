// Тестовий файл для перевірки error handling
class APIError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.name = 'APIError';
    }
}

// Тестування створення помилки
try {
    throw new APIError("Тестова помилка", 400, "TEST_ERROR");
} catch (error) {
    // logger.log("✅ APIError працює:");
    // logger.log("Повідомлення:", error.message);
    // logger.log("Статус код:", error.statusCode);
    // logger.log("Код помилки:", error.errorCode);
    // logger.log("Назва:", error.name);
}

// Тестування звичайної помилки
try {
    throw new Error("Звичайна помилка");
} catch (error) {
    // logger.log("\n✅ Звичайна помилка:");
    // logger.log("Повідомлення:", error.message);
    // logger.log("Назва:", error.name);
}

// logger.log("\n🎉 Тестування завершено успішно!");