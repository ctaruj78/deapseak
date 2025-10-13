
const express = require("express");
const cors = require("cors");
const { connectDB, getDB, closeDB } = require("./db");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { spawn } = require('child_process');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware
app.use(express.json());

// CORS налаштування для GitHub Codespaces та локальної розробки
app.use(cors({
    origin: function (origin, callback) {
        // Дозволити запити без origin (наприклад, curl, Postman)
        if (!origin) return callback(null, true);
        
        // Дозволені origins
        const allowedOrigins = [
            'http://localhost:8080',
            'http://localhost:8081',
            'http://127.0.0.1:8080',
            'http://127.0.0.1:8081'
        ];
        
        // Дозволити всі GitHub Codespaces домени
        if (origin.includes('.app.github.dev')) {
            return callback(null, true);
        }
        
        // Перевірка на дозволені origins
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('⚠️ CORS заблоковано для:', origin);
            callback(null, true); // Все одно дозволяємо для розробки
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Статичні файли - обслуговування HTML, CSS, JS
app.use(express.static('.'));

// Підключення до MongoDB при запуску
connectDB()
    .then(async () => {
        // Створення адмін користувача за замовчуванням
        await createDefaultAdmin();
    })
    .catch(err => {
        console.error("Помилка підключення до MongoDB:", err);
        process.exit(1);
    });

// Функція створення адміністратора за замовчуванням
async function createDefaultAdmin() {
    try {
        const db = getDB();
        const adminExists = await db.collection("users").findOne({ 
            $or: [
                { email: "admin@deapseak.com" },
                { username: "admin" }
            ]
        });
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            
            await db.collection("users").insertOne({
                username: "admin",
                email: "admin@deapseak.com",
                password: hashedPassword,
                role: "admin",
                fullName: "Системний Адміністратор",
                createdAt: new Date(),
                isActive: true
            });
            
            console.log("✅ Створено адмін користувача: admin@deapseak.com / admin123");
        }
    } catch (error) {
        console.error("❌ Помилка створення адмін користувача:", error);
    }
}

// Status endpoint (без авторизації)
app.get("/api/status", async (req, res) => {
    try {
        // Перевірка з'єднання з MongoDB
        const db = getDB();
        let mongoStatus = false;
        
// ============================================
// ОСНОВНІ API ENDPOINTS
// ============================================

// Статус сервера
app.get('/api/status', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Авторизація
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Ім\'я користувача та пароль обов\'язкові'
            });
        }
        
        const db = getDB();
        const user = await db.collection('users').findOne({ username });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Невірне ім\'я користувача або пароль'
            });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Невірне ім\'я користувача або пароль'
            });
        }
        
        const token = jwt.sign(
            {
                id: user._id,
                username: user.username,
                role: user.role,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Помилка авторизації' });
    }
});

// Ліфти
app.get('/api/lifts', authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const lifts = await db.collection('lifts').find().toArray();
        res.json(lifts);
    } catch (error) {
        console.error('Get lifts error:', error);
        res.status(500).json({ success: false, message: 'Помилка отримання ліфтів' });
    }
});

// Запуск сервера
async function startServer() {
    try {
        await connectDB();
        await createDirectories();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`API сервер запущено на http://0.0.0.0:${PORT}`);
        });
    } catch (error) {
        console.error('Помилка запуску сервера:', error);
        process.exit(1);
    }
}

startServer();
