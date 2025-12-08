// ============================================
// 🔍 BREVO DIAGNOSTICS - Діагностика SMTP
// ============================================

require('dotenv').config();

console.log('🔍 Діагностика Brevo SMTP конфігурації\n');
console.log('=' .repeat(60));

// Перевірка змінних оточення
console.log('\n📋 ЗМІННІ ОТОЧЕННЯ:');
console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || '❌ НЕ ЗАДАНО'}`);
console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '❌ НЕ ЗАДАНО'}`);
console.log(`   SMTP_USER: ${process.env.SMTP_USER || '❌ НЕ ЗАДАНО'}`);
console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '✅ ЗАДАНО (' + process.env.SMTP_PASS.substring(0, 20) + '...)' : '❌ НЕ ЗАДАНО'}`);
console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || '❌ НЕ ЗАДАНО'}`);

// Перевірка формату
console.log('\n✅ ПЕРЕВІРКА ФОРМАТУ:');

if (process.env.SMTP_HOST === 'smtp-relay.brevo.com') {
    console.log('   ✅ SMTP_HOST правильний');
} else {
    console.log(`   ❌ SMTP_HOST має бути: smtp-relay.brevo.com (зараз: ${process.env.SMTP_HOST})`);
}

if (process.env.SMTP_PORT === '587') {
    console.log('   ✅ SMTP_PORT правильний (587 - TLS)');
} else {
    console.log(`   ⚠️ SMTP_PORT: ${process.env.SMTP_PORT} (рекомендовано: 587)`);
}

if (process.env.SMTP_USER) {
    if (process.env.SMTP_USER.includes('@smtp-brevo.com')) {
        console.log(`   ⚠️ SMTP_USER: ${process.env.SMTP_USER}`);
        console.log('      Це виглядає як Brevo login, але може НЕ працювати!');
        console.log('      Спробуй використати email реєстрації замість цього.');
    } else if (process.env.SMTP_USER.includes('@')) {
        console.log(`   ✅ SMTP_USER: ${process.env.SMTP_USER} (email формат)`);
    } else {
        console.log(`   ❌ SMTP_USER має бути email адреса`);
    }
}

if (process.env.SMTP_PASS) {
    if (process.env.SMTP_PASS.startsWith('xkeysib-')) {
        console.log('   ✅ SMTP_PASS: Виглядає як Brevo API Key');
        console.log(`      Довжина: ${process.env.SMTP_PASS.length} символів`);
    } else if (process.env.SMTP_PASS.startsWith('xsmtpsib-')) {
        console.log('   ✅ SMTP_PASS: Виглядає як Brevo SMTP Key (правильно!)');
        console.log(`      Довжина: ${process.env.SMTP_PASS.length} символів`);
    } else {
        console.log(`   ⚠️ SMTP_PASS НЕ виглядає як Brevo ключ`);
        console.log('      Має починатися з "xkeysib-" або "xsmtpsib-"');
    }
}

// Тест підключення
console.log('\n🔌 ТЕСТ ПІДКЛЮЧЕННЯ:');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

console.log('   Підключення до Brevo SMTP...');

transporter.verify()
    .then(() => {
        console.log('   ✅ ПІДКЛЮЧЕННЯ УСПІШНЕ!\n');
        console.log('🎉 Brevo SMTP налаштовано ПРАВИЛЬНО!');
        console.log('\n📧 Тепер можна відправляти email:');
        console.log('   node test-brevo.js');
    })
    .catch(error => {
        console.log(`   ❌ ПОМИЛКА ПІДКЛЮЧЕННЯ: ${error.message}\n`);
        
        console.log('🔧 МОЖЛИВІ РІШЕННЯ:\n');
        
        console.log('1️⃣ ПЕРЕВІР EMAIL РЕЄСТРАЦІЇ:');
        console.log('   Який email ти використав для Sign Up на Brevo?');
        console.log('   Використай САМЕ ТОЙ email як SMTP_USER\n');
        
        console.log('2️⃣ ЗГЕНЕРУЙ НОВИЙ SMTP KEY:');
        console.log('   a) Йди на: https://app.brevo.com/');
        console.log('   b) Menu → SMTP & API');
        console.log('   c) Tab "SMTP"');
        console.log('   d) Клік "Generate a new SMTP key"');
        console.log('   e) Назва: "FestLift Production"');
        console.log('   f) Копіюй ключ (починається з "xsmtpsib-")');
        console.log('   g) Вставляй в .env як SMTP_PASS\n');
        
        console.log('3️⃣ ПРАВИЛЬНА КОМБІНАЦІЯ:');
        console.log('   SMTP_USER = email реєстрації (напр. joao@gmail.com)');
        console.log('   SMTP_PASS = SMTP Key з dashboard (xsmtpsib-...)');
        console.log('   НЕ API v3 Key (xkeysib-...)!\n');
        
        console.log('4️⃣ АЛЬТЕРНАТИВА - використай API замість SMTP:');
        console.log('   Brevo REST API працює з xkeysib- ключем');
        console.log('   Але SMTP простіше для nodemailer\n');
        
        console.log('=' .repeat(60));
        console.log('\n💡 Підказка: Напиши який email використав для Brevo sign up!');
    });
