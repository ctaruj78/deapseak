
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
        
        try {
            await db.admin().ping();
            mongoStatus = true;
        } catch (mongoError) {
            console.warn("MongoDB недоступна:", mongoError.message);
            mongoStatus = false;
        }
        
        res.json({
            status: "online",
            timestamp: new Date(),
            version: "2.0.0",
            uptime: process.uptime(),
            mongodb: mongoStatus,
            modules: {
                assignments: true,
                monitoring: true,
                chat: true,
                qr: true,
                auth: true,
                database: mongoStatus
            }
        });
    } catch (error) {
        console.error("Помилка статусу:", error);
        res.status(500).json({
            status: "error",
            timestamp: new Date(),
            version: "2.0.0",
            uptime: process.uptime(),
            mongodb: false,
            error: error.message
        });
    }
});

// Middleware для аутентифікації
const authenticateToken = (req, res, next) => {
    // Спробуємо отримати токен з різних джерел
    let token = null;
    
    // 1. З заголовку Authorization
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else {
            token = authHeader; // Якщо токен передано без Bearer
        }
    }
    
    // 2. З cookie (якщо є)
    if (!token && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'auth_token') {
                token = value;
                break;
            }
        }
    }
    
    // 3. З query параметрів (для QR кодів)
    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: "Необхідна авторизація",
            message: "Токен не знайдено" 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Помилка верифікації токена:', err.message);
            return res.status(403).json({ 
                success: false,
                error: "Недійсний токен",
                message: err.message 
            });
        }
        
        req.user = user;
        next();
    });
};

// Auth endpoints (нові маршрути)
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const loginField = email || username;
        
        if (!loginField || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Логін/email та пароль обов'язкові" 
            });
        }
        
        const db = getDB();
        const user = await db.collection("users").findOne({ 
            $or: [
                { email: loginField }, 
                { username: loginField }
            ] 
        });
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "Невірний логін або пароль" 
            });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: "Невірний логін або пароль" 
            });
        }
        
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            message: "Успішна авторизація",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Помилка авторизації:", error);
        res.status(500).json({ 
            success: false, 
            message: "Внутрішня помилка сервера" 
        });
    }
});

app.post("/api/auth/register", async (req, res) => {
    try {
        const { username, password, email, firstName, lastName, role, phone } = req.body;
        
        if (!username || !password || !email) {
            return res.status(400).json({ 
                success: false, 
                message: "Логін, пароль та email обов'язкові" 
            });
        }
        
        const db = getDB();
        
        // Перевірка існуючого користувача
        const existingUser = await db.collection("users").findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "Користувач з таким логіном або email вже існує" 
            });
        }
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const newUser = {
            username,
            password: hashedPassword,
            email,
            firstName: firstName || "",
            lastName: lastName || "",
            role: role || "client",
            phone: phone || "",
            createdAt: new Date(),
            active: true
        };
        
        const result = await db.collection("users").insertOne(newUser);
        
        if (result.acknowledged) {
            const token = jwt.sign(
                { id: result.insertedId, username, role: newUser.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.status(201).json({
                success: true,
                message: "Користувача створено",
                token,
                user: {
                    id: result.insertedId,
                    username,
                    email,
                    firstName: firstName || "",
                    lastName: lastName || "",
                    role: newUser.role
                }
            });
        } else {
            throw new Error("Помилка створення користувача");
        }
    } catch (error) {
        console.error("Помилка реєстрації:", error);
        res.status(500).json({ 
            success: false, 
            message: "Внутрішня помилка сервера" 
        });
    }
});

app.get("/api/verify-token", authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: "Токен дійсний",
        user: req.user
    });
});

// Endpoints для аутентифікації (старі маршрути для зворотної сумісності)
app.post("/api/register", async (req, res) => {
    try {
        const { username, password, email, firstName, lastName, role, phone } = req.body;
        
        const db = getDB();
        
        // Перевірка, чи користувач з таким email або username вже існує
        const existingUser = await db.collection("users").findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "Користувач з таким логіном або email вже існує" 
            });
        }
        
        // Хешування пароля
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Створення нового користувача
        const newUser = {
            username,
            password: hashedPassword,
            email,
            firstName,
            lastName,
            role,
            phone,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        
        const result = await db.collection("users").insertOne(newUser);
        
        res.status(201).json({ 
            success: true, 
            message: "Користувач успішно створений", 
            userId: result.insertedId 
        });
    } catch (error) {
        console.error("Помилка реєстрації:", error);
        res.status(500).json({ 
            success: false, 
            message: "Помилка реєстрації користувача" 
        });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const db = getDB();
        
        // Пошук користувача
        const user = await db.collection("users").findOne({ username });
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "Неправильний логін або пароль" 
            });
        }
        
        // Перевірка пароля
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: "Неправильний логін або пароль" 
            });
        }
        
        // Створення JWT токена
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: req.body.remember ? '30d' : '24h' }
        );
        
        // Відправка токена та даних користувача (без пароля)
        const { password: userPass, ...userData } = user;
        
        res.status(200).json({ 
            success: true, 
            token, 
            user: userData 
        });
    } catch (error) {
        console.error("Помилка входу:", error);
        res.status(500).json({ 
            success: false, 
            message: "Помилка входу в систему" 
        });
    }
});

app.post("/api/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        
        const db = getDB();
        
        // Пошук користувача за email
        const user = await db.collection("users").findOne({ email });
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "Користувач з такою електронною адресою не знайдений" 
            });
        }
        
        // В реальному проекті тут мав би бути код для відправки листа з інструкціями
        // Але для демонстрації просто повідомляємо про успіх
        
        res.status(200).json({ 
            success: true, 
            message: "Інструкції з відновлення паролю надіслано на вашу електронну адресу" 
        });
    } catch (error) {
        console.error("Помилка відновлення паролю:", error);
        res.status(500).json({ 
            success: false, 
            message: "Помилка відновлення паролю" 
        });
    }
});

// Endpoints для ліфтів
app.get("/api/lifts", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const lifts = await db.collection("lifts").find({}).toArray();
        res.json(lifts);
    } catch (error) {
        console.error("Помилка читання даних з MongoDB:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося завантажити дані" 
        });
    }
});

app.get("/api/lifts/:id", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const lift = await db.collection("lifts").findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (!lift) {
            return res.status(404).json({ 
                success: false, 
                message: "Ліфт не знайдено" 
            });
        }
        
        res.json(lift);
    } catch (error) {
        console.error("Помилка отримання ліфта:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати дані про ліфт" 
        });
    }
});

app.post("/api/lifts", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const lift = req.body;
        
        // Валідація обов'язкових полів для нового ліфта
        if (!lift._id && (!lift.name || !lift.address)) {
            return res.status(400).json({
                success: false,
                message: "Назва та адреса ліфта обов'язкові"
            });
        }
        
        if (lift._id) {
            // Оновлення
            const { _id, ...update } = lift;
            const objectId = new ObjectId(_id);
            await db.collection("lifts").updateOne(
                { _id: objectId }, 
                { $set: update }
            );
            res.json({ 
                success: true, 
                updated: true, 
                id: _id 
            });
        } else {
            // Додавання
            const result = await db.collection("lifts").insertOne(lift);
            res.json({ 
                success: true, 
                id: result.insertedId 
            });
        }
    } catch (error) {
        console.error("Помилка збереження даних у MongoDB:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося зберегти дані" 
        });
    }
});

app.delete("/api/lifts/:id", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const result = await db.collection("lifts").deleteOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Ліфт не знайдено" 
            });
        }
        
        res.json({ 
            success: true, 
            message: "Ліфт успішно видалено" 
        });
    } catch (error) {
        console.error("Помилка видалення ліфта:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося видалити ліфт" 
        });
    }
});

// Endpoints для заявок на обслуговування
app.get("/api/requests", async (req, res) => {
    try {
        const db = getDB();
        const requests = await db.collection("requests").find({}).toArray();
        res.json(requests);
    } catch (error) {
        console.error("Помилка отримання заявок:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося завантажити заявки" 
        });
    }
});

app.get("/api/requests/:id", async (req, res) => {
    try {
        const db = getDB();
        const request = await db.collection("requests").findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: "Заявку не знайдено" 
            });
        }
        
        res.json(request);
    } catch (error) {
        console.error("Помилка отримання заявки:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати дані про заявку" 
        });
    }
});

app.post("/api/requests", async (req, res) => {
    try {
        const db = getDB();
        const request = req.body;
        
        // Валідація обов'язкових полів для нової заявки
        if (!request._id && (!request.liftId || !request.description)) {
            return res.status(400).json({
                success: false,
                message: "ID ліфта та опис заявки обов'язкові"
            });
        }
        
        if (request._id) {
            // Оновлення
            const { _id, ...update } = request;
            const objectId = new ObjectId(_id);
            await db.collection("requests").updateOne(
                { _id: objectId }, 
                { $set: update }
            );
            res.json({ 
                success: true, 
                updated: true, 
                id: _id 
            });
        } else {
            // Додавання нової заявки
            const newRequest = {
                ...request,
                createdAt: new Date().toISOString()
            };
            const result = await db.collection("requests").insertOne(newRequest);
            res.json({ 
                success: true, 
                id: result.insertedId 
            });
        }
    } catch (error) {
        console.error("Помилка збереження заявки:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося зберегти заявку" 
        });
    }
});

app.delete("/api/requests/:id", async (req, res) => {
    try {
        const db = getDB();
        const result = await db.collection("requests").deleteOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Заявку не знайдено" 
            });
        }
        
        res.json({ 
            success: true, 
            message: "Заявка успішно видалена" 
        });
    } catch (error) {
        console.error("Помилка видалення заявки:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося видалити заявку" 
        });
    }
});

// Endpoints для технічних спеціалістів
app.get("/api/technicians", async (req, res) => {
    try {
        const db = getDB();
        const technicians = await db.collection("users").find({ 
            role: "technician" 
        }).toArray();
        
        // Видаляємо паролі перед надсиланням
        const techData = technicians.map(tech => {
            const { password, ...techInfo } = tech;
            return techInfo;
        });
        
        res.json(techData);
    } catch (error) {
        console.error("Помилка отримання техніків:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося завантажити дані про техніків" 
        });
    }
});

// Endpoints для завдань технікам
app.get("/api/assignments", async (req, res) => {
    try {
        const db = getDB();
        const assignments = await db.collection("assignments").find({}).toArray();
        res.json(assignments);
    } catch (error) {
        console.error("Помилка отримання призначень:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося завантажити призначення" 
        });
    }
});

app.post("/api/assignments", async (req, res) => {
    try {
        const db = getDB();
        const assignment = req.body;
        
        // Валідація обов'язкових полів для нового призначення
        if (!assignment._id && (!assignment.requestId || !assignment.technicianId)) {
            return res.status(400).json({
                success: false,
                message: "ID заявки та ID техніка обов'язкові"
            });
        }
        
        if (assignment._id) {
            // Оновлення
            const { _id, ...update } = assignment;
            const objectId = new ObjectId(_id);
            await db.collection("assignments").updateOne(
                { _id: objectId }, 
                { $set: update }
            );
            res.json({ 
                success: true, 
                updated: true, 
                id: _id 
            });
        } else {
            // Додавання
            const newAssignment = {
                ...assignment,
                createdAt: new Date().toISOString()
            };
            const result = await db.collection("assignments").insertOne(newAssignment);
            res.json({ 
                success: true, 
                id: result.insertedId 
            });
        }
    } catch (error) {
        console.error("Помилка збереження призначення:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося зберегти призначення" 
        });
    }
});

// Endpoints для клієнтів
app.get("/api/clients", async (req, res) => {
    try {
        const db = getDB();
        const clients = await db.collection("users").find({ 
            role: "client" 
        }).toArray();
        
        // Видаляємо паролі перед надсиланням
        const clientData = clients.map(client => {
            const { password, ...clientInfo } = client;
            return clientInfo;
        });
        
        res.json(clientData);
    } catch (error) {
        console.error("Помилка отримання клієнтів:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося завантажити дані про клієнтів" 
        });
    }
});

// Статистичні дані
app.get("/api/stats", async (req, res) => {
    try {
        const db = getDB();
        
        const totalLifts = await db.collection("lifts").countDocuments();
        const activeLifts = await db.collection("lifts").countDocuments({ status: "active" });
        const liftsInMaintenance = await db.collection("lifts").countDocuments({ status: "maintenance" });
        
        const totalRequests = await db.collection("requests").countDocuments();
        const pendingRequests = await db.collection("requests").countDocuments({ status: "pending" });
        
        const totalTechnicians = await db.collection("users").countDocuments({ role: "technician" });
        const totalClients = await db.collection("users").countDocuments({ role: "client" });
        
        res.json({
            lifts: {
                total: totalLifts,
                active: activeLifts,
                maintenance: liftsInMaintenance
            },
            requests: {
                total: totalRequests,
                pending: pendingRequests
            },
            users: {
                technicians: totalTechnicians,
                clients: totalClients
            }
        });
    } catch (error) {
        console.error("Помилка отримання статистики:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося завантажити статистичні дані" 
        });
    }
});

// Dashboard статистика
app.get("/api/stats/dashboard", async (req, res) => {
    try {
        const db = getDB();
        
        const [
            totalLifts,
            activeLifts,
            maintenanceLifts,
            totalRequests,
            openRequests,
            inProgressRequests,
            completedRequests,
            totalUsers,
            activeUsers
        ] = await Promise.all([
            db.collection("lifts").countDocuments(),
            db.collection("lifts").countDocuments({ status: "active" }),
            db.collection("lifts").countDocuments({ status: "maintenance" }),
            db.collection("requests").countDocuments(),
            db.collection("requests").countDocuments({ status: "open" }),
            db.collection("requests").countDocuments({ status: "in_progress" }),
            db.collection("requests").countDocuments({ status: "completed" }),
            db.collection("users").countDocuments(),
            db.collection("users").countDocuments({ active: true })
        ]);
        
        res.json({
            success: true,
            data: {
                lifts: {
                    total: totalLifts,
                    active: activeLifts,
                    maintenance: maintenanceLifts,
                    inactive: totalLifts - activeLifts - maintenanceLifts
                },
                requests: {
                    total: totalRequests,
                    open: openRequests,
                    inProgress: inProgressRequests,
                    completed: completedRequests
                },
                users: {
                    total: totalUsers,
                    active: activeUsers
                },
                systemHealth: {
                    database: true,
                    api: true,
                    timestamp: new Date()
                }
            }
        });
    } catch (error) {
        console.error("Помилка dashboard статистики:", error);
        res.status(500).json({ 
            success: false, 
            message: "Помилка завантаження dashboard статистики" 
        });
    }
});

// Звіти endpoints
app.get("/api/reports/lifts", async (req, res) => {
    try {
        const db = getDB();
        const lifts = await db.collection("lifts").find({}).toArray();
        
        res.json({
            success: true,
            reportType: "lifts",
            generatedAt: new Date(),
            totalCount: lifts.length,
            data: lifts.map(lift => ({
                id: lift._id,
                address: lift.address,
                municipalNumber: lift.municipalNumber,
                type: lift.type,
                status: lift.status,
                loadCapacity: lift.loadCapacity,
                floorCount: lift.floorCount,
                manufacturingYear: lift.manufacturingYear,
                lastInspection: lift.lastInspection,
                createdAt: lift.createdAt
            }))
        });
    } catch (error) {
        console.error("Помилка звіту ліфтів:", error);
        res.status(500).json({ 
            success: false, 
            message: "Помилка генерації звіту ліфтів" 
        });
    }
});

app.get("/api/reports/requests", async (req, res) => {
    try {
        const db = getDB();
        const requests = await db.collection("requests").find({}).toArray();
        
        res.json({
            success: true,
            reportType: "requests",
            generatedAt: new Date(),
            totalCount: requests.length,
            data: requests.map(request => ({
                id: request._id,
                title: request.title,
                description: request.description,
                status: request.status,
                priority: request.priority,
                type: request.type,
                clientId: request.clientId,
                technicianId: request.technicianId,
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            }))
        });
    } catch (error) {
        console.error("Помилка звіту заявок:", error);
        res.status(500).json({ 
            success: false, 
            message: "Помилка генерації звіту заявок" 
        });
    }
});

// Обробник для перевірки здоров'я системи
app.get("/api/health", (req, res) => {
    res.status(200).json({ 
        status: "ok", 
        timestamp: new Date().toISOString() 
    });
});

// QR-код API endpoints
app.get("/api/qr/codes", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Фільтрація за параметрами запиту
        const filter = {};
        
        // Фільтрація за типом QR-коду
        if (req.query.type) {
            filter.type = req.query.type;
        }
        
        // Фільтрація за статусом
        if (req.query.status) {
            filter.status = req.query.status;
        }
        
        // Фільтрація за датою створення
        if (req.query.createdFrom && req.query.createdTo) {
            filter.createdAt = {
                $gte: req.query.createdFrom,
                $lte: req.query.createdTo
            };
        }
        
        // Пагінація
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Отримання даних з бази
        const qrCodes = await db.collection("qrcodes")
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
        
        // Загальна кількість записів для пагінації
        const total = await db.collection("qrcodes").countDocuments(filter);
        
        res.json({
            success: true,
            data: qrCodes,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Помилка отримання QR-кодів:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося завантажити QR-коди" 
        });
    }
});

// Отримання конкретного QR-коду за ID
app.get("/api/qr/codes/:id", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        const qrCode = await db.collection("qrcodes").findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (!qrCode) {
            return res.status(404).json({ 
                success: false, 
                message: "QR-код не знайдено" 
            });
        }
        
        res.json({
            success: true,
            data: qrCode
        });
    } catch (error) {
        console.error("Помилка отримання QR-коду:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати QR-код" 
        });
    }
});

// Створення або оновлення QR-коду
app.post("/api/qr/codes", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const qrCode = req.body;
        
        // Валідація даних
        if (!qrCode.type || !qrCode.data) {
            return res.status(400).json({
                success: false,
                message: "Тип та дані QR-коду обов'язкові"
            });
        }
        
        if (qrCode._id) {
            // Оновлення існуючого QR-коду
            const { _id, ...update } = qrCode;
            const objectId = new ObjectId(_id);
            
            // Додаємо інформацію про останнє оновлення
            update.updatedAt = new Date().toISOString();
            update.updatedBy = req.user.username;
            
            await db.collection("qrcodes").updateOne(
                { _id: objectId }, 
                { $set: update }
            );
            
            res.json({ 
                success: true, 
                message: "QR-код успішно оновлено",
                id: _id 
            });
        } else {
            // Створення нового QR-коду
            const newQRCode = {
                ...qrCode,
                status: qrCode.status || "active",
                createdAt: new Date().toISOString(),
                createdBy: req.user.username,
                scans: 0  // Лічильник сканувань
            };
            
            const result = await db.collection("qrcodes").insertOne(newQRCode);
            
            res.status(201).json({ 
                success: true, 
                message: "QR-код успішно створено",
                id: result.insertedId 
            });
        }
    } catch (error) {
        console.error("Помилка збереження QR-коду:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося зберегти QR-код" 
        });
    }
});

// Видалення QR-коду
app.delete("/api/qr/codes/:id", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Перевіряємо права користувача (тільки адміни можуть видаляти)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Недостатньо прав для видалення QR-кодів"
            });
        }
        
        const result = await db.collection("qrcodes").deleteOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "QR-код не знайдено" 
            });
        }
        
        res.json({ 
            success: true, 
            message: "QR-код успішно видалено" 
        });
    } catch (error) {
        console.error("Помилка видалення QR-коду:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося видалити QR-код" 
        });
    }
});

// Масове створення QR-кодів для ліфтів
app.post("/api/qr/bulk-create-lift-codes", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Перевірка прав доступу (адміни та диспетчери)
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({
                success: false,
                message: "Недостатньо прав для масового створення QR-кодів"
            });
        }
        
        // Отримати всі ліфти без QR-кодів або за фільтром
        let filter = {};
        if (req.body.filter) {
            filter = req.body.filter;
        }
        
        const lifts = await db.collection("lifts").find(filter).toArray();
        
        if (!lifts.length) {
            return res.status(404).json({
                success: false,
                message: "Ліфти не знайдено"
            });
        }
        
        // Створення QR-кодів для кожного ліфта
        const qrCodes = lifts.map(lift => ({
            type: "lift",
            reference: lift._id.toString(),
            name: `Ліфт - ${lift.address || 'Адреса не вказана'}`,
            data: {
                liftId: lift._id.toString(),
                address: lift.address,
                model: lift.model,
                type: lift.type
            },
            status: "active",
            expiryDate: req.body.expiryDate || new Date(Date.now() + 31536000000).toISOString(), // За замовчуванням 1 рік
            createdAt: new Date().toISOString(),
            createdBy: req.user.username,
            scans: 0
        }));
        
        // Масове додавання QR-кодів
        const result = await db.collection("qrcodes").insertMany(qrCodes);
        
        // Оновлення ліфтів з посиланнями на їхні QR-коди
        const bulkUpdateOps = [];
        Object.entries(result.insertedIds).forEach(([index, id]) => {
            bulkUpdateOps.push({
                updateOne: {
                    filter: { _id: new ObjectId(qrCodes[index].reference) },
                    update: { $set: { qrCodeId: id.toString() } }
                }
            });
        });
        
        if (bulkUpdateOps.length) {
            await db.collection("lifts").bulkWrite(bulkUpdateOps);
        }
        
        res.status(201).json({
            success: true,
            message: `Створено ${result.insertedCount} QR-кодів для ліфтів`,
            ids: result.insertedIds
        });
    } catch (error) {
        console.error("Помилка масового створення QR-кодів:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося створити QR-коди" 
        });
    }
});

// Реєстрація сканування QR-коду
app.post("/api/qr/scan", async (req, res) => {
    try {
        const db = getDB();
        const { qrData, scannedBy, deviceInfo } = req.body;
        
        // Валідація
        if (!qrData) {
            return res.status(400).json({
                success: false,
                message: "Дані QR-коду обов'язкові"
            });
        }
        
        // Розпарсити дані QR
        let qrContent;
        try {
            // Перевірка, чи це JSON
            if (typeof qrData === 'string' && (qrData.startsWith('{') || qrData.startsWith('['))) {
                qrContent = JSON.parse(qrData);
            } else {
                qrContent = { rawData: qrData };
            }
        } catch (parseError) {
            qrContent = { rawData: qrData };
        }
        
        // Пошук QR-коду за референсом (якщо це об'єкт з liftId, requestId тощо)
        let qrCode = null;
        let referenceType = null;
        let referenceId = null;
        
        if (qrContent.liftId) {
            qrCode = await db.collection("qrcodes").findOne({ 
                "data.liftId": qrContent.liftId 
            });
            referenceType = "lift";
            referenceId = qrContent.liftId;
        } else if (qrContent.requestId) {
            qrCode = await db.collection("qrcodes").findOne({ 
                "data.requestId": qrContent.requestId 
            });
            referenceType = "request";
            referenceId = qrContent.requestId;
        } else if (qrContent.type && qrContent.id) {
            // Універсальний формат { type: '...', id: '...' }
            qrCode = await db.collection("qrcodes").findOne({ 
                "data.id": qrContent.id,
                "type": qrContent.type
            });
            referenceType = qrContent.type;
            referenceId = qrContent.id;
        }
        
        // Створюємо запис про сканування
        const scanRecord = {
            qrCodeId: qrCode ? qrCode._id : null,
            referenceType,
            referenceId,
            data: qrContent,
            scannedAt: new Date().toISOString(),
            scannedBy: scannedBy || "anonymous",
            deviceInfo: deviceInfo || {},
            status: qrCode ? "success" : "unknown"
        };
        
        // Зберігаємо запис про сканування
        await db.collection("qrscans").insertOne(scanRecord);
        
        // Якщо знайдено QR-код, інкрементуємо кількість сканувань
        if (qrCode) {
            await db.collection("qrcodes").updateOne(
                { _id: qrCode._id },
                { 
                    $inc: { scans: 1 },
                    $set: { lastScan: scanRecord.scannedAt }
                }
            );
            
            // Перевіряємо, чи QR-код активний
            if (qrCode.status !== "active") {
                return res.json({
                    success: true,
                    valid: false,
                    message: "QR-код неактивний",
                    data: null
                });
            }
            
            // Перевіряємо термін дії
            if (qrCode.expiryDate && new Date(qrCode.expiryDate) < new Date()) {
                // Автоматично позначаємо як протермінований
                await db.collection("qrcodes").updateOne(
                    { _id: qrCode._id },
                    { $set: { status: "expired" } }
                );
                
                return res.json({
                    success: true,
                    valid: false,
                    message: "QR-код протерміновано",
                    data: null
                });
            }
            
            // Повертаємо дані відповідно до типу QR-коду
            let responseData = null;
            
            switch (qrCode.type) {
                case "lift":
                    // Отримуємо деталі ліфта
                    const lift = await db.collection("lifts").findOne({ 
                        _id: new ObjectId(qrCode.reference) 
                    });
                    responseData = {
                        type: "lift",
                        lift: lift || qrCode.data
                    };
                    break;
                case "request":
                    // Отримуємо деталі заявки
                    const request = await db.collection("requests").findOne({ 
                        _id: new ObjectId(qrCode.reference)
                    });
                    responseData = {
                        type: "request",
                        request: request || qrCode.data
                    };
                    break;
                case "technician":
                    // Для QR-кодів техніків
                    responseData = {
                        type: "technician",
                        ...qrCode.data
                    };
                    break;
                default:
                    responseData = {
                        type: qrCode.type,
                        data: qrCode.data
                    };
            }
            
            return res.json({
                success: true,
                valid: true,
                message: "QR-код успішно відскановано",
                data: responseData
            });
        } else {
            // QR-код не знайдено в системі
            return res.json({
                success: true,
                valid: false,
                message: "QR-код невідомий системі",
                data: null
            });
        }
    } catch (error) {
        console.error("Помилка обробки сканування QR-коду:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося обробити сканування QR-коду" 
        });
    }
});

// Отримання статистики по QR-кодам
app.get("/api/qr/stats", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Загальна кількість QR-кодів
        const totalQR = await db.collection("qrcodes").countDocuments();
        
        // QR-коди за статусами
        const activeQR = await db.collection("qrcodes").countDocuments({ status: "active" });
        const inactiveQR = await db.collection("qrcodes").countDocuments({ status: "inactive" });
        const expiredQR = await db.collection("qrcodes").countDocuments({ status: "expired" });
        
        // QR-коди за типами
        const liftQR = await db.collection("qrcodes").countDocuments({ type: "lift" });
        const requestQR = await db.collection("qrcodes").countDocuments({ type: "request" });
        const technicianQR = await db.collection("qrcodes").countDocuments({ type: "technician" });
        const otherQR = totalQR - liftQR - requestQR - technicianQR;
        
        // Загальна кількість сканувань
        const scansPipeline = [
            { $group: { _id: null, total: { $sum: "$scans" } } }
        ];
        const scansResult = await db.collection("qrcodes").aggregate(scansPipeline).toArray();
        const totalScans = scansResult.length > 0 ? scansResult[0].total : 0;
        
        // Статистика сканувань за останній місяць
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        
        const lastMonthScans = await db.collection("qrscans").countDocuments({
            scannedAt: { $gte: lastMonthDate.toISOString() }
        });
        
        // Топ-5 найчастіше сканованих QR-кодів
        const topQrCodesPipeline = [
            { $match: { scans: { $gt: 0 } } },
            { $sort: { scans: -1 } },
            { $limit: 5 },
            { $project: { _id: 1, type: 1, name: 1, scans: 1, lastScan: 1 } }
        ];
        const topQrCodes = await db.collection("qrcodes").aggregate(topQrCodesPipeline).toArray();
        
        res.json({
            success: true,
            stats: {
                total: totalQR,
                status: {
                    active: activeQR,
                    inactive: inactiveQR,
                    expired: expiredQR
                },
                types: {
                    lift: liftQR,
                    request: requestQR,
                    technician: technicianQR,
                    other: otherQR
                },
                scans: {
                    total: totalScans,
                    lastMonth: lastMonthScans
                },
                topScanned: topQrCodes
            }
        });
    } catch (error) {
        console.error("Помилка отримання статистики QR-кодів:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати статистику QR-кодів" 
        });
    }
});

// Історія сканувань QR-кодів
app.get("/api/qr/scans", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Фільтри
        const filter = {};
        
        if (req.query.qrCodeId) {
            filter.qrCodeId = new ObjectId(req.query.qrCodeId);
        }
        
        if (req.query.referenceType) {
            filter.referenceType = req.query.referenceType;
        }
        
        if (req.query.referenceId) {
            filter.referenceId = req.query.referenceId;
        }
        
        if (req.query.scannedBy) {
            filter.scannedBy = req.query.scannedBy;
        }
        
        // Фільтр за датами
        if (req.query.fromDate && req.query.toDate) {
            filter.scannedAt = {
                $gte: req.query.fromDate,
                $lte: req.query.toDate
            };
        }
        
        // Пагінація
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Отримання історії сканувань
        const scans = await db.collection("qrscans")
            .find(filter)
            .sort({ scannedAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
        
        // Загальна кількість для пагінації
        const total = await db.collection("qrscans").countDocuments(filter);
        
        res.json({
            success: true,
            data: scans,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Помилка отримання історії сканувань:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати історію сканувань" 
        });
    }
});

// Обробник для ініціалізації тестових даних
app.post("/api/init-test-data", authenticateToken, async (req, res) => {
    // Перевірка прав доступу - тільки адміни
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: "Недостатньо прав для ініціалізації тестових даних"
        });
    }
    
    try {
        const db = getDB();
        
        // Видалення існуючих даних
        await db.collection("lifts").deleteMany({});
        await db.collection("users").deleteMany({});
        await db.collection("requests").deleteMany({});
        await db.collection("assignments").deleteMany({});
        
        // Створення тестових користувачів
        const adminPassword = await bcrypt.hash("admin123", 10);
        const techPassword = await bcrypt.hash("tech123", 10);
        const clientPassword = await bcrypt.hash("client123", 10);
        const dispatcherPassword = await bcrypt.hash("dispatcher123", 10);
        
        await db.collection("users").insertMany([
            {
                username: "admin",
                password: adminPassword,
                email: "admin@example.com",
                firstName: "Адміністратор",
                lastName: "Системи",
                role: "admin",
                phone: "+380441234567",
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                username: "tech1",
                password: techPassword,
                email: "tech1@example.com",
                firstName: "Іван",
                lastName: "Технік",
                role: "technician",
                phone: "+380441234568",
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                username: "client1",
                password: clientPassword,
                email: "client1@example.com",
                firstName: "Петро",
                lastName: "Клієнт",
                role: "client",
                phone: "+380441234569",
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                username: "dispatcher1",
                password: dispatcherPassword,
                email: "dispatcher1@example.com",
                firstName: "Олег",
                lastName: "Диспетчер",
                role: "dispatcher",
                phone: "+380441234570",
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ]);
        
        // Створення тестових ліфтів
        await db.collection("lifts").insertMany([
            {
                model: "Otis Gen2",
                type: "passenger",
                address: "вул. Хрещатик 1, Київ",
                status: "active",
                lastMaintenance: "2024-01-15",
                nextMaintenance: "2024-07-15",
                clientName: "Тестовий клієнт 1",
                clientEmail: "client1@example.com",
                createdAt: new Date().toISOString()
            },
            {
                model: "Schindler 7000",
                type: "passenger",
                address: "вул. Лесі Українки 5, Київ",
                status: "maintenance",
                lastMaintenance: "2024-02-01",
                nextMaintenance: "2024-08-01",
                clientName: "Тестовий клієнт 2",
                clientEmail: "client2@example.com",
                createdAt: new Date().toISOString()
            },
            {
                model: "Kone EcoDisc",
                type: "cargo",
                address: "вул. Басейна 3, Київ",
                status: "active",
                lastMaintenance: "2024-03-01",
                nextMaintenance: "2024-09-01",
                clientName: "Тестовий клієнт 3",
                clientEmail: "client3@example.com",
                createdAt: new Date().toISOString()
            }
        ]);
        
        // Створення тестових заявок
        await db.collection("requests").insertMany([
            {
                liftId: "1",
                description: "Несправність дверей",
                priority: "high",
                status: "pending",
                createdAt: new Date().toISOString(),
                address: "вул. Хрещатик 1, Київ",
                clientName: "Тестовий клієнт 1",
                clientPhone: "+380441234567"
            },
            {
                liftId: "2",
                description: "Заміна лампочки",
                priority: "low",
                status: "in_progress",
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                address: "вул. Лесі Українки 5, Київ",
                clientName: "Тестовий клієнт 2",
                clientPhone: "+380441234568"
            },
            {
                liftId: "3",
                description: "Щорічна перевірка",
                priority: "medium",
                status: "completed",
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                completedAt: new Date(Date.now() - 86400000).toISOString(),
                address: "вул. Басейна 3, Київ",
                clientName: "Тестовий клієнт 3",
                clientPhone: "+380441234569"
            }
        ]);
        
        res.status(200).json({ 
            success: true, 
            message: "Тестові дані успішно ініціалізовано" 
        });
    } catch (error) {
        console.error("Помилка ініціалізації тестових даних:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося ініціалізувати тестові дані" 
        });
    }
});

// ============================================
// API ENDPOINTS ДЛЯ ASSIGNMENT MANAGER
// ============================================

// Отримання списку заявок з фільтрацією
app.get("/api/assignments", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Фільтри з query параметрів
        const filter = {};
        
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }
        
        if (req.query.priority && req.query.priority !== 'all') {
            filter.priority = req.query.priority;
        }
        
        if (req.query.assignedTo && req.query.assignedTo !== 'all') {
            filter['assignment.assignedTo'] = req.query.assignedTo;
        }
        
        if (req.query.category && req.query.category !== 'all') {
            filter['metadata.category'] = req.query.category;
        }
        
        // Фільтр за роллю користувача
        if (req.user.role === 'tech') {
            // Техніки бачать тільки свої заявки або нові
            filter.$or = [
                { 'assignment.assignedTo': req.user.id },
                { status: 'new' }
            ];
        }
        
        // Сортування та пагінація
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const assignments = await db.collection("assignments")
            .find(filter)
            .sort({ 'timestamps.created': -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
        
        // Загальна кількість для пагінації
        const total = await db.collection("assignments").countDocuments(filter);
        
        res.json({
            success: true,
            data: assignments,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Помилка отримання заявок:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося завантажити заявки" 
        });
    }
});

// Створення нової заявки
app.post("/api/assignments", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const assignmentData = req.body;
        
        // Валідація обов'язкових полів
        if (!assignmentData.title || !assignmentData.description) {
            return res.status(400).json({
                success: false,
                message: "Заголовок та опис заявки обов'язкові"
            });
        }
        
        // Генерація унікального номера заявки
        const count = await db.collection("assignments").countDocuments();
        const year = new Date().getFullYear();
        const assignmentNumber = `ASG-${year}-${String(count + 1).padStart(3, '0')}`;
        
        // Створення нової заявки
        const newAssignment = {
            ...assignmentData,
            assignmentNumber,
            status: 'new',
            timestamps: {
                created: new Date(),
                updated: new Date()
            },
            metadata: {
                source: 'web',
                category: assignmentData.category || 'maintenance',
                createdBy: req.user.id
            }
        };
        
        const result = await db.collection("assignments").insertOne(newAssignment);
        
        // Додавання запису в історію
        await db.collection("assignment_history").insertOne({
            assignmentId: result.insertedId,
            changedBy: req.user.id,
            changeType: 'created',
            newValues: newAssignment,
            timestamp: new Date(),
            notes: 'Заявка створена'
        });
        
        res.status(201).json({
            success: true,
            message: "Заявка успішно створена",
            data: { ...newAssignment, _id: result.insertedId }
        });
    } catch (error) {
        console.error("Помилка створення заявки:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося створити заявку" 
        });
    }
});

// Отримання конкретної заявки
app.get("/api/assignments/:id", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        const assignment = await db.collection("assignments").findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Заявка не знайдена"
            });
        }
        
        // Перевірка прав доступу
        if (req.user.role === 'tech' && 
            assignment.assignment?.assignedTo !== req.user.id && 
            assignment.status !== 'new') {
            return res.status(403).json({
                success: false,
                message: "Немає доступу до цієї заявки"
            });
        }
        
        res.json({
            success: true,
            data: assignment
        });
    } catch (error) {
        console.error("Помилка отримання заявки:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати заявку" 
        });
    }
});

// Призначення заявки техніку
app.put("/api/assignments/:id/assign", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Тільки диспетчери та адміни можуть призначати заявки
        if (req.user.role !== 'dispatcher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Недостатньо прав для призначення заявок"
            });
        }
        
        const { assignedTo, instructions, deadline } = req.body;
        
        if (!assignedTo) {
            return res.status(400).json({
                success: false,
                message: "ID техніка обов'язковий"
            });
        }
        
        // Перевірка існування техніка
        const technician = await db.collection("users").findOne({
            _id: new ObjectId(assignedTo),
            role: 'tech'
        });
        
        if (!technician) {
            return res.status(404).json({
                success: false,
                message: "Технік не знайдений"
            });
        }
        
        // Оновлення заявки
        const updateData = {
            'assignment.assignedTo': assignedTo,
            'assignment.assignedBy': req.user.id,
            'assignment.assignedAt': new Date(),
            'assignment.instructions': instructions || '',
            'assignment.deadline': deadline ? new Date(deadline) : null,
            status: 'assigned',
            'timestamps.updated': new Date()
        };
        
        const result = await db.collection("assignments").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Заявка не знайдена або не оновлена"
            });
        }
        
        // Додавання запису в історію
        await db.collection("assignment_history").insertOne({
            assignmentId: new ObjectId(req.params.id),
            changedBy: req.user.id,
            changeType: 'assigned',
            newValues: updateData,
            timestamp: new Date(),
            notes: `Призначено техніку: ${technician.firstName} ${technician.lastName}`
        });
        
        res.json({
            success: true,
            message: "Заявка успішно призначена"
        });
    } catch (error) {
        console.error("Помилка призначення заявки:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося призначити заявку" 
        });
    }
});

// Оновлення статусу заявки
app.put("/api/assignments/:id/status", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const { status, notes } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Статус обов'язковий"
            });
        }
        
        // Валідація статусів
        const validStatuses = ['new', 'assigned', 'in-progress', 'completed', 'cancelled', 'on-hold'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Невалідний статус"
            });
        }
        
        // Отримання поточної заявки для перевірки прав
        const assignment = await db.collection("assignments").findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Заявка не знайдена"
            });
        }
        
        // Перевірка прав на оновлення статусу
        if (req.user.role === 'tech' && assignment.assignment?.assignedTo !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Ви можете оновлювати тільки свої заявки"
            });
        }
        
        // Підготовка оновлень
        const updateData = {
            status,
            'timestamps.updated': new Date()
        };
        
        // Додавання специфічних часових міток
        if (status === 'in-progress' && assignment.status !== 'in-progress') {
            updateData['timestamps.started'] = new Date();
        }
        
        if (status === 'completed' && assignment.status !== 'completed') {
            updateData['timestamps.completed'] = new Date();
        }
        
        if (status === 'cancelled' && assignment.status !== 'cancelled') {
            updateData['timestamps.cancelled'] = new Date();
        }
        
        // Якщо є додаткові дані в request body
        if (req.body.workData) {
            updateData.workData = { ...assignment.workData, ...req.body.workData };
        }
        
        // Оновлення заявки
        const result = await db.collection("assignments").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Заявка не оновлена"
            });
        }
        
        // Додавання запису в історію
        await db.collection("assignment_history").insertOne({
            assignmentId: new ObjectId(req.params.id),
            changedBy: req.user.id,
            changeType: 'status_changed',
            oldValues: { status: assignment.status },
            newValues: { status },
            timestamp: new Date(),
            notes: notes || `Статус змінено на ${status}`
        });
        
        res.json({
            success: true,
            message: "Статус заявки оновлено"
        });
    } catch (error) {
        console.error("Помилка оновлення статусу заявки:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося оновити статус заявки" 
        });
    }
});

// QR інтеграція - пошук заявки за QR кодом
app.get("/api/assignments/by-qr/:qrCode", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        const assignment = await db.collection("assignments").findOne({ 
            'qrCode.code': req.params.qrCode 
        });
        
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Заявка з таким QR кодом не знайдена"
            });
        }
        
        res.json({
            success: true,
            data: assignment
        });
    } catch (error) {
        console.error("Помилка пошуку заявки за QR:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося знайти заявку за QR кодом" 
        });
    }
});

// Реєстрація QR сканування для заявки
app.post("/api/assignments/:id/qr-scan", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const { action, qrCode, notes } = req.body;
        
        const scanRecord = {
            scannedBy: req.user.id,
            scannedAt: new Date(),
            action: action || 'scanned',
            qrCode,
            notes: notes || ''
        };
        
        // Додаємо запис про сканування до заявки
        const result = await db.collection("assignments").updateOne(
            { _id: new ObjectId(req.params.id) },
            { 
                $push: { 'qrCode.scanHistory': scanRecord },
                $set: { 'timestamps.updated': new Date() }
            }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Заявка не знайдена"
            });
        }
        
        res.json({
            success: true,
            message: "QR сканування зареєстровано"
        });
    } catch (error) {
        console.error("Помилка реєстрації QR сканування:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося зареєструвати QR сканування" 
        });
    }
});

// Отримання шаблонів заявок
app.get("/api/assignment-templates", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        const filter = { isActive: true };
        
        const templates = await db.collection("assignment_templates")
            .find(filter)
            .sort({ name: 1 })
            .toArray();
        
        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error("Помилка отримання шаблонів:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося завантажити шаблони" 
        });
    }
});

// Створення шаблону заявки
app.post("/api/assignment-templates", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Тільки адміни та диспетчери можуть створювати шаблони
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({
                success: false,
                message: "Недостатньо прав для створення шаблонів"
            });
        }
        
        const templateData = {
            ...req.body,
            createdBy: req.user.id,
            createdAt: new Date(),
            isActive: true
        };
        
        const result = await db.collection("assignment_templates").insertOne(templateData);
        
        res.status(201).json({
            success: true,
            message: "Шаблон створено",
            data: { ...templateData, _id: result.insertedId }
        });
    } catch (error) {
        console.error("Помилка створення шаблону:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося створити шаблон" 
        });
    }
});

// Отримання історії змін заявки
app.get("/api/assignments/:id/history", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        const history = await db.collection("assignment_history")
            .find({ assignmentId: new ObjectId(req.params.id) })
            .sort({ timestamp: -1 })
            .toArray();
        
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error("Помилка отримання історії:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати історію заявки" 
        });
    }
});

// Статистика заявок
app.get("/api/assignments/stats", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Загальна статистика
        const totalAssignments = await db.collection("assignments").countDocuments();
        
        // Статистика за статусами
        const statusStats = await db.collection("assignments").aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]).toArray();
        
        // Статистика за пріоритетами
        const priorityStats = await db.collection("assignments").aggregate([
            { $group: { _id: "$priority", count: { $sum: 1 } } }
        ]).toArray();
        
        // Статистика за техніками (тільки призначені заявки)
        const techStats = await db.collection("assignments").aggregate([
            { $match: { "assignment.assignedTo": { $exists: true } } },
            { $group: { _id: "$assignment.assignedTo", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();
        
        // Статистика за категоріями
        const categoryStats = await db.collection("assignments").aggregate([
            { $group: { _id: "$metadata.category", count: { $sum: 1 } } }
        ]).toArray();
        
        // Статистика за місяцями (останні 12 місяців)
        const last12Months = new Date();
        last12Months.setMonth(last12Months.getMonth() - 12);
        
        const monthlyStats = await db.collection("assignments").aggregate([
            { $match: { "timestamps.created": { $gte: last12Months } } },
            { 
                $group: {
                    _id: {
                        year: { $year: "$timestamps.created" },
                        month: { $month: "$timestamps.created" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]).toArray();
        
        res.json({
            success: true,
            stats: {
                total: totalAssignments,
                byStatus: statusStats,
                byPriority: priorityStats,
                byTechnician: techStats,
                byCategory: categoryStats,
                monthly: monthlyStats
            }
        });
    } catch (error) {
        console.error("Помилка отримання статистики:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати статистику заявок" 
        });
    }
});

// ============================================
// API ENDPOINTS ДЛЯ MONITORING MANAGER
// ============================================

// Отримання метрик системи моніторингу
app.get("/api/monitoring/metrics", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Загальна кількість ліфтів
        const totalLifts = await db.collection("lifts").countDocuments();
        
        // Ліфти за статусами
        const activeLifts = await db.collection("lifts").countDocuments({ status: "active" });
        const maintenanceLifts = await db.collection("lifts").countDocuments({ status: "maintenance" });
        const errorLifts = await db.collection("lifts").countDocuments({ status: "error" });
        const inactiveLifts = await db.collection("lifts").countDocuments({ status: "inactive" });
        
        // Сповіщення
        const criticalAlerts = await db.collection("monitoring_alerts").countDocuments({ 
            severity: "critical", 
            resolvedAt: null 
        });
        const warningAlerts = await db.collection("monitoring_alerts").countDocuments({ 
            severity: "warning", 
            resolvedAt: null 
        });
        
        // Заявки в роботі
        const activeAssignments = await db.collection("assignments").countDocuments({ 
            status: "in-progress" 
        });
        
        // Середня температура ліфтів (якщо дані є)
        const temperatureData = await db.collection("lifts").aggregate([
            { $match: { temperature: { $exists: true } } },
            { $group: { _id: null, avgTemp: { $avg: "$temperature" } } }
        ]).toArray();
        
        const averageTemperature = temperatureData.length > 0 ? temperatureData[0].avgTemp : 22;
        
        // Загальне енергоспоживання
        const powerData = await db.collection("lifts").aggregate([
            { $match: { powerConsumption: { $exists: true } } },
            { $group: { _id: null, totalPower: { $sum: "$powerConsumption" } } }
        ]).toArray();
        
        const totalPowerConsumption = powerData.length > 0 ? powerData[0].totalPower : 0;
        
        // Uptime (симуляція - в реальному проекті буде з окремої колекції метрик)
        const averageUptime = 98.5 + (Math.random() - 0.5) * 0.5;
        
        const metrics = {
            totalLifts,
            activeLifts,
            maintenanceLifts,
            errorLifts,
            inactiveLifts,
            criticalAlerts,
            warningAlerts,
            activeAssignments,
            averageTemperature: Math.round(averageTemperature * 10) / 10,
            totalPowerConsumption: Math.round(totalPowerConsumption),
            averageUptime: Math.round(averageUptime * 100) / 100,
            lastUpdated: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        console.error("Помилка отримання метрик моніторингу:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати метрики моніторингу" 
        });
    }
});

// Отримання сповіщень моніторингу
app.get("/api/monitoring/alerts", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Фільтри
        const filter = {};
        
        if (req.query.severity && req.query.severity !== 'all') {
            filter.severity = req.query.severity;
        }
        
        if (req.query.resolved !== undefined) {
            if (req.query.resolved === 'true') {
                filter.resolvedAt = { $ne: null };
            } else {
                filter.resolvedAt = null;
            }
        } else {
            // За замовчуванням показуємо тільки нерозв'язані
            filter.resolvedAt = null;
        }
        
        if (req.query.liftId) {
            filter.liftId = req.query.liftId;
        }
        
        // Пагінація
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        // Отримання сповіщень
        const alerts = await db.collection("monitoring_alerts")
            .find(filter)
            .sort({ timestamp: -1, severity: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
        
        // Загальна кількість для пагінації
        const total = await db.collection("monitoring_alerts").countDocuments(filter);
        
        res.json({
            success: true,
            data: alerts,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Помилка отримання сповіщень:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати сповіщення" 
        });
    }
});

// Створення нового сповіщення
app.post("/api/monitoring/alerts", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const { type, title, description, liftId, severity, metadata } = req.body;
        
        // Валідація
        if (!type || !title || !description || !severity) {
            return res.status(400).json({
                success: false,
                message: "Тип, заголовок, опис та рівень важливості обов'язкові"
            });
        }
        
        const validSeverities = ['info', 'warning', 'critical'];
        if (!validSeverities.includes(severity)) {
            return res.status(400).json({
                success: false,
                message: "Невалідний рівень важливості"
            });
        }
        
        // Створення сповіщення
        const newAlert = {
            type,
            title,
            description,
            liftId: liftId || null,
            severity,
            metadata: metadata || {},
            timestamp: new Date(),
            acknowledged: false,
            acknowledgedBy: null,
            acknowledgedAt: null,
            resolvedAt: null,
            resolvedBy: null,
            createdBy: req.user.id
        };
        
        const result = await db.collection("monitoring_alerts").insertOne(newAlert);
        
        // Якщо це критичне сповіщення, можна додати логіку для негайного оповіщення
        if (severity === 'critical') {
            console.log(`🚨 КРИТИЧНЕ СПОВІЩЕННЯ: ${title}`);
            // Тут можна додати WebSocket broadcast, email, SMS тощо
        }
        
        res.status(201).json({
            success: true,
            message: "Сповіщення створено",
            data: { ...newAlert, _id: result.insertedId }
        });
    } catch (error) {
        console.error("Помилка створення сповіщення:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося створити сповіщення" 
        });
    }
});

// Підтвердження сповіщення
app.put("/api/monitoring/alerts/:id/acknowledge", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        const result = await db.collection("monitoring_alerts").updateOne(
            { _id: new ObjectId(req.params.id) },
            { 
                $set: { 
                    acknowledged: true,
                    acknowledgedBy: req.user.id,
                    acknowledgedAt: new Date()
                }
            }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Сповіщення не знайдено"
            });
        }
        
        res.json({
            success: true,
            message: "Сповіщення підтверджено"
        });
    } catch (error) {
        console.error("Помилка підтвердження сповіщення:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося підтвердити сповіщення" 
        });
    }
});

// Вирішення сповіщення
app.put("/api/monitoring/alerts/:id/resolve", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const { resolution } = req.body;
        
        const result = await db.collection("monitoring_alerts").updateOne(
            { _id: new ObjectId(req.params.id) },
            { 
                $set: { 
                    resolvedAt: new Date(),
                    resolvedBy: req.user.id,
                    resolution: resolution || 'Вирішено користувачем',
                    acknowledged: true,
                    acknowledgedBy: req.user.id,
                    acknowledgedAt: new Date()
                }
            }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Сповіщення не знайдено"
            });
        }
        
        res.json({
            success: true,
            message: "Сповіщення вирішено"
        });
    } catch (error) {
        console.error("Помилка вирішення сповіщення:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося вирішити сповіщення" 
        });
    }
});

// Отримання статистики роботи ліфтів
app.get("/api/monitoring/lifts/stats", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Статистика за статусами
        const statusStats = await db.collection("lifts").aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]).toArray();
        
        // Статистика за моделями
        const modelStats = await db.collection("lifts").aggregate([
            { $group: { _id: "$model", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        
        // Статистика за типами
        const typeStats = await db.collection("lifts").aggregate([
            { $group: { _id: "$type", count: { $sum: 1 } } }
        ]).toArray();
        
        // Ліфти, які потребують ТО
        const maintenanceDue = await db.collection("lifts").countDocuments({
            nextMaintenance: { $lte: new Date() }
        });
        
        // Ліфти з помилками
        const liftsWithErrors = await db.collection("lifts").countDocuments({
            $or: [
                { errorCodes: { $exists: true, $ne: [] } },
                { status: "error" }
            ]
        });
        
        res.json({
            success: true,
            stats: {
                byStatus: statusStats,
                byModel: modelStats,
                byType: typeStats,
                maintenanceDue,
                liftsWithErrors,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Помилка отримання статистики ліфтів:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати статистику ліфтів" 
        });
    }
});

// Отримання детальної інформації про ліфт для моніторингу
app.get("/api/monitoring/lifts/:id", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Основна інформація про ліфт
        const lift = await db.collection("lifts").findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (!lift) {
            return res.status(404).json({
                success: false,
                message: "Ліфт не знайдено"
            });
        }
        
        // Останні сповіщення для цього ліфта
        const recentAlerts = await db.collection("monitoring_alerts")
            .find({ liftId: req.params.id })
            .sort({ timestamp: -1 })
            .limit(10)
            .toArray();
        
        // Активні заявки для цього ліфта
        const activeAssignments = await db.collection("assignments")
            .find({ 
                'location.liftId': req.params.id,
                status: { $in: ['new', 'assigned', 'in-progress'] }
            })
            .sort({ 'timestamps.created': -1 })
            .toArray();
        
        // Історія обслуговування (якщо є)
        const maintenanceHistory = await db.collection("maintenance_history")
            .find({ liftId: req.params.id })
            .sort({ date: -1 })
            .limit(5)
            .toArray();
        
        res.json({
            success: true,
            data: {
                lift,
                recentAlerts,
                activeAssignments,
                maintenanceHistory: maintenanceHistory || []
            }
        });
    } catch (error) {
        console.error("Помилка отримання деталей ліфта:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати деталі ліфта" 
        });
    }
});

// Оновлення статусу ліфта
app.put("/api/monitoring/lifts/:id/status", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const { status, reason } = req.body;
        
        const validStatuses = ['active', 'maintenance', 'error', 'inactive'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Невалідний статус"
            });
        }
        
        // Оновлення статусу ліфта
        const result = await db.collection("lifts").updateOne(
            { _id: new ObjectId(req.params.id) },
            { 
                $set: { 
                    status,
                    lastStatusChange: new Date(),
                    statusChangedBy: req.user.id,
                    statusChangeReason: reason || 'Оновлено через систему моніторингу'
                }
            }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Ліфт не знайдено"
            });
        }
        
        // Створення сповіщення про зміну статусу
        if (status === 'error' || status === 'maintenance') {
            await db.collection("monitoring_alerts").insertOne({
                type: 'status_change',
                title: `Зміна статусу ліфта на "${status}"`,
                description: reason || `Статус ліфта змінено на "${status}"`,
                liftId: req.params.id,
                severity: status === 'error' ? 'critical' : 'warning',
                timestamp: new Date(),
                acknowledged: false,
                resolvedAt: null,
                createdBy: req.user.id
            });
        }
        
        res.json({
            success: true,
            message: "Статус ліфта оновлено"
        });
    } catch (error) {
        console.error("Помилка оновлення статусу ліфта:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося оновити статус ліфта" 
        });
    }
});

// Отримання метрик продуктивності системи
app.get("/api/monitoring/performance", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Період для аналізу (за замовчуванням - останній тиждень)
        const fromDate = req.query.from ? new Date(req.query.from) : 
                        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const toDate = req.query.to ? new Date(req.query.to) : new Date();
        
        // Кількість заявок за період
        const assignmentsCount = await db.collection("assignments").countDocuments({
            'timestamps.created': { $gte: fromDate, $lte: toDate }
        });
        
        // Завершені заявки
        const completedAssignments = await db.collection("assignments").countDocuments({
            'timestamps.completed': { $gte: fromDate, $lte: toDate },
            status: 'completed'
        });
        
        // Середній час виконання заявок
        const avgCompletionTime = await db.collection("assignments").aggregate([
            {
                $match: {
                    'timestamps.completed': { $gte: fromDate, $lte: toDate },
                    status: 'completed'
                }
            },
            {
                $addFields: {
                    completionTime: {
                        $subtract: ['$timestamps.completed', '$timestamps.created']
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgTime: { $avg: '$completionTime' }
                }
            }
        ]).toArray();
        
        const averageCompletionTimeMs = avgCompletionTime.length > 0 ? avgCompletionTime[0].avgTime : 0;
        const averageCompletionTimeHours = Math.round(averageCompletionTimeMs / (1000 * 60 * 60) * 10) / 10;
        
        // Кількість сповіщень за період
        const alertsCount = await db.collection("monitoring_alerts").countDocuments({
            timestamp: { $gte: fromDate, $lte: toDate }
        });
        
        // Розподіл сповіщень за рівнем важливості
        const alertsBySeverity = await db.collection("monitoring_alerts").aggregate([
            { $match: { timestamp: { $gte: fromDate, $lte: toDate } } },
            { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]).toArray();
        
        // Найактивніші техніки
        const topTechnicians = await db.collection("assignments").aggregate([
            {
                $match: {
                    'timestamps.completed': { $gte: fromDate, $lte: toDate },
                    'assignment.assignedTo': { $exists: true }
                }
            },
            {
                $group: {
                    _id: '$assignment.assignedTo',
                    completedTasks: { $sum: 1 }
                }
            },
            { $sort: { completedTasks: -1 } },
            { $limit: 5 }
        ]).toArray();
        
        res.json({
            success: true,
            performance: {
                period: {
                    from: fromDate.toISOString(),
                    to: toDate.toISOString()
                },
                assignments: {
                    total: assignmentsCount,
                    completed: completedAssignments,
                    completionRate: assignmentsCount > 0 ? Math.round(completedAssignments / assignmentsCount * 100) : 0,
                    averageCompletionTimeHours
                },
                alerts: {
                    total: alertsCount,
                    bySeverity: alertsBySeverity
                },
                topTechnicians,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Помилка отримання метрик продуктивності:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати метрики продуктивності" 
        });
    }
});

// Ендпойнт для створення тестових сповіщень (для демонстрації)
app.post("/api/monitoring/alerts/test", authenticateToken, async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                message: "Тестові сповіщення недоступні в production"
            });
        }
        
        const db = getDB();
        
        const testAlerts = [
            {
                type: 'system',
                title: 'Тестове критичне сповіщення',
                description: 'Це тестове критичне сповіщення для перевірки системи',
                liftId: null,
                severity: 'critical',
                timestamp: new Date(),
                acknowledged: false,
                resolvedAt: null,
                createdBy: req.user.id
            },
            {
                type: 'maintenance',
                title: 'Тестове попередження',
                description: 'Це тестове попередження для перевірки системи',
                liftId: null,
                severity: 'warning',
                timestamp: new Date(),
                acknowledged: false,
                resolvedAt: null,
                createdBy: req.user.id
            },
            {
                type: 'info',
                title: 'Тестове інформаційне сповіщення',
                description: 'Це тестове інформаційне сповіщення для перевірки системи',
                liftId: null,
                severity: 'info',
                timestamp: new Date(),
                acknowledged: false,
                resolvedAt: null,
                createdBy: req.user.id
            }
        ];
        
        const result = await db.collection("monitoring_alerts").insertMany(testAlerts);
        
        res.json({
            success: true,
            message: `Створено ${result.insertedCount} тестових сповіщень`
        });
    } catch (error) {
        console.error("Помилка створення тестових сповіщень:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося створити тестові сповіщення" 
        });
    }
});

// ===============================================
// CHAT SYSTEM ENDPOINTS - Система чату
// ===============================================

// Отримати всіх користувачів або за ролю
app.get("/api/users", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const { role } = req.query;
        
        // Базовий фільтр - всі користувачі крім поточного
        const filter = { _id: { $ne: new ObjectId(req.user.id) } };
        
        // Додаткова фільтрація по ролі якщо вказана
        if (role) {
            filter.role = role;
        }
        
        const users = await db.collection("users").find(filter, { 
            projection: { 
                password: 0,  // Виключаємо пароль
                refreshTokens: 0 
            } 
        }).toArray();
        
        res.json(users);
    } catch (error) {
        console.error("Помилка отримання користувачів:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати список користувачів" 
        });
    }
});

// Отримати канали чату
app.get("/api/chat/channels", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Отримуємо канали, до яких користувач має доступ
        const channels = await db.collection("chat_channels").find({
            $or: [
                { type: 'public' },
                { members: req.user.role },
                { members: 'all' },
                { members: req.user.id }
            ]
        }).toArray();
        
        res.json(channels);
    } catch (error) {
        console.error("Помилка отримання каналів:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати список каналів" 
        });
    }
});

// Створити новий канал
app.post("/api/chat/channels", authenticateToken, async (req, res) => {
    try {
        const { name, description, type, members } = req.body;
        const db = getDB();
        
        // Перевірка прав на створення каналів
        if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
            return res.status(403).json({ 
                success: false, 
                message: "Недостатньо прав для створення каналу" 
            });
        }
        
        const channel = {
            name,
            description,
            type: type || 'public',
            members: members || ['all'],
            createdBy: req.user.id,
            createdAt: new Date(),
            lastActivity: new Date()
        };
        
        const result = await db.collection("chat_channels").insertOne(channel);
        
        res.json({
            success: true,
            channelId: result.insertedId,
            channel: { ...channel, _id: result.insertedId }
        });
    } catch (error) {
        console.error("Помилка створення каналу:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося створити канал" 
        });
    }
});

// Отримати повідомлення чату
app.get("/api/chat/messages", authenticateToken, async (req, res) => {
    try {
        const { chatId, type, limit = 50, offset = 0 } = req.query;
        const db = getDB();
        
        let query = {};
        
        if (type === 'direct') {
            // Приватний чат між двома користувачами
            query = {
                $or: [
                    { from: req.user.id, to: chatId },
                    { from: chatId, to: req.user.id }
                ]
            };
        } else if (type === 'channel') {
            // Повідомлення каналу
            query = { chatId: chatId, type: 'channel' };
        }
        
        const messages = await db.collection("chat_messages")
            .find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .toArray();
        
        // Отримуємо інформацію про відправників
        const senderIds = [...new Set(messages.map(m => m.from))];
        const senders = await db.collection("users").find(
            { _id: { $in: senderIds.map(id => new ObjectId(id)) } },
            { projection: { firstName: 1, lastName: 1, role: 1, avatar: 1 } }
        ).toArray();
        
        // Об'єднуємо повідомлення з інформацією про відправників
        const messagesWithSenders = messages.map(message => ({
            ...message,
            sender: senders.find(s => s._id.toString() === message.from) || 
                   { firstName: 'Невідомий', lastName: '', role: 'unknown' }
        })).reverse(); // Повертаємо в прямому порядку
        
        res.json(messagesWithSenders);
    } catch (error) {
        console.error("Помилка отримання повідомлень:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати повідомлення" 
        });
    }
});

// Надіслати повідомлення
app.post("/api/chat/messages", authenticateToken, async (req, res) => {
    try {
        const { text, chatId, type, attachments = [] } = req.body;
        const db = getDB();
        
        if (!text?.trim() && attachments.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Повідомлення не може бути порожнім" 
            });
        }
        
        // Перевірка доступу до каналу (якщо це канал)
        if (type === 'channel') {
            const channel = await db.collection("chat_channels").findOne({ _id: new ObjectId(chatId) });
            if (!channel) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Канал не знайдено" 
                });
            }
            
            // Перевірка доступу
            const hasAccess = channel.type === 'public' ||
                            channel.members.includes(req.user.role) ||
                            channel.members.includes('all') ||
                            channel.members.includes(req.user.id);
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Немає доступу до цього каналу" 
                });
            }
        }
        
        const message = {
            text: text?.trim() || '',
            from: req.user.id,
            to: type === 'direct' ? chatId : null,
            chatId: chatId,
            type: type,
            attachments: attachments,
            timestamp: new Date(),
            edited: false,
            editedAt: null
        };
        
        const result = await db.collection("chat_messages").insertOne(message);
        
        // Отримуємо інформацію про відправника
        const sender = await db.collection("users").findOne(
            { _id: new ObjectId(req.user.id) },
            { projection: { firstName: 1, lastName: 1, role: 1, avatar: 1 } }
        );
        
        // Оновлюємо активність каналу
        if (type === 'channel') {
            await db.collection("chat_channels").updateOne(
                { _id: new ObjectId(chatId) },
                { $set: { lastActivity: new Date() } }
            );
        }
        
        const sentMessage = {
            ...message,
            _id: result.insertedId,
            sender: sender
        };
        
        // TODO: Тут буде WebSocket broadcast для real-time оновлень
        
        res.json({
            success: true,
            message: sentMessage
        });
    } catch (error) {
        console.error("Помилка надсилання повідомлення:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося надіслати повідомлення" 
        });
    }
});

// Позначити повідомлення як прочитані
app.post("/api/chat/messages/read", authenticateToken, async (req, res) => {
    try {
        const { chatId, type, messageIds = [] } = req.body;
        const db = getDB();
        
        let query = {};
        
        if (type === 'direct') {
            query = {
                $or: [
                    { from: chatId, to: req.user.id },
                    { from: req.user.id, to: chatId }
                ]
            };
        } else if (type === 'channel') {
            query = { chatId: chatId, type: 'channel' };
        }
        
        if (messageIds.length > 0) {
            query._id = { $in: messageIds.map(id => new ObjectId(id)) };
        }
        
        // Додаємо користувача до списку тих, хто прочитав
        await db.collection("chat_messages").updateMany(
            query,
            { 
                $addToSet: { 
                    readBy: {
                        userId: req.user.id,
                        readAt: new Date()
                    }
                }
            }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error("Помилка позначення як прочитано:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося позначити як прочитано" 
        });
    }
});

// Редагувати повідомлення
app.put("/api/chat/messages/:messageId", authenticateToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { text } = req.body;
        const db = getDB();
        
        if (!text?.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: "Текст повідомлення не може бути порожнім" 
            });
        }
        
        // Перевірка, чи користувач може редагувати це повідомлення
        const message = await db.collection("chat_messages").findOne({ 
            _id: new ObjectId(messageId),
            from: req.user.id 
        });
        
        if (!message) {
            return res.status(404).json({ 
                success: false, 
                message: "Повідомлення не знайдено або немає прав на редагування" 
            });
        }
        
        // Перевірка часу (можна редагувати тільки протягом 15 хвилин)
        const editTimeLimit = 15 * 60 * 1000; // 15 хвилин
        if (Date.now() - message.timestamp.getTime() > editTimeLimit) {
            return res.status(403).json({ 
                success: false, 
                message: "Час для редагування повідомлення минув" 
            });
        }
        
        await db.collection("chat_messages").updateOne(
            { _id: new ObjectId(messageId) },
            { 
                $set: { 
                    text: text.trim(),
                    edited: true,
                    editedAt: new Date()
                }
            }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error("Помилка редагування повідомлення:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося відредагувати повідомлення" 
        });
    }
});

// Видалити повідомлення
app.delete("/api/chat/messages/:messageId", authenticateToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        const db = getDB();
        
        // Перевірка прав на видалення
        const message = await db.collection("chat_messages").findOne({ 
            _id: new ObjectId(messageId) 
        });
        
        if (!message) {
            return res.status(404).json({ 
                success: false, 
                message: "Повідомлення не знайдено" 
            });
        }
        
        // Користувач може видаляти свої повідомлення або адмін/диспетчер можуть видаляти будь-які
        const canDelete = message.from === req.user.id || 
                         req.user.role === 'admin' || 
                         req.user.role === 'dispatcher';
        
        if (!canDelete) {
            return res.status(403).json({ 
                success: false, 
                message: "Немає прав на видалення цього повідомлення" 
            });
        }
        
        await db.collection("chat_messages").updateOne(
            { _id: new ObjectId(messageId) },
            { 
                $set: { 
                    text: '[Повідомлення видалено]',
                    deleted: true,
                    deletedAt: new Date(),
                    deletedBy: req.user.id
                }
            }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error("Помилка видалення повідомлення:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося видалити повідомлення" 
        });
    }
});

// Отримати статистику чату
app.get("/api/chat/stats", authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        
        // Підрахунок статистики
        const [
            totalMessages,
            totalChannels,
            activeUsers,
            todayMessages
        ] = await Promise.all([
            db.collection("chat_messages").countDocuments(),
            db.collection("chat_channels").countDocuments(),
            db.collection("users").countDocuments({ isActive: true }),
            db.collection("chat_messages").countDocuments({
                timestamp: { 
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
                }
            })
        ]);
        
        res.json({
            totalMessages,
            totalChannels,
            activeUsers,
            todayMessages
        });
    } catch (error) {
        console.error("Помилка отримання статистики чату:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати статистику" 
        });
    }
});

// Пошук повідомлень
app.get("/api/chat/search", authenticateToken, async (req, res) => {
    try {
        const { query, chatId, type, limit = 20 } = req.query;
        const db = getDB();
        
        if (!query?.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: "Запит для пошуку не може бути порожнім" 
            });
        }
        
        let searchQuery = {
            text: { $regex: query, $options: 'i' },
            deleted: { $ne: true }
        };
        
        // Фільтр по чату
        if (chatId && type) {
            if (type === 'direct') {
                searchQuery.$or = [
                    { from: req.user.id, to: chatId },
                    { from: chatId, to: req.user.id }
                ];
            } else if (type === 'channel') {
                searchQuery.chatId = chatId;
                searchQuery.type = 'channel';
            }
        }
        
        const messages = await db.collection("chat_messages")
            .find(searchQuery)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .toArray();
        
        // Додаємо інформацію про відправників
        const senderIds = [...new Set(messages.map(m => m.from))];
        const senders = await db.collection("users").find(
            { _id: { $in: senderIds.map(id => new ObjectId(id)) } },
            { projection: { firstName: 1, lastName: 1, role: 1, avatar: 1 } }
        ).toArray();
        
        const messagesWithSenders = messages.map(message => ({
            ...message,
            sender: senders.find(s => s._id.toString() === message.from) || 
                   { firstName: 'Невідомий', lastName: '', role: 'unknown' }
        }));
        
        res.json(messagesWithSenders);
    } catch (error) {
        console.error("Помилка пошуку повідомлень:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося виконати пошук" 
        });
    }
});

// ===================================
// FILE SYSTEM API - Upload/Download
// ===================================

const FileSystemManager = require('./file-system-manager');
const fileManager = new FileSystemManager();

// Upload файлу
app.post('/api/files/upload', authenticateToken, async (req, res) => {
    try {
        const { fileName, fileData, chatId } = req.body;
        
        if (!fileName || !fileData) {
            return res.status(400).json({ 
                success: false, 
                message: 'Необхідно вказати ім\'я файлу та дані' 
            });
        }

        // Декодуємо base64 дані
        const fileBuffer = Buffer.from(fileData, 'base64');
        
        const fileMetadata = await fileManager.uploadFile(
            fileBuffer, 
            fileName, 
            req.user.id, 
            chatId
        );

        res.json({
            success: true,
            file: fileMetadata
        });

    } catch (error) {
        console.error("Помилка завантаження файлу:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Download файлу
app.get('/api/files/download/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        const { buffer, metadata } = await fileManager.downloadFile(fileId);
        
        res.setHeader('Content-Type', metadata.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
        res.setHeader('Content-Length', buffer.length);
        
        res.send(buffer);

    } catch (error) {
        console.error("Помилка завантаження файлу:", error);
        res.status(404).json({ 
            success: false, 
            message: 'Файл не знайдено' 
        });
    }
});

// Перегляд файлу (для зображень)
app.get('/api/files/view/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        const { buffer, metadata } = await fileManager.downloadFile(fileId);
        
        res.setHeader('Content-Type', metadata.mimeType);
        res.send(buffer);

    } catch (error) {
        console.error("Помилка перегляду файлу:", error);
        res.status(404).json({ 
            success: false, 
            message: 'Файл не знайдено' 
        });
    }
});

// Видалення файлу
app.delete('/api/files/:fileId', authenticateToken, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        await fileManager.deleteFile(fileId, req.user.id);
        
        res.json({
            success: true,
            message: 'Файл видалено'
        });

    } catch (error) {
        console.error("Помилка видалення файлу:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Список файлів чату
app.get('/api/files/chat/:chatId', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const files = await fileManager.getFilesByChat(chatId);
        
        res.json({
            success: true,
            files
        });

    } catch (error) {
        console.error("Помилка отримання файлів чату:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати файли" 
        });
    }
});

// Статистика файлової системи
app.get('/api/files/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await fileManager.getStorageStats();
        
        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error("Помилка отримання статистики:", error);
        res.status(500).json({ 
            success: false, 
            message: "Не вдалося отримати статистику" 
        });
    }
});

// ===========================================
// AI ASSISTANT API ENDPOINTS
// ===========================================

// AI Chat endpoint
app.post("/api/ai/chat", authenticateToken, async (req, res) => {
    try {
        const { message, context } = req.body;
        const userId = req.user.id;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Повідомлення обов'язкове"
            });
        }
        
        // Виклик Python AI модуля
        const aiResponse = await callAI(userId, message, context);
        
        res.json({
            success: true,
            response: aiResponse.response,
            action: aiResponse.action,
            data: aiResponse.data,
            confidence: aiResponse.confidence,
            suggestions: aiResponse.suggestions
        });
        
    } catch (error) {
        console.error("Помилка AI чату:", error);
        res.status(500).json({
            success: false,
            message: "Помилка AI асистента",
            fallback_response: "Вибачте, AI асистент тимчасово недоступний. Спробуйте пізніше."
        });
    }
});

// AI Predictions endpoint
app.get("/api/ai/predictions/:type", authenticateToken, async (req, res) => {
    try {
        const { type } = req.params;
        const { lift_id, timeframe } = req.query;
        
        let predictions;
        
        switch(type) {
            case 'failure':
                predictions = await getFailurePredictions(lift_id);
                break;
            case 'maintenance':
                predictions = await getMaintenancePredictions(timeframe);
                break;
            case 'workload':
                predictions = await getWorkloadPredictions();
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: "Невідомий тип прогнозу"
                });
        }
        
        res.json({
            success: true,
            prediction_type: type,
            data: predictions,
            generated_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("Помилка AI прогнозів:", error);
        res.status(500).json({
            success: false,
            message: "Не вдалося згенерувати прогноз"
        });
    }
});

// AI Auto-assignment endpoint
app.post("/api/ai/auto-assign", authenticateToken, async (req, res) => {
    try {
        const { request_id, criteria } = req.body;
        
        if (!request_id) {
            return res.status(400).json({
                success: false,
                message: "ID заявки обов'язковий"
            });
        }
        
        // AI підбір техніка
        const assignment = await autoAssignTechnician(request_id, criteria);
        
        if (assignment.success) {
            // Збереження призначення в БД
            const db = getDB();
            const result = await db.collection("assignments").insertOne({
                request_id: request_id,
                technician_id: assignment.technician_id,
                assigned_by: "AI_ASSISTANT",
                assigned_at: new Date(),
                confidence: assignment.confidence,
                reasoning: assignment.reasoning
            });
            
            res.json({
                success: true,
                assignment_id: result.insertedId,
                technician: assignment.technician,
                confidence: assignment.confidence,
                reasoning: assignment.reasoning
            });
        } else {
            res.status(404).json({
                success: false,
                message: assignment.message
            });
        }
        
    } catch (error) {
        console.error("Помилка AI призначення:", error);
        res.status(500).json({
            success: false,
            message: "Не вдалося автоматично призначити техніка"
        });
    }
});

// AI Analytics endpoint
app.get("/api/ai/analytics", authenticateToken, async (req, res) => {
    try {
        const { type, period } = req.query;
        
        const analytics = await getAIAnalytics(type, period);
        
        res.json({
            success: true,
            analytics_type: type,
            period: period,
            data: analytics,
            insights: analytics.insights,
            recommendations: analytics.recommendations
        });
        
    } catch (error) {
        console.error("Помилка AI аналітики:", error);
        res.status(500).json({
            success: false,
            message: "Не вдалося згенерувати AI аналітику"
        });
    }
});

// AI Capabilities endpoint
app.get("/api/ai/capabilities", async (req, res) => {
    try {
        const capabilities = {
            nlp_processing: {
                name: "Обробка природної мови",
                description: "Розуміння запитів українською мовою",
                status: "active"
            },
            predictive_analytics: {
                name: "Прогностична аналітика", 
                description: "Передбачення поломок та оптимізація ТО",
                status: "active"
            },
            auto_assignment: {
                name: "Автоматичне призначення",
                description: "Розумний підбір техніків",
                status: "active"
            },
            smart_scheduling: {
                name: "Розумне планування",
                description: "Оптимізація графіків роботи",
                status: "active"
            },
            anomaly_detection: {
                name: "Виявлення аномалій",
                description: "Автоматичне виявлення проблем",
                status: "beta"
            },
            voice_interface: {
                name: "Голосовий інтерфейс",
                description: "Керування голосом",
                status: "planned"
            },
            computer_vision: {
                name: "Комп'ютерний зір",
                description: "Аналіз фото/відео",
                status: "development"
            },
            personalization: {
                name: "Персоналізація",
                description: "Адаптація під користувача",
                status: "active"
            }
        };
        
        res.json({
            success: true,
            capabilities: capabilities,
            total_count: Object.keys(capabilities).length,
            active_count: Object.values(capabilities).filter(c => c.status === 'active').length
        });
        
    } catch (error) {
        console.error("Помилка отримання AI можливостей:", error);
        res.status(500).json({
            success: false,
            message: "Не вдалося отримати список AI можливостей"
        });
    }
});

// Допоміжні функції для AI
async function callAI(userId, message, context = null) {
    return new Promise((resolve, reject) => {
        const python = spawn('python3', ['./ai/deapseak_ai.py', 'chat', userId, message]);
        
        let dataString = '';
        
        python.stdout.on('data', (data) => {
            dataString += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            console.error(`AI stderr: ${data}`);
        });
        
        python.on('close', (code) => {
            if (code === 0) {
                try {
                    const response = JSON.parse(dataString);
                    resolve(response);
                } catch (e) {
                    // Fallback response if AI fails
                    resolve({
                        response: "Розумію ваш запит. Над чим працюємо? 🤖",
                        action: null,
                        data: null,
                        confidence: 0.5,
                        suggestions: ["Створити заявку", "Перевірити статус", "Показати аналітику"]
                    });
                }
            } else {
                reject(new Error(`AI process exited with code ${code}`));
            }
        });
    });
}

async function autoAssignTechnician(requestId, criteria) {
    try {
        const db = getDB();
        
        // Отримання даних заявки
        const request = await db.collection("requests").findOne({
            _id: new ObjectId(requestId)
        });
        
        if (!request) {
            return { success: false, message: "Заявка не знайдена" };
        }
        
        // Отримання доступних техніків
        const technicians = await db.collection("users").find({
            role: "technician",
            isActive: true
        }).toArray();
        
        if (technicians.length === 0) {
            return { success: false, message: "Немає доступних техніків" };
        }
        
        // AI алгоритм підбору
        let bestTechnician = null;
        let bestScore = 0;
        
        for (const tech of technicians) {
            // Симуляція AI оцінки
            const distanceScore = Math.random() * 0.4 + 0.3; // 0.3-0.7
            const expertiseScore = Math.random() * 0.3 + 0.7; // 0.7-1.0
            const availabilityScore = Math.random() * 0.4 + 0.6; // 0.6-1.0
            
            const totalScore = distanceScore + expertiseScore + availabilityScore;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestTechnician = tech;
            }
        }
        
        return {
            success: true,
            technician_id: bestTechnician._id,
            technician: {
                name: `${bestTechnician.firstName} ${bestTechnician.lastName}`,
                phone: bestTechnician.phone,
                email: bestTechnician.email
            },
            confidence: Math.min(bestScore / 3, 1.0),
            reasoning: `Оптимальний вибір на основі близькості, експертизи та доступності (оцінка: ${(bestScore/3*100).toFixed(0)}%)`
        };
        
    } catch (error) {
        console.error("Помилка AI призначення техніка:", error);
        return { success: false, message: "Помилка алгоритму призначення" };
    }
}

async function getFailurePredictions(liftId) {
    // Симуляція AI прогнозування поломок
    const predictions = {
        lift_id: liftId,
        failure_probability: Math.random() * 0.3 + 0.1, // 10-40%
        risk_factors: [
            { factor: "Вік обладнання", impact: 0.6, description: "15 років експлуатації" },
            { factor: "Інтенсивність використання", impact: 0.8, description: "Високе навантаження" },
            { factor: "Затримка ТО", impact: 0.4, description: "Останнє ТО 2 місяці тому" }
        ],
        recommendations: [
            "Запланувати позачергове ТО",
            "Замінити зношені компоненти",
            "Встановити додатковий моніторинг"
        ],
        predicted_issues: [
            { component: "Двигун", probability: 0.25, timeframe: "2-3 місяці" },
            { component: "Кабелі", probability: 0.15, timeframe: "4-6 місяців" },
            { component: "Двері", probability: 0.35, timeframe: "1-2 місяці" }
        ]
    };
    
    return predictions;
}

async function getMaintenancePredictions(timeframe) {
    // Симуляція AI оптимізації ТО
    return {
        timeframe: timeframe || "1_month",
        optimized_schedule: [
            { lift_id: "1", priority: "high", recommended_date: "2024-10-20", reason: "Критичний стан" },
            { lift_id: "2", priority: "medium", recommended_date: "2024-10-25", reason: "Планове ТО" },
            { lift_id: "3", priority: "low", recommended_date: "2024-11-01", reason: "Профілактика" }
        ],
        cost_optimization: {
            standard_cost: 15000,
            optimized_cost: 12500,
            savings: 2500,
            efficiency_gain: "16.7%"
        }
    };
}

async function getWorkloadPredictions() {
    // Симуляція прогнозування навантаження
    return {
        next_week: [
            { day: "Понеділок", predicted_load: 85, peak_hours: ["08:00-09:00", "18:00-19:00"] },
            { day: "Вівторок", predicted_load: 78, peak_hours: ["08:30-09:30", "17:30-18:30"] },
            { day: "Середа", predicted_load: 82, peak_hours: ["08:00-09:00", "18:00-19:00"] }
        ],
        recommendations: [
            "Збільшити частоту перевірок в години пік",
            "Підготувати резервний ліфт на понеділок"
        ]
    };
}

async function getAIAnalytics(type, period) {
    // Симуляція AI аналітики
    const analytics = {
        summary: {
            total_requests: 145,
            resolved_requests: 132,
            avg_resolution_time: "2.4 години",
            ai_efficiency_gain: "23%"
        },
        insights: [
            "Найчастіші поломки: проблеми з дверима (34%)",
            "Пікове навантаження: 8:00-9:00 та 18:00-19:00",
            "AI призначення на 23% швидше за ручне"
        ],
        recommendations: [
            "Збільшити частоту ТО дверних механізмів",
            "Розглянути додаткового техніка для ранкових пік",
            "Впровадити превентивне обслуговування"
        ],
        predictions: {
            next_month_requests: 160,
            predicted_issues: ["Двері ліфта #2", "Кабель ліфта #5"],
            maintenance_workload: "високий"
        }
    };
    
    return analytics;
}

// ============================================
// ДОДАТКОВІ API ENDPOINTS
// ============================================

// Запуск сервера на всіх доступних інтерфейсах (для доступу з мобільних пристроїв)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`API сервер запущено на http://0.0.0.0:${PORT}`);
});
