// ═══════════════════════════════════════════════════════════
// UNIFIED SERVER - FestLift v2
// ═══════════════════════════════════════════════════════════
// ⚠️ ВАЖЛИВО: Один сервер для Frontend + API + WebSocket
// ⚠️ ФІКСОВАНИЙ ПОРТ: 5000 (НІКОЛИ НЕ ЗМІНЮЙТЕ БЕЗ ЗАПИТУ!)
// ═══════════════════════════════════════════════════════════

require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs').promises;
const https = require('https');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize'); // 🔐 NoSQL injection protection

// 🤖 Google Gemini AI
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 📧 Email Service (Brevo SMTP)
const emailService = require('./backend/services/emailService');

const app = express();
app.set('trust proxy', 1); // Довіряємо проксі (Codespaces / nginx)

// ═══════════════════════════════════════════════════════════
// 🌍 GEOCODING - Конвертація адреси в координати
// ═══════════════════════════════════════════════════════════
// Використовує OpenStreetMap Nominatim API (безкоштовно)
async function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        // Формуємо адресу для запиту
        let searchAddress = '';
        if (typeof address === 'string') {
            searchAddress = address;
        } else if (typeof address === 'object' && address !== null) {
            // Об'єкт адреси: {street, city, zipCode, country}
            const parts = [
                address.street,
                address.zipCode,
                address.city,
                address.country
            ].filter(Boolean);
            searchAddress = parts.join(', ');
        }
        
        if (!searchAddress) {
            console.warn('⚠️ Geocoding: порожня адреса');
            return resolve(null);
        }
        
        // URL для Nominatim API
        const encodedAddress = encodeURIComponent(searchAddress);
        const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;
        
        console.log('🌍 Geocoding:', searchAddress);
        
        https.get(url, {
            headers: {
                'User-Agent': 'FestLift-LiftManagement/2.0'
            }
        }, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const results = JSON.parse(data);
                    
                    if (results && results.length > 0) {
                        const lat = parseFloat(results[0].lat);
                        const lon = parseFloat(results[0].lon);
                        
                        // 🏙️ Витягуємо назву міста з Nominatim address даних
                        let cityName = '';
                        if (results[0].address) {
                            const nom = results[0].address;
                            cityName = nom.city || nom.town || nom.village || nom.municipality || nom.county || '';
                        }
                        
                        console.log(`✅ Geocoded: ${searchAddress} → [${lon}, ${lat}] city: ${cityName}`);
                        
                        resolve({
                            type: 'Point',
                            coordinates: [lon, lat], // GeoJSON формат: [longitude, latitude]
                            city: cityName           // 🏙️ Місто для автозаповнення address.city
                        });
                    } else {
                        console.warn('⚠️ Geocoding: адреса не знайдена:', searchAddress);
                        resolve(null);
                    }
                } catch (error) {
                    console.error('❌ Geocoding parse error:', error);
                    resolve(null);
                }
            });
        }).on('error', (error) => {
            console.error('❌ Geocoding request error:', error);
            resolve(null); // Не блокуємо створення ліфта якщо геокодування не спрацювало
        });
    });
}
// ═══════════════════════════════════════════════════════════
// ⚠️ КРИТИЧНО: ФІКСОВАНИЙ ПОРТ 5000 - НЕ ЗМІНЮЙТЕ!
// ═══════════════════════════════════════════════════════════
const PORT = parseInt(process.env.DEAPSEAK_PORT || '5000', 10);
console.log(`🔧 Налаштування порту: DEAPSEAK_PORT=${process.env.DEAPSEAK_PORT}, final PORT=${PORT}`);

// 🔐 Helmet - HTTP security headers (XSS, clickjacking, sniffing, etc.)
app.use(helmet({
    contentSecurityPolicy: false, // Вимкнено бо AdminLTE CDN inline-scripts
    crossOriginEmbedderPolicy: false
}));

// 🔐 Rate Limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 хвилин
    max: 5,                    // max 5 спроб входу за 15 хв (захист від брутфорсу)
    message: { success: false, message: 'Забагато спроб входу. Спробуйте через 15 хвилин.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Рахуємо тільки невдалі спроби
});
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 хвилина
    max: 30,             // max 30 AI-запитів на хвилину
    message: { success: false, message: 'Забагато запитів до AI. Зачекайте хвилину.' }
});
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,            // 300 запитів/хв для загального API
    message: { success: false, message: 'Забагато запитів. Зачекайте хвилину.' }
});

// Middleware - CORS
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true); // Postman/curl
        if (!isProduction) return callback(null, true); // dev - дозволяємо все
        // Production: тільки явно дозволені origins або festlift.pt домени
        const allowed = allowedOrigins.length > 0
            ? allowedOrigins.some(o => origin.startsWith(o.trim()))
            : (origin.includes('localhost') || origin.includes('127.0.0.1') ||
               origin.includes('github.dev') || origin.includes('app.github.dev') ||
               origin.includes('festlift.pt'));
        callback(allowed ? null : new Error('CORS: Origin not allowed'), allowed);
    },
    credentials: true
}));
app.use(express.json({ limit: '2mb' }));  // 🔐 Reduced from 10mb to limit DoS
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(mongoSanitize()); // 🔐 Strip $ and . from user input (NoSQL injection protection)

// General rate limit для всіх API запитів
app.use('/api/', generalLimiter);

// MongoDB підключення
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'deapseak';
let db;
let mongoClient;

// Async функція для підключення до MongoDB
async function connectMongo() {
    try {
        mongoClient = await MongoClient.connect(MONGODB_URI);
        db = mongoClient.db(DB_NAME);
        console.log('✅ MongoDB connected:', MONGODB_URI, 'DB:', DB_NAME);
        return db;
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        throw err;
    }
}

// Підключаємося при старті
connectMongo();

// Mongoose підключення (для backend/routes що використовують Mongoose моделі)
// Якщо MONGODB_URI вже містить ім'я БД — не додаємо DB_NAME повторно
const mongooseURI = new URL(MONGODB_URI).pathname.length > 1
    ? MONGODB_URI
    : `${MONGODB_URI}/${DB_NAME}`;
mongoose.connect(mongooseURI).then(() => {
    console.log('✅ Mongoose connected:', mongooseURI);
}).catch(err => {
    console.error('❌ Mongoose connection error:', err);
});

// JWT secret
if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ FATAL: JWT_SECRET не встановлений у .env! Сервер зупиниться.');
        process.exit(1);
    } else {
        console.warn('⚠️  УВАГА: JWT_SECRET не встановлений у .env! Використовується небезпечний fallback. НЕ для production!');
    }
}
const JWT_SECRET = process.env.JWT_SECRET || 'deapseak_secret_key_2024';

// API маршрути
app.get('/api/health', async (req, res) => {
    try {
        // Перевіряємо MongoDB
        let mongoStatus = 'disconnected';
        if (db) {
            await db.command({ ping: 1 });
            mongoStatus = 'connected';
        }
        
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            port: PORT,
            mode: 'unified',
            mongodb: mongoStatus,
            version: '2.0.0'
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            mongodb: 'error',
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════
// 🌍 GEOCODING PROXY — сервер звертається до Nominatim
//    (уникає CORS та проблем з User-Agent у браузері)
// ═══════════════════════════════════════════════════════════
app.get('/api/geocode', async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ success: false, message: 'Параметр q обовʼязковий' });

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=3&countrycodes=pt`;
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'FestLift-LiftManagement/2.0 (info@festlift.pt)',
                'Accept-Language': 'pt,en'
            }
        });
        if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
        const data = await response.json();
        if (!data || data.length === 0) {
            return res.json({ success: false, message: 'Адресу не знайдено' });
        }
        const best = data[0];
        return res.json({
            success: true,
            lat: parseFloat(best.lat),
            lng: parseFloat(best.lon),
            display: best.display_name
        });
    } catch (err) {
        console.error('❌ /api/geocode error:', err.message);
        return res.status(502).json({ success: false, message: 'Помилка геокодування: ' + err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// 🔐 AUTH ENDPOINTS - ВИДАЛЕНО, використовуємо backend/routes/authRoutes.js
// ═══════════════════════════════════════════════════════════
// ПРИМІТКА: Всі auth endpoints (login, register, profile, logout, refresh)
// тепер обробляються через backend/routes/authRoutes.js
// Старі inline endpoints видалені для уникнення конфліктів

// ═══════════════════════════════════════════════════════════
// 🔔 NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

// GET all notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const notifications = await db.collection('notifications')
            .find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();
        
        res.json({ success: true, notifications: notifications || [] });
    } catch (error) {
        console.error('❌ Помилка отримання сповіщень:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const { ObjectId } = require('mongodb');
        await db.collection('notifications').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { read: true, readAt: new Date() } }
        );
        
        res.json({ success: true, message: 'Сповіщення позначено як прочитане' });
    } catch (error) {
        console.error('❌ Помилка оновлення сповіщення:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// ═══════════════════════════════════════════════════════════
// 📊 QR CODE HISTORY
// ═══════════════════════════════════════════════════════════

// GET all QR codes with filtering and pagination
app.get('/api/qr/codes', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }

        const { page = 1, limit = 20, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // QR коди генеруємо з ліфтів — кожен ліфт має рівно один QR код
        const liftFilter = {};
        if (status === 'inactive') liftFilter.status = { $ne: 'operational' };
        else if (status === 'active') liftFilter.status = 'operational';

        const lifts = await db.collection('lifts').find(liftFilter).toArray();
        const total = lifts.length;

        // Будуємо унікальний код ліфта — єдиний формат для всіх панелей
        const qrCodes = lifts.slice(skip, skip + parseInt(limit)).map(lift => {
            const munNum = lift.municipalNumber || '';
            const storedQR = lift.qrCode || null;
            const code = typeof storedQR === 'object' && storedQR?.code
                ? storedQR.code
                : (typeof storedQR === 'string' && storedQR
                    ? storedQR
                    : (munNum
                        ? `LIFT-${munNum.toUpperCase().replace(/\s+/g, '-')}`
                        : `LIFT-${lift._id.toString().slice(-6).toUpperCase()}`));
            const addr = lift.address;
            const addrStr = typeof addr === 'object' && addr
                ? [addr.street, addr.city].filter(Boolean).join(', ')
                : (typeof addr === 'string' ? addr : '');
            return {
                id: lift._id.toString(),
                liftId: lift._id.toString(),
                code,
                address: addrStr,
                municipalNumber: munNum,
                liftType: lift.type || 'passenger',
                status: lift.status === 'operational' ? 'active' : 'inactive',
                created: lift.createdAt || lift._id.getTimestamp?.() || null,
                name: lift.name || addrStr
            };
        });

        res.json({
            success: true,
            data: qrCodes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('❌ Помилка отримання QR кодів:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// GET QR code by ID
app.get('/api/qr/codes/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const { ObjectId } = require('mongodb');
        const qrCode = await db.collection('qr_scans').findOne({ _id: new ObjectId(req.params.id) });
        
        if (!qrCode) {
            return res.status(404).json({ success: false, message: 'QR код не знайдено' });
        }
        
        res.json({ success: true, data: qrCode });
    } catch (error) {
        console.error('❌ Помилка отримання QR коду:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// POST create new QR code
app.post('/api/qr/codes', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const qrCodeData = {
            ...req.body,
            createdBy: req.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('qr_scans').insertOne(qrCodeData);
        qrCodeData._id = result.insertedId;
        
        res.json({ success: true, message: 'QR код створено', data: qrCodeData });
    } catch (error) {
        console.error('❌ Помилка створення QR коду:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// PUT update QR code
app.put('/api/qr/codes/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const { ObjectId } = require('mongodb');
        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };
        
        const result = await db.collection('qr_scans').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'QR код не знайдено' });
        }
        
        res.json({ success: true, message: 'QR код оновлено' });
    } catch (error) {
        console.error('❌ Помилка оновлення QR коду:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// DELETE QR code
app.delete('/api/qr/codes/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const { ObjectId } = require('mongodb');
        const result = await db.collection('qr_scans').deleteOne({ _id: new ObjectId(req.params.id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'QR код не знайдено' });
        }
        
        res.json({ success: true, message: 'QR код видалено' });
    } catch (error) {
        console.error('❌ Помилка видалення QR коду:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// GET QR scan history
app.get('/api/qr/history', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const history = await db.collection('qr_scans')
            .find({})
            .sort({ scannedAt: -1 })
            .limit(100)
            .toArray();
        
        res.json({ success: true, data: history || [] });
    } catch (error) {
        console.error('❌ Помилка отримання історії QR:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// POST QR scan
app.post('/api/qr/scan', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const { qrCode, liftId, action } = req.body;
        
        const scan = {
            qrCode,
            liftId,
            action: action || 'scan',
            userId: req.user.id,
            username: req.user.username,
            scannedAt: new Date()
        };
        
        await db.collection('qr_scans').insertOne(scan);
        
        res.json({ success: true, message: 'QR код відскановано', data: scan });
    } catch (error) {
        console.error('❌ Помилка запису QR скану:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// GET QR statistics
app.get('/api/qr/stats', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        
        // Загальна кількість QR кодів
        const total = await db.collection('lifts').countDocuments({});

        // Статус QR кодів — з ліфтів
        const active   = await db.collection('lifts').countDocuments({ status: 'operational' });
        const inactive = total - active;
        const expired  = 0;

        // Скани за період (залишається реальна статистика)
        const scansToday = await db.collection('qr_scans').countDocuments({
            scannedAt: { $gte: today }
        });

        const scansLastMonth = await db.collection('qr_scans').countDocuments({
            scannedAt: { $gte: lastMonth }
        });

        const stats = {
            total,
            status: {
                active,
                inactive,
                expired
            },
            scans: {
                today: scansToday,
                lastMonth: scansLastMonth
            }
        };
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('❌ Помилка отримання статистики QR:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// ═══════════════════════════════════════════════════════════
// � KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════

// GET /api/knowledge-base - список статей бази знань
app.get('/api/knowledge-base', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        const articles = await db.collection('knowledge_base')
            .find({})
            .sort({ updatedDate: -1 })
            .toArray();
        res.json(articles);
    } catch (error) {
        console.error('❌ Помилка отримання бази знань:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// POST /api/knowledge-base - додати статтю
app.post('/api/knowledge-base', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        const article = { ...req.body, createdAt: new Date(), updatedAt: new Date() };
        const result = await db.collection('knowledge_base').insertOne(article);
        res.status(201).json({ success: true, id: result.insertedId });
    } catch (error) {
        console.error('❌ Помилка створення статті:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// �📋 INSPECTIONS
// ═══════════════════════════════════════════════════════════

// GET all inspections
app.get('/api/inspections', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const inspections = await db.collection('inspections')
            .find({})
            .sort({ scheduledDate: -1 })
            .toArray();
        
        res.json({ success: true, data: inspections || [] });
    } catch (error) {
        console.error('❌ Помилка отримання інспекцій:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// GET inspection by ID
app.get('/api/inspections/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const { ObjectId } = require('mongodb');
        const inspection = await db.collection('inspections')
            .findOne({ _id: new ObjectId(req.params.id) });
        
        if (!inspection) {
            return res.status(404).json({ success: false, message: 'Інспекцію не знайдено' });
        }
        
        res.json({ success: true, data: inspection });
    } catch (error) {
        console.error('❌ Помилка отримання інспекції:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// ═══════════════════════════════════════════════════════════
// 📝 TASKS
// ═══════════════════════════════════════════════════════════

// GET all tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        let query = {};
        // Техніки бачать тільки свої завдання
        if (req.user.role === 'tech') {
            query.assignedTo = req.user.id;
        }
        
        const tasks = await db.collection('tasks')
            .find(query)
            .sort({ dueDate: 1, priority: -1 })
            .toArray();
        
        res.json({ success: true, data: tasks || [] });
    } catch (error) {
        console.error('❌ Помилка отримання завдань:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// GET task by ID
app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const { ObjectId } = require('mongodb');
        const task = await db.collection('tasks')
            .findOne({ _id: new ObjectId(req.params.id) });
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Завдання не знайдено' });
        }
        
        res.json({ success: true, data: task });
    } catch (error) {
        console.error('❌ Помилка отримання завдання:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// ═══════════════════════════════════════════════════════════
// 📊 STATISTICS & DASHBOARD
// ═══════════════════════════════════════════════════════════

// GET statistics
app.get('/api/statistics', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const [liftsCount, usersCount, requestsCount, tasksCount] = await Promise.all([
            db.collection('lifts').countDocuments(),
            db.collection('users').countDocuments(),
            db.collection('requests').countDocuments(),
            db.collection('tasks').countDocuments()
        ]);
        
        // Ліфти за статусом
        const liftsByStatus = await db.collection('lifts').aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).toArray();
        
        // Заявки за статусом
        const requestsByStatus = await db.collection('requests').aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).toArray();
        
        res.json({
            success: true,
            data: {
                lifts: liftsCount,
                users: usersCount,
                requests: requestsCount,
                tasks: tasksCount,
                liftsByStatus: liftsByStatus.reduce((acc, item) => {
                    acc[item._id || 'unknown'] = item.count;
                    return acc;
                }, {}),
                requestsByStatus: requestsByStatus.reduce((acc, item) => {
                    acc[item._id || 'unknown'] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('❌ Помилка отримання статистики:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// 🆕 PUBLIC dashboard stats (без авторизації для швидкого перегляду)
app.get('/api/dashboard/public', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const [usersCount, liftsCount, requestsCount] = await Promise.all([
            db.collection('users').countDocuments(),
            db.collection('lifts').countDocuments(),
            db.collection('requests').countDocuments({ status: { $ne: 'completed' } })
        ]);
        
        res.json({
            success: true,
            data: {
                totalUsers: usersCount,
                totalLifts: liftsCount,
                activeRequests: requestsCount,
                totalRevenue: 0
            }
        });
    } catch (error) {
        console.error('❌ Помилка public dashboard:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// GET dashboard data
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'База даних недоступна' });
        }
        
        const role = req.user.role;
        
        // Базова статистика для всіх
        const [liftsCount, requestsCount, usersCount] = await Promise.all([
            db.collection('lifts').countDocuments(),
            db.collection('requests').countDocuments({ status: { $ne: 'completed' } }),
            db.collection('users').countDocuments()
        ]);
        
        // Останні заявки
        const recentRequests = await db.collection('requests')
            .find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray();
        
        // Ліфти що потребують уваги
        const liftsNeedingAttention = await db.collection('lifts')
            .find({ status: { $in: ['maintenance', 'out_of_service'] } })
            .limit(10)
            .toArray();
        
        res.json({
            success: true,
            data: {
                totalUsers: usersCount,
                totalLifts: liftsCount,
                activeRequests: requestsCount,
                recentRequests,
                liftsNeedingAttention,
                role
            }
        });
    } catch (error) {
        console.error('❌ Помилка отримання dashboard:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// Отримання профілю поточного користувача
app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
        console.log('👤 Запит профілю для користувача:', req.user);
        
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'База даних недоступна'
            });
        }

        const users = db.collection('users');
        const { ObjectId } = require('mongodb');
        
        const user = await users.findOne({ _id: new ObjectId(req.user.id) });

        if (!user) {
            console.log('❌ Користувач не знайдений в БД:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'Користувач не знайдений'
            });
        }

        console.log('✅ Профіль знайдено:', user.username);

        // Повертаємо профіль без пароля
        // Видаляємо пароль, але залишаємо tempPasswordHint для власного профілю
        const { password, ...userProfile } = user;
        
        res.json({
            ...userProfile,
            id: user._id.toString()
        });

    } catch (error) {
        console.error('❌ Помилка завантаження профілю:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка завантаження профілю'
        });
    }
});

// PUT /api/users/me - клієнт оновлює власний профіль
app.put('/api/users/me', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const userId = new ObjectId(req.user.id);

        const allowed = ['firstName', 'lastName', 'phone', 'company', 'address', 'city', 'region', 'zip'];
        const updateData = { updatedAt: new Date() };
        for (const field of allowed) {
            if (req.body[field] !== undefined) updateData[field] = req.body[field];
        }

        await db.collection('users').updateOne({ _id: userId }, { $set: updateData });
        const updated = await db.collection('users').findOne({ _id: userId }, { projection: { password: 0 } });
        console.log('✅ Профіль оновлено:', req.user.email);
        res.json({ ...updated, id: updated._id.toString() });
    } catch (error) {
        console.error('❌ Помилка оновлення профілю:', error);
        res.status(500).json({ success: false, message: 'Помилка оновлення профілю' });
    }
});

// Middleware для перевірки токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    // 🔐 SECURITY: query param ?token видалено — токени в URL потрапляють в логи та history
    const token = (authHeader && authHeader.split(' ')[1]) ||
                  req.headers['x-auth-token'] ||
                  req.cookies?.auth_token;

    // Auth token extracted — no debug log (security)

    if (!token) {
        console.log('❌ Токен не надано');
        return res.status(401).json({
            success: false,
            message: 'Токен авторизації не надано'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('❌ JWT verify error:', err.message); // server-side only
            return res.status(403).json({
                success: false,
                message: 'Невалідний або прострочений токен'
            });
        }
        console.log('✅ Token valid, user:', user.username);
        req.user = user;
        next();
    });
}

// 🔒 Role-gate middleware — використовуйте як requireRole('admin') або requireRole('admin','dispatcher')
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            console.warn(`⛔ Access denied: ${req.user?.role || 'unknown'} tried ${req.method} ${req.path}`);
            return res.status(403).json({
                success: false,
                message: 'Доступ заборонено. Недостатньо прав.'
            });
        }
        next();
    };
}

// 🔒 ObjectId validation helper
function isValidObjectId(id) {
    const { ObjectId } = require('mongodb');
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
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
        const allowed = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Allowed file types: PDF, JPG, PNG'));
        }
    }
});

// PDF Parser Service - ПОКРАЩЕНА ВЕРСІЯ (з автоматичним визначенням типу)
const pdfParserEnhanced = require('./services/pdf-parser-enhanced');
const { parseBureauVeritasPDF } = require('./services/pdf-parser-bureau-veritas');
const pdfParse = require('pdf-parse');

// Universal PDF Parser - автоматично визначає тип звіту
async function parseInspectionReport(filePath) {
    try {
        // Читаємо першу сторінку для визначення типу
        const buffer = await fs.readFile(filePath);
        const partialPDF = await pdfParse(buffer, { max: 1 });
        const text = partialPDF.text;
        
        // Визначаємо тип звіту
        if (text.includes('BUREAU VERITAS') || /(?:NB|DT)\d{4}-\d{4}/.test(text)) {
            console.log('📋 Detected: Bureau Veritas report - using specialized parser');
            return await parseBureauVeritasPDF(filePath);
        } else {
            console.log('📋 Using: Generic enhanced parser');
            return await pdfParserEnhanced.parsePDF(filePath);
        }
    } catch (error) {
        console.error('❌ Error in universal parser:', error);
        // Fallback to enhanced parser
        return await pdfParserEnhanced.parsePDF(filePath);
    }
}

// Cleanup helper
async function cleanupFile(filePath) {
    try {
        await fs.unlink(filePath);
        console.log('🗑️ Cleaned up file:', filePath);
    } catch (error) {
        console.error('⚠️ Could not delete file:', error.message);
    }
}

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

        // Parse PDF and extract analysis using universal parser
        console.log('🔍 Starting PDF analysis...');
        const result = await parseInspectionReport(req.file.path);
        console.log('📊 Analysis result:', result.success ? 'Success' : 'Failed');
        
        if (result.success) {
            console.log('📋 Report type:', result.reportType || 'Unknown');
            console.log('📋 Violations found:', result.violations?.length || 0);
            console.log('📋 Status:', result.conclusion?.status || result.passed ? 'PASSED' : 'FAILED');
        }

        // Clean up the uploaded file
        await cleanupFile(req.file.path);

        if (result.success) {
            // Нормалізуємо відповідь для сумісності з frontend
            const violations = result.violations || result.analysis?.violations || [];
            const stats = result.stats || result.analysis?.stats || {
                total: violations.length,
                critical: violations.filter(v => v.classification === 'C1').length,
                medium: violations.filter(v => v.classification === 'C2').length,
                low: violations.filter(v => v.classification === 'C3').length
            };
            
            console.log('✅ PDF analysis completed:', violations.length, 'violations found');
            console.log('   C1:', stats.critical, 'C2:', stats.medium, 'C3:', stats.low);
            
            // Уніфікована структура відповіді
            const response = {
                success: true,
                analysis: {
                    reportType: result.reportType || 'unknown',
                    metadata: result.metadata || {},
                    violations: violations,
                    stats: stats,
                    conclusion: result.conclusion || {
                        approved: result.passed || false,
                        text: result.passed ? 'Aprovado' : 'Reprovado'
                    },
                    summary: stats,
                    passed: result.passed || (stats.critical === 0 && stats.medium === 0)
                }
            };
            
            // Додаємо витягнутий текст
            if (result.rawText) {
                response.extractedText = result.rawText;
                response.pageCount = result.pageCount || 0;
                console.log(`📝 Extracted text included: ${result.rawText.length} chars, ${result.pageCount} pages`);
            }
            
            // Повідомляємо frontend чи використовувався OCR (для попередження про якість)
            response.ocrUsed = result.ocrUsed || false;
            
            res.json(response);
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
            await cleanupFile(req.file.path).catch(() => {});
        }
        
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error during PDF processing'
        });
    }
});

// Portuguese Regulations Search API (public - no auth required)
app.get('/api/regulations', async (req, res) => {
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

// EN Standards (European Norms) API - Modern lift standards
app.get('/api/en-standards', authenticateToken, async (req, res) => {
    try {
        const { search, type } = req.query;
        
        const fs = require('fs');
        const standardsPath = path.join(__dirname, 'data', 'en-standards-lift-regulations.json');
        const standardsData = JSON.parse(fs.readFileSync(standardsPath, 'utf8'));
        
        if (!search && !type) {
            return res.json({
                success: true,
                data: standardsData.standards,
                metadata: standardsData.metadata,
                integration_notes: standardsData.integration_notes,
                summary: standardsData.summary_table,
                total: standardsData.standards.length
            });
        }
        
        let results = standardsData.standards;
        
        // Filter by type
        if (type) {
            const typeMap = {
                'new': ['NP_EN_81_20_2020', 'NP_EN_81_50_2020'],
                'modernization': ['NP_EN_81_80_2020'],
                'accessibility': ['NP_EN_81_70_2022'],
                'fire': ['NP_EN_81_72_2020', 'NP_EN_81_73_2020'],
                'special': ['NP_EN_81_71_2022', 'NP_EN_81_77_2020']
            };
            
            if (typeMap[type]) {
                results = results.filter(std => typeMap[type].includes(std.id));
            }
        }
        
        // Search in standards
        if (search) {
            const searchLower = search.toLowerCase();
            results = results.filter(std => {
                return (
                    (std.title && std.title.toLowerCase().includes(searchLower)) ||
                    (std.summary && std.summary.toLowerCase().includes(searchLower)) ||
                    (std.number && std.number.toLowerCase().includes(searchLower)) ||
                    (std.scope && std.scope.some(s => s.toLowerCase().includes(searchLower)))
                );
            });
        }
        
        res.json({
            success: true,
            data: results,
            query: search,
            type: type,
            total: results.length
        });
    } catch (error) {
        console.error('❌ EN Standards search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Захищені маршрути

// GET /api/lifts/stats - статистика ліфтів (МАЄ БУТИ ПЕРЕД /api/lifts/:id!)
app.get('/api/lifts/stats', authenticateToken, async (req, res) => {
    try {
        const liftsCollection = db.collection('lifts');
        
        const totalLifts = await liftsCollection.countDocuments();
        const activeLifts = await liftsCollection.countDocuments({ status: 'active' });
        const inactiveLifts = await liftsCollection.countDocuments({ status: 'inactive' });
        const maintenanceLifts = await liftsCollection.countDocuments({ status: 'maintenance' });
        
        // Статистика по муніципалітетам
        const municipalityStats = await liftsCollection.aggregate([
            { $match: { 'municipality.name': { $exists: true, $ne: null } } },
            { $group: { _id: '$municipality.name', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();
        
        res.json({
            success: true,
            data: {
                total: totalLifts,
                active: activeLifts,
                inactive: inactiveLifts,
                maintenance: maintenanceLifts,
                byMunicipality: municipalityStats
            }
        });
    } catch (error) {
        console.error('❌ Помилка отримання статистики ліфтів:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання статистики'
        });
    }
});

// GET /api/lifts/notifications - отримання статистики сповіщень
app.get('/api/lifts/notifications', authenticateToken, async (req, res) => {
    try {
        const liftsCollection = db.collection('lifts');
        const today = new Date();
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Ліфти з простроченою інспекцією
        const overdueInspections = await liftsCollection.countDocuments({
            nextInspectionDate: { $lt: today }
        });
        
        // Ліфти з інспекцією в найближчі 7 днів
        const urgentInspections = await liftsCollection.countDocuments({
            nextInspectionDate: { 
                $gte: today,
                $lte: sevenDaysFromNow
            }
        });
        
        // Ліфти з інспекцією в найближчі 30 днів
        const upcomingInspections = await liftsCollection.countDocuments({
            nextInspectionDate: { 
                $gte: today,
                $lte: thirtyDaysFromNow
            }
        });
        
        // Ліфти неактивні > 7 днів
        const longInactive = await liftsCollection.countDocuments({
            status: 'inactive',
            updatedAt: { $lt: sevenDaysAgo }
        });
        
        // Ліфти без контрактів
        const withoutContracts = await liftsCollection.countDocuments({
            $or: [
                { documents: { $exists: false } },
                { 'documents.type': { $ne: 'contract' } }
            ]
        });
        
        // Загальна кількість сповіщень
        const totalNotifications = overdueInspections + urgentInspections + longInactive;
        
        res.json({
            success: true,
            data: {
                total: totalNotifications,
                overdueInspections,
                urgentInspections,
                upcomingInspections,
                longInactive,
                withoutContracts
            }
        });
    } catch (error) {
        console.error('❌ Помилка отримання сповіщень:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання сповіщень'
        });
    }
});

app.get('/api/lifts', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        let query = {};
        
        // 🔐 ФІЛЬТРАЦІЯ ПО РОЛЯХ
        if (req.user.role === 'client') {
            // Клієнт бачить тільки свої ліфти (де він власник)
            // ⚠️ ВАЖЛИВО: client може бути string або ObjectId
            // В токені зберігається поле 'id', а не 'userId'
            const clientId = req.user.id || req.user.userId;
            if (!clientId) {
                console.error('❌ userId відсутній в токені:', req.user);
                return res.status(400).json({
                    success: false,
                    message: 'Некоректний токен користувача'
                });
            }
            // Шукаємо по обох форматах: string і ObjectId (сумісність з різними способами збереження)
            // + fallback по clientEmail (якщо акаунт пересоздано і ID змінився)
            let clientObjId = null;
            try { clientObjId = new ObjectId(clientId.toString()); } catch (e) { /* не валідний ObjectId */ }
            const clientEmail = req.user.email;
            const orConditions = clientObjId
                ? [{ client: clientId.toString() }, { client: clientObjId }, { 'client._id': clientId.toString() }, { 'client._id': clientObjId }]
                : [{ client: clientId.toString() }, { 'client._id': clientId.toString() }];
            if (clientEmail) orConditions.push({ clientEmail: clientEmail.toLowerCase() });
            query.$or = orConditions;
            console.log(`👤 Клієнт ${req.user.username} запитує свої ліфти (clientId: ${clientId}, email: ${clientEmail})`);
        } else if (req.user.role === 'technician') {
            // Технік бачить ліфти з призначених йому запитів
            const techId = req.user.id || req.user.userId;
            const requests = await db.collection('requests')
                .find({ 
                    technician: techId,
                    status: { $in: ['pending', 'in_progress', 'assigned'] }
                })
                .toArray();
            
            const liftIds = [...new Set(requests.map(r => r.liftId).filter(Boolean))];
            
            if (liftIds.length > 0) {
                query._id = { $in: liftIds.map(id => new ObjectId(id)) };
                console.log(`🔧 Технік ${req.user.username} запитує ${liftIds.length} ліфтів з активних завдань`);
            } else {
                // Якщо немає завдань, повертаємо порожній масив
                console.log(`🔧 Технік ${req.user.username} не має активних завдань`);
                return res.json({ success: true, data: [] });
            }
        } else if (req.user.role === 'admin' || req.user.role === 'dispatcher') {
            // Адмін і диспетчер бачать всі ліфти
            console.log(`👨‍💼 ${req.user.role} ${req.user.username} запитує всі ліфти`);
            
            // Додати фільтр по clientId якщо переданий
            if (req.query.clientId) {
                const { ObjectId: ObjId } = require('mongodb');
                const clientId = req.query.clientId.toString();
                const orConds = [
                    { client: clientId },
                    { 'client._id': clientId }
                ];
                try {
                    const cObjId = new ObjId(clientId);
                    orConds.push({ client: cObjId }, { 'client._id': cObjId });
                } catch(e) {}
                // Look up user to match by email/phone too
                try {
                    const ObjId2 = require('mongodb').ObjectId;
                    const cUser = await db.collection('users').findOne({ _id: new ObjId2(clientId) });
                    if (cUser?.email) orConds.push({ clientEmail: cUser.email.toLowerCase() });
                    if (cUser?.phone?.trim()) orConds.push({ clientPhone: cUser.phone });
                } catch(e) {}
                query.$or = orConds;
                console.log(`🔍 Фільтр по clientId: ${clientId} (${orConds.length} умов)`);
            }
        }
        
        const lifts = await db.collection('lifts').find(query).toArray();
        
        console.log(`✅ Знайдено ліфтів: ${lifts.length}`);
        
        // 🔄 Підтягуємо дані клієнтів для кожного ліфта
        const liftsWithClients = await Promise.all(lifts.map(async (lift) => {
            let client = null;

            // 1. Спробуємо знайти по ID
            if (lift.client) {
                try {
                    client = await db.collection('users').findOne({
                        _id: new ObjectId(lift.client.toString())
                    });
                } catch (err) {
                    // некоректний ObjectId — не критично
                }
            }

            // 2. Якщо по ID не знайшли — шукаємо по clientEmail (fallback для "осиротілих" ліфтів)
            if (!client && lift.clientEmail) {
                client = await db.collection('users').findOne({
                    email: lift.clientEmail.toLowerCase()
                });
                // Якщо знайшли по email — оновлюємо поле client в БД щоб виправити зв'язок
                if (client) {
                    db.collection('lifts').updateOne(
                        { _id: lift._id },
                        { $set: { client: client._id.toString() } }
                    ).catch(() => {});
                    console.log(`🔗 Зв'язок ліфта ${lift._id} з клієнтом ${client.email} відновлено по email`);
                }
            }

            return {
                ...lift,
                client: client ? {
                    _id: client._id,
                    email: client.email,
                    username: client.username,
                    firstName: client.firstName,
                    lastName: client.lastName,
                    phone: client.phone
                } : null
            };
        }));
        
        res.json({
            success: true,
            data: liftsWithClients
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
        // 🔐 ПЕРЕВІРКА ПРАВ - тільки admin/dispatcher можуть створювати ліфти
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            console.warn(`⚠️ ${req.user.role} ${req.user.username} намагається створити ліфт`);
            return res.status(403).json({
                success: false,
                message: 'Тільки адміністратор або диспетчер можуть створювати ліфти'
            });
        }
        
        // ✅ ВАЛІДАЦІЯ ОБОВ'ЯЗКОВИХ ПОЛІВ
        const validationErrors = [];
        
        // Перевірка municipalNumber
        if (!req.body.municipalNumber || req.body.municipalNumber.trim() === '') {
            validationErrors.push('Муніципальний номер обов\'язковий');
        }
        
        // Перевірка capacity (має бути додатним числом)
        if (req.body.capacity !== undefined) {
            const capacity = Number(req.body.capacity);
            if (isNaN(capacity) || capacity <= 0) {
                validationErrors.push('Вантажопідйомність має бути додатним числом');
            }
        }
        
        // Перевірка speed (має бути додатним числом)
        if (req.body.speed !== undefined) {
            const speed = Number(req.body.speed);
            if (isNaN(speed) || speed <= 0) {
                validationErrors.push('Швидкість має бути додатним числом');
            }
        }
        
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Помилка валідації',
                errors: validationErrors
            });
        }
        
        console.log('📝 POST /api/lifts - Отримані дані:', {
            clientName: req.body.clientName,
            clientEmail: req.body.clientEmail,
            clientPhone: req.body.clientPhone,
            intercomCode: req.body.intercomCode,
            contactPerson: req.body.contactPerson,
            address: req.body.address,
            location: req.body.location
        });
        
        // 🌍 ГЕОКОДУВАННЯ: конвертуємо адресу в координати
        let locationData = req.body.location;
        
        if (req.body.address) {
            console.log('🔍 Спроба геокодування адреси...');
            const geocodedLocation = await geocodeAddress(req.body.address);
            
            if (geocodedLocation) {
                locationData = geocodedLocation;
                console.log('✅ Використано геокодовані координати:', geocodedLocation.coordinates);
            } else if (!req.body.location || !req.body.location.coordinates) {
                console.warn('⚠️ Геокодування не вдалося і координати не надані вручну');
            }
        }
        
        // 🏷️ АВТОМАТИЧНА ГЕНЕРАЦІЯ QR КОДУ
        const municipalNumber = req.body.municipalNumber || '';
        const qrCode = municipalNumber 
            ? `LIFT-${municipalNumber.toUpperCase().replace(/\s+/g, '-')}` 
            : `LIFT-${Date.now().toString(36).toUpperCase()}`;
        
        console.log('🏷️ Згенеровано QR код:', qrCode);
        
        // 🏛️ АВТОМАТИЧНЕ ВИЗНАЧЕННЯ МУНІЦИПАЛІТЕТУ
        let municipalityData = null;
        
        // Спочатку перевіряємо чи є окреме поле postalCode (з форми)
        let postalCodeToCheck = req.body.postalCode;
        
        // Якщо окреме поле не заповнене - шукаємо в адресі
        if (!postalCodeToCheck && req.body.address) {
            // Якщо address - об'єкт, беремо postcode
            if (typeof req.body.address === 'object' && req.body.address.postcode) {
                postalCodeToCheck = req.body.address.postcode;
            } 
            // Якщо address - строка, шукаємо поштовий код в строці
            else if (typeof req.body.address === 'string') {
                const postalCodeMatch = req.body.address.match(/(\d{4})-?\d{3}/);
                if (postalCodeMatch) {
                    postalCodeToCheck = postalCodeMatch[1]; // Тільки перші 4 цифри
                }
            }
        }
        
        // Якщо postalCode має формат XXXX-XXX - витягуємо перші 4 цифри
        if (postalCodeToCheck && postalCodeToCheck.includes('-')) {
            postalCodeToCheck = postalCodeToCheck.split('-')[0];
        }
        
        if (postalCodeToCheck) {
            console.log('🏛️ Визначення муніципалітету за поштовим кодом:', postalCodeToCheck);
            try {
                // Завантажуємо базу муніципалітетів
                const fs = require('fs').promises;
                const municipalitiesData = JSON.parse(
                    await fs.readFile('./data/municipalities-lisboa-120km.json', 'utf8')
                );
                
                // Шукаємо відповідний муніципалітет (перші 4 цифри коду)
                const municipality = municipalitiesData.municipalities.find(m => 
                    m.postal_codes.some(code => code.startsWith(postalCodeToCheck))
                );
                
                if (municipality) {
                    municipalityData = {
                        id: municipality.id,
                        name: municipality.name,
                        distrito: municipality.distrito,
                        email: municipality.email,
                        phone: municipality.phone,
                        website: municipality.website,
                        distance_km: municipality.distance_km,
                        notified: false, // Буде встановлено в true після відправки email
                        notification_history: []
                    };
                    
                    console.log('✅ Визначено муніципалітет:', municipality.name);
                } else {
                    console.warn('⚠️ Муніципалітет не знайдено для поштового коду:', postalCodeToCheck);
                }
            } catch (error) {
                console.error('❌ Помилка визначення муніципалітету:', error);
            }
        } else {
            console.warn('⚠️ Поштовий код не знайдено ні в полі postalCode, ні в адресі');
        }
        
        // Підготовка даних для збереження
        const liftData = { ...req.body };
        
        // 📮 Перетворюємо postalCode в address.zipCode для сумісності з моделлю
        if (liftData.postalCode) {
            if (!liftData.address || typeof liftData.address === 'string') {
                // Якщо address - рядок, розбиваємо на структуру
                liftData.address = {
                    street: liftData.address || '',
                    city: '',
                    zipCode: liftData.postalCode,
                    country: 'Portugal'
                };
            } else {
                // Якщо address - об'єкт, додаємо zipCode
                liftData.address.zipCode = liftData.postalCode;
            }
            // Видаляємо окреме поле postalCode після копіювання
            delete liftData.postalCode;
        }
        
        // 🏙️ Якщо city порожній — заповнюємо з геокодування або муніципалітету
        if (liftData.address && typeof liftData.address === 'object' && !liftData.address.city) {
            if (locationData && locationData.city) {
                liftData.address.city = locationData.city;
                console.log('🏙️ City from geocoding:', locationData.city);
            } else if (municipalityData && municipalityData.name) {
                liftData.address.city = municipalityData.name;
                console.log('🏙️ City from municipality:', municipalityData.name);
            }
        }
        // Прибираємо city з locationData (це GeoJSON, там не потрібно)
        if (locationData && locationData.city) {
            locationData = { type: locationData.type, coordinates: locationData.coordinates };
        }
        
        // 🔍 ПЕРЕВІРКА: чи існує ліфт з таким municipalNumber?
        const { ObjectId } = require('mongodb');
        
        // Шукаємо існуючий ліфт за municipalNumber
        const existingLift = await db.collection('lifts').findOne({ 
            municipalNumber: liftData.municipalNumber 
        });
        
        let result;
        let message;
        
        if (existingLift) {
            // ♻️ ОНОВЛЕННЯ існуючого ліфта
            console.log('♻️ Оновлення існуючого ліфта:', existingLift._id);
            
            // Зберігаємо city якщо він вже є і новий порожній
            if (existingLift.address?.city && liftData.address && !liftData.address.city) {
                liftData.address.city = existingLift.address.city;
            }
            
            const updateData = {
                ...liftData,
                qrCode: existingLift.qrCode || qrCode, // Зберігаємо старий QR або створюємо новий
                location: locationData,
                municipality: municipalityData || existingLift.municipality,
                createdAt: existingLift.createdAt, // Зберігаємо оригінальну дату створення
                createdBy: existingLift.createdBy, // Зберігаємо оригінального автора
                updatedAt: new Date().toISOString(),
                updatedBy: req.user.username
            };
            
            await db.collection('lifts').updateOne(
                { _id: existingLift._id },
                { $set: updateData }
            );
            
            message = 'Ліфт оновлено успішно';
            result = {
                _id: existingLift._id,
                ...updateData
            };
        } else {
            // ➕ СТВОРЕННЯ нового ліфта
            console.log('➕ Створення нового ліфта з municipalNumber:', liftData.municipalNumber);
            
            const newLift = {
                ...liftData,
                qrCode: qrCode, // ✅ QR код генерується автоматично
                location: locationData, // Використовуємо геокодовані координати або ручні
                municipality: municipalityData, // 🏛️ Дані муніципалітету
                createdAt: new Date().toISOString(),
                createdBy: req.user.username,
                updatedAt: new Date().toISOString()
            };
            
            const insertResult = await db.collection('lifts').insertOne(newLift);
            
            message = 'Ліфт створено успішно';
            result = {
                _id: insertResult.insertedId,
                ...newLift
            };
        }
        
        // ─────────────────────────────────────────────────────
        // 👤 AUTO-CREATE CLIENT USER + надіслати запрошення
        // ─────────────────────────────────────────────────────
        let newClientInfo = null;
        const clientEmail = (liftData.clientEmail || '').trim().toLowerCase();

        if (clientEmail) {
            const existingClientUser = await db.collection('users').findOne({
                email: clientEmail
            });

            if (!existingClientUser) {
                // Генеруємо надійний пароль: 6 random digits + 2 uppercase + special
                const rawPassword =
                    Math.random().toString(36).slice(2, 6).toUpperCase() +
                    Math.floor(1000 + Math.random() * 9000) +
                    ['!', '@', '#', '$'][Math.floor(Math.random() * 4)];

                const hashedPassword = await bcrypt.hash(rawPassword, 10);

                const nameParts = (liftData.clientName || '').trim().split(/\s+/);
                const newClientDoc = {
                    email: clientEmail,
                    username: clientEmail.split('@')[0],
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' ') || '',
                    phone: liftData.clientPhone || '',
                    password: hashedPassword,
                    role: 'client',
                    isActive: true,
                    status: 'offline',
                    createdAt: new Date().toISOString(),
                    createdBy: req.user.username,
                    invitedFromLift: result._id ? String(result._id) : null
                };

                const insertedClient = await db.collection('users').insertOne(newClientDoc);

                // Прив'язуємо клієнта до ліфта (поле client = ObjectId)
                const { ObjectId: ObjId } = require('mongodb');
                await db.collection('lifts').updateOne(
                    { _id: result._id },
                    { $set: { client: insertedClient.insertedId } }
                );
                result.client = insertedClient.insertedId;

                newClientInfo = {
                    email: clientEmail,
                    password: rawPassword,
                    created: true
                };

                console.log(`👤 Новий клієнт створено автоматично: ${clientEmail} / пароль: ${rawPassword}`);

                // 📧 Відправляємо запрошення ТІЛЬКИ якщо адмін увімкнув цю опцію
                const shouldSendEmail = liftData.sendAccessEmail === true;

                if (shouldSendEmail) {
                    const siteBase = process.env.SITE_URL ||
                        `${req.protocol}://${req.headers.host}`;

                    // Знаходимо всі ліфти цього клієнта (включаючи щойно доданий)
                    const clientLifts = await db.collection('lifts').find({
                        $or: [
                            { clientEmail: clientEmail },
                            { 'clientEmail': clientEmail },
                            { client: insertedClient.insertedId }
                        ]
                    }).toArray();

                    const liftListHtml = clientLifts.length > 0
                        ? clientLifts.map(l => {
                            const addr = typeof l.address === 'object'
                                ? [l.address.street, l.address.zipCode, l.address.city].filter(Boolean).join(', ')
                                : (l.address || '—');
                            return `<div class="lift-box">🛗 <strong>Elevador:</strong> ${l.municipalNumber || '—'}<br>📍 <strong>Morada:</strong> ${addr}</div>`;
                          }).join('\n')
                        : `<div class="lift-box">🛗 <strong>Elevador registado:</strong> ${liftData.municipalNumber || '—'}<br>📍 <strong>Morada:</strong> ${typeof liftData.address === 'object' ? [liftData.address.street, liftData.address.zipCode, liftData.address.city].filter(Boolean).join(', ') : (liftData.address || '—')}</div>`;

                    const inviteHtml = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.12)}
  .header{background:linear-gradient(135deg,#1a237e,#1565c0);padding:32px 30px;text-align:center;color:#fff}
  .header h1{margin:0;font-size:26px;letter-spacing:1px}
  .header p{margin:6px 0 0;font-size:14px;opacity:.85}
  .body{padding:32px 30px}
  .body h2{color:#1a237e;font-size:20px;margin-top:0}
  .creds{background:#e8f0fe;border-left:4px solid #1565c0;border-radius:6px;padding:18px 22px;margin:20px 0}
  .creds p{margin:6px 0;font-size:15px}
  .creds strong{color:#1a237e}
  .creds code{background:#fff;padding:3px 8px;border-radius:4px;font-size:15px;letter-spacing:1px;border:1px solid #c5cae9}
  .btn{display:inline-block;background:#1565c0;color:#fff!important;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:bold;margin-top:20px}
  .footer{background:#f8f9fa;padding:18px 30px;text-align:center;font-size:12px;color:#888}
  .lift-box{background:#f0f4ff;border:1px solid #c5cae9;border-radius:6px;padding:14px 18px;margin:10px 0;font-size:14px}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🏢 FestLift</h1>
    <p>Plataforma de Gestão de Elevadores</p>
  </div>
  <div class="body">
    <h2>Bem-vindo(a)${newClientDoc.firstName ? ', ' + newClientDoc.firstName : ''}!</h2>
    <p>A sua empresa foi registada na plataforma <strong>FestLift</strong> como cliente de manutenção de elevadores.</p>
    <p>O seu acesso à plataforma foi criado automaticamente. Pode acompanhar o estado dos seus elevadores, consultar relatórios e criar pedidos de serviço.</p>

    ${liftListHtml}

    <div class="creds">
      <p>🔐 <strong>Os seus dados de acesso:</strong></p>
      <p><strong>Email:</strong> <code>${clientEmail}</code></p>
      <p><strong>Palavra-passe temporária:</strong> <code>${rawPassword}</code></p>
    </div>

    <p style="font-size:13px;color:#e53935;font-weight:bold">⚠️ Por razões de segurança, altere a sua palavra-passe após o primeiro login.</p>

    <a href="${siteBase}/pages/auth/login.html" class="btn">Entrar na plataforma →</a>
  </div>
  <div class="footer">
    FestLift Portugal &bull; Este email foi gerado automaticamente. Não responda a este endereço.
  </div>
</div>
</body>
</html>`;

                    try {
                        await emailService.sendEmail(
                            clientEmail,
                            '🏢 FestLift — Bem-vindo(a)! Os seus dados de acesso',
                            inviteHtml
                        );
                        console.log(`✅ Convite enviado para: ${clientEmail}`);
                        newClientInfo.emailSent = true;
                    } catch (emailErr) {
                        console.warn(`⚠️ Falha ao enviar convite para ${clientEmail}:`, emailErr.message);
                        newClientInfo.emailSent = false;
                        newClientInfo.emailError = emailErr.message;
                    }
                } else {
                    console.log(`📭 Convite NÃO enviado para ${clientEmail} (sendAccessEmail=false)`);
                    newClientInfo.emailSent = false;
                    newClientInfo.emailSkipped = true;
                }
            } else {
                // Utilizador já existe — só garante que o lift.client aponta para ele
                if (!result.client) {
                    const { ObjectId: ObjId } = require('mongodb');
                    await db.collection('lifts').updateOne(
                        { _id: result._id },
                        { $set: { client: existingClientUser._id } }
                    );
                    result.client = existingClientUser._id;
                }
                console.log(`ℹ️ Utilizador já existe para email ${clientEmail} — sem convite enviado`);
            }
        }
        // ─────────────────────────────────────────────────────

        res.json({
            success: true,
            message: message,
            data: result,
            newClient: newClientInfo
        });
    } catch (error) {
        console.error('❌ Помилка створення ліфта:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка створення ліфта'
        });
    }
});

app.get('/api/lifts/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        
        const lift = await db.collection('lifts').findOne({ _id: liftId });
        
        if (!lift) {
            return res.status(404).json({
                success: false,
                message: 'Ліфт не знайдено'
            });
        }
        
        // 🔄 Підтягуємо дані клієнта
        let liftWithClient = { ...lift };
        if (lift.client) {
            try {
                const client = await db.collection('users').findOne({
                    _id: new ObjectId(lift.client)
                });
                if (client) {
                    liftWithClient.client = {
                        _id: client._id,
                        email: client.email,
                        username: client.username,
                        firstName: client.firstName,
                        lastName: client.lastName,
                        phone: client.phone
                    };
                }
            } catch (err) {
                console.error(`⚠️ Не вдалося знайти клієнта ${lift.client}:`, err.message);
            }
        }
        
        // 🔐 ПЕРЕВІРКА ПРАВ ДОСТУПУ
        if (req.user.role === 'client' && lift.client !== req.user.id && lift.client !== req.user.userId) {
            console.warn(`⚠️ Клієнт ${req.user.username} намагається отримати чужий ліфт ${liftId}`);
            return res.status(403).json({
                success: false,
                message: 'Немає доступу до цього ліфта'
            });
        }
        
        if (req.user.role === 'technician') {
            // Перевіряємо чи є у техніка активний запит на цей ліфт
            const techId = req.user.id || req.user.userId;
            const hasAccess = await db.collection('requests').findOne({
                liftId: liftId.toString(),
                technician: techId,
                status: { $in: ['pending', 'in_progress', 'assigned'] }
            });
            
            if (!hasAccess) {
                console.warn(`⚠️ Технік ${req.user.username} намагається отримати ліфт ${liftId} без завдання`);
                return res.status(403).json({
                    success: false,
                    message: 'Немає активного завдання для цього ліфта'
                });
            }
        }
        
        res.json({
            success: true,
            data: liftWithClient  // 🔧 Консистентна структура відповіді (data замість lift)
        });
    } catch (error) {
        console.error('❌ Помилка отримання ліфта:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання ліфта'
        });
    }
});

// GET /api/lifts/:id/history - історія обслуговування ліфта
app.get('/api/lifts/:id/history', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);

        const lift = await db.collection('lifts').findOne({ _id: liftId });
        if (!lift) {
            return res.status(404).json({ success: false, message: 'Ліфт не знайдено' });
        }

        // 🔐 Перевірка прав доступу
        if (req.user.role === 'client') {
            const clientId = req.user.id || req.user.userId;
            const liftClientId = lift.client ? lift.client.toString() : null;
            if (liftClientId !== clientId) {
                return res.status(403).json({ success: false, message: 'Немає доступу до цього ліфта' });
            }
        }

        // Збираємо inspectionHistory з самого ліфта
        const inspections = (lift.inspectionHistory || []).map(entry => ({
            date: entry.date,
            type: entry.reportType || 'inspection',
            description: entry.notes || '',
            technician: entry.inspector || '',
            status: entry.status === 'passed' ? 'completed' : (entry.status === 'failed' ? 'failed' : 'conditional')
        }));

        // Збираємо завершені запити на обслуговування з колекції requests
        const completedRequests = await db.collection('requests').find({
            liftId: liftId.toString(),
            status: { $in: ['completed', 'done', 'closed'] }
        }).toArray();

        const requestHistory = completedRequests.map(req => ({
            date: req.completedAt || req.updatedAt || req.createdAt,
            type: req.type || req.requestType || 'maintenance',
            description: req.description || req.title || '',
            technician: req.technicianName || '',
            status: 'completed'
        }));

        // Об'єднуємо і сортуємо за датою (новіші спочатку)
        const history = [...inspections, ...requestHistory].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );

        res.json({ success: true, data: history });
    } catch (error) {
        console.error('❌ Помилка отримання історії ліфта:', error);
        res.status(500).json({ success: false, message: 'Помилка отримання історії обслуговування' });
    }
});

// PUT /api/lifts/:id - оновлення ліфта
app.put('/api/lifts/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        
        // 🔐 ПЕРЕВІРКА ПРАВ ДОСТУПУ
        const lift = await db.collection('lifts').findOne({ _id: liftId });
        
        if (!lift) {
            return res.status(404).json({
                success: false,
                message: 'Ліфт не знайдено'
            });
        }
        
        // Клієнт може оновлювати тільки свої ліфти
        if (req.user.role === 'client' && lift.clientId !== req.user.id && lift.clientId !== req.user.userId) {
            console.warn(`⚠️ Клієнт ${req.user.username} намагається оновити чужий ліфт ${liftId}`);
            return res.status(403).json({
                success: false,
                message: 'Немає прав для оновлення цього ліфта'
            });
        }
        
        // Технік не може редагувати ліфти
        if (req.user.role === 'technician') {
            console.warn(`⚠️ Технік ${req.user.username} намагається оновити ліфт ${liftId}`);
            return res.status(403).json({
                success: false,
                message: 'Техніки не можуть редагувати ліфти'
            });
        }
        
        console.log('📝 PUT /api/lifts/:id - Отримані дані:', {
            clientName: req.body.clientName,
            clientEmail: req.body.clientEmail,
            clientPhone: req.body.clientPhone,
            intercomCode: req.body.intercomCode,
            contactPerson: req.body.contactPerson,
            address: req.body.address
        });
        
        // 🌍 ГЕОКОДУВАННЯ: якщо адреса змінилась, перераховуємо координати
        let updateData = {
            ...req.body,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.username
        };
        
        if (req.body.address) {
            console.log('🔍 Адреса змінена, виконуємо геокодування...');
            const geocodedLocation = await geocodeAddress(req.body.address);
            
            if (geocodedLocation) {
                updateData.location = geocodedLocation;
                console.log('✅ Оновлено координати:', geocodedLocation.coordinates);
            } else {
                console.warn('⚠️ Геокодування не вдалося, координати залишаються без змін');
            }
        }
        
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
        
        // Отримуємо оновлений документ для відповіді
        const updatedLift = await db.collection('lifts').findOne({ _id: liftId });
        
        res.json({
            success: true,
            message: 'Ліфт оновлено успішно',
            data: updatedLift
        });
    } catch (error) {
        console.error('❌ Помилка оновлення ліфта:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка оновлення ліфта'
        });
    }
});

// POST /api/lifts/:id/contract - завантаження контракту
app.post('/api/lifts/:id/contract', authenticateToken, upload.single('contract'), async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Файл контракту не завантажено'
            });
        }
        
        console.log('📄 Contract uploaded:', {
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size
        });
        
        const contractData = {
            contractFile: `/uploads/pdfs/${req.file.filename}`, // Повний шлях для відображення
            contractNumber: req.body.contractNumber || 'Без номера',
            startDate: req.body.startDate || null,
            endDate: req.body.endDate || null,
            description: req.body.notes || '',
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: req.user.username
        };
        
        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            { 
                $set: { 
                    maintenanceContract: contractData, // Змінено з contract на maintenanceContract
                    updatedAt: new Date().toISOString()
                } 
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ліфт не знайдено'
            });
        }
        
        res.json({
            success: true,
            message: 'Контракт успішно завантажено',
            contract: contractData
        });
    } catch (error) {
        console.error('❌ Помилка завантаження контракту:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка завантаження контракту'
        });
    }
});

// GET /api/lifts/:id/contract - отримати контракт ліфта
app.get('/api/lifts/:id/contract', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        const lift = await db.collection('lifts').findOne({ _id: liftId }, { projection: { maintenanceContract: 1 } });
        if (!lift) return res.status(404).json({ success: false, message: 'Ліфт не знайдено' });
        res.json({ success: true, data: { contract: lift.maintenanceContract || null } });
    } catch (error) {
        console.error('❌ Помилка отримання контракту:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// DELETE /api/lifts/:id/contract - видалення контракту
app.delete('/api/lifts/:id/contract', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        const lift = await db.collection('lifts').findOne({ _id: liftId }, { projection: { maintenanceContract: 1 } });
        if (!lift) return res.status(404).json({ success: false, message: 'Ліфт не знайдено' });

        // Видаляємо файл з диску
        if (lift.maintenanceContract?.path) {
            const fs = require('fs').promises;
            await fs.unlink(lift.maintenanceContract.path).catch(() => {});
        }

        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            { $unset: { maintenanceContract: '' }, $set: { updatedAt: new Date().toISOString() } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Ліфт не знайдено' });

        res.json({ success: true, message: 'Контракт успішно видалено' });
    } catch (error) {
        console.error('❌ Помилка видалення контракту:', error);
        res.status(500).json({ success: false, message: 'Помилка видалення контракту' });
    }
});

// POST /api/lifts/:id/contract/email - надіслати контракт по email
app.post('/api/lifts/:id/contract/email', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        const { email } = req.body;

        if (!email) return res.status(400).json({ success: false, message: 'Email є обов\'язковим' });

        const lift = await db.collection('lifts').findOne({ _id: liftId }, { projection: { maintenanceContract: 1, municipalNumber: 1, 'client.email': 1 } });
        if (!lift) return res.status(404).json({ success: false, message: 'Ліфт не знайдено' });

        const contract = lift.maintenanceContract;
        if (!contract?.contractFile) return res.status(404).json({ success: false, message: 'Контракт не завантажено' });

        const path = require('path');
        const filePath = contract.path || path.join('/workspaces/deapseak', contract.contractFile);

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: `Контракт на обслуговування ліфта №${lift.municipalNumber || contract.contractNumber}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #28a745;">📄 Контракт на обслуговування ліфта</h2>
                    <p>Надсилаємо вам контракт на обслуговування:</p>
                    <ul>
                        <li><strong>Ліфт №:</strong> ${lift.municipalNumber || '-'}</li>
                        <li><strong>Контракт №:</strong> ${contract.contractNumber || '-'}</li>
                        ${contract.startDate ? `<li><strong>Початок дії:</strong> ${new Date(contract.startDate).toLocaleDateString('uk-UA')}</li>` : ''}
                    </ul>
                    <p>Файл контракту додано у вкладенні.</p>
                    <hr>
                    <p style="color:#666;font-size:12px;">З повагою, Команда FestLift</p>
                </div>
            `,
            attachments: [{ filename: contract.originalName || 'contract.pdf', path: filePath }]
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Contract email sent to ${email} for lift ${liftId}`);
        res.json({ success: true, message: `Контракт успішно надіслано на ${email}` });
    } catch (error) {
        console.error('❌ Помилка надсилання контракту:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/lifts/:id/contract/share-to-siblings - поширити контракт на ліфти за тією ж адресою
app.post('/api/lifts/:id/contract/share-to-siblings', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);

        const lift = await db.collection('lifts').findOne({ _id: liftId });
        if (!lift) return res.status(404).json({ success: false, message: 'Ліфт не знайдено' });
        if (!lift.maintenanceContract) return res.status(400).json({ success: false, message: 'Контракт відсутній' });

        const street = lift.address?.street;
        const zipCode = lift.address?.zipCode;
        if (!street || !zipCode) return res.json({ success: true, updated: 0 });

        const result = await db.collection('lifts').updateMany(
            {
                _id: { $ne: liftId },
                'address.street': street,
                'address.zipCode': zipCode
            },
            {
                $set: {
                    maintenanceContract: lift.maintenanceContract,
                    updatedAt: new Date().toISOString()
                }
            }
        );

        res.json({ success: true, updated: result.modifiedCount });
    } catch (error) {
        console.error('❌ Помилка поширення контракту:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
app.post('/api/lifts/:id/inspection-report', authenticateToken, upload.single('pdfFile'), async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        
        console.log('📋 Adding inspection report to lift:', liftId);
        console.log('📝 Report data:', req.body);
        
        const fileUrl = req.file ? `/uploads/pdfs/${req.file.filename}` : null;
        if (fileUrl) {
            console.log('📎 PDF attached:', fileUrl);
        }

        // Визначаємо статус на основі клауз, якщо він не вказаний явно
        // Пріоритет: явний status з форми → але якщо є c1Count/c2Count передані — перевіряємо
        let resolvedStatus = req.body.status || 'passed';
        const c1Count = parseInt(req.body.c1Count) || 0;
        const c2Count = parseInt(req.body.c2Count) || 0;
        // Якщо є C1 клаузи → failed; якщо C2 але немає C1 → conditional; інакше → passed
        if (c1Count > 0) resolvedStatus = 'failed';
        else if (c2Count > 0) resolvedStatus = 'conditional';

        const reportData = {
            date: req.body.inspectionDate || new Date().toISOString(),
            type: req.body.inspectionType || 'routine',
            inspector: req.user.username,
            notes: req.body.comments || req.body.findings || '',
            status: resolvedStatus,
            c1Count: c1Count,
            c2Count: c2Count,
            c3Count: parseInt(req.body.c3Count) || 0,
            photos: [],
            reportFile: fileUrl,
            fileUrl: fileUrl,
            reportType: req.body.inspectionType || 'routine'
        };
        
        // Розрахунок наступної дати інспекції
        // C1 (crítico) = failed → +90 днів для виправлення
        // C2 (moderado) = conditional → +180 днів для виправлення
        // C3 або без клауз (passou) = +2 роки
        const calcNextInspection = () => {
            const d = new Date(reportData.date);
            if (reportData.status === 'failed') {
                d.setDate(d.getDate() + 90);   // C1: 90 днів для усунення
            } else if (reportData.status === 'conditional') {
                d.setDate(d.getDate() + 180);  // C2: 180 днів для виправлення
            } else {
                d.setMonth(d.getMonth() + 24); // passed/C3: 2 роки до наступної
            }
            return d.toISOString();
        };

        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            { 
                $push: { inspectionHistory: reportData },
                $set: { 
                    lastInspectionDate: reportData.date,
                    nextInspectionDate: calcNextInspection(),
                    inspectionStatus: reportData.status === 'passed' ? 'active' : 'needs_attention',
                    updatedAt: new Date().toISOString()
                }
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ліфт не знайдено'
            });
        }
        
        res.json({
            success: true,
            message: 'Звіт інспекції успішно додано',
            report: reportData
        });
    } catch (error) {
        console.error('❌ Помилка додавання звіту:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка додавання звіту'
        });
    }
});

// DELETE /api/lifts/:id/inspection-report/:index - видалення звіту з масиву
app.delete('/api/lifts/:id/inspection-report/:index', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        const idx = parseInt(req.params.index);

        if (isNaN(idx) || idx < 0) {
            return res.status(400).json({ success: false, message: 'Невірний індекс звіту' });
        }

        // Крок 1: $unset елемент масиву
        await db.collection('lifts').updateOne(
            { _id: liftId },
            { $unset: { [`inspectionHistory.${idx}`]: 1 } }
        );
        // Крок 2: $pull null-значення
        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            { $pull: { inspectionHistory: null } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Ліфт не знайдено' });
        }

        res.json({ success: true, message: 'Звіт видалено' });
    } catch (error) {
        console.error('❌ Помилка видалення звіту:', error);
        res.status(500).json({ success: false, message: 'Помилка видалення звіту' });
    }
});

// POST /api/lifts/:id/inspection-report/:index/attach-pdf - прив'язати PDF до існуючого звіту
app.post('/api/lifts/:id/inspection-report/:index/attach-pdf', authenticateToken, upload.single('pdfFile'), async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        const idx = parseInt(req.params.index);

        if (isNaN(idx) || idx < 0) {
            return res.status(400).json({ success: false, message: 'Невірний індекс звіту' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Файл не завантажено' });
        }

        const fileUrl = `/uploads/pdfs/${req.file.filename}`;

        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            { $set: {
                [`inspectionHistory.${idx}.reportFile`]: fileUrl,
                [`inspectionHistory.${idx}.fileUrl`]: fileUrl
            }}
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Ліфт не знайдено' });
        }

        res.json({ success: true, fileUrl, message: 'PDF прив\'язано до звіту' });
    } catch (error) {
        console.error('❌ Помилка приєднання PDF:', error);
        res.status(500).json({ success: false, message: 'Помилка приєднання PDF' });
    }
});

// POST /api/lifts/send-municipality-form - відправка форми до муніципалітету
app.post('/api/lifts/send-municipality-form', authenticateToken, async (req, res) => {
    try {
        console.log('📧 Sending municipality form:', req.body);
        
        const { templateType, liftData, municipalityEmail } = req.body;
        
        // Валідація
        if (!templateType || !liftData || !municipalityEmail) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de formulário, dados do elevador e email são obrigatórios'
            });
        }

        // Валідація типу форми
        if (!['inicio-servico', 'fim-servico'].includes(templateType)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de formulário inválido. Use: inicio-servico ou fim-servico'
            });
        }

        // Відправка через emailService
        const result = await emailService.sendMunicipalityForm(templateType, liftData, municipalityEmail);

        res.json({
            success: true,
            message: `Formulário de ${templateType} enviado com sucesso para ${municipalityEmail}`,
            data: result
        });
    } catch (error) {
        console.error('❌ Erro ao enviar formulário municipal:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar formulário'
        });
    }
});

// POST /api/lifts/:id/request-deletion - диспетчер подає заявку на видалення
app.post('/api/lifts/:id/request-deletion', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);

        // Тільки dispatcher може подавати заявку
        if (!['dispatcher', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Недостатньо прав' });
        }

        // Знайти ліфт
        const lift = await db.collection('lifts').findOne({ _id: liftId });
        if (!lift) {
            return res.status(404).json({ success: false, message: 'Ліфт не знайдено' });
        }

        // Позначити ліфт як "очікує видалення"
        await db.collection('lifts').updateOne(
            { _id: liftId },
            { $set: { pendingDeletion: true, deletionRequestedBy: req.user.id, deletionRequestedAt: new Date() } }
        );

        // Знайти всіх адмінів для сповіщення
        const admins = await db.collection('users').find({ role: 'admin' }).toArray();

        // Створити сповіщення для кожного адміна
        for (const admin of admins) {
            await db.collection('notifications').insertOne({
                userId: admin._id.toString(),
                type: 'lift_delete_request',
                title: 'Запит на видалення ліфта',
                message: `Диспетчер ${req.user.firstName || req.user.username} запитує видалення ліфта: ${lift.name || lift.address || liftId}`,
                liftId: liftId.toString(),
                requestedBy: req.user.id,
                requestedByName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : req.user.username,
                icon: 'fas fa-trash-alt',
                priority: 'high',
                status: 'unread',
                timestamp: new Date(),
                createdAt: new Date()
            });
        }

        res.json({ success: true, message: 'Запит на видалення відправлено адміністратору' });
    } catch (error) {
        console.error('❌ Помилка запиту на видалення:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// POST /api/lifts/:id/approve-deletion - адмін підтверджує видалення
app.post('/api/lifts/:id/approve-deletion', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);

        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Тільки адміністратор може підтверджувати видалення' });
        }

        const lift = await db.collection('lifts').findOne({ _id: liftId });

        // Відмітити пов'язані notifications як оброблені (незалежно від наявності ліфта)
        const { notificationId } = req.body;
        if (notificationId) {
            await db.collection('notifications').updateOne(
                { _id: new ObjectId(notificationId) },
                { $set: { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.user.id } }
            );
        }

        if (!lift) {
            // Ліфт вже був видалений — вважаємо операцію успішною
            return res.json({ success: true, message: 'Ліфт вже видалено' });
        }

        // Видалити ліфт
        await db.collection('lifts').deleteOne({ _id: liftId });

        // Сповістити диспетчера що запит підтверджено
        if (lift.deletionRequestedBy) {
            await db.collection('notifications').insertOne({
                userId: lift.deletionRequestedBy.toString(),
                type: 'system',
                title: 'Видалення ліфта підтверджено',
                message: `Адміністратор підтвердив видалення ліфта: ${lift.name || lift.address || liftId}`,
                icon: 'fas fa-check-circle',
                priority: 'normal',
                status: 'unread',
                timestamp: new Date(),
                createdAt: new Date()
            });
        }

        res.json({ success: true, message: 'Ліфт успішно видалено' });
    } catch (error) {
        console.error('❌ Помилка підтвердження видалення:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// POST /api/lifts/:id/reject-deletion - адмін відхиляє видалення
app.post('/api/lifts/:id/reject-deletion', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);

        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Тільки адміністратор може відхиляти запити' });
        }

        const lift = await db.collection('lifts').findOne({ _id: liftId });
        if (!lift) {
            return res.status(404).json({ success: false, message: 'Ліфт не знайдено' });
        }

        // Зняти мітку "очікує видалення"
        await db.collection('lifts').updateOne(
            { _id: liftId },
            { $unset: { pendingDeletion: '', deletionRequestedBy: '', deletionRequestedAt: '' } }
        );

        // Сповістити диспетчера що запит відхилено
        if (lift.deletionRequestedBy) {
            const { reason } = req.body;
            await db.collection('notifications').insertOne({
                userId: lift.deletionRequestedBy.toString(),
                type: 'system',
                title: 'Запит на видалення відхилено',
                message: `Адміністратор відхилив видалення ліфта: ${lift.name || lift.address || liftId}${reason ? '. Причина: ' + reason : ''}`,
                icon: 'fas fa-times-circle',
                priority: 'normal',
                status: 'unread',
                timestamp: new Date(),
                createdAt: new Date()
            });
        }

        // Відмітити notification як оброблене
        const { notificationId } = req.body;
        if (notificationId) {
            await db.collection('notifications').updateOne(
                { _id: new ObjectId(notificationId) },
                { $set: { status: 'rejected', resolvedAt: new Date(), resolvedBy: req.user.id } }
            );
        }

        res.json({ success: true, message: 'Запит на видалення відхилено' });
    } catch (error) {
        console.error('❌ Помилка відхилення запиту:', error);
        res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
});

// DELETE /api/lifts/:id - видалення ліфта
app.delete('/api/lifts/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        
        // 🔐 ПЕРЕВІРКА ПРАВ - тільки admin може видаляти
        if (req.user.role !== 'admin') {
            console.warn(`⚠️ ${req.user.role} ${req.user.username} намагається видалити ліфт ${liftId}`);
            return res.status(403).json({
                success: false,
                message: 'Тільки адміністратор може видаляти ліфти'
            });
        }
        
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

// ========================================
// 📄 LIFT DOCUMENTS MANAGEMENT
// ========================================

// Multer конфігурація для документів ліфтів
const liftDocStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const liftId = req.params.id;
        const uploadDir = path.join(__dirname, 'uploads', 'lifts', liftId);
        
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            console.error('❌ Error creating upload directory:', error);
            cb(error, null);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
    }
});

const uploadLiftDoc = multer({
    storage: liftDocStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Недопустимий тип файлу. Дозволені: PDF, DOC, DOCX, JPG, PNG'));
        }
    }
});

// POST /api/lifts/:id/documents - завантаження документа
app.post('/api/lifts/:id/documents', authenticateToken, uploadLiftDoc.single('document'), async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        const documentType = req.body.type; // 'contract' або 'inspection'
        
        console.log('📄 Uploading document for lift:', liftId);
        console.log('📝 Type:', documentType);
        console.log('👤 User:', req.user.username);
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Файл не завантажено'
            });
        }
        
        if (!['contract', 'inspection'].includes(documentType)) {
            // Видалити завантажений файл
            await fs.unlink(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Недійсний тип документа'
            });
        }
        
        // Створити запис документа
        const document = {
            _id: new ObjectId(),
            type: documentType,
            filename: req.file.originalname,
            storedFilename: req.file.filename,
            path: `/uploads/lifts/${req.params.id}/${req.file.filename}`,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedBy: {
                _id: req.user._id,
                username: req.user.username,
                name: req.user.name || req.user.username
            },
            uploadedAt: new Date().toISOString()
        };
        
        // Додати документ до БД
        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            { 
                $push: { documents: document },
                $set: { updatedAt: new Date().toISOString() }
            }
        );
        
        if (result.matchedCount === 0) {
            // Видалити завантажений файл якщо ліфт не знайдено
            await fs.unlink(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'Ліфт не знайдено'
            });
        }
        
        console.log('✅ Document uploaded:', req.file.originalname);
        
        res.json({
            success: true,
            message: 'Документ успішно завантажено',
            document: document
        });
    } catch (error) {
        console.error('❌ Error uploading document:', error);
        
        // Спробувати видалити файл у разі помилки
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('❌ Error deleting file:', unlinkError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Помилка завантаження документа'
        });
    }
});

// GET /api/lifts/:id/documents - отримання всіх документів ліфта
app.get('/api/lifts/:id/documents', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        
        console.log('📄 Запит документів для ліфта:', liftId);
        
        const lift = await db.collection('lifts').findOne(
            { _id: liftId },
            { projection: { documents: 1 } }
        );
        
        if (!lift) {
            console.error('❌ Ліфт не знайдено:', liftId);
            return res.status(404).json({
                success: false,
                message: 'Ліфт не знайдено'
            });
        }
        
        const documents = lift.documents || [];
        console.log(`✅ Знайдено ${documents.length} документів для ліфта ${liftId}`);
        
        res.json(documents);
    } catch (error) {
        console.error('❌ Error fetching documents:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка завантаження документів'
        });
    }
});

// DELETE /api/lifts/:liftId/documents/:docId - видалення документа (тільки admin)
app.delete('/api/lifts/:liftId/documents/:docId', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.liftId);
        const docId = new ObjectId(req.params.docId);
        
        // 🔐 ПЕРЕВІРКА ПРАВ - тільки admin може видаляти
        if (req.user.role !== 'admin') {
            console.warn(`⚠️ ${req.user.role} ${req.user.username} намагається видалити документ`);
            return res.status(403).json({
                success: false,
                message: 'Тільки адміністратор може видаляти документи'
            });
        }
        
        // Знайти документ
        const lift = await db.collection('lifts').findOne(
            { _id: liftId },
            { projection: { documents: 1 } }
        );
        
        if (!lift) {
            return res.status(404).json({
                success: false,
                message: 'Ліфт не знайдено'
            });
        }
        
        const document = lift.documents?.find(doc => doc._id.equals(docId));
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Документ не знайдено'
            });
        }
        
        // Видалити файл з файлової системи
        const filePath = path.join(__dirname, 'uploads', 'lifts', req.params.liftId, document.storedFilename);
        try {
            await fs.unlink(filePath);
            console.log('🗑️ File deleted:', filePath);
        } catch (error) {
            console.warn('⚠️ Could not delete file:', error.message);
        }
        
        // Видалити документ з БД
        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            { 
                $pull: { documents: { _id: docId } },
                $set: { updatedAt: new Date().toISOString() }
            }
        );
        
        console.log('✅ Document deleted by admin:', req.user.username);
        
        res.json({
            success: true,
            message: 'Документ видалено успішно'
        });
    } catch (error) {
        console.error('❌ Error deleting document:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка видалення документа'
        });
    }
});

// ========================================
// 🏛️ MUNICIPALITY API ENDPOINTS
// ========================================

// GET /api/municipalities - отримання всіх муніципалітетів
app.get('/api/municipalities', authenticateToken, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const municipalitiesData = JSON.parse(
            await fs.readFile('./data/municipalities-lisboa-120km.json', 'utf8')
        );
        
        res.json({
            success: true,
            data: municipalitiesData.municipalities,
            center: municipalitiesData.center,
            statistics: municipalitiesData.statistics
        });
    } catch (error) {
        console.error('❌ Помилка завантаження муніципалітетів:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка завантаження муніципалітетів'
        });
    }
});

// POST /api/municipalities/detect - визначення муніципалітету за адресою/кодом
app.post('/api/municipalities/detect', authenticateToken, async (req, res) => {
    try {
        const { address, postalCode } = req.body;
        
        console.log('🔍 Municipality detect request:', { address, postalCode });
        
        if (!address && !postalCode) {
            return res.status(400).json({
                success: false,
                message: 'Необхідно надати адресу або поштовий код'
            });
        }
        
        const fs = require('fs').promises;
        const municipalitiesData = JSON.parse(
            await fs.readFile('./data/municipalities-lisboa-120km.json', 'utf8')
        );
        
        let detectedCode = postalCode;
        
        // Якщо тільки адреса - витягуємо код
        if (!detectedCode && address) {
            const match = address.match(/(\d{4})-?\d{3}/);
            if (match) {
                detectedCode = match[1];
            }
        }
        
        // Витягуємо тільки перші 4 цифри з postal code (формат: 2345-465 → 2345)
        if (detectedCode) {
            const codeMatch = detectedCode.toString().match(/^(\d{4})/);
            if (codeMatch) {
                detectedCode = codeMatch[1];
            }
        }
        
        console.log('🔍 Detected code (перші 4 цифри):', detectedCode);
        
        if (!detectedCode) {
            return res.json({
                success: false,
                message: 'Não foi possível detectar o código postal'
            });
        }
        
        // Шукаємо муніципалітет
        const municipality = municipalitiesData.municipalities.find(m => 
            m.postal_codes.some(code => code.startsWith(detectedCode))
        );
        
        console.log('🏛️ Municipality found:', municipality ? municipality.name : 'NÃO ENCONTRADO');
        
        if (municipality) {
            res.json({
                success: true,
                data: municipality,
                postal_code: detectedCode
            });
        } else {
            res.json({
                success: false,
                message: `Município não encontrado para o código ${detectedCode}`,
                postal_code: detectedCode
            });
        }
    } catch (error) {
        console.error('❌ Помилка визначення муніципалітету:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao detectar município'
        });
    }
});

// GET /api/municipalities/:id/lifts - ліфти в конкретному муніципалітеті
app.get('/api/municipalities/:id/lifts', authenticateToken, async (req, res) => {
    try {
        const municipalityId = req.params.id;
        
        const lifts = await db.collection('lifts').find({
            'municipality.id': municipalityId
        }).toArray();
        
        res.json({
            success: true,
            data: lifts,
            total: lifts.length
        });
    } catch (error) {
        console.error('❌ Помилка отримання ліфтів муніципалітету:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання ліфтів'
        });
    }
});

// GET /api/municipalities/stats - статистика по муніципалітетам
app.get('/api/municipalities/stats', authenticateToken, async (req, res) => {
    try {
        // Агрегуємо статистику по муніципалітетам
        const stats = await db.collection('lifts').aggregate([
            {
                $match: { 'municipality.id': { $exists: true } }
            },
            {
                $group: {
                    _id: '$municipality.id',
                    name: { $first: '$municipality.name' },
                    distrito: { $first: '$municipality.distrito' },
                    total_lifts: { $sum: 1 },
                    notified_count: {
                        $sum: { $cond: ['$municipality.notified', 1, 0] }
                    },
                    addresses: { $push: '$address' }
                }
            },
            {
                $sort: { total_lifts: -1 }
            }
        ]).toArray();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Помилка отримання статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання статистики'
        });
    }
});

// ========================================
// 👥 USERS API ENDPOINTS
// ========================================

// GET /api/users/profile - профіль поточного користувача
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const userId = req.user.id || req.user.userId;
        
        // Перевірка чи userId є валідним ObjectId
        let query;
        if (ObjectId.isValid(userId)) {
            query = { _id: new ObjectId(userId) };
        } else {
            // Якщо userId - це email або username
            query = { $or: [{ email: userId }, { username: userId }] };
        }
        
        const user = await db.collection('users').findOne(
            query,
            { projection: { password: 0 } }
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Користувач не знайдений'
            });
        }
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ Помилка отримання профілю:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання профілю',
            error: error.message
        });
    }
});

// GET /api/users/by-email?email=... - пошук клієнта по email (для автозаповнення)
app.get('/api/users/by-email', authenticateToken, async (req, res) => {
    try {
        const email = (req.query.email || '').trim().toLowerCase();
        if (!email) return res.status(400).json({ success: false, error: 'Email не вказано' });

        const user = await db.collection('users').findOne(
            { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            { projection: { password: 0 } }
        );
        if (!user) return res.status(404).json({ success: false, error: 'Користувача не знайдено' });

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('❌ Помилка пошуку по email:', error);
        res.status(500).json({ success: false, error: 'Помилка сервера' });
    }
});

// GET /api/users/technicians - список техніків (для призначення)
app.get('/api/users/technicians', authenticateToken, async (req, res) => {
    try {
        const technicians = await db.collection('users').find(
            { role: 'technician' },
            { projection: { password: 0 } }
        ).toArray();
        
        res.json(technicians);
    } catch (error) {
        console.error('❌ Помилка завантаження техніків:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка завантаження техніків'
        });
    }
});

// GET /api/technicians - список техніків для TechnicianManager
app.get('/api/technicians', authenticateToken, async (req, res) => {
    try {
        const technicians = await db.collection('users').find(
            { role: { $in: ['technician', 'tech'] } },
            { projection: { password: 0 } }
        ).toArray();

        // Нормалізуємо формат для technician-manager.js
        const result = technicians.map(t => ({
            id: t._id,
            firstName: t.firstName || t.name?.split(' ')[0] || t.username || '',
            lastName: t.lastName || t.name?.split(' ').slice(1).join(' ') || '',
            email: t.email || '',
            phone: t.phone || '',
            specialty: t.specialty || 'general',
            status: t.status || 'offline',
            skills: t.skills || [],
            workload: t.workload || 'low',
            currentAssignments: t.currentAssignments || 0,
            avatar: t.avatar || null,
            location: t.location || null,
            notes: t.notes || ''
        }));

        res.json(result);
    } catch (error) {
        console.error('❌ Помилка завантаження техніків:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка завантаження техніків'
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 🔧 Helper: create a user + send invitation email
// role: 'client' | 'technician'
// ─────────────────────────────────────────────────────────────
async function createUserWithInvite(userData, role, createdBy, req) {
    const email = (userData.email || '').trim().toLowerCase();
    if (!email) throw new Error('Email obrigatório');

    const existing = await db.collection('users').findOne({ email });
    if (existing) {
        return { user: existing, created: false };
    }

    const rawPassword =
        Math.random().toString(36).slice(2, 6).toUpperCase() +
        Math.floor(1000 + Math.random() * 9000) +
        ['!', '@', '#', '$'][Math.floor(Math.random() * 4)];

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const nameParts = (userData.firstName || userData.name || '').trim().split(/\s+/);
    const newDoc = {
        email,
        username: email.split('@')[0],
        firstName: userData.firstName || nameParts[0] || '',
        lastName: userData.lastName || nameParts.slice(1).join(' ') || '',
        phone: userData.phone || '',
        password: hashedPassword,
        role,
        isActive: true,
        status: 'offline',
        specialty: userData.specialty || undefined,
        skills: userData.skills || [],
        notes: userData.notes || '',
        createdAt: new Date().toISOString(),
        createdBy,
        mustChangePassword: true,  // Примусова зміна пароля при першому вході
        tempPasswordHint: rawPassword  // Відображається в профілі до зміни пароля
    };
    // Remove undefined fields
    Object.keys(newDoc).forEach(k => newDoc[k] === undefined && delete newDoc[k]);

    const inserted = await db.collection('users').insertOne(newDoc);
    newDoc._id = inserted.insertedId;

    // Send invitation email
    const siteBase = process.env.SITE_URL || `${req.protocol}://${req.headers.host}`;
    const roleLabel = role === 'client' ? 'cliente' : 'técnico';
    const roleIcon  = role === 'client' ? '🏢' : '🔧';

    const inviteHtml = `<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.12)}
  .header{background:linear-gradient(135deg,#1a237e,#1565c0);padding:32px 30px;text-align:center;color:#fff}
  .header h1{margin:0;font-size:26px}.header p{margin:6px 0 0;font-size:14px;opacity:.85}
  .body{padding:32px 30px}.body h2{color:#1a237e;font-size:20px;margin-top:0}
  .creds{background:#e8f0fe;border-left:4px solid #1565c0;border-radius:6px;padding:18px 22px;margin:20px 0}
  .creds p{margin:6px 0;font-size:15px}.creds strong{color:#1a237e}
  .creds code{background:#fff;padding:3px 8px;border-radius:4px;font-size:15px;letter-spacing:1px;border:1px solid #c5cae9}
  .btn{display:inline-block;background:#1565c0;color:#fff!important;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:bold;margin-top:20px}
  .footer{background:#f8f9fa;padding:18px 30px;text-align:center;font-size:12px;color:#888}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>${roleIcon} FestLift</h1><p>Plataforma de Gestão de Elevadores</p></div>
  <div class="body">
    <h2>Bem-vindo(a)${newDoc.firstName ? ', ' + newDoc.firstName : ''}!</h2>
    <p>Foi registado(a) como <strong>${roleLabel}</strong> na plataforma <strong>FestLift</strong>.</p>
    <div class="creds">
      <p>🔐 <strong>Os seus dados de acesso:</strong></p>
      <p><strong>Email:</strong> <code>${email}</code></p>
      <p><strong>Palavra-passe temporária:</strong> <code>${rawPassword}</code></p>
    </div>
    <p style="font-size:13px;color:#e53935;font-weight:bold">⚠️ Por razões de segurança, altere a sua palavra-passe após o primeiro login.</p>
    <a href="${siteBase}/pages/auth/login.html" class="btn">Entrar na plataforma →</a>
  </div>
  <div class="footer">FestLift Portugal &bull; Email automático — não responda.</div>
</div></body></html>`;

    let emailSent = false;
    let emailError = null;
    try {
        await emailService.sendEmail(email, `🏢 FestLift — Bem-vindo(a)! Dados de acesso (${roleLabel})`, inviteHtml);
        emailSent = true;
        console.log(`✅ Convite enviado para ${role} ${email}`);
    } catch (e) {
        emailError = e.message;
        console.warn(`⚠️ Falha ao enviar convite para ${email}:`, e.message);
    }

    return { user: newDoc, created: true, rawPassword, emailSent, emailError };
}

// POST /api/clients - dispatcher cria novo cliente (User com role=client)
app.post('/api/clients', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }
        const { user, created, rawPassword, emailSent, emailError } = await createUserWithInvite(
            req.body, 'client', req.user.username, req
        );
        res.json({
            success: true,
            id: user._id,
            _id: user._id,
            ...user,
            password: undefined,
            newClient: created ? { email: user.email, password: rawPassword, emailSent, emailError } : null,
            message: created ? 'Cliente criado com sucesso' : 'Cliente já existe'
        });
    } catch (error) {
        console.error('❌ Erro ao criar cliente:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao criar cliente' });
    }
});

// PUT /api/clients/:id - actualizar cliente
app.put('/api/clients/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }
        const { ObjectId } = require('mongodb');
        const updateData = { ...req.body };
        delete updateData._id; delete updateData.id; delete updateData.password;
        // Синхронізуємо clientType з type щоб обидва поля були актуальні
        if (updateData.type) updateData.clientType = updateData.type;
        updateData.updatedAt = new Date().toISOString();
        updateData.updatedBy = req.user.username;

        await db.collection('users').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        res.json({ success: true, message: 'Cliente actualizado' });
    } catch (error) {
        console.error('❌ Erro ao actualizar cliente:', error);
        res.status(500).json({ success: false, message: 'Erro ao actualizar cliente' });
    }
});

// POST /api/technicians - dispatcher cria novo técnico (User com role=technician)
app.post('/api/technicians', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }
        const { user, created, rawPassword, emailSent, emailError } = await createUserWithInvite(
            req.body, 'technician', req.user.username, req
        );
        res.json({
            success: true,
            id: user._id,
            _id: user._id,
            ...user,
            password: undefined,
            newUser: created ? { email: user.email, password: rawPassword, emailSent, emailError } : null,
            message: created ? 'Técnico criado com sucesso' : 'Técnico já existe'
        });
    } catch (error) {
        console.error('❌ Erro ao criar técnico:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao criar técnico' });
    }
});

// PUT /api/technicians/:id - actualizar técnico
app.put('/api/technicians/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }
        const { ObjectId } = require('mongodb');
        const updateData = { ...req.body };
        delete updateData._id; delete updateData.id; delete updateData.password;
        updateData.updatedAt = new Date().toISOString();
        updateData.updatedBy = req.user.username;

        await db.collection('users').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        res.json({ success: true, message: 'Técnico actualizado' });
    } catch (error) {
        console.error('❌ Erro ao actualizar técnico:', error);
        res.status(500).json({ success: false, message: 'Erro ao actualizar técnico' });
    }
});

// GET /api/users - отримання користувачів (тільки admin)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        // Диспетчери можуть бачити клієнтів і техніків але повинні вказати role=
        if (req.user.role === 'dispatcher') {
            const allowedRoles = ['client', 'technician', 'tech']; // додано 'tech' для сумісності

            // Диспетчер зобов'язаний передати ?role= (без фільтра — 403)
            if (!req.query.role) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ заборонено. Диспетчери повинні вказати параметр role.'
                });
            }

            // Якщо запитують конкретну роль - перевіряємо чи вона дозволена
            if (req.query.role && !allowedRoles.includes(req.query.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ заборонено. Диспетчери можуть переглядати тільки клієнтів та техніків.'
                });
            }
            
            // Нормалізуємо роль: 'tech' -> 'technician'
            let requestedRole = req.query.role;
            if (requestedRole === 'tech') {
                requestedRole = 'technician';
            }
            
            // Якщо role вказано - повертаємо тільки цю роль, інакше - всі дозволені
            const filter = requestedRole
                ? { role: requestedRole }
                : { role: { $in: ['client', 'technician'] } };
            
            const users = await db.collection('users').find(
                filter,
                { projection: { password: 0 } }
            ).toArray();
            
            // Додати підрахунок ліфтів для кожного клієнта
            if (req.query.role === 'client') {
                const liftsCollection = db.collection('lifts');
                
                for (let user of users) {
                    // Підрахувати ліфти клієнта - перевіряємо всі можливі формати
                    const userId = user._id.toString();
                    const orConditions = [
                        { client: userId },
                        { client: user._id },
                        { 'client._id': userId },
                        { 'client._id': user._id }
                    ];
                    // Only add email/phone conditions when they have real values
                    if (user.email) orConditions.push({ clientEmail: user.email.toLowerCase() });
                    if (user.phone && user.phone.trim()) orConditions.push({ clientPhone: user.phone });
                    const liftCount = await liftsCollection.countDocuments({ $or: orConditions });
                    user.liftsCount = liftCount;
                    console.log(`📊 Клієнт ${user.email}: ${liftCount} ліфтів`);
                }
            }
            
            return res.json({
                success: true,
                data: users
            });
        }
        
        // Адміністратори можуть бачити всіх
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ заборонено. Тільки адміністратори можуть переглядати список користувачів.'
            });
        }
        
        // Адмін: підтримуємо фільтрацію по role query param
        let adminFilter = {};
        if (req.query.role) {
            // Нормалізуємо: 'tech' -> 'technician'
            const roleQuery = req.query.role === 'tech' ? 'technician' : req.query.role;
            adminFilter = { role: { $in: [roleQuery, req.query.role] } };
        }
        const users = await db.collection('users').find(adminFilter, {
            projection: { password: 0, tempPasswordHint: 0 }
        }).toArray();
        
        // Повертаємо в форматі { success: true, data: [...] } для сумісності
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

// GET /api/auth/status - Перевірка статусу автентифікації
app.get('/api/auth/status', authenticateToken, (req, res) => {
    res.json({
        success: true,
        authenticated: true,
        user: {
            id: req.user.id || req.user.userId,
            email: req.user.email,
            role: req.user.role,
            username: req.user.username
        }
    });
});

// GET /api/analytics/dashboard - Dashboard статистика
app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
    try {
        const allowedRoles = ['admin', 'dispatcher'];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Доступ заборонено. Тільки адміністратори та диспетчери можуть переглядати аналітику.'
            });
        }
        
        const stats = {
            totalLifts: await db.collection('lifts').countDocuments(),
            totalRequests: await db.collection('requests').countDocuments(),
            pendingRequests: await db.collection('requests').countDocuments({ status: 'pending' }),
            inProgressRequests: await db.collection('requests').countDocuments({ status: 'in_progress' }),
            completedRequests: await db.collection('requests').countDocuments({ status: 'completed' }),
            totalUsers: await db.collection('users').countDocuments(),
            totalTechnicians: await db.collection('users').countDocuments({ role: { $in: ['tech', 'technician'] } }),
            totalClients: await db.collection('users').countDocuments({ role: 'client' }),
            totalOrcamentos: await db.collection('orcamentos').countDocuments(),
            recentRequests: await db.collection('requests').find().sort({ createdAt: -1 }).limit(5).toArray()
        };
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Помилка отримання dashboard статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання статистики'
        });
    }
});

// GET /api/ai/health - Перевірка AI системи
app.get('/api/ai/health', authenticateToken, async (req, res) => {
    try {
        const hasApiKey = !!process.env.GEMINI_API_KEY;
        const hasModel = !!process.env.GOOGLE_AI_MODEL;
        
        res.json({
            success: true,
            status: hasApiKey ? 'configured' : 'missing_api_key',
            provider: 'Google Gemini 2.5 Flash',
            model: process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash-exp',
            configured: hasApiKey && hasModel,
            features: {
                chat: hasApiKey,
                pdfAnalysis: hasApiKey,
                voiceInput: true,
                voiceOutput: true
            }
        });
    } catch (error) {
        console.error('❌ Помилка перевірки AI системи:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка перевірки AI системи',
            error: error.message
        });
    }
});

// POST /api/users - створення користувача
app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { email, password, firstName, lastName, role, status } = req.body;

        // 🔒 Тільки admin та dispatcher можуть створювати юзерів
        if (!['admin', 'dispatcher'].includes(req.user.role)) {
            console.warn(`⛔ ${req.user.role} ${req.user.email} спробував POST /api/users`);
            return res.status(403).json({ success: false, error: 'Доступ заборонено' });
        }

        // Перевірка обов'язкових полів
        if (!email || !password || !firstName || !lastName || !role) {
            return res.status(400).json({
                success: false,
                error: 'Заповніть всі обов\'язкові поля'
            });
        }

        // 🔒 Валідація ролі — dispatcher не може створювати admin/dispatcher
        const validRoles = ['client', 'technician', 'admin', 'dispatcher'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, error: 'Недійсна роль' });
        }
        if (req.user.role === 'dispatcher' && !['client', 'technician'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Диспетчери можуть створювати тільки клієнтів та техніків'
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

        // Генеруємо username з email (до @)
        const username = email.split('@')[0];

        const { phone, company, address } = req.body;
        const newUser = {
            email,
            username,
            password: hashedPassword,
            firstName,
            lastName,
            phone: phone || '',
            company: company || '',
            address: address || '',
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

        // 🔒 Тільки admin та dispatcher можуть оновлювати юзерів
        if (!['admin', 'dispatcher'].includes(req.user.role)) {
            console.warn(`⛔ ${req.user.role} ${req.user.email} спробував PUT /api/users/:id`);
            return res.status(403).json({ success: false, error: 'Доступ заборонено' });
        }

        // 🔒 Валідація ObjectId
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'Недійсний ID' });
        }
        const userId = new ObjectId(req.params.id);
        const { email, password, firstName, lastName, role, status, phone, company, address } = req.body;

        // 🔒 Диспетчер не може змінювати роль на admin/dispatcher
        if (req.user.role === 'dispatcher' && role) {
            if (!['client', 'technician'].includes(role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Диспетчери можуть редагувати тільки клієнтів та техніків'
                });
            }
        }

        const updateData = {
            updatedAt: new Date()
        };

        if (email) updateData.email = email;
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (role) updateData.role = role;
        if (status) updateData.status = status;
        if (phone !== undefined) updateData.phone = phone;
        if (company !== undefined) updateData.company = company;
        if (address !== undefined) updateData.address = address;

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
        // Duplicate email
        if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {
            return res.status(409).json({
                success: false,
                error: 'Цей email вже використовується іншим користувачем'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Помилка оновлення користувача'
        });
    }
});

// DELETE /api/users/:id - видалення користувача
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');

        // 🔒 Тільки admin та dispatcher можуть видаляти юзерів
        if (!['admin', 'dispatcher'].includes(req.user.role)) {
            console.warn(`⛔ ${req.user.role} ${req.user.email} спробував DELETE /api/users/:id`);
            return res.status(403).json({ success: false, message: 'Доступ заборонено' });
        }

        // 🔒 Валідація ObjectId
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Недійсний ID' });
        }
        const userId = new ObjectId(req.params.id);
        
        // Перевіряємо що користувач не видаляє сам себе
        if ((req.user.id || req.user.userId) === req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'Ви не можете видалити свій власний акаунт'
            });
        }
        
        // 🔒 ОБМЕЖЕННЯ ДЛЯ ДИСПЕТЧЕРА: не може видаляти адмінів та диспетчерів
        if (req.user.role === 'dispatcher') {
            // Спочатку знаходимо користувача, якого хочуть видалити
            const userToDelete = await db.collection('users').findOne({ _id: userId });
            
            if (!userToDelete) {
                return res.status(404).json({
                    success: false,
                    message: 'Користувача не знайдено'
                });
            }
            
            // Перевіряємо роль користувача, якого хочуть видалити
            if (userToDelete.role === 'admin' || userToDelete.role === 'dispatcher') {
                return res.status(403).json({
                    success: false,
                    message: `Доступ заборонено! Диспетчери не можуть видаляти адміністраторів та інших диспетчерів. Роль користувача: ${userToDelete.role}`
                });
            }
            
            console.log(`👮 Диспетчер ${req.user.email} видаляє користувача з роллю: ${userToDelete.role}`);
        }
        
        const result = await db.collection('users').deleteOne({ _id: userId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Користувача не знайдено'
            });
        }
        
        console.log('✅ Видалено користувача:', userId);
        res.json({
            success: true,
            message: 'Користувача успішно видалено'
        });
    } catch (error) {
        console.error('❌ Помилка видалення користувача:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка видалення користувача'
        });
    }
});

// GET /api/users/:id - отримання конкретного користувача
app.get('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');

        // 🔒 Тільки admin/dispatcher або сам юзер (власний профіль)
        const isSelf = (req.user.id || req.user.userId) === req.params.id;
        if (!['admin', 'dispatcher'].includes(req.user.role) && !isSelf) {
            return res.status(403).json({ success: false, message: 'Доступ заборонено' });
        }

        // 🔒 Валідація ObjectId
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Недійсний ID' });
        }
        const userId = new ObjectId(req.params.id);
        
        // tempPasswordHint видаємо тільки самому юзеру, не адміну/диспетчеру
        const projection = isSelf
            ? { password: 0 }
            : { password: 0, tempPasswordHint: 0 };

        const user = await db.collection('users').findOne({ _id: userId }, { projection });
        
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

// GET /api/requests/stats - статистика запитів (МАЄ БУТИ ПЕРЕД /api/requests/:id!)
app.get('/api/requests/stats', authenticateToken, async (req, res) => {
    try {
        const requestsCollection = db.collection('requests');
        
        const totalRequests = await requestsCollection.countDocuments();
        const pendingRequests = await requestsCollection.countDocuments({ status: 'pending' });
        const inProgressRequests = await requestsCollection.countDocuments({ status: 'in_progress' });
        const completedRequests = await requestsCollection.countDocuments({ status: 'completed' });
        const cancelledRequests = await requestsCollection.countDocuments({ status: 'cancelled' });
        
        // Статистика по типам
        const typeStats = await requestsCollection.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        
        // Статистика по пріоритетам
        const priorityStats = await requestsCollection.aggregate([
            { $group: { _id: '$priority', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]).toArray();
        
        res.json({
            success: true,
            data: {
                total: totalRequests,
                pending: pendingRequests,
                inProgress: inProgressRequests,
                completed: completedRequests,
                cancelled: cancelledRequests,
                byType: typeStats,
                byPriority: priorityStats
            }
        });
    } catch (error) {
        console.error('❌ Помилка отримання статистики запитів:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання статистики'
        });
    }
});

// GET /api/requests/count-by-lift - кількість активних запитів по ліфтах
app.get('/api/requests/count-by-lift', authenticateToken, async (req, res) => {
    try {
        const requestsCollection = db.collection('requests');
        
        // Підрахувати активні запити (pending, assigned, in_progress) по ліфтах
        const counts = await requestsCollection.aggregate([
            {
                $match: {
                    status: { $in: ['pending', 'assigned', 'in_progress'] }
                }
            },
            {
                $group: {
                    _id: '$lift',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        
        // Перетворити в об'єкт { liftId: count }
        const result = {};
        counts.forEach(item => {
            if (item._id) {
                result[item._id.toString()] = item.count;
            }
        });
        
        res.json(result);
    } catch (error) {
        console.error('❌ Помилка підрахунку запитів:', error);
        res.status(500).json({});
    }
});

app.get('/api/requests', authenticateToken, async (req, res) => {
    try {
        const role = req.user.role;
        const userId = (req.user.userId || req.user.id || '').toString();
        let query = {};

        if (role === 'tech' || role === 'technician') {
            // Technician sees only requests assigned to them
            query.$or = [
                { technician: userId },
                { technicianId: userId }
            ];
            console.log(`🔧 Tech ${req.user.username} запитує свої завдання (userId=${userId})`);
        } else if (role === 'client') {
            // Client sees only requests on their lifts
            const { ObjectId: OID } = require('mongodb');
            let clientObjId = null;
            try { clientObjId = new OID(userId); } catch (e) { /* не ObjectId */ }
            const clientEmail = req.user.email;
            const liftOrConditions = clientObjId
                ? [{ client: userId }, { client: clientObjId }, { 'client._id': userId }, { 'client._id': clientObjId }]
                : [{ client: userId }, { 'client._id': userId }];
            if (clientEmail) liftOrConditions.push({ clientEmail: clientEmail.toLowerCase() });
            const liftFilterQuery = { $or: liftOrConditions };
            const clientLifts = await db.collection('lifts')
                .find(liftFilterQuery, { projection: { _id: 1 } })
                .toArray();
            const liftIds = clientLifts.map(l => l._id.toString());
            if (liftIds.length === 0) {
                console.log(`👤 Client ${req.user.username} не має ліфтів`);
                return res.json({ success: true, data: [] });
            }
            query.liftId = { $in: liftIds };
            console.log(`👤 Client ${req.user.username} запитує заявки для ${liftIds.length} ліфтів`);
        } else {
            // admin / dispatcher — all requests
            console.log(`👨‍💼 ${role} ${req.user.username} запитує всі заявки`);
        }

        // Optional query filters
        if (req.query.status) query.status = req.query.status;
        if (req.query.priority) query.priority = req.query.priority;

        // Filter by clientId: find the client's lifts first, then filter requests by liftId
        if (req.query.clientId) {
            const { ObjectId: OID } = require('mongodb');
            const qClientId = req.query.clientId.toString();
            let clientObjId = null;
            try { clientObjId = new OID(qClientId); } catch (e) {}
            const liftOrConds = clientObjId
                ? [{ client: qClientId }, { client: clientObjId }, { 'client._id': qClientId }, { 'client._id': clientObjId }]
                : [{ client: qClientId }, { 'client._id': qClientId }];
            // Also match by client email in case lifts store clientEmail
            try {
                const cUser = await db.collection('users').findOne({ _id: clientObjId }, { projection: { email: 1 } });
                if (cUser?.email) liftOrConds.push({ clientEmail: cUser.email.toLowerCase() });
            } catch (e) {}
            const clientLifts = await db.collection('lifts')
                .find({ $or: liftOrConds }, { projection: { _id: 1 } })
                .toArray();
            const liftIds = clientLifts.map(l => l._id.toString());
            console.log(`🔍 Фільтр по clientId=${qClientId}: знайдено ${liftIds.length} ліфтів`);
            if (liftIds.length === 0) {
                return res.json({ success: true, data: [] });
            }
            query.liftId = { $in: liftIds };
        }

        const requests = await db.collection('requests').find(query).toArray();

        // Збагачуємо кожну заявку даними клієнта і техніка
        const enriched = await Promise.all(requests.map(async (r) => {
            const { ObjectId } = require('mongodb');
            // Клієнт: спочатку спробуємо з поля client/clientId, потім з ліфта
            let clientObj = null;
            const rawClient = r.client || r.clientId;
            if (rawClient) {
                try {
                    const cId = (typeof rawClient === 'string') ? new ObjectId(rawClient) : rawClient;
                    const u = await db.collection('users').findOne(
                        { _id: cId },
                        { projection: { password: 0 } }
                    );
                    if (u) clientObj = { _id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone };
                } catch (_) {}
            }
            // Якщо client не знайдено — беремо дані з ліфта (старий формат заявок)
            if (!clientObj && r.liftId) {
                try {
                    const lId = (typeof r.liftId === 'string') ? new ObjectId(r.liftId) : r.liftId;
                    const liftDoc = await db.collection('lifts').findOne(
                        { _id: lId },
                        { projection: { client: 1, clientName: 1, clientEmail: 1, clientPhone: 1 } }
                    );
                    if (liftDoc) {
                        // Спробуємо знайти User по client ref
                        if (liftDoc.client) {
                            try {
                                const lcId = (typeof liftDoc.client === 'string') ? new ObjectId(liftDoc.client) : liftDoc.client;
                                const u = await db.collection('users').findOne({ _id: lcId }, { projection: { password: 0 } });
                                if (u) clientObj = { _id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone };
                            } catch (_) {}
                        }
                        // Fallback: email/name прямо в ліфті
                        if (!clientObj && (liftDoc.clientEmail || liftDoc.clientName)) {
                            // Спробуємо знайти User по email
                            if (liftDoc.clientEmail) {
                                const u = await db.collection('users').findOne(
                                    { email: liftDoc.clientEmail.toLowerCase() },
                                    { projection: { password: 0 } }
                                );
                                if (u) clientObj = { _id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone };
                            }
                            if (!clientObj) {
                                clientObj = {
                                    firstName: liftDoc.clientName || '',
                                    lastName: '',
                                    email: liftDoc.clientEmail || '',
                                    phone: liftDoc.clientPhone || ''
                                };
                            }
                        }
                    }
                } catch (_) {}
            }
            // Технік
            let techObj = null;
            const rawTech = r.assignedTo || r.technician || r.technicianId;
            if (rawTech) {
                try {
                    const tId = (typeof rawTech === 'string') ? new ObjectId(rawTech) : rawTech;
                    const t = await db.collection('users').findOne(
                        { _id: tId },
                        { projection: { password: 0 } }
                    );
                    if (t) techObj = { _id: t._id, firstName: t.firstName, lastName: t.lastName, email: t.email };
                } catch (_) {}
            }
            // Якщо технік не знайдений, але є technicianName — повертаємо як об'єкт
            if (!techObj && r.technicianName) {
                techObj = { firstName: r.technicianName, lastName: '', email: '' };
            }
            return {
                ...r,
                client: clientObj || r.client || null,
                assignedTo: techObj || r.assignedTo || null
            };
        }));

        res.json({
            success: true,
            data: enriched
        });
    } catch (error) {
        console.error('❌ Помилка отримання заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання заявок'
        });
    }
});

// Хелпер: будує MongoDB-запит для заявок за requestNumber (REQ-...) або ObjectId
function buildRequestQuery(id) {
    const { ObjectId } = require('mongodb');
    if (/^REQ-/i.test(id)) {
        return { requestNumber: id };
    }
    try { return { _id: new ObjectId(id) }; }
    catch (_) { return { requestNumber: id }; }
}

app.get('/api/requests/:id', authenticateToken, async (req, res) => {
    try {
        const requestQuery = buildRequestQuery(req.params.id);
        const role = req.user.role;
        const userId = (req.user.userId || req.user.id || '').toString();

        const request = await db.collection('requests').findOne(requestQuery);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Заявку не знайдено'
            });
        }

        // Access control for tech and client roles
        if (role === 'tech' || role === 'technician') {
            const assignedToMe = request.technician === userId || request.technicianId === userId;
            if (!assignedToMe) {
                return res.status(403).json({ success: false, message: 'Доступ заборонено' });
            }
        } else if (role === 'client') {
            const clientLifts = await db.collection('lifts')
                .find({ client: userId }, { projection: { _id: 1 } })
                .toArray();
            const liftIds = clientLifts.map(l => l._id.toString());
            if (!liftIds.includes(request.liftId)) {
                return res.status(403).json({ success: false, message: 'Доступ заборонено' });
            }
        }
        // admin / dispatcher: always allowed

        // Збагачуємо клієнтські дані так само, як у GET /api/requests
        const { ObjectId } = require('mongodb');
        let clientObj = null;
        const rawClient = request.client || request.clientId;
        if (rawClient) {
            try {
                const cId = (typeof rawClient === 'string') ? new ObjectId(rawClient) : rawClient;
                const u = await db.collection('users').findOne({ _id: cId }, { projection: { password: 0 } });
                if (u) clientObj = { _id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone };
            } catch (_) {}
        }
        if (!clientObj && request.liftId) {
            try {
                const lId = (typeof request.liftId === 'string') ? new ObjectId(request.liftId) : request.liftId;
                const liftDoc = await db.collection('lifts').findOne(
                    { _id: lId },
                    { projection: { client: 1, clientName: 1, clientEmail: 1, clientPhone: 1, address: 1, municipalNumber: 1 } }
                );
                if (liftDoc) {
                    if (liftDoc.client) {
                        try {
                            const lcId = (typeof liftDoc.client === 'string') ? new ObjectId(liftDoc.client) : liftDoc.client;
                            const u = await db.collection('users').findOne({ _id: lcId }, { projection: { password: 0 } });
                            if (u) clientObj = { _id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone };
                        } catch (_) {}
                    }
                    if (!clientObj && (liftDoc.clientEmail || liftDoc.clientName)) {
                        if (liftDoc.clientEmail) {
                            const u = await db.collection('users').findOne(
                                { email: liftDoc.clientEmail.toLowerCase() },
                                { projection: { password: 0 } }
                            );
                            if (u) clientObj = { _id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone };
                        }
                        if (!clientObj) {
                            clientObj = {
                                firstName: liftDoc.clientName || '',
                                lastName: '',
                                email: liftDoc.clientEmail || '',
                                phone: liftDoc.clientPhone || ''
                            };
                        }
                    }
                    // Збагачуємо також дані ліфта замовника
                    if (!request.lift && liftDoc) {
                        request.lift = {
                            _id: liftDoc._id,
                            municipalNumber: liftDoc.municipalNumber,
                            address: liftDoc.address
                        };
                    }
                }
            } catch (_) {}
        }
        // Технік
        let techObj = null;
        const rawTech = request.assignedTo || request.technician || request.technicianId;
        if (rawTech) {
            try {
                const tId = (typeof rawTech === 'string') ? new ObjectId(rawTech) : rawTech;
                const t = await db.collection('users').findOne({ _id: tId }, { projection: { password: 0 } });
                if (t) techObj = { _id: t._id, firstName: t.firstName, lastName: t.lastName, email: t.email, phone: t.phone };
            } catch (_) {}
        }
        if (!techObj && request.technicianName) {
            techObj = { firstName: request.technicianName, lastName: '', email: '' };
        }

        const enrichedRequest = {
            ...request,
            client: clientObj || request.client || null,
            assignedTo: techObj || request.assignedTo || null
        };

        res.json({
            success: true,
            request: enrichedRequest,
            data: { request: enrichedRequest }   // підтримка обох форматів відповіді
        });
    } catch (error) {
        console.error('❌ Помилка отримання заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання заявки'
        });
    }
});

app.post('/api/requests', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        
        // Отримуємо інформацію про ліфт, якщо вказано liftId
        let liftData = null;
        if (req.body.liftId) {
            try {
                const liftId = new ObjectId(req.body.liftId);
                liftData = await db.collection('lifts').findOne({ _id: liftId });
                
                if (liftData) {
                    console.log('✅ Знайдено ліфт для заявки:', {
                        id: liftData._id,
                        address: liftData.address,
                        client: liftData.client
                    });
                }
            } catch (e) {
                console.warn('⚠️ Помилка отримання даних ліфта:', e.message);
            }
        }
        
        // Генерація читабельного номеру заявки (REQ-2026-0001)
        const reqCount = await db.collection('requests').countDocuments();
        const reqYear = new Date().getFullYear();
        const requestNumber = `REQ-${reqYear}-${String(reqCount + 1).padStart(4, '0')}`;

        const newRequest = {
            ...req.body,
            requestNumber,
            // Автоматично генеруємо заголовок якщо не вказано
            title: req.body.title || (() => {
                const typeMap = { maintenance: 'Технічне обслуговування', repair: 'Ремонт', inspection: 'Технічний огляд', consultation: 'Консультація', emergency: 'Аварійна ситуація' };
                const typeName = typeMap[req.body.type] || req.body.type || 'Заявка';
                if (liftData?.address) {
                    const parts = [];
                    if (liftData.address.street) parts.push(liftData.address.street);
                    if (liftData.address.city) parts.push(liftData.address.city);
                    const addr = parts.join(', ');
                    return addr ? `${typeName} — ${addr}` : typeName;
                }
                return typeName;
            })(),
            // Якщо знайшли ліфт - збагачуємо дані
            liftAddress: (() => {
                if (!liftData?.address) return req.body.liftAddress || 'Адреса невідома';
                
                // Якщо address - об'єкт, формуємо рядок
                if (typeof liftData.address === 'object') {
                    const parts = [];
                    if (liftData.address.street) parts.push(liftData.address.street);
                    if (liftData.address.city) parts.push(liftData.address.city);
                    return parts.join(', ') || 'Адреса невідома';
                }
                return liftData.address;
            })(),
            liftClient: liftData?.client || req.body.liftClient || 'Клієнт невідомий',
            liftMunicipalNumber: liftData?.municipalNumber || req.body.liftMunicipalNumber || '',
            liftLocation: liftData?.location || req.body.liftLocation || null,
            createdAt: new Date().toISOString(),
            createdBy: req.user.username,
            updatedAt: new Date().toISOString()
        };
        
        console.log('📝 Створення заявки з даними:', {
            liftId: newRequest.liftId,
            liftAddress: newRequest.liftAddress,
            liftClient: newRequest.liftClient
        });
        
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
        const requestQuery = buildRequestQuery(req.params.id);
        
        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.username
        };
        
        const result = await db.collection('requests').updateOne(
            requestQuery,
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
        const requestQuery = buildRequestQuery(req.params.id);
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
        
        // Операції для видалення полів
        const unsetFields = {};
        
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
        if (status === 'in_progress') {
            if (!updateData.startedAt) {
                updateData.startedAt = new Date().toISOString();
            }
            
            // Якщо повертаємо завершену заявку в роботу - видаляємо дані завершення
            unsetFields.completedAt = '';
            unsetFields.completedBy = '';
            unsetFields.resolution = '';
            unsetFields.workDone = '';
            unsetFields.partsUsed = '';
            
            console.log('🔄 Повернення завершеної заявки в роботу - видалення даних завершення');
        }
        
        // Підготовка операції оновлення
        const updateOperation = { $set: updateData };
        if (Object.keys(unsetFields).length > 0) {
            updateOperation.$unset = unsetFields;
        }
        
        const result = await db.collection('requests').updateOne(
            requestQuery,
            updateOperation
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

// POST /api/requests/:id/comment - додати коментар до заявки
app.post('/api/requests/:id/comment', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const requestQuery = buildRequestQuery(req.params.id);
        const commentText = req.body.comment || req.body.text;
        
        console.log('💬 Додавання коментаря до заявки:', req.params.id);
        
        if (!commentText || !commentText.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Коментар не може бути порожнім'
            });
        }
        
        // Створюємо об'єкт коментаря
        const newComment = {
            id: new ObjectId().toString(),
            text: commentText.trim(),
            author: {
                id: req.user.id || req.user.userId,
                username: req.user.username,
                role: req.user.role
            },
            createdAt: new Date().toISOString()
        };
        
        // Додаємо коментар до масиву
        const result = await db.collection('requests').updateOne(
            requestQuery,
            { 
                $push: { comments: newComment },
                $set: { 
                    updatedAt: new Date().toISOString(),
                    updatedBy: req.user.username
                }
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявку не знайдено'
            });
        }
        
        console.log('✅ Коментар додано успішно');
        
        res.json({
            success: true,
            message: 'Коментар додано успішно',
            data: newComment
        });
    } catch (error) {
        console.error('❌ Помилка додавання коментаря:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка додавання коментаря'
        });
    }
});

// POST /api/requests/:id/complete - завершити заявку
app.post('/api/requests/:id/complete', authenticateToken, async (req, res) => {
    try {
        const requestQuery = buildRequestQuery(req.params.id);
        const { resolution, workDone, partsUsed } = req.body;
        
        console.log('✅ Завершення заявки:', req.params.id);
        
        if (!resolution || !resolution.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Опис виконаної роботи обов\'язковий'
            });
        }
        
        const updateData = {
            status: 'completed',
            resolution: resolution.trim(),
            completedAt: new Date().toISOString(),
            completedBy: {
                id: req.user.id || req.user.userId,
                username: req.user.username,
                role: req.user.role
            },
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.username
        };
        
        // Додаткові дані якщо є
        if (workDone) {
            updateData.workDone = workDone;
        }
        if (partsUsed && Array.isArray(partsUsed)) {
            updateData.partsUsed = partsUsed;
        }
        
        const result = await db.collection('requests').updateOne(
            requestQuery,
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявку не знайдено'
            });
        }
        
        console.log('✅ Заявку завершено успішно');
        
        res.json({
            success: true,
            message: 'Заявку завершено успішно',
            data: updateData
        });
    } catch (error) {
        console.error('❌ Помилка завершення заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка завершення заявки'
        });
    }
});

// POST /api/requests/:id/assign - призначити техніка до заявки
app.post('/api/requests/:id/assign', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const requestQuery = buildRequestQuery(req.params.id);
        const { technicianId, instructions, deadline } = req.body;
        
        console.log('👨‍🔧 Призначення техніка:', technicianId, 'до заявки:', req.params.id);
        
        // Перевірка прав (тільки admin або dispatcher)
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({
                success: false,
                message: 'У вас немає прав для призначення техніків'
            });
        }
        
        if (!technicianId) {
            return res.status(400).json({
                success: false,
                message: 'Не вказано техніка'
            });
        }
        
        // Перевірка чи технік існує
        const technician = await db.collection('users').findOne({
            _id: new ObjectId(technicianId)
        });
        
        if (!technician) {
            return res.status(404).json({
                success: false,
                message: 'Техніка не знайдено'
            });
        }
        
        if (technician.role !== 'tech' && technician.role !== 'technician') {
            return res.status(400).json({
                success: false,
                message: 'Вибраний користувач не є техніком'
            });
        }
        
        const updateData = {
            technician: technicianId,
            technicianName: `${technician.firstName} ${technician.lastName}`,
            status: 'assigned',
            assignedAt: new Date().toISOString(),
            assignedBy: {
                id: req.user.id || req.user.userId,
                username: req.user.username,
                role: req.user.role
            },
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.username
        };
        
        if (instructions) {
            updateData.instructions = instructions.trim();
        }
        
        if (deadline) {
            updateData.deadline = new Date(deadline).toISOString();
        }
        
        const result = await db.collection('requests').updateOne(
            requestQuery,
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявку не знайдено'
            });
        }
        
        console.log('✅ Техніка призначено успішно');
        
        res.json({
            success: true,
            message: 'Техніка призначено успішно',
            data: updateData
        });
    } catch (error) {
        console.error('❌ Помилка призначення техніка:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка призначення техніка'
        });
    }
});

app.delete('/api/requests/:id', authenticateToken, async (req, res) => {
    try {
        // Тільки адмін може видаляти заявки
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Видалення заявок дозволено тільки адміністратору'
            });
        }

        const { ObjectId } = require('mongodb');
        const requestQuery = buildRequestQuery(req.params.id);
        
        const result = await db.collection('requests').deleteOne(requestQuery);
        
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
        const userId = req.user.id || req.user.userId;
        
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
        const userId = req.user.id || req.user.userId;
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
        const userId = req.user.id || req.user.userId;
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
        const userId = req.user.id || req.user.userId;
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
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();
        
        // СПОЧАТКУ шукаємо явні мітки C1, C2, C3 на початку рядка
        const clauseMatch = line.match(/^(C[123])\s+/i);
        
        if (clauseMatch) {
            // Знайдено явну мітку клаузи
            const severity = clauseMatch[1].toUpperCase();
            
            // Перевіряємо поточний рядок І наступний для пошуку номера статті
            const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
            const combinedText = line + ' ' + nextLine;
            
            // Витягуємо номер статті з об'єднаного тексту
            // Формат: Artº.22.° 3 або Artº.74º 2
            const articleMatch = combinedText.match(/Art[ºo]?\.\s*(\d+)\s*[ºo°\.]*\s*(\d*)/i);
            
            let article = null;
            
            // СПОЧАТКУ намагаємось витягнути явний номер статті
            if (articleMatch) {
                // Формуємо повний номер статті з підпунктом
                article = articleMatch[2] 
                    ? `Art. ${articleMatch[1]}.${articleMatch[2]}`
                    : `Art. ${articleMatch[1]}`;
            }
            
            // ФІЛЬТР: пропускаємо загальні пояснення та службові тексти
            const skipPhrases = [
                'foram detetadas cláusulas',
                'foram detectadas cláusulas',
                'correspondem a situações',
                'regularizar no prazo',
                'elevador reprovado',
                'estas cláusulas',
                'caso tenham sido'
            ];
            
            const isGenericText = skipPhrases.some(phrase => combinedText.toLowerCase().includes(phrase));
            
            if (isGenericText) {
                console.log(`⚠️ Пропущено (загальний текст): ${combinedText.substring(0, 80)}...`);
                continue;
            }
            
            // Витягуємо опис порушення (текст після "Porушення:" або "–")
            let violation = nextLine || line;
            const violationMatch = (nextLine || line).match(/(?:Porушення:|–)\s*(.+)/i);
            if (violationMatch) {
                violation = violationMatch[1].trim();
            }
            
            // 🔍 ЯКЩО немає явного номера статті - визначаємо за змістом
            if (!article) {
                article = detectArticleByContent(violation);
                if (article) {
                    console.log(`🎯 Артикул визначено за змістом: ${article}`);
                } else {
                    console.log(`⚠️ Пропущено (немає номера статті і не визначено за змістом): ${line.substring(0, 80)}...`);
                    continue;
                }
            }
            
            // Перевіряємо чи вже є таке порушення (дедуплікація)
            const isDuplicate = violations.some(v => 
                v.article === article && v.severity === severity
            );
            
            if (isDuplicate) {
                console.log(`⚠️ Пропущено (дублікат): ${article} - ${severity}`);
                continue;
            }
            
            violations.push({
                id: violations.length + 1,
                description: violation,
                severity: severity,
                category: determineCategoryFromText(violation),
                points: severity === 'C1' ? 20 : (severity === 'C2' ? 10 : 5),
                article: article,
                recommendation: getRecommendation(determineCategoryFromText(violation)),
                deadline: getDeadline(severity),
                originalLine: line
            });
            
            console.log(`✅ Додано порушення: ${severity} - ${article}`);
            continue; // Переходимо до наступної лінії
        }
        
        // Якщо немає явної мітки, шукаємо за ключовими словами (стара логіка)
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
    }
    
    console.log(`📊 Знайдено порушень: ${violations.length}`);
    
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

function determineCategoryFromText(text) {
    const textLower = text.toLowerCase();
    
    // Визначаємо категорію на основі ключових слів
    if (textLower.includes('porta') || textLower.includes('bloqueio') || textLower.includes('fechadura')) {
        return 'Segurança de Portas';
    }
    if (textLower.includes('travagem') || textLower.includes('travão') || textLower.includes('freio')) {
        return 'Sistema de Travagem';
    }
    if (textLower.includes('pára-quedas') || textLower.includes('paraquedas') || textLower.includes('segurança')) {
        return 'Sistema de Segurança';
    }
    if (textLower.includes('cabo') || textLower.includes('suspensão')) {
        return 'Cabos e Suspensão';
    }
    if (textLower.includes('máquina') || textLower.includes('motor')) {
        return 'Casa das Máquinas';
    }
    if (textLower.includes('escada') || textLower.includes('acesso') || textLower.includes('alçapão')) {
        return 'Acesso e Circulação';
    }
    if (textLower.includes('iluminação') || textLower.includes('luz')) {
        return 'Iluminação';
    }
    if (textLower.includes('alarme') || textLower.includes('comunicação')) {
        return 'Sistema de Alarme';
    }
    if (textLower.includes('fim de curso') || textLower.includes('dispositivo')) {
        return 'Dispositivos de Segurança';
    }
    if (textLower.includes('resguard') || textLower.includes('proteção') || textLower.includes('peças salientes')) {
        return 'Proteções e Resguardos';
    }
    if (textLower.includes('manutenção') || textLower.includes('inspeção')) {
        return 'Manutenção';
    }
    if (textLower.includes('documentação') || textLower.includes('certificado')) {
        return 'Documentação';
    }
    
    return 'Geral';
}

// 🔍 НОВА ФУНКЦІЯ: Визначення артикулу за змістом тексту
function detectArticleByContent(text) {
    const textLower = text.toLowerCase();
    
    // База знань: ключові слова → номер артикулу
    const articleDatabase = {
        'Art. 22': [
            'escada de acesso', 'acesso à casa das máquinas', 'acesso ao topo',
            'alçapão', 'contrabalançado', 'degrau', 'corrimão', 'pegas',
            'guarda-corpos', 'largura', 'inclinação', 'fixação'
        ],
        'Art. 74': [
            'fim de curso', 'dispositivo de segurança', 'contrapeso',
            'pára-choques', 'paragem', 'limite de curso', 'actuação'
        ],
        'Art. 85': [
            'peças salientes', 'máquinas', 'volantes', 'engrenagens',
            'correias', 'resguardadas', 'proteção de máquinas', 'polias'
        ],
        'Art. 6': [
            'porta de patamar', 'bloqueio', 'fechadura', 'sensor de porta',
            'contacto de porta', 'trinco'
        ],
        'Art. 12': [
            'travão', 'travagem', 'freio', 'sistema de travagem',
            'paragem de emergência'
        ],
        'Art. 35': [
            'iluminação', 'luz de emergência', 'iluminação da cabina',
            'fonte de luz', 'bateria de emergência'
        ],
        'Art. 45': [
            'pára-quedas', 'paraquedas', 'limitador de velocidade',
            'dispositivo de segurança', 'queda livre'
        ],
        'Art. 50': [
            'cabos', 'cabo de tração', 'desgaste', 'fios partidos',
            'suspensão', 'polias', 'tambor'
        ],
        'Art. 18': [
            'alarme', 'comunicação', 'telefone de emergência',
            'intercomunicador', 'botão de alarme'
        ],
        'Art. 25': [
            'documentação', 'manual', 'certificado', 'livro de registo',
            'relatório', 'ficha técnica'
        ],
        'Art. 8': [
            'ucm', 'unidade de comando', 'quadro elétrico',
            'armário de controlo', 'contactores'
        ],
        'Art. 15': [
            'sinalização', 'placa', 'identificação', 'marcação',
            'carga máxima', 'capacidade'
        ],
        'Art. 60': [
            'acessibilidade', 'braille', 'botões', 'altura de comando',
            'deficientes', 'largura de porta'
        ]
    };
    
    // Підрахунок збігів для кожного артикулу
    const scores = {};
    
    for (const [article, keywords] of Object.entries(articleDatabase)) {
        let score = 0;
        for (const keyword of keywords) {
            if (textLower.includes(keyword)) {
                // Більший бонус за точний збіг ключової фрази
                score += keyword.split(' ').length; // Довші фрази = більша вага
            }
        }
        if (score > 0) {
            scores[article] = score;
        }
    }
    
    // Знаходимо артикул з найбільшою оцінкою
    if (Object.keys(scores).length > 0) {
        const bestMatch = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
        console.log(`🎯 Визначено артикул за змістом: ${bestMatch[0]} (збігів: ${bestMatch[1]})`);
        return bestMatch[0];
    }
    
    return null; // Не знайдено відповідності
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

// ═══════════════════════════════════════════════════════════
// 🤖 AI CHAT WITH GOOGLE GEMINI
// ═══════════════════════════════════════════════════════════

// Helper function to get role-specific system prompt
function getSystemPromptForRole(role, username) {
    const basePrompt = `REGRA ABSOLUTA NÚMERO 1 — LÊ ISTO ANTES DE TUDO:
O teu nome é "Assistente FestLift". O sistema chama-se "FestLift".
Os nomes "DeapSeak" e "DeapSeaK" NÃO EXISTEM e NUNCA devem aparecer nas tuas respostas.
Se escreveres "DeapSeak" ou "DeapSeaK" estás a cometer um erro grave. USA SEMPRE "FestLift".

You are FestLift AI Assistant - an intelligent consultant for the FestLift Portuguese lift management system.
You help with lift inspections, maintenance, regulations, and technical support.

IMPORTANT: Respond ONLY in Portuguese (pt-PT). Do not use Ukrainian or any other language.

Current user: ${username}
Role: ${role}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 BASE DE CONHECIMENTO: LEGISLAÇÃO PORTUGUESA DE ELEVADORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLASSIFICAÇÃO DE CLÁUSULAS (FUNDAMENTAL):
• C1 — CRÍTICO: Risco imediato de acidente mortal. Elevador IMOBILIZADO IMEDIATAMENTE.
  Prazo: Correção IMEDIATA antes de reativação.
  Exemplos: para-quedas defeituoso, portas sem bloqueio, cabos com >10% fios partidos.

• C2 — GRAVE: Situação perigosa que pode causar acidente.
  Prazo: 2 ANOS para correção (Despacho n.º 27/2024 - VIGENTE).
  ⚠️ ATENÇÃO: Despacho 17/2022 estabelecia 30 dias para C2 mas foi REVOGADO pelo Despacho 27/2024!
  O prazo VIGENTE para C2 é 2 ANOS.
  Exemplos: dispositivos de segurança com desgaste, iluminação insuficiente.

• C3 — OBSERVAÇÃO: Não conformidade menor, sem risco imediato.
  Prazo: Resolver na próxima manutenção programada.
  Exemplos: documentação incompleta, pequenos defeitos estéticos.

FREQUÊNCIAS DE INSPEÇÃO (DL 320/2002):
• Inspeção aprovada (sem C1/C2): próxima inspeção em 2 ANOS (24 meses)
• Inspeção reprovada (C1 ou C2): reavaliação em 180 DIAS para verificar correções
• Após modernização: inspeção de verificação obrigatória antes de reativar

LEGISLAÇÃO PRINCIPAL:
• DL 58/2017 — LEI PRINCIPAL para ascensores NOVOS. Transpõe Diretiva 2014/33/UE. Coordenado pela DGEG. Fiscalização pelo ASAE.
  ⚠️ NÃO confundir com DL 103/2008 que se aplica a monta-cargas/escadas (Diretiva Máquinas)
• DL 320/2002 — Regime de manutenção e inspeção periódica obrigatória (após entrada em serviço)
  Câmaras municipais têm competência de fiscalização das inspeções periódicas
• Lei 65/2013 — Regime das EMIE (Empresas de Manutenção de Instalações de Elevação) e EIIE (Entidades Inspetoras). Reconhecimento e controlo pela DGEG.
• Decreto 513/70 — Regulamento base de instalação de elevadores
• DR 13/80 — Requisitos técnicos construtivos
• Despacho 27/2024 — VIGENTE: Prazos C2 = 2 anos (revoga Despacho 17/2022)
• EN 81-20:2020 + EN 81-50:2020 — Normas europeias de segurança (substituem EN 81-1 e EN 81-2)
• Circular IPAC 06/2025 — Metodologias de inspeção de modificações

AUTORIDADES COMPETENTES:
• DGEG (Direção-Geral de Energia e Geologia) — coordena DL 58/2017, reconhece EMIE/EIIE
• ASAE — fiscalização de mercado (ascensores novos)
• Câmaras Municipais — fiscalização de inspeções periódicas (DL 320/2002)
• DGAE — coordena DL 103/2008 (monta-cargas/escadas mecânicas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 SISTEMA FESTLIFT — ESTRUTURA E FUNCIONALIDADES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAINEL ADMIN (pages/admin/):
• Dashboard — visão geral: estatísticas de elevadores, pedidos pendentes, alertas
• Lifts (lifts.html) — gestão completa do parque de elevadores: adicionar, editar, ver estado
• Users (users.html) — gestão de utilizadores, atribuição de papéis (admin/dispatcher/tech/client)
• Role Manager (role-manager.html) — permissões e papéis do sistema
• Reports (reports.html) — relatórios de inspeção, geração e envio por email
• Orçamentos (orcamentos-list.html) — lista e gestão de orçamentos/propostas
• Requests (requests.html) — pedidos de serviço dos clientes
• Analytics (analytics-dashboard.html) — gráficos e KPIs do sistema
• Maps (maps.html) — mapa geográfico dos elevadores
• QR Management (qr-management.html) — gestão de QR codes dos elevadores
• Predictive Maintenance (predictive-maintenance.html) — análise preditiva com AI
• Notifications (notifications.html) — alertas e notificações do sistema
• Audit Log (audit-log.html) — registo de todas as ações

PAINEL DISPATCHER (pages/dispatcher/):
• Dashboard — tarefas do dia, técnicos disponíveis, mapa de atribuições
• Assignments (assignments.html) — atribuir técnicos a inspeções/reparações
• Calendar (calendar.html) — calendário de inspeções e manutenções
• Lifts (lifts.html) — estado dos elevadores, histórico de intervenções
• Technicians (technicians.html) — lista de técnicos, disponibilidade, localização
• Monitoring (monitoring.html) — monitorização em tempo real
• Maps (maps.html) — mapa com localização de técnicos e elevadores
• Clients (clients.html) — lista de clientes/edifícios
• Reports (reports.html) — relatórios por técnico/período
• Orçamentos (orcamentos-list.html) — orçamentos em curso

PAINEL TÉCNICO (pages/tech/):
• Dashboard — tarefas atribuídas hoje, próximas inspeções
• Tasks (tasks.html) — lista de tarefas: inspeções, reparações, manutenções
• Inspections (inspections.html) — formulário de inspeção com checklist C1/C2/C3
• Schedule (schedule.html) — agenda pessoal do técnico
• QR Scanner (qr-scanner.html) — ler QR code do elevador para acesso rápido à ficha
• Checklists (checklists.html) — checklists de manutenção preventiva
• Manuals (manuals.html) — manuais técnicos por fabricante/modelo
• Knowledge Base (knowledge-base.html) — base de conhecimento técnico
• Reports (reports.html) — gerar relatório de inspeção após visita
• AR Helper (ar-helper.html) — assistente de realidade aumentada
• Task Map (task-map.html) — mapa das tarefas do dia

PAINEL CLIENTE (pages/client/):
• Dashboard — estado dos seus elevadores, próximas inspeções, alertas ativos
• My Lifts (my-lifts.html) — lista dos elevadores do cliente com estado e histórico
• History (history.html) — histórico completo de inspeções e intervenções
• Requests (requests.html) — criar pedidos de serviço/urgência
• Tickets (tickets.html) — acompanhar estado dos pedidos
• Invoices (invoices.html) — faturas e orçamentos aprovados
• Documentation (documentation.html) — documentos técnicos dos elevadores
• Notifications (notifications.html) — alertas de prazos, inspeções, etc.
• Support (support.html) — contacto direto com FestLift
• AI Predictions (ai-predictions.html) — previsões de manutenção com AI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 AVARIAS TÍPICAS DE ELEVADORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AVARIAS MECÂNICAS:
• Cabos de suspensão — desgaste, fios partidos (>10% = C1), elongação excessiva
• Para-quedas — desgaste ou falha no acionamento (sempre C1)
• Guias e patilhas — desgaste, desalinhamento, ruídos
• Amortecedores — deformação permanente, perda de fluido hidráulico
• Motor de tração — sobreaquecimento, vibrações, consumo elevado
• Freio eletromagnético — desgaste das pastilhas, folga excessiva (C1 se não travar)

AVARIAS ELÉTRICAS/ELETRÓNICAS:
• Fechaduras de portas (contatos) — falha no bloqueio ou deteção (frequente, C1 se porta abre com cabine em movimento)
• Botoneiras — botões sem resposta, display apagado
• Painel de controlo — erros de programação, fusíveis queimados
• Sistema de nivelação — paragem acima/abaixo do andar (>20mm = risco de queda)
• Iluminação da cabine — lâmpadas fundidas (C2 se sem emergência)
• Telefone de emergência — inoperacional (C2)
• Intercomunicador — falha na comunicação com exterior

AVARIAS HIDRÁULICAS (elevadores hidráulicos):
• Fuga de óleo no cilindro — perda de altura, contaminação ambiental
• Válvula de descida — descida descontrolada (C1)
• Bomba hidráulica — ruído excessivo, pressão insuficiente
• Acumulador — perda de pressão

SINTOMAS COMUNS E CAUSAS PROVÁVEIS:
• Elevador para entre andares → contacto de porta, sobrecarga, fusível
• Porta não fecha → obstáculo, fotocélula suja, folga excessiva na fechadura
• Ruído excessivo → guias secas, rolamentos desgastados, cabos mal tensionados
• Solavanco na paragem → calibração do freio, nivelador
• Elevador desce lentamente → óleo frio (hidráulico), contrapeso desajustado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ CONSEQUÊNCIAS LEGAIS DE INCUMPRIMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NÃO CORRIGIR C1 (incumprimento imediato):
• Crime de exposição a perigo (Código Penal, art.º 291.º) se mantiver elevador em serviço
• Responsabilidade civil ilimitada por danos a terceiros (DL 363/91 — responsabilidade do produtor/operador)
• Seguro de responsabilidade civil VOID — seguradora pode recusar indemnização
• Câmara Municipal pode ordenar selagem imediata do elevador e multa entre €2.500 e €44.000 (DL 320/2002, art.º 42.º)
• Proprietário do edifício assume responsabilidade pessoal por qualquer acidente

NÃO CORRIGIR C2 NO PRAZO DE 2 ANOS (Despacho 27/2024):
• Na inspeção seguinte, C2 não corrigida torna-se automaticamente fundamento de reprovação com prazo reduzido
• Câmara Municipal pode interditar o uso do elevador
• Coima entre €500 e €3.740 (pessoa singular) ou €2.500 e €44.000 (pessoa coletiva) — DL 320/2002
• Seguro pode cobrir sinistro mas com direito de regresso contra o proprietário

NÃO REALIZAR INSPEÇÃO PERIÓDICA (DL 320/2002):
• Coima nos mesmos limites acima
• Elevador considerado "sem certificação" — responsabilidade agravada em caso de acidente
• EIIE acreditada pode recusar-se a realizar inspeção se elevador apresentar riscos óbvios

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 REGRAS:
1. Es um CONSULTOR — podes EXPLICAR e ORIENTAR, nunca modificar dados no sistema
2. PRIVACIDADE — nunca revelar dados de outros clientes
3. Responde SEMPRE em Português (pt-PT)
4. Cita sempre os artigos e decretos-lei específicos nas respostas
5. O sistema chama-se SEMPRE "FestLift" — NUNCA uses "DeapSeak" ou "DeapSeaK"`;

    const roleSpecific = {
        admin: `\n\n👨‍💼 ADMINISTRATOR CONTEXT:
You assist the system administrator with:
- System overview and analytics interpretation
- Regulatory compliance guidance
- User management best practices
- Technical documentation standards

Remember: Even as admin assistant, you cannot modify data. Guide them to use the proper admin interface.
Respond in Portuguese only.`,
        
        dispatcher: `\n\n📞 DISPATCHER CONTEXT:
You assist the dispatcher with:
- Technician coordination strategies
- Priority management guidance
- Inspection scheduling best practices
- Emergency response protocols

Remember: You provide guidance. They use the system interface for actual assignments.
Respond in Portuguese only.`,
        
        tech: `\n\n🔧 TECHNICIAN CONTEXT:
You assist technicians with:
- Repair procedures and troubleshooting
- Safety protocols (NR-12, PT regulations)
- Technical specifications (motors, cables, brakes)
- Diagnostic methods for common issues
- Part compatibility and sourcing

You can search internet for:
- Manufacturer manuals
- Technical diagrams
- Safety bulletins
- Industry best practices

Respond in Portuguese only.`,
        
        client: `\n\n👤 CLIENT CONTEXT:
You assist building owners/managers with:
- Understanding inspection reports in plain non-technical language
- Knowing exactly what each C1/C2/C3 clause means and their legal deadlines
- Maintenance planning and cost estimation
- Legal obligations and consequences of non-compliance

When analyzing a report uploaded by the client, for each clause explain:
1. O que significa na prática (em linguagem simples, sem jargão técnico)
2. O risco para os utilizadores do edifício se não for corrigido
3. Quando deve ser corrigido (C1=imediatamente, C2=2 anos, C3=próxima manutenção)
4. As consequências legais de não corrigir dentro do prazo

IMPORTANT: You can ONLY discuss their own lifts. Never reveal data about other clients.
Respond in Portuguese only.`
    };

    return basePrompt + (roleSpecific[role] || roleSpecific.client);
}

// Helper function to call Gemini AI
async function callGeminiAI(message, role, username, regulationsContext = null, reportTextContext = null) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const systemPrompt = getSystemPromptForRole(role, username);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt
        });
        
        let contextualPrompt = '';
        
        // Add regulations context if found
        if (regulationsContext) {
            contextualPrompt += `RELEVANT PORTUGUESE REGULATION:\n` +
                               `Article: ${regulationsContext.article}\n` +
                               `Regulation: ${regulationsContext.regulation}\n` +
                               `Requirement: ${regulationsContext.requirement}\n` +
                               `Description: ${regulationsContext.description}\n` +
                               `Explanation: ${regulationsContext.explanation}\n`;
            
            if (regulationsContext.violations && regulationsContext.violations.length > 0) {
                contextualPrompt += `Common Violations: ${regulationsContext.violations.join(', ')}\n`;
            }
            
            contextualPrompt += `\nPlease explain this regulation in context of the user's question.\n\n`;
        }
        
        // Add PDF report text as context if provided
        if (reportTextContext) {
            const maxChars = 8000; // Gemini context limit safety
            const truncated = reportTextContext.length > maxChars
                ? reportTextContext.substring(0, maxChars) + '\n...(relatório truncado)'
                : reportTextContext;
            contextualPrompt += `INSPECTION REPORT CONTENT (from uploaded PDF):\n---\n${truncated}\n---\n\n` +
                `Please analyze this report and answer the user's question about it.\n\n`;
        }
        
        contextualPrompt += `USER QUESTION: ${message}`;
        
        const result = await model.generateContent(contextualPrompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Gemini AI response generated:', text.substring(0, 100) + '...');
        return text;
        
    } catch (error) {
        console.error('❌ Gemini AI error:', error.message);
        
        // Graceful fallback
         if (error.message.includes('API key')) {
             return '⚠️ Sistema de IA temporariamente indisponível.\n\n' +
                 'Entre em contato com o administrador.';
         }
        
         return '❌ Desculpe, ocorreu um erro ao processar sua pergunta.\n\n' +
             'Tente novamente ou reformule sua pergunta.';
    }
}

// ─── AI GUEST ENDPOINT (без авторизації, IP-ліміт 2 аналізи + 20 чат/добу) ──
const _guestAiUsage = new Map(); // ip → { reports, chat, resetAt }
const _GUEST_REPORT_LIMIT = 2;
const _GUEST_CHAT_LIMIT   = 20;

function _getGuestUsage(ip) {
    const entry = _guestAiUsage.get(ip);
    const now = Date.now();
    if (!entry || entry.resetAt < now) {
        return { reports: 0, chat: 0, resetAt: now + 24 * 60 * 60 * 1000 };
    }
    return entry;
}

// Helper: call Gemini with fallback model on 503
async function _callGuestGemini(prompt) {
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];
    let lastErr;
    for (const modelName of models) {
        try {
            const m = genAI.getGenerativeModel({ model: modelName });
            const result = await m.generateContent(prompt);
            return result.response.text();
        } catch (err) {
            lastErr = err;
            if (!err.message.includes('503') && !err.message.includes('429') && !err.message.includes('overloaded') && !err.message.includes('high demand')) throw err;
            console.warn(`⚠️ Model ${modelName} unavailable, trying next...`);
        }
    }
    throw lastErr;
}

// POST /api/ai/guest-analyze — аналіз звіту (ліміт 2/добу)
app.post('/api/ai/guest-analyze', async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
        const usage = _getGuestUsage(ip);

        if (usage.reports >= _GUEST_REPORT_LIMIT) {
            return res.status(429).json({
                success: false, limitReached: true,
                message: `Limite gratuito atingido (${_GUEST_REPORT_LIMIT} análises/dia). Registe-se para acesso ilimitado.`
            });
        }

        const { reportText } = req.body;
        if (!reportText || reportText.trim().length < 30) {
            return res.status(400).json({ success: false, message: 'Forneça pelo menos 30 caracteres para análise.' });
        }

        usage.reports += 1;
        _guestAiUsage.set(ip, usage);

        if (!process.env.GEMINI_API_KEY) {
            return res.json({ success: true, data: {
                response: '⚠️ Serviço de IA temporariamente indisponível. Contacte o administrador.',
                usedReports: usage.reports, remainingReports: Math.max(0, _GUEST_REPORT_LIMIT - usage.reports)
            }});
        }

        const prompt = `És um especialista em manutenção de elevadores para a FestLift (Portugal).
Analisa o seguinte relatório de inspeção/manutenção de elevador e fornece:
1. Resumo das principais conclusões
2. Problemas de segurança detectados (se existirem)
3. Ações recomendadas com prioridade

Responde sempre em Português Europeu (pt-PT), de forma clara e estruturada. Máximo 350 palavras.

RELATÓRIO:
---
${reportText.substring(0, 6000)}
---`;

        const text = await _callGuestGemini(prompt);
        res.json({ success: true, data: {
            response: text,
            usedReports: usage.reports,
            remainingReports: Math.max(0, _GUEST_REPORT_LIMIT - usage.reports)
        }});
    } catch (error) {
        console.error('❌ Guest AI analyze error:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao analisar. Tente novamente mais tarde.' });
    }
});

// POST /api/ai/guest-chat — chat para convidados (ліміт 20 msg/добу)
app.post('/api/ai/guest-chat', async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
        const usage = _getGuestUsage(ip);

        if (usage.chat >= _GUEST_CHAT_LIMIT) {
            return res.status(429).json({
                success: false, limitReached: true,
                message: `Limite de ${_GUEST_CHAT_LIMIT} mensagens gratuitas atingido. Registe-se para acesso ilimitado.`
            });
        }

        const { message } = req.body;
        if (!message || message.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Mensagem inválida.' });
        }

        usage.chat += 1;
        _guestAiUsage.set(ip, usage);

        if (!process.env.GEMINI_API_KEY) {
            return res.json({ success: true, data: {
                response: '⚠️ Serviço de IA temporariamente indisponível.',
                usedChat: usage.chat, remainingChat: Math.max(0, _GUEST_CHAT_LIMIT - usage.chat)
            }});
        }

        const prompt = `És o assistente de IA da FestLift, especialista em elevadores em Portugal.
Conheces as normas portuguesas: DL 295/98, NP EN 81, IPAC, regulamentos de inspeção.
Responde sempre em Português Europeu (pt-PT), de forma clara e útil. Máximo 200 palavras por resposta.
Nota: Este utilizador é um visitante (modo demonstração) — podes responder a perguntas gerais sobre elevadores, manutenção, normas e como o sistema FestLift funciona.

PERGUNTA: ${message.substring(0, 1000)}`;

        const text = await _callGuestGemini(prompt);
        res.json({ success: true, data: {
            response: text,
            usedChat: usage.chat, remainingChat: Math.max(0, _GUEST_CHAT_LIMIT - usage.chat)
        }});
    } catch (error) {
        console.error('❌ Guest AI chat error:', error.message);
        res.status(500).json({ success: false, message: 'Erro no serviço de IA. Tente novamente.' });
    }
});



// AI Chat endpoint
app.post('/api/ai/chat', authenticateToken, aiLimiter, async (req, res) => {
    try {
        const { message, context } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const username = req.user.email || req.user.username;
        const role = req.user.role || 'client';
        
        console.log(`🤖 AI Chat request from ${username} (${role}):`, message.substring(0, 100));
        
        // Перевірка чи це звіт інспекції
        if (context && context.reportText) {
            console.log('📋 Report context provided — sending to Gemini for contextual Q&A...');
            // Pass report text to Gemini so it can answer questions about it
            response = await callGeminiAI(message, role, username, null, context.reportText);
            return res.json({
                success: true,
                data: {
                    response,
                    timestamp: new Date().toISOString(),
                    powered_by: 'Google Gemini (report context)',
                    role: role
                }
            });
        }

        let response = '';
        const lowerMessage = message.toLowerCase();
        
        // STEP 1: SEARCH IN REGULATIONS DATABASE FIRST
        console.log('🔍 Searching regulations database...');
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
                                violations: point.common_violations || [],
                                officialSource: reg.official_source || null
                            };
                            break;
                        }
                    }
                    if (foundInRegulations) break;
                }
            }
            if (foundInRegulations) break;
        }
        
        // STEP 2: USE GEMINI AI WITH REGULATIONS CONTEXT
        if (foundInRegulations) {
            console.log(`📖 Found regulation: ${foundInRegulations.article}`);
            // Ask Gemini to explain the regulation in context
            response = await callGeminiAI(message, role, username, foundInRegulations);
        } else {
            console.log('💡 No specific regulation found, using general AI');
            // General AI response without specific regulation
            response = await callGeminiAI(message, role, username);
        }

        // STEP 3: RETURN AI RESPONSE
        res.json({
            success: true,
            data: {
                response,
                timestamp: new Date().toISOString(),
                powered_by: 'Google Gemini 1.5 Flash',
                role: role
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

// ═══════════════════════════════════════════════════════════
// 🔧 OLD KEYWORD-BASED RESPONSES ARCHIVED BELOW
// ═══════════════════════════════════════════════════════════
// This code was replaced with Gemini AI integration above
// Kept as reference for regulation keywords and topics
/*
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
                                violations: point.common_violations,
                                officialSource: reg.official_source || null
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
                
                // Add official source link
                if (specificArticle.officialSource) {
                    response += `\n\n📜 **Офіційний текст закону / Texto oficial:**\n` +
                               `${specificArticle.officialSource}`;
                }
            } else {
                // General response with all regulations
                const regList = portugueseRegulations.regulations.map(r => {
                    let line = `• **${r.number}** (${r.date.split('-')[0]}) - ${r.title}`;
                    if (r.official_source) {
                        line += `\n  📜 [Texto oficial](${r.official_source})`;
                    }
                    return line;
                }).join('\n\n');
                
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
            response = `👋 Olá! Sou o assistente FestLift. / Вітаю! Я AI Асистент FestLift.\n\n` +
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
*/
// End of archived keyword-based responses

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
                    `• Prazo: Definido pelo inspetor (30-90 dias típico)\n` +
                    `• ⚠️ Despacho 17/2022 (2 anos) REVOGADO em 24/09/2024\n\n` +
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
                    `• C2 (Moderado): Prazo definido pelo inspetor (30-90 dias)\n` +
                    `• C3 (Leve): Até próxima inspeção periódica\n` +
                    `• ⚠️ Despacho 17/2022 REVOGADO pelo 27/2024\n\n` +
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

// ═══════════════════════════════════════════════════════════
// 🤖 AI KNOWLEDGE BASE - Portuguese Laws Q&A
// ═══════════════════════════════════════════════════════════
// NEW: Advanced legal consultation with 12 Portuguese laws
const AIKnowledgeBase = require('./services/ai-knowledge-base');

app.post('/api/ai/law-question', authenticateToken, async (req, res) => {
    try {
        const { question } = req.body;
        
        if (!question) {
            return res.status(400).json({
                success: false,
                message: 'Pergunta é obrigatória'
            });
        }

        console.log('⚖️ Law question:', question, 'from', req.user.username);

        // Load and query AI knowledge base
        const kb = await AIKnowledgeBase.load();
        const result = await kb.answerQuestion(question);

        res.json({
            success: true,
            data: {
                question,
                answer: result.answer,
                confidence: result.confidence,
                sources: result.sources,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ AI law question error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar pergunta legal: ' + error.message
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

// ═══════════════════════════════════════════════════════════
// 🔌 BACKEND API ROUTES - Підключення всіх маршрутів
// ═══════════════════════════════════════════════════════════

// 🔐 Auth Routes (login, register, profile) + User Management
const authRoutes = require('./backend/routes/authRoutes');
app.use('/api/auth/login', loginLimiter);    // loginLimiter тільки для login
app.use('/api/auth/register', loginLimiter); // і register (захист від brute-force)
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes); // authRoutes містить /users endpoints

// 🏢 Lift Routes (CRUD операції з ліфтами)
const liftRoutes = require('./backend/routes/liftRoutes');
app.use('/api/lifts', liftRoutes);

// 📋 Request Routes (заявки, завдання, інспекції)
const requestRoutes = require('./backend/routes/requestRoutes');
app.use('/api/requests', requestRoutes);

// ⚙️ Settings Routes (налаштування системи)
const settingsRoutes = require('./backend/routes/settingsRoutes');
app.use('/api/settings', settingsRoutes);

// Register User model in root mongoose so .populate('criadoPor') works.
// backend/models/User.js uses backend/node_modules/mongoose (separate instance).
if (!mongoose.modelNames().includes('User')) {
    mongoose.model('User', new mongoose.Schema({}, { strict: false }));
}

// 📊 Orçamentos Routes (кошториси, пропозиції)
const orcamentosRoutes = require('./backend/routes/orcamentos');
app.use('/api/orcamentos', orcamentosRoutes);

console.log('✅ Backend API routes підключено:');
console.log('   - /api/auth (login, register, profile)');
console.log('   - /api/users (через authRoutes)');
console.log('   - /api/lifts (CRUD ліфтів)');
console.log('   - /api/requests (завдання, інспекції)');
console.log('   - /api/settings (налаштування)');
console.log('   - /api/orcamentos (кошториси)');

// 🔧 Global Error Handler - ВАЖЛИВО: має бути ПІСЛЯ всіх роутів
const { errorHandler } = require('./backend/middleware/errorHandler');

// ═══════════════════════════════════════════════════════════
// 📄 INVOICES API - Рахунки (заглушка до реалізації)
// ═══════════════════════════════════════════════════════════
app.get('/api/invoices', authenticateToken, async (req, res) => {
    res.json({ success: true, data: [] });
});

// ═══════════════════════════════════════════════════════════
// 🔧 MAINTENANCE HISTORY API - Повна історія обслуговування
// ═══════════════════════════════════════════════════════════
app.get('/api/maintenance-history', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const userId = req.user.id || req.user.userId;
        const userRole = req.user.role;

        // Будуємо запит в залежності від ролі
        let liftFilter = {};
        if (userRole === 'client') {
            // Клієнт бачить тільки свої ліфти
            const clientLifts = await db.collection('lifts').find(
                { $or: [{ client: userId }, { clientId: userId }, { 'client._id': userId }] },
                { projection: { _id: 1, model: 1, location: 1, address: 1 } }
            ).toArray();
            const liftIds = clientLifts.map(l => l._id.toString());
            if (liftIds.length === 0) {
                return res.json([]);
            }
            liftFilter = { liftId: { $in: liftIds } };
        } else if (userRole === 'technician' || userRole === 'tech') {
            // Технік бачить тільки свої завдання
            liftFilter = { $or: [
                { technician: userId },
                { technicianId: userId },
                { assignedTo: userId }
            ]};
        }
        // admin та dispatcher бачать усе

        // Отримуємо завершені та в процесі запити
        const requests = await db.collection('requests').find({
            ...liftFilter
        }).sort({ createdAt: -1 }).limit(500).toArray();

        // Завантажуємо ліфти для join
        const liftIds = [...new Set(requests.map(r => r.liftId).filter(Boolean))];
        const lifts = {};
        if (liftIds.length > 0) {
            const liftDocs = await db.collection('lifts').find({
                $or: [
                    { _id: { $in: liftIds.map(id => { try { return new ObjectId(id); } catch(e) { return null; } }).filter(Boolean) } },
                    { _id: { $in: liftIds } }
                ]
            }).toArray();
            liftDocs.forEach(l => { lifts[l._id.toString()] = l; });
        }

        // Завантажуємо техніків для join
        const techIds = [...new Set(requests.map(r => r.technician || r.technicianId || r.assignedTo).filter(Boolean))];
        const techs = {};
        if (techIds.length > 0) {
            const techDocs = await db.collection('users').find({
                $or: [
                    { _id: { $in: techIds.map(id => { try { return new ObjectId(id); } catch(e) { return null; } }).filter(Boolean) } }
                ]
            }).toArray();
            techDocs.forEach(u => { techs[u._id.toString()] = u; });
        }

        // Маппінг у формат очікуваний history-manager.js
        const history = requests.map(req => {
            const lift = lifts[req.liftId] || {};
            const techId = req.technician || req.technicianId || req.assignedTo || '';
            const tech = techs[techId] || {};
            const firstName = tech.firstName || tech.name || '';
            const lastName = tech.lastName || '';
            const techName = (firstName + ' ' + lastName).trim() || tech.username || tech.email || techId;

            return {
                id: req._id.toString(),
                type: req.type || 'maintenance',
                date: req.completedAt || req.updatedAt || req.createdAt,
                liftId: req.liftId || '',
                lift: lift.model || lift.serialNumber || 'N/A',
                location: lift.address || lift.location || lift.building || '',
                technician: techName,
                status: req.status || 'completed',
                description: req.description || req.title || '',
                duration: req.duration || null,
                cost: req.cost || null,
                rating: req.rating || null,
                details: req.details || req.notes || req.workDone || ''
            };
        });

        res.json(history);
    } catch (error) {
        console.error('❌ Помилка maintenance-history:', error);
        res.status(500).json({ success: false, message: 'Помилка отримання історії обслуговування' });
    }
});

app.use(errorHandler);
console.log('✅ Global error handler підключено');

// ═══════════════════════════════════════════════════════════
// 📊 ORÇAMENTOS API (LEGACY) - Старі endpoints для сумісності
// ═══════════════════════════════════════════════════════════
/*
// LEGACY - ці endpoints закоментовані, використовується backend/routes/orcamentos.js
app.get('/api/orcamentos', authenticateToken, async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search } = req.query;
        
        const query = {};
        
        if (status) query.status = status;
        
        if (search) {
            query.$or = [
                { numero: new RegExp(search, 'i') },
                { 'cliente.nome': new RegExp(search, 'i') },
                { 'cliente.email': new RegExp(search, 'i') }
            ];
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const orcamentos = await db.collection('orcamentos')
            .find(query)
            .sort({ data: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();
        
        const total = await db.collection('orcamentos').countDocuments(query);
        
        res.json({
            success: true,
            data: orcamentos,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar orçamentos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar orçamentos',
            error: error.message
        });
    }
});

// GET /api/orcamentos/next-number - Obter próximo número disponível (ПЕРЕД :id!)
app.get('/api/orcamentos/next-number', authenticateToken, async (req, res) => {
    try {
        const ano = new Date().getFullYear();
        const mes = String(new Date().getMonth() + 1).padStart(2, '0');
        
        const ultimoOrcamento = await db.collection('orcamentos')
            .find({ numero: new RegExp(`^ORC-${ano}-${mes}`) })
            .sort({ numero: -1 })
            .limit(1)
            .toArray();
        
        let sequencia = 1;
        if (ultimoOrcamento.length > 0) {
            const match = ultimoOrcamento[0].numero.match(/ORC-\d{4}-\d{2}-(\d{3})/);
            if (match) sequencia = parseInt(match[1]) + 1;
        }
        
        const numero = `ORC-${ano}-${mes}-${String(sequencia).padStart(3, '0')}`;
        
        res.json({
            success: true,
            numero,
            proximaSequencia: sequencia
        });
    } catch (error) {
        console.error('❌ Erro ao gerar próximo número:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar próximo número',
            error: error.message
        });
    }
});

// GET /api/orcamentos/:id - Detalhe do orçamento
app.get('/api/orcamentos/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const orcamento = await db.collection('orcamentos')
            .findOne({ _id: new ObjectId(req.params.id) });
        
        if (!orcamento) {
            return res.status(404).json({
                success: false,
                message: 'Orçamento não encontrado'
            });
        }
        
        res.json({ success: true, data: orcamento });
    } catch (error) {
        console.error('❌ Erro ao buscar orçamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar orçamento',
            error: error.message
        });
    }
});

// POST /api/orcamentos - Criar novo orçamento
app.post('/api/orcamentos', authenticateToken, async (req, res) => {
    try {
        const { cliente, servicos, subtotal, iva, total, notas } = req.body;
        
        // Validação
        if (!cliente || !cliente.nome || !cliente.email || !cliente.morada) {
            return res.status(400).json({
                success: false,
                message: 'Dados do cliente incompletos'
            });
        }
        
        if (!servicos || servicos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Pelo menos um serviço é obrigatório'
            });
        }
        
        // Gerar número automático (ORC-2024-12-001)
        const ano = new Date().getFullYear();
        const mes = String(new Date().getMonth() + 1).padStart(2, '0');
        
        const ultimoOrcamento = await db.collection('orcamentos')
            .find({ numero: new RegExp(`^ORC-${ano}-${mes}`) })
            .sort({ numero: -1 })
            .limit(1)
            .toArray();
        
        let sequencia = 1;
        if (ultimoOrcamento.length > 0) {
            const match = ultimoOrcamento[0].numero.match(/ORC-\d{4}-\d{2}-(\d{3})/);
            if (match) sequencia = parseInt(match[1]) + 1;
        }
        
        const numero = `ORC-${ano}-${mes}-${String(sequencia).padStart(3, '0')}`;
        
        // Calcular validade (30 dias)
        const data = new Date();
        const validadeAte = new Date(data);
        validadeAte.setDate(validadeAte.getDate() + 30);
        
        const orcamento = {
            numero,
            data: data.toISOString(),
            validadeAte: validadeAte.toISOString(),
            cliente,
            servicos,
            subtotal,
            iva,
            total,
            notas,
            status: 'rascunho',
            criadoPor: req.user.username,
            criadoPorId: req.user.id || req.user.userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const result = await db.collection('orcamentos').insertOne(orcamento);
        
        console.log(`✅ Orçamento criado: ${numero} para ${cliente.nome}`);
        
        res.status(201).json({
            success: true,
            message: 'Orçamento criado com sucesso',
            data: { ...orcamento, _id: result.insertedId }
        });
    } catch (error) {
        console.error('❌ Erro ao criar orçamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar orçamento',
            error: error.message
        });
    }
});

// PUT /api/orcamentos/:id - Atualizar orçamento
app.put('/api/orcamentos/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const { cliente, servicos, subtotal, iva, total, notas, status } = req.body;
        
        const updateData = {
            updatedAt: new Date().toISOString()
        };
        
        if (cliente) updateData.cliente = cliente;
        if (servicos) updateData.servicos = servicos;
        if (subtotal !== undefined) updateData.subtotal = subtotal;
        if (iva !== undefined) updateData.iva = iva;
        if (total !== undefined) updateData.total = total;
        if (notas) updateData.notas = notas;
        if (status) updateData.status = status;
        
        const result = await db.collection('orcamentos').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Orçamento não encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Orçamento atualizado com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar orçamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar orçamento',
            error: error.message
        });
    }
});

// DELETE /api/orcamentos/:id - Deletar orçamento
app.delete('/api/orcamentos/:id', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        
        const result = await db.collection('orcamentos').deleteOne({
            _id: new ObjectId(req.params.id)
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Orçamento não encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Orçamento deletado com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao deletar orçamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar orçamento',
            error: error.message
        });
    }
});
*/
// Кінець LEGACY orcamentos endpoints

// ═══════════════════════════════════════════════════════════
// 📧 EMAIL ENDPOINTS - Brevo SMTP Integration
// ═══════════════════════════════════════════════════════════

// POST /api/contact - Публічна форма зворотного зв'язку (без авторизації)
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        // Валідація обов'язкових полів
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Por favor, preencha todos os campos obrigatórios (nome, email, mensagem)'
            });
        }

        // Валідація email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        console.log('📧 =============== CONTACT FORM SUBMISSION ===============');
        console.log('👤 Name:', name);
        console.log('📬 Email:', email);
        console.log('📞 Phone:', phone || 'Não fornecido');
        console.log('💬 Message:', message.substring(0, 100) + '...');

        // Створюємо transporter для Brevo SMTP
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false, // TLS
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Email para адміністраторів FestLift
        const adminEmail = process.env.ADMIN_EMAIL || 'info@festlift.pt';
        
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 3px; }
        .label { font-weight: bold; color: #667eea; }
        .message-box { background: white; padding: 20px; margin-top: 20px; border-radius: 5px; border: 1px solid #ddd; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📨 Nova Mensagem de Contacto</h2>
            <p>Recebida através do website LiftMaster Pro</p>
        </div>
        <div class="content">
            <div class="info-box">
                <p><span class="label">👤 Nome:</span> ${name}</p>
            </div>
            <div class="info-box">
                <p><span class="label">📧 Email:</span> <a href="mailto:${email}">${email}</a></p>
            </div>
            <div class="info-box">
                <p><span class="label">📞 Telefone:</span> ${phone || 'Não fornecido'}</p>
            </div>
            <div class="message-box">
                <p class="label">💬 Mensagem:</p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="footer">
                <p>Este email foi enviado automaticamente através do formulário de contacto do website.</p>
                <p><strong>FestLift - Elevadores e Serviços, Lda.</strong> | info@festlift.pt | Tel: +351 214 190 863 | Móvel: +351 926 380 243/244</p>
                <p>Av. do Parque 84B, Rio de Mouro, Lisboa 2635-609 | NIF: 515924741</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        const mailOptions = {
            from: process.env.SMTP_FROM || '"LiftMaster Pro" <info@festlift.pt>',
            to: adminEmail,
            replyTo: email, // Дозволяє відповісти безпосередньо клієнту
            subject: `📨 Novo Contacto: ${name}`,
            html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        
        console.log('✅ Contact form email sent successfully:', result.messageId);

        return res.json({
            success: true,
            message: 'Mensagem enviada com sucesso! Entraremos em contacto em breve.'
        });

    } catch (error) {
        console.error('❌ Contact form email error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao enviar mensagem. Por favor, tente novamente ou contacte-nos diretamente.',
            error: error.message
        });
    }
});

// POST /api/send-email - Загальний endpoint для відправки email (Admin only)
app.post('/api/send-email', authenticateToken, async (req, res) => {
    try {
        // Перевірка ролі адміністратора
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Доступ заборонено. Тільки адміністратори можуть надсилати email.'
            });
        }

        const { to, subject, html } = req.body;

        // Валідація
        if (!to || !subject || !html) {
            return res.status(400).json({
                success: false,
                error: 'Не вказано обов\'язкові поля: to, subject, html'
            });
        }

        // Валідація email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return res.status(400).json({
                success: false,
                error: 'Невірний формат email'
            });
        }

        console.log('📧 =============== EMAIL SENDING REQUEST ===============');
        console.log('📬 To:', to);
        console.log('📋 Subject:', subject);
        console.log('👤 Requested by:', req.user.email);

        // Відправляємо через emailService (SMTP)
        try {
            await emailService.sendEmail(to, subject, html);
            console.log('✅ Email successfully sent via SMTP to:', to);
            return res.json({
                success: true,
                message: 'Email успішно надіслано'
            });
        } catch (smtpError) {
            console.error('❌ SMTP error:', smtpError);
            return res.status(500).json({
                success: false,
                error: 'Помилка SMTP: ' + smtpError.message
            });
        }

    } catch (error) {
        console.error('❌ Email sending error:', error);
        return res.status(500).json({
            success: false,
            error: 'Помилка надсилання email: ' + error.message
        });
    }
});

// POST /api/email/send-inspection-report - Відправити inspection report
app.post('/api/email/send-inspection-report', authenticateToken, async (req, res) => {
    try {
        const { clientEmail, reportData } = req.body;
        
        if (!clientEmail || !reportData) {
            return res.status(400).json({
                success: false,
                error: 'Email e dados do relatório são obrigatórios'
            });
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Підготовка HTML
        let violationsHTML = '<h3>Deficiências Detectadas:</h3><ul>';
        if (reportData.violations && reportData.violations.length > 0) {
            reportData.violations.forEach(v => {
                const priority = v.classification === 'C1' ? '🔴 CRÍTICO' : 
                                v.classification === 'C2' ? '🟠 MÉDIO' : '🟡 BAIXO';
                violationsHTML += `
                    <li style="margin-bottom: 15px;">
                        <strong>${priority}</strong><br>
                        <strong>Artigo:</strong> ${v.article}<br>
                        <strong>Descrição:</strong> ${v.description}<br>
                        <strong>Consequências:</strong> ${v.consequences}<br>
                        ${v.deadline ? `<strong>Prazo:</strong> ${v.deadline}<br>` : ''}
                    </li>
                `;
            });
        } else {
            violationsHTML += '<li>Nenhuma deficiência encontrada</li>';
        }
        violationsHTML += '</ul>';

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: clientEmail,
            subject: '📋 Relatório de Inspeção - FestLift',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">📋 Relatório de Inspeção</h2>
                    <p>Segue o relatório de inspeção detalhado:</p>
                    ${violationsHTML}
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        Este é um email automático. Para mais informações, contacte FestLift.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`✅ Inspection report sent to ${clientEmail}`);
        res.json({ success: true, message: 'Relatório enviado com sucesso' });
    } catch (error) {
        console.error('❌ Error sending inspection report:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/email/send-critical-alert - Відправити критичний алерт
app.post('/api/email/send-critical-alert', authenticateToken, async (req, res) => {
    try {
        const { clientEmail, violations, liftId } = req.body;
        
        if (!clientEmail || !violations) {
            return res.status(400).json({
                success: false,
                error: 'Email e violações são obrigatórios'
            });
        }

        const criticalViolations = violations.filter(v => v.classification === 'C1');
        
        if (criticalViolations.length === 0) {
            return res.json({ success: true, message: 'Nenhuma deficiência crítica encontrada' });
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        let alertHTML = '<h3>🚨 DEFICIÊNCIAS CRÍTICAS DETECTADAS</h3><ul>';
        criticalViolations.forEach(v => {
            alertHTML += `
                <li style="background: #ffe5e5; padding: 15px; margin-bottom: 10px; border-left: 4px solid #dc3545;">
                    <strong style="color: #dc3545;">🔴 ${v.article}</strong><br>
                    <strong>Descrição:</strong> ${v.description}<br>
                    <strong>Consequências:</strong> ${v.consequences}<br>
                    <strong style="color: #dc3545;">⏰ PRAZO: ${v.deadline || 'IMEDIATO (0-7 dias)'}</strong>
                </li>
            `;
        });
        alertHTML += '</ul>';

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: clientEmail,
            subject: '🚨 ALERTA CRÍTICO - Deficiências C1 Detectadas - FestLift',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0;">🚨 ALERTA CRÍTICO</h2>
                    </div>
                    <div style="padding: 20px; border: 2px solid #dc3545;">
                        <p><strong>Foram detectadas deficiências críticas (C1) que requerem ação imediata!</strong></p>
                        ${liftId ? `<p><strong>Elevador:</strong> ${liftId}</p>` : ''}
                        ${alertHTML}
                        <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-top: 20px;">
                            <p style="margin: 0;"><strong>⚠️ ATENÇÃO:</strong> As deficiências C1 podem resultar em:</p>
                            <ul>
                                <li>Risco de acidentes graves</li>
                                <li>Responsabilidade criminal</li>
                                <li>Multas pesadas</li>
                                <li>Obrigação de desativar o elevador</li>
                            </ul>
                        </div>
                        <p style="margin-top: 20px;"><strong>Contacte FestLift imediatamente para corrigir estas deficiências!</strong></p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`✅ Critical alert sent to ${clientEmail} - ${criticalViolations.length} violations`);
        res.json({ success: true, message: 'Alerta crítico enviado com sucesso' });
    } catch (error) {
        console.error('❌ Error sending critical alert:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/email/send-action-plan - Відправити action plan
app.post('/api/email/send-action-plan', authenticateToken, async (req, res) => {
    try {
        const { clientEmail, actionPlan, liftId } = req.body;
        
        if (!clientEmail || !actionPlan) {
            return res.status(400).json({
                success: false,
                error: 'Email e plano de ação são obrigatórios'
            });
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        let planHTML = '<h3>📋 Plano de Ação Detalhado</h3>';
        
        if (actionPlan.immediate && actionPlan.immediate.length > 0) {
            planHTML += '<h4 style="color: #dc3545;">🚨 Ações Imediatas (0-7 dias)</h4><ol>';
            actionPlan.immediate.forEach(action => {
                planHTML += `<li style="margin-bottom: 10px;">${action}</li>`;
            });
            planHTML += '</ol>';
        }

        if (actionPlan.shortTerm && actionPlan.shortTerm.length > 0) {
            planHTML += '<h4 style="color: #ffc107;">⏰ Ações de Curto Prazo (30 dias)</h4><ol>';
            actionPlan.shortTerm.forEach(action => {
                planHTML += `<li style="margin-bottom: 10px;">${action}</li>`;
            });
            planHTML += '</ol>';
        }

        if (actionPlan.longTerm && actionPlan.longTerm.length > 0) {
            planHTML += '<h4 style="color: #28a745;">📅 Ações de Longo Prazo</h4><ol>';
            actionPlan.longTerm.forEach(action => {
                planHTML += `<li style="margin-bottom: 10px;">${action}</li>`;
            });
            planHTML += '</ol>';
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: clientEmail,
            subject: '📋 Plano de Ação - Correção de Deficiências - FestLift',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">📋 Plano de Ação</h2>
                    ${liftId ? `<p><strong>Elevador:</strong> ${liftId}</p>` : ''}
                    <p>Segue o plano de ação detalhado para correção das deficiências identificadas:</p>
                    ${planHTML}
                    <hr>
                    <p><strong>FestLift está à disposição para executar todas estas correções.</strong></p>
                    <p>Contacte-nos para agendar os trabalhos: <strong>info@festlift.pt</strong></p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`✅ Action plan sent to ${clientEmail}`);
        res.json({ success: true, message: 'Plano de ação enviado com sucesso' });
    } catch (error) {
        console.error('❌ Error sending action plan:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/email/send-orcamento - Відправити orçamento клієнту
app.post('/api/email/send-orcamento', authenticateToken, async (req, res) => {
    try {
        const { orcamentoId, clientEmail } = req.body;
        
        if (!orcamentoId || !clientEmail) {
            return res.status(400).json({
                success: false,
                error: 'ID do orçamento e email são obrigatórios'
            });
        }

        const { ObjectId } = require('mongodb');
        const orcamento = await db.collection('orcamentos').findOne({
            _id: new ObjectId(orcamentoId)
        });

        if (!orcamento) {
            return res.status(404).json({
                success: false,
                error: 'Orçamento não encontrado'
            });
        }

        // ✅ Відправка через SMTP (nodemailer)
        if (!process.env.SMTP_USER) {
            return res.status(500).json({
                success: false,
                error: 'SMTP não configurado — definir SMTP_HOST, SMTP_USER, SMTP_PASS no .env'
            });
        }

        // Gerar HTML do orçamento
        let servicosHTML = '<table style="width: 100%; border-collapse: collapse;"><tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descrição</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Quantidade</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Preço Unit.</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th></tr>';
        
        orcamento.servicos.forEach(s => {
            servicosHTML += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${s.descricao}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${s.quantidade}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€${s.precoUnitario.toFixed(2)}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€${(s.quantidade * s.precoUnitario).toFixed(2)}</td>
                </tr>
            `;
        });
        servicosHTML += '</table>';

        const validadeDate = new Date(orcamento.validadeAte);
        const validadeFormatted = validadeDate.toLocaleDateString('pt-PT', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: clientEmail,
            subject: `Orçamento ${orcamento.numero} - FestLift`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        @media only screen and (max-width: 600px) {
                            .container { width: 100% !important; padding: 10px !important; }
                            .header { padding: 20px 10px !important; }
                            .content { padding: 15px !important; }
                            .footer { padding: 15px 10px !important; }
                            table { font-size: 14px !important; }
                            h1 { font-size: 22px !important; }
                            h2 { font-size: 18px !important; }
                            h3 { font-size: 16px !important; }
                            .bank-info { font-size: 12px !important; word-break: break-all; }
                            .price-cell { white-space: nowrap; }
                        }
                    </style>
                </head>
                <body style="margin: 0; padding: 0; background: #f5f5f5;">
                    <div class="container" style="font-family: Arial, sans-serif; max-width: 700px; margin: 20px auto; border: 1px solid #ddd; background: white;">
                        <div class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px;">FestLift - Elevadores e Serviços, Lda.</h1>
                            <p style="margin: 5px 0 0 0; font-size: 14px;">Manutenção de Elevadores</p>
                        </div>
                        
                        <div class="content" style="padding: 30px;">
                            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin: 0 0 20px 0;">
                                Orçamento ${orcamento.numero}
                            </h2>
                            
                            <div style="margin: 20px 0; line-height: 1.6;">
                                <p style="margin: 5px 0;"><strong>Cliente:</strong> ${orcamento.cliente.nome}</p>
                                <p style="margin: 5px 0; word-break: break-word;"><strong>Email:</strong> ${orcamento.cliente.email}</p>
                                ${orcamento.cliente.telefone ? `<p style="margin: 5px 0;"><strong>Telefone:</strong> ${orcamento.cliente.telefone}</p>` : ''}
                                ${orcamento.cliente.morada ? `<p style="margin: 5px 0;"><strong>Morada:</strong> ${orcamento.cliente.morada}</p>` : ''}
                            </div>

                            <div style="margin: 20px 0; line-height: 1.6;">
                                <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date(orcamento.data).toLocaleDateString('pt-PT')}</p>
                                <p style="margin: 5px 0;"><strong>Validade:</strong> ${validadeFormatted}</p>
                            </div>

                            <h3 style="color: #667eea; margin: 30px 0 15px 0;">Serviços</h3>
                            <div style="overflow-x: auto;">
                                ${servicosHTML}
                            </div>

                            <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                                <table style="width: 100%; font-size: 16px; border-collapse: collapse;">
                                    <tr>
                                        <td style="text-align: right; padding: 8px 5px;"><strong>Subtotal:</strong></td>
                                        <td class="price-cell" style="text-align: right; padding: 8px 5px; width: 100px; white-space: nowrap;">€${orcamento.subtotal.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right; padding: 8px 5px;"><strong>IVA (23%):</strong></td>
                                        <td class="price-cell" style="text-align: right; padding: 8px 5px; white-space: nowrap;">€${orcamento.iva.toFixed(2)}</td>
                                    </tr>
                                    <tr style="border-top: 2px solid #667eea;">
                                        <td style="text-align: right; padding: 12px 5px 8px 5px;"><strong style="font-size: 18px; color: #667eea;">TOTAL:</strong></td>
                                        <td class="price-cell" style="text-align: right; padding: 12px 5px 8px 5px; white-space: nowrap;"><strong style="font-size: 18px; color: #667eea;">€${orcamento.total.toFixed(2)}</strong></td>
                                    </tr>
                                </table>
                            </div>

                            ${orcamento.notas ? `
                                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                                    <strong>Notas:</strong><br>
                                    ${orcamento.notas}
                                </div>
                            ` : ''}

                            <div style="margin-top: 30px; padding: 20px; background: #e7f3ff; border-radius: 8px;">
                                <h4 style="margin: 0 0 15px 0; color: #0066cc;">💳 Dados Bancários</h4>
                                <p style="margin: 8px 0; font-size: 14px; line-height: 1.6;">
                                    <strong>Banco BPI</strong><br>
                                    <span class="bank-info" style="font-family: 'Courier New', monospace; font-size: 13px; display: inline-block; word-break: break-all;">
                                        IBAN: <strong>PT50 0010 0000 5854 8320 0015 4</strong>
                                    </span>
                                </p>
                                <p style="margin: 15px 0 5px 0; color: #666; font-size: 12px;">
                                    ⏰ <strong>Válido até ${validadeFormatted}</strong>
                                </p>
                            </div>
                        </div>

                        <div class="footer" style="background: #f8f9fa; padding: 25px 20px; text-align: center; border-top: 1px solid #ddd;">
                            <p style="margin: 0 0 10px 0; font-size: 15px; color: #333; font-weight: bold;">
                                FestLift - Elevadores e Serviços, Lda.
                            </p>
                            <p style="margin: 8px 0; font-size: 13px; color: #666; line-height: 1.8;">
                                <strong>Av. do Parque 84B</strong><br>
                                Rio de Mouro, Lisboa 2635-609<br>
                                <strong>NIF:</strong> 515924741
                            </p>
                            <p style="margin: 8px 0; font-size: 13px; color: #666; line-height: 1.6;">
                                📞 <a href="tel:+351214190863" style="color: #667eea; text-decoration: none;">+351 214 190 863</a><br>
                                📱 <a href="tel:+351926380243" style="color: #667eea; text-decoration: none;">+351 926 380 243</a> / 
                                <a href="tel:+351926380244" style="color: #667eea; text-decoration: none;">244</a><br>
                                📧 <a href="mailto:info@festlift.pt" style="color: #667eea; text-decoration: none;">info@festlift.pt</a><br>
                                🌐 <a href="https://festlift.pt" style="color: #667eea; text-decoration: none;">festlift.pt</a>
                            </p>
                            <p style="margin: 12px 0 0 0; font-size: 11px; color: #999;">
                                Este orçamento foi gerado automaticamente
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        // Відправити через emailService (SMTP)
        await emailService.sendEmail(clientEmail, mailOptions.subject, mailOptions.html);
        
        // Atualizar orçamento com tracking
        await db.collection('orcamentos').updateOne(
            { _id: new ObjectId(orcamentoId) },
            { 
                $push: { 
                    emailsEnviados: {
                        email: clientEmail,
                        dataEnvio: new Date().toISOString(),
                        enviadoPor: req.user.id || req.user.userId
                    }
                }
            }
        );
        
        console.log(`✅ Orçamento ${orcamento.numero} sent to ${clientEmail}`);
        res.json({ 
            success: true, 
            message: `Orçamento ${orcamento.numero} enviado com sucesso para ${clientEmail}` 
        });
    } catch (error) {
        console.error('❌ Error sending orçamento:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════
// 🔧 INSPECTIONS API - Relatórios de Manutenção
// ═══════════════════════════════════════════════════════════

// POST /api/inspections/send-report - Enviar relatório por email
app.post('/api/inspections/send-report', authenticateToken, async (req, res) => {
    try {
        const {
            inspectionNumber,
            inspectionDate,
            inspector,
            liftLocation,
            liftModel,
            liftSerial,
            checklist,
            generalComments,
            recommendations,
            recipientEmail
        } = req.body;

        if (!recipientEmail || !inspectionNumber) {
            return res.status(400).json({
                success: false,
                message: 'Email e número da manutenção são obrigatórios'
            });
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Gerar HTML do checklist
        let checklistHTML = '';
        if (checklist && typeof checklist === 'object') {
            checklistHTML = '<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">';
            checklistHTML += '<tr><th style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; text-align: left;">Item</th><th style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; text-align: left;">Observações</th></tr>';
            
            Object.entries(checklist).forEach(([key, value]) => {
                if (value.status && value.status !== '') {
                    let itemName = key.replace(/-/g, ' ').replace(/_/g, ' ');
                    itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
                    
                    let statusIcon = '';
                    let statusColor = '';
                    
                    switch(value.status) {
                        case 'ok': statusIcon = '✓'; statusColor = '#28a745'; break;
                        case 'warning': statusIcon = '⚠'; statusColor = '#ffc107'; break;
                        case 'error': statusIcon = '✗'; statusColor = '#dc3545'; break;
                        case 'na': statusIcon = 'N/A'; statusColor = '#6c757d'; break;
                    }
                    
                    checklistHTML += `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;">
                                <span style="color: ${statusColor}; font-weight: bold;">${statusIcon}</span> ${itemName}
                            </td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${value.comment || '-'}</td>
                        </tr>
                    `;
                }
            });
            checklistHTML += '</table>';
        } else {
            checklistHTML = '<p style="color: #666;"><em>Nenhum item verificado</em></p>';
        }

        const dataFormatted = inspectionDate ? new Date(inspectionDate).toLocaleDateString('pt-PT', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }) : 'Não especificada';

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'FestLift <info@festlift.pt>',
            to: recipientEmail,
            subject: `Relatório de Manutenção ${inspectionNumber} - FESTLIFT`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">FestLift - Elevadores e Serviços, Lda.</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Manutenção de Elevadores</p>
                    </div>
                    
                    <div style="padding: 30px;">
                        <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                            📋 Relatório de Manutenção Mensal
                        </h2>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr><td style="padding: 8px 0; font-weight: bold; width: 40%;">Nº da Manutenção:</td><td style="padding: 8px 0;">${inspectionNumber}</td></tr>
                                <tr><td style="padding: 8px 0; font-weight: bold;">Data:</td><td style="padding: 8px 0;">${dataFormatted}</td></tr>
                                <tr><td style="padding: 8px 0; font-weight: bold;">Técnico Responsável:</td><td style="padding: 8px 0;">${inspector || 'Não especificado'}</td></tr>
                                <tr><td style="padding: 8px 0; font-weight: bold;">Localização:</td><td style="padding: 8px 0;">${liftLocation || 'Não especificada'}</td></tr>
                                <tr><td style="padding: 8px 0; font-weight: bold;">Modelo:</td><td style="padding: 8px 0;">${liftModel || 'Não especificado'}</td></tr>
                                <tr><td style="padding: 8px 0; font-weight: bold;">Número de Série:</td><td style="padding: 8px 0;">${liftSerial || 'Não especificado'}</td></tr>
                            </table>
                        </div>

                        <h3 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Resultados da Verificação</h3>
                        ${checklistHTML}

                        ${generalComments ? `<h3 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Observações Gerais</h3>
                        <p style="background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 10px 0;">${generalComments}</p>` : ''}

                        ${recommendations ? `<h3 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Recomendações</h3>
                        <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 10px 0;">${recommendations}</p>` : ''}
                    </div>

                    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
                        <p style="margin: 0; font-size: 12px; color: #666;">Este é um email automático gerado pelo sistema FESTLIFT.<br>Para mais informações, contacte-nos através do nosso sistema.</p>
                        <p style="margin: 10px 0 0 0; font-size: 11px; color: #999;">© ${new Date().getFullYear()} FestLift - Elevadores e Serviços, Lda. - Todos os direitos reservados</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Relatório ${inspectionNumber} enviado para ${recipientEmail}`);

        res.json({
            success: true,
            message: `Relatório enviado com sucesso para ${recipientEmail}`
        });

    } catch (error) {
        console.error('❌ Erro ao enviar relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar relatório por email',
            error: error.message
        });
    }
});

// POST /api/email/send-contract - Відправити контракт клієнту
app.post('/api/email/send-contract', authenticateToken, upload.single('pdf'), async (req, res) => {
    try {
        const { email, subject, message } = req.body;
        const pdfFile = req.file;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email є обов\'язковим'
            });
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: subject || 'Контракт - FestLift',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">📄 Контракт на обслуговування</h2>
                    <p>${message || 'Шановний клієнте! Надсилаємо вам контракт на обслуговування ліфта.'}</p>
                    ${pdfFile ? '<p><strong>Контракт додано у вкладенні.</strong></p>' : ''}
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        З повагою,<br>
                        Команда FestLift
                    </p>
                </div>
            `
        };

        if (pdfFile) {
            mailOptions.attachments = [{
                filename: pdfFile.originalname,
                path: pdfFile.path
            }];
        }

        await transporter.sendMail(mailOptions);
        
        // Видалити тимчасовий файл
        if (pdfFile) {
            const fs = require('fs').promises;
            await fs.unlink(pdfFile.path).catch(() => {});
        }
        
        console.log(`✅ Contract sent to ${email}`);
        res.json({ success: true, message: 'Контракт успішно відправлено' });
    } catch (error) {
        console.error('❌ Error sending contract:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/email/send-inspection-pdf - Відправити PDF звіт інспекції
app.post('/api/email/send-inspection-pdf', authenticateToken, upload.single('pdf'), async (req, res) => {
    try {
        const { email, subject, message } = req.body;
        const pdfFile = req.file;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email є обов\'язковим'
            });
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: subject || 'Звіт інспекції - FestLift',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">📋 Звіт інспекції ліфта</h2>
                    <p>${message || 'Шановний клієнте! Надсилаємо вам звіт інспекції вашого ліфта.'}</p>
                    ${pdfFile ? '<p><strong>Звіт додано у вкладенні.</strong></p>' : ''}
                    <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                        <p style="margin: 0;"><strong>⚠️ Важливо:</strong> Ознайомтеся зі звітом та зверніть увагу на рекомендації.</p>
                    </div>
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        З повагою,<br>
                        Команда FestLift
                    </p>
                </div>
            `
        };

        if (pdfFile) {
            mailOptions.attachments = [{
                filename: pdfFile.originalname,
                path: pdfFile.path
            }];
        }

        await transporter.sendMail(mailOptions);
        
        // Видалити тимчасовий файл
        if (pdfFile) {
            const fs = require('fs').promises;
            await fs.unlink(pdfFile.path).catch(() => {});
        }
        
        console.log(`✅ Inspection PDF sent to ${email}`);
        res.json({ success: true, message: 'Звіт інспекції успішно відправлено' });
    } catch (error) {
        console.error('❌ Error sending inspection PDF:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/email/send-inspection-reminder - Відправити нагадування про інспекцію
app.post('/api/email/send-inspection-reminder', authenticateToken, async (req, res) => {
    try {
        const { email, subject, message, inspectionDate, liftId } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email є обов\'язковим'
            });
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: subject || 'Нагадування про інспекцію ліфта',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0;">📅 Нагадування про інспекцію</h2>
                    </div>
                    <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
                        <p>${message}</p>
                        ${inspectionDate ? `
                            <div style="background: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; border-radius: 4px; margin: 20px 0;">
                                <p style="margin: 0;"><strong>📅 Дата інспекції:</strong> ${inspectionDate}</p>
                                ${liftId ? `<p style="margin: 5px 0 0 0;"><strong>🏢 Ліфт:</strong> ${liftId}</p>` : ''}
                            </div>
                        ` : ''}
                        <p>Будь ласка, забезпечте доступ до ліфта в зазначену дату.</p>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; text-align: center; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
                        <p style="margin: 0; color: #666; font-size: 12px;">
                            З повагою,<br>
                            <strong>Команда FestLift</strong>
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`✅ Inspection reminder sent to ${email}`);
        res.json({ success: true, message: 'Нагадування про інспекцію відправлено' });
    } catch (error) {
        console.error('❌ Error sending inspection reminder:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/email/send-template - Відправити email з кастомного template
app.post('/api/email/send-template', authenticateToken, async (req, res) => {
    try {
        const { email, templateId, subject, htmlContent } = req.body;

        if (!email || !htmlContent) {
            return res.status(400).json({
                success: false,
                error: 'Email та HTML контент є обов\'язковими'
            });
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.SMTP_FROM || '"LiftMaster Pro" <info@festlift.pt>',
            to: email,
            subject: subject || 'Тестовий email - FestLift',
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`✅ Template email sent to ${email} (template: ${templateId || 'custom'})`)
        res.json({ 
            success: true, 
            message: 'Email успішно відправлено',
            templateId: templateId
        });
    } catch (error) {
        console.error('❌ Error sending template email:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/orcamentos/:id/enviar - ВИДАЛЕНО, використовується backend/routes/orcamentos.js
// Цей endpoint дублював функціонал і використовував старий код
/*
app.post('/api/orcamentos/:id/enviar', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const orcamento = await db.collection('orcamentos').findOne({
            _id: new ObjectId(req.params.id)
        });
        
        if (!orcamento) {
            return res.status(404).json({
                success: false,
                message: 'Orçamento não encontrado'
            });
        }
        
        // Відправка через /api/email/send-orcamento
        const emailResponse = await fetch(`http://localhost:${PORT}/api/email/send-orcamento`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization
            },
            body: JSON.stringify({
                orcamentoId: req.params.id,
                clientEmail: orcamento.cliente.email
            })
        });

        const emailResult = await emailResponse.json();

        if (emailResult.success) {
            res.json({
                success: true,
                message: 'Orçamento enviado com sucesso',
                data: orcamento
            });
        }
    } catch (error) {
        console.error('❌ Erro ao enviar orçamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar orçamento',
            error: error.message
        });
    }
});
*/

// ═══════════════════════════════════════════════════════════
// 🔄 REGULATIONS AUTO-UPDATE API
// ═══════════════════════════════════════════════════════════

const RegulationsUpdater = require('./services/regulations-updater');

// Перевірити оновлення регламентів (ТІЛЬКИ для адмінів)
app.post('/api/regulations/check-updates', authenticateToken, async (req, res) => {
    try {
        // Перевірка ролі адміна
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ дозволено тільки адміністраторам'
            });
        }

        console.log(`🔍 Admin ${req.user.email} запустив перевірку оновлень регламентів...`);

        const updater = new RegulationsUpdater();
        const report = await updater.checkForUpdates();

        res.json({
            success: true,
            message: 'Перевірка завершена',
            data: report
        });

    } catch (error) {
        console.error('❌ Помилка перевірки регламентів:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка при перевірці оновлень',
            error: error.message
        });
    }
});

// Отримати статус останньої перевірки
app.get('/api/regulations/last-check', authenticateToken, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        const reportPath = path.join(__dirname, 'logs/regulations-check-report.json');
        
        try {
            const data = await fs.readFile(reportPath, 'utf-8');
            const report = JSON.parse(data);
            
            res.json({
                success: true,
                data: report
            });
        } catch (err) {
            res.json({
                success: true,
                data: null,
                message: 'Перевірка ще не виконувалась'
            });
        }
    } catch (error) {
        console.error('❌ Помилка читання звіту:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка при отриманні звіту'
        });
    }
});

// ═══════════════════════════════════════════════════════════
// REPORTS API
// ═══════════════════════════════════════════════════════════

// In-memory store for generated reports (session-scoped)
const generatedReportsStore = new Map();

// GET /api/reports - список згенерованих звітів
app.get('/api/reports', authenticateToken, async (req, res) => {
    try {
        const list = Array.from(generatedReportsStore.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 50);
        res.json({ reports: list, total: list.length });
    } catch (error) {
        res.status(500).json({ message: 'Помилка отримання звітів' });
    }
});

// POST /api/reports/generate - генерація звіту
app.post('/api/reports/generate', authenticateToken, async (req, res) => {
    try {
        const { type = 'maintenance', startDate, endDate, technicianId, status } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Вкажіть startDate та endDate' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Невірний формат дати' });
        }

        const query = {
            createdAt: { $gte: start, $lte: end }
        };
        if (status) query.status = status;
        if (technicianId) {
            try { query.assignedTo = new ObjectId(technicianId); } catch (e) { /* ignore invalid id */ }
        }

        const requests = await db.collection('requests').find(query).toArray();

        // Підтягуємо дані ліфтів та технікiв
        const liftIds = [...new Set(requests.map(r => r.liftId || r.lift).filter(Boolean))];
        const techIds = [...new Set(requests.map(r => r.assignedTo).filter(Boolean))];

        const [lifts, techs] = await Promise.all([
            liftIds.length ? db.collection('lifts').find({ _id: { $in: liftIds.map(id => { try { return new ObjectId(id); } catch(e){ return id; } }) } }).toArray() : [],
            techIds.length ? db.collection('users').find({ _id: { $in: techIds.map(id => { try { return new ObjectId(id); } catch(e){ return id; } }) } }).toArray() : []
        ]);

        const liftsMap = Object.fromEntries(lifts.map(l => [l._id.toString(), l]));
        const techsMap = Object.fromEntries(techs.map(u => [u._id.toString(), u]));

        const items = requests.map(r => {
            const lift = liftsMap[(r.liftId || r.lift || '').toString()];
            const tech = techsMap[(r.assignedTo || '').toString()];
            return {
                id: r._id,
                title: r.title || r.type || '—',
                lift: lift ? `${lift.model || ''} - ${lift.address || lift.serialNumber || ''}`.trim() : '—',
                technician: tech ? (tech.name || tech.username) : '—',
                status: r.status || '—',
                priority: r.priority || '—',
                createdAt: r.createdAt,
                completedAt: r.completedAt || null,
            };
        });

        const stats = {
            total: items.length,
            completed: items.filter(r => r.status === 'completed').length,
            inProgress: items.filter(r => r.status === 'in_progress').length,
            pending: items.filter(r => ['new', 'assigned'].includes(r.status)).length,
        };

        const reportId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const report = { id: reportId, type, startDate, endDate, createdAt: new Date().toISOString(), stats, items };

        generatedReportsStore.set(reportId, { id: reportId, type, startDate, endDate, createdAt: report.createdAt, stats });

        res.json(report);
    } catch (error) {
        console.error('❌ Reports generate error:', error);
        res.status(500).json({ message: 'Помилка генерації звіту', error: error.message });
    }
});

// GET /api/reports/:id/pdf - заглушка PDF
app.get('/api/reports/:id/pdf', authenticateToken, (req, res) => {
    const report = generatedReportsStore.get(req.params.id);
    if (!report) return res.status(404).json({ message: 'Звіт не знайдено' });
    res.json({ message: 'PDF export не реалізовано', report });
});

// GET /api/reports/:id/excel - заглушка Excel
app.get('/api/reports/:id/excel', authenticateToken, (req, res) => {
    const report = generatedReportsStore.get(req.params.id);
    if (!report) return res.status(404).json({ message: 'Звіт не знайдено' });
    res.json({ message: 'Excel export не реалізовано', report });
});

// ═══════════════════════════════════════════════════════════

// Явний маршрут для головної сторінки (фікс для Codespaces proxy)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Статичні файли - ОСТАННІ, щоб не перекривали API
// HTML-файли без кешування (щоб браузер завжди завантажував нову версію)
app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path === '/') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});
app.use(express.static(path.join(__dirname), {
    index: ['index.html'],
    extensions: ['html'],
    etag: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
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

// Запуск сервера з Socket.IO
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// WebSocket обробка
io.on('connection', (socket) => {
    console.log('👤 WebSocket клієнт підключився:', socket.id);
    
    // Аутентифікація через JWT
    socket.on('authenticate', (token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET); // Використовуємо той самий JWT_SECRET що і в authenticateToken
            socket.userData = decoded;
            socket.join(`role_${decoded.role}`); // Приєднати до кімнати за роллю
            socket.join(`user_${decoded.id}`);   // Приєднати до персональної кімнати
            console.log(`✅ WebSocket автентифіковано: ${decoded.email} (${decoded.role})`);
            socket.emit('authenticated', { success: true, user: decoded });
        } catch (error) {
            console.error('❌ WebSocket auth failed');
            socket.emit('authenticated', { success: false, error: 'Invalid token' });
        }
    });
    
    // Real-time оновлення
    socket.on('lift_updated', (data) => {
        io.to('role_admin').emit('lift_updated', data);
        io.to('role_dispatcher').emit('lift_updated', data);
    });
    
    socket.on('request_created', (data) => {
        io.to('role_admin').emit('new_request', data);
        io.to('role_dispatcher').emit('new_request', data);
    });
    
    socket.on('request_assigned', (data) => {
        io.to(`user_${data.technicianId}`).emit('new_assignment', data);
    });
    
    socket.on('disconnect', () => {
        console.log('👋 WebSocket клієнт відключився:', socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Unified сервер запущено на http://0.0.0.0:${PORT}`);
    console.log(`📁 Статичні файли: ${__dirname}`);
    console.log(`🔐 API endpoints: /api/*`);
    console.log(`💬 WebSocket server: ws://0.0.0.0:${PORT}`);
});

// ⏰ Cron diário — marcar orçamentos expirados automaticamente
async function atualizarOrcamentosExpirados() {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) return;
        const result = await mongoose.connection.db.collection('orcamentos').updateMany(
            { status: 'enviado', validadeAte: { $lt: new Date() } },
            { $set: { status: 'expirado' } }
        );
        if (result.modifiedCount > 0) {
            console.log(`⏰ Cron: ${result.modifiedCount} orçamento(s) marcado(s) como expirado`);
        }
    } catch (err) {
        console.error('❌ Cron expirado erro:', err.message);
    }
}
// Executar imediatamente ao iniciar e depois a cada 24h
atualizarOrcamentosExpirados();
setInterval(atualizarOrcamentosExpirados, 24 * 60 * 60 * 1000);

module.exports = { app, server, io };