/**
 * Скрипт відновлення тестових даних у MongoDB
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Підключення до MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/deapseak';

// Схеми
const liftSchema = require('../backend/models/Lift').schema;

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    role: String,
    name: String,
    firstName: String,
    lastName: String
}, { collection: 'users' });

const Lift = mongoose.model('Lift', liftSchema);
const User = mongoose.model('User', userSchema);
const Request = mongoose.model('Request', require('../backend/models/Request').schema);

async function restoreData() {
    try {
        console.log('🔌 Підключення до MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Підключено до MongoDB');

        // Очищення існуючих даних
        console.log('\n🗑️  Очищення існуючих даних...');
        await Lift.deleteMany({});
        await Request.deleteMany({});
        console.log('✅ База даних очищена');

        // Створення тестового клієнта
        console.log('\n👤 Створення тестового клієнта...');
        let testClient = await User.findOne({ email: 'client@test.com' });
        if (!testClient) {
            testClient = await User.create({
                username: 'test_client',
                email: 'client@test.com',
                password: '$2a$10$abcdefghijklmnopqrstuv', // хеш для "password123"
                role: 'client',
                name: 'Тестовий Клієнт',
                firstName: 'Тестовий',
                lastName: 'Клієнт'
            });
            console.log('  ✅ Клієнт створено:', testClient.email);
        } else {
            console.log('  ℹ️  Клієнт вже існує:', testClient.email);
        }
        
        // Створення тестового техніка
        console.log('\n🔧 Створення тестового техніка...');
        let testTechnician = await User.findOne({ email: 'technician@test.com' });
        if (!testTechnician) {
            testTechnician = await User.create({
                username: 'test_technician',
                email: 'technician@test.com',
                password: '$2a$10$abcdefghijklmnopqrstuv', // хеш для "password123"
                role: 'technician',
                name: 'Тестовий Технік',
                firstName: 'Іван',
                lastName: 'Петров',
                phone: '+380501234567'
            });
            console.log('  ✅ Технік створено:', testTechnician.email);
        } else {
            console.log('  ℹ️  Технік вже існує:', testTechnician.email);
        }

        // Відновлення ліфтів
        console.log('\n📦 Відновлення ліфтів...');
        const liftsData = JSON.parse(
            fs.readFileSync(path.join(__dirname, '..', 'test-lifts-data.json'), 'utf8')
        );
        
        const createdLifts = [];
        for (const liftData of liftsData) {
            // Додаємо клієнта до кожного ліфта
            liftData.client = testClient._id;
            
            const createdLift = await Lift.create(liftData);
            createdLifts.push(createdLift);
            console.log(`  ✅ Додано ліфт: ${liftData.municipalNumber} - ${liftData.manufacturer} ${liftData.model} (ObjectId: ${createdLift._id})`);
        }

        // Створення тестових заявок
        console.log('\n📝 Створення тестових заявок...');
        const testRequests = [
            {
                lift: createdLifts[0]._id, // LFT-001
                client: testClient._id,
                title: 'Планове технічне обслуговування',
                description: 'Необхідне планове ТО ліфта згідно графіку',
                priority: 'medium',
                status: 'new'
            },
            {
                lift: createdLifts[1]._id, // LFT-002
                client: testClient._id,
                title: 'Несправність дверей кабіни',
                description: 'Двері кабіни не закриваються повністю, потрібен термінов ремонт',
                priority: 'high',
                status: 'in_progress'
            },
            {
                lift: createdLifts[2]._id, // LFT-003
                client: testClient._id,
                title: 'Термінова інспекція',
                description: 'Спрацював аварійний сигнал, необхідна негайна інспекція',
                priority: 'urgent',
                status: 'assigned'
            }
        ];

        for (const [index, requestData] of testRequests.entries()) {
            const request = await Request.create(requestData);
            console.log(`  ✅ Додано заявку: ${request.title} (ID: ${request._id})`);
        }

        // Статистика
        console.log('\n📊 Статистика:');
        const liftsCount = await Lift.countDocuments();
        const requestsCount = await Request.countDocuments();
        console.log(`  📦 Ліфтів: ${liftsCount}`);
        console.log(`  📝 Заявок: ${requestsCount}`);

        console.log('\n✅ Дані успішно відновлено!');
        
    } catch (error) {
        console.error('❌ Помилка:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Відключено від MongoDB');
    }
}

// Запуск
restoreData();
