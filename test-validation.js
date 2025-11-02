// Тестування валідаційного модуля
const { validators, sanitizers, ValidationError } = require('./validation.js');

// logger.log('🧪 Тестування валідаційного модуля...\n');

// Тест 1: Валідація email
try {
    // logger.log('📧 Тест email валідації:');
    // logger.log('✅ Валідний email:', validators.email('test@example.com', 'email'));
    // logger.log('❌ Невалідний email:');
    validators.email('invalid-email', 'email');
} catch (error) {
    // logger.log('   Помилка:', error.message);
}

// logger.log();

// Тест 2: Валідація пароля
try {
    // logger.log('🔒 Тест пароля валідації:');
    // logger.log('✅ Валідний пароль:', validators.password('password123', 'password'));
    // logger.log('❌ Невалідний пароль (занадто короткий):');
    validators.password('123', 'password');
} catch (error) {
    // logger.log('   Помилка:', error.message);
}

// logger.log();

// Тест 3: Валідація рядків
try {
    // logger.log('📝 Тест рядків валідації:');
    // logger.log('✅ Валідний рядок:', validators.string('Hello World', 'message', { minLength: 3, maxLength: 50 }));
    // logger.log('❌ Невалідний рядок (занадто короткий):');
    validators.string('Hi', 'message', { minLength: 5 });
} catch (error) {
    // logger.log('   Помилка:', error.message);
}

// logger.log();

// Тест 4: Валідація чисел
try {
    // logger.log('🔢 Тест чисел валідації:');
    // logger.log('✅ Валідне число:', validators.number('25', 'age', { min: 18, max: 100, integer: true }));
    // logger.log('❌ Невалідне число (не ціле):');
    validators.number('25.5', 'age', { integer: true });
} catch (error) {
    // logger.log('   Помилка:', error.message);
}

// logger.log();

// Тест 5: Валідація ObjectId
try {
    // logger.log('🆔 Тест ObjectId валідації:');
    // logger.log('✅ Валідний ObjectId:', validators.objectId('507f1f77bcf86cd799439011', 'id'));
    // logger.log('❌ Невалідний ObjectId:');
    validators.objectId('invalid-id', 'id');
} catch (error) {
    // logger.log('   Помилка:', error.message);
}

// logger.log();

// Тест 6: Санітизація
// logger.log('🧹 Тест санітизації:');
// logger.log('✅ HTML санітизація:', sanitizers.html('<script>alert("hack")</script>Hello World'));
// logger.log('✅ SQL санітизація:', sanitizers.sql("'; DROP TABLE users; --"));
// logger.log('✅ Рядок санітизація:', sanitizers.string('  Hello   World  '));

// logger.log('\n🎉 Тестування завершено успішно!');