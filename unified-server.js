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
// AI_PROVIDER: 'auto' | 'gemini' | 'ollama'
// 'auto' = автоматично uses Ollama if running, otherwise Gemini
const AI_PROVIDER = (process.env.AI_PROVIDER || 'auto').toLowerCase();
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:12b';

// ─── Ollama auto-detect cache (TTL 5 хв) ────────────────────────────────────
let _ollamaCache = { available: null, checkedAt: 0 };
async function isOllamaAvailable() {
    const now = Date.now();
    if (_ollamaCache.available !== null && now - _ollamaCache.checkedAt < 5 * 60 * 1000) {
        return _ollamaCache.available;
    }
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: ctrl.signal });
        clearTimeout(timer);
        _ollamaCache = { available: res.ok, checkedAt: now };
    } catch {
        _ollamaCache = { available: false, checkedAt: now };
    }
    if (_ollamaCache.available) {
        console.log(`🦙 Ollama auto-detected at ${OLLAMA_BASE_URL} — using ${OLLAMA_MODEL}`);
    }
    return _ollamaCache.available;
}

// 📧 Email Service (Brevo SMTP)
const emailService = require('./backend/services/emailService');
// 🚫 Desativar envio de emails de boas-vindas até produção estar pronta
// Para ativar: definir SEND_WELCOME_EMAILS=true nas variáveis de ambiente
const SEND_WELCOME_EMAILS = process.env.SEND_WELCOME_EMAILS === 'true';

const app = express();
app.set('trust proxy', 1); // Confiar no proxy (Codespaces / nginx)

// ═══════════════════════════════════════════════════════════
// 🌍 GEOCODING - Конвертація адреси в координати
// ═══════════════════════════════════════════════════════════
// Використовує OpenStreetMap Nominatim API (безкоштовно)
// Nominatim rate limiter: max 1 request per second (Nominatim usage policy)
let _nominatimLastCall = 0;
async function nominatimRequest(url) {
    const now = Date.now();
    const wait = Math.max(0, 1100 - (now - _nominatimLastCall));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    _nominatimLastCall = Date.now();
    return new Promise((resolve) => {
        https.get(url, { headers: { 'User-Agent': 'FestLift-LiftManagement/2.0' } }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
        }).on('error', () => resolve(null));
    });
}

// Helper: pick best result (prefer city match)
function pickBestResult(results, cityHint) {
    if (!results || results.length === 0) return null;
    let best = results[0];
    if (cityHint) {
        const cl = cityHint.toLowerCase().trim();
        const m = results.find(r => {
            const n = r.address || {};
            const rc = (n.city || n.town || n.village || n.municipality || n.suburb || n.quarter || '').toLowerCase();
            return rc.includes(cl) || cl.includes(rc);
        });
        if (m) best = m;
    }
    return best;
}

// 🌍 3-step fallback geocoder — postal code first (most precise in Portugal), then free-form
async function geocodeAddress(address) {
    const BASE = 'https://nominatim.openstreetmap.org/search';
    const COMMON = 'format=json&limit=3&countrycodes=pt&addressdetails=1';
    let searchLabel = '';
    let results = null;

    if (typeof address === 'string') {
        searchLabel = address;
        results = await nominatimRequest(`${BASE}?q=${encodeURIComponent(address)}&${COMMON}`);

    } else if (typeof address === 'object' && address !== null) {
        const { street = '', zipCode = '', city = '', country = 'Portugal' } = address;
        searchLabel = [street, zipCode, city].filter(Boolean).join(', ');

        // Step 1 — street + postal code (most precise: narrows to exact street within the postal area)
        if (zipCode && street) {
            const cleanStreet = street.replace(/\bnº\b\.?/gi, '').replace(/\s+/g, ' ').trim();
            const s1 = [cleanStreet, zipCode, country].filter(Boolean).join(', ');
            results = await nominatimRequest(`${BASE}?q=${encodeURIComponent(s1)}&${COMMON}`);
            if (results && results.length > 0) console.log(`🌍 Geocoding [street+zip]: ${searchLabel}`);
        }

        // Step 2 — street + city (if zip produced nothing)
        if (!results || results.length === 0) {
            const cleanStreet = street.replace(/\bnº\b\.?/gi, '').replace(/\s+/g, ' ').trim();
            const s2 = [cleanStreet, city, country].filter(Boolean).join(', ');
            results = await nominatimRequest(`${BASE}?q=${encodeURIComponent(s2)}&${COMMON}`);
            if (results && results.length > 0) console.log(`🌍 Geocoding [street+city]: ${searchLabel}`);
        }

        // Step 3 — postal code + city only (when street name is too unusual for OSM)
        if (!results || results.length === 0) {
            const p = new URLSearchParams({ postalcode: zipCode, country, format: 'json', limit: '3', countrycodes: 'pt', addressdetails: '1' });
            if (city) p.set('city', city);
            results = await nominatimRequest(`${BASE}?${p}`);
            if (results && results.length > 0) console.log(`🌍 Geocoding [postalcode]: ${searchLabel}`);
        }

        // Step 4 — full address free-form last resort
        if (!results || results.length === 0) {
            const cleanFull = searchLabel.replace(/\bnº\b\.?/gi, '').replace(/\s+/g, ' ').trim();
            results = await nominatimRequest(`${BASE}?q=${encodeURIComponent(cleanFull)}&${COMMON}`);
            if (results && results.length > 0) console.log(`🌍 Geocoding [freeform]: ${searchLabel}`);
        }
    }

    const best = pickBestResult(results, typeof address === 'object' ? address.city : null);
    if (!best) {
        console.warn(`⚠️ Geocoding: endereço não encontrado: ${searchLabel}`);
        return null;
    }

    const lat = parseFloat(best.lat);
    const lon = parseFloat(best.lon);
    const n = best.address || {};
    const cityName = n.city || n.town || n.village || n.municipality || n.suburb || n.quarter || n.county || '';
    console.log(`✅ Geocoded: ${searchLabel} → [${lon}, ${lat}] city: ${cityName}`);
    return { type: 'Point', coordinates: [lon, lat], city: cityName };
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
    message: { success: false, message: 'Demasiadas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Contamos apenas tentativas falhadas
});
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 хвилина
    max: 30,             // max 30 AI-запитів на хвилину
    message: { success: false, message: 'Demasiados pedidos ao AI. Aguarde um minuto.' }
});
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,            // 300 запитів/хв для загального API
    message: { success: false, message: 'Demasiados pedidos. Aguarde um minuto.' }
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
const connectMongoPromise = connectMongo();

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
        console.error('❌ FATAL: JWT_SECRET não definido em .env! O servidor irá parar.');
        process.exit(1);
    } else {
        console.warn('⚠️  AVISO: JWT_SECRET não definido em .env! A usar fallback inseguro. НЕ для production!');
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
    if (!q) return res.status(400).json({ success: false, message: 'Parâmetro q é obrigatório' });

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=pt&addressdetails=1`;
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
            return res.json({ success: false, message: 'Endereço não encontrado' });
        }
        // Повертаємо перший результат + всі варіанти для вибору
        const best = data[0];
        const results = data.map(r => ({
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            display: r.display_name,
            city: r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || r.address?.suburb || r.address?.quarter || '',
            postcode: r.address?.postcode || '',
            type: r.type || r.class || ''
        }));
        return res.json({
            success: true,
            lat: parseFloat(best.lat),
            lng: parseFloat(best.lon),
            display: best.display_name,
            city: best.address?.city || best.address?.town || best.address?.village || best.address?.municipality || best.address?.suburb || best.address?.quarter || '',
            postcode: best.address?.postcode || '',
            results  // всі варіанти
        });
    } catch (err) {
        console.error('❌ /api/geocode error:', err.message);
        return res.status(502).json({ success: false, message: 'Erro de geocodificação: ' + err.message });
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
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        
        const notifications = await db.collection('notifications')
            .find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();
        
        res.json({ success: true, notifications: notifications || [] });
    } catch (error) {
        console.error('❌ Erro ao obter notificações:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// Delete notification
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        const { ObjectId } = require('mongodb');
        await db.collection('notifications').deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true, message: 'Notificação eliminada' });
    } catch (error) {
        console.error('❌ Помилка видалення сповіщення:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        
        const { ObjectId } = require('mongodb');
        await db.collection('notifications').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { read: true, readAt: new Date() } }
        );
        
        res.json({ success: true, message: 'Notificação marcada como lida' });
    } catch (error) {
        console.error('❌ Помилка оновлення сповіщення:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// ═══════════════════════════════════════════════════════════
// 📊 QR CODE HISTORY
// ═══════════════════════════════════════════════════════════

// GET all QR codes with filtering and pagination
app.get('/api/qr/codes', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
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
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// GET QR code by ID
app.get('/api/qr/codes/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        
        const { ObjectId } = require('mongodb');
        const qrCode = await db.collection('qr_scans').findOne({ _id: new ObjectId(req.params.id) });
        
        if (!qrCode) {
            return res.status(404).json({ success: false, message: 'QR code não encontrado' });
        }
        
        res.json({ success: true, data: qrCode });
    } catch (error) {
        console.error('❌ Помилка отримання QR коду:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// POST create new QR code
app.post('/api/qr/codes', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        
        const qrCodeData = {
            ...req.body,
            createdBy: req.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('qr_scans').insertOne(qrCodeData);
        qrCodeData._id = result.insertedId;
        
        res.json({ success: true, message: 'QR code criado', data: qrCodeData });
    } catch (error) {
        console.error('❌ Помилка створення QR коду:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// PUT update QR code
app.put('/api/qr/codes/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
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
            return res.status(404).json({ success: false, message: 'QR code não encontrado' });
        }
        
        res.json({ success: true, message: 'QR code atualizado' });
    } catch (error) {
        console.error('❌ Помилка оновлення QR коду:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// DELETE QR code
app.delete('/api/qr/codes/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        
        const { ObjectId } = require('mongodb');
        const result = await db.collection('qr_scans').deleteOne({ _id: new ObjectId(req.params.id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'QR code não encontrado' });
        }
        
        res.json({ success: true, message: 'QR code eliminado' });
    } catch (error) {
        console.error('❌ Помилка видалення QR коду:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// GET QR scan history
app.get('/api/qr/history', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        
        const history = await db.collection('qr_scans')
            .find({})
            .sort({ scannedAt: -1 })
            .limit(100)
            .toArray();
        
        res.json({ success: true, data: history || [] });
    } catch (error) {
        console.error('❌ Помилка отримання історії QR:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// POST QR scan
app.post('/api/qr/scan', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
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
        
        res.json({ success: true, message: 'QR code digitalizado', data: scan });
    } catch (error) {
        console.error('❌ Помилка запису QR скану:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// GET QR statistics
app.get('/api/qr/stats', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
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
        console.error('❌ Erro ao obter estatísticas QR:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// ═══════════════════════════════════════════════════════════
// � KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════

// GET /api/knowledge-base - список статей бази знань
app.get('/api/knowledge-base', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        const articles = await db.collection('knowledge_base')
            .find({})
            .sort({ updatedDate: -1 })
            .toArray();
        res.json(articles);
    } catch (error) {
        console.error('❌ Помилка отримання бази знань:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// POST /api/knowledge-base - додати статтю
app.post('/api/knowledge-base', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        const article = { ...req.body, createdAt: new Date(), updatedAt: new Date() };
        const result = await db.collection('knowledge_base').insertOne(article);
        res.status(201).json({ success: true, id: result.insertedId });
    } catch (error) {
        console.error('❌ Помилка створення статті:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// �📋 INSPECTIONS
// ═══════════════════════════════════════════════════════════

// GET all inspections  (supports ?limit=N)
app.get('/api/inspections', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        const limit = parseInt(req.query.limit) || 0;
        let cursor = db.collection('inspections')
            .find({})
            .sort({ createdAt: -1 });
        if (limit > 0) cursor = cursor.limit(limit);
        const inspections = await cursor.toArray();
        res.json({ success: true, data: inspections || [] });
    } catch (error) {
        console.error('❌ Помилка отримання інспекцій:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// GET next sequential inspection number
app.get('/api/inspections/next-number', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `INSP-${yyyy}-${mm}-`;

        const last = await db.collection('inspections')
            .find({ numero: { $regex: `^${prefix}` } })
            .sort({ numero: -1 })
            .limit(1)
            .toArray();

        let seq = 1;
        if (last.length > 0) {
            const parts = last[0].numero.split('-');
            const n = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(n)) seq = n + 1;
        }
        const numero = `${prefix}${String(seq).padStart(3, '0')}`;
        res.json({ success: true, numero });
    } catch (error) {
        console.error('❌ Erro ao gerar número:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar número', error: error.message });
    }
});

// GET inspection by ID
app.get('/api/inspections/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        
        const { ObjectId } = require('mongodb');
        const inspection = await db.collection('inspections')
            .findOne({ _id: new ObjectId(req.params.id) });
        
        if (!inspection) {
            return res.status(404).json({ success: false, message: 'Inspeção não encontrada' });
        }
        
        res.json({ success: true, data: inspection });
    } catch (error) {
        console.error('❌ Помилка отримання інспекції:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// POST /api/inspections — guardar novo relatório de inspecção / manutenção
app.post('/api/inspections', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        const now = new Date();
        // Auto-generate report number if not provided
        let numero = req.body.numero || req.body.reportNumber;
        if (!numero) {
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const visitType = req.body.visitType || req.body.type;
            const prefixCode = visitType === 'repair' ? 'REP' :
                               visitType === 'emergency' ? 'EMG' : 'INSP';
            const prefix = `${prefixCode}-${yyyy}-${mm}-`;
            const last = await db.collection('inspections')
                .find({ numero: { $regex: `^${prefix}` } })
                .sort({ numero: -1 })
                .limit(1)
                .toArray();
            let seq = 1;
            if (last.length > 0) {
                const parts = last[0].numero.split('-');
                const n = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(n)) seq = n + 1;
            }
            numero = `${prefix}${String(seq).padStart(3, '0')}`;
        }
        const doc = {
            numero,
            data: req.body.data || req.body.inspectionDate || req.body.scheduledDate || now,
            inspector: req.body.inspector || req.body.technicianName || '',
            liftLocation: req.body.liftLocation || req.body.liftAddress || req.body.address || '',
            liftMunicipal: req.body.liftMunicipal || '',
            liftModel: req.body.liftModel || '',
            clientEmail: req.body.clientEmail || '',
            clientName: req.body.clientName || '',
            visitType: req.body.visitType || req.body.type || 'maintenance',
            driveType: req.body.driveType || '',
            doorType: req.body.doorType || '',
            checklist: req.body.checklist || {},
            generalComments: req.body.generalComments || req.body.observations || req.body.notes || '',
            recommendations: req.body.recommendations || '',
            // Dispatcher-specific fields
            assignedTechnician: req.body.assignedTechnician || null,
            scheduledDate: req.body.scheduledDate || null,
            priority: req.body.priority || 'normal',
            status: req.body.status || 'rascunho',
            createdBy: req.user ? req.user.id : null,
            createdAt: now,
            updatedAt: now
        };
        const result = await db.collection('inspections').insertOne(doc);
        console.log(`✅ Inspecção ${numero} guardada (${doc.visitType}) por ${doc.inspector}`);
        // 🤖 Agent: analyse async, never block response
        try { agentService.analyseInspection({ ...doc, _id: result.insertedId }); } catch (_) {}
        res.status(201).json({ success: true, inspection: { ...doc, _id: result.insertedId } });
    } catch (error) {
        console.error('❌ Erro ao guardar inspecção:', error);
        res.status(500).json({ success: false, message: 'Erro ao guardar inspecção', error: error.message });
    }
});

// DELETE /api/inspections/:id — apagar relatório
app.delete('/api/inspections/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        const { ObjectId } = require('mongodb');
        const result = await db.collection('inspections').deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Inspecção não encontrada' });
        }
        console.log(`🗑️  Inspecção ${req.params.id} apagada`);
        res.json({ success: true, message: 'Inspecção apagada com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao apagar inspecção:', error);
        res.status(500).json({ success: false, message: 'Erro ao apagar inspecção', error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════
// 📝 TASKS
// ═══════════════════════════════════════════════════════════

// GET all tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
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
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// GET task by ID
app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        }
        
        const { ObjectId } = require('mongodb');
        const task = await db.collection('tasks')
            .findOne({ _id: new ObjectId(req.params.id) });
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Tarefa não encontrada' });
        }
        
        res.json({ success: true, data: task });
    } catch (error) {
        console.error('❌ Помилка отримання завдання:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// ═══════════════════════════════════════════════════════════
// 📊 STATISTICS & DASHBOARD
// ═══════════════════════════════════════════════════════════

// GET statistics
app.get('/api/statistics', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
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
        console.error('❌ Erro ao obter estatísticas:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// 🆕 PUBLIC dashboard stats (без авторизації для швидкого перегляду)
app.get('/api/dashboard/public', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
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
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// GET dashboard data
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
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
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// Отримання профілю поточного користувача
app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
        console.log('👤 Запит профілю для користувача:', req.user);
        
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Base de dados indisponível'
            });
        }

        const users = db.collection('users');
        const { ObjectId } = require('mongodb');
        
        const user = await users.findOne({ _id: new ObjectId(req.user.id) });

        if (!user) {
            console.log('❌ Utilizador não encontrado в БД:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'Utilizador não encontrado'
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
        console.error('❌ Erro ao carregar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar perfil'
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
        console.log('✅ Perfil atualizado:', req.user.email);
        res.json({ ...updated, id: updated._id.toString() });
    } catch (error) {
        console.error('❌ Erro ao atualizar perfil:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
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
        console.log('❌ Token não fornecido');
        return res.status(401).json({
            success: false,
            message: 'Token de autorização não fornecido'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('❌ JWT verify error:', err.message); // server-side only
            return res.status(403).json({
                success: false,
                message: 'Token inválido ou expirado'
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
                message: 'Acesso negado. Permissões insuficientes.'
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
const agentService = require('./services/agentService');  // 🤖 AI Agent
const pdfParse = require('pdf-parse');

// Universal PDF Parser - автоматично визначає тип звіту
async function parseInspectionReport(filePath) {
    try {
        // Читаємо першу сторінку для визначення типу
        const buffer = await fs.readFile(filePath);
        const partialPDF = await pdfParse(buffer, { max: 1 });
        const text = partialPDF.text;
        
        // O parser BV suporta todos os formatos de entidades portuguesas;
        // routeamos Bureau Veritas, GATECI, APCER, CERTIEL e NOMINARE para ele.
        const isBV      = text.includes('BUREAU VERITAS') || /(?:NB|DT)\d{4}-\d{4}/.test(text);
        const isKnownPT = /\b(?:GATECI|APCER|CERTIEL|NOMINARE)\b/i.test(text);

        if (isBV || isKnownPT) {
            console.log('📋 Detected known PT inspection entity — using BV/universal parser');
            return await parseBureauVeritasPDF(filePath);
        } else {
            console.log('📋 Using: Generic enhanced parser');
            const enhanced = await pdfParserEnhanced.parsePDF(filePath);
            // Se a data não foi extraída, tenta o parser BV como último recurso
            const hasDate = enhanced && enhanced.metadata && enhanced.metadata.date;
            if (!hasDate) {
                console.log('⚠️ Enhanced parser found no date — falling back to BV parser');
                const bvResult = await parseBureauVeritasPDF(filePath).catch(() => null);
                if (bvResult && bvResult.success) return bvResult;
            }
            return enhanced;
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

// POST /api/lifts/regeocode-all - виправляє координати ліфтів з нульовими або відсутніми координатами
// Також переробляє ВСІХ, якщо ?force=true (для виправлення вже збережених неправильних координат)
app.post('/api/lifts/regeocode-all', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const force = req.query.force === 'true';
        const liftsCollection = db.collection('lifts');
        
        // Знаходимо ліфти для повторного геокодування
        const filter = force ? {} : {
            $or: [
                { 'location.coordinates': { $exists: false } },
                { 'location.coordinates': [0, 0] },
                { location: { $exists: false } }
            ]
        };
        
        const lifts = await liftsCollection.find(filter).toArray();
        console.log(`🌍 Regeocode: знайдено ${lifts.length} ліфтів (force=${force})`);
        
        let fixed = 0;
        let failed = 0;
        const results = [];
        
        for (const lift of lifts) {
            if (!lift.address) {
                failed++;
                results.push({ id: lift._id, status: 'skip', reason: 'no address' });
                continue;
            }
            
            // Rate-limiting is handled inside nominatimRequest (1.1s per call)
            
            const geocoded = await geocodeAddress(lift.address);
            if (geocoded) {
                await liftsCollection.updateOne(
                    { _id: lift._id },
                    { $set: { location: geocoded, updatedAt: new Date() } }
                );
                fixed++;
                results.push({ id: lift._id, status: 'fixed', coords: geocoded.coordinates, city: geocoded.city });
                console.log(`✅ Regeocode: ліфт ${lift._id} → ${geocoded.coordinates}`);
            } else {
                failed++;
                results.push({ id: lift._id, status: 'failed', address: lift.address });
                console.warn(`⚠️ Regeocode: не вдалося геокодувати ліфт ${lift._id}`);
            }
        }
        
        res.json({
            success: true,
            message: `Geocodificação concluída: corrigidos ${fixed}, erros ${failed}`,
            total: lifts.length, fixed, failed, results
        });
    } catch (error) {
        console.error('❌ Regeocode error:', error);
        res.status(500).json({ success: false, message: 'Erro de geocodificação em massa: ' + error.message });
    }
});

// GET /api/lifts/stats - статистика ліфтів (МАЄ БУТИ ПЕРЕД /api/lifts/:id!)
app.get('/api/lifts/stats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
        return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
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
        console.error('❌ Erro ao obter estatísticas ліфтів:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estatísticas'
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
        console.error('❌ Erro ao obter notificações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter notificações'
        });
    }
});

app.get('/api/lifts', authenticateToken, async (req, res) => {
    try {
        if (!db) return res.status(503).json({ success: false, message: 'Base de dados indisponível.' });
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
                    message: 'Token de utilizador incorreto'
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
        
        // 🔍 Фільтр пошуку (municipalNumber, вулиця, місто, ім'я клієнта)
        // Sanitize: ensure search is a plain string (prevent NoSQL injection via $regex object)
        const rawSearch = req.query.search;
        const searchTerm = (typeof rawSearch === 'string' ? rawSearch : '').trim();
        const limitNum = parseInt(req.query.limit) || 0;
        if (searchTerm) {
            const re = new RegExp(searchTerm, 'i');
            const searchFilter = { $or: [
                { municipalNumber: re },
                { 'address.street': re },
                { 'address.city': re },
                { 'address.zipCode': re },
                { clientName: re },
                { clientEmail: re }
            ] };
            // Об'єднуємо з існуючим query (ролевий фільтр)
            if (Object.keys(query).length > 0) {
                query = { $and: [query, searchFilter] };
            } else {
                query = searchFilter;
            }
        }

        let findCursor = db.collection('lifts').find(query);
        if (limitNum > 0) findCursor = findCursor.limit(limitNum);
        const lifts = await findCursor.toArray();
        
        console.log(`✅ Знайдено ліфтів: ${lifts.length} (search: "${searchTerm}")`);
        
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
        console.error('❌ Erro ao obter elevadores:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter elevadores'
        });
    }
});

// POST /api/lifts - створення нового ліфта
app.post('/api/lifts', authenticateToken, async (req, res) => {
    try {
        // � ПЕРЕВІРКА ПІДКЛЮЧЕННЯ ДО MongoDB
        if (!db) {
            console.error('❌ POST /api/lifts: MongoDB not connected');
            return res.status(503).json({
                success: false,
                message: 'Base de dados indisponível. Tente novamente em alguns segundos.'
            });
        }

        // �🔐 ПЕРЕВІРКА ПРАВ - тільки admin/dispatcher можуть створювати ліфти
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            console.warn(`⚠️ ${req.user.role} ${req.user.username} намагається створити ліфт`);
            return res.status(403).json({
                success: false,
                message: 'Apenas administrador ou operador podem criar elevadores'
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
                validationErrors.push('A capacidade de carga deve ser um número positivo');
            }
        }
        
        // Перевірка speed (має бути додатним числом)
        if (req.body.speed !== undefined) {
            const speed = Number(req.body.speed);
            if (isNaN(speed) || speed <= 0) {
                validationErrors.push('A velocidade deve ser um número positiva');
            }
        }
        
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Erro de validação',
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
            // Якщо frontend вже надав явні не-нульові координати (вибрані через діалог геокодування) —
            // використовуємо їх без повторного геокодування, щоб уникнути перезапису правильних даних
            const explicitCoords = req.body.location?.coordinates;
            const hasExplicitCoords = Array.isArray(explicitCoords) &&
                explicitCoords.length === 2 &&
                !isNaN(explicitCoords[0]) && !isNaN(explicitCoords[1]) &&
                !(explicitCoords[0] === 0 && explicitCoords[1] === 0);
            
            if (hasExplicitCoords) {
                console.log('✅ Використано координати з frontend:', explicitCoords);
            } else {
                console.log('🔍 Спроба геокодування адреси...');
                const geocodedLocation = await geocodeAddress(req.body.address);
                
                if (geocodedLocation) {
                    locationData = geocodedLocation;
                    console.log('✅ Використано геокодовані координати:', geocodedLocation.coordinates);
                } else if (!req.body.location || !req.body.location.coordinates) {
                    console.warn('⚠️ Геокодування не вдалося і координати не надані вручну');
                }
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

        // 🔄 НОРМАЛІЗАЦІЯ enum: driveType та doorType (legacy display text → DB code)
        const DRIVE_MAP_US = {
            'hydraulic': 'hydraulic', 'hydraulic': 'hydraulic',
            'traction_mrl': 'traction_mrl', 'traction_mrl': 'traction_mrl',
            'traction_mr': 'traction', 'traction': 'traction',
            'screw': 'platform', 'platform': 'platform', 'platform': 'platform',
            'goods': 'goods', 'freight': 'goods'
        };
        const DOOR_MAP_US = {
            'automatic_2panel': 'automatic', 'automatic_4panel': 'automatic',
            'telescopic': 'automatic', 'automatic': 'automatic',
            'semiautomatic': 'swing', 'swing': 'swing', 'swing': 'swing',
            'manual': 'gate', 'gate': 'gate'
        };
        if (liftData.driveType) {
            const norm = DRIVE_MAP_US[liftData.driveType.toLowerCase()];
            if (norm) liftData.driveType = norm;
        }
        if (liftData.doorType) {
            const norm = DOOR_MAP_US[liftData.doorType.toLowerCase()];
            if (norm) liftData.doorType = norm;
        }
        
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
            
            message = 'Elevador atualizado com sucesso';
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
                location: locationData, // Використовуємо геокодовані координати або manual
                municipality: municipalityData, // 🏛️ Дані муніципалітету
                createdAt: new Date().toISOString(),
                createdBy: req.user.username,
                updatedAt: new Date().toISOString()
            };
            
            const insertResult = await db.collection('lifts').insertOne(newLift);
            
            message = 'Elevador criado com sucesso';
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
                // Generate a unique username: try base, then base2, base3, ...
                const baseUsername = clientEmail.split('@')[0].replace(/[^a-z0-9_.-]/gi, '_');
                let candidateUsername = baseUsername;
                let usernameAttempt = 1;
                while (await db.collection('users').findOne({ username: candidateUsername })) {
                    usernameAttempt++;
                    candidateUsername = `${baseUsername}${usernameAttempt}`;
                }
                const newClientDoc = {
                    email: clientEmail,
                    username: candidateUsername,
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
      <p>A sua palavra-passe temporária será comunicada pelo administrador da conta.</p>
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

                    if (!SEND_WELCOME_EMAILS) {
                        console.log(`📭 [DEV] Email de boas-vindas não enviado para ${clientEmail} — SEND_WELCOME_EMAILS desativado`);
                        newClientInfo.emailSent = false;
                        newClientInfo.emailSkipped = true;
                    } else {
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
        console.error('❌ Erro ao criar elevador:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar elevador'
        });
    }
});

app.get('/api/lifts/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) return res.status(503).json({ success: false, message: 'Base de dados indisponível.' });
        const { ObjectId } = require('mongodb');
        let liftId;
        try { liftId = new ObjectId(req.params.id); } catch (e) {
            return res.status(400).json({ success: false, message: 'ID de elevador inválido' });
        }
        const lift = await db.collection('lifts').findOne({ _id: liftId });
        
        if (!lift) {
            return res.status(404).json({
                success: false,
                message: 'Elevador não encontrado'
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
        if (req.user.role === 'client') {
            const clientId = (req.user.id || req.user.userId || '').toString();
            const liftClientId = lift.client ? lift.client.toString() : null;
            const clientEmail = req.user.email ? req.user.email.toLowerCase() : null;
            const liftClientEmail = lift.clientEmail ? lift.clientEmail.toLowerCase() : null;
            const hasAccess = (clientId && liftClientId && liftClientId === clientId)
                || (clientEmail && liftClientEmail && liftClientEmail === clientEmail);
            if (!hasAccess) {
                console.warn(`⚠️ Клієнт ${req.user.username} намагається отримати чужий ліфт ${liftId}`);
                return res.status(403).json({
                    success: false,
                    message: 'Sem acesso a este elevador'
                });
            }
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
                    message: 'Sem tarefa ativa para este elevador'
                });
            }
        }
        
        res.json({
            success: true,
            data: liftWithClient  // 🔧 Консистентна структура відповіді (data замість lift)
        });
    } catch (error) {
        console.error('❌ Erro ao obter elevador:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter elevador'
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
            return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        }

        // 🔐 Перевірка прав доступу
        if (req.user.role === 'client') {
            const clientId = req.user.id || req.user.userId;
            const liftClientId = lift.client ? lift.client.toString() : null;
            if (liftClientId !== clientId) {
                return res.status(403).json({ success: false, message: 'Sem acesso a este elevador' });
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
        res.status(500).json({ success: false, message: 'Erro ao obter histórico de manutenção' });
    }
});

// PUT /api/lifts/:id - оновлення ліфта
app.put('/api/lifts/:id', authenticateToken, async (req, res) => {
    try {
        if (!db) return res.status(503).json({ success: false, message: 'Base de dados indisponível.' });
        const { ObjectId } = require('mongodb');
        let liftId;
        try { liftId = new ObjectId(req.params.id); } catch (e) {
            return res.status(400).json({ success: false, message: 'ID de elevador inválido' });
        }
        // 🔐 ПЕРЕВІРКА ПРАВ ДОСТУПУ
        const lift = await db.collection('lifts').findOne({ _id: liftId });
        
        if (!lift) {
            return res.status(404).json({
                success: false,
                message: 'Elevador não encontrado'
            });
        }
        
        // Клієнт може оновлювати тільки свої ліфти
        if (req.user.role === 'client' && lift.clientId !== req.user.id && lift.clientId !== req.user.userId) {
            console.warn(`⚠️ Клієнт ${req.user.username} намагається оновити чужий ліфт ${liftId}`);
            return res.status(403).json({
                success: false,
                message: 'Sem permissões para atualizar este elevador'
            });
        }
        
        // Технік не може редагувати ліфти
        if (req.user.role === 'technician') {
            console.warn(`⚠️ Технік ${req.user.username} намагається оновити ліфт ${liftId}`);
            return res.status(403).json({
                success: false,
                message: 'Os técnicos não podem editar elevadores'
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

        // Захист: ці поля НЕ перезаписуються через PUT (тільки через спеціальні ендпоінти)
        delete updateData.inspectionHistory;
        delete updateData.interventionHistory;
        delete updateData.photos;
        delete updateData.chat;
        // nextMaintenance НЕ зберігається — обчислюється динамічно як lastMaintenance + 1 місяць
        delete updateData.nextMaintenance;

        // 🔄 НОРМАЛІЗАЦІЯ enum: driveType та doorType (legacy display text → DB code)
        const DRIVE_MAP_PUT = {
            'hydraulic': 'hydraulic', 'hydraulic': 'hydraulic',
            'traction_mrl': 'traction_mrl', 'traction_mrl': 'traction_mrl',
            'traction_mr': 'traction', 'traction': 'traction',
            'screw': 'platform', 'platform': 'platform', 'platform': 'platform',
            'goods': 'goods', 'freight': 'goods'
        };
        const DOOR_MAP_PUT = {
            'automatic_2panel': 'automatic', 'automatic_4panel': 'automatic',
            'telescopic': 'automatic', 'automatic': 'automatic',
            'semiautomatic': 'swing', 'swing': 'swing', 'swing': 'swing',
            'manual': 'gate', 'gate': 'gate'
        };
        if (updateData.driveType) {
            const norm = DRIVE_MAP_PUT[updateData.driveType.toLowerCase()];
            if (norm) updateData.driveType = norm;
        }
        if (updateData.doorType) {
            const norm = DOOR_MAP_PUT[updateData.doorType.toLowerCase()];
            if (norm) updateData.doorType = norm;
        }
        
        if (req.body.address) {
            // Якщо frontend вже надав явні координати — використовуємо їх без геокодування
            const explicitCoords = req.body.location?.coordinates;
            if (Array.isArray(explicitCoords) && explicitCoords.length === 2 &&
                    !isNaN(explicitCoords[0]) && !isNaN(explicitCoords[1])) {
                console.log('✅ Використано координати з frontend:', explicitCoords);
                // updateData.location вже встановлено через ...req.body
            } else {
                console.log('🔍 Адреса змінена, виконуємо геокодування...');
                const geocodedLocation = await geocodeAddress(req.body.address);

                if (geocodedLocation) {
                    updateData.location = geocodedLocation;
                    console.log('✅ Оновлено координати:', geocodedLocation.coordinates);
                } else {
                    console.warn('⚠️ Геокодування не вдалося, координати залишаються без змін');
                }
            }
        } else if (req.body.location?.coordinates) {
            // Запит лише з location (без address) — наприклад, переміщення маркера з мапи
            console.log('✅ Оновлено координати маркера:', req.body.location.coordinates);
        }

        // ─────────────────────────────────────────────────────
        // 👤 AUTO-FIND/CREATE CLIENT USER при зміні clientEmail
        // ─────────────────────────────────────────────────────
        let newClientInfo = null;
        const _putClientEmail = (req.body.clientEmail || '').trim().toLowerCase();
        if (_putClientEmail) {
            const existingClientUser = await db.collection('users').findOne({ email: _putClientEmail });
            if (existingClientUser) {
                // Знайдений існуючий акаунт — прив'язуємо ліфт до нього
                updateData.client = existingClientUser._id;
                console.log(`👤 Клієнт знайдений: ${_putClientEmail} (${existingClientUser._id})`);
            } else {
                // Новий email — створюємо акаунт клієнта автоматично
                const rawPassword =
                    Math.random().toString(36).slice(2, 6).toUpperCase() +
                    Math.floor(1000 + Math.random() * 9000) +
                    ['!', '@', '#', '$'][Math.floor(Math.random() * 4)];
                const hashedPassword = await bcrypt.hash(rawPassword, 10);
                const nameParts = (req.body.clientName || '').trim().split(/\s+/);
                const baseUsername = _putClientEmail.split('@')[0].replace(/[^a-z0-9_.-]/gi, '_');
                let candidateUsername = baseUsername;
                let usernameAttempt = 1;
                while (await db.collection('users').findOne({ username: candidateUsername })) {
                    usernameAttempt++;
                    candidateUsername = `${baseUsername}${usernameAttempt}`;
                }
                const newClientDoc = {
                    email: _putClientEmail,
                    username: candidateUsername,
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' ') || '',
                    phone: req.body.clientPhone || '',
                    password: hashedPassword,
                    role: 'client',
                    isActive: true,
                    status: 'offline',
                    createdAt: new Date().toISOString(),
                    createdBy: req.user.username,
                    invitedFromLift: liftId.toString()
                };
                const insertedClient = await db.collection('users').insertOne(newClientDoc);
                updateData.client = insertedClient.insertedId;
                newClientInfo = { email: _putClientEmail, password: rawPassword, created: true };
                console.log(`👤 Novo клієнт criado automaticamente (PUT): ${_putClientEmail}`);

                // 📧 Відправляємо запрошення, якщо адмін обрав opção e produção ativa
                if (SEND_WELCOME_EMAILS && req.body.sendAccessEmail === true) {
                    try {
                        const siteBase = process.env.SITE_URL || `${req.protocol}://${req.headers.host}`;
                        const liftAddr = req.body.address
                            ? (typeof req.body.address === 'object'
                                ? [req.body.address.street, req.body.address.zipCode, req.body.address.city].filter(Boolean).join(', ')
                                : req.body.address)
                            : '—';
                        const inviteHtml = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;background:#f4f4f4}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.12)}
.header{background:linear-gradient(135deg,#1a237e,#1565c0);padding:32px 30px;text-align:center;color:#fff}
.header h1{margin:0;font-size:26px}.body{padding:32px 30px}
.creds{background:#e8f0fe;border-left:4px solid #1565c0;border-radius:6px;padding:18px 22px;margin:20px 0}
.creds p{margin:6px 0;font-size:15px}.creds strong{color:#1a237e}
.creds code{background:#fff;padding:3px 8px;border-radius:4px;font-size:15px;border:1px solid #c5cae9}
.btn{display:inline-block;background:#1565c0;color:#fff!important;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:bold;margin-top:20px}
.footer{background:#f8f9fa;padding:18px 30px;text-align:center;font-size:12px;color:#888}
.lift-box{background:#f0f4ff;border:1px solid #c5cae9;border-radius:6px;padding:14px 18px;margin:10px 0;font-size:14px}
</style></head><body><div class="wrap">
<div class="header"><h1>🏢 FestLift</h1><p>Plataforma de Gestão de Elevadores</p></div>
<div class="body"><h2>Bem-vindo(a)${newClientDoc.firstName ? ', ' + newClientDoc.firstName : ''}!</h2>
<p>A sua empresa foi registada na plataforma <strong>FestLift</strong> como cliente de manutenção de elevadores.</p>
<div class="lift-box">🛗 <strong>Elevador:</strong> ${req.body.municipalNumber || '—'}<br>📍 <strong>Morada:</strong> ${liftAddr}</div>
<div class="creds"><p>🔐 <strong>Os seus dados de acesso:</strong></p>
<p><strong>Email:</strong> <code>${_putClientEmail}</code></p>
<p>A sua palavra-passe temporária será comunicada pelo administrador da conta.</p></div>
<p style="font-size:13px;color:#e53935;font-weight:bold">⚠️ Por razões de segurança, altere a sua palavra-passe após o primeiro login.</p>
<a href="${siteBase}/pages/auth/login.html" class="btn">Entrar na plataforma →</a>
</div><div class="footer">FestLift Portugal &bull; Email gerado automaticamente.</div>
</div></body></html>`;
                        await emailService.sendEmail(
                            _putClientEmail,
                            'Bem-vindo(a) à FestLift — Os seus dados de acesso',
                            inviteHtml
                        );
                        newClientInfo.emailSent = true;
                        console.log(`📧 Email enviado para novo клієнта: ${_putClientEmail}`);
                    } catch (emailErr) {
                        console.warn(`⚠️ Erro ao enviar email para ${_putClientEmail}:`, emailErr.message);
                        newClientInfo.emailSent = false;
                        newClientInfo.emailError = emailErr.message;
                    }
                } else {
                    newClientInfo.emailSkipped = true;
                }
            }
        }
        
        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Elevador não encontrado'
            });
        }
        
        // Отримуємо оновлений документ для відповіді
        const updatedLift = await db.collection('lifts').findOne({ _id: liftId });
        
        res.json({
            success: true,
            message: 'Elevador atualizado com sucesso',
            data: updatedLift,
            newClient: newClientInfo
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar elevador:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar elevador'
        });
    }
});

// POST /api/lifts/:id/contract - завантаження контракту
app.post('/api/lifts/:id/contract', authenticateToken, upload.single('contract'), async (req, res) => {
    try {
        // 🔐 Тільки admin та dispatcher можуть завантажувати контракти
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Ficheiro de contrato não carregado'
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
            contractNumber: req.body.contractNumber || 'Sem número',
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
                message: 'Elevador não encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Contrato carregado com sucesso',
            contract: contractData
        });
    } catch (error) {
        console.error('❌ Erro ao carregar contrato:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar contrato'
        });
    }
});

// GET /api/lifts/:id/contract - отримати контракт ліфта
app.get('/api/lifts/:id/contract', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        const lift = await db.collection('lifts').findOne({ _id: liftId }, { projection: { maintenanceContract: 1 } });
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        res.json({ success: true, data: { contract: lift.maintenanceContract || null } });
    } catch (error) {
        console.error('❌ Помилка отримання контракту:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// DELETE /api/lifts/:id/contract - видалення контракту
app.delete('/api/lifts/:id/contract', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        const lift = await db.collection('lifts').findOne({ _id: liftId }, { projection: { maintenanceContract: 1 } });
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        // Видаляємо файл з диску
        if (lift.maintenanceContract?.path) {
            const fs = require('fs').promises;
            await fs.unlink(lift.maintenanceContract.path).catch(() => {});
        }

        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            { $unset: { maintenanceContract: '' }, $set: { updatedAt: new Date().toISOString() } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        res.json({ success: true, message: 'Contrato eliminado com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao eliminar contrato:', error);
        res.status(500).json({ success: false, message: 'Erro ao eliminar contrato' });
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
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        const contract = lift.maintenanceContract;
        if (!contract?.contractFile) return res.status(404).json({ success: false, message: 'Contrato não carregado' });

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
                        ${contract.startDate ? `<li><strong>Початок дії:</strong> ${new Date(contract.startDate).toLocaleDateString('pt-PT')}</li>` : ''}
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
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        if (!lift.maintenanceContract) return res.status(400).json({ success: false, message: 'Contrato ausente' });

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

// POST /api/lifts/parse-inspection-pdf - Аналіз PDF звіту та пошук ліфта (повинен бути ДО /api/lifts/:id/...)
app.post('/api/lifts/parse-inspection-pdf', authenticateToken, (req, res, next) => {
    upload.single('pdf')(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: 'Erro ao processar ficheiro: ' + err.message });
        next();
    });
}, async (req, res) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Ficheiro PDF não fornecido' });
        }

        console.log('🔍 Parsing inspection PDF:', req.file.originalname);

        // ── Save the uploaded file permanently before parsing ──────────────
        const inspPdfDir = path.join(__dirname, 'uploads', 'inspection-pdfs');
        await fs.mkdir(inspPdfDir, { recursive: true });
        const savedFilename = `insp-${Date.now()}${path.extname(req.file.originalname) || '.pdf'}`;
        const savedPath = path.join(inspPdfDir, savedFilename);
        await fs.rename(req.file.path, savedPath).catch(async () => {
            // rename may fail across filesystems – fall back to copy+delete
            const buf = await fs.readFile(req.file.path).catch(() => null);
            if (buf) await fs.writeFile(savedPath, buf);
            await cleanupFile(req.file.path).catch(() => {});
        });
        const savedFileUrl = `/uploads/inspection-pdfs/${savedFilename}`;

        // Parse with universal parser
        const parsed = await parseInspectionReport(savedPath);

        if (!parsed.success) {
            return res.status(422).json({ success: false, message: parsed.error || 'Não foi possível analisar o PDF' });
        }

        // Normalise extracted data
        const violations = parsed.violations || [];
        const hasC1 = violations.some(v => (v.classification || v.type) === 'C1');
        const hasC2 = violations.some(v => ['C2','C2*'].includes(v.classification || v.type));

        let status = 'passed';
        if (hasC1) status = 'failed';
        else if (hasC2) status = 'conditional';

        // Map certType from status
        const certType = status === 'passed' ? 'cert_2_years' : (hasC1 ? 'immobilization' : 'reinspection');

        // Extract dates from metadata
        const meta = parsed.metadata || {};
        const rawDate = meta.inspectionDate || meta.date || '';
        const rawNext = meta.nextInspectionDate || meta.validUntil || '';

        // Convert to ISO (supports YYYY/MM/DD and DD/MM/YYYY)
        function toISO(str) {
            if (!str) return '';
            const s = String(str).trim();
            // YYYY-MM-DD or YYYY/MM/DD
            if (/^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(s)) return s.replace(/\//g, '-');
            // DD/MM/YYYY or DD-MM-YYYY
            const m = s.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
            if (m) return `${m[3]}-${m[2]}-${m[1]}`;
            return s.substring(0, 10);
        }

        const dateISO = toISO(rawDate);
        const nextISO = toISO(rawNext) || (() => {
            if (!dateISO) return '';
            const d = new Date(dateISO);
            if (isNaN(d)) return '';
            if (status === 'failed') d.setDate(d.getDate() + 90);
            else d.setFullYear(d.getFullYear() + 2); // C2/C3/conditional → 2 years
            return d.toISOString().substring(0, 10);
        })();

        const extractedData = {
            date: dateISO,
            validUntil: nextISO,
            installationNumber: meta.installationNumber || meta.processNumber || meta.liftId || null,
            inspector: meta.inspector || meta.company || '',
            company: meta.company || meta.maintenanceCompany || '',
            address: meta.location || meta.address || '',
            postalCode: meta.postalCode || '',
            status: status,
            certType: certType,
            violations: violations.map(v => ({
                type: v.classification || v.type || 'C3',
                article: v.article || v.articleNumber || '',
                description: v.description || v.text || ''
            })),
            savedFileUrl: savedFileUrl
        };

        // Try to match lift in DB by address/postal code and installation number
        const liftsCol = db.collection('lifts');
        const allLifts = await liftsCol.find({}, {
            projection: { _id: 1, municipalNumber: 1, serialNumber: 1, address: 1, 'location.city': 1 }
        }).toArray();

        let allMatches = [];
        let suggestedLift = null;

        const instNum   = (extractedData.installationNumber || '').trim();
        const instBare  = instNum.replace(/^[A-Z]{2,8}[-\s]/i, '').trim();

        if (extractedData.address || extractedData.postalCode || instNum) {
            const addrLower = (extractedData.address || '').toLowerCase();
            const postalNorm = (extractedData.postalCode || '').replace(/[\s-]/g, '');

            allLifts.forEach(lift => {
                let score = 0;

                // ── Installation / municipal / serial number match (highest weight) ──
                if (instNum) {
                    const variants = [instNum, instBare].filter(Boolean);
                    const checkNum = (stored) => {
                        if (!stored) return false;
                        const s = stored.trim();
                        const sBare = s.replace(/^[A-Z]{2,8}[-\s]/i, '').trim();
                        return variants.some(v => v && (s === v || sBare === v));
                    };
                    if (checkNum(lift.serialNumber))    score += 60;
                    else if (checkNum(lift.municipalNumber)) score += 55;
                }

                // ── Address / postal code match ───────────────────────────────────
                const liftStreet = ((lift.address && (lift.address.street || lift.address.full)) || '').toLowerCase();
                const liftPostal = ((lift.address && (lift.address.postalCode || lift.address.zipCode)) || '').replace(/[\s-]/g, '');

                if (postalNorm && liftPostal && postalNorm === liftPostal) score += 60;
                if (addrLower && liftStreet) {
                    // Simple word overlap scoring
                    const words = addrLower.split(/\s+/).filter(w => w.length > 3);
                    const hits = words.filter(w => liftStreet.includes(w));
                    if (hits.length > 0) score += Math.min(40, Math.round(40 * hits.length / Math.max(words.length, 1)));
                }
                if (score > 20) allMatches.push({ ...lift, confidence: Math.min(score, 100) });
            });

            allMatches.sort((a, b) => b.confidence - a.confidence);
            if (allMatches.length > 0) {
                const topScore    = allMatches[0].confidence;
                const runnerScore = allMatches.length > 1 ? allMatches[1].confidence : 0;
                // Only auto-suggest when the top match is clearly better than the next one.
                // If two or more lifts at the same address share a near-identical score
                // (difference < 15 pts) the match is ambiguous — force the user to choose.
                if (topScore - runnerScore >= 15) {
                    suggestedLift = allMatches[0];
                }
                // else: suggestedLift stays null → frontend shows the dropdown
            }
        }

        res.json({
            success: true,
            extractedData,
            allMatches: allMatches.slice(0, 10),
            suggestedLift: suggestedLift || null,
            ambiguous: !suggestedLift && allMatches.length > 1
        });

    } catch (error) {
        console.error('❌ parse-inspection-pdf error:', error);
        if (req.file) await cleanupFile(req.file.path).catch(() => {});
        res.status(500).json({ success: false, message: error.message || 'Erro ao processar PDF' });
    }
});

app.post('/api/lifts/:id/inspection-report', authenticateToken, upload.single('pdfFile'), async (req, res) => {
    try {
        // 🔐 Тільки admin, dispatcher, technician можуть додавати звіти
        if (req.user.role === 'client') {
            return res.status(403).json({ success: false, message: 'Clientes não podem adicionar relatórios de inspeção' });
        }
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
            date: req.body.inspectionDate || req.body.date || new Date().toISOString(),
            inspectionDate: req.body.inspectionDate || req.body.date || new Date().toISOString(),
            type: req.body.inspectionType || req.body.type || req.body.reportType || 'routine',
            inspectionType: req.body.inspectionType || req.body.type || req.body.reportType || 'routine',
            inspector: req.body.inspector || req.user.username || req.user.email || 'unknown',
            notes: req.body.notes || req.body.comments || req.body.findings || '',
            status: resolvedStatus,
            c1Count: c1Count,
            c2Count: c2Count,
            c3Count: parseInt(req.body.c3Count) || 0,
            photos: [],
            reportFile: fileUrl,
            fileUrl: fileUrl,
            reportType: req.body.inspectionType || req.body.reportType || 'routine'
        };
        
        // Розрахунок наступної дати інспекції
        // C1 (crítico) = failed → +90 днів для виправлення
        // C2 (moderado) = conditional → +180 днів для виправлення
        // C3 або без клауз (passou) = +2 роки
        const calcNextInspection = () => {
            const d = new Date(reportData.date);
            if (reportData.status === 'failed') {
                d.setDate(d.getDate() + 90);   // C1: 90 днів для усунення
            } else {
                d.setMonth(d.getMonth() + 24); // C2/C3/passed: 2 роки до наступної
            }
            return d.toISOString();
        };

        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            { 
                $push: { inspectionHistory: reportData },
                $set: { 
                    lastInspectionDate: reportData.date,
                    nextInspectionDate: (req.body.nextInspectionDate && req.body.nextInspectionDate !== 'undefined')
                        ? (() => { const d = new Date(req.body.nextInspectionDate); return isNaN(d) ? calcNextInspection() : d.toISOString(); })()
                        : calcNextInspection(),
                    inspectionStatus: reportData.status === 'passed' ? 'active' : 'needs_attention',
                    // ✅ Якщо інспекція пройдена → сертифікат діє 2 роки
                    ...(reportData.status === 'passed' ? {
                        licenseDate: reportData.date,
                        licenseExpiry: (() => {
                            const d = new Date(reportData.date);
                            d.setFullYear(d.getFullYear() + 2);
                            return d.toISOString();
                        })()
                    } : {}),
                    updatedAt: new Date().toISOString()
                }
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Elevador não encontrado'
            });
        }
        
        res.status(201).json({
            success: true,
            message: 'Relatório de inspeção adicionado com sucesso',
            report: reportData
        });
    } catch (error) {
        console.error('❌ Erro ao adicionar relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao adicionar relatório'
        });
    }
});

// POST /api/lifts/:id/confirm-inspection-from-pdf - Guardar inspeção após análise de PDF
app.post('/api/lifts/:id/confirm-inspection-from-pdf', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ success: false, message: 'Clientes não podem adicionar relatórios de inspeção' });
        }
        const { ObjectId } = require('mongodb');
        let liftId;
        try {
            liftId = new ObjectId(req.params.id);
        } catch (e) {
            return res.status(400).json({ success: false, message: 'ID de elevador inválido' });
        }

        const {
            inspector, notes, reportType, status,
            savedFileUrl, lastInspectionDate, nextInspectionDate,
            violations, address, postalCode, certType
        } = req.body;

        const resolvedStatus = status || 'passed';
        const inspectionDateISO = lastInspectionDate
            ? new Date(lastInspectionDate).toISOString()
            : new Date().toISOString();

        // Build next inspection date
        const calcNext = () => {
            const d = new Date(inspectionDateISO);
            if (resolvedStatus === 'failed') d.setDate(d.getDate() + 90);
            else d.setFullYear(d.getFullYear() + 2); // C2/C3/conditional → 2 years
            return d.toISOString();
        };

        let nextDateISO = calcNext();
        if (nextInspectionDate) {
            const nd = new Date(nextInspectionDate);
            if (!isNaN(nd)) nextDateISO = nd.toISOString();
        }

        const reportData = {
            date: inspectionDateISO,
            inspectionDate: inspectionDateISO,
            type: reportType || 'annual',
            inspectionType: reportType || 'annual',
            inspector: inspector || req.user.email || 'unknown',
            notes: notes || '',
            status: resolvedStatus,
            certType: certType || '',
            violations: Array.isArray(violations) ? violations : [],
            fileUrl: savedFileUrl || null,
            reportFile: savedFileUrl || null,
            fromPdfParser: true,
            c1Count: Array.isArray(violations) ? violations.filter(v => v.type === 'C1').length : 0,
            c2Count: Array.isArray(violations) ? violations.filter(v => v.type === 'C2').length : 0,
            c3Count: Array.isArray(violations) ? violations.filter(v => v.type === 'C3').length : 0
        };

        const setFields = {
            lastInspectionDate: inspectionDateISO,
            nextInspectionDate: nextDateISO,
            inspectionStatus: resolvedStatus === 'passed' ? 'active' : 'needs_attention',
            updatedAt: new Date().toISOString()
        };

        if (address) setFields['address.street'] = address;
        if (postalCode) setFields['address.postalCode'] = postalCode;

        if (resolvedStatus === 'passed') {
            const expiry = new Date(inspectionDateISO);
            expiry.setFullYear(expiry.getFullYear() + 2);
            setFields.licenseDate = inspectionDateISO;
            setFields.licenseExpiry = expiry.toISOString();
        }

        const result = await db.collection('lifts').updateOne(
            { _id: liftId },
            {
                $push: { inspectionHistory: reportData },
                $set: setFields
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        }

        console.log(`✅ PDF inspection confirmed for lift ${req.params.id} by ${req.user.email}`);
        res.status(201).json({
            success: true,
            message: 'Relatório de inspeção guardado com sucesso',
            report: reportData
        });
    } catch (error) {
        console.error('❌ Erro confirm-inspection-from-pdf:', error);
        res.status(500).json({ success: false, message: 'Erro ao guardar relatório de inspeção' });
    }
});

// PATCH /api/lifts/:id/inspection-report/:index - actualizar um relatório de inspecção existente
app.patch('/api/lifts/:id/inspection-report/:index', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'client') {
            return res.status(403).json({ success: false, message: 'Sem permissão' });
        }
        const { ObjectId } = require('mongodb');
        let liftId;
        try { liftId = new ObjectId(req.params.id); } catch (e) {
            return res.status(400).json({ success: false, message: 'ID de elevador inválido' });
        }
        const idx = parseInt(req.params.index);
        if (isNaN(idx) || idx < 0) {
            return res.status(400).json({ success: false, message: 'Índice de relatório inválido' });
        }

        const lift = await db.collection('lifts').findOne({ _id: liftId }, { projection: { inspectionHistory: 1 } });
        if (!lift) return res.status(404).json({ success: false, message: 'Elevador não encontrado' });

        const history = lift.inspectionHistory || [];
        if (idx >= history.length) return res.status(404).json({ success: false, message: 'Relatório não encontrado' });

        const entry = { ...(history[idx] || {}) };
        const { inspectionDate, nextInspectionDate, inspector, notes, status, type } = req.body;

        if (inspectionDate) {
            const d = new Date(inspectionDate);
            if (!isNaN(d)) { entry.inspectionDate = d.toISOString(); entry.date = entry.inspectionDate; }
        }
        if (nextInspectionDate) {
            const d = new Date(nextInspectionDate);
            if (!isNaN(d)) { entry.nextInspectionDate = d.toISOString(); entry.validUntil = entry.nextInspectionDate; }
        } else if (!entry.nextInspectionDate && entry.inspectionDate && (status || entry.status) === 'passed') {
            const d = new Date(entry.inspectionDate);
            d.setFullYear(d.getFullYear() + 2);
            entry.nextInspectionDate = d.toISOString();
            entry.validUntil = entry.nextInspectionDate;
        }
        if (inspector !== undefined) entry.inspector = inspector;
        if (notes !== undefined) entry.notes = notes;
        if (status !== undefined) entry.status = status;
        if (type !== undefined) { entry.type = type; entry.inspectionType = type; }

        history[idx] = entry;

        // Recalculate root-level fields from the updated history
        const sorted = history
            .filter(r => r && (r.inspectionDate || r.date))
            .sort((a, b) => new Date(b.inspectionDate || b.date) - new Date(a.inspectionDate || a.date));

        const setFields = { inspectionHistory: history };
        if (sorted.length > 0) {
            const latest = sorted[0];
            setFields.lastInspectionDate = latest.inspectionDate || latest.date || null;
            setFields.nextInspectionDate = latest.validUntil || latest.nextInspectionDate || null;
            setFields.inspectionStatus = latest.status || 'none';
            if (latest.status === 'passed' && setFields.lastInspectionDate) {
                setFields.licenseDate = setFields.lastInspectionDate;
                const exp = new Date(setFields.lastInspectionDate);
                exp.setFullYear(exp.getFullYear() + 2);
                setFields.licenseExpiry = exp.toISOString();
            }
        }
        setFields.updatedAt = new Date().toISOString();

        await db.collection('lifts').updateOne({ _id: liftId }, { $set: setFields });
        console.log(`✅ Inspection report #${idx} updated for lift ${req.params.id} by ${req.user.email}`);
        res.json({ success: true, message: 'Relatório actualizado', report: entry });
    } catch (error) {
        console.error('❌ Erro ao actualizar relatório de inspecção:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro interno' });
    }
});

// DELETE /api/lifts/:id/inspection-report/:index - видалення звіту з масиву
app.delete('/api/lifts/:id/inspection-report/:index', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        const idx = parseInt(req.params.index);

        if (isNaN(idx) || idx < 0) {
            return res.status(400).json({ success: false, message: 'Índice de relatório inválido' });
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
            return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        }

        // Крок 3: перерахунок кореневих полів з актуальної історії
        const updatedLift = await db.collection('lifts').findOne({ _id: liftId }, { projection: { inspectionHistory: 1 } });
        const remainingHistory = updatedLift?.inspectionHistory || [];
        let newLastDate = null, newNextDate = null, newStatus = 'none';
        if (remainingHistory.length > 0) {
            const sortedHistory = remainingHistory
                .filter(r => r && (r.inspectionDate || r.date))
                .sort((a, b) => new Date(b.inspectionDate || b.date) - new Date(a.inspectionDate || a.date));
            if (sortedHistory.length > 0) {
                const latest = sortedHistory[0];
                newLastDate = latest.inspectionDate || latest.date || null;
                newStatus = latest.status || 'none';
                const vu = latest.validUntil || latest.nextInspectionDate;
                if (vu) {
                    newNextDate = vu;
                } else if (newLastDate && newStatus === 'passed') {
                    const d = new Date(newLastDate);
                    d.setFullYear(d.getFullYear() + 2);
                    newNextDate = d.toISOString();
                }
            }
        }
        await db.collection('lifts').updateOne(
            { _id: liftId },
            { $set: { lastInspectionDate: newLastDate, nextInspectionDate: newNextDate, inspectionStatus: newStatus } }
        );

        res.json({ success: true, message: 'Relatório eliminado' });
    } catch (error) {
        console.error('❌ Erro ao eliminar relatório:', error);
        res.status(500).json({ success: false, message: 'Erro ao eliminar relatório' });
    }
});

// POST /api/lifts/:id/inspection-report/:index/attach-pdf - прив'язати PDF до існуючого звіту
app.post('/api/lifts/:id/inspection-report/:index/attach-pdf', authenticateToken, upload.single('pdfFile'), async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);
        const idx = parseInt(req.params.index);

        if (isNaN(idx) || idx < 0) {
            return res.status(400).json({ success: false, message: 'Índice de relatório inválido' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Ficheiro não carregado' });
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
            return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        }

        res.json({ success: true, fileUrl, message: 'PDF прив\'язано до звіту' });
    } catch (error) {
        console.error('❌ Erro ao anexar PDF:', error);
        res.status(500).json({ success: false, message: 'Erro ao anexar PDF' });
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
            return res.status(403).json({ success: false, message: 'Permissões insuficientes' });
        }

        // Знайти ліфт
        const lift = await db.collection('lifts').findOne({ _id: liftId });
        if (!lift) {
            return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        }

        // Позначити ліфт як "pending_deletion"
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
                title: 'Pedido de remoção de elevador',
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

        res.json({ success: true, message: 'Pedido de remoção enviado ao administrador' });
    } catch (error) {
        console.error('❌ Помилка запиту на видалення:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// POST /api/lifts/:id/approve-deletion - адмін підтверджує видалення
app.post('/api/lifts/:id/approve-deletion', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);

        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Apenas o administrador pode confirmar eliminação' });
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
            return res.json({ success: true, message: 'Elevador já eliminado' });
        }

        // Видалити ліфт
        await db.collection('lifts').deleteOne({ _id: liftId });

        // Сповістити диспетчера що запит підтверджено
        if (lift.deletionRequestedBy) {
            await db.collection('notifications').insertOne({
                userId: lift.deletionRequestedBy.toString(),
                type: 'system',
                title: 'Remoção do elevador confirmada',
                message: `Адміністратор підтвердив видалення ліфта: ${lift.name || lift.address || liftId}`,
                icon: 'fas fa-check-circle',
                priority: 'normal',
                status: 'unread',
                timestamp: new Date(),
                createdAt: new Date()
            });
        }

        res.json({ success: true, message: 'Elevador eliminado com sucesso' });
    } catch (error) {
        console.error('❌ Помилка підтвердження видалення:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
    }
});

// POST /api/lifts/:id/reject-deletion - адмін відхиляє видалення
app.post('/api/lifts/:id/reject-deletion', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const liftId = new ObjectId(req.params.id);

        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Apenas o administrador pode rejeitar pedidos' });
        }

        const lift = await db.collection('lifts').findOne({ _id: liftId });
        if (!lift) {
            return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        }

        // Зняти мітку "pending_deletion"
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
                title: 'Pedido de remoção rejeitado',
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

        res.json({ success: true, message: 'Pedido de remoção rejeitado' });
    } catch (error) {
        console.error('❌ Помилка відхилення запиту:', error);
        res.status(500).json({ success: false, message: 'Erro do servidor' });
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
                message: 'Apenas o administrador pode eliminar elevadores'
            });
        }
        
        const result = await db.collection('lifts').deleteOne({ _id: liftId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Elevador não encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Elevador eliminado com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao eliminar elevador:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao eliminar elevador'
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
            cb(new Error('Tipo de ficheiro não permitido. Permitidos: PDF, DOC, DOCX, JPG, PNG'));
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
                message: 'Ficheiro não carregado'
            });
        }
        
        if (!['contract', 'inspection'].includes(documentType)) {
            // Видалити завантажений файл
            await fs.unlink(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Tipo de documento inválido'
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
                message: 'Elevador não encontrado'
            });
        }
        
        console.log('✅ Document uploaded:', req.file.originalname);
        
        res.json({
            success: true,
            message: 'Documento carregado com sucesso',
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
            message: 'Erro ao carregar documento'
        });
    }
});

// GET /api/lifts/:id/orcamentos - Orçamentos vinculados a este lift
app.get('/api/lifts/:id/orcamentos', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        if (!db) return res.status(503).json({ success: false, message: 'Base de dados indisponível' });

        const liftId = req.params.id;
        let liftObjId;
        try { liftObjId = new ObjectId(liftId); } catch { return res.status(400).json({ success: false, message: 'ID inválido' }); }

        // Шукаємо орсаменти де:
        //  1. старе поле liftId (string або ObjectId) збігається з цим ліфтом
        //  2. новий масив lifts[] містить об'єкт з liftId = цьому ліфту
        //  3. масив lifts[] містить рядок з ID ліфта (старий формат)
        //  4. масив lifts[] містить ObjectId (новий формат)
        const orcamentos = await db.collection('orcamentos').find({
            $or: [
                { liftId: liftId },
                { liftId: liftObjId },
                { 'lifts.liftId': liftId },
                { 'lifts.liftId': liftObjId },
                { lifts: liftId },
                { lifts: liftObjId }
            ]
        }).sort({ data: -1 }).toArray();

        res.json({ success: true, data: orcamentos });
    } catch (error) {
        console.error('❌ Erro ao buscar orçamentos do lift:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar orçamentos' });
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
            console.error('❌ Elevador não encontrado:', liftId);
            return res.status(404).json({
                success: false,
                message: 'Elevador não encontrado'
            });
        }
        
        const documents = lift.documents || [];
        console.log(`✅ Знайдено ${documents.length} документів для ліфта ${liftId}`);
        
        res.json(documents);
    } catch (error) {
        console.error('❌ Error fetching documents:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar documentos'
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
                message: 'Apenas o administrador pode eliminar documentos'
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
                message: 'Elevador não encontrado'
            });
        }
        
        const document = lift.documents?.find(doc => doc._id.equals(docId));
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Documento não encontrado'
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
            message: 'Documento eliminado com sucesso'
        });
    } catch (error) {
        console.error('❌ Error deleting document:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao eliminar documento'
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
        console.error('❌ Erro ao carregar municípios:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar municípios'
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
                message: 'É necessário fornecer endereço ou código postal'
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
        console.error('❌ Erro ao obter elevadores муніципалітету:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter elevadores'
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
        console.error('❌ Erro ao obter estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estatísticas'
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
                message: 'Utilizador não encontrado'
            });
        }
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ Erro ao obter perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter perfil',
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
        if (!user) return res.status(404).json({ success: false, error: 'Utilizador não encontrado' });

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('❌ Помилка пошуку по email:', error);
        res.status(500).json({ success: false, error: 'Erro do servidor' });
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
        console.error('❌ Erro ao carregar técnicos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar técnicos'
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
        console.error('❌ Erro ao carregar técnicos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar técnicos'
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
      <p>A sua palavra-passe temporária será comunicada pelo administrador da conta.</p>
    </div>
    <p style="font-size:13px;color:#e53935;font-weight:bold">⚠️ Por razões de segurança, altere a sua palavra-passe após o primeiro login.</p>
    <a href="${siteBase}/pages/auth/login.html" class="btn">Entrar na plataforma →</a>
  </div>
  <div class="footer">FestLift Portugal &bull; Email automático — não responda.</div>
</div></body></html>`;

    let emailSent = false;
    let emailError = null;
    if (!SEND_WELCOME_EMAILS) {
        console.log(`📭 [DEV] Email de boas-vindas não enviado para ${email} — SEND_WELCOME_EMAILS desativado`);
        emailSkipped = true;
    } else {
        try {
            await emailService.sendEmail(email, `🏢 FestLift — Bem-vindo(a)! Dados de acesso (${roleLabel})`, inviteHtml);
            emailSent = true;
            console.log(`✅ Convite enviado para ${role} ${email}`);
        } catch (e) {
            emailError = e.message;
            console.warn(`⚠️ Falha ao enviar convite para ${email}:`, e.message);
        }
    }

    return { user: newDoc, created: true, rawPassword, emailSent, emailError };
}

// GET /api/clients - lista todos os clientes (users com role=client)
app.get('/api/clients', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }
        const clients = await db.collection('users').find(
            { role: 'client' },
            { projection: { password: 0 } }
        ).sort({ createdAt: -1 }).toArray();
        res.json({ success: true, data: clients, total: clients.length });
    } catch (error) {
        console.error('❌ Erro ao listar clientes:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao listar clientes' });
    }
});

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
                    message: 'Acesso negado. Диспетчери повинні вказати параметр role.'
                });
            }

            // Якщо запитують конкретну роль - перевіряємо чи вона дозволена
            if (req.query.role && !allowedRoles.includes(req.query.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado. Диспетчери можуть переглядати тільки клієнтів та техніків.'
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
                message: 'Acesso negado. Тільки адміністратори можуть переглядати список користувачів.'
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

        // Підрахунок ліфтів для клієнтів (тільки коли фільтр role=client)
        if (req.query.role === 'client') {
            const liftsCollection = db.collection('lifts');
            for (let user of users) {
                const userId = user._id.toString();
                const orConditions = [
                    { client: userId },
                    { client: user._id },
                    { 'client._id': userId },
                    { 'client._id': user._id }
                ];
                if (user.email) orConditions.push({ clientEmail: user.email.toLowerCase() });
                if (user.phone && user.phone.trim()) orConditions.push({ clientPhone: user.phone });
                user.liftsCount = await liftsCollection.countDocuments({ $or: orConditions });
                console.log(`📊 Admin query — клієнт ${user.email}: ${user.liftsCount} ліфтів`);
            }
        }
        
        // Повертаємо в форматі { success: true, data: [...] } для сумісності
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('❌ Erro ao obter utilizadores:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter utilizadores'
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
                message: 'Acesso negado. Тільки адміністратори та диспетчери можуть переглядати аналітику.'
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
            message: 'Erro ao obter estatísticas'
        });
    }
});

// GET /api/ai/health - Перевірка AI системи
app.get('/api/ai/health', authenticateToken, async (req, res) => {
    try {
        const hasApiKey = !!process.env.GEMINI_API_KEY;
        const hasModel = !!process.env.GOOGLE_AI_MODEL;
        const isOllama = AI_PROVIDER === 'ollama' || (AI_PROVIDER === 'auto' && _ollamaCache.available === true);
        const provider = isOllama ? `Ollama (${OLLAMA_MODEL})` : 'Google Gemini 2.5 Flash';
        const configured = isOllama ? true : (hasApiKey && hasModel);
        const status = configured ? 'configured' : 'missing_api_key';
        
        res.json({
            success: true,
            status,
            provider,
            model: isOllama ? OLLAMA_MODEL : (process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash-exp'),
            configured,
            features: {
                chat: configured,
                pdfAnalysis: configured,
                voiceInput: true,
                voiceOutput: true
            }
        });
    } catch (error) {
        console.error('❌ Erro na verificação do sistema AI:', error);
        res.status(500).json({
            success: false,
            message: 'Erro na verificação do sistema AI',
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
            return res.status(403).json({ success: false, error: 'Acesso negado' });
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
            return res.status(400).json({ success: false, error: 'Papel inválido' });
        }
        if (req.user.role === 'dispatcher' && !['client', 'technician'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'Os operadores só podem criar clientes e técnicos'
            });
        }

        // Перевірка чи email вже існує
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Utilizador com este email já existe'
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
        console.error('❌ Erro ao criar utilizador:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar utilizador'
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
            return res.status(403).json({ success: false, error: 'Acesso negado' });
        }

        // 🔒 Валідація ObjectId
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const userId = new ObjectId(req.params.id);
        const { email, password, firstName, lastName, role, status, phone, company, address } = req.body;

        // 🔒 Диспетчер не може змінювати роль на admin/dispatcher
        if (req.user.role === 'dispatcher' && role) {
            if (!['client', 'technician'].includes(role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Os operadores só podem editar clientes e técnicos'
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

        // Клієнтські поля
        const { companyName, clientType, priority, contactPerson, contactPosition, contractInfo, notes } = req.body;
        if (companyName !== undefined) updateData.companyName = companyName;
        if (clientType !== undefined) updateData.clientType = clientType;
        if (priority !== undefined) updateData.priority = priority;
        if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
        if (contactPosition !== undefined) updateData.contactPosition = contactPosition;
        if (contractInfo !== undefined) updateData.contractInfo = contractInfo;
        if (notes !== undefined) updateData.notes = notes;

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
                error: 'Utilizador não encontrado'
            });
        }

        console.log('✅ Оновлено користувача:', userId);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar utilizador:', error);
        // Duplicate email
        if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {
            return res.status(409).json({
                success: false,
                error: 'Este email já está a ser utilizado por outro utilizador'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar utilizador'
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
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        // 🔒 Валідація ObjectId
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'ID inválido' });
        }
        const userId = new ObjectId(req.params.id);
        
        // Перевіряємо що користувач не видаляє сам себе
        if ((req.user.id || req.user.userId) === req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'Não pode eliminar a sua própria conta'
            });
        }
        
        // 🔒 ОБМЕЖЕННЯ ДЛЯ ДИСПЕТЧЕРА: не може видаляти адмінів та диспетчерів
        if (req.user.role === 'dispatcher') {
            // Спочатку знаходимо користувача, якого хочуть видалити
            const userToDelete = await db.collection('users').findOne({ _id: userId });
            
            if (!userToDelete) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilizador não encontrado'
                });
            }
            
            // Перевіряємо роль користувача, якого хочуть видалити
            if (userToDelete.role === 'admin' || userToDelete.role === 'dispatcher') {
                return res.status(403).json({
                    success: false,
                    message: `Acesso negado! Диспетчери не можуть видаляти адміністраторів та інших диспетчерів. Роль користувача: ${userToDelete.role}`
                });
            }
            
            console.log(`👮 Диспетчер ${req.user.email} видаляє користувача з роллю: ${userToDelete.role}`);
        }
        
        const result = await db.collection('users').deleteOne({ _id: userId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utilizador não encontrado'
            });
        }
        
        console.log('✅ Видалено користувача:', userId);
        res.json({
            success: true,
            message: 'Utilizador eliminado com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao eliminar utilizador:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao eliminar utilizador'
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
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        // 🔒 Валідація ObjectId
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'ID inválido' });
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
                message: 'Utilizador não encontrado'
            });
        }
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('❌ Erro ao obter utilizador:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter utilizador'
        });
    }
});

// POST /api/users/:id/reset-password — скинути пароль і надіслати email (admin + dispatcher)
app.post('/api/users/:id/reset-password', authenticateToken, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        if (!['admin', 'dispatcher'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Acesso negado' });
        }
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'ID inválido' });
        }
        const userId = new ObjectId(req.params.id);
        const user = await db.collection('users').findOne({ _id: userId }, { projection: { password: 0 } });
        if (!user) return res.status(404).json({ success: false, error: 'Utilizador não encontrado' });

        // Генеруємо тимчасовий пароль
        const rawPassword =
            Math.random().toString(36).slice(2, 6).toUpperCase() +
            Math.floor(1000 + Math.random() * 9000) +
            ['!', '@', '#', '$'][Math.floor(Math.random() * 4)];
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        await db.collection('users').updateOne(
            { _id: userId },
            { $set: { password: hashedPassword, mustChangePassword: true, updatedAt: new Date() } }
        );

        // Відправляємо email з новим паролем
        try {
            const html = `<p>Ваш тимчасовий пароль для доступу до FestLift: <strong>${rawPassword}</strong></p><p>Будь ласка, змініть його після першого входу.</p>`;
            await emailService.sendEmail(user.email, 'FestLift — Новий тимчасовий пароль', html);
        } catch (emailErr) {
            console.warn('⚠️ Не вдалося надіслати email з паролем:', emailErr.message);
        }

        res.json({ success: true, message: 'Palavra-passe redefinida', data: { temporaryPassword: rawPassword } });
    } catch (error) {
        console.error('❌ Помилка скидання пароля:', error);
        res.status(500).json({ success: false, error: 'Erro do servidor' });
    }
});

// Заявки на обслуговування

// GET /api/requests/stats - статистика запитів (МАЄ БУТИ ПЕРЕД /api/requests/:id!)
app.get('/api/requests/stats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
        return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
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
        console.error('❌ Erro ao obter estatísticas запитів:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estatísticas'
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

        // За замовчуванням — не показуємо архівовані заявки.
        // Якщо явно передано ?archived=true — показуємо тільки архів.
        if (req.query.archived === 'true') {
            query.archived = true;
        } else if (req.query.archived === 'all') {
            // не фільтруємо
        } else {
            query.archived = { $ne: true };
        }

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
        console.error('❌ Erro ao obter pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter pedidos'
        });
    }
});

// Хелпер: будує MongoDB-запит для заявок за requestNumber (REQ-...) або ObjectId
function buildRequestQuery(id) {
    const { ObjectId } = require('mongodb');
    if (/^REQ-/i.test(id)) {
        return { requestNumber: id };
    }
    try {
        const oid = new ObjectId(id);
        // Match either ObjectId _id or string _id (for legacy docs created with string _ids)
        return { $or: [{ _id: oid }, { _id: id }] };
    }
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
                message: 'Pedido não encontrado'
            });
        }

        // Access control for tech and client roles
        if (role === 'tech' || role === 'technician') {
            const assignedToMe = request.technician === userId || request.technicianId === userId;
            if (!assignedToMe) {
                return res.status(403).json({ success: false, message: 'Acesso negado' });
            }
        } else if (role === 'client') {
            const clientLifts = await db.collection('lifts')
                .find({ client: userId }, { projection: { _id: 1 } })
                .toArray();
            const liftIds = clientLifts.map(l => l._id.toString());
            if (!liftIds.includes(request.liftId)) {
                return res.status(403).json({ success: false, message: 'Acesso negado' });
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
        console.error('❌ Erro ao obter pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter pedido'
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
                const typeMap = { maintenance: 'Manutenção técnica', repair: 'Reparação', inspection: 'Inspeção técnica', consultation: 'Consulta', emergency: 'Situação de emergência' };
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
                if (!liftData?.address) return req.body.liftAddress || 'Endereço desconhecido';
                
                // Якщо address - об'єкт, формуємо рядок
                if (typeof liftData.address === 'object') {
                    const parts = [];
                    if (liftData.address.street) parts.push(liftData.address.street);
                    if (liftData.address.city) parts.push(liftData.address.city);
                    return parts.join(', ') || 'Endereço desconhecido';
                }
                return liftData.address;
            })(),
            liftClient: liftData?.client || req.body.liftClient || 'Cliente desconhecido',
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
            message: 'Pedido criado com sucesso',
            data: {
                _id: result.insertedId,
                ...newRequest
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar pedido'
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
                message: 'Pedido não encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Pedido atualizado успішно'
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar pedido'
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
                message: 'Pedido não encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Estado do pedido atualizado com sucesso',
            data: updateData
        });
    } catch (error) {
        console.error('❌ Помилка зміни статусу:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao alterar estado do pedido'
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
                message: 'O comentário não pode estar vazio'
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
                message: 'Pedido não encontrado'
            });
        }
        
        console.log('✅ Comentário adicionado com sucesso');
        
        res.json({
            success: true,
            message: 'Comentário adicionado com sucesso',
            data: newComment
        });
    } catch (error) {
        console.error('❌ Erro ao adicionar comentário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao adicionar comentário'
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
                message: 'Pedido não encontrado'
            });
        }
        
        console.log('✅ Pedido concluído com sucesso');
        
        res.json({
            success: true,
            message: 'Pedido concluído com sucesso',
            data: updateData
        });
    } catch (error) {
        console.error('❌ Erro ao concluir pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao concluir pedido'
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
                message: 'Não tem permissões para atribuir técnicos'
            });
        }
        
        if (!technicianId) {
            return res.status(400).json({
                success: false,
                message: 'Técnico não especificado'
            });
        }
        
        // Перевірка чи технік існує
        const technician = await db.collection('users').findOne({
            _id: new ObjectId(technicianId)
        });
        
        if (!technician) {
            return res.status(404).json({
                success: false,
                message: 'Técnico não encontrado'
            });
        }
        
        if (technician.role !== 'tech' && technician.role !== 'technician') {
            return res.status(400).json({
                success: false,
                message: 'O utilizador selecionado não é técnico'
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
                message: 'Pedido não encontrado'
            });
        }
        
        console.log('✅ Técnico atribuído com sucesso');
        
        res.json({
            success: true,
            message: 'Técnico atribuído com sucesso',
            data: updateData
        });
    } catch (error) {
        console.error('❌ Erro ao atribuir técnico:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atribuir técnico'
        });
    }
});

app.delete('/api/requests/:id', authenticateToken, async (req, res) => {
    try {
        // Тільки адмін може видаляти заявки
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'A eliminação de pedidos é permitida apenas ao administrador'
            });
        }

        const { ObjectId } = require('mongodb');
        const requestQuery = buildRequestQuery(req.params.id);
        
        const result = await db.collection('requests').deleteOne(requestQuery);
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Pedido eliminado com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao eliminar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao eliminar pedido'
        });
    }
});

// POST /api/requests/:id/archive - м'яке видалення (диспетчер + адмін)
app.post('/api/requests/:id/archive', authenticateToken, async (req, res) => {
    try {
        const role = req.user.role;
        if (!['admin', 'dispatcher'].includes(role)) {
            return res.status(403).json({ success: false, message: 'Permissões insuficientes для архівування' });
        }
        const requestQuery = buildRequestQuery(req.params.id);
        const result = await db.collection('requests').updateOne(requestQuery, {
            $set: {
                archived: true,
                archivedAt: new Date().toISOString(),
                archivedBy: req.user.username,
                updatedAt: new Date().toISOString()
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }
        res.json({ success: true, message: 'Pedido movido para arquivo' });
    } catch (error) {
        console.error('❌ Erro ao arquivar заявки:', error);
        res.status(500).json({ success: false, message: 'Erro ao arquivar' });
    }
});

// POST /api/requests/:id/unarchive - відновлення з архіву (тільки адмін)
app.post('/api/requests/:id/unarchive', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Restauro do arquivo — apenas para administrador' });
        }
        const requestQuery = buildRequestQuery(req.params.id);
        const result = await db.collection('requests').updateOne(requestQuery, {
            $unset: { archived: '', archivedAt: '', archivedBy: '' },
            $set: { updatedAt: new Date().toISOString() }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }
        res.json({ success: true, message: 'Pedido restaurado do arquivo' });
    } catch (error) {
        console.error('❌ Erro ao restaurar:', error);
        res.status(500).json({ success: false, message: 'Erro ao restaurar' });
    }
});

// POST /api/requests/:id/false-call - позначити як фальшивий виклик (диспетчер + адмін)
app.post('/api/requests/:id/false-call', authenticateToken, async (req, res) => {
    try {
        const role = req.user.role;
        if (!['admin', 'dispatcher'].includes(role)) {
            return res.status(403).json({ success: false, message: 'Permissões insuficientes' });
        }
        const requestQuery = buildRequestQuery(req.params.id);
        const result = await db.collection('requests').updateOne(requestQuery, {
            $set: {
                status: 'cancelled',
                falseCall: true,
                falseCallAt: new Date().toISOString(),
                falseCallBy: req.user.username,
                archived: true,
                archivedAt: new Date().toISOString(),
                archivedBy: req.user.username,
                updatedAt: new Date().toISOString()
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }
        res.json({ success: true, message: 'Pedido marcado como chamada falsa e arquivado' });
    } catch (error) {
        console.error('❌ Помилка позначення фальшивого виклику:', error);
        res.status(500).json({ success: false, message: 'Erro na operação' });
    }
});

// POST /api/requests/:id/cancel - клієнт скасовує свою заявку (тільки pending/assigned)
app.post('/api/requests/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const role = req.user.role;
        const userId = (req.user.userId || req.user.id || '').toString();

        const requestQuery = buildRequestQuery(req.params.id);
        const request = await db.collection('requests').findOne(requestQuery);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }

        // Клієнт може скасувати тільки свою заявку і тільки в статусі pending/assigned
        if (role === 'client') {
            const liftDoc = await db.collection('lifts').findOne({ _id: request.liftId });
            const liftOwnerId = liftDoc ? (liftDoc.client || liftDoc.clientId || '').toString() : '';
            if (liftOwnerId !== userId) {
                return res.status(403).json({ success: false, message: 'Não pode cancelar o pedido de outro utilizador' });
            }
            if (!['pending', 'assigned', 'new'].includes(request.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'O pedido só pode ser cancelado antes do início da execução'
                });
            }
        } else if (!['admin', 'dispatcher'].includes(role)) {
            return res.status(403).json({ success: false, message: 'Permissões insuficientes' });
        }

        const result = await db.collection('requests').updateOne(requestQuery, {
            $set: {
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
                cancelledBy: req.user.username,
                updatedAt: new Date().toISOString()
            }
        });

        res.json({ success: true, message: 'Pedido cancelado' });
    } catch (error) {
        console.error('❌ Erro ao cancelar заявки:', error);
        res.status(500).json({ success: false, message: 'Erro ao cancelar' });
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
        console.error('❌ Erro ao obter configurações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter configurações'
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
            message: 'Configurações guardadas',
            modified: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ Erro ao guardar configurações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao guardar configurações'
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
                message: 'Idioma não especificado'
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
            message: 'Idioma alterado',
            language
        });
    } catch (error) {
        console.error('❌ Erro ao alterar idioma:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao alterar idioma'
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
                message: 'Tema não especificado'
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
            message: 'Tema alterado',
            theme
        });
    } catch (error) {
        console.error('❌ Erro ao alterar tema:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao alterar tema'
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
            text: 'Cessar imediatamente a operação do elevador até corrigir violações críticas'
        });
    }
    if (c2Count > 0) {
        recommendations.push({
            icon: '⏰',
            text: 'Corrigir violações moderadas em 30 dias'
        });
    }
    if (c3Count > 0) {
        recommendations.push({
            icon: '📝',
            text: 'Programar correção de violações menores em 90 dias'
        });
    }
    recommendations.push({
        icon: '🔧',
        text: 'Contactar empresa certificada para a realização dos trabalhos'
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
  Prazo: Correção IMEDIATA antes de reativação. Sem exceções.
  Exemplos: para-quedas defeituoso, portas sem bloqueio, cabos com >10% fios partidos,
            freio que não trava, limitador de velocidade inoperacional, válvula de descida descontrolada.

• C2 — GRAVE: Situação perigosa que pode causar acidente a curto/médio prazo.
  Prazo: 2 ANOS para correção (Despacho n.º 27/2024 - VIGENTE).
  ⚠️ ATENÇÃO: Despacho 17/2022 estabelecia 30 dias para C2 mas foi COMPLETAMENTE REVOGADO pelo Despacho 27/2024!
  O prazo VIGENTE e ÚNICO para C2 é 2 ANOS. Qualquer referência a "30 dias para C2" é INCORRETA.
  Exemplos: dispositivos de segurança com desgaste, iluminação de emergência sem bateria,
            telefone inoperacional, nivelação com desvio >35mm, documentação técnica em falta.

• C3 — OBSERVAÇÃO: Não conformidade menor, sem risco imediato.
  Prazo: Resolver na próxima manutenção programada (sem prazo legal fixo).
  Exemplos: documentação incompleta, desgaste cosmético, ruído não crítico, limpeza deficiente.

FREQUÊNCIAS DE INSPEÇÃO (DL 320/2002, art.º 10.º e 12.º):
• Inspeção aprovada (sem C1/C2): próxima inspeção em 2 ANOS (24 meses)
• Inspeção reprovada (com C1 ou C2): reavaliação obrigatória em 180 DIAS para verificar correções
• Após modernização: inspeção de verificação pela EIIE obrigatória antes de reativar
• Elevadores em condomínios: proprietário/administrador responsável por contratar EIIE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 DL 320/2002 — ARTIGOS DETALHADOS (Manutenção e Inspeção)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Art.º 1.º — Objeto e âmbito:
  Aplica-se a ascensores, monta-cargas, escadas mecânicas e tapetes rolantes APÓS entrada em serviço.
  Excluídos: monta-cargas com carga nominal inferior a 100 kg.

Art.º 2.º — Definições importantes:
  • EMIE (Empresa de Manutenção de Instalações de Elevação) — empresa certificada que faz manutenção
  • EIIE (Entidade Inspetora de Instalações de Elevação) — entidade acreditada que faz inspeções
  • Proprietário — responsável legal pela manutenção e inspeção do elevador
  • Instalação — o elevador em serviço num edifício

Art.º 5.º — Manutenção obrigatória:
  § 1 — O proprietário é OBRIGADO a celebrar contrato de manutenção com EMIE certificada.
  § 2 — A manutenção MÍNIMA obrigatória é mensal (1 vez por mês).
  § 3 — O contrato deve cobrir: visitas mensais, intervenções de emergência, peças de desgaste normal.
  ⚠️ Elevador sem contrato de manutenção válido = infração grave = C2 imediato em inspeção.

Art.º 6.º — Livro de manutenção:
  § 1 — Cada elevador deve ter livro de manutenção físico ou digital.
  § 2 — Cada visita mensal deve ser registada com data, técnico responsável e trabalhos realizados.
  § 3 — O livro deve estar acessível à EIIE durante inspeções.
  ⚠️ Ausência de registos = C3 (documentação) ou C2 (se mais de 3 meses sem registos).

Art.º 7.º — Contrato de manutenção:
  § 1 — O contrato deve identificar claramente a EMIE (nome, NIF, número de registo DGEG).
  § 2 — Deve incluir frequência de visitas (mínimo mensal), âmbito de trabalhos, resposta a emergências.
  § 3 — Contratos com EMIE não registada na DGEG são NULOS e o proprietário fica sem cobertura legal.

Art.º 8.º — Registos de anomalias:
  EMIE é obrigada a comunicar ao proprietário qualquer anomalia C1 ou C2 por escrito no prazo de 48 horas.
  Se C1: comunicação IMEDIATA e elevador deve ser imobilizado antes de sair do local.

Art.º 10.º — Inspeção periódica:
  § 1 — O proprietário é obrigado a realizar inspeção periódica por EIIE acreditada pelo IPAC.
  § 2 — Periodicidade: 2 anos (aprovação) ou 180 dias (reprovação).
  § 3 — A EIIE emite certificado de inspeção com resultado (aprovado/reprovado) e lista de cláusulas.
  § 4 — O certificado deve ser afixado na cabine do elevador em local visível.

Art.º 11.º — Conteúdo da inspeção:
  A EIIE verifica: estrutura da caixa, cabine e portas, sistema de tração/hidráulico, dispositivos de segurança,
  instalação elétrica, casa de máquinas, sistema de comunicação de emergência, documentação técnica.

Art.º 12.º — Resultados e cláusulas:
  § 1 — Aprovado: todos os dispositivos de segurança em conformidade, sem C1 ou C2.
  § 2 — Reprovado: presença de pelo menos 1 cláusula C1 (imobilização imediata) ou C2.
  § 3 — O proprietário tem obrigação de comunicar o resultado à câmara municipal.
  § 4 — EIIE envia cópia do relatório à câmara municipal automaticamente.

Art.º 13.º — Imobilização imediata (C1):
  § 1 — A EIIE tem PODER e OBRIGAÇÃO de imobilizar o elevador no próprio ato de inspeção se encontrar C1.
  § 2 — A reativação só é possível após: (a) correção comprovada da C1; (b) nova inspeção pela EIIE.
  § 3 — Colocar elevador em serviço após imobilização = crime (art.º 291.º CP) + coima até €44.000.

Art.º 14.º — Comunicação de acidentes:
  § 1 — O proprietário/EMIE é OBRIGADO a comunicar qualquer acidente com elevador à câmara municipal
        e à DGEG no prazo de 24 horas.
  § 2 — A câmara pode ordenar inspeção extraordinária imediata.
  § 3 — Não comunicar acidente = coima de €2.500 a €25.000.

Art.º 15.º — Acesso à instalação:
  § 1 — Proprietário deve garantir acesso da EMIE e EIIE ao elevador e casa de máquinas.
  § 2 — Recusar acesso à EIIE para inspeção = infração grave = coima + possível interdição pelo município.

Art.º 16.º — Modernização:
  § 1 — Qualquer modificação significativa (motor, portas, quadro elétrico, cabos portadores) exige:
        (a) projeto técnico por engenheiro inscrito na Ordem dos Engenheiros;
        (b) autorização prévia da câmara municipal (em alguns municípios);
        (c) inspeção de verificação antes de voltar ao serviço.
  § 2 — Modernizações devem cumprir EN 81-80:2020 (Regras de segurança para elevadores existentes).
  § 3 — Após modernização, o elevador recebe novo certificado de conformidade.

Art.º 17.º — Registo de instalações:
  § 1 — Todos os elevadores devem estar registados no SINIME (Sistema Nacional de Instalações de Manutenção de Elevadores).
  § 2 — O registo inclui: localização, ano de instalação, fabricante, tipo, EMIE contratada, EIIE.
  § 3 — Elevador não registado = infração do proprietário.

Art.º 19.º — Competências das câmaras municipais:
  § 1 — As câmaras municipais têm competência para fiscalizar o cumprimento das inspeções periódicas.
  § 2 — Podem solicitar relatórios de inspeção a qualquer momento.
  § 3 — Podem ordenar inspeção extraordinária se receberem queixa ou suspeita de perigo.
  § 4 — Têm poder de interditar o uso do elevador e apor selos de imobilização.

Art.º 20.º — EMIE — requisitos de acesso à atividade:
  § 1 — EMIE deve estar registada na DGEG antes de iniciar qualquer atividade de manutenção.
  § 2 — Requisitos: capacidade técnica comprovada, seguro de responsabilidade civil mínimo obrigatório,
        pessoal com formação certificada em elevadores.
  § 3 — Lista de EMIE registadas disponível em: www.dgeg.gov.pt

Art.º 22.º — EIIE — requisitos de acreditação:
  § 1 — EIIE deve estar acreditada pelo IPAC (Instituto Português de Acreditação) segundo NP EN ISO/IEC 17020.
  § 2 — A acreditação garante independência, imparcialidade e competência técnica.
  § 3 — EIIE não pode realizar inspeções em elevadores que ela própria mantém (conflito de interesses).
  § 4 — Lista de EIIE acreditadas: www.ipac.pt

Art.º 25.º — Responsabilidade do proprietário:
  § 1 — O proprietário é o PRIMEIRO RESPONSÁVEL pela segurança do elevador.
  § 2 — A responsabilidade não é transferível para a EMIE — o contrato de manutenção não exonera o proprietário.
  § 3 — Em caso de acidente, proprietário e EMIE têm responsabilidade solidária.

Art.º 42.º — Coimas (tabela completa):
  • Manutenção sem contrato com EMIE registada: €1.000 a €5.000 (singular) / €2.500 a €44.000 (coletiva)
  • Falta de livro de manutenção: €250 a €3.740
  • Não realizar inspeção periódica: €250 a €5.000 (singular) / €2.500 a €44.000 (coletiva)
  • Manter elevador em serviço após imobilização C1: €2.500 a €44.000 + responsabilidade criminal
  • Não comunicar acidente: €2.500 a €25.000
  • Recusar acesso à EIIE: €1.000 a €10.000
  • Atividade de EMIE sem registo DGEG: €7.500 a €37.500

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 DL 58/2017 — ARTIGOS DETALHADOS (Ascensores Novos / Diretiva 2014/33/UE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Art.º 1.º — Âmbito:
  Aplica-se a ascensores instalados PERMANENTEMENTE em edifícios ou construções, colocados no mercado
  após 9 de junho de 2017. Para elevadores existentes (antes de 2017) aplica-se DL 295/98 (revogado)
  e DL 320/2002 (manutenção).

Art.º 3.º — Definições:
  • Ascensor — aparelho de elevação com cabine que serve níveis definidos, com inclinação >15° em relação à vertical
  • Instalador — pessoa singular ou coletiva que assume responsabilidade pelo projeto, fabrico,
                  instalação e colocação em serviço
  • Componentes de segurança — 14 componentes listados no Anexo III (para-quedas, limitador, portas, etc.)

Art.º 5.º — Marcação CE:
  § 1 — Todo ascensor novo colocado no mercado DEVE ter marcação CE.
  § 2 — A marcação CE significa que o ascensor cumpre os Requisitos Essenciais de Saúde e Segurança (RESS)
        do Anexo I da Diretiva 2014/33/UE.
  § 3 — Sem marcação CE = proibido colocar em serviço.

Art.º 6.º — Declaração UE de Conformidade:
  § 1 — O instalador deve emitir Declaração UE de Conformidade antes de colocar em serviço.
  § 2 — A declaração deve conter: identificação do ascensor, normas aplicadas, referência ao
        organismo notificado que fez avaliação de conformidade.
  § 3 — O instalador deve conservar a declaração por 10 anos.

Art.º 9.º — Organismo Notificado:
  § 1 — O instalador deve envolver obrigatoriamente um Organismo Notificado (ON) para avaliação de conformidade.
  § 2 — Em Portugal, o ON para elevadores é geralmente o ISQ (Instituto de Soldadura e Qualidade) ou similar.
  § 3 — O ON verifica: projeto, produção ou produto final (3 módulos alternativos disponíveis).

Art.º 14.º — Obrigações do instalador:
  (a) Garantir que o ascensor cumpre RESS do Anexo I
  (b) Elaborar documentação técnica completa
  (c) Realizar procedimento de avaliação de conformidade adequado
  (d) Emitir declaração UE de conformidade e apor marcação CE
  (e) Conservar documentação técnica por 10 anos
  (f) Fornecer instruções de utilização e manutenção ao proprietário em português

Art.º 16.º — Obrigações do importador/distribuidor:
  Não pode colocar em serviço ascensores sem marcação CE e documentação completa.

Art.º 20.º — Modificações substanciais:
  Se após entrada em serviço for efetuada modificação substancial (ex: substituição de motor, mudança
  de velocidade nominal, alteração de carga nominal), o ascensor é considerado NOVO e deve passar
  novamente pelo processo de avaliação de conformidade completo (novo CE + novo ON).

Art.º 26.º — Fiscalização:
  ASAE (Autoridade de Segurança Alimentar e Económica) fiscaliza a colocação no mercado.
  DGEG supervisiona e coordena a aplicação do DL 58/2017.
  Câmaras municipais fiscalizam inspeções periódicas (DL 320/2002).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 LEI 65/2013 — EMIE e EIIE (Regime de Acesso à Atividade)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Art.º 3.º — EMIE (Empresa de Manutenção de Instalações de Elevação):
  • Registo obrigatório na DGEG antes de qualquer atividade
  • Técnicos responsáveis devem ter formação específica em elevadores (curso reconhecido)
  • Seguro de responsabilidade civil mínimo obrigatório (valor definido por portaria)
  • Renovação anual do registo com prova de seguro válido

Art.º 4.º — Técnicos de manutenção:
  • Devem ter diploma de curso técnico-profissional em eletromecânica ou equipamento
  • OU experiência comprovada de 3+ anos na área + formação complementar certificada
  • Devem conhecer: EN 81 series, DL 320/2002, procedimentos de segurança em trabalho em altura

Art.º 8.º — EIIE (Entidade Inspetora de Instalações de Elevação):
  • Acreditação IPAC obrigatória segundo NP EN ISO/IEC 17020 (tipo A ou C)
  • Inspetores devem ter formação universitária em engenharia + especialização em elevadores
  • Proibição de inspeção de elevadores que a própria EIIE mantém (independência)
  • Responsabilidade civil pelos relatórios emitidos

Art.º 12.º — Reconhecimento mútuo UE:
  EMIE/EIIE registadas noutro Estado-Membro da UE podem operar em Portugal mediante comunicação
  prévia à DGEG (não necessitam de novo registo, mas devem cumprir requisitos do DL 320/2002).

Art.º 15.º — Suspensão e cancelamento de registo:
  DGEG pode suspender ou cancelar registo de EMIE/EIIE em caso de: acidente grave por negligência,
  inspeções fraudulentas, falta de seguro válido, incumprimento reiterado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 EN 81-20:2020 — REQUISITOS TÉCNICOS DETALHADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cláusula 5.2 — Caixa do elevador (poço):
  • Deve ser fechada em todos os lados (paredes, teto, fundo)
  • Não podem existir outras instalações na caixa (tubagens de gás, água, etc.) exceto as do próprio elevador
  • Iluminação permanente mínima 50 lux ao nível do solo da fossa
  • Altura livre no topo (espaço de refúgio): mínimo 1,0 m acima do último patamar servido
  • Profundidade da fossa: mínimo 0,5 m (elevadores lentos) a 1,5 m (velocidade >1 m/s)
  ⚠️ Falta de espaço de refúgio no topo ou fundo = C1 (risco de esmagamento do técnico)

Cláusula 5.3 — Casa de máquinas:
  • Acesso reservado exclusivamente ao pessoal autorizado (chave específica, sinalização)
  • Temperatura de funcionamento: +5°C a +40°C (variação excessiva degrada isolamento elétrico)
  • Iluminação permanente mínima 200 lux ao nível do painel de controlo
  • Tomada elétrica de serviço obrigatória (220V ou 400V conforme instalação)
  • Extintor de incêndio adequado (CO2 ou pó) obrigatório dentro da casa de máquinas
  • Largura de passagem mínima de 0,5 m em torno dos equipamentos
  ⚠️ Casa de máquinas acessível a não autorizados = C2; sem iluminação = C2

Cláusula 5.4 — Portas de patamar (andares):
  • Resistência ao fogo: mínimo EI30 (boa prática) conforme legislação de incêndio do edifício
  • Folga máxima entre folhas de porta e entre folha e batente: 6 mm
  • Encravamento elétrico e mecânico simultâneos: a porta só abre quando cabine está no nível ± tolerância
  • Contato de porta deve detetar abertura mesmo com 6N de força aplicada
  • Indicador de andar obrigatório no exterior do patamar (LED, seta de direção)
  ⚠️ Encravamento inoperacional = C1. Folga > 6mm entre portas (risco de prender dedos) = C2.

Cláusula 5.5 — Cabine:
  • Dimensões mínimas: 1,0m × 1,3m × 2,0m (L×P×H) para carga nominal ≥630 kg
  • Porta de cabine: deve fechar automaticamente e ter contato de segurança
  • Abertura da porta da cabine: só permitida no nível do patamar ± 200 mm (zona de desbloqueamento)
  • Iluminação: mínimo 100 lux na área de embarque. Iluminação de emergência ≥1 lux por mínimo 1 hora
  • Botoneira de sobrecarga: alarme obrigatório quando carga exceder carga nominal
  • Telefone bidirecional de emergência: conexão com serviço de assistência permanente (24/7)
  ⚠️ Sem telefone de emergência = C2. Iluminação de emergência sem bateria = C2.

Cláusula 5.6 — Velocidade e acelerações:
  • Velocidade nominal deve ser respeitada ±5% em regime permanente
  • Desaceleração na paragem: máximo 0,3 m/s² para conforto dos passageiros
  • Solavancos brusquos na paragem indicam: freio mal regulado (C2), desgaste das guias (C3)

Cláusula 5.7 — Para-quedas e limitador de velocidade:
  • Para-quedas progressivo obrigatório para velocidade >1 m/s
  • Para-quedas instantâneo permitido apenas para velocidade ≤0,63 m/s
  • Teste de para-quedas obrigatório em cada inspeção periódica E após qualquer intervenção no dispositivo
  • Limitador de velocidade deve acionar para-quedas a velocidade Vd = 1,25 × V nominal (mín. V+0,25 m/s)
  ⚠️ Para-quedas que não atua no teste = C1 IMEDIATO (imobilização obrigatória).
  ⚠️ Limitador de velocidade bloqueado ou correia partida = C1.

Cláusula 5.8 — Cabos de suspensão:
  • Mínimo 2 cabos de aço independentes para tração
  • Diâmetro mínimo: 8 mm (geral) ou 6 mm (elevadores MRL/pequenos)
  • Fator de segurança mínimo: 12 vezes a carga de rutura para cada cabo
  • Critério de substituição: >10% fios partidos numa torçada em 1 trepada de cabo, ou
    >5 fios partidos em secções de 6× diâmetro do cabo
  • Corrosão visível, achatamento, torção permanente = substituição obrigatória
  ⚠️ Cabos com >10% fios partidos = C1. Cabos com corrosão avançada = C1 ou C2 conforme gravidade.

Cláusula 5.9 — Freio:
  • Freio eletromagnético de segurança sobre a polia motriz (ou disco no tambor)
  • Deve parar e manter a carga nominal + 25% de sobrecarga em qualquer posição
  • Teste: com carga nominal + 25%, ao desligar a corrente, o freio deve parar em ≤1 m (V≤1 m/s)
  • Pastilhas do freio: verificar desgaste em cada manutenção mensal (espessura mínima 2mm)
  ⚠️ Freio que não para carga nominal = C1. Folga excessiva entre pastilha e disco = C2.

Cláusula 5.10 — Amortecedores:
  • Amortecedores no fundo da fossa (sob cabine e contrapeso)
  • Tipos: resorte (V≤1 m/s), polietileno/poliuretano (V≤1,6 m/s), hidráulico (V>1 m/s)
  • Amortecedor hidráulico: nível de óleo visível no indicador, sem fugas, reposição após teste
  ⚠️ Amortecedor deformado permanentemente (após teste) = C1. Fuga de óleo em amortecedor hidráulico = C2.

Cláusula 5.12 — Sistema de nivelação:
  • Tolerância de paragem: ±10 mm (nível de conforto) / ±20 mm (nível tolerável)
  • Desvio >20 mm: risco de tropicão à entrada/saída (especialmente idosos e cadeiras de rodas)
  • Causa típica: sensores de zona de paragem sujos ou sinaléticas magnéticas deslocadas
  ⚠️ Nivelação com desvio >35 mm = C2 (risco de queda). >50 mm = C1 em elevadores de acessibilidade.

Cláusula 6.4 — Telefone de emergência (EN 81-28):
  • Comunicação bidirecional garantida com serviço de assistência 24/7 (não pode ser apenas gravador)
  • Teste mensal obrigatório documentado no livro de manutenção
  • Funcionamento autónomo (bateria) mínimo 1 hora após corte de energia
  ⚠️ Telefone inoperacional = C2. Sem número de assistência 24h = C2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 EN 81-50:2020 — REGRAS DE PROJETO E ENSAIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Esta norma define os ensaios e cálculos para COMPROVAR que os componentes cumprem EN 81-20.
Aplica-se a: para-quedas, limitadores de velocidade, amortecedores, portas de patamar, componentes de cabos.

Pontos críticos para inspeção:
• 5.3 — Ensaio do para-quedas: deve ser realizado com carga nominal completa. Resultado: paragem progressiva
        sem deformação permanente da cabine. Ensaio de tipo (fábrica) + ensaio em obra após instalação.
        Desaceleração: entre 0.2g e 1g. Após actuação em obra: verificar guias e cabina antes de reactivar.
• 5.4 — Carga nominal: placarda com carga nominal e número máximo de pessoas obrigatória na cabine
• 5.5 — Resistência da cabine: estrutura deve suportar 3× carga nominal sem deformação permanente
• 6.2 — Ensaios elétricos: teste de isolamento ≥1 MΩ entre fases e entre fase e terra
• Cabos suspensão: fator segurança ≥12 (aço) ou ≥10 (cintas poliuretano); mín. Ø8mm; mín. 2 cabos
  ⚠️ >10% fios partidos num passo de torcedura = substituição imediata = C1
• Limitador de velocidade: actuação ≥115% velocidade nominal; verificação/taração máx. 2 anos
• Amortecedores: mola (v≤1m/s) ou hidráulico (v>1m/s); hidráulico: desaceleração máx. 1g durante ensaio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 EN 81-70:2022 — ACESSIBILIDADE (Pessoas com Mobilidade Reduzida)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Aplica-se OBRIGATORIAMENTE a edifícios de habitação coletiva novos e a modernizações onde tecnicamente possível.
Referência em Portugal: DL 163/2006 (Acessibilidade) + EN 81-70.

TIPOS DE ELEVADOR ACESSÍVEL:
• Tipo 1 (assistido): cabina ≥1000×1250mm; porta livres ≥800mm
• Tipo 2 (cadeira de rodas autónomo — obrigatório em edifícios novos): cabina ≥1100×1400mm; porta ≥900mm
  Carga nominal mínima Tipo 2: 630kg (cadeira + utilizador + acompanhante)

Requisitos comuns Tipo 2:
• Botoneiras: altura 900–1200mm do piso; Braille + relevo tátil; dimensão mínima botão 20×20mm
• Sinalização sonora: anúncio do andar em voz sintética obrigatório + sinal de abertura de porta
• Espelho: parede oposta à porta (300mm ao nível do piso até ≥1000mm), para cadeira recuar
• Corrimão: mín. 1 parede lateral, 900mm altura, Ø30–45mm, afastamento 35–45mm da parede
• Nivelação: tolerância ≤±10mm; re-nivelagem automática obrigatória no Tipo 2
• Iluminação: mínimo 100 lux uniforme em toda a cabina
• Tempo de porta aberta: ≥8 segundos; sensor de área obrigatório (não apenas borracha)
• Alarme emergência: ≤900mm do piso; comunicação bidirecional 24/7; bateria ≥1h
• Espaço livre patamar Tipo 2: ≥1500×1500mm frente à porta
⚠️ Edifícios obrigados por DL 163/2006 que não cumprem EN 81-70 = C2 em inspeção.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 NP EN 81-80:2003 — REGRAS DE SEGURANÇA PARA ASCENSORES EXISTENTES (MODERNIZAÇÃO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CAMPO DE APLICAÇÃO (Sect. 1):
  Aplica-se a ascensores EXISTENTES (eléctricos de aderência/tambor e hidráulicos),
  servindo pisos definidos, cabina para pessoas/carga, inclinação guias ≤15°.
  Objectivo: elevar o nível de segurança ao estado actual da arte (equivalente a ascensor novo).
  NÃO se aplica: pater noster, minas, navios, teatro, estaleiros, inclinação >15°.

NÍVEIS DE PRIORIDADE (Anexo A — Metodologia de Risco):
  Severidade: I=Catastrófico | II=Crítico | III=Marginal | IV=Negligenciável
  Frequência: A=Frequente → F=Impossível
  • EXTREMO → IMOBILIZAR ascensor IMEDIATAMENTE (ex: ausência pára-quedas, caixa exposta)
  • ALTO    → curto prazo (~5 anos)
  • MÉDIO   → médio prazo (~10 anos ou modernização maior)
  • BAIXO   → longo prazo ou junto com modernização de componente
  (74 situações perigosas catalogadas na Tabela 1)

PRECISÃO DE PARAGEM E NIVELAMENTO (Sect. 5.2.2) — Prioridade ALTA:
  • Precisão de paragem: ±10 mm (soleira cabina vs soleira patamar, portas abertas)
  • Precisão de nivelamento: ±20 mm (manter durante carga/descarga)
  Referência: EN 81-70:2003 sect. 5.3.3. Recomendado a TODOS os ascensores.

CAIXA (Sect. 5.5):
  • 5.5.6.2 — Caixa comum a vários ascensores: distância horizontal entre tecto da cabina e
    órgãos em movimento do ascensor contíguo DEVE SER >0,5 m. Se <0,5 m = divisória a toda a altura. ALTA.
  • 5.5.7   — Espaços de segurança topo/poço: conforme EN 81-1:1998 5.7.1/5.7.2/5.7.3. ALTA.
  • 5.5.8   — Acesso ao poço: acesso seguro obrigatório conforme EN 81-1:1998 5.7.3.2. ALTA.
  • 5.5.9   — Botões de paragem (stop): obrigatórios no poço e na casa de rodas. ALTA.
  • 5.5.10  — Iluminação da caixa: adequada conforme EN 81-1:1998 5.9. ALTA.
  • 5.5.11  — Alarme de socorro no poço e tecto da cabina. MÉDIA.

PORTAS DE PATAMAR (Sect. 5.7):
  • 5.7.7   — Encravamentos: nível equivalente EN 81-1:1998; versões pré-1998 com 5 mm penetração OK. ALTA.
  • 5.7.8.1 — Desencravamento de socorro: APENAS com chave triangular. ALTA.
  • 5.7.8.2 — Encravamentos inacessíveis do exterior (impede uso abusivo). ALTA.
  • 5.7.9   — Portas de correr automáticas: dispositivo de fecho automático obrigatório. ALTA.

CABINA (Sect. 5.8):
  • 5.8.1   — Área útil cabina deve corresponder à carga nominal (EN 81-1 8.2). BAIXA.
  • 5.8.6   — Tecto da cabina: distância livre horizontal ≤0,30 m para as paredes da caixa.
             Se >0,30 m: instalar balaustrada (EN 81-1:1998 8.13.3) ou prolongar tecto. ALTA.
  • 5.8.3   — Cabina sem porta: instalar porta mecânica ou manual obrigatoriamente. ALTA.
  • 5.8.7   — Ventilação da cabina suficiente (EN 81-1:1998 8.16 na falta de regulamentos nacionais). MÉDIA.
  • 5.8.8.2 — Iluminação de emergência na cabina obrigatória (EN 81-1:1998 8.17.4). MÉDIA.

SUSPENSÃO E PROTECÇÃO VELOCIDADE (Sect. 5.9):
  • 5.9.2   — TODOS os ascensores eléctricos: OBRIGATÓRIO pára-quedas + limitador de velocidade
             compatível. Verificar e ENSAIAR compatibilidade. Se incompatível: substituir. ALTA.
  • 5.9.4   (UCMP) — Roda de aderência com contrapeso: protecção contra velocidade excessiva em
             SUBIDA (9.10 EN 81-1:1998). Movimento incontrolado com portas abertas:
             parar em <0,90 m do nível do piso; desaceleração máx. 1g; reposto só por pessoa competente. ALTA.

GUIAS E AMORTECEDORES (Sect. 5.10):
  • 5.10.1  — Contrapeso guiado só por 2 cabos de aço: substituir por guias rígidas ou 4 cabos. BAIXA.
  • 5.10.2  — Amortecedores: obrigatórios em TODOS os ascensores (EN 81-1:1998 10.3). ALTA.

MÁQUINA (Sect. 5.12):
  • 5.12.1  — Travão electromecânico: DUPLA ACÇÃO obrigatório (EN 81-1:1998 12.4.2). ALTA.
  • 5.12.2  — Manobra de socorro: obrigatória + instruções claramente expostas (16.3.1). ALTA.
  • 5.12.6  — Limitador de tempo de funcionamento do motor: obrigatório. BAIXA.

INSTALAÇÃO ELÉCTRICA (Sect. 5.13):
  • 5.13.1  — Aparelhagem eléctrica: invólucros ≥ IP 2X. Bornes >50V após abrir interruptor: marcação obrigatória.
  • 5.13.3  — Interruptores principais BLOQUEÁVEIS obrigatórios na casa de máquinas. ALTA.

COMANDOS E ALARMES (Sect. 5.14):
  • 5.14.2  — Tecto da cabina: botão de inspecção + botão de paragem (stop) OBRIGATÓRIOS. ALTA.
  • 5.14.3  — Alarme de socorro: comunicação vocal BIDIRECCIONAL (EN 81-1:1998 14.2.3 + EN 81-28). ALTA.
  • 5.14.4  — Cursos >30m: intercomunicador cabina ↔ casa de máquinas obrigatório. MÉDIA.
  • 5.14.5  — Controlo de carga: evitar arranque em sobrecarga. BAIXA.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 DECRETO 513/70 — REGULAMENTO DE SEGURANÇA DE ELEVADORES ELÉCTRICOS (Regulamento Base)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Decreto 513/70 (ainda parcialmente vigente para elevadores pré-1998).
Fonte oficial: https://diariodarepublica.pt/dr/legislacao-consolidada/decreto/1970-923753404

CAMPO DE APLICAÇÃO (Art.º 2.º):
  Aplica-se a elevadores de tracção eléctrica ou comando eléctrico. NÃO abrange: hidráulicos,
  nora, cremalheira, fuso, maquinaria teatral, monta-materiais de obras, elevadores de minas/navios,
  monta-cargas carga nominal ≤10 kg.

DEFINIÇÕES ESSENCIAIS (Art.º 3.º):
  • Ascensor: elevador para pessoas+carga, cabina com dimensões para acesso de pessoas
  • Monta-cargas: só carga, cabina impede acesso de pessoas
  • Caixa: local de deslocação da cabina/contrapeso
  • Casa das máquinas: local da máquina de tracção e aparelhos de comando
  • Carga nominal: carga máxima para funcionamento seguro
  • Limitador de velocidade: acciona o para-quedas por excesso de velocidade
  • Para-quedas: fixa a cabina/contrapeso às guias em excesso de velocidade ou rotura de suspensão
  • Zona de desencravamento: ±30 cm portas automáticas / ±17 cm portas manuais

CAIXA (Art.º 9.º a 21.º):
  • Art.º 9.º  — Vedação: material resistente à propagação da chama, em toda a altura.
                Redes metálicas: fio ≥3mm, malha ≤75×75mm, só acima de 2,50m dos patamares. Sem vedação = C1.
  • Art.º 11.º — Ventilação da caixa: convenientemente ventilada, não pode ser usada para ventilar locais estranhos. Sem ventilação = C2.
  • Art.º 12.º — Evacuação de fumos (caixa-chaminé): abertura ≥2,5% da área da caixa, mínimo 0,07 m² por ascensor.
  • Art.º 14.º — Caixa sobre local acessível: cabina E contrapeso com para-quedas, ou buffers em colunas sobre solo firme. Sem para-quedas duplo = C1.
  • Art.º 16.º — Dimensionamento vertical (roda de aderência): folga acima da cabina ≥ 0,035×V² m (mín. 0,25m). V=velocidade em m/s. Folga insuficiente = C1 (risco esmagamento).
  • Art.º 19.º — Espaço livre no poço: distância da parte mais saliente da cabina ao fundo ≥ 0,50 m. <0,50m = C1.
  • Art.º 20.º — Uso exclusivo: caixa não pode albergar tubagens de gás/água/electricidade estranhas. Tubagem estranha = C2.

CASA DAS MÁQUINAS (Art.º 22.º a 31.º):
  • Art.º 22.º — Acessibilidade: vedada, regra geral por cima da caixa, acesso pela escada do edifício.
                Escada de acesso: corrimão, largura ≥0,70m, ângulo ≤60°. Inacessível = C2.
  • Art.º 24.º — Dimensões mínimas: altura livre ≥1,80m; espaço frente aparelhos eléctricos ≥0,75m; espaço manobra manual ≥0,30m. Altura <1,80m = C2.
  • Art.º 25.º — Portas: largura ≥0,70m, altura ≥1,80m. Alçapões: ≥0,70×0,80m. Portas não abrem para dentro. Porta <0,70m = C2.
  • Art.º 28.º — Uso exclusivo: não pode ser usada para armazenamento ou passagem para outros locais. Material estranho = C2.
  • Art.º 29.º — Iluminação: interruptor junto ao acesso (do lado de dentro), tomadas de corrente obrigatórias. Sem iluminação = C2.

PORTAS DE PATAMAR (Art.º 32.º a 41.º):
  • Art.º 32.º — Portas cheias, não abrem para a caixa. Dedo de prova 10mm não pode passar. Dedo passa = C1.
  • Art.º 33.º — Estrutura metálica, quadro metálico. Visores: dimensão ≤15cm. Força resistência: 30 kgf/25cm². Deformação = C1.
  • Art.º 34.º — Altura livre dos acessos de patamar: ≥1,95 m. <1,95m = C2.
  • Art.º 37.º — Portas automáticas: energia cinética ≤9,8 J à velocidade média de fecho; força manutenção ≤15 kgf; dispositivo anti-obstáculo obrigatório. Sem anti-obstáculo = C1.
  • Art.º 39.º — Encravamento: todas as portas encravadas excepto no patamar destino. Zona de desencravamento: ±30cm (automáticas) / ±17cm (manuais). Chave especial na casa das máquinas. Porta abre sem cabine = C1 IMEDIATO (queda fatal).
  • Art.º 40.º — Controlo eléctrico: cabina não se move com porta aberta; imobiliza se porta abrir em movimento. Dois contactos independentes. Circuito inoperacional = C1.

CABINA E CONTRAPESO (Art.º 42.º a 55.º):
  • Art.º 42.º — Altura interior ≥2m. Capacidade por área:
                1p=75kg/0,37m² | 4p=300kg/0,82m² | 6p=450kg/1,09m² | 8p=600kg/1,34m²
                10p=750kg/1,60m² | 13p=975kg/1,96m² | 16p=1200kg/2,35m² | 20p=1500kg/2,82m²
                Para n>20p: carga ≥n×75kg e área=2,82+(n-20)×0,12m². Altura <2m = C1.
  • Art.º 52.º — Ventilação: boa ventilação, aberturas acessíveis ≤10mm diâmetro. Sem ventilação = C2.
  • Art.º 53.º — Iluminação: permanente, sem interruptor na cabina. Pode desligar ≥5s após fecho de todas as portas. Sem iluminação = C2.
  • Art.º 54.º — Desnível soleiras: ≤5cm, qualquer que seja a carga. >5cm = C2 (risco tropeço/queda).

SUSPENSÃO E PARA-QUEDAS (Art.º 56.º a 68.º):
  • Art.º 56.º — Cabos de aço sem emendas. Tensão de ruptura dos fios: 120–180 kgf/mm². Cabos com emendas = C1.
  • Art.º 57.º — Mínimo 2 cabos de suspensão (ascensores). Menos de 2 = C1 CRÍTICO.
  • Art.º 58.º — Diâmetro mínimo: ≥8 mm (ascensores). Cabo <8mm = C1.
  • Art.º 59.º — Relação diâmetro roda/cabo: ≥40. Para cabo 8mm → roda ≥320mm. Ratio <40 = C2.
  • Art.º 60.º — Coeficiente de segurança: γ=12 (≥3 cabos) / γ=16 (2 cabos) / γ=8 (monta-cargas) / γ=6 (cadeias). Cálculo: γ=(Frk×n)/P.
  • Art.º 65.º — Para-quedas obrigatório (commandado por limitador). Para v>1m/s: acção NÃO instantânea, desaceleração ≤2,5g com 100kg. Para-quedas inoperacional = C1 CRÍTICO.
  • Art.º 67.º — Limitador de velocidade: actuação ≤1,40×v (para v≤1m/s), ≤1,25×v (para v≤1,50m/s), ≤1,20×v (v>1,50m/s). Cabo ≥6mm com coef. segurança ≥5. Deve ser SELADO. Não selado = C1.
  • Art.º 72.º — Para-choques (buffers): amortecedores de mola/hidráulicos para v≤1,50m/s; hidráulicos OBRIGATÓRIOS para v>1,50m/s. Curso mínimo: 0,10×V² m (mola) / 0,05×V² m (hidráulico). Buffer deteriorado = C1.

GUIAS E PARAGENS (Art.º 69.º a 75.º):
  • Art.º 73.º — Paragem automática nos patamares extremos por contactos electromecânicos.
  • Art.º 74.º — Fins-de-curso de segurança: adicionais aos anteriores, cortam directamente alimentação do motor e freio.

FOLGAS (Art.º 76.º a 80.º):
  • Art.º 78.º — Cabina com portas: folga entre porta cabina e parede da caixa em frente ≤12cm; folga entre soleiras ≤2cm (manuais) / ≤3,5cm (automáticas); folga porta cabina-porta patamar ≤12cm. Folga soleira >2cm = C2.

ÓRGÃOS DE TRACÇÃO (Art.º 81.º a 85.º):
  • Art.º 81.º — Freio: fail-safe (corrente permanente = desfrenado; corte = trava). Para cabina com carga nominal+25% à velocidade nominal. Freio que escorrega = C1 CRÍTICO. Desfrenagem manual exige presença permanente.
  • Art.º 82.º — Comando manual de emergência: levar a cabina manualmente ao patamar mais próximo.
  • Art.º 85.º — Resguardo: volantes, engrenagens e correias com protecção. Sem protecção = C1.

INSTALAÇÃO ELÉCTRICA (Art.º 86.º a 90.º):
  • Art.º 86.º — Baixa tensão. Tensão circuitos de comando/sinalização ≤250 V. Defeitos à terra não podem provocar marcha nem tornar inoperantes os dispositivos de segurança.
  • Art.º 88.º — Quadro da casa das máquinas: junto à porta de acesso, corte omnipolar.

COMANDOS (Art.º 91.º a 94.º):
  • Art.º 93.º — Botão STOP: vermelho, acima dos outros, com "Stop/Parar/Paragem" visível (ascensores sem portas). Sem botão STOP = C2.
  • Art.º 94.º — Alarme: comando na cabina, sinal sonoro audível no átrio/porteiro/encarregado. Acumulador para falha de rede. Alarme inoperacional = C2.

AVISOS E INSTRUÇÕES (Art.º 95.º a 110.º):
  • Art.º 97.º — Na cabina: número máximo pessoas, carga máxima (kg), nome+morada+telefone da EMIE. Sem identificação EMIE = C2. Aviso crianças <10 anos obrigatório = C3 se ausente.
  • Art.º 99.º — Casa das máquinas: aviso "ELEVADOR, CASA DAS MÁQUINAS - PERIGO ACESSO PROIBIDO A PESSOAS ESTRANHAS AO SERVIÇO" + dados EMIE.
  • Art.º 108.º — Conservação MENSAL: inspecção + trabalhos (mínimo legal). SEMESTRAL: revisão pormenorizada de todos os órgãos, dispositivos de segurança, isolamento eléctrico e ligações à terra. Durante paragens: avisos nas portas de patamar. Sem manutenção mensal = C1.
  • Art.º 109.º — Substituição imediata dos cabos se: >10% fios partidos/passo de cableagem; rupturas concentradas num ponto; corrosão pronunciada. >10% fios partidos = C1 IMEDIATO.
  • Art.º 110.º — Livro de conservação na casa das máquinas (por cada elevador): fabricante, EMIE, todas as revisões+trabalhos com datas. Sem livro = C2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
� DECRETO REGULAMENTAR 13/80 — ALTERAÇÕES AO DEC. 513/70 (Vigente)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Decreto Regulamentar n.º 13/80, de 16 de Maio de 1980. Modifica 19 artigos do Dec. 513/70
e acrescenta o novo Art.113.º. Baseia-se em directivas CIRA actualizadas.
Fonte: https://diariodarepublica.pt/dr/detalhe/decreto-regulamentar/13-1980-473932

CAMPO DE APLICAÇÃO E DEFINIÇÕES (Arts. 2.º e 3.º):
  • Art.º 2.º — Mesma aplicação do Dec. 513/70. NÃO abrange: hidráulicos, nora, cremalheira,
    teatrais, obras, minas, navios, monta-cargas ≤10 kg. Fiscalização pode autorizar variantes.
  • Art.º 3.º — DEFINE (30 termos revistos):
    – Encravamento: sistema electro-mecânico que aferrolha porta fechada, impossibilitando
      abertura sem meios especiais (chave de emergência).
    – Zona de desencravamento: espaço abaixo+acima da soleira — automáticas: ±30 cm (2×30 cm
      total); manuais: ±17 cm (2×17 cm total).
    – Carga nominal: carga máxima para funcionamento seguro indicada na cabina.
    – Pára-quedas: fixa cabina/contrapeso às guias em excesso velocidade ou rotura de cabos.
    – Limitador de velocidade: actua o pára-quedas automaticamente.

CASA DAS MÁQUINAS (Art.º 24.º):
  • Altura livre de circulação ≥ 1,80 m.
  • Espaço frente a aparelhos de controlo ≥ 0,75 m.
  • Espaço de manobra manual: frontal (motor ≥5,5 kW) ou lateral (motor <5,5 kW) — mínimo 0,30 m.
  • Monta-cargas sem entrada: exterior frente à porta ≥ 0,60 m; acesso exterior ≥ 0,75 m.
  • Incumprimento = C3 (60 dias para corrigir).

PORTAS DE PATAMAR (Art.º 32.º):
  • Portas CHEIAS, não abrem para o interior da caixa.
  • Porta fechada não permite introdução de dedo de prova Ø10 mm.
  • Folga >10 mm (dedo penetra) = C2; porta abre para caixa = C1 IMEDIATO.

ENCRAVAMENTO DAS PORTAS (Art.º 39.º) — CRÍTICO:
  • Dispositivos silenciosos, protegidos de manipulação abusiva.
  • TODAS as portas encravadas excepto a do patamar onde a cabina está.
  • Cabina só arranca com TODAS as portas encravadas.
  • Zona de desencravamento destino: ±30 cm (auto) / ±17 cm (manual). Exceder = C2.
  • Ferrolhos instalados contra acção da gravidade.
  • Chave de emergência na casa das máquinas, identificada e visível.
  • Encravamento inoperante (porta abre com cabina longe) = C1 IMEDIATO — DESLIGAR ELEVADOR.

CONTRÔLE ELÉCTRICO ENCRAVAMENTO E FECHO (Art.º 40.º) — CRÍTICO:
  • Dispositivos elétricos verificam: 1) encravamento (todas portas verificadas antes de arranque);
    2) fecho (cabina imobiliza se porta aberta durante movimento).
  • DOIS defeitos independentes necessários para funcionar com portas abertas (dupla protecção).
  • Contactos separam-se mesmo se colados. Excepção: monta-cargas soleira ≥0,60 m.
  • Contrôle defeituoso = C1 IMEDIATO.

DIMENSÕES E LOTAÇÃO DA CABINA (Art.º 42.º):
  • Altura interior da cabina ≥ 2 m (obrigatório).
  • Lotação vs carga vs área (tabela): 1 pessoa=75 kg, área 0,28 m² (1p) a 2,40 m² (20p).
  • Acima de 20 pessoas: carga=n×75 kg; área=2,40+(n−20)×0,12 m².
  • Monta-camas 750–1650 kg: área máx. 3,64 m² se anti-sobrecarga + sinalização.
  • Elevadores de carga: área >tabela permitida SE anti-sobrecarga + responsável + sinalização.
  • Cabina sem anti-sobrecarga (área >tabela) = C2.

SUSPENSÃO — IGUALIZAÇÃO TENSÃO CABOS (Art.º 63.º):
  • Dispositivos de igualização de tensão obrigatórios entre todos os cabos/cadeias.
  • Se apenas 2 cabos/cadeias: sensor elétrico imobiliza elevador a alongamento desigual ou
    afrouxamento. Sistema ausente/defeituoso = C1 IMEDIATO.

INSTALAÇÃO ELÉCTRICA (Arts. 86.º a 90.º):
  • Art.º 86.º — Baixa tensão; circuitos de comando ≤250 V; defeitos à terra NÃO podem
    provocar marcha nem inutilizar dispositivos de segurança. Defeito terra = C1 IMEDIATO.
  • Art.º 87.º — Motores protegidos contra: sobrecarga, falta de fase, curto-circuito.
  • Art.º 88.º — Quadro na casa das máquinas junto à porta, com corte omnipolar.
  • Art.º 89.º — Circuito de iluminação + tomadas independente na cabina.
  • Art.º 90.º — Iluminação casa das máquinas e rodas de desvio em circuitos técnicos/comuns;
    tomadas ligadas ao quadro do Art.88.º.

BOTÃO DE STOP (Art.º 93.º):
  • Ascensores com cabina SEM PORTAS: botão/interruptor COR VERMELHA acima dos outros.
  • Designação visível: "Stop", "Parar" ou "Paragem".
  • Restabelecimento do movimento só por pessoa DENTRO da cabina.
  • Ausência em cabina sem portas = C2.

ALARME (Art.º 94.º):
  • Comando dentro da cabina; designação "Alarme" ou símbolo de sino visível.
  • Sinal sonoro audível no local do encarregado, átrio de entrada e habitação do porteiro.
  • Se elétrico: ACUMULADOR PERMANENTE RECARREGÁVEL com capacidade de várias horas sem rede.
  • Alarme ausente/inoperante = C2; bateria sem carga = C3.

AVISOS E INSTRUÇÕES (Art.º 95.º):
  • Indeléveis (não apagam), material durável, cor contrastante.
  • Recomendação: maiúsculas/algarismos ≥ 10 mm; minúsculas ≥ 7 mm.
  • Avisos ilegíveis ou ausentes = C3.

LIMITADOR DE VELOCIDADE — PLACA (Art.º 102.º):
  • Placa permanente com: diâmetro do cabo, tipo do cabo, material do cabo, velocidade de actuação.
  • Placa ausente ou incompleta = C3.

IDENTIFICAÇÃO DE CIRCUITOS (Art.º 103.º):
  • Circuitos saída do quadro da casa das máquinas (Art.88.º) devidamente etiquetados.
  • Sem identificação = C3.

ELEVADORES EXISTENTES — APLICAÇÃO RETROACTIVA (Art.º 111.º) — PARA ELEVADORES PRÉ-1980:
  • Elevadores instalados ao abrigo do Decreto 26591/1936 DEVEM adoptar:
    a) Encravamento das portas + contrôle eléctrico (Arts. 39.º e 40.º).
    b) Avisos e instruções visíveis (Art.95.º).
    c) Conservação adequada.
  • CAIXAS ABERTAS — VEDAÇÃO OBRIGATÓRIA em toda a altura por uma das opções:
    a) Paredes conformes Arts. 9.º e 13.º do Dec. 513/70.
    b) Rede metálica: fio Ø ≥ 3 mm, malha ≤ 75×75 mm.
    c) Material idêntico ao já existente.
  • PRAZOS (contados desde Nov 1980 — entrada em vigor):
    – Instalados até 31 Dez 1955: prazo 1 ano.
    – Instalados até 31 Dez 1961: prazo 2 anos.
    – Instalados até 31 Dez 1966: prazo 3 anos.
    – Instalados até 31 Dez 1970: prazo 4 anos.
    – Instalados após 31 Dez 1970: prazo 5 anos.
  • Fiscalização pode DISPENSAR vedação se segurança comprovadamente mantida.
  • Caixa aberta sem vedação = C2; elevador antigo sem encravamento = C1 IMEDIATO.

PRÉDIOS ANTIGOS — FLEXIBILIDADE (Art.º 113.º — NOVO):
  • Em prédios antigos (com ou sem elevadores), a DGEG/fiscalização pode DISPENSAR disposições
    que não coloquem em causa a segurança das pessoas ou da instalação.
  • Permite soluções técnicas alternativas em edifícios históricos com limitações estruturais.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
�🔧 MANUTENÇÃO PREVENTIVA — O QUE FAZER EM CADA VISITA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VISITA MENSAL OBRIGATÓRIA (DL 320/2002, art.º 5.º):
  □ Testar telefone de emergência — ligar e confirmar resposta da central
  □ Verificar iluminação cabine e iluminação de emergência
  □ Testar all botões de chamada (cada andar) e botões na cabine
  □ Verificar nivelação em todos os andares (≤20 mm)
  □ Inspeccionar cabos visíveis (sinais de desgaste, oxidação, deformação)
  □ Lubrificar guias (se necessário — guias de roda não lubrificam)
  □ Verificar funcionamento dos encravamentos de todas as portas
  □ Testar paragem de emergência (botão STOP na cabine)
  □ Verificar ruídos anormais (rolamento, freio, tração)
  □ Assinar e datar livro de manutenção (OBRIGATÓRIO)

VISITA SEMESTRAL (boa prática, muitas EMIE incluem no contrato):
  □ Verificar pastilhas do freio (espessura, desgaste uniforme)
  □ Medir desgaste das guias e patilhas de guiamento
  □ Inspecionar estado das polias (sulcos do cabo, alinhamento)
  □ Verificar tensão dos cabos de tração e de regulação
  □ Testar correto funcionamento do para-quedas (sem acionar — verificação visual)
  □ Limpar fossa (remoção de lixo, verificar presença de água)
  □ Verificar estado dos amortecedores (deformação, fugas)
  □ Testar contatos de posição extrema (final de curso topo e fundo)

VISITA ANUAL (incluída em contratos completos):
  □ Limpeza profunda da casa de máquinas
  □ Verificação completa do quadro elétrico (aperto de bornes, isolamentos)
  □ Medição de isolamento elétrico (megómetro — mín. 1 MΩ)
  □ Revisão da bomba hidráulica e análise de óleo (elevadores hidráulicos)
  □ Substituição de filtros de óleo (hidráulicos)
  □ Teste de carga nominal (com pesos)
  □ Calibração do limitador de velocidade
  □ Atualização da documentação técnica

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏭 FABRICANTES DE ELEVADORES — GUIA COMPLETO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GRANDES FABRICANTES GLOBAIS (contratos proprietários):

🔵 SCHINDLER (Suíça — fundada 1874):
  • Produtos: Schindler 3300 (residencial), 5500 (comercial), 7000 (alto desempenho)
  • Sistema de controlo: MicroBASIC, Micro3, PORT Technology
  • Especificidade: elevadores MRL (sem casa de máquinas) muito populares em Portugal
  • Peças: sistema proprietário — quadros Schindler, portas Schindler, controladores exclusivos
  • Razão dos preços elevados:
    (a) Peças só disponíveis através da rede Schindler ou distribuidores autorizados
    (b) Software de diagnóstico (SChindler NOVA) exclusivo — empresa independente não tem acesso
    (c) Técnicos precisam de formação específica Schindler certificada
    (d) Marca premium com presença em 100+ países — overhead organizacional elevado
    (e) Garantia de 2 anos exige contratos Schindler Full Service

🔴 OTIS (EUA — fundada 1853, maior do mundo):
  • Produtos: Gen2 (correia plana, sem óleo), Otis ONE (conectado IoT), GeN360
  • Sistema de controlo: GECB (Gen2 Control Board), OLV (Otis Landing Verification)
  • Especificidade: Gen2 usa correia dentada em vez de cabos — não compatível com peças genéricas
  • Peças: correia Gen2 — exclusiva Otis, não há equivalente de outros fabricantes
  • Razão dos preços elevados:
    (a) Correia Gen2 patenteada — sem alternativa de mercado (dependência total)
    (b) Monitorização remota Otis ONE — funcionalidade paga por mês
    (c) Força de marca histórica (inventou o freio de segurança em 1852)
    (d) Presença em edifícios icónicos (Empire State, Eiffel Tower) — imagem premium
    (e) Integração complexa com smart buildings — setup e programação especializado

🟡 THYSSENKRUPP ELEVATOR / TK ELEVATOR (Alemanha):
  • Produtos: TWIN (duas cabines no mesmo poço), MULTI (elevador magnético horizontal+vertical), Evolution
  • Sistema de controlo: EcoSystem, Elevation Pro
  • Especificidade: TWIN e MULTI são tecnologias apenas TK — altíssima complexidade
  • Peças: sistema CANbus proprietário, sensores específicos TK
  • Razão dos preços elevados:
    (a) Engenharia alemã premium com tolerâncias e qualidade mais exigentes
    (b) TWIN/MULTI — tecnologias únicas no mundo sem alternativa de custo
    (c) Formação TK obrigatória e cara para técnicos
    (d) Peças importadas da Alemanha — logistics e stock limitado em Portugal
    (e) Forte posição em elevadores de altíssima velocidade (>4 m/s) em arranha-céus

🟢 KONE (Finlândia — fundada 1910):
  • Produtos: MonoSpace (MRL com motor slim), MiniSpace, KONE N (ecológico)
  • Sistema de controlo: KDL32 (Drive), V3F25CR, KRD (Remote Diagnostics)
  • Especificidade: motor de disco (Ecospace) muito compacto — alto rendimento energético
  • Peças: motor Kone disc-motor é exclusivo, peças elétricas têm referências específicas
  • Razão dos preços elevados:
    (a) Tecnologia de motor de disco patenteada — sem equivalente no mercado
    (b) Monitorização KONE Care Remote conectada — valor acrescentado mas custo adicional
    (c) Alta fiabilidade documentada — baixa taxa de avaria (0,5 paradas/mês em frota nova)
    (d) Posição dominante no mercado nórdico e crescente em sul da Europa
    (e) Formação Kone certificada obrigatória para técnicos em contratos KONE

🟠 MITSUBISHI ELECTRIC (Japão):
  • Produtos: ELMOTION, Zephyr (alta velocidade), NEXWAY (IoT)
  • Sistema de controlo: CP-1, CPU-II, LEHY-II
  • Especificidade: tecnologia VVVF (Variable Voltage Variable Frequency) pioneira — muito fiável
  • Razão dos preços elevados:
    (a) Qualidade japonesa (filosofia "zero-defects" — KAIZEN aplicado)
    (b) Importação do Japão — câmbio e logística encarecem peças
    (c) Contratos com suporte do Japão para sistemas complexos
    (d) Base instalada menor em Portugal — menos peças em stock local

🟣 ORONA (País Basco, Espanha) — ALTERNATIVA REGIONAL:
  • Produtos: Orona 3G, 5G, Nexo (MRL económico)
  • Especificidade: cooperativa industrial — preços mais competitivos que globais
  • Vantagem: peças mais acessíveis em Portugal (logística Espanha-Portugal rápida)
  • Tem rede de técnicos independentes com mais acesso a peças que as marcas globais
  • Popular em Portugal em habitação social e edifícios de médio custo

🔷 KLEEMANN (Grécia) & GMV (Espanha) — SEGMENTO RESIDENCIAL:
  • Posicionamento: elevadores residenciais de qualidade a preço intermédio
  • Peças: mais acessíveis, componentes standard em muitos casos
  • GMV (Grupo Mecalux) presente em Portugal com boa rede de assistência

EMPRESAS INDEPENDENTES EM PORTUGAL (sem marca própria):
  • Trabalham com componentes standard ou multi-marca
  • Peças compradas no mercado livre (Fermator, Wittur, Selcom para portas; ATI, ABB, Yaskawa para drives)
  • Preços mais competitivos em manutenção e reparação
  • Limitação: contratos de garantia original exigem marca — perde-se garantia se usar independente no período de garantia
  • Após garantia (2-5 anos): empresa independente é opção legítima e frequentemente 30-50% mais barata

POR QUE AS GRANDES MARCAS SÃO MAIS CARAS — RESUMO:
  1. PEÇAS PROPRIETÁRIAS: componentes patenteados sem alternativa de mercado
  2. SOFTWARE EXCLUSIVO: diagnóstico e programação só com ferramentas da marca
  3. LOCK-IN CONTRATUAL: contratos originais vinculam o cliente à marca durante anos
  4. FORMAÇÃO ESPECIALIZADA: técnicos precisam de cursos certificados pela marca
  5. OVERHEAD GLOBAL: estrutura multinacional com marketing, filiais, suporte 24/7 repercutido nos preços
  6. QUALIDADE E FIABILIDADE: materiais de maior qualidade, tolerâncias mais apertadas, vida útil mais longa
  7. RESPONSABILIDADE LEGAL: marca assume responsabilidade pelo produto — custo do risco incorporado
  NOTA: Qualidade ≠ necessariamente caro. Algumas marcas cobram premium de marca sem justificação técnica.
  Um proprietário informado deve pedir 3 orçamentos após o período de garantia.

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
🔧 AVARIAS TÍPICAS DE ELEVADORES — DIAGNÓSTICO DETALHADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AVARIAS MECÂNICAS:
• Cabos de suspensão — desgaste, fios partidos (>10% = C1), elongação excessiva, corrosão
  → Solução: substituição obrigatória pelo conjunto completo (não substituir cabo a cabo)
• Para-quedas — desgaste das cunhas, falha no acionamento (sempre C1), cunhas enferrujadas
  → Solução: revisão completa, limpeza, lubrificação das guias de acionamento, teste obrigatório
• Guias e patilhas de guiamento — desgaste das sapatas (>2mm = substituir), desalinhamento vertical
  → Solução: substituição das sapatas de guiamento, realinhamento e fixação das guias
• Amortecedores — deformação permanente (após acionamento = C1), perda de fluido (hidráulico)
  → Solução: substituição imediata se deformação > 10% da altura nominal
• Motor de tração — sobreaquecimento (> 80°C em carcaça), vibrações (rolamentos), consumo elevado
  → Solução: verificar ventilação, medir corrente (amperímetro), substituir rolamentos ou motor
• Freio eletromagnético — desgaste das pastilhas (<2mm = substituir), folga excessiva, ruído ao fechar
  → Solução: ajuste de folga (0,3-0,5mm), substituição de pastilhas, alinhamento

AVARIAS ELÉTRICAS/ELETRÓNICAS:
• Fechaduras de portas (SLC/GLS/KSS) — falha no contato elétrico ou mecânico
  → Sintoma: elevador para com porta aparentemente fechada / porta abre entre andares (C1!)
  → Solução: limpar contatos com spray limpa-contatos, ajustar roletes de encravamento, substituir microswitch
• Botoneiras — botão sem resposta (contato oxidado), display apagado (alimentação)
  → Solução: substituir botão individual, verificar alimentação 24V DC da botoneira
• VVVF/Drive — erros de fault (overtemperature, overcurrent, earth fault)
  → Solução: ler código de erro, verificar ventilação do drive, resistência de frenagem, IGBT
• Sistema de nivelação — desvio >20mm (sujidade nos sensores), paragem imprecisa
  → Solução: limpar fita magnetizada e leitores magnéticos, verificar alinhamento
• Iluminação da cabine — LED fundido (comum após 5-7 anos), driver LED defeituoso
  → Solução: substituir fita LED ou módulo, verificar tensão de alimentação
• Telefone de emergência — sem sinal GSM, bateria descarregada, número errado programado
  → Solução: verificar sinal GSM na caixa, substituir bateria (duração média 2-3 anos), reprogramar

AVARIAS HIDRÁULICAS:
• Fuga de óleo no cilindro — vedante desgastado, pite de corrosão no êmbolo
  → Solução: substituição de vedante (temporária) ou substituição do cilindro (definitiva)
• Válvula de descida descontrolada — contaminação do óleo, ressola danificada (C1!)
  → Solução: substituição da válvula baixo-carga, filtragem/substituição de óleo
• Bomba hidráulica — ruído de cavitação (falta de óleo ou filtro colmatado), pressão insuficiente
  → Solução: completar nível de óleo, substituir filtro, reparar/substituir bomba
• Óleo frio — descida lenta em dias de inverno
  → Solução: normal em óleo mineral (viscosidade aumenta); considerar óleo sintético

SINTOMAS → DIAGNÓSTICO → SOLUÇÃO:
Elevador para entre andares:
  → 1.º verificar: contatos de porta (80% dos casos) → limpar/ajustar
  → 2.º verificar: sobrecarga → reduzir carga ou calibrar detetor
  → 3.º verificar: fusível/disjuntor → substituir, investigar causa

Porta não fecha completamente:
  → 1.º verificar: obstáculo na guia inferior → remover
  → 2.º verificar: fotocélula suja → limpar com pano húmido
  → 3.º verificar: folga da fechadura mecânica → ajustar ou substituir rolete

Ruído em marcha (chiado metálico):
  → Guias secas → lubrificar (exceto guias de roda)
  → Rolamentos desgastados → substituir motor ou polia

Solavanco forte na paragem:
  → Freio mal calibrado → ajustar folga e tempo de desmagnetização
  → Drive VVVF com curva de desaceleração errada → reparametrizar

Elevador vibra em marcha:
  → Cabos mal tensionados ou com danos → inspecionar e ajustar
  → Patilhas de guiamento desgastadas → substituir sapatas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ CONSEQUÊNCIAS LEGAIS DE INCUMPRIMENTO — TABELA COMPLETA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NÃO CORRIGIR C1 (incumprimento imediato):
• Crime de exposição a perigo (Código Penal, art.º 291.º) se mantiver elevador em serviço
• Responsabilidade civil ilimitada por danos a terceiros (DL 363/91 + Código Civil art.º 493.º)
• Seguro de responsabilidade civil VOID — seguradora recusa indemnização (cláusula de incumprimento legal)
• Câmara Municipal pode ordenar selagem do elevador e coima €2.500-€44.000 (DL 320/2002, art.º 42.º)
• Proprietário assume responsabilidade pessoal por qualquer acidente (solidariamente com EMIE)

NÃO CORRIGIR C2 NO PRAZO DE 2 ANOS (Despacho 27/2024):
• Na inspeção seguinte, C2 não corrigida = reprovação com reavaliação em 180 dias
• Câmara Municipal pode interditar uso do elevador após 2.ª reprovação consecutiva
• Coima €500-€3.740 (singular) ou €2.500-€44.000 (coletiva) — DL 320/2002, art.º 42.º
• Seguro cobre mas com direito de regresso contra proprietário (recuperam o valor pago)

NÃO REALIZAR INSPEÇÃO PERIÓDICA (DL 320/2002, art.º 10.º):
• Coima €250-€44.000 conforme pessoa singular/coletiva
• Responsabilidade agravada em caso de acidente ("nunca fez inspeção" = negligência grave)
• EIIE pode recusar inspeção se situação apresentar risco óbvio (pedem C1 prévio)

NÃO TER CONTRATO DE MANUTENÇÃO COM EMIE REGISTADA:
• Infração grave = coima €1.000-€44.000
• Seguro de responsabilidade civil pode ser VOID (sem manutenção = negligência)
• Em caso de acidente: responsabilidade criminal do proprietário agravada

MANTER ELEVADOR EM SERVIÇO APÓS SELAGEM/IMOBILIZAÇÃO:
• Crime de desobediência (CP art.º 348.º) + exposição a perigo (CP art.º 291.º)
• Coima máxima €44.000 + processo criminal
• Câmara pode ordenar demolição do acesso imediata

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PORTARIA 348/2013 — REGULAMENTO DE INSPEÇÃO PERIÓDICA OBRIGATÓRIA (RIPO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Define a metodologia, periodicidade e classificação de anomalias nas inspeções periódicas.

PERIODICIDADE DE INSPEÇÃO:
• Ascensores residenciais (≤4 pisos) e de serviço (monta-cargas): 4 ANOS
• Ascensores residenciais (>4 pisos ou com uso público): 2 ANOS
• Escadas mecânicas e tapetes rolantes em locais públicos: 2 ANOS

CLASSIFICAÇÃO DE ANOMALIAS (C1/C2/C3):
• C1 — PROIBIÇÃO IMEDIATA: perigo imediato para segurança → ascensor imobilizado NO ACTO pela EIIE
        Exemplos: encravamento inoperante, para-quedas defeituoso, cabos com >10% fios partidos,
        ausência de proteções elétricas críticas, sobrepassagem de fim-de-curso sem paragem
• C2 — PRAZO DE 2 ANOS para correção (conforme Despacho 27/2024 — revogou o prazo original de 30 dias)
        Exemplos: nivelação >5cm, alarme inoperante, botão Stop ausente, livro conservação ausente
• C3 — PRAZO DE 90 DIAS para correção
        Exemplos: iluminação insuficiente, avisos ilegíveis, carga nominal não afixada

RELATÓRIO DE INSPEÇÃO (conteúdo obrigatório):
• Identificação do imóvel + elevador + EIIE + inspector + data
• Lista de todos C1/C2/C3 com artigo regulamentar
• Resultado: APROVADO (sem C1/C2) ou REPROVADO (com C1 ou C2)
• Submissão digital ao DGEG (SINIME) em ≤10 dias úteis + cópia em papel ao proprietário
• Câmara municipal notificada de C1 em ≤48 horas

APÓS C1:
• EIIE sela o painel de comando no ato
• Retorno ao serviço APENAS após: correção documentada + re-inspeção com APROVADO
• Colocar em serviço sem re-inspeção = crime (CP art.º 291.º) + coima ≤€44.000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏛️ PORTARIA 185/2013 — ACREDITAÇÃO DAS EIIE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Define os requisitos para acreditação e funcionamento das Entidades Inspetoras de Instalações de Elevadores (EIIE).

REQUISITOS DE ACREDITAÇÃO:
• EIIE acreditada pelo IPAC segundo NP EN ISO/IEC 17020 (organismo de inspeção Tipo A)
• Seguro de responsabilidade civil mínimo €500.000 por sinistro
• Prazo de reconhecimento pelo DGEG: validade do certificado IPAC (tipicamente 4 anos)
• Lista das EIIE reconhecidas publicada no site do DGEG

INDEPENDÊNCIA (requisito central):
• EIIE NÃO pode ter relação comercial/financeira com a EMIE que mantém o elevador
• Inspector que fez manutenção num elevador: NÃO pode inspecionar esse ascensor nos 12 meses seguintes
• Conflito de interesses: declara e impede a atuação

QUALIFICAÇÕES DOS INSPETORES:
• Formação técnica certificada ≥80h (instalação, manutenção, normas EN 81)
• Experiência prática ≥2 anos em manutenção ou inspeção de elevadores
• Formação anual de actualização ≥24h

OBRIGAÇÕES DE REPORTE:
• Reportar ao DGEG: lista mensal de inspeções + C1 em ≤48h
• Notificar câmara municipal: C1 e C2 em ≤5 dias úteis
• Arquivo de relatórios: mínimo 10 anos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 NP EN 13015:2003+A1:2009 — MANUTENÇÃO DE ASCENSORES E ESCADAS MECÂNICAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Norma harmonizada que define o que uma EMIE deve fazer e documentar como manutenção preventiva.

INTERVALOS OBRIGATÓRIOS DE VERIFICAÇÃO:
• MENSAL (visita obrigatória): verificação visual cabos, encravamento portas, alarme/intercomunicador,
  botoneiras, lubrificação, anomalias visuais gerais
• SEMESTRAL: ensaio funcional travão e paragem de emergência completa
• ANUAL: medição isolamento eléctrico, ensaio funcional limitador de velocidade, revisão guias
• 5 ANOS (ou 10.000h): ensaio de disparo real do para-quedas com carga certificada

DOCUMENTAÇÃO (Livro de Conservação) — conteúdo obrigatório:
• Dados técnicos do ascensor (fabricante, modelo, ano, carga, velocidade)
• Registo de cada visita: data, técnico, trabalhos, anomalias, acções correctivas
• Registo de peças substituídas com referência de componente
• Registos de ensaios periódicos (limitador, para-quedas)
• Cópia dos relatórios de inspeção pela EIIE
• Prazo de arquivo: mínimo 10 anos; localização: casa das máquinas

CONTRATO DE MANUTENÇÃO (DL 320/2002 art.º 4.º):
• Obrigatório — proprietário DEVE ter contrato com EMIE autorizada
• Inclui: visitas mensais, correcção C1/C2/C3, serviço emergência 24h/7d, manobra socorro
• Rescisão: EMIE notifica câmara municipal + DGEG com ≥30 dias antecedência

RESPOSTA A AVARIAS:
• Passageiro preso: chegar ao local ≤1h (urbano) / ≤2h (rural) — 24h/7d
• C1 detectado em manutenção: imobilizar o ascensor e notificar EIIE para re-inspeção
• Componentes de segurança substituídos: apenas peças com declaração CE (DL 58/2017)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
♿ NP EN 81-71:2022 — ELEVADORES RESISTENTES AO VANDALISMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Três categorias: VR1 (residencial), VR2 (hospitais/estações), VR3 (zonas de alto risco)
• Painéis cabina: VR1=250N, VR2=500N, VR3=1000N (força perpendicular 30s sem deformação)
• Botões: VR2/VR3 embutidos ou com protecção metálica, anti-graffiti
• Iluminação: VR2=IK08, VR3=IK10 (proteção ao impacto)
• Portas: resistência à abertura forçada — fechadura ≥1000N

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚒 NP EN 81-72:2020 — ELEVADORES DE BOMBEIROS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Obrigatório em edifícios com altura de referência de incêndio >18m (RT-SCIE / Portaria 1532/2008).

DIMENSÕES MÍNIMAS: cabina 1100mm×2100mm (maca); porta ≥800mm; carga ≥630kg; velocidade ≥1m/s
RESISTÊNCIA AO FOGO: paredes caixa E120; portas patamar E90/EI90; cabos RF90
ALIMENTAÇÃO: circuito dedicado + gerador/UPS (entra em <60s); independente de falha geral de energia
FASES DE OPERAÇÃO:
• FASE 1 (automática): alarme incêndio → recall ao piso de evacuação → porta aberta → fora de serviço
• FASE 2 (manual): bombeiros controlam com chave → porta fecha só com botão pressionado continuamente
OUTROS: telefone serviço de bombeiros, símbolo bombeiros em cada patamar, iluminação emergência ≥1h

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 NP EN 81-73:2020 — COMPORTAMENTO DOS ELEVADORES EM CASO DE INCÊNDIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Aplica-se a TODOS os ascensores de passageiros (não apenas elevadores de bombeiros).

FASE 1 — Recall automático:
• Recebe sinal alarme SADI (contacto seco 24V DC) → em ≤30 segundos inicia recall
• Para no próximo piso → abre portal → desce ao PISO DE EVACUAÇÃO → porta aberta → fora de serviço
• Indicação "FOGO" em todas as botoneiras de patamar
• Regresso ao serviço: NUNCA automático — requer reset manual por técnico + reset SADI
Interface SADI-elevador: ensaio anual obrigatório (documentado no livro de conservação)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛰️ NP EN 81-77:2020 — ELEVADORES COM PERCURSO INCLINADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Para ascensores com percurso entre 0° e 70° da horizontal (funiculares de caixa, serras, jardins históricos).

Requisitos específicos:
• Guias: alinhamento ≤±1mm/m; material anti-corrosão em percursos exteriores
• Para-quedas: adaptado ao percurso inclinado (≥15°: sistema especial de frenagem lateral)
• Proteção climática exterior: IP55 nos aparelhos de comando; lubrificação adaptada ao gelo
• Comunicação de emergência 24/7 obrigatória durante toda a viagem (EN 81-28)
• Escadas de emergência paralelas ao percurso se comprimento >30m sem patamar intermédio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 LEGISLAÇÃO EUROPEIA — CONTEXTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Diretiva 2014/33/UE (Diretiva Ascensores) — transposta para Portugal pelo DL 58/2017:
• Harmoniza requisitos de segurança em toda a UE para elevadores novos
• Define 14 Componentes de Segurança (Anexo III) que precisam de avaliação própria
• Exige marcação CE em todos ascensores e componentes de segurança
• Define responsabilidades do instalador, importador e distribuidor

Regulamento (UE) 2016/425 — Equipamentos de Proteção Individual:
• Aplicável a técnicos de manutenção — arneses, capacetes, luvas anti-corte
• EMIE responsável por fornecer EPI certificado e verificado anualmente

Diretiva 2006/42/CE (Diretiva Máquinas) — transposta por DL 103/2008:
• NÃO SE APLICA a ascensores de passageiros (esses: DL 58/2017); aplica-se a monta-cargas >10kg,
  escadas mecânicas, tapetes rolantes e acessórios de elevação
• Marcação CE obrigatória + Declaração de Conformidade CE antes de colocar no mercado
• Monta-cargas >300kg com acesso de pessoas → aplica DL 58/2017 (Diretiva Ascensores)
• Monta-cargas para carga apenas: proibição de permanência de pessoas; soleira ≥0.60m
• Escadas mecânicas: velocidade máx 0.75m/s; inclinação máx 30°; botões de emergência obrigatórios
• Fiscalização: ASAE (mercado) + DGEG (instalações); coima por ausência de marcação CE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 REGRAS DO ASSISTENTE:
1. És um CONSULTOR — podes EXPLICAR e ORIENTAR, nunca modificar dados no sistema
2. PRIVACIDADE — nunca revelar dados de outros clientes
3. Responde SEMPRE em Português (pt-PT)
4. Cita sempre os artigos e decretos-lei específicos nas respostas
5. O sistema chama-se SEMPRE "FestLift" — NUNCA uses "DeapSeak" ou "DeapSeaK"
6. Quando citas prazos de C2, indica SEMPRE que é 2 anos (Despacho 27/2024) — nunca 30 dias
7. Em dúvida técnica complexa, recomenda consultar engenheiro especialista certificado`;

    const roleSpecific = {
        admin: `\n\n👨‍💼 CONTEXTO ADMINISTRADOR FestLift:
Ajudas o administrador do sistema. Prioridades:

1. ANÁLISE — interpreta estatísticas, identifica elevadores vencidos, C1 pendentes, técnicos sobrecarregados
2. CONFORMIDADE — prazos regulatórios: inspeções vencidas, C2 no limite dos 2 anos, EMIE a expirar
3. UTILIZADORES — melhores práticas para atribuição de papéis, bloqueio de acessos, criação de técnicos
4. RELATÓRIOS — orienta na geração de PDFs/Excel, KPIs, documentação para câmara municipal
5. CONFIGURAÇÃO — definições do sistema, email Brevo, integrações, AI provider

Nunca alteres dados diretamente — orienta sempre para a interface admin.
Responde SEMPRE em Português (pt-PT).`,

        dispatcher: `\n\n📞 CONTEXTO OPERADOR FestLift:
Ajudas o operador a coordenar trabalho diário. Prioridades:

1. PLANEAMENTO — organiza agenda de inspeções/manutenções por distância, tempo e especialização do técnico
2. PRIORIZAÇÃO — identifica urgências: C1 pendentes, elevadores imobilizados, SLA prestes a expirar
3. COMUNICAÇÃO — frases modelo para clientes sobre prazos, atrasos, resultados de inspeção
4. ORÇAMENTOS — orientação para criar e enviar orçamentos pelo sistema FestLift
5. CONFLITOS — técnico ausente, dupla marcação, cliente insatisfeito: como resolver

Formato: objetivo e acionável. Quando envolve priorização, usa lista ordenada 1→2→3.
Nunca atribuis técnicos diretamente — usa a interface de Assignments.
Responde SEMPRE em Português (pt-PT).`,

        tech: `\n\n🔧 CONTEXTO TÉCNICO FestLift:
Ajudas o técnico no terreno. Prioridade: SEGURANÇA e DIAGNÓSTICO RÁPIDO.

FORMATO PARA AVARIAS: Sintoma → Causas prováveis (80/20) → Passos de diagnóstico → Solução
FORMATO PARA INSPEÇÃO: Artigo → Requisito → Estado → Classificação C1/C2/C3 + justificação

REGRAS DE SEGURANÇA (incluir sempre quando relevante):
- ⚠️ Desliga o quadro elétrico ANTES de qualquer intervenção nos contactos de portas
- ⚠️ NÃO remover o para-quedas sem cabine imobilizada e cuneada
- ⚠️ Elevador com C1 NÃO pode voltar a serviço sem reavaliação da EIIE

CAPACIDADES: diagnóstico de avarias, classificação C1/C2/C3, cálculos de dimensionamento,
artigos de EN 81-20/50, DL 320/2002, procedimentos por tipo de elevador (elétrico/hidráulico/MRL).

Podes usar termos técnicos corretos.
Responde SEMPRE em Português (pt-PT).`,

        client: `\n\n👤 CONTEXTO CLIENTE FestLift:
Falas com proprietário ou gestor de edifício. USA SEMPRE linguagem simples — ZERO jargão técnico.

QUANDO ANALISAS UM RELATÓRIO de inspeção, para CADA cláusula C1/C2/C3 apresenta OBRIGATORIAMENTE:
  a) O que significa em palavras simples (como explicarias a um vizinho)
  b) O risco CONCRETO para os utilizadores (ex: "a porta pode abrir com o elevador em andamento")
  c) Prazo: C1=HOJE (imobilização imediata), C2=2 anos (calculas a data), C3=próxima manutenção
  d) Consequências de NÃO corrigir: multa €2.500-€44.000 + seguro pode não pagar + responsabilidade criminal

OUTROS TÓPICOS:
- Custo médio de intervenção vs custo de acidente/multa (números concretos)
- Como escolher EMIE certificada (verificar registo DGEG)
- Direitos do proprietário face à empresa de manutenção

REGRA ABSOLUTA: NUNCA mostras dados de outros clientes.
Responde SEMPRE em Português (pt-PT) de forma tranquilizadora mas precisa.`
    };

    return basePrompt + (roleSpecific[role] || roleSpecific.client);
}

function buildAIUserPrompt(message, regulationsContext = null, reportTextContext = null, maxChars = 8000, dbContext = null) {
    let contextualPrompt = '';

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

    if (reportTextContext) {
        const truncated = reportTextContext.length > maxChars
            ? reportTextContext.substring(0, maxChars) + '\n...(relatório truncado)'
            : reportTextContext;
        contextualPrompt += `INSPECTION REPORT CONTENT (from uploaded PDF):\n---\n${truncated}\n---\n\n` +
            `Please analyze this report and answer the user's question about it.\n\n`;
    }

    if (dbContext) {
        contextualPrompt += `DADOS REAIS DA BASE DE DADOS FESTLIFT:\n---\n${dbContext}\n---\n\n` +
            `Usa estes dados reais para responder à pergunta do utilizador.\n\n`;
    }

    contextualPrompt += `USER QUESTION: ${message}`;
    return contextualPrompt;
}

async function callOllamaRaw(messages) {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages,
            stream: false
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama HTTP ${response.status}: ${errText.substring(0, 300)}`);
    }

    const data = await response.json();
    const text = data?.message?.content;
    if (!text || typeof text !== 'string') {
        throw new Error('Ollama response missing message.content');
    }

    return text;
}

// Helper function to call Gemini AI
async function callGeminiAI(message, role, username, regulationsContext = null, reportTextContext = null, dbContext = null) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const systemPrompt = getSystemPromptForRole(role, username);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt
        });
        
        const contextualPrompt = buildAIUserPrompt(message, regulationsContext, reportTextContext, 8000, dbContext);
        
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

async function callOllamaAI(message, role, username, regulationsContext = null, reportTextContext = null, dbContext = null) {
    try {
        const systemPrompt = getSystemPromptForRole(role, username);
        const contextualPrompt = buildAIUserPrompt(message, regulationsContext, reportTextContext, 12000, dbContext);
        const text = await callOllamaRaw([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: contextualPrompt }
        ]);

        console.log('✅ Ollama AI response generated:', text.substring(0, 100) + '...');
        return text;
    } catch (error) {
        console.error('❌ Ollama AI error:', error.message);
        return '❌ Desculpe, ocorreu um erro ao processar sua pergunta.\n\n' +
            'Tente novamente ou reformule sua pergunta.';
    }
}

async function callMainAI(message, role, username, regulationsContext = null, reportTextContext = null, dbContext = null) {
    let useOllama = AI_PROVIDER === 'ollama';

    if (AI_PROVIDER === 'auto') {
        useOllama = await isOllamaAvailable();
    }

    if (useOllama) {
        const response = await callOllamaAI(message, role, username, regulationsContext, reportTextContext, dbContext);
        return { response, poweredBy: `Ollama (${OLLAMA_MODEL})` };
    }

    const response = await callGeminiAI(message, role, username, regulationsContext, reportTextContext, dbContext);
    return { response, poweredBy: 'Google Gemini 2.5 Flash' };
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

// Helper: call Gemini/Ollama in guest mode
async function _callGuestAI(prompt) {
    const useOllama = AI_PROVIDER === 'ollama' || (AI_PROVIDER === 'auto' && await isOllamaAvailable());

    if (useOllama) {
        return callOllamaRaw([{ role: 'user', content: prompt }]);
    }

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

        if (AI_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
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

        const text = await _callGuestAI(prompt);
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

        if (AI_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
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

        const text = await _callGuestAI(prompt);
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
            console.log(`📋 Report context provided — sending to ${AI_PROVIDER} for contextual Q&A...`);
            const aiResult = await callMainAI(message, role, username, null, context.reportText);
            return res.json({
                success: true,
                data: {
                    response: aiResult.response,
                    timestamp: new Date().toISOString(),
                    powered_by: `${aiResult.poweredBy} (report context)`,
                    role: role
                }
            });
        }

        let response = '';
        let poweredBy = '';
        const lowerMessage = message.toLowerCase();
        

        // STEP 0: DB LOOKUP — search for lifts and inspections matching the user message
        let dbContext = null;
        try {
            if (db) {
                // Extract address keywords from message (Portuguese street types)
                const addrMatch = lowerMessage.match(/(?:rua|avenida|av\.?|praça|travessa|beco|calçada|estrada|casal|largo|quinta)\s+[\w\s\-]+/gi);
                if (addrMatch && addrMatch.length > 0) {
                    // Take first match, use the first 4+ words as search term
                    const rawTerm = addrMatch[0].trim().split(/\s+/).slice(0, 5).join('\s+');
                    const liftsFound = await db.collection('lifts').find({
                        $or: [
                            { 'address.street': { $regex: rawTerm, $options: 'i' } },
                            { address: { $regex: rawTerm, $options: 'i' } }
                        ]
                    }).limit(3).toArray();

                    if (liftsFound.length > 0) {
                        dbContext = 'ELEVADORES ENCONTRADOS NA BASE DE DADOS FESTLIFT:\n';
                        for (const lift of liftsFound) {
                            const addr = typeof lift.address === 'object'
                                ? [lift.address.street, lift.address.zipCode, lift.address.city].filter(Boolean).join(', ')
                                : (lift.address || 'Morada desconhecida');
                            dbContext += `\nElevador ID: ${lift._id}\n`;
                            dbContext += `  Morada: ${addr}\n`;
                            dbContext += `  Estado: ${lift.inspectionStatus || lift.status || 'desconhecido'}\n`;
                            if (lift.lastInspectionDate) dbContext += `  Última inspeção: ${new Date(lift.lastInspectionDate).toLocaleDateString('pt-PT')}\n`;
                            if (lift.nextInspectionDate) dbContext += `  Próxima inspeção: ${new Date(lift.nextInspectionDate).toLocaleDateString('pt-PT')}\n`;
                            if (lift.municipalNumber) dbContext += `  N.º municipal: ${lift.municipalNumber}\n`;
                            if (lift.installationNumber) dbContext += `  N.º instalação: ${lift.installationNumber}\n`;
                            // Get last inspection report
                            const lastInsp = await db.collection('inspections').findOne(
                                { $or: [{ liftId: lift._id.toString() }, { liftId: lift._id }] },
                                { sort: { date: -1, inspectionDate: -1, createdAt: -1 } }
                            );
                            if (lastInsp) {
                                const inspDate = lastInsp.inspectionDate || lastInsp.date || lastInsp.createdAt;
                                dbContext += `  Último relatório: ${inspDate ? new Date(inspDate).toLocaleDateString('pt-PT') : 'data desconhecida'}\n`;
                                dbContext += `  Resultado: ${lastInsp.result || lastInsp.overallResult || lastInsp.status || 'desconhecido'}\n`;
                                if (lastInsp.clauses && lastInsp.clauses.length > 0) {
                                    const c1 = lastInsp.clauses.filter(c => c.type === 'C1').length;
                                    const c2 = lastInsp.clauses.filter(c => c.type === 'C2').length;
                                    const c3 = lastInsp.clauses.filter(c => c.type === 'C3').length;
                                    dbContext += `  Cláusulas: C1=${c1}, C2=${c2}, C3=${c3}\n`;
                                }
                            } else {
                                dbContext += `  Relatórios de inspeção: nenhum registado\n`;
                            }
                        }
                        console.log(`🗄️ DB context built: ${liftsFound.length} lift(s) found`);
                    }
                }
            }
        } catch (dbLookupErr) {
            console.warn('⚠️ DB context lookup failed:', dbLookupErr.message);
        }

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
        
        // STEP 2: USE AI WITH REGULATIONS CONTEXT
        if (foundInRegulations) {
            console.log(`📖 Found regulation: ${foundInRegulations.article}`);
            const aiResult = await callMainAI(message, role, username, foundInRegulations, null, dbContext);
            response = aiResult.response;
            poweredBy = aiResult.poweredBy;
        } else {
            console.log('💡 No specific regulation found, using general AI');
            const aiResult = await callMainAI(message, role, username, null, null, dbContext);
            response = aiResult.response;
            poweredBy = aiResult.poweredBy;
        }

        // STEP 3: RETURN AI RESPONSE
        res.json({
            success: true,
            data: {
                response,
                timestamp: new Date().toISOString(),
                powered_by: poweredBy || 'AI',
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

// � Inspection PDF Parser Route (аналіз PDF-звітів Bureau Veritas / CML Lisboa)
const inspectionParserRoutes = require('./backend/routes/inspectionParser');
app.use('/api/lifts', inspectionParserRoutes);

// �📋 Request Routes (заявки, завдання, інспекції)
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
        res.status(500).json({ success: false, message: 'Erro ao obter histórico de manutenção' });
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

// PATCH /api/orcamentos/:id/status - Mudar status do orçamento
app.patch('/api/orcamentos/:id/status', authenticateToken, async (req, res) => {
    try {
        if (!db) return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({ success: false, message: 'Sem permissão' });
        }
        const { ObjectId } = require('mongodb');
        const { status, observacao } = req.body;

        const validStatuses = ['rascunho', 'enviado', 'aprovado', 'rejeitado', 'expirado'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Status inválido. Valores aceites: ${validStatuses.join(', ')}` });
        }

        const updateData = {
            status,
            updatedAt: new Date().toISOString(),
            [`statusHistory.${Date.now()}`]: {
                status,
                observacao: observacao || null,
                alteradoPor: req.user.username,
                data: new Date().toISOString()
            }
        };

        const result = await db.collection('orcamentos').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        }

        const statusLabels = { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', rejeitado: 'Rejeitado', expirado: 'Expirado' };
        console.log(`✅ Orçamento ${req.params.id} → status: ${status} (por ${req.user.username})`);
        res.json({ success: true, message: `Status atualizado para: ${statusLabels[status]}` });
    } catch (error) {
        console.error('❌ Erro ao mudar status orçamento:', error);
        res.status(500).json({ success: false, message: error.message });
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

// PATCH /api/orcamentos/:id/link-lift - Прив'язати орсаменто до одного або кількох ліфтів
app.patch('/api/orcamentos/:id/link-lift', authenticateToken, async (req, res) => {
    try {
        if (!db) return res.status(503).json({ success: false, message: 'Base de dados indisponível' });
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({ success: false, message: 'Sem permissão' });
        }
        const { ObjectId } = require('mongodb');
        let { liftIds } = req.body;
        if (!Array.isArray(liftIds)) {
            return res.status(400).json({ success: false, message: 'liftIds deve ser um array' });
        }
        // Validate and filter IDs
        const validIds = liftIds.filter(id => {
            try { new ObjectId(String(id)); return true; } catch { return false; }
        }).map(id => String(id));

        let liftsData = [];
        if (validIds.length > 0) {
            const foundLifts = await db.collection('lifts')
                .find({ _id: { $in: validIds.map(id => new ObjectId(id)) } })
                .project({ _id: 1, municipalNumber: 1, address: 1, clientName: 1 })
                .toArray();
            liftsData = foundLifts.map(l => {
                const addr = l.address || {};
                const addrStr = typeof addr === 'string'
                    ? addr
                    : [addr.street, addr.zipCode, addr.city].filter(Boolean).join(', ');
                return {
                    liftId: l._id.toString(),
                    municipalNumber: l.municipalNumber || null,
                    address: addrStr,
                    clientName: l.clientName || null
                };
            });
        }

        // Backward compatibility: keep single liftId + liftAddress fields pointing to first lift
        const updateData = {
            lifts: liftsData,
            liftId: liftsData.length > 0 ? liftsData[0].liftId : null,
            liftAddress: liftsData.length > 0 ? liftsData[0].address : null,
            updatedAt: new Date().toISOString()
        };

        const result = await db.collection('orcamentos').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        }

        const count = liftsData.length;
        const msg = count === 0
            ? 'Elevadores desvinculados'
            : count === 1
                ? `Vinculado a: ${liftsData[0].address || liftsData[0].municipalNumber || ''}`
                : `Vinculado a ${count} elevadores`;

        console.log(`✅ Orçamento ${req.params.id} vinculado a ${count} elevador(es)`);
        res.json({ success: true, message: msg, lifts: liftsData });
    } catch (error) {
        console.error('❌ Erro ao vincular elevadores:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

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
                error: 'Acesso negado. Тільки адміністратори можуть надсилати email.'
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
                error: 'Formato de email inválido'
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
                error: 'Erro SMTP: ' + smtpError.message
            });
        }

    } catch (error) {
        console.error('❌ Email sending error:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao enviar email: ' + error.message
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

        // Відправити через emailService (SMTP) з BCC на адмін-пошту (копія відправнику)
        const adminEmail = process.env.EMAIL_FROM
            ? process.env.EMAIL_FROM.match(/<([^>]+)>/)?.[1] || process.env.SMTP_USER
            : process.env.SMTP_USER;
        await emailService.sendEmail(clientEmail, mailOptions.subject, mailOptions.html, adminEmail);
        
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

/**
 * Gera PDF de Relatório de Manutenção usando pdfkit.
 * @param {object} data - { inspectionNumber, inspectionDate, inspector, liftLocation, liftModel, liftSerial, visitType, driveType, doorType, checklist, generalComments, recommendations }
 * @returns {Promise<Buffer>}
 */
async function gerarPDFRelatorio(data) {
    const PDFDocument = require('pdfkit');
    const { inspectionNumber, inspectionDate, inspector, liftLocation, liftModel, liftSerial,
            visitType, driveType, doorType, checklist, generalComments, recommendations } = data;

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];
            doc.on('data', c => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const logoPath = path.join(__dirname, 'assets/img/logo.png');
            if (require('fs').existsSync(logoPath)) {
                doc.rect(40, 35, 185, 80).fill('#1a3a6b');
                doc.image(logoPath, 50, 45, { width: 160 });
                doc.y = 130;
            } else {
                doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a3a6b')
                   .text('FestLift - Elevadores e Serviços, Lda.', { align: 'center' });
                doc.moveDown(0.5);
            }

            doc.fontSize(9).font('Helvetica').fillColor('#444444');
            doc.text('Av. do Parque 84B, Rio de Mouro, Lisboa 2635-609  |  Tel: +351 214 190 863', { align: 'center' });
            doc.text('Email: info@festlift.pt  |  NIF: 515 924 741', { align: 'center' });
            doc.moveDown(0.5);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1a3a6b').stroke();
            doc.moveDown(0.5);

            // Title
            const visitLabels = {
                maintenance: 'RELATÓRIO DE MANUTENÇÃO MENSAL',
                quarterly: 'RELATÓRIO DE REVISÃO TRIMESTRAL',
                annual: 'RELATÓRIO DE REVISÃO ANUAL',
                pre_inspection: 'RELATÓRIO DE PREPARAÇÃO OI',
                repair: 'RELATÓRIO DE REPARAÇÃO',
                emergency: 'RELATÓRIO DE INTERVENÇÃO DE EMERGÊNCIA',
            };
            const title = visitLabels[visitType] || 'RELATÓRIO DE MANUTENÇÃO';
            doc.fontSize(15).font('Helvetica-Bold').fillColor('#1a3a6b')
               .text(title, { align: 'center' });
            doc.moveDown(0.8);

            // Info table
            const dataFormatted = inspectionDate
                ? new Date(inspectionDate).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—';

            const infoRows = [
                ['Nº do Relatório', inspectionNumber || '—'],
                ['Data', dataFormatted],
                ['Técnico Responsável', inspector || '—'],
                ['Localização do Ascensor', liftLocation || '—'],
                ['Fabricante / Modelo', liftModel || '—'],
            ];
            if (liftSerial) infoRows.push(['Número de Série', liftSerial]);

            const tL = 50, tR = 545, col1w = 180;
            let y = doc.y;
            doc.fontSize(9).font('Helvetica');
            infoRows.forEach((row, i) => {
                const bg = i % 2 === 0 ? '#f0f4ff' : '#ffffff';
                doc.rect(tL, y, tR - tL, 18).fill(bg).stroke('#dddddd');
                doc.fillColor('#333333').font('Helvetica-Bold').text(row[0], tL + 6, y + 4, { width: col1w - 6 });
                doc.font('Helvetica').text(row[1], tL + col1w + 4, y + 4, { width: tR - tL - col1w - 10 });
                y += 18;
            });
            doc.y = y + 12;

            // Checklist results
            if (checklist && typeof checklist === 'object') {
                const items = Object.entries(checklist).filter(([, v]) => v.status && v.status !== '');
                if (items.length > 0) {
                    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a6b')
                       .text('Resultados da Verificação', 50, doc.y);
                    doc.moveDown(0.4);

                    // Table header
                    const hY = doc.y;
                    doc.rect(50, hY, 495, 16).fill('#1a3a6b');
                    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
                    doc.text('Item', 56, hY + 3, { width: 260 });
                    doc.text('Estado', 318, hY + 3, { width: 70, align: 'center' });
                    doc.text('Observação', 390, hY + 3, { width: 155 });
                    y = hY + 16;

                    // standard (maintenance/quarterly/annual) + binary (repair/emergency)
                    const statusIcon = {
                        ok:      '✓ Conforme',
                        warning: '⚠ Atenção',
                        error:   '✗ Não conforme',
                        yes:     '✓ Sim',
                        no:      '✗ Não',
                        na:      'N/A',
                    };
                    const statusColor = {
                        ok:      '#28a745',
                        warning: '#e67e00',
                        error:   '#dc3545',
                        yes:     '#28a745',
                        no:      '#dc3545',
                        na:      '#6c757d',
                    };

                    // Section headers map for repair / emergency (from inspection-templates structure)
                    const sectionHeaders = {
                        // repair
                        'rep-diagnostico':  'Diagnóstico da Avaria',
                        'avaria-descrita':  null, // first item of that section — header printed before it
                        'rep-trabalho':     'Trabalho Realizado',
                        'comp-subst':       null,
                        'rep-verificacao':  'Verificação Pós-Reparação',
                        'contatos-seg-rep': null,
                        'rep-documentacao': 'Documentação da Reparação',
                        'ordem-trabalho':   null,
                        // emergency
                        'emg-situacao':       'Situação de Emergência / Resgate',
                        'passag-resgatados':  null,
                        'emg-diagnostico':    'Diagnóstico da Causa',
                        'causa-emerg':        null,
                        'emg-acoes':          'Ações Corretivas',
                        'correcao-realizada': null,
                        'emg-estado':         'Estado Final do Equipamento',
                        'ensaio-funcional':   null,
                        'emg-documentacao':   'Documentação da Emergência',
                        'relatorio-emerg':    null,
                    };

                    // IDs that are the FIRST item of each section (trigger section header)
                    const sectionFirstItem = {
                        'avaria-descrita':   'Diagnóstico da Avaria',
                        'comp-subst':        'Trabalho Realizado',
                        'contatos-seg-rep':  'Verificação Pós-Reparação',
                        'ordem-trabalho':    'Documentação da Reparação',
                        'passag-resgatados': 'Situação de Emergência / Resgate',
                        'causa-emerg':       'Diagnóstico da Causa',
                        'correcao-realizada':'Ações Corretivas',
                        'ensaio-funcional':  'Estado Final do Equipamento',
                        'relatorio-emerg':   'Documentação da Emergência',
                    };

                    items.forEach(([key, val], i) => {
                        // Print section header if this is the first item of a repair/emergency section
                        if (sectionFirstItem[key]) {
                            if (y > 740) { doc.addPage(); y = 50; }
                            // small section heading row
                            doc.rect(50, y, 495, 14).fill('#e8eef8').stroke('#c0ccee');
                            doc.fillColor('#1a3a6b').font('Helvetica-Bold').fontSize(8)
                               .text(sectionFirstItem[key], 56, y + 3, { width: 485 });
                            y += 14;
                        }

                        if (y > 760) { doc.addPage(); y = 50; }
                        const label = val.label || key.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const rowH = 18;
                        const bg = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
                        doc.rect(50, y, 495, rowH).fill(bg).stroke('#e0e0e0');
                        doc.fillColor('#333333').font('Helvetica').fontSize(8).text(label, 56, y + 4, { width: 258 });
                        const sc = statusColor[val.status] || '#333333';
                        const si = statusIcon[val.status] || val.status;
                        doc.fillColor(sc).font('Helvetica-Bold').text(si, 318, y + 4, { width: 68, align: 'center' });
                        doc.fillColor('#555555').font('Helvetica').text(val.comment || '', 390, y + 4, { width: 152 });
                        y += rowH;
                    });
                    doc.y = y + 10;
                }
            }

            // Observations
            if (generalComments && generalComments.trim()) {
                if (doc.y > 720) doc.addPage();
                doc.moveDown(0.5);
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a6b').text('Observações Gerais');
                doc.moveDown(0.3);
                doc.rect(50, doc.y, 495, 2).fill('#1a3a6b');
                doc.moveDown(0.2);
                doc.fontSize(9).font('Helvetica').fillColor('#333333').text(generalComments, 50, doc.y, { width: 495 });
                doc.moveDown(0.5);
            }

            // Recommendations
            if (recommendations && recommendations.trim()) {
                if (doc.y > 700) doc.addPage();
                doc.moveDown(0.5);
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3a6b').text('Recomendações');
                doc.moveDown(0.3);
                doc.rect(50, doc.y, 495, 2).fill('#ffc107');
                doc.moveDown(0.2);
                doc.fontSize(9).font('Helvetica').fillColor('#333333').text(recommendations, 50, doc.y, { width: 495 });
                doc.moveDown(0.5);
            }

            // Signature line
            if (doc.y > 720) doc.addPage();
            const sigY = Math.max(doc.y + 20, 700);
            doc.moveTo(50, sigY).lineTo(260, sigY).strokeColor('#999999').stroke();
            doc.fontSize(8).font('Helvetica').fillColor('#666666').text('Técnico Responsável', 50, sigY + 3);
            doc.moveTo(300, sigY).lineTo(510, sigY).strokeColor('#999999').stroke();
            doc.text('Cliente / Condomínio', 300, sigY + 3);

            // Footer
            doc.fontSize(7.5).font('Helvetica').fillColor('#888888')
               .text(
                   'FestLift - Elevadores e Serviços, Lda.  |  NIF: 515 924 741  |  info@festlift.pt  |  +351 214 190 863',
                   50, 820, { align: 'center', width: 495 }
               );

            doc.end();
        } catch (err) { reject(err); }
    });
}

// POST /api/inspections/download-pdf - Descarregar PDF do relatório
app.post('/api/inspections/download-pdf', authenticateToken, async (req, res) => {
    try {
        const { inspectionNumber } = req.body;
        if (!inspectionNumber) {
            return res.status(400).json({ success: false, message: 'inspectionNumber é obrigatório' });
        }
        const pdfBuffer = await gerarPDFRelatorio(req.body);
        const filename = `Relatorio_${String(inspectionNumber).replace(/[/\\]/g, '-')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('❌ Erro ao gerar PDF do relatório:', err);
        res.status(500).json({ success: false, message: 'Erro ao gerar PDF', error: err.message });
    }
});

// POST /api/inspections/send-report - Enviar relatório por email
app.post('/api/inspections/send-report', authenticateToken, async (req, res) => {
    try {
        const {
            inspectionNumber,
            inspectionDate,
            inspector,
            liftLocation,
            clientName,
            recipientEmail
        } = req.body;

        if (!recipientEmail || !inspectionNumber) {
            return res.status(400).json({
                success: false,
                message: 'Email e número da manutenção são obrigatórios'
            });
        }

        // Gerar PDF com todo o conteúdo do relatório.
        // NOTA: O corpo do email é intencionalmente simples (carta de apresentação).
        // Os detalhes completos constam APENAS no PDF em anexo.
        // Isto evita que clientes com Apple Mail / macOS vejam o conteúdo duplicado
        // (o macOS Mail renderiza o HTML inline E mostra o PDF em anexo em simultâneo).
        const pdfBuffer = await gerarPDFRelatorio(req.body);
        const numSafe = String(inspectionNumber).replace(/[/\\]/g, '-');

        const dataFormatted = inspectionDate
            ? new Date(inspectionDate).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : 'Não especificada';

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
            from: process.env.EMAIL_FROM || 'FestLift <info@festlift.pt>',
            to: recipientEmail,
            subject: `Relatório de Manutenção ${inspectionNumber} — FestLift`,
            // Texto simples (fallback)
            text: `Exmo(a). Sr(a.)${clientName ? ' ' + clientName : ''},\n\nEm anexo encontra o Relatório de Manutenção ${inspectionNumber} relativo ao ascensor em ${liftLocation || '—'}, realizado em ${dataFormatted} pelo técnico ${inspector || '—'}.\n\nPara qualquer esclarecimento estamos ao dispor.\n\nCom os melhores cumprimentos,\nFestLift — Elevadores e Serviços, Lda.\ninfo@festlift.pt | +351 214 190 863`,
            // HTML: carta de apresentação simples, sem checklist inline
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #dde0e8;border-radius:10px;overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#1a3a6b 0%,#2d5fa8 100%);color:#fff;padding:28px 30px;text-align:center;">
                        <h1 style="margin:0;font-size:22px;letter-spacing:1px;">FestLift</h1>
                        <p style="margin:5px 0 0;font-size:12px;opacity:.85;">Elevadores e Serviços, Lda.</p>
                    </div>
                    <div style="padding:30px 32px;">
                        <p style="font-size:15px;color:#333;margin:0 0 14px;">
                            Exmo(a). Sr(a.)${clientName ? ' <strong>' + clientName + '</strong>' : ''},
                        </p>
                        <p style="font-size:15px;color:#333;line-height:1.65;margin:0 0 16px;">
                            Em anexo encontra o <strong>Relatório de Manutenção ${inspectionNumber}</strong>
                            relativo ao ascensor em <strong>${liftLocation || '—'}</strong>,
                            realizado em <strong>${dataFormatted}</strong>
                            pelo técnico <strong>${inspector || '—'}</strong>.
                        </p>
                        <div style="background:#f0f4ff;border-left:4px solid #1a3a6b;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:24px;">
                            <p style="margin:0;font-size:13px;color:#555;">
                                📎 O relatório completo — incluindo todos os itens verificados, observações e recomendações — encontra-se no ficheiro <strong>PDF em anexo</strong>.
                            </p>
                        </div>
                        <p style="font-size:15px;color:#333;margin:0 0 4px;">
                            Para qualquer esclarecimento estamos ao dispor.
                        </p>
                        <p style="font-size:15px;color:#333;margin:0;">
                            Com os melhores cumprimentos,<br>
                            <strong>FestLift — Elevadores e Serviços, Lda.</strong>
                        </p>
                    </div>
                    <div style="background:#f8f9fa;padding:16px 30px;text-align:center;border-top:1px solid #e0e4ee;">
                        <p style="margin:0;font-size:11px;color:#999;">
                            info@festlift.pt &nbsp;|&nbsp; +351 214 190 863<br>
                            <small>Email gerado automaticamente — por favor não responda diretamente.</small>
                        </p>
                    </div>
                </div>`,
            // PDF em anexo (conteúdo completo do relatório)
            attachments: [{
                filename: `Relatorio_${numSafe}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Relatório ${inspectionNumber} enviado para ${recipientEmail} (PDF em anexo)`);

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
            subject: subject || 'Contrato - FestLift',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">📄 Контракт на обслуговування</h2>
                    <p>${message || 'Prezado(a) cliente! Enviamos-lhe o contrato de manutenção do elevador.'}</p>
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
        res.json({ success: true, message: 'Contrato enviado com sucesso' });
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
            subject: subject || 'Relatório de inspeção - FestLift',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">📋 Звіт інспекції ліфта</h2>
                    <p>${message || 'Prezado(a) cliente! Enviamos-lhe o relatório de inspeção do seu elevador.'}</p>
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
        res.json({ success: true, message: 'Relatório de inspeção enviado com sucesso' });
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
            return res.status(400).json({ success: false, error: 'Email є обов\'язковим' });
        }

        // Перетворюємо plain text у HTML (зберігаємо переноси рядків)
        const messageHtml = (message || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');

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
            subject: subject || 'Notificação de Inspeção de Elevador',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0;">🏢 FestLift – Inspeção de Elevador</h2>
                    </div>
                    <div style="padding: 24px; border: 1px solid #ddd; border-top: none; line-height: 1.6;">
                        ${messageHtml}
                    </div>
                    <div style="background: #f8f9fa; padding: 14px; text-align: center; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
                        <p style="margin: 0; color: #666; font-size: 12px;">
                            FestLift · <a href="https://festlift.pt" style="color:#667eea;">festlift.pt</a> · info@festlift.pt
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        console.log(`✅ Inspection email sent to ${email} | subject: ${subject}`);
        res.json({ success: true, message: `Email enviado para ${email}` });
    } catch (error) {
        console.error('❌ Error sending inspection email:', error.message);
        res.status(500).json({ success: false, error: error.message });
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
            subject: subject || 'Email de teste - FestLift',
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
                message: 'Acesso permitido apenas a administradores'
            });
        }

        console.log(`🔍 Admin ${req.user.email} запустив перевірку оновлень регламентів...`);

        const updater = new RegulationsUpdater();
        const report = await updater.checkForUpdates();

        res.json({
            success: true,
            message: 'Verificação concluída',
            data: report
        });

    } catch (error) {
        console.error('❌ Помилка перевірки регламентів:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar atualizações',
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
                message: 'Verificação ainda não realizada'
            });
        }
    } catch (error) {
        console.error('❌ Помилка читання звіту:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter relatório'
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
        res.status(500).json({ message: 'Erro ao obter relatórios' });
    }
});

// POST /api/reports/generate - генерація звіту
app.post('/api/reports/generate', authenticateToken, async (req, res) => {
    try {
        const { type = 'maintenance', startDate, endDate, technicianId, status } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Indique startDate e endDate' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Formato de data inválido' });
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
        res.status(500).json({ message: 'Erro ao gerar relatório', error: error.message });
    }
});

// GET /api/reports/:id/pdf - заглушка PDF
app.get('/api/reports/:id/pdf', authenticateToken, (req, res) => {
    const report = generatedReportsStore.get(req.params.id);
    if (!report) return res.status(404).json({ message: 'Relatório não encontrado' });
    res.json({ message: 'PDF export не реалізовано', report });
});

// GET /api/reports/:id/excel - заглушка Excel
app.get('/api/reports/:id/excel', authenticateToken, (req, res) => {
    const report = generatedReportsStore.get(req.params.id);
    if (!report) return res.status(404).json({ message: 'Relatório não encontrado' });
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
app.get('*', (req, res, next) => {
    // Agent routes registered after this wildcard — pass them through
    if (req.path.startsWith('/api/agent/')) {
        return next();
    }
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

// 🤖 Init AI Agent (after io is ready, db arrives async)
agentService.init(null, io);
connectMongoPromise.then(database => agentService.setDb(database)).catch(() => {});

// ─────────────────────────────────────────────────────────────
// 🤖 AGENT API ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET pending agent notifications
app.get('/api/agent/notifications', authenticateToken, async (req, res) => {
    try {
        const role = req.user?.role;
        const email = req.user?.email;
        const data = await agentService.getPendingNotifications(role, email);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST decision on a notification (yes / no / postpone)
app.post('/api/agent/decide', authenticateToken, async (req, res) => {
    try {
        const { notificationId, action, reason } = req.body;
        if (!notificationId || !action) return res.status(400).json({ success: false, error: 'Missing notificationId or action' });
        const result = await agentService.handleDecision(
            notificationId, action, reason || '', req.user.id, req.user.role
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST free-text chat with agent
app.post('/api/agent/chat', authenticateToken, async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) return res.status(503).json({ success: false, error: 'GEMINI_API_KEY not set' });
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, error: 'Missing message' });
        const reply = await agentService.chat(message, req.user.id, req.user.role, req.user.email);
        res.json({ success: true, reply });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET cumulative findings for a lift
app.get('/api/agent/lift-history', authenticateToken, async (req, res) => {
    try {
        const { liftLocation } = req.query;
        if (!liftLocation) return res.status(400).json({ success: false, error: 'Missing liftLocation' });
        const data = await agentService.buildCumulativeQuoteContext(liftLocation);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
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