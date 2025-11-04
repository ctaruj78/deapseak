const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/deapseak';
let db = null;
let client = null;

async function connectDB() {
    try {
        client = new MongoClient(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });
        
        await client.connect();
        db = client.db('deapseak');
        
        // Test connection
        await db.admin().ping();
        console.log('✅ MongoDB підключена');
        
        return db;
    } catch (error) {
        console.error('❌ MongoDB помилка:', error.message);
        throw error;
    }
}

function getDB() {
    if (!db) {
        console.warn('⚠️  БД не підключена');
        return null;
    }
    return db;
}

async function closeDB() {
    if (client) {
        await client.close();
        db = null;
        console.log('🛑 MongoDB закрита');
    }
}

module.exports = { connectDB, getDB, closeDB };
