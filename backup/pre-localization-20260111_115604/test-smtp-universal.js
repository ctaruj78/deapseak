// ============================================
// 📧 UNIVERSAL EMAIL TEST - Тест будь-якого SMTP
// ============================================

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('📧 Universal Email Test\n');
console.log('=' .repeat(60));

// Конфігурація з .env
const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
};

console.log('\n📋 SMTP CONFIGURATION:');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Secure: ${config.secure}`);
console.log(`   User: ${config.auth.user}`);
console.log(`   Pass: ${config.auth.pass ? '***' + config.auth.pass.slice(-8) : 'NOT SET'}`);
console.log(`   From: ${process.env.EMAIL_FROM}\n`);

// Створення транспортера
const transporter = nodemailer.createTransport(config);

// Тестовий email
const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: 'info@festlift.pt', // Відправляємо самому собі
    subject: '✅ Test Email - FestLift SMTP Works!',
    html: `
        <h1>🎉 Email System Working!</h1>
        <p><strong>SMTP Configuration:</strong></p>
        <ul>
            <li>Host: ${config.host}</li>
            <li>Port: ${config.port}</li>
            <li>User: ${config.auth.user}</li>
            <li>From: ${process.env.EMAIL_FROM}</li>
        </ul>
        <p><strong>Date:</strong> ${new Date().toLocaleString('pt-PT')}</p>
        <hr>
        <p><strong>FESTLIFT, LDA</strong><br>
        Av. do Parque 84B, Rio de Mouro<br>
        📞 +351 926 380 243 / 244</p>
    `,
    text: `Email system working! Host: ${config.host}, Date: ${new Date().toLocaleString('pt-PT')}`
};

console.log('🔌 Testing SMTP connection...\n');

// Тест підключення
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ CONNECTION FAILED!');
        console.error(`   Error: ${error.message}\n`);
        
        if (error.code === 'EAUTH') {
            console.log('🔧 AUTHENTICATION PROBLEM:');
            console.log('   1. Check SMTP_USER (email) is correct');
            console.log('   2. Check SMTP_PASS (password) is correct');
            console.log('   3. Try using email client password (not login password)');
            console.log('   4. Check if 2FA is enabled (disable or use app password)\n');
        } else if (error.code === 'ECONNECTION') {
            console.log('🔧 CONNECTION PROBLEM:');
            console.log('   1. Check SMTP_HOST is correct');
            console.log('   2. Check SMTP_PORT (587 for TLS, 465 for SSL)');
            console.log('   3. Check firewall/network settings\n');
        }
        
        process.exit(1);
    }
    
    console.log('✅ CONNECTION SUCCESSFUL!\n');
    console.log('📧 Sending test email...\n');
    
    // Відправка email
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('❌ EMAIL SEND FAILED!');
            console.error(`   Error: ${err.message}\n`);
            process.exit(1);
        }
        
        console.log('🎉 EMAIL SENT SUCCESSFULLY!\n');
        console.log('📊 DETAILS:');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}\n`);
        console.log('=' .repeat(60));
        console.log('\n✅ SMTP EMAIL SYSTEM WORKING!\n');
        console.log('📥 Check inbox: info@festlift.pt');
        console.log('📝 You can now integrate with orçamentos!\n');
    });
});
