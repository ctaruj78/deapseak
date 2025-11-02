#!/usr/bin/env node

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const dbConnection = require('../config/database');

async function seedDatabase() {
  try {
    console.log('🌱 Заповнення бази даних тестовими даними...\n');
    
    await dbConnection.connect();
    const db = dbConnection.getDb();
    
    // Clear existing data
    console.log('🗑️  Очищення існуючих даних...');
    await db.collection('users').deleteMany({});
    await db.collection('lifts').deleteMany({});
    await db.collection('requests').deleteMany({});
    console.log('✅ Дані очищено\n');
    
    // Create users
    console.log('👥 Створення користувачів...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await db.collection('users').insertMany([
      {
        email: 'admin@deapseak.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        phone: '+380501234567',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'dispatcher@deapseak.com',
        password: hashedPassword,
        name: 'Dispatcher User',
        role: 'dispatcher',
        phone: '+380501234568',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'technician@deapseak.com',
        password: hashedPassword,
        name: 'Technician User',
        role: 'technician',
        phone: '+380501234569',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'client@deapseak.com',
        password: hashedPassword,
        name: 'Client User',
        role: 'client',
        phone: '+380501234570',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    
    const userIds = Object.values(users.insertedIds);
    console.log(`✅ Створено ${userIds.length} користувачів\n`);
    
    // Create lifts
    console.log('🏢 Створення ліфтів...');
    const lifts = await db.collection('lifts').insertMany([
      {
        address: 'вул. Хрещатик, 1, Київ',
        liftNumber: 'L-001',
        manufacturer: 'OTIS',
        model: 'GeN2',
        installationDate: new Date('2020-01-15'),
        capacity: 630,
        floors: 10,
        status: 'operational',
        lastMaintenanceDate: new Date('2024-10-01'),
        nextMaintenanceDate: new Date('2025-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        address: 'вул. Хрещатик, 1, Київ',
        liftNumber: 'L-002',
        manufacturer: 'Schindler',
        model: '3300',
        installationDate: new Date('2019-05-20'),
        capacity: 525,
        floors: 10,
        status: 'maintenance',
        lastMaintenanceDate: new Date('2024-09-15'),
        nextMaintenanceDate: new Date('2024-12-15'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        address: 'вул. Велика Васильківська, 50, Київ',
        liftNumber: 'L-001',
        manufacturer: 'KONE',
        model: 'MonoSpace',
        installationDate: new Date('2021-03-10'),
        capacity: 450,
        floors: 9,
        status: 'operational',
        lastMaintenanceDate: new Date('2024-10-10'),
        nextMaintenanceDate: new Date('2025-01-10'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        address: 'пр. Перемоги, 100, Київ',
        liftNumber: 'L-001',
        manufacturer: 'ThyssenKrupp',
        model: 'Evolution',
        installationDate: new Date('2018-11-25'),
        capacity: 800,
        floors: 12,
        status: 'broken',
        lastMaintenanceDate: new Date('2024-08-20'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    
    const liftIds = Object.values(lifts.insertedIds);
    console.log(`✅ Створено ${liftIds.length} ліфтів\n`);
    
    // Create requests
    console.log('📋 Створення заявок...');
    const requests = await db.collection('requests').insertMany([
      {
        liftId: liftIds[0],
        createdBy: userIds[3],
        description: 'Ліфт зупинився між поверхами. Пасажири всередині.',
        type: 'emergency',
        priority: 'urgent',
        status: 'assigned',
        assignedTo: userIds[2],
        contactPhone: '+380501234570',
        notes: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        liftId: liftIds[1],
        createdBy: userIds[1],
        description: 'Планове технічне обслуговування',
        type: 'maintenance',
        priority: 'normal',
        status: 'in_progress',
        assignedTo: userIds[2],
        notes: [
          {
            createdBy: userIds[2],
            comment: 'Розпочато огляд. Виявлено зношені канати.',
            createdAt: new Date()
          }
        ],
        attachments: [],
        createdAt: new Date('2024-10-25'),
        updatedAt: new Date()
      },
      {
        liftId: liftIds[2],
        createdBy: userIds[3],
        description: 'Двері закриваються занадто швидко',
        type: 'repair',
        priority: 'high',
        status: 'pending',
        contactPhone: '+380501234571',
        notes: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        liftId: liftIds[3],
        createdBy: userIds[3],
        description: 'Ліфт не працює взагалі. Помилка E-45.',
        type: 'emergency',
        priority: 'urgent',
        status: 'assigned',
        assignedTo: userIds[2],
        contactPhone: '+380501234572',
        notes: [],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        liftId: liftIds[0],
        createdBy: userIds[1],
        description: 'Щорічна інспекція',
        type: 'inspection',
        priority: 'normal',
        status: 'completed',
        assignedTo: userIds[2],
        completedAt: new Date('2024-10-01'),
        notes: [
          {
            createdBy: userIds[2],
            comment: 'Інспекція завершена. Всі системи працюють нормально.',
            createdAt: new Date('2024-10-01')
          }
        ],
        attachments: [],
        createdAt: new Date('2024-09-25'),
        updatedAt: new Date('2024-10-01')
      }
    ]);
    
    console.log(`✅ Створено ${Object.keys(requests.insertedIds).length} заявок\n`);
    
    // Show credentials
    console.log('🔐 Облікові дані для тестування:\n');
    console.log('Admin:');
    console.log('  📧 Email: admin@deapseak.com');
    console.log('  🔑 Password: password123\n');
    
    console.log('Dispatcher:');
    console.log('  📧 Email: dispatcher@deapseak.com');
    console.log('  🔑 Password: password123\n');
    
    console.log('Technician:');
    console.log('  📧 Email: technician@deapseak.com');
    console.log('  🔑 Password: password123\n');
    
    console.log('Client:');
    console.log('  📧 Email: client@deapseak.com');
    console.log('  🔑 Password: password123\n');
    
    console.log('✅ База даних успішно заповнена!\n');
    
    await dbConnection.disconnect();
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Помилка:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

seedDatabase();