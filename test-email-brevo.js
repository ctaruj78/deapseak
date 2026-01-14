#!/usr/bin/env node

/**
 * 🧪 Тест відправки email через Brevo SMTP
 * Використовує налаштування з .env
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 Тест Brevo SMTP Email');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Перевірка налаштувань
console.log('🔧 Налаштування з .env:');
console.log('   SMTP_HOST:', process.env.SMTP_HOST || '❌ НЕ ЗАДАНО');
console.log('   SMTP_PORT:', process.env.SMTP_PORT || '❌ НЕ ЗАДАНО');
console.log('   SMTP_USER:', process.env.SMTP_USER || '❌ НЕ ЗАДАНО');
console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ ЗАДАНО (приховано)' : '❌ НЕ ЗАДАНО');
console.log('   EMAIL_FROM:', process.env.EMAIL_FROM || process.env.SMTP_USER);
console.log('');

// Перевірка обов'язкових змінних
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ ПОМИЛКА: Налаштування SMTP не повні!');
    console.error('');
    console.error('Додайте до .env:');
    console.error('   SMTP_HOST=smtp-relay.brevo.com');
    console.error('   SMTP_PORT=587');
    console.error('   SMTP_USER=8b688f001@smtp-brevo.com');
    console.error('   SMTP_PASS=xsmtpsib-...');
    console.error('   EMAIL_FROM="FestLift" <info@festlift.pt>');
    process.exit(1);
}

// Створення транспорту
console.log('🔌 Підключення до Brevo SMTP...');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        ciphers: 'SSLv3'
    }
});

// Тестовий email
const testEmail = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: process.env.SMTP_USER, // Відправляємо собі для тесту
    subject: '✅ Тест Brevo SMTP - FestLift Orçamentos',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0;">✅ Email працює!</h1>
                <p style="margin: 10px 0 0 0;">Brevo SMTP успішно налаштовано</p>
            </div>
            
            <div style="padding: 30px;">
                <h2 style="color: #333;">🎉 Вітаємо!</h2>
                <p>Система email для кошторисів FestLift успішно налаштована.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #667eea;">Що працює:</h3>
                    <ul style="line-height: 1.8;">
                        <li>✅ Brevo SMTP підключення</li>
                        <li>✅ Відправка email</li>
                        <li>✅ HTML форматування</li>
                        <li>✅ Професійний дизайн</li>
                    </ul>
                </div>
                
                <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #0066cc;">Наступні кроки:</h3>
                    <ol style="line-height: 1.8;">
                        <li>Створіть кошторис в системі</li>
                        <li>Натисніть "Email" для відправки</li>
                        <li>Клієнт отримає професійний email</li>
                    </ol>
                </div>
                
                <hr style="border: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #666; font-size: 14px;">
                    <strong>Тест виконано:</strong> ${new Date().toLocaleString('pt-PT')}<br>
                    <strong>SMTP Server:</strong> ${process.env.SMTP_HOST}<br>
                    <strong>Від:</strong> ${process.env.EMAIL_FROM || process.env.SMTP_USER}
                </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
                <p style="margin: 0; color: #666; font-size: 12px;">
                    <strong>FestLift, LDA</strong> - Manutenção de Elevadores<br>
                    Email: info@festlift.pt | Sistema de Orçamentos v2.1.0
                </p>
            </div>
        </div>
    `
};

// Відправка
console.log('📤 Відправка тестового email...');
console.log('   Від:', testEmail.from);
console.log('   До:', testEmail.to);
console.log('   Тема:', testEmail.subject);
console.log('');

transporter.sendMail(testEmail)
    .then((info) => {
        console.log('✅ EMAIL ВІДПРАВЛЕНО УСПІШНО!');
        console.log('');
        console.log('📋 Деталі відправки:');
        console.log('   Message ID:', info.messageId);
        console.log('   Response:', info.response);
        console.log('');
        console.log('📧 Перевірте email: ' + testEmail.to);
        console.log('');
        console.log('🎉 BREVO SMTP ПРАЦЮЄ ІДЕАЛЬНО!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ ПОМИЛКА ВІДПРАВКИ:');
        console.error('');
        console.error('Повідомлення:', error.message);
        console.error('');
        
        if (error.code === 'ECONNREFUSED') {
            console.error('🔴 Не вдається підключитися до SMTP сервера');
            console.error('');
            console.error('Можливі причини:');
            console.error('   1. Неправильний SMTP_HOST або SMTP_PORT');
            console.error('   2. Firewall блокує з\'єднання');
            console.error('   3. Brevo SMTP тимчасово недоступний');
            console.error('');
            console.error('Перевірте:');
            console.error('   SMTP_HOST=' + process.env.SMTP_HOST);
            console.error('   SMTP_PORT=' + process.env.SMTP_PORT);
        } else if (error.code === 'EAUTH') {
            console.error('🔴 Помилка автентифікації');
            console.error('');
            console.error('Можливі причини:');
            console.error('   1. Неправильний SMTP_USER');
            console.error('   2. Неправильний SMTP_PASS');
            console.error('   3. SMTP ключ застарів або анульований');
            console.error('');
            console.error('Перевірте налаштування в Brevo:');
            console.error('   https://app.brevo.com/settings/keys/smtp');
        } else {
            console.error('Код помилки:', error.code);
            console.error('');
            console.error('Повний стек помилки:');
            console.error(error);
        }
        
        console.error('');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(1);
    });
