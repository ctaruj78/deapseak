#!/usr/bin/env node

/**
 * 🧪 Тестовий скрипт для перевірки структури API відповіді
 * Симулює виклик /api/lifts/:id і показує точну структуру даних
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000';
const LIFT_ID = '693498013ccc5fccfa038fb4'; // ID з консолі

// Test credentials
const TEST_ADMIN = {
    email: 'admin@deapseak.com',
    password: 'admin123'
};

async function testAPIStructure() {
    console.log('🧪 Тестування структури API відповіді...\n');
    
    try {
        // 1. Логін для отримання токена
        console.log('🔐 1. Логін...');
        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, TEST_ADMIN);
        
        if (!loginResponse.data.success) {
            throw new Error('Login failed');
        }
        
        const token = loginResponse.data.token;
        console.log('✅ Токен отримано:', token.substring(0, 20) + '...\n');
        
        // 2. Отримання даних ліфта
        console.log(`🏢 2. Завантаження ліфта ${LIFT_ID}...`);
        const liftResponse = await axios.get(`${API_URL}/api/lifts/${LIFT_ID}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('\n📊 ПОВНА ВІДПОВІДЬ API:');
        console.log('='.repeat(80));
        console.log(JSON.stringify(liftResponse.data, null, 2));
        console.log('='.repeat(80));
        
        // 3. Аналіз структури
        console.log('\n🔍 АНАЛІЗ СТРУКТУРИ:');
        console.log('='.repeat(80));
        
        const result = liftResponse.data;
        
        console.log('📌 typeof result:', typeof result);
        console.log('📌 result.success:', result.success);
        console.log('📌 result.data exists:', !!result.data);
        console.log('📌 typeof result.data:', typeof result.data);
        
        if (result.data) {
            console.log('\n📦 result.data:');
            console.log('  - Keys:', Object.keys(result.data));
            console.log('  - result.data.success:', result.data.success);
            console.log('  - result.data.data exists:', !!result.data.data);
            console.log('  - result.data.lift exists:', !!result.data.lift);
            
            if (result.data.data) {
                console.log('\n📦 result.data.data:');
                console.log('  - Keys:', Object.keys(result.data.data));
                console.log('  - result.data.data._id:', result.data.data._id);
                console.log('  - result.data.data.municipalNumber:', result.data.data.municipalNumber);
                console.log('  - result.data.data.address:', result.data.data.address);
                console.log('  - result.data.data.lift exists:', !!result.data.data.lift);
            }
            
            if (result.data.lift) {
                console.log('\n📦 result.data.lift:');
                console.log('  - Keys:', Object.keys(result.data.lift));
                console.log('  - result.data.lift._id:', result.data.lift._id);
                console.log('  - result.data.lift.municipalNumber:', result.data.lift.municipalNumber);
            }
        }
        
        // 4. Визначаємо правильний шлях
        console.log('\n✅ ПРАВИЛЬНИЙ ШЛЯХ ДО ДАНИХ ЛІФТА:');
        console.log('='.repeat(80));
        
        let lift = null;
        let path = '';
        
        if (result.data?.data?.lift) {
            lift = result.data.data.lift;
            path = 'result.data.data.lift';
        } else if (result.data?.lift) {
            lift = result.data.lift;
            path = 'result.data.lift';
        } else if (result.data?.data && result.data.data._id) {
            lift = result.data.data;
            path = 'result.data.data';
        } else if (result.data && result.data._id) {
            lift = result.data;
            path = 'result.data';
        }
        
        if (lift) {
            console.log(`✅ Дані знайдено за шляхом: ${path}`);
            console.log('\n📋 ДАНІ ЛІФТА:');
            console.log('  - _id:', lift._id);
            console.log('  - municipalNumber:', lift.municipalNumber);
            console.log('  - manufacturer:', lift.manufacturer);
            console.log('  - model:', lift.model);
            console.log('  - address:', lift.address);
            console.log('  - location:', lift.location);
        } else {
            console.log('❌ Не вдалося знайти дані ліфта!');
        }
        
        // 5. Генеруємо правильний код
        console.log('\n💻 ПРАВИЛЬНИЙ КОД ДЛЯ ВИТЯГУВАННЯ ДАНИХ:');
        console.log('='.repeat(80));
        console.log(`
let lift;
if (result.success && result.data) {
    // Перевіряємо всі можливі шляхи
    if (result.data.data && result.data.data._id) {
        lift = result.data.data;  // ← ПРЯМО ТУТ, БЕЗ .lift
        console.log('✅ Lift знайдено: result.data.data');
    } else if (result.data.lift) {
        lift = result.data.lift;
        console.log('✅ Lift знайдено: result.data.lift');
    } else if (result.data._id) {
        lift = result.data;
        console.log('✅ Lift знайдено: result.data');
    }
}
        `.trim());
        
        console.log('\n✅ Тест завершено успішно!');
        
    } catch (error) {
        console.error('\n❌ ПОМИЛКА:');
        console.error('Message:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        process.exit(1);
    }
}

// Запуск тесту
testAPIStructure();
