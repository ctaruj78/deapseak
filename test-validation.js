// Тестування валідаційного модуля
const { validators, sanitizers, ValidationError } = require('./validation.js');

console.log('🧪 Тестування валідаційного модуля...\n');

// Тест 1: Валідація email
try {
    console.log('📧 Тест email валідації:');
    console.log('✅ Валідний email:', validators.email('test@example.com', 'email'));
    console.log('❌ Невалідний email:');
    validators.email('invalid-email', 'email');
} catch (error) {
    console.log('   Помилка:', error.message);
}

console.log();

// Тест 2: Валідація пароля
try {
    console.log('🔒 Тест пароля валідації:');
    console.log('✅ Валідний пароль:', validators.password('password123', 'password'));
    console.log('❌ Невалідний пароль (занадто короткий):');
    validators.password('123', 'password');
} catch (error) {
    console.log('   Помилка:', error.message);
}

console.log();

// Тест 3: Валідація рядків
try {
    console.log('📝 Тест рядків валідації:');
    console.log('✅ Валідний рядок:', validators.string('Hello World', 'message', { minLength: 3, maxLength: 50 }));
    console.log('❌ Невалідний рядок (занадто короткий):');
    validators.string('Hi', 'message', { minLength: 5 });
} catch (error) {
    console.log('   Помилка:', error.message);
}

console.log();

// Тест 4: Валідація чисел
try {
    console.log('🔢 Тест чисел валідації:');
    console.log('✅ Валідне число:', validators.number('25', 'age', { min: 18, max: 100, integer: true }));
    console.log('❌ Невалідне число (не ціле):');
    validators.number('25.5', 'age', { integer: true });
} catch (error) {
    console.log('   Помилка:', error.message);
}

console.log();

// Тест 5: Валідація ObjectId
try {
    console.log('🆔 Тест ObjectId валідації:');
    console.log('✅ Валідний ObjectId:', validators.objectId('507f1f77bcf86cd799439011', 'id'));
    console.log('❌ Невалідний ObjectId:');
    validators.objectId('invalid-id', 'id');
} catch (error) {
    console.log('   Помилка:', error.message);
}

console.log();

// Тест 6: Санітизація
console.log('🧹 Тест санітизації:');
console.log('✅ HTML санітизація:', sanitizers.html('<script>alert("hack")</script>Hello World'));
console.log('✅ SQL санітизація:', sanitizers.sql("'; DROP TABLE users; --"));
console.log('✅ Рядок санітизація:', sanitizers.string('  Hello   World  '));

console.log('\n🎉 Тестування завершено успішно!');