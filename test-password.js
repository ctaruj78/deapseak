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
            console.error('❌ Користувач не знайден');
            return;
        }
        
        console.log('👤 Користувач:', {
            username: user.username,
            email: user.email,
            hasPassword: !!user.password
        });
        
        // Тестуємо пароль
        const password = 'admin123';
        const result = await bcrypt.compare(password, user.password);
        
        console.log('\n🔑 Тест пароля:');
        console.log('   Вхідний пароль:', password);
        console.log('   Хеш в БД:', user.password);
        console.log('   Результат порівняння:', result ? '✅ УСПІХ' : '❌ ПОМИЛКА');
        
        if (!result) {
            // Спробуємо інші можливі паролі
            console.log('\n🔍 Тестуємо інші паролі:');
            const possiblePasswords = ['admin', '123456', 'password', 'admin123'];
            for (const pwd of possiblePasswords) {
                const res = await bcrypt.compare(pwd, user.password);
                console.log(`   "${pwd}": ${res ? '✅' : '❌'}`);
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Помилка:', error.message);
        process.exit(1);
    }
}

testPassword();
