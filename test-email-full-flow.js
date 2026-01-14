require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    try {
        console.log('🔗 Підключення до MongoDB...');
        await mongoose.connect('mongodb://localhost:27017/deapseak');
        console.log('✅ MongoDB підключено\n');
        
        // Знайти орçаменто
        const Orcamento = mongoose.model('Orcamento', new mongoose.Schema({}, { strict: false }));
        const orcamento = await Orcamento.findOne().sort({ createdAt: -1 });
        
        if (!orcamento) {
            console.log('❌ Орçаменто не знайдено');
            process.exit(1);
        }
        
        console.log('📋 Знайдено орçаменто:');
        console.log('   Numero:', orcamento.numero);
        console.log('   ID:', orcamento._id);
        console.log('   Cliente:', orcamento.cliente?.nome);
        console.log('   Email:', orcamento.cliente?.email);
        console.log('');
        
        // Тест Brevo API
        console.log('📧 Тестування Brevo API...');
        const brevo = require('@getbrevo/brevo');
        
        // Parse EMAIL_FROM
        let senderName = 'FestLift';
        let senderEmail = 'info@festlift.pt';
        
        if (process.env.EMAIL_FROM) {
            const fromMatch = process.env.EMAIL_FROM.match(/^(.+?)\s*<(.+?)>$/);
            if (fromMatch) {
                senderName = fromMatch[1].trim();
                senderEmail = fromMatch[2].trim();
            } else {
                senderEmail = process.env.EMAIL_FROM;
            }
        }
        
        console.log('👤 Sender:');
        console.log('   Name:', senderName);
        console.log('   Email:', senderEmail);
        console.log('');
        
        const apiInstance = new brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(
            brevo.TransactionalEmailsApiApiKeys.apiKey,
            process.env.BREVO_API_KEY
        );
        
        const sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.sender = { name: senderName, email: senderEmail };
        sendSmtpEmail.to = [{ email: 'ctaruj78@gmail.com', name: 'Test' }];
        sendSmtpEmail.subject = `Test Orçamento ${orcamento.numero}`;
        sendSmtpEmail.htmlContent = '<h1>Test Email</h1><p>This is a test from the full flow script.</p>';
        
        console.log('📤 Відправка email...');
        console.log('   To: ctaruj78@gmail.com');
        console.log('   Subject:', sendSmtpEmail.subject);
        console.log('');
        
        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        console.log('✅ Email відправлено успішно!');
        console.log('   Message ID:', result.messageId);
        console.log('');
        console.log('🎉 Всі тести пройдені!');
        console.log('');
        console.log('📝 Інструкція:');
        console.log('   1. Увійдіть: https://redesigned-waddle-v6w5g7rvxqpxf6pwg-5000.app.github.dev/pages/auth/login.html');
        console.log('   2. Login: info@festlift.pt');
        console.log('   3. Password: admin123');
        console.log('   4. Відкрийте: https://redesigned-waddle-v6w5g7rvxqpxf6pwg-5000.app.github.dev/pages/admin/orcamentos-list.html');
        console.log('   5. Натисніть "Ver" на орçаменті');
        console.log('   6. Натисніть "✉️ Email"');
        console.log('   7. Перевірте консоль (F12)');
        
        await mongoose.disconnect();
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Помилка:', error.message);
        console.error('   Stack:', error.stack);
        process.exit(1);
    }
})();
