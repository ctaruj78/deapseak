// db.js
// Модуль для підключення до MongoDB

const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'deapseak';

let client;
let db;

async function connectDB() {
    if (!client) {
        client = new MongoClient(MONGO_URL);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('MongoDB connected:', MONGO_URL, 'DB:', DB_NAME);
    }
    return db;
}

function getDB() {
    if (!db) throw new Error('MongoDB not connected!');
    return db;
}

async function closeDB() {
    if (client) await client.close();
    client = null;
    db = null;
}

module.exports = {
    connectDB,
    getDB,
    closeDB
};
