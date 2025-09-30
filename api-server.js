
const express = require("express");
const cors = require("cors");
const { connectDB, getDB, closeDB } = require("./db");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware
app.use(express.json());
app.use(cors());

// Підключення до MongoDB при запуску
connectDB().catch(err => {
    console.error("Помилка підключення до MongoDB:", err);
    process.exit(1);
});

// Middleware для аутентифікації
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Необхідна авторизація" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Недійсний токен" });
        req.user = user;
        next();
    });
};

// Endpoints для аутентифікації
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
app.get("/api/lifts", async (req, res) => {
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

app.get("/api/lifts/:id", async (req, res) => {
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

app.post("/api/lifts", async (req, res) => {
    try {
        const db = getDB();
        const lift = req.body;
        
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

app.delete("/api/lifts/:id", async (req, res) => {
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

// Обробник для перевірки здоров'я системи
app.get("/api/health", (req, res) => {
    res.status(200).json({ 
        status: "ok", 
        timestamp: new Date().toISOString() 
    });
});

// Обробник для ініціалізації тестових даних
app.post("/api/init-test-data", async (req, res) => {
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

// Запуск сервера на всіх доступних інтерфейсах (для доступу з мобільних пристроїв)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`API сервер запущено на http://0.0.0.0:${PORT}`);
});
