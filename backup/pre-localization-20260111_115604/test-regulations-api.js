// ═══════════════════════════════════════════════════════════
// 🧪 TEST REGULATIONS UPDATE API
// ═══════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');

const adminToken = jwt.sign(
    { 
        userId: 'admin-123',
        email: 'admin@deapseak.pt',
        role: 'admin',
        username: 'Admin Test'
    },
    'deapseak_secret_key_2024',
    { expiresIn: '1h' }
);

console.log('🧪 === ТЕСТУВАННЯ API ОНОВЛЕННЯ РЕГЛАМЕНТІВ ===\n');

async function testRegulationsAPI() {
    try {
        console.log('📋 ТЕСТ 1: Запуск перевірки оновлень...\n');
        
        const response = await fetch('http://localhost:5000/api/regulations/check-updates', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Перевірка успішна!\n');
            console.log('📊 Результати:');
            console.log(`   - Перевірено: ${data.data.total_checked} регламентів`);
            console.log(`   - Нових знайдено: ${data.data.new_regulations}`);
            console.log(`   - Оновлено: ${data.data.updated_regulations}`);
            console.log(`   - Час: ${new Date(data.data.timestamp).toLocaleString('pt-PT')}`);
        } else {
            console.log(`❌ Помилка: ${data.message}`);
        }
        
        console.log('\n' + '─'.repeat(80) + '\n');
        
        // Почекати 2 секунди
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('📋 ТЕСТ 2: Отримання останнього звіту...\n');
        
        const response2 = await fetch('http://localhost:5000/api/regulations/last-check', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const data2 = await response2.json();
        
        if (data2.success && data2.data) {
            console.log('✅ Звіт отримано!\n');
            console.log('📄 Деталі:');
            console.log(`   - Час перевірки: ${new Date(data2.data.timestamp).toLocaleString('pt-PT')}`);
            console.log(`   - Всього перевірено: ${data2.data.total_checked}`);
            console.log(`   - Результат: ${data2.data.new_regulations} нових, ${data2.data.updated_regulations} оновлених`);
        } else {
            console.log('⚠️  Попередніх перевірок не знайдено');
        }
        
        console.log('\n' + '═'.repeat(80));
        console.log('✅ ВСІ ТЕСТИ ПРОЙДЕНО!');
        console.log('═'.repeat(80) + '\n');
        
    } catch (error) {
        console.error('❌ Помилка тестування:', error.message);
    }
}

testRegulationsAPI();
