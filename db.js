// db.js
// Модуль для підключення до MongoDB

const { MongoClient } = require('mongodb');

let db = null;
let client = null;
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY = 3000; // 3 секунди

const config = {
    mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/deapseak',
    options: {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
    }
};

/**
 * Підключення до MongoDB з retry логікою
 * @returns {Promise<Db|null>} Database instance або null
 */
async function connectDB() {
    // Якщо вже підключено
    if (db) {
        console.log('✅ Використовуємо існуюче підключення до MongoDB');
        return db;
    }
    
    // Якщо вже підключаємося
    if (isConnecting) {
        console.log('⏳ Очікуємо підключення до MongoDB...');
        while (isConnecting && connectionAttempts < MAX_RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return db;
    }
    
    isConnecting = true;
    
    while (connectionAttempts < MAX_RETRY_ATTEMPTS) {
        try {
            connectionAttempts++;
            console.log(`🔌 Спроба підключення до MongoDB ${connectionAttempts}/${MAX_RETRY_ATTEMPTS}...`);
            console.log(`   URI: ${config.mongoURI}`);
            
            client = new MongoClient(config.mongoURI, config.options);
            await client.connect();
            
            db = client.db();
            
            // Перевірка підключення
            await db.admin().ping();
            
            console.log('✅ MongoDB підключено успішно');
            connectionAttempts = 0; // Скидаємо лічильник після успішного підключення
            
            // Обробка подій підключення
            client.on('error', handleConnectionError);
            client.on('close', handleConnectionClose);
            client.on('timeout', handleConnectionTimeout);
            client.on('serverHeartbeatFailed', handleHeartbeatFailed);
            
            isConnecting = false;
            return db;
            
        } catch (error) {
            console.error(`❌ Помилка підключення до MongoDB (спроба ${connectionAttempts}/${MAX_RETRY_ATTEMPTS}):`, error.message);
            
            // Очищуємо поточні об'єкти
            db = null;
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    console.error('Помилка закриття клієнта:', closeError.message);
                }
            }
            client = null;
            
            // Якщо досягли максимуму спроб
            if (connectionAttempts >= MAX_RETRY_ATTEMPTS) {
                console.error('💥 Вичерпано всі спроби підключення до MongoDB');
                console.log('⚠️  Сервер працює в режимі без БД. Деякі функції будуть недоступні.');
                isConnecting = false;
                return null;
            }
            
            // Чекаємо перед наступною спробою
            console.log(`⏳ Очікування ${RETRY_DELAY / 1000} секунд перед наступною спробою...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
    
    isConnecting = false;
    return null;
}

/**
 * Отримання поточного підключення до БД
 * @returns {Db|null} Database instance або null
 */
function getDB() {
    if (!db) {
        console.warn('⚠️  База даних не підключена. Деякі функції недоступні.');
        return null;
    }
    return db;
}

/**
 * Обробник помилок підключення
 */
function handleConnectionError(error) {
    console.error('❌ MongoDB connection error:', error.message);
    db = null;
    client = null;
    
    // Спроба автоматичного перепідключення
    console.log('🔄 Спроба автоматичного перепідключення...');
    setTimeout(() => {
        connectDB().catch(err => {
            console.error('❌ Автоматичне перепідключення не вдалося:', err.message);
        });
    }, RETRY_DELAY);
}

/**
 * Обробник закриття підключення
 */
function handleConnectionClose() {
    console.log('📤 MongoDB connection closed');
    db = null;
    client = null;
}

/**
 * Обробник таймауту підключення
 */
function handleConnectionTimeout() {
    console.warn('⏱️  MongoDB connection timeout');
}

/**
 * Обробник невдалого heartbeat
 */
function handleHeartbeatFailed(event) {
    console.warn('💔 MongoDB heartbeat failed:', event);
}

/**
 * Закриття підключення до БД
 * @returns {Promise<void>}
 */
async function closeDB() {
    if (client) {
        try {
            await client.close();
            console.log('📤 MongoDB підключення закрито');
        } catch (error) {
            console.error('❌ Помилка закриття MongoDB:', error.message);
        } finally {
            db = null;
            client = null;
            connectionAttempts = 0;
        }
    }
}

/**
 * Перевірка стану підключення
 * @returns {boolean}
 */
function isConnected() {
    return db !== null && client !== null;
}

/**
 * Отримання статистики підключення
 * @returns {Object}
 */
function getConnectionStats() {
    return {
        connected: isConnected(),
        connectionAttempts: connectionAttempts,
        maxRetryAttempts: MAX_RETRY_ATTEMPTS,
        retryDelay: RETRY_DELAY
    };
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
    console.log('\n🛑 Отримано SIGINT, закриваємо з\'єднання з БД...');
    await closeDB();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Отримано SIGTERM, закриваємо з\'єднання з БД...');
    await closeDB();
    process.exit(0);
});

// Обробка необроблених помилок
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    closeDB().finally(() => {
        process.exit(1);
    });
});

module.exports = { 
    connectDB, 
    getDB, 
    closeDB, 
    isConnected, 
    getConnectionStats 
};
