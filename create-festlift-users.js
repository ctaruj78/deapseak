#!/usr/bin/env node
/**
 * Створення production користувачів FestLift
 * Використовуйте це для створення облікових записів з правильними email
 */

const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'deapseak';

const FESTLIFT_USERS = [
    {
        email: 'info@festlift.pt',
        username: 'admin_festlift',
        password: 'admin123',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'FestLift',
        phone: '+351 123 456 789'
    },
    {
        email: 'dispatcher@festlift.pt',
        username: 'dispatcher_festlift',
        password: 'dispatcher123',
        role: 'dispatcher',
        firstName: 'Dispatcher',
        lastName: 'FestLift',
        phone: '+351 123 456 790'
    },
    {
        email: 'tech1@festlift.pt',
        username: 'tech1_festlift',
        password: 'tech123',
        role: 'tech',
        firstName: 'Técnico',
        lastName: 'Um',
        phone: '+351 123 456 791',
        specialty: 'maintenance'
    },
    {
        email: 'tech2@festlift.pt',
        username: 'tech2_festlift',
        password: 'tech123',
        role: 'tech',
        firstName: 'Técnico',
        lastName: 'Dois',
        phone: '+351 123 456 792',
        specialty: 'repair'
    },
    {
        email: 'client@festlift.pt',
        username: 'client_festlift',
        password: 'client123',
        role: 'client',
        firstName: 'Cliente',
        lastName: 'Demo',
        phone: '+351 123 456 793'
    }
];

async function createFestLiftUsers() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('✅ Підключено до MongoDB\n');
        
        const db = client.db(DB_NAME);
        const users = db.collection('users');
        
        console.log('🔧 Створення FestLift користувачів...\n');
        
        for (const userData of FESTLIFT_USERS) {
            // Перевірка чи існує
            const existing = await users.findOne({ email: userData.email });
            
            if (existing) {
                // Оновлюємо існуючого користувача
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                
                await users.updateOne(
                    { email: userData.email },
                    {
                        $set: {
                            username: userData.username,
                            password: hashedPassword,
                            role: userData.role,
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            phone: userData.phone,
                            ...(userData.specialty && { specialty: userData.specialty }),
                            updatedAt: new Date()
                        }
                    }
                );
                
                console.log(`🔄 ОНОВЛЕНО: ${userData.email.padEnd(30)} | ${userData.role}`);
            } else {
                // Створюємо нового
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                
                const newUser = {
                    email: userData.email,
                    username: userData.username,
                    password: hashedPassword,
                    role: userData.role,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    phone: userData.phone,
                    ...(userData.specialty && { specialty: userData.specialty }),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isActive: true
                };
                
                await users.insertOne(newUser);
                console.log(`✅ СТВОРЕНО: ${userData.email.padEnd(30)} | ${userData.role}`);
            }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ ГОТОВО! Всі FestLift користувачі створені/оновлені');
        console.log('='.repeat(70));
        
        console.log('\n📋 Облікові дані для входу:');
        console.log('-'.repeat(70));
        FESTLIFT_USERS.forEach(u => {
            console.log(`${u.role.padEnd(12)} | ${u.email.padEnd(30)} | ${u.password}`);
        });
        console.log('-'.repeat(70));
        
    } catch (error) {
        console.error('❌ Помилка:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Запуск
if (require.main === module) {
    createFestLiftUsers()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { createFestLiftUsers, FESTLIFT_USERS };
