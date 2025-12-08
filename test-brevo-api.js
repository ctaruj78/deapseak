// ============================================
// 🧪 TESTE BREVO API - Тестування Brevo REST API
// ============================================

const brevoService = require('./services/brevo-email-service');

console.log('🧪 Тестування Brevo API...\n');

(async () => {
    // 1. Перевірка підключення
    console.log('1️⃣ Перевірка підключення до Brevo API...');
    const check = await brevoService.verificar();
    
    if (!check.success) {
        console.error('\n❌ Підключення не вдалося! Перевір API Key у .env\n');
        process.exit(1);
    }

    console.log('\n✅ Підключення OK!\n');
    console.log('=' .repeat(60));

    // 2. Відправка тестового email
    console.log('\n2️⃣ Відправка тестового email...\n');
    
    const testEmail = await brevoService.sendEmail({
        to: 'info@festlift.pt',
        subject: '🎉 FestLift - Teste Brevo API Sucesso!',
        html: `
            <h1>✅ Email funcionando!</h1>
            <p>Brevo REST API configurado com sucesso para FestLift.</p>
            <p><strong>Data:</strong> ${new Date().toLocaleString('pt-PT')}</p>
            <h2>🚀 Próximos Passos:</h2>
            <ol>
                <li>✅ API está funcionando!</li>
                <li>📊 Verifica Dashboard: <a href="https://app.brevo.com/">Brevo</a></li>
                <li>📧 Integra com orçamentos</li>
                <li>🎯 Começa a enviar aos clientes!</li>
            </ol>
            <hr>
            <p><strong>FESTLIFT, LDA</strong><br>
            Av. do Parque 84B, Rio de Mouro<br>
            📞 +351 926 380 243 / 244 | ✉️ info@festlift.pt</p>
        `,
        text: 'Email funcionando! Brevo API configurado com sucesso.'
    });

    if (testEmail.success) {
        console.log('\n🎉 EMAIL ENVIADO COM SUCESSO!\n');
        console.log('📊 DETALHES:');
        console.log(`   Message ID: ${testEmail.messageId}`);
        console.log(`   Para: ${testEmail.to}`);
        console.log(`   Assunto: ${testEmail.subject}\n`);
        console.log('=' .repeat(60));
        console.log('\n✅ BREVO API FUNCIONANDO PERFEITAMENTE!\n');
        console.log('📈 Próximos passos:');
        console.log('   1. Check email inbox (info@festlift.pt)');
        console.log('   2. Dashboard: https://app.brevo.com/');
        console.log('   3. Statistics: https://app.brevo.com/statistics/email');
        console.log('   4. Integra com orçamentos no unified-server.js\n');
    } else {
        console.error('\n❌ ERRO:', testEmail.error);
        if (testEmail.details) {
            console.error('   Detalhes:', testEmail.details);
        }
    }

})().catch(error => {
    console.error('\n💥 ERRO FATAL:', error.message);
    console.error(error);
    process.exit(1);
});
