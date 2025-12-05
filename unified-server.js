// ============================================
// UNIFIED SERVER - DeapSeaK v2
// Один сервер для Frontend + API + WebSocket
// ============================================

require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const multer = require('multer');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 5000; // Unified Server на порту 5000

// Middleware - CORS для Codespaces
app.use(cors({
    origin: function(origin, callback) {
        // Дозволити запити без origin (Postman, curl) або з будь-якого origin
        if (!origin || 
            origin.includes('localhost') || 
            origin.includes('127.0.0.1') ||
            origin.includes('github.dev') ||
            origin.includes('app.github.dev')) {
            callback(null, true);
        } else {
            callback(null, true); // В dev режимі дозволяємо все
        }
    },
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

// Multer configuration for PDF uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads', 'pdfs');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// PDF Parser Service
const pdfParser = require('./services/pdf-parser');

// PDF Upload and Analysis endpoint
app.post('/api/pdf/upload', authenticateToken, upload.single('pdfReport'), async (req, res) => {
    try {
        console.log('📄 PDF upload request received');
        console.log('👤 User:', req.user?.username || 'Unknown');
        console.log('📁 File:', req.file?.originalname || 'No file');
        
        if (!req.file) {
            console.error('❌ No file in request');
            return res.status(400).json({
                success: false,
                error: 'No PDF file uploaded. Please select a PDF file.'
            });
        }

        console.log('📄 PDF uploaded:', req.file.filename, 'by', req.user.username);
        console.log('📏 File size:', req.file.size, 'bytes');
        console.log('📍 File path:', req.file.path);

        // Parse PDF and extract analysis
        console.log('🔍 Starting PDF analysis...');
        const result = await pdfParser.parsePDF(req.file.path);
        console.log('📊 Analysis result:', result.success ? 'Success' : 'Failed');

        // Clean up the uploaded file
        await pdfParser.cleanupFile(req.file.path);

        if (result.success) {
            console.log('✅ PDF analysis completed:', result.analysis.violations.length, 'violations found');
            res.json({
                success: true,
                analysis: result.analysis
            });
        } else {
            console.error('❌ PDF analysis failed:', result.error);
            res.status(500).json({
                success: false,
                error: result.error || 'Failed to analyze PDF'
            });
        }
    } catch (error) {
        console.error('❌ PDF upload error:', error);
        console.error('Error stack:', error.stack);
        
        // Clean up file on error
        if (req.file) {
            await pdfParser.cleanupFile(req.file.path).catch(() => {});
        }
        
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error during PDF processing'
        });
    }
});

// Portuguese Regulations Search API
app.get('/api/regulations', authenticateToken, async (req, res) => {
    try {
        const { search } = req.query;
        
        // Load regulations
        const fs = require('fs');
        const regulationsPath = path.join(__dirname, 'data', 'portugal-lift-regulations.json');
        const regulationsData = JSON.parse(fs.readFileSync(regulationsPath, 'utf8'));
        
        if (!search) {
            // Return all regulations
            return res.json({
                success: true,
                data: regulationsData.regulations,
                metadata: regulationsData.metadata,
                total: regulationsData.regulations.length
            });
        }
        
        // Search in regulations
        const searchLower = search.toLowerCase();
        const results = regulationsData.regulations.filter(reg => {
            return (
                (reg.title && reg.title.toLowerCase().includes(searchLower)) ||
                (reg.summary && reg.summary.toLowerCase().includes(searchLower)) ||
                (reg.number && reg.number.toLowerCase().includes(searchLower)) ||
                (reg.scope && reg.scope.some(s => s && s.toLowerCase().includes(searchLower))) ||
                (reg.inspection_points && reg.inspection_points.some(point => 
                    (point.requirement && point.requirement.toLowerCase().includes(searchLower)) ||
                    (point.description && point.description.toLowerCase().includes(searchLower)) ||
                    (point.client_explanation && point.client_explanation.toLowerCase().includes(searchLower))
                ))
            );
        });
        
        res.json({
            success: true,
            data: results,
            query: search,
            total: results.length
        });
    } catch (error) {
        console.error('❌ Regulations search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

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
        
        // Віддаємо масив напряму (сторінка очікує масив)
        res.json(users);
    } catch (error) {
        console.error('❌ Помилка отримання користувачів:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання користувачів'
        });
    }
});

// POST /api/users - створення користувача
app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { email, password, firstName, lastName, role, status } = req.body;

        // Перевірка обов'язкових полів
        if (!email || !password || !firstName || !lastName || !role) {
            return res.status(400).json({
                success: false,
                error: 'Заповніть всі обов\'язкові поля'
            });
        }

        // Перевірка чи email вже існує
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Користувач з таким email вже існує'
            });
        }

        // Хешування пароля
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role,
            status: status || 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('users').insertOne(newUser);
        
        // Віддаємо користувача без пароля
        const { password: _, ...userWithoutPassword } = newUser;
        
        console.log('✅ Створено користувача:', email);
        res.status(201).json({
            success: true,
            data: { ...userWithoutPassword, _id: result.insertedId }
        });
    } catch (error) {
        console.error('❌ Помилка створення користувача:', error);
        res.status(500).json({
            success: false,
            error: 'Помилка створення користувача'
        });
    }
});

// PUT /api/users/:id - оновлення користувача
app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const userId = new ObjectId(req.params.id);
        const { email, password, firstName, lastName, role, status } = req.body;

        const updateData = {
            updatedAt: new Date()
        };

        if (email) updateData.email = email;
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (role) updateData.role = role;
        if (status) updateData.status = status;

        // Якщо є новий пароль - хешуємо
        if (password) {
            const bcrypt = require('bcryptjs');
            updateData.password = await bcrypt.hash(password, 10);
        }

        const result = await db.collection('users').findOneAndUpdate(
            { _id: userId },
            { $set: updateData },
            { returnDocument: 'after', projection: { password: 0 } }
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Користувача не знайдено'
            });
        }

        console.log('✅ Оновлено користувача:', userId);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ Помилка оновлення користувача:', error);
        res.status(500).json({
            success: false,
            error: 'Помилка оновлення користувача'
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

// ============================================
// SETTINGS API
// ============================================

// GET /api/settings - отримання налаштувань користувача
app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Шукаємо налаштування користувача
        let userSettings = await db.collection('user_settings').findOne({ userId });
        
        // Якщо немає - створюємо дефолтні
        if (!userSettings) {
            userSettings = {
                userId,
                language: 'uk',
                theme: 'light',
                notifications: {
                    email: true,
                    push: true,
                    sms: false
                },
                display: {
                    itemsPerPage: 25,
                    dateFormat: 'DD/MM/YYYY',
                    timeFormat: '24h'
                },
                createdAt: new Date().toISOString()
            };
            
            await db.collection('user_settings').insertOne(userSettings);
        }
        
        res.json({
            success: true,
            settings: userSettings
        });
    } catch (error) {
        console.error('❌ Помилка отримання налаштувань:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання налаштувань'
        });
    }
});

// PUT /api/settings - оновлення налаштувань
app.put('/api/settings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const newSettings = req.body;
        
        const result = await db.collection('user_settings').updateOne(
            { userId },
            { 
                $set: {
                    ...newSettings,
                    userId,
                    updatedAt: new Date().toISOString()
                }
            },
            { upsert: true }
        );
        
        res.json({
            success: true,
            message: 'Налаштування збережено',
            modified: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ Помилка збереження налаштувань:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка збереження налаштувань'
        });
    }
});

// PUT /api/settings/language - оновлення мови
app.put('/api/settings/language', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { language } = req.body;
        
        if (!language) {
            return res.status(400).json({
                success: false,
                message: 'Мова не вказана'
            });
        }
        
        const result = await db.collection('user_settings').updateOne(
            { userId },
            { 
                $set: {
                    language,
                    updatedAt: new Date().toISOString()
                }
            },
            { upsert: true }
        );
        
        res.json({
            success: true,
            message: 'Мову змінено',
            language
        });
    } catch (error) {
        console.error('❌ Помилка зміни мови:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка зміни мови'
        });
    }
});

// PUT /api/settings/theme - оновлення теми
app.put('/api/settings/theme', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { theme } = req.body;
        
        if (!theme) {
            return res.status(400).json({
                success: false,
                message: 'Тема не вказана'
            });
        }
        
        const result = await db.collection('user_settings').updateOne(
            { userId },
            { 
                $set: {
                    theme,
                    updatedAt: new Date().toISOString()
                }
            },
            { upsert: true }
        );
        
        res.json({
            success: true,
            message: 'Тему змінено',
            theme
        });
    } catch (error) {
        console.error('❌ Помилка зміни теми:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка зміни теми'
        });
    }
});

// ============================================
// AI ASSISTANT ENDPOINTS
// ============================================

// Load regulations data
const portugueseRegulations = require('./data/portugal-lift-regulations.json');
const regulationsSeed = require('./data/portuguese-regulations-seed.js');

// Функція аналізу звіту інспекції
function analyzeInspectionReport(reportText) {
    console.log('🔍 Аналіз звіту, довжина тексту:', reportText.length);
    
    // Визначення порушень з тексту
    const violations = [];
    const lines = reportText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Клаузи та їх категорії
    const knownViolations = {
        // Критичні порушення (C1)
        'bloqueio.*porta.*defeituoso': { severity: 'C1', category: 'Segurança de Portas', points: 15 },
        'porta.*sem.*sensor': { severity: 'C1', category: 'Segurança de Portas', points: 15 },
        'travagem.*defeituoso': { severity: 'C1', category: 'Sistema de Travagem', points: 20 },
        'pára-quedas.*ausente': { severity: 'C1', category: 'Sistema de Segurança', points: 25 },
        'cabos.*desgast': { severity: 'C1', category: 'Cabos e Suspensão', points: 20 },
        
        // Moderados (C2)
        'falta.*iluminação.*emergência': { severity: 'C2', category: 'Iluminação', points: 8 },
        'ucm.*não.*instalado': { severity: 'C2', category: 'UCM', points: 10 },
        'alarme.*não.*funcional': { severity: 'C2', category: 'Sistema de Alarme', points: 10 },
        'manutenção.*atrasada': { severity: 'C2', category: 'Manutenção', points: 8 },
        'documentação.*incompleta': { severity: 'C2', category: 'Documentação', points: 5 },
        
        // Leves (C3)
        'botões.*sem.*braille': { severity: 'C3', category: 'Acessibilidade', points: 3 },
        'sinalização.*faltando': { severity: 'C3', category: 'Sinalização', points: 2 },
        'pintura.*desgastada': { severity: 'C3', category: 'Estético', points: 1 },
        'limpeza.*inadequada': { severity: 'C3', category: 'Manutenção', points: 2 }
    };
    
    // Аналіз кожної лінії
    lines.forEach((line, index) => {
        const lineLower = line.toLowerCase();
        
        for (const [pattern, data] of Object.entries(knownViolations)) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(lineLower)) {
                violations.push({
                    id: violations.length + 1,
                    description: line,
                    severity: data.severity,
                    category: data.category,
                    points: data.points,
                    article: getRelatedArticle(data.category),
                    recommendation: getRecommendation(data.category),
                    deadline: getDeadline(data.severity)
                });
                break;
            }
        }
        
        // Якщо не знайдено відповідності, але лінія виглядає як порушення
        if (line.length > 10 && !violations.some(v => v.description === line)) {
            if (lineLower.includes('defeituoso') || lineLower.includes('ausente') || 
                lineLower.includes('não') || lineLower.includes('falta')) {
                violations.push({
                    id: violations.length + 1,
                    description: line,
                    severity: 'C2',
                    category: 'Geral',
                    points: 5,
                    article: 'Art. Geral',
                    recommendation: 'Corrigir conforme regulamentação',
                    deadline: '30 dias'
                });
            }
        }
    });
    
    // Підрахунок статистики
    const totalPoints = violations.reduce((sum, v) => sum + v.points, 0);
    const c1Count = violations.filter(v => v.severity === 'C1').length;
    const c2Count = violations.filter(v => v.severity === 'C2').length;
    const c3Count = violations.filter(v => v.severity === 'C3').length;
    
    // Визначення статусу
    let status = 'APROVADO';
    let statusColor = 'green';
    if (c1Count > 0) {
        status = 'REPROVADO - Crítico';
        statusColor = 'red';
    } else if (c2Count > 2) {
        status = 'CONDICIONAL';
        statusColor = 'orange';
    } else if (totalPoints > 15) {
        status = 'CONDICIONAL';
        statusColor = 'orange';
    }
    
    // Формування резюме
    const summaryText = `📋 **Результат аналізу звіту**\n\n` +
                   `**Статус:** ${status}\n` +
                   `**Всього порушень:** ${violations.length}\n` +
                   `• Критичні (C1): ${c1Count}\n` +
                   `• Помірні (C2): ${c2Count}\n` +
                   `• Легкі (C3): ${c3Count}\n\n` +
                   `**Загальна оцінка:** ${totalPoints} балів\n\n` +
                   (c1Count > 0 ? `⚠️ УВАГА: Виявлено критичні порушення! Експлуатація небезпечна.\n` : '') +
                   (c2Count > 0 ? `⚡ Потрібні корективні дії протягом 30 днів.\n` : '') +
                   `\nДетальний аналіз кожного пункту див. нижче.`;
    
    // Конвертація violations у формат для frontend
    const formattedViolations = violations.map(v => ({
        id: v.id,
        article: v.article,
        description: v.description,
        riskCategory: v.severity,
        regulation: {
            code: v.article,
            name: v.category,
            articleTitle: v.category,
            articleExplanation: v.recommendation
        },
        riskInfo: {
            description: `Термін усунення: ${v.deadline}`
        }
    }));
    
    // Формування рекомендацій
    const recommendations = [];
    if (c1Count > 0) {
        recommendations.push({
            icon: '🛑',
            text: 'Негайно припинити експлуатацію ліфта до усунення критичних порушень'
        });
    }
    if (c2Count > 0) {
        recommendations.push({
            icon: '⏰',
            text: 'Усунути помірні порушення протягом 30 днів'
        });
    }
    if (c3Count > 0) {
        recommendations.push({
            icon: '📝',
            text: 'Запланувати усунення легких порушень протягом 90 днів'
        });
    }
    recommendations.push({
        icon: '🔧',
        text: 'Звернутися до сертифікованої компанії для проведення робіт'
    });
    
    return {
        summary: {
            total: violations.length,
            critical: c1Count,
            medium: c2Count,
            low: c3Count
        },
        violations: formattedViolations,
        recommendations,
        passed: c1Count === 0 && totalPoints < 15,
        reportType: c1Count === 0 && c2Count === 0 ? 'approved_with_c3' : (c1Count === 0 ? 'certificate' : 'failed'),
        summaryText,
        totalPoints,
        status,
        statusColor
    };
}

function getRelatedArticle(category) {
    const articles = {
        'Segurança de Portas': 'Art. 6.2.1 - DL 163/2006',
        'Sistema de Travagem': 'Art. 6.3.1 - DL 163/2006',
        'Sistema de Segurança': 'Art. 6.4 - DL 163/2006',
        'Cabos e Suspensão': 'Art. 6.5.2 - DL 163/2006',
        'Iluminação': 'Art. 6.7.3 - DL 163/2006',
        'UCM': 'Art. 8.1 - DL 163/2006',
        'Sistema de Alarme': 'Art. 6.8 - DL 163/2006',
        'Manutenção': 'Art. 12 - Decreto 320/2002',
        'Documentação': 'Art. 14 - Decreto 320/2002',
        'Acessibilidade': 'Art. 6.9 - DL 163/2006',
        'Sinalização': 'Art. 6.7.1 - DL 163/2006'
    };
    return articles[category] || 'Regulamentação Geral';
}

function getRecommendation(category) {
    const recommendations = {
        'Segurança de Portas': 'Substituir ou reparar dispositivo de bloqueio. Instalar sensores de segurança.',
        'Sistema de Travagem': 'Revisão completa do sistema de travagem por técnico certificado.',
        'Sistema de Segurança': 'Instalação de pára-quedas conforme normas EN 81.',
        'Cabos e Suspensão': 'Substituição de cabos desgastados. Inspeção de polias e fixações.',
        'Iluminação': 'Instalar iluminação de emergência com bateria autônoma.',
        'UCM': 'Instalar Unidade de Controlo e Manobra certificada.',
        'Sistema de Alarme': 'Reparar ou substituir sistema de alarme. Testar conexão.',
        'Manutenção': 'Regularizar contrato de manutenção preventiva mensal.',
        'Documentação': 'Completar documentação técnica e registos de manutenção.',
        'Acessibilidade': 'Instalar botões com identificação Braille.',
        'Sinalização': 'Instalar sinalização de segurança obrigatória.'
    };
    return recommendations[category] || 'Consultar técnico certificado para resolução.';
}

function getDeadline(severity) {
    const deadlines = {
        'C1': 'Imediato - suspender operação',
        'C2': '30 dias',
        'C3': '90 dias'
    };
    return deadlines[severity] || '30 dias';
}

// AI Chat endpoint
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    try {
        const { message, context } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        console.log('🤖 AI Chat request:', message.substring(0, 100), 'from', req.user.email || req.user.username);
        
        // Перевірка чи це звіт інспекції
        if (context && context.reportText) {
            console.log('📋 Аналіз звіту інспекції...');
            const analysisResult = analyzeInspectionReport(context.reportText);
            return res.json({
                success: true,
                data: {
                    action: 'inspection_analysis',
                    response: analysisResult.summary,
                    data: {
                        analysis: analysisResult
                    }
                }
            });
        }

        // Simple AI response based on keywords (PT + UA)
        let response = '';
        const lowerMessage = message.toLowerCase();
        
        console.log(`💬 Chat received: "${message}" | lowercase: "${lowerMessage}"`);
        
        // SEARCH IN REGULATIONS DATABASE FIRST
        // Check if question contains Portuguese technical terms from regulations
        let foundInRegulations = null;
        for (const reg of portugueseRegulations.regulations) {
            if (reg.inspection_points) {
                for (const point of reg.inspection_points) {
                    // Check if message contains keywords from regulation
                    const keywords = [
                        point.requirement?.toLowerCase(),
                        point.description?.toLowerCase(),
                        point.client_explanation?.toLowerCase()
                    ].filter(Boolean).join(' ');
                    
                    // Extract key terms
                    const terms = ['caixa', 'porta', 'fechadura', 'patamar', 'cabina', 'proteção', 
                                   'dispositivo', 'segurança', 'motor', 'cabo', 'guia', 'freio', 'travagem',
                                   'para-quedas', 'paraquedas', 'limitador', 'velocidade', 'iluminação',
                                   'ventilação', 'alarme', 'telefone', 'sobrecarga', 'carga', 'amortecedor'];
                    
                    for (const term of terms) {
                        if (lowerMessage.includes(term) && keywords.includes(term)) {
                            foundInRegulations = {
                                regulation: `${reg.number} (${reg.date.split('-')[0]})`,
                                title: reg.title,
                                article: point.article,
                                requirement: point.requirement,
                                description: point.description,
                                explanation: point.client_explanation,
                                violations: point.common_violations || []
                            };
                            break;
                        }
                    }
                    if (foundInRegulations) break;
                }
            }
            if (foundInRegulations) break;
        }
        
        // If found in regulations database, use that
        if (foundInRegulations) {
            response = `📖 ${foundInRegulations.article} - Decreto ${foundInRegulations.regulation}\n` +
                      `${foundInRegulations.title}\n\n` +
                      `**${foundInRegulations.requirement}**\n\n` +
                      `${foundInRegulations.description}\n\n` +
                      `💡 Explicação / Пояснення:\n${foundInRegulations.explanation}\n\n`;
            
            if (foundInRegulations.violations.length > 0) {
                response += `⚠️ Violações comuns / Типові порушення:\n` +
                           foundInRegulations.violations.map(v => `🔴 ${v}`).join('\n');
            }
        }
        // Otherwise use manual responses below
        // CABOS E POLIAS / ТРОСИ ТА ШКІВИ
        else if (lowerMessage.includes('cabo') || lowerMessage.includes('трос') || 
            lowerMessage.includes('polia') || lowerMessage.includes('шків') ||
            lowerMessage.includes('suspensão') || lowerMessage.includes('підвіс')) {
            response = `⚙️ Cabos e polias / Троси та шківи:\n\n` +
                      `Requisitos / Вимоги:\n` +
                      `• Mínimo 2 cabos independentes / Мінімум 2 незалежні троси\n` +
                      `• Diâmetro conforme carga / Діаметр згідно навантаження\n` +
                      `• Coeficiente de segurança ≥12 / Коефіцієнт безпеки ≥12\n` +
                      `• Inspeção mensal obrigatória / Огляд щомісяця обов'язковий\n\n` +
                      `📖 Regulamento: Artigo 32.º - Decreto 513/70\n\n` +
                      `⚠️ Violações críticas C1:\n` +
                      `🔴 Cabos com fios partidos >10% / Троси з обривами >10%\n` +
                      `🔴 Desgaste >10% do diâmetro / Знос >10% діаметра\n` +
                      `🔴 Oxidação severa / Сильна корозія\n` +
                      `🔴 Polias desgastadas/rachadas / Шківи зношені/тріснуті\n\n` +
                      `🔧 Substituição: cada 4-6 anos ou quando desgastados\n` +
                      `   Заміна: кожні 4-6 років або при зносі`;
        }
        // MOTOR E FREIO / МОТОР І ГАЛЬМА
        else if (lowerMessage.includes('motor') || lowerMessage.includes('мотор') ||
                 lowerMessage.includes('freio') || lowerMessage.includes('travão') ||
                 lowerMessage.includes('гальм') || lowerMessage.includes('freno')) {
            response = `🔧 Motor e sistema de travagem / Мотор і гальмівна система:\n\n` +
                      `Componentes essenciais / Основні компоненти:\n` +
                      `• Motor elétrico (tração) / Електродвигун (тяга)\n` +
                      `• Freio eletromagnético / Електромагнітне гальмо\n` +
                      `• Redutor de velocidade / Редуктор швидкості\n` +
                      `• Sistema de emergência / Система аварійна\n\n` +
                      `📖 Regulamento: Artigo 28.º - Decreto 513/70\n\n` +
                      `⚠️ Violações críticas C1:\n` +
                      `🔴 Freio não funciona automaticamente / Гальмо не спрацьовує автоматично\n` +
                      `🔴 Motor sem proteção térmica / Мотор без термозахисту\n` +
                      `🔴 Ruído excessivo (>80dB) / Надмірний шум (>80дБ)\n` +
                      `🔴 Aquecimento anormal / Аномальне нагрівання\n\n` +
                      `🔧 Manutenção: lubrificação mensal, verificação trimestral\n` +
                      `   Обслуговування: мастило щомісяця, перевірка щокварталу`;
        }
        // PARA-QUEDAS / ПАРАШУТ
        else if (lowerMessage.includes('para-quedas') || lowerMessage.includes('paraquedas') ||
                 lowerMessage.includes('парашут') || lowerMessage.includes('limitador')) {
            response = `🪂 Para-quedas de segurança / Парашут безпеки:\n\n` +
                      `Função / Функція:\n` +
                      `Bloqueia cabine se velocidade >115% nominal\n` +
                      `Блокує кабіну якщо швидкість >115% номінальної\n\n` +
                      `Componentes / Компоненти:\n` +
                      `• Limitador de velocidade / Обмежувач швидкості\n` +
                      `• Cunhas de travamento / Клини блокування\n` +
                      `• Cabo de acionamento / Трос приводу\n` +
                      `• Sistema de gatilho / Система тригера\n\n` +
                      `📖 Regulamento: Artigo 37.º - Decreto 513/70\n\n` +
                      `⚠️ Violações críticas C1:\n` +
                      `🔴 Para-quedas ausente / Відсутній парашут\n` +
                      `🔴 Não testado nos últimos 5 anos / Не випробуваний 5 років\n` +
                      `🔴 Cabo do limitador partido / Трос обмежувача обірваний\n` +
                      `🔴 Cunhas desgastadas / Клини зношені\n\n` +
                      `🧪 Teste obrigatório: cada 5 anos por entidade certificada\n` +
                      `   Випробування: кожні 5 років сертифікованою організацією`;
        }
        // ILUMINAÇÃO / ОСВІТЛЕННЯ
        else if (lowerMessage.includes('iluminação') || lowerMessage.includes('luz') ||
                 lowerMessage.includes('освітлен') || lowerMessage.includes('світл') ||
                 lowerMessage.includes('emergência')) {
            response = `💡 Iluminação e emergência / Освітлення та аварійне:\n\n` +
                      `Requisitos / Вимоги:\n` +
                      `• Iluminação normal: ≥50 lux / Нормальне: ≥50 люкс\n` +
                      `• Luz de emergência: ≥5 lux / Аварійне: ≥5 люкс\n` +
                      `• Autonomia bateria: ≥1 hora / Автономія: ≥1 год\n` +
                      `• Ativação automática / Автоматичне увімкнення\n\n` +
                      `📖 Regulamento: Artigo 46.º - Decreto 513/70\n\n` +
                      `⚠️ Violações:\n` +
                      `🟠 C2: Luz emergência não funciona / Аварійне не працює\n` +
                      `🟠 C2: Iluminação <50 lux / Освітлення <50 люкс\n` +
                      `🟡 C3: Lâmpadas queimadas / Лампи перегоріли\n\n` +
                      `🔧 Verificação: teste mensal de luz emergência\n` +
                      `   Перевірка: тест аварійного світла щомісяця`;
        }
        // CASA DE MÁQUINAS / МАШИННЕ ВІДДІЛЕННЯ
        else if (lowerMessage.includes('casa de máquinas') || lowerMessage.includes('casa máquinas') ||
                 lowerMessage.includes('машинн') || lowerMessage.includes('sala motor')) {
            response = `🏠 Casa de máquinas / Машинне відділення:\n\n` +
                      `Requisitos / Вимоги:\n` +
                      `• Acesso exclusivo pessoal autorizado / Доступ лише персоналу\n` +
                      `• Iluminação adequada (≥200 lux) / Освітлення (≥200 люкс)\n` +
                      `• Ventilação natural/forçada / Вентиляція природна/примусова\n` +
                      `• Altura mínima 2m / Мінімальна висота 2м\n` +
                      `• Extintor de incêndios / Вогнегасник\n\n` +
                      `📖 Regulamento: Artigo 51.º - Decreto 513/70\n\n` +
                      `⚠️ Violações:\n` +
                      `🟠 C2: Acesso não seguro / Небезпечний доступ\n` +
                      `🟠 C2: Sem extintor / Без вогнегасника\n` +
                      `🟠 C2: Ventilação insuficiente / Недостатня вентиляція\n` +
                      `🟡 C3: Sujidade excessiva / Надмірне забруднення\n\n` +
                      `🧹 Limpeza: mensal, organização permanente\n` +
                      `   Прибирання: щомісяця, постійний порядок`;
        }
        // BOTÕES E PAINEL / КНОПКИ ТА ПАНЕЛЬ
        else if (lowerMessage.includes('botão') || lowerMessage.includes('botões') ||
                 lowerMessage.includes('кнопк') || lowerMessage.includes('painel') ||
                 lowerMessage.includes('botoeira') || lowerMessage.includes('панель')) {
            response = `🔘 Botões e painéis / Кнопки та панелі:\n\n` +
                      `Requisitos / Вимоги:\n` +
                      `• Altura: 0,90m - 1,35m / Висота: 0,90м - 1,35м\n` +
                      `• Botão alarme vermelho / Кнопка тривоги червона\n` +
                      `• Identificação em Braille / Ідентифікація Брайлем\n` +
                      `• Iluminação dos botões / Підсвітка кнопок\n` +
                      `• Números legíveis / Читабельні номери\n\n` +
                      `📖 Regulamento: Artigo 44.º - Decreto 513/70\n\n` +
                      `⚠️ Violações:\n` +
                      `🔴 C1: Botão alarme não funciona / Тривога не працює\n` +
                      `🟠 C2: Botões sem identificação / Без ідентифікації\n` +
                      `🟠 C2: Altura inadequada / Неправильна висота\n` +
                      `🟡 C3: Botões desgastados / Зношені кнопки\n\n` +
                      `♿ Acessibilidade: Braille obrigatório desde 2006\n` +
                      `   Доступність: Брайль обов'язковий з 2006`;
        }
        // AMORTECEDORES / АМОРТИЗАТОРИ
        else if (lowerMessage.includes('amortecedor') || lowerMessage.includes('buffer') ||
                 lowerMessage.includes('амортиз') || lowerMessage.includes('poço')) {
            response = `🛡️ Amortecedores e poço / Амортизатори та шахта:\n\n` +
                      `Componentes / Компоненти:\n` +
                      `• Amortecedores na base / Амортизатори в основі\n` +
                      `• Poço (fossa) mínimo 1,2m / Яма мінімум 1,2м\n` +
                      `• Drenagem de água / Дренаж води\n` +
                      `• Acesso para manutenção / Доступ для обслуговування\n\n` +
                      `📖 Regulamento: Artigo 34.º - Decreto 513/70\n\n` +
                      `⚠️ Violações:\n` +
                      `🔴 C1: Amortecedores ausentes / Відсутні амортизатори\n` +
                      `🔴 C1: Poço <1m profundidade / Яма <1м глибини\n` +
                      `🟠 C2: Água acumulada no poço / Вода в ямі\n` +
                      `🟠 C2: Amortecedores desgastados / Зношені амортизатори\n\n` +
                      `🔧 Verificação: visual mensal, teste anual\n` +
                      `   Перевірка: візуально щомісяця, тест щороку`;
        }
        // QUADRO ELÉTRICO / ЕЛЕКТРОЩИТ
        else if (lowerMessage.includes('quadro') || lowerMessage.includes('elétrico') ||
                 lowerMessage.includes('електр') || lowerMessage.includes('fusível') ||
                 lowerMessage.includes('disjuntor') || lowerMessage.includes('запобіжн')) {
            response = `⚡ Quadro elétrico / Електричний щит:\n\n` +
                      `Componentes / Компоненти:\n` +
                      `• Disjuntores principais / Головні автомати\n` +
                      `• Proteção diferencial 30mA / Диференційний захист 30мА\n` +
                      `• Fusíveis por circuito / Запобіжники по колах\n` +
                      `• Contactores de potência / Силові контактори\n` +
                      `• Terra de proteção / Захисне заземлення\n\n` +
                      `📖 Regulamento: Artigo 27.º - Decreto 513/70\n\n` +
                      `⚠️ Violações:\n` +
                      `🔴 C1: Sem proteção diferencial / Без диференційного захисту\n` +
                      `🔴 C1: Terra ausente/defeituosa / Відсутнє/несправне заземлення\n` +
                      `🟠 C2: Quadro sem identificação / Щит без маркування\n` +
                      `🟠 C2: Cabos expostos / Оголені кабелі\n\n` +
                      `🔧 Manutenção: inspeção trimestral, termografia anual\n` +
                      `   Обслуговування: огляд щоквартал, термографія щороку`;
        }
        // SOBRECARGA / ПЕРЕВАНТАЖЕННЯ
        else if (lowerMessage.includes('sobrecarga') || lowerMessage.includes('carga') ||
                 lowerMessage.includes('перевантаж') || lowerMessage.includes('peso') ||
                 lowerMessage.includes('capacidade') || lowerMessage.includes('kg')) {
            response = `⚖️ Sobrecarga e capacidade / Перевантаження та вантажність:\n\n` +
                      `Requisitos / Вимоги:\n` +
                      `• Placa de carga visível / Табличка вантажності видима\n` +
                      `• Alarme sonoro >110% / Звуковий сигнал >110%\n` +
                      `• Bloqueio portas >125% / Блокування дверей >125%\n` +
                      `• Pessoas: 80kg cada / Люди: 80кг кожен\n\n` +
                      `Exemplos / Приклади:\n` +
                      `• 450kg = 6 pessoas / 6 осіб\n` +
                      `• 630kg = 8 pessoas / 8 осіб\n` +
                      `• 1000kg = 13 pessoas / 13 осіб\n\n` +
                      `📖 Regulamento: Artigo 41.º - Decreto 513/70\n\n` +
                      `⚠️ Violações:\n` +
                      `🔴 C1: Sem alarme sobrecarga / Без сигналу перевантаження\n` +
                      `🟠 C2: Placa de carga ilegível / Табличка нечитабельна\n` +
                      `🟠 C2: Alarme não funciona / Сигнал не працює\n\n` +
                      `⚠️ NUNCA ultrapassar capacidade - risco colapso cabos!\n` +
                      `   НІКОЛИ не перевищувати вантажність - ризик обриву!`;
        }
        // TELEFONE/INTERFONE / ТЕЛЕФОН/ДОМОФОН
        else if (lowerMessage.includes('telefone') || lowerMessage.includes('interfone') ||
                 lowerMessage.includes('телефон') || lowerMessage.includes('домофон') ||
                 lowerMessage.includes('alarme') || lowerMessage.includes('тривог')) {
            response = `📞 Telefone e alarme / Телефон та тривога:\n\n` +
                      `Requisitos / Вимоги:\n` +
                      `• Comunicação bidirecional / Двостороннє спілкування\n` +
                      `• Funciona sem energia / Працює без електрики\n` +
                      `• Botão alarme vermelho / Кнопка червона\n` +
                      `• Ligação 24/7 à central / Зв'язок 24/7 з диспетчером\n` +
                      `• Identificação automática da cabine / Авто-ідентифікація кабіни\n\n` +
                      `📖 Regulamento: Artigo 48.º - Decreto 513/70\n\n` +
                      `⚠️ Violações:\n` +
                      `🔴 C1: Telefone não funciona / Телефон не працює\n` +
                      `🔴 C1: Sem resposta da central / Диспетчер не відповідає\n` +
                      `🟠 C2: Botão alarme defeituoso / Кнопка тривоги несправна\n` +
                      `🟠 C2: Comunicação intermitente / Переривчастий зв'язок\n\n` +
                      `🧪 Teste obrigatório: semanal (registro em livro)\n` +
                      `   Випробування: щотижня (запис у журналі)`;
        }
        // NIVELAMENTO / ВИРІВНЮВАННЯ
        else if (lowerMessage.includes('nivelamento') || lowerMessage.includes('nível') ||
                 lowerMessage.includes('вирівнюван') || lowerMessage.includes('рівн') ||
                 lowerMessage.includes('desnível')) {
            response = `📏 Nivelamento de portas / Вирівнювання дверей:\n\n` +
                      `Tolerância / Допуск:\n` +
                      `• Máximo: ±20mm (2cm) / Максимум: ±20мм (2см)\n` +
                      `• Ideal: ±10mm (1cm) / Ідеально: ±10мм (1см)\n` +
                      `• Precisão: ±5mm elevadores novos / Точність: ±5мм нові ліфти\n\n` +
                      `Causas desnivelamento / Причини нерівності:\n` +
                      `• Desgaste dos cabos / Знос тросів\n` +
                      `• Freio mal ajustado / Погано налаштоване гальмо\n` +
                      `• Encoder desregulado / Розрегульований енкодер\n` +
                      `• Variação de carga / Зміна навантаження\n\n` +
                      `📖 Regulamento: Artigo 42.º - Decreto 513/70\n\n` +
                      `⚠️ Violações:\n` +
                      `🔴 C1: Desnível >30mm / Нерівність >30мм\n` +
                      `🟠 C2: Desnível 20-30mm / Нерівність 20-30мм\n` +
                      `🟡 C3: Desnível 15-20mm / Нерівність 15-20мм\n\n` +
                      `🔧 Ajuste: regulação mensal, recalibração anual\n` +
                      `   Налаштування: регулювання щомісяця, калібрування щороку`;
        }
        // Check for door queries
        else if (lowerMessage.includes('porta') || lowerMessage.includes('batente') ||
            lowerMessage.includes('дверей') || lowerMessage.includes('двері') || 
            lowerMessage.includes('дверц') || lowerMessage.includes('fechadura')) {
            response = `🚪 Portas de elevador / Двері ліфта:\n\n` +
                      `Requisitos obrigatórios / Обов'язкові вимоги:\n` +
                      `✅ Fechamento automático / Автоматичне замикання\n` +
                      `✅ Sensores de segurança / Датчики безпеки\n` +
                      `✅ Não abrem fora do nível / Не відкриваються поза рівнем\n` +
                      `✅ Sistema de bloqueio / Система блокування\n\n` +
                      `📖 Regulamento: Artigo 23.º - Decreto 513/70\n\n` +
                      `⚠️ Violações críticas C1:\n` +
                      `🔴 Porta abre quando cabine está entre andares\n` +
                      `   Двері відкриваються між поверхами\n` +
                      `🔴 Fechadura mecânica defeituosa\n` +
                      `   Механічний замок несправний\n` +
                      `🔴 Sem sensores de reencravamento\n` +
                      `   Без датчиків повторного замикання\n` +
                      `🔴 Possível forçar abertura manualmente\n` +
                      `   Можна відкрити силою\n\n` +
                      `💡 Batente de porta: deve ter proteção anti-esmagamento\n` +
                      `   Дверний косяк: має бути захист від защемлення`;
        }
        // Check for regulations queries
        else if (lowerMessage.includes('regulament') || lowerMessage.includes('lei') || 
            lowerMessage.includes('norma') || lowerMessage.includes('artigo') ||
            lowerMessage.includes('закон') || lowerMessage.includes('регламент') ||
            lowerMessage.includes('норм') || lowerMessage.includes('правил') ||
            lowerMessage.includes('decreto')) {
            
            // Search for specific article if mentioned
            let specificArticle = null;
            const articleMatch = lowerMessage.match(/artigo?\s*(\d+)/i) || lowerMessage.match(/art\.?\s*(\d+)/i);
            
            if (articleMatch) {
                const articleNum = articleMatch[1];
                // Search in regulations database
                for (const reg of portugueseRegulations.regulations) {
                    if (reg.inspection_points) {
                        const point = reg.inspection_points.find(p => 
                            p.article && p.article.includes(articleNum)
                        );
                        if (point) {
                            specificArticle = {
                                regulation: `${reg.number} - ${reg.title}`,
                                article: point.article,
                                requirement: point.requirement,
                                description: point.description,
                                explanation: point.client_explanation,
                                violations: point.common_violations
                            };
                            break;
                        }
                    }
                }
            }
            
            if (specificArticle) {
                response = `📖 ${specificArticle.article} - ${specificArticle.regulation}\n\n` +
                          `**${specificArticle.requirement}**\n\n` +
                          `${specificArticle.description}\n\n` +
                          `💡 Para clientes / Для клієнтів:\n${specificArticle.explanation}\n\n` +
                          `⚠️ Violações comuns / Типові порушення:\n` +
                          specificArticle.violations.map(v => `❌ ${v}`).join('\n');
            } else {
                // General response with all regulations
                const regList = portugueseRegulations.regulations.map(r => 
                    `• **${r.number}** (${r.date.split('-')[0]}) - ${r.title}`
                ).join('\n');
                
                response = `📚 Regulamentação portuguesa / Португальські регламенти:\n\n` +
                          `Total de ${portugueseRegulations.regulations.length} regulamentos na base:\n\n` +
                          `${regList}\n\n` +
                          `📖 Base de dados atualizada: ${portugueseRegulations.metadata.last_updated}\n\n` +
                          `💡 Para pesquisar artigo específico, pergunte:\n` +
                          `"Artigo 23 decreto 513" ou "art 14"\n` +
                          `Для пошуку конкретної статті запитайте:\n` +
                          `"Artigo 23" або "art 14"`;
            }
        }
        // Check for inspection queries
        else if (lowerMessage.includes('inspe') || lowerMessage.includes('vistoria') ||
                 lowerMessage.includes('інспекц') || lowerMessage.includes('перевір') ||
                 lowerMessage.includes('огляд')) {
            response = `🔍 Sobre inspeções / Про інспекції:\n\n` +
                      `As inspeções periódicas são obrigatórias:\n` +
                      `Періодичні інспекції обов'язкові:\n` +
                      `• Elevadores novos / Нові ліфти: 6 meses / через 6 місяців\n` +
                      `• Elevadores existentes / Існуючі: Anual / Щорічно\n` +
                      `• Elevadores antigos (>15 anos) / Старі (>15 років): Semestral / Раз на півроку\n\n` +
                      `O que é verificado / Що перевіряється:\n` +
                      `✓ Dispositivos de segurança / Пристрої безпеки\n` +
                      `✓ Estado das portas / Стан дверей\n` +
                      `✓ Sistema de travagem / Система гальмування\n` +
                      `✓ Cabos e polias / Троси та ролики\n` +
                      `✓ Documentação técnica / Технічна документація`;
        }
        // Check for safety queries
        else if (lowerMessage.includes('segur') || lowerMessage.includes('acident') || 
                 lowerMessage.includes('risco') || lowerMessage.includes('безпек') ||
                 lowerMessage.includes('небезпек') || lowerMessage.includes('ризик') ||
                 lowerMessage.includes('аварі')) {
            response = `⚠️ Sobre segurança / Про безпеку:\n\n` +
                      `Principais riscos / Головні ризики:\n` +
                      `🔴 Críticos / Критичні (C1):\n` +
                      `• Portas sem sensores / Двері без датчиків безпеки\n` +
                      `• Sistema de travagem deficiente / Дефектна система гальмування\n` +
                      `• Ausência de pára-quedas / Відсутність парашута\n\n` +
                      `🟠 Moderados / Середні (C2):\n` +
                      `• Manutenção atrasada / Прострочене обслуговування\n` +
                      `• Documentação incompleta / Неповна документація\n` +
                      `• Iluminação inadequada / Недостатнє освітлення\n\n` +
                      `🟡 Leves / Легкі (C3):\n` +
                      `• Sinalização faltando / Відсутня сигналізація\n` +
                      `• Pequenos desgastes / Незначний знос`;
        }
        // Check for maintenance queries
        else if (lowerMessage.includes('manutenç') || lowerMessage.includes('manutençao') ||
                 lowerMessage.includes('обслуго') || lowerMessage.includes('обслужив') ||
                 lowerMessage.includes('ремонт') || lowerMessage.includes('то ')) {
            response = `🔧 Sobre manutenção / Про обслуговування:\n\n` +
                      `Manutenção preventiva obrigatória:\n` +
                      `Профілактичне обслуговування обов'язкове:\n` +
                      `• Frequência / Частота: Mensal / Щомісяця\n` +
                      `• Empresa / Компанія: Certificada / Сертифікована\n` +
                      `• Documentação / Документація: Registo obrigatório / Обов'язковий реєстр\n\n` +
                      `Itens verificados / Що перевіряється:\n` +
                      `✓ Lubrificação / Мастило компонентів\n` +
                      `✓ Ajuste de portas / Налаштування дверей\n` +
                      `✓ Teste de segurança / Тест пристроїв безпеки\n` +
                      `✓ Verificação de cabos / Перевірка тросів\n` +
                      `✓ Limpeza casa de máquinas / Чистка машинного відділення`;
        }
        // Check for ventilation queries
        else if (lowerMessage.includes('ventil') || lowerMessage.includes('вентиляц') ||
                 lowerMessage.includes('повітр') || lowerMessage.includes('провітр')) {
            response = `🌬️ Sobre ventilação / Про вентиляцію:\n\n` +
                      `Requisitos / Вимоги:\n` +
                      `• Mínimo 1% da área da cabine\n` +
                      `  Мінімум 1% від площі кабіни\n` +
                      `• Ventilação natural ou forçada\n` +
                      `  Природна або примусова вентиляція\n` +
                      `• Grelhas não devem estar bloqueadas\n` +
                      `  Гратки не повинні бути заблоковані\n\n` +
                      `📖 Regulamento / Регламент: Artigo 45.º - Decreto 513/70\n\n` +
                      `Violações comuns / Типові порушення:\n` +
                      `❌ Ventilação bloqueada / Заблокована\n` +
                      `❌ Grelhas ausentes / Відсутні гратки\n` +
                      `❌ Área <1% / Площа <1%`;
        }
        // Check for emergency/stuck queries
        else if (lowerMessage.includes('зупини') || lowerMessage.includes('застря') ||
                 lowerMessage.includes('аварій') || lowerMessage.includes('між поверх') ||
                 lowerMessage.includes('parad') || lowerMessage.includes('pres')) {
            response = `🆘 Se o elevador parar / Якщо ліфт зупинився:\n\n` +
                      `1️⃣ Pressione o botão de alarme 🔔 / Натисніть кнопку тривоги\n` +
                      `2️⃣ Ligue para o operador (número na placa) / Зателефонуйте диспетчеру\n` +
                      `3️⃣ NÃO tente sair sozinho! / НЕ намагайтесь вийти самостійно!\n` +
                      `4️⃣ Mantenha a calma - há ventilação / Зберігайте спокій - є вентиляція\n` +
                      `5️⃣ Aguarde o técnico / Чекайте на техніка\n\n` +
                      `⏱️ Tempo máximo de espera / Максимальний час: 30 minutos / хвилин\n\n` +
                      `❌ PROIBIDO / ЗАБОРОНЕНО:\n` +
                      `• Forçar portas / Відкривати двері силою\n` +
                      `• Sair pelo teto / Вилазити через люк\n` +
                      `• Pular na cabine / Стрибати в кабіні`;
        }
        // Check for documents queries
        else if (lowerMessage.includes('document') || lowerMessage.includes('докумен') ||
                 lowerMessage.includes('папер') || lowerMessage.includes('які потрібн')) {
            response = `📄 Documentos para inspeção / Документи для інспекції:\n\n` +
                      `Documentos obrigatórios / Обов'язкові документи:\n` +
                      `✓ Passaporte técnico / Технічний паспорт ліфта\n` +
                      `✓ Livro de registos de manutenção / Книга реєстрації обслуговування\n` +
                      `✓ Certificados de componentes de segurança / Сертифікати безпеки\n` +
                      `✓ Relatórios de inspeções anteriores / Попередні звіти інспекцій\n` +
                      `✓ Contrato de manutenção / Договір на обслуговування\n` +
                      `✓ Protocolos de testes / Протоколи випробувань\n\n` +
                      `📖 Regulamento / Регламент: Artigo 62.º - Decreto 513/70\n\n` +
                      `⚠️ Sem estes documentos a inspeção pode ser recusada!\n` +
                      `Без цих документів інспекція може відмовити!`;
        }
        // Check for deadline/time queries
        else if (lowerMessage.includes('термін') || lowerMessage.includes('скільки часу') ||
                 lowerMessage.includes('коли') || lowerMessage.includes('prazo') ||
                 lowerMessage.includes('c1') || lowerMessage.includes('c2') || lowerMessage.includes('c3')) {
            response = `⏰ Prazos de correção / Терміни усунення порушень:\n\n` +
                      `🔴 C1 - Críticos / Критичні:\n` +
                      `• Prazo / Термін: IMEDIATO / НЕГАЙНО\n` +
                      `• Ação / Дія: Parar operação / Зупинити експлуатацію\n` +
                      `• Consequências / Наслідки: Multa + responsabilidade criminal\n` +
                      `  Штраф + кримінальна відповідальність\n\n` +
                      `🟠 C2 - Moderados / Середні:\n` +
                      `• Prazo / Термін: 30 dias / днів\n` +
                      `• Ação / Дія: Corrigir até próxima inspeção / До наступної інспекції\n\n` +
                      `🟡 C3 - Leves / Легкі:\n` +
                      `• Prazo / Термін: 90 dias / днів\n` +
                      `• Ação / Дія: Corrigir quando possível / Виправити при можливості\n\n` +
                      `📖 Fonte / Джерело: Decreto 320/2002`;
        }
        // Check for cost queries
        else if (lowerMessage.includes('custo') || lowerMessage.includes('preço') || 
                 lowerMessage.includes('valor') || lowerMessage.includes('ціна') ||
                 lowerMessage.includes('вартість') || lowerMessage.includes('скільки коштує')) {
            response = `💰 Custos estimados / Орієнтовна вартість:\n\n` +
                      `Manutenção regular / Регулярне обслуговування:\n` +
                      `• Mensal / Щомісяця: €50-150\n` +
                      `• Anual / Щорічно: €600-1.800\n\n` +
                      `Inspeções / Інспекції:\n` +
                      `• Inspeção periódica / Планова: €150-300\n` +
                      `• Inspeção extraordinária / Позапланова: €200-400\n\n` +
                      `Reparações comuns / Типові ремонти:\n` +
                      `• Troca de portas / Заміна дверей: €500-2.000\n` +
                      `• Sistema de segurança / Система безпеки: €1.000-5.000\n` +
                      `• Modernização completa / Повна модернізація: €15.000-40.000`;
        }
        // GUIAS E SAPATAS / НАПРАВЛЯЮЧІ ТА ЧЕРЕВИКИ
        else if (lowerMessage.includes('guia') || lowerMessage.includes('направля') ||
                 lowerMessage.includes('sapata') || lowerMessage.includes('черевик') ||
                 lowerMessage.includes('corrediça')) {
            response = `🛤️ Guias e sapatas / Направляючі та черевики:\n\n` +
                      `Componentes / Компоненти:\n` +
                      `• Guias metálicas verticais / Металеві вертикальні направляючі\n` +
                      `• Sapatas deslizantes / Ковзні черевики\n` +
                      `• Roletes de guiamento / Ролики керування\n` +
                      `• Lubrificação das guias / Мастило направляючих\n\n` +
                      `📖 Regulamento: Artigo 33.º - Decreto 513/70\n\n` +
                      `⚠️ Violações:\n` +
                      `🔴 C1: Guias deformadas/tortas / Направляючі деформовані\n` +
                      `🟠 C2: Sapatas desgastadas >50% / Черевики зношені >50%\n` +
                      `🟠 C2: Sem lubrificação / Без мастила\n` +
                      `🟡 C3: Ruído excessivo / Надмірний шум\n\n` +
                      `🔧 Lubrificação: mensal, inspeção trimestral\n` +
                      `   Мастило: щомісяця, огляд щокварталу`;
        }
        // CONTRAPESO / ПРОТИВАГА
        else if (lowerMessage.includes('contrapeso') || lowerMessage.includes('противаг') ||
                 lowerMessage.includes('balanceamento')) {
            response = `⚖️ Contrapeso / Противага:\n\n` +
                      `Função / Функція:\n` +
                      `Balanceia peso da cabine + 40-50% carga\n` +
                      `Балансує вагу кабіни + 40-50% навантаження\n\n` +
                      `Requisitos / Вимоги:\n` +
                      `• Massa calculada precisamente / Маса розрахована точно\n` +
                      `• Blocos fixos com segurança / Блоки надійно закріплені\n` +
                      `• Cabos independentes / Незалежні троси\n` +
                      `• Proteção contra queda / Захист від падіння\n\n` +
                      `📖 Regulamento: Artigo 35.º - Decreto 513/70\n\n` +
                      `⚠️ Violações:\n` +
                      `🔴 C1: Blocos soltos / Блоки розкріплені\n` +
                      `🔴 C1: Cabos com desgaste / Троси зношені\n` +
                      `🟠 C2: Balanceamento incorreto / Невірне балансування\n\n` +
                      `🔧 Verificação: inspeção visual mensal\n` +
                      `   Перевірка: візуальний огляд щомісяця`;
        }
        // SENSOR / ДАТЧИК
        else if (lowerMessage.includes('sensor') || lowerMessage.includes('датчик') ||
                 lowerMessage.includes('fotocélula') || lowerMessage.includes('фотоелемент')) {
            response = `👁️ Sensores de segurança / Датчики безпеки:\n\n` +
                      `Tipos / Типи:\n` +
                      `• Fotocélulas nas portas / Фотоелементи на дверях\n` +
                      `• Sensor de sobrecarga / Датчик перевантаження\n` +
                      `• Sensor de velocidade / Датчик швидкості\n` +
                      `• Sensores de posição / Датчики положення\n` +
                      `• Detector de fumaça / Детектор диму\n\n` +
                      `📖 Regulamento: Artigo 40.º - Decreto 513/70\n\n` +
                      `⚠️ Violações:\n` +
                      `🔴 C1: Fotocélulas não funcionam / Фотоелементи не працюють\n` +
                      `🔴 C1: Sensor sobrecarga ausente / Датчик перевантаження відсутній\n` +
                      `🟠 C2: Sensores sujos/desalinhados / Датчики брудні/не вирівняні\n\n` +
                      `🧪 Teste: semanal (fotocélulas), mensal (outros)\n` +
                      `   Випробування: щотижня (фотоелементи), щомісяця (інші)`;
        }
        // VELOCIDADE / ШВИДКІСТЬ
        else if (lowerMessage.includes('velocidade') || lowerMessage.includes('швидкість') ||
                 lowerMessage.includes('rápido') || lowerMessage.includes('lento') ||
                 lowerMessage.includes('m/s')) {
            response = `🚀 Velocidade do elevador / Швидкість ліфта:\n\n` +
                      `Categorias / Категорії:\n` +
                      `• Lento: 0,5-1,0 m/s / Повільний: 0,5-1,0 м/с\n` +
                      `• Normal: 1,0-2,5 m/s / Нормальний: 1,0-2,5 м/с\n` +
                      `• Rápido: 2,5-6,0 m/s / Швидкий: 2,5-6,0 м/с\n` +
                      `• Alta velocidade: >6,0 m/s / Висока швидкість: >6,0 м/с\n\n` +
                      `Limites / Обмеження:\n` +
                      `• Residencial: máx 1,6 m/s / Житловий: макс 1,6 м/с\n` +
                      `• Comercial: máx 4,0 m/s / Комерційний: макс 4,0 м/с\n\n` +
                      `📖 Regulamento: Artigo 29.º - Decreto 513/70\n\n` +
                      `⚠️ Problemas:\n` +
                      `• Velocidade irregular → verificar motor/encoder\n` +
                      `  Нерівномірна швидкість → перевірити мотор/енкодер\n` +
                      `• Muito rápido → perigo! Ajustar limitador\n` +
                      `  Занадто швидко → небезпека! Налаштувати обмежувач`;
        }
        // MODERNIZAÇÃO / МОДЕРНІЗАЦІЯ
        else if (lowerMessage.includes('modernização') || lowerMessage.includes('модерніз') ||
                 lowerMessage.includes('atualização') || lowerMessage.includes('оновлен') ||
                 lowerMessage.includes('retrofit')) {
            response = `🔄 Modernização de elevadores / Модернізація ліфтів:\n\n` +
                      `Quando necessário / Коли потрібно:\n` +
                      `• Elevador >20 anos / Ліфт >20 років\n` +
                      `• Peças descontinuadas / Запчастини знятті з виробництва\n` +
                      `• Múltiplas falhas C1 / Багато порушень C1\n` +
                      `• Consumo energético alto / Високе споживання енергії\n\n` +
                      `Componentes modernizados / Модернізовані компоненти:\n` +
                      `• Motor inversor (economia 40%) / Інверторний двигун (економія 40%)\n` +
                      `• Painel touchscreen / Панель сенсорна\n` +
                      `• Portas automáticas / Автоматичні двері\n` +
                      `• LED iluminação / LED освітлення\n` +
                      `• Sistema segurança digital / Цифрова система безпеки\n\n` +
                      `💰 Custo / Вартість:\n` +
                      `• Parcial: €8.000-15.000 / Часткова\n` +
                      `• Completa: €20.000-50.000 / Повна\n\n` +
                      `⏱️ Prazo: 2-4 semanas / Термін: 2-4 тижні`;
        }
        // RUÍDO / ШУМ
        else if (lowerMessage.includes('ruído') || lowerMessage.includes('barulho') ||
                 lowerMessage.includes('шум') || lowerMessage.includes('som') ||
                 lowerMessage.includes('vibração')) {
            response = `🔊 Ruído e vibrações / Шум та вібрації:\n\n` +
                      `Limites legais / Законні обмеження:\n` +
                      `• Cabine em movimento: <55 dB / Кабіна в русі: <55 дБ\n` +
                      `• Casa de máquinas: <75 dB / Машинне відділення: <75 дБ\n` +
                      `• Período noturno (22h-7h): <40 dB / Нічний період: <40 дБ\n\n` +
                      `Causas comuns / Поширені причини:\n` +
                      `• Guias desalinhadas / Направляючі не вирівняні\n` +
                      `• Rolamentos desgastados / Підшипники зношені\n` +
                      `• Motor desbalanceado / Мотор розбалансований\n` +
                      `• Falta de lubrificação / Відсутнє мастило\n\n` +
                      `📖 Regulamento: Artigo 52.º - Decreto 513/70\n\n` +
                      `⚠️ Ação:\n` +
                      `🟠 C2: Ruído >65 dB / Шум >65 дБ\n` +
                      `🟡 C3: Ruído 55-65 dB / Шум 55-65 дБ\n\n` +
                      `🔧 Solução: lubrificação, alinhamento, substituição peças\n` +
                      `   Рішення: мастило, вирівнювання, заміна деталей`;
        }
        // CERTIFICADO / СЕРТИФІКАТ
        else if (lowerMessage.includes('certificado') || lowerMessage.includes('сертифікат') ||
                 lowerMessage.includes('licença') || lowerMessage.includes('ліцензі') ||
                 lowerMessage.includes('homologação')) {
            response = `📜 Certificados e licenças / Сертифікати та ліцензії:\n\n` +
                      `Documentos obrigatórios / Обов'язкові документи:\n` +
                      `• Livro de Registo / Книга реєстрації (sempre na cabine / завжди в кабіні)\n` +
                      `• Certificado de conformidade / Сертифікат відповідності\n` +
                      `• Relatório inspeção periódica / Звіт періодичної інспекції\n` +
                      `• Certificados componentes segurança / Сертифікати безпеки\n` +
                      `• Contrato manutenção válido / Договір обслуговування дійсний\n\n` +
                      `📖 Regulamento: Artigo 62.º - Decreto 513/70\n\n` +
                      `Renovações / Поновлення:\n` +
                      `• Inspeção periódica: anual / Періодична інспекція: щорічно\n` +
                      `• Teste para-quedas: 5 anos / Випробування парашута: 5 років\n` +
                      `• Manutenção: mensal / Обслуговування: щомісяця\n\n` +
                      `⚠️ Sem documentos válidos:\n` +
                      `🔴 Proibido usar elevador! / Заборонено користуватись ліфтом!\n\n` +
                      `💰 Multas: €500-5.000 por falta documentação\n` +
                      `   Штрафи: €500-5.000 за відсутність документів`;
        }
        // Default helpful response (PT + UA)
        else {
            response = `👋 Olá! Sou o assistente DeapSeaK. / Вітаю! Я AI Асистент DeapSeaK.\n\n` +
                      `Posso ajudar com / Можу допомогти з:\n` +
                      `📚 Regulamentação portuguesa / Португальські регламенти\n` +
                      `🔍 Informações sobre inspeções / Інформація про інспекції\n` +
                      `⚠️ Questões de segurança / Питання безпеки\n` +
                      `🔧 Manutenção preventiva / Профілактичне обслуговування\n` +
                      `💰 Estimativas de custos / Орієнтовна вартість\n\n` +
                      `Sua pergunta / Ваше питання: "${message}"\n\n` +
                      `💡 Pergunte sobre / Запитайте про:\n` +
                      `🚪 Portas e batentes / Двері та косяки\n` +
                      `⚙️ Cabos, polias, motor / Троси, шківи, мотор\n` +
                      `🪂 Para-quedas, freios / Парашут, гальма\n` +
                      `💡 Iluminação, ventilação / Освітлення, вентиляція\n` +
                      `📞 Telefone, alarme / Телефон, тривога\n` +
                      `⚖️ Sobrecarga, nivelamento / Перевантаження, вирівнювання\n` +
                      `🔊 Ruído, vibrações / Шум, вібрації\n` +
                      `🔧 Manutenção, modernização / Обслуговування, модернізація\n` +
                      `📜 Certificados, documentos / Сертифікати, документи\n` +
                      `💰 Custos e prazos / Вартість та терміни`;
        }

        res.json({
            success: true,
            data: {
                response,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ AI chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar mensagem'
        });
    }
});

// AI Consult endpoint (alias for chat for legal questions)
app.post('/api/ai/consult', authenticateToken, async (req, res) => {
    try {
        const { question } = req.body;
        
        if (!question) {
            return res.status(400).json({
                success: false,
                message: 'Question is required'
            });
        }

        console.log('⚖️ Legal consult:', question, 'from', req.user.username);

        // Use same logic as chat
        let answer = '';
        const lowerQuestion = question.toLowerCase();

        // Legal-specific responses
        if (lowerQuestion.includes('responsabilid') || lowerQuestion.includes('culpa')) {
            answer = `⚖️ Responsabilidades Legais:\n\n` +
                    `O proprietário do elevador é legalmente responsável por:\n` +
                    `• Manutenção regular (mensal)\n` +
                    `• Inspeções periódicas obrigatórias\n` +
                    `• Documentação técnica atualizada\n` +
                    `• Segurança dos utilizadores\n\n` +
                    `Em caso de acidente:\n` +
                    `🔴 Responsabilidade Civil - Indemnizações\n` +
                    `🔴 Responsabilidade Criminal - Se houver negligência\n` +
                    `🔴 Coimas Administrativas - €500 a €50.000\n\n` +
                    `Recomendação: Manter seguro de responsabilidade civil.`;
        }
        else if (lowerQuestion.includes('coima') || lowerQuestion.includes('multa') || 
                 lowerQuestion.includes('penalid')) {
            answer = `💰 Coimas e Penalidades:\n\n` +
                    `Não conformidades C1 (Críticas):\n` +
                    `• Coima: €5.000 - €50.000\n` +
                    `• Interdição imediata do elevador\n` +
                    `• Possível processo criminal\n\n` +
                    `Não conformidades C2 (Moderadas):\n` +
                    `• Coima: €500 - €5.000\n` +
                    `• Prazo para correção: 30 dias\n\n` +
                    `Não conformidades C3 (Leves):\n` +
                    `• Advertência ou coima: €100 - €500\n` +
                    `• Prazo para correção: 90 dias\n\n` +
                    `Falta de inspeção:\n` +
                    `• Coima: €1.000 - €10.000\n` +
                    `• Elevador pode ser interditado`;
        }
        else if (lowerQuestion.includes('prazo') || lowerQuestion.includes('tempo')) {
            answer = `⏰ Prazos Legais:\n\n` +
                    `Inspeções:\n` +
                    `• Elevadores novos: 6 meses após instalação\n` +
                    `• Elevadores normais: Anualmente\n` +
                    `• Elevadores >15 anos: Semestralmente\n\n` +
                    `Correções após inspeção:\n` +
                    `• C1 (Crítico): Imediato (0-7 dias)\n` +
                    `• C2 (Moderado): 30 dias\n` +
                    `• C3 (Leve): 90 dias\n\n` +
                    `Manutenção:\n` +
                    `• Preventiva: Mensal obrigatório\n` +
                    `• Registo: Manter por 5 anos`;
        }
        else {
            // Fallback to general AI chat response
            const chatResponse = await this.handleChatMessage(question);
            answer = chatResponse;
        }

        res.json({
            success: true,
            data: {
                answer,
                question,
                timestamp: new Date().toISOString(),
                sources: [
                    'Decreto-Lei 163/2006',
                    'Decreto 320/2002',
                    'Portaria 528/2008'
                ]
            }
        });

    } catch (error) {
        console.error('❌ AI consult error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar consulta'
        });
    }
});

// Get all regulations
app.get('/api/ai/regulations', authenticateToken, async (req, res) => {
    try {
        console.log('📚 Regulations request from', req.user.username);
        
        res.json({
            success: true,
            data: {
                regulations: portugueseRegulations.regulations,
                metadata: portugueseRegulations.metadata,
                total: portugueseRegulations.regulations.length
            }
        });
    } catch (error) {
        console.error('❌ Regulations error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar regulamentações'
        });
    }
});

// Search regulations
app.get('/api/ai/regulations/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query required'
            });
        }

        console.log('🔍 Regulation search:', q, 'from', req.user.username);

        const query = q.toLowerCase();
        const results = portugueseRegulations.regulations.filter(reg => {
            return reg.title.toLowerCase().includes(query) ||
                   reg.summary.toLowerCase().includes(query) ||
                   reg.number.toLowerCase().includes(query) ||
                   reg.scope.some(s => s.toLowerCase().includes(query));
        });

        res.json({
            success: true,
            data: {
                results,
                query: q,
                total: results.length
            }
        });

    } catch (error) {
        console.error('❌ Regulation search error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro na pesquisa'
        });
    }
});

// Get specific regulation by ID
app.get('/api/ai/regulations/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const regulation = portugueseRegulations.regulations.find(r => r.id === id);
        
        if (!regulation) {
            return res.status(404).json({
                success: false,
                message: 'Regulamento não encontrado'
            });
        }

        res.json({
            success: true,
            data: regulation
        });

    } catch (error) {
        console.error('❌ Regulation fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar regulamento'
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