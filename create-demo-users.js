#!/usr/bin/env node

// ============================================
// Створення Demo користувачів для DeapSeaK
// ============================================

const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'deapseak';

const users = [
    {
        email: 'info@festlift.pt',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        firstName: 'Адміністратор',
        lastName: 'Системи',
        phone: '+351912345678',
        isActive: true
    },
    {
        email: 'dispatcher@festlift.pt',
        username: 'dispatcher',
        password: 'dispatcher123',
        role: 'dispatcher',
        firstName: 'Диспетчер',
        lastName: 'Головний',
        phone: '+351912345679',
        isActive: true
    },
    {
        email: 'tech1@festlift.pt',
        username: 'tech',
        password: 'tech123',
        role: 'technician',
        firstName: 'Технік',
        lastName: 'Основний',
        phone: '+351912345680',
        specialty: 'general',
        isActive: true
    },
    {
        email: 'tech2@festlift.pt',
        username: 'tech1',
        password: 'tech123',
        role: 'technician',
        firstName: 'Технік',
        lastName: 'Перший',
        phone: '+351912345681',
        specialty: 'electric',
        isActive: true
    },
    {
        email: 'tech3@festlift.pt',
        username: 'tech2',
        password: 'tech123',
        role: 'technician',
        firstName: 'Технік',
        lastName: 'Другий',
        phone: '+351912345682',
        specialty: 'mechanical',
        isActive: true
    },
    {
        email: 'client@festlift.pt',
        username: 'client',
        password: 'client123',
        role: 'client',
        firstName: 'Клієнт',
        lastName: 'Тестовий',
        phone: '+351912345683',
        company: 'Test Company Lda',
        isActive: true
    }
];

async function createDemoUsers() {
    let client;
    
    try {
        console.log('🔗 Підключення до MongoDB...');
        client = await MongoClient.connect(MONGODB_URI);
        const db = client.db(DB_NAME);
        
        // 🛡️ ЗАХИСТ: не видаляти якщо є реальні клієнти (не тільки demo акаунти)
        const realClientCount = await db.collection('users').countDocuments({
            email: { $nin: ['info@festlift.pt', 'dispatcher@festlift.pt', 'tech1@festlift.pt', 'tech2@festlift.pt', 'client@festlift.pt'] }
        });
        if (realClientCount > 0) {
            console.error(`❌ НЕБЕЗПЕЧНО: В БД є ${realClientCount} реальних користувачів! Запуск заборонено.`);
            console.error('   Цей скрипт видаляє ВСІХ користувачів. Якщо ви впевнені — видаліть перевірку вручну.');
            process.exit(1);
        }

        console.log('🗑️  Очищення старої колекції users...');
        await db.collection('users').deleteMany({});
        
        console.log('🔐 Хешування паролів та створення користувачів...');
        
        const hashedUsers = [];
        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            hashedUsers.push({
                ...user,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        
        const result = await db.collection('users').insertMany(hashedUsers);
        console.log(`✅ Створено ${result.insertedCount} користувачів\n`);
        
        console.log('📋 Список користувачів:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const allUsers = await db.collection('users').find({}).toArray();
        allUsers.forEach(u => {
            const fullName = `${u.firstName} ${u.lastName}`;
            console.log(`  ${u.role.padEnd(12)} | ${u.email.padEnd(30)} | ${fullName}`);
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('🔑 Credentials для логіну:');
        console.log('  👨‍💼 Адмін:      info@festlift.pt / admin123');
        console.log('  📞 Диспетчер:  dispatcher@festlift.pt / dispatcher123');
        console.log('  🔧 Технік:     tech1@festlift.pt / tech123');
        console.log('  👤 Клієнт:     client@festlift.pt / client123\n');
        
    } catch (error) {
        console.error('❌ Помилка:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('✅ З\'єднання закрито');
        }
    }
}

// Запуск
createDemoUsers();
