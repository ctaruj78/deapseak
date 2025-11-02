#!/usr/bin/env node

require('dotenv').config();
const bcrypt = require('bcryptjs');
const dbConnection = require('../config/database');
const log = require('../utils/logger');

async function initDatabase() {
  try {
    console.log('🚀 Ініціалізація бази даних...\n');
    
    // Connect to database
    console.log('📡 Підключення до MongoDB...');
    await dbConnection.connect();
    console.log('✅ Підключено до MongoDB\n');
    
    const db = dbConnection.getDb();
    
    // Create collections
    console.log('📦 Створення колекцій...');
    const collections = ['users', 'lifts', 'requests'];
    
    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName);
        console.log(`  ✅ ${collectionName}`);
      } catch (err) {
        if (err.code === 48) {
          console.log(`  ℹ️  ${collectionName} вже існує`);
        } else {
          throw err;
        }
      }
    }
    console.log('');
    
    // Create indexes
    console.log('🔍 Створення індексів...');
    
    // Users indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('  ✅ users.email (unique)');
    
    // Lifts indexes
    await db.collection('lifts').createIndex({ address: 1, liftNumber: 1 }, { unique: true });
    await db.collection('lifts').createIndex({ status: 1 });
    await db.collection('lifts').createIndex({ qrCode: 1 });
    console.log('  ✅ lifts.address + liftNumber (unique)');
    console.log('  ✅ lifts.status');
    console.log('  ✅ lifts.qrCode');
    
    // Requests indexes
    await db.collection('requests').createIndex({ liftId: 1 });
    await db.collection('requests').createIndex({ createdBy: 1 });
    await db.collection('requests').createIndex({ assignedTo: 1 });
    await db.collection('requests').createIndex({ status: 1 });
    await db.collection('requests').createIndex({ priority: 1 });
    await db.collection('requests').createIndex({ createdAt: -1 });
    console.log('  ✅ requests.liftId');
    console.log('  ✅ requests.createdBy');
    console.log('  ✅ requests.assignedTo');
    console.log('  ✅ requests.status');
    console.log('  ✅ requests.priority');
    console.log('  ✅ requests.createdAt');
    console.log('');
    
    // Create default admin user
    console.log('👤 Створення адміністратора...');
    const existingAdmin = await db.collection('users').findOne({ role: 'admin' });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.collection('users').insertOne({
        email: 'admin@deapseak.com',
        password: hashedPassword,
        name: 'System Administrator',
        role: 'admin',
        phone: '+380000000000',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('  ✅ Адміністратор створено');
      console.log('  📧 Email: admin@deapseak.com');
      console.log('  🔑 Password: admin123');
      console.log('  ⚠️  ЗМІНІТЬ ПАРОЛЬ ПІСЛЯ ПЕРШОГО ВХОДУ!');
    } else {
      console.log('  ℹ️  Адміністратор вже існує');
    }
    console.log('');
    
    // Statistics
    console.log('📊 Статистика бази даних:');
    const stats = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('lifts').countDocuments(),
      db.collection('requests').countDocuments()
    ]);
    
    console.log(`  • Users: ${stats[0]}`);
    console.log(`  • Lifts: ${stats[1]}`);
    console.log(`  • Requests: ${stats[2]}`);
    console.log('');
    
    console.log('✅ База даних успішно ініціалізована!\n');
    
    await dbConnection.disconnect();
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Помилка ініціалізації:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run initialization
initDatabase();