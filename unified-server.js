const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 5000; // Unified Server на порту 5000

// Middleware
app.use(cors({
    origin: ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3002'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB підключення
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'deapseak';
let db;

MongoClient.connect(MONGODB_URI, { 
    useUnifiedTopology: true 
}).then(client => {
    console.log('MongoDB connected:', MONGODB_URI, 'DB:', DB_NAME);
    db = client.db(DB_NAME);
}).catch(err => {
    console.error('MongoDB connection error:', err);
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
        
        console.log('🔐 Запит на логін:', { email, username, passwordLength: password?.length });
        
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
            console.log('❌ Користувач не знайдений:', loginField);
            return res.status(401).json({
                success: false,
                message: 'Користувач не знайдений'
            });
        }

        // Перевірка паролю
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            console.log('❌ Неправильний пароль для:', loginField);
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

        console.log('✅ Успішний логін:', user.username, user.role);

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
        console.error('❌ Помилка логіну:', error);
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

    console.log('🔐 Auth check:', {
        hasAuthHeader: !!authHeader,
        hasToken: !!token,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
    });

    if (!token) {
        console.log('❌ Токен не надано');
        return res.status(401).json({
            success: false,
            message: 'Токен авторизації не надано'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('❌ JWT verify error:', err.message);
            console.log('🔑 JWT_SECRET:', JWT_SECRET);
            console.log('📝 Token:', token.substring(0, 50) + '...');
            return res.status(403).json({
                success: false,
                message: 'Невалідний токен: ' + err.message
            });
        }
        console.log('✅ Token valid, user:', user.username);
        req.user = user;
        next();
    });
}

// Захищені маршрути
app.get('/api/lifts', authenticateToken, async (req, res) => {
    try {
        const lifts = await db.collection('lifts').find({}).toArray();
        res.json({
            success: true,
            data: lifts
        });
    } catch (error) {
        console.error('❌ Помилка отримання ліфтів:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання ліфтів'
        });
    }
});

// Заявки на обслуговування
app.get('/api/requests', authenticateToken, async (req, res) => {
    try {
        const requests = await db.collection('requests').find({}).toArray();
        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('❌ Помилка отримання заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання заявок'
        });
    }
});

app.post('/api/requests', authenticateToken, async (req, res) => {
    try {
        const newRequest = {
            ...req.body,
            createdAt: new Date().toISOString(),
            createdBy: req.user.username,
            updatedAt: new Date().toISOString()
        };
        
        const result = await db.collection('requests').insertOne(newRequest);
        
        res.json({
            success: true,
            message: 'Заявку створено успішно',
            data: {
                _id: result.insertedId,
                ...newRequest
            }
        });
    } catch (error) {
        console.error('❌ Помилка створення заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка створення заявки'
        });
    }
});

app.put('/api/requests/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const requestId = new ObjectId(req.params.id);
        
        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.username
        };
        
        const result = await db.collection('requests').updateOne(
            { _id: requestId },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявку не знайдено'
            });
        }
        
        res.json({
            success: true,
            message: 'Заявку оновлено успішно'
        });
    } catch (error) {
        console.error('❌ Помилка оновлення заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка оновлення заявки'
        });
    }
});

app.delete('/api/requests/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const requestId = new ObjectId(req.params.id);
        
        const result = await db.collection('requests').deleteOne({ _id: requestId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявку не знайдено'
            });
        }
        
        res.json({
            success: true,
            message: 'Заявку видалено успішно'
        });
    } catch (error) {
        console.error('❌ Помилка видалення заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка видалення заявки'
        });
    }
});

// Статичні файли - ОСТАННІ, щоб не перекривали API
app.use(express.static(path.join(__dirname), {
    index: ['index.html'],
    extensions: ['html']
}));

// Fallback для SPA - якщо файл не знайдено, віддаємо index.html
app.get('*', (req, res) => {
    // Якщо це API запит - 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: 'API endpoint not found' });
    }
    // Інакше - віддаємо index.html для SPA роутингу
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Unified сервер запущено на http://0.0.0.0:${PORT}`);
    console.log(`📁 Статичні файли: ${__dirname}`);
    console.log(`🔐 API endpoints: /api/*`);
});

module.exports = app;