#!/usr/bin/env node
/**
 * Тест клієнтської панелі - перевірка API ліфтів
 */

const API_URL = 'http://localhost:5000';
const CLIENT_EMAIL = 'client@festlift.pt';
const CLIENT_PASSWORD = 'client123';

async function testClientPanel() {
    console.log('🧪 Тестування клієнтської панелі...\n');
    
    try {
        // 1. Логін
        console.log('1️⃣ Логін клієнта...');
        const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: CLIENT_EMAIL, 
                password: CLIENT_PASSWORD 
            })
        });
        
        if (!loginResponse.ok) {
            throw new Error(`Логін failed: ${loginResponse.status}`);
        }
        
        const loginData = await loginResponse.json();
        const token = loginData?.token || loginData?.data?.token;
        const user = loginData?.user || loginData?.data?.user;

        if (!token || !user) {
            throw new Error(`Login schema mismatch: ${JSON.stringify(loginData).slice(0, 180)}`);
        }
        
        console.log(`   ✅ Логін успішний`);
        console.log(`   User ID: ${user.userId || user.id || user._id}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Email: ${user.email}\n`);
        
        // 2. Завантаження ліфтів
        console.log('2️⃣ Завантаження ліфтів клієнта...');
        const liftsResponse = await fetch(`${API_URL}/api/lifts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!liftsResponse.ok) {
            throw new Error(`API /lifts failed: ${liftsResponse.status}`);
        }
        
        const liftsData = await liftsResponse.json();
        const lifts = Array.isArray(liftsData)
            ? liftsData
            : (Array.isArray(liftsData.data) ? liftsData.data : []);
        
        console.log(`   ✅ API відповіло успішно`);
        console.log(`   Отримано ліфтів: ${lifts.length}\n`);
        
        // 3. Аналіз результату
        if (lifts.length === 0) {
            console.log('❌ ПРОБЛЕМА: Клієнт не має ліфтів!');
            console.log('   Можливі причини:');
            console.log('   - Ліфти не прив\'язані до клієнта в MongoDB');
            console.log('   - Поле client в ліфтах не співпадає з userId');
            console.log('   - API фільтр не працює коректно\n');
            
            // Додаткова діагностика
            console.log('🔍 Діагностика MongoDB...');
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            const mongoCmd = `mongosh deapseak --quiet --eval "
                const userId = '${user.userId || user.id || user._id}';
                console.log('User ID:', userId);
                console.log('Ліфти з client (string):', db.lifts.countDocuments({client: userId}));
                console.log('Ліфти з client (ObjectId):', db.lifts.countDocuments({client: ObjectId(userId)}));
                console.log('Всього ліфтів:', db.lifts.countDocuments());
            "`;
            
            const { stdout } = await execAsync(mongoCmd);
            console.log(stdout);
            
        } else {
            console.log('✅ УСПІХ: Клієнт має ліфти!');
            console.log('\n📋 Список ліфтів:');
            lifts.forEach((lift, i) => {
                console.log(`   ${i+1}. ${lift.municipalNumber || lift._id}`);
                console.log(`      Адреса: ${lift.address?.street || 'немає'}`);
                console.log(`      Статус: ${lift.status || 'unknown'}`);
                if (i < 2) {
                    console.log(`      Client ID: ${lift.client}`);
                }
            });
        }
        
        // 4. Тестування dashboard
        console.log('\n3️⃣ Тестування даних для dashboard...');
        const stats = {
            totalLifts: lifts.length,
            activeLifts: lifts.filter(l => l.status === 'active' || l.status === 'operational').length,
            maintenanceLifts: lifts.filter(l => l.status === 'maintenance').length,
            attentionLifts: lifts.filter(l => l.status === 'attention' || l.status === 'warning').length
        };
        
        console.log('   Статистика:');
        console.log(`   - Всього ліфтів: ${stats.totalLifts}`);
        console.log(`   - Активних: ${stats.activeLifts}`);
        console.log(`   - На обслуговуванні: ${stats.maintenanceLifts}`);
        console.log(`   - Потребують уваги: ${stats.attentionLifts}`);
        
        // Висновок
        console.log('\n' + '='.repeat(60));
        if (lifts.length > 0) {
            console.log('✅ ТЕСТ ПРОЙДЕНО: API працює коректно');
        } else {
            console.log('❌ ТЕСТ НЕ ПРОЙДЕНО: Потрібно виправити прив\'язку ліфтів');
        }
        console.log('='.repeat(60));
        
        process.exit(lifts.length > 0 ? 0 : 1);
        
    } catch (error) {
        console.error('\n❌ ПОМИЛКА:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testClientPanel();
