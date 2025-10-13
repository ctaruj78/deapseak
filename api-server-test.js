const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Підключення до MongoDB
let dbClient = null;
let db = null;

async function connectDB() {
    try {
        const uri = 'mongodb://localhost:27017/deapseak';
        dbClient = new MongoClient(uri);
        await dbClient.connect();
        db = dbClient.db('deapseak');
        console.log('MongoDB connected:', uri);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

function getDB() {
    if (!db) {
        throw new Error('Database not connected');
    }
    return db;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Базові маршрути
app.get('/api/status', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/test', async (req, res) => {
    try {
        const db = getDB();
        const count = await db.collection('users').countDocuments();
        res.json({ message: 'Тестовий маршрут працює', usersCount: count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Запуск сервера
async function startServer() {
    try {
        await connectDB();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Тестовий API сервер запущено на http://0.0.0.0:${PORT}`);
        });
    } catch (error) {
        console.error('Помилка запуску сервера:', error);
        process.exit(1);
    }
}

startServer();
