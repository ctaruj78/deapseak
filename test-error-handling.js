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
    console.log("✅ APIError працює:");
    console.log("Повідомлення:", error.message);
    console.log("Статус код:", error.statusCode);
    console.log("Код помилки:", error.errorCode);
    console.log("Назва:", error.name);
}

// Тестування звичайної помилки
try {
    throw new Error("Звичайна помилка");
} catch (error) {
    console.log("\n✅ Звичайна помилка:");
    console.log("Повідомлення:", error.message);
    console.log("Назва:", error.name);
}

console.log("\n🎉 Тестування завершено успішно!");