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

// POST /api/lifts - створення нового ліфта
app.post('/api/lifts', authenticateToken, async (req, res) => {
    try {
        const newLift = {
            ...req.body,
            createdAt: new Date().toISOString(),
            createdBy: req.user.username,
            updatedAt: new Date().toISOString()
        };
        
        const result = await db.collection('lifts').insertOne(newLift);
        
        res.json({
            success: true,
            message: 'Ліфт створено успішно',
            data: {
                _id: result.insertedId,
                ...newLift
            }
        });
    } catch (error) {
        console.error('❌ Помилка створення ліфта:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка створення ліфта'
        });
    }
});

// PUT /api/lifts/:id - оновлення ліфта
app.put('/api/lifts/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        
        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.username
        };
        
        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ліфт не знайдено'
            });
        }
        
        res.json({
            success: true,
            message: 'Ліфт оновлено успішно'
        });
    } catch (error) {
        console.error('❌ Помилка оновлення ліфта:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка оновлення ліфта'
        });
    }
});

// DELETE /api/lifts/:id - видалення ліфта
app.delete('/api/lifts/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        
        const result = await db.collection('lifts').deleteOne({ _id: liftId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ліфт не знайдено'
            });
        }
        
        res.json({
            success: true,
            message: 'Ліфт видалено успішно'
        });
    } catch (error) {
        console.error('❌ Помилка видалення ліфта:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка видалення ліфта'
        });
    }
});

// GET /api/users - отримання користувачів
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const users = await db.collection('users').find({}, {
            projection: { password: 0 } // Не віддаємо паролі
        }).toArray();
        
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('❌ Помилка отримання користувачів:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання користувачів'
        });
    }
});

// GET /api/users/:id - отримання конкретного користувача
app.get('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const userId = new ObjectId(req.params.id);
        
        const user = await db.collection('users').findOne(
            { _id: userId },
            { projection: { password: 0 } }
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Користувача не знайдено'
            });
        }
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ Помилка отримання користувача:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання користувача'
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

// PATCH /api/requests/:id/status - зміна статусу заявки
app.patch('/api/requests/:id/status', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const requestId = new ObjectId(req.params.id);
        const { status, technician } = req.body;
        
        console.log('🔄 Зміна статусу заявки:', req.params.id, '→', status);
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Статус обов\'язковий'
            });
        }
        
        const updateData = {
            status: status,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.username
        };
        
        // Якщо призначається технік
        if (technician) {
            updateData.technician = technician;
            updateData.assignedAt = new Date().toISOString();
        }
        
        // Якщо статус "completed" - додаємо час завершення
        if (status === 'completed') {
            updateData.completedAt = new Date().toISOString();
        }
        
        // Якщо статус "in_progress" - додаємо час початку
        if (status === 'in_progress' && !updateData.startedAt) {
            updateData.startedAt = new Date().toISOString();
        }
        
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
            message: 'Статус заявки оновлено успішно',
            data: updateData
        });
    } catch (error) {
        console.error('❌ Помилка зміни статусу:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка зміни статусу заявки'
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