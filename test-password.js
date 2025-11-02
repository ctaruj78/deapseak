const bcrypt = require('bcryptjs');
const { getDB, connectDB } = require('./db');

async function testPassword() {
    try {
        // Підключення до БД
        await connectDB();
        const db = getDB();
        
        // Знаходимо користувача
        const user = await db.collection('users').findOne({ email: 'admin@example.com' });
        
        if (!user) {
            // logger.error('❌ Користувач не знайден');
            return;
        }
        
        // logger.log('👤 Користувач:', {
            username: user.username,
            email: user.email,
            hasPassword: !!user.password
        });
        
        // Тестуємо пароль
        const password = 'admin123';
        const result = await bcrypt.compare(password, user.password);
        
        // logger.log('\n🔑 Тест пароля:');
        // logger.log('   Вхідний пароль:', password);
        // logger.log('   Хеш в БД:', user.password);
        // logger.log('   Результат порівняння:', result ? '✅ УСПІХ' : '❌ ПОМИЛКА');
        
        if (!result) {
            // Спробуємо інші можливі паролі
            // logger.log('\n🔍 Тестуємо інші паролі:');
            const possiblePasswords = ['admin', '123456', 'password', 'admin123'];
            for (const pwd of possiblePasswords) {
                const res = await bcrypt.compare(pwd, user.password);
                // logger.log(`   "${pwd}": ${res ? '✅' : '❌'}`);
            }
        }
        
        process.exit(0);
    } catch (error) {
        // logger.error('❌ Помилка:', error.message);
        process.exit(1);
    }
}

testPassword();
