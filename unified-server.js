const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:3001'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статичні файли
app.use(express.static(path.join(__dirname)));

// MongoDB підключення
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'deapseak';
let db;

MongoClient.connect(MONGODB_URI, { 
    useUnifiedTopology: true 
}).then(client => {
    // logger.log('MongoDB connected:', MONGODB_URI, 'DB:', DB_NAME);
    db = client.db(DB_NAME);
}).catch(err => {
    // logger.error('MongoDB connection error:', err);
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'deapseak_secret_key_2024';

// API маршрути
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: PORT,
        mode: 'unified'
    });
});

// Логін
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        // logger.log('🔐 Запит на логін:', { email, username, passwordLength: password?.length });
        
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Пароль обов\'язковий'
            });
        }

        const loginField = email || username;
        if (!loginField) {
            return res.status(400).json({
                success: false,
                message: 'Email або логін обов\'язковий'
            });
        }

        // Пошук користувача
        const users = db.collection('users');
        const user = await users.findOne({
            $or: [
                { email: loginField },
                { username: loginField }
            ]
        });

        if (!user) {
            // logger.log('❌ Користувач не знайдений:', loginField);
            return res.status(401).json({
                success: false,
                message: 'Користувач не знайдений'
            });
        }

        // Перевірка паролю
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            // logger.log('❌ Неправильний пароль для:', loginField);
            return res.status(401).json({
                success: false,
                message: 'Неправильний пароль'
            });
        }

        // Створення токена
        const token = jwt.sign(
            { 
                id: user._id.toString(),
                username: user.username,
                role: user.role
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // logger.log('✅ Успішний логін:', user.username, user.role);

        res.json({
            success: true,
            message: 'Успішна авторизація',
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        });

    } catch (error) {
        // logger.error('❌ Помилка логіну:', error);
        res.status(500).json({
            success: false,
            message: 'Внутрішня помилка сервера'
        });
    }
});

// Middleware для перевірки токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1] || 
                  req.headers['x-auth-token'] || 
                  req.cookies?.auth_token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Токен авторизації не надано'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // logger.log('❌ Невалідний токен:', err.message);
            return res.status(403).json({
                success: false,
                message: 'Невалідний токен'
            });
        }
        req.user = user;
        next();
    });
}

// Захищені маршрути
app.get('/api/lifts', authenticateToken, async (req, res) => {
    try {
        const lifts = await db.collection('lifts').find({}).toArray();
        res.json(lifts);
    } catch (error) {
        // logger.error('❌ Помилка отримання ліфтів:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання ліфтів'
        });
    }
});

// Головна сторінка
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    // logger.log(`🚀 Unified сервер запущено на http://0.0.0.0:${PORT}`);
    // logger.log(`📁 Статичні файли: ${__dirname}`);
    // logger.log(`🔐 API endpoints: /api/*`);
});

module.exports = app;