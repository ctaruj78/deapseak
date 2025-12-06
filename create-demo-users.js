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
        email: 'admin@deapseak.com',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        fullName: 'Адміністратор Системи',
        phone: '+351 912 345 678',
        isActive: true
    },
    {
        email: 'dispatcher@deapseak.com',
        username: 'dispatcher',
        password: 'dispatcher123',
        role: 'dispatcher',
        fullName: 'Диспетчер Головний',
        phone: '+351 912 345 679',
        isActive: true
    },
    {
        email: 'tech@deapseak.com',
        username: 'tech',
        password: 'tech123',
        role: 'tech',
        fullName: 'Технік Основний',
        phone: '+351 912 345 680',
        specialty: 'Загальне обслуговування',
        isActive: true
    },
    {
        email: 'tech1@deapseak.com',
        username: 'tech1',
        password: 'tech123',
        role: 'tech',
        fullName: 'Технік 1',
        phone: '+351 912 345 681',
        specialty: 'Електрика',
        isActive: true
    },
    {
        email: 'tech2@deapseak.com',
        username: 'tech2',
        password: 'tech123',
        role: 'tech',
        fullName: 'Технік 2',
        phone: '+351 912 345 682',
        specialty: 'Механіка',
        isActive: true
    },
    {
        email: 'client@deapseak.com',
        username: 'client',
        password: 'client123',
        role: 'client',
        fullName: 'Клієнт Тестовий',
        phone: '+351 912 345 683',
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
            console.log(`  ${u.role.padEnd(12)} | ${u.email.padEnd(30)} | ${u.fullName}`);
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('🔑 Credentials для логіну:');
        console.log('  Admin:      admin@deapseak.com / admin123');
        console.log('  Dispatcher: dispatcher@deapseak.com / dispatcher123');
        console.log('  Technician: tech@deapseak.com / tech123');
        console.log('  Client:     client@deapseak.com / client123\n');
        
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
