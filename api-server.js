// ============================================
// DEAPSEAK ПРОСТИЙ API Server - ШВИДКЕ ВИПРАВЛЕННЯ
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'deapseak-super-secret-key-2024';

console.log('🚀 Запуск DEAPSEAK API Server...');

// ===============================
// CORS та MIDDLEWARE
// ===============================

app.use(cors({
    origin: [
        'http://localhost:8080', 
        'http://127.0.0.1:8080',
        'https://redesigned-waddle-v6w5g7rvxqpxf6pwg-8080.app.github.dev',
        /https:\/\/.*\.app\.github\.dev$/,
        /https:\/\/.*-8080\.app\.github\.dev$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('✅ Middleware налаштовано');

// ===============================
// ТЕСТОВІ ДАНІ В ПАМ'ЯТІ
// ===============================

// Користувачі
const users = [
    {
        id: '1',
        username: 'admin',
        email: 'admin@deapseak.com',
        password: '$2b$12$TwdmPugCUOLoY27xElezjOkrA4hgLnRbUYuixIsmJUOzWUMWxrLGa', // admin123
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User'
    },
    {
        id: '2', 
        username: 'dispatcher1',
        email: 'dispatcher1@deapseak.com',
        password: '$2b$12$3yDVrfEYUofXT.4k5lDevOzadkyHSRWeyoBVFHQnWbsPHBH2UgL8m', // dispatcher123
        role: 'dispatcher',
        firstName: 'Диспетчер',
        lastName: '1'
    },
    {
        id: '3',
        username: 'tech1',
        email: 'tech1@deapseak.com',
        password: '$2b$12$UAhE6V/FXWQcy..np0Jxl.xosamXjMO/OOBLgWe2GD/6h/OBvFgX2', // tech123
        role: 'technician',
        firstName: 'Олександр',
        lastName: 'Петренко'
    },
    {
        id: '4',
        username: 'client1',
        email: 'client1@deapseak.com',
        password: '$2b$12$AdUANw3QinD1piq67OkLuurzqDMJHrulJWVZjSdRxybTTXhTntoDK', // client123
        role: 'client',
        firstName: 'Іван',
        lastName: 'Клієнтов'
    }
];

// Заявки
let requests = [
    {
        id: 1001,
        title: "Не працює мережеве з'єднання",
        client: "ТОВ 'Альфа'",
        priority: "high",
        status: "new",
        date: new Date().toLocaleDateString('uk-UA') + " 10:30",
        assignedTo: null,
        description: "Відсутній доступ до мережі в головному офісі",
        location: "Київ, вул. Хрещатик, 25"
    },
    {
        id: 1002,
        title: "Заміна жорсткого диска",
        client: "ПП 'Бета'", 
        priority: "medium",
        status: "assigned",
        date: new Date().toLocaleDateString('uk-UA') + " 09:15",
        assignedTo: "Олександр Петренко",
        description: "Необхідна заміна жорсткого диска на сервері",
        location: "Львів, вул. Свободи, 15"
    }
];

// Техніки
const technicians = [
    {
        id: 1,
        firstName: "Олександр",
        lastName: "Петренко",
        email: "tech1@deapseak.com",
        specialty: "network",
        status: "online",
        workload: "medium",
        currentAssignments: 3,
        skills: ["Cisco", "Juniper", "VPN", "Wi-Fi"],
        rating: 4.8
    },
    {
        id: 2,
        firstName: "Марія", 
        lastName: "Іваненко",
        email: "tech2@deapseak.com",
        specialty: "software",
        status: "busy",
        workload: "high",
        currentAssignments: 5,
        skills: ["Windows Server", "Linux", "Virtualization", "Backup"],
        rating: 4.9
    }
];

// Активності
let activities = [
    {
        id: 1,
        type: "assignment",
        message: "Заявку #1002 призначено техніку Олександр Петренко",
        timestamp: new Date(Date.now() - 3600000).toLocaleString('uk-UA'),
        icon: "fas fa-user-check",
        color: "text-info"
    },
    {
        id: 2,
        type: "system",
        message: "Система успішно запущена",
        timestamp: new Date().toLocaleString('uk-UA'),
        icon: "fas fa-check-circle",
        color: "text-success"
    }
];

// Сповіщення
const notifications = [
    {
        id: 1,
        title: "Нова заявка",
        message: "Отримано нову заявку від клієнта",
        type: "info",
        read: false,
        timestamp: new Date().toLocaleString('uk-UA')
    }
];

// ===============================
// MIDDLEWARE АВТОРИЗАЦІЇ
// ===============================

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Токен доступу відсутній'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Недійсний токен'
            });
        }
        req.user = user;
        next();
    });
}

// Middleware для перевірки ролей
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Користувач не автентифікований'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Доступ заборонено. Потрібна роль: ${allowedRoles.join(' або ')}`
            });
        }

        next();
    };
}

// ===============================
// ROUTES
// ===============================

// Root
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DEAPSEAK API</title>
    <style>
        body { font-family: Arial; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; }
        .container { background: white; border-radius: 20px; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { color: #667eea; margin-bottom: 20px; }
        .status { background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
        .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 10px; border-left: 4px solid #667eea; }
        code { background: #1e1e1e; color: #d4d4d4; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 DEAPSEAK API (Швидке виправлення)</h1>
        <div class="status">✅ Працює в пам'яті</div>
        
        <h2>📡 Endpoints:</h2>
        <div class="endpoint"><code>GET /api/health</code></div>
        <div class="endpoint"><code>POST /api/auth/login</code></div>
        <div class="endpoint"><code>GET /api/requests</code></div>
        <div class="endpoint"><code>PATCH /api/requests/:id</code></div>
        <div class="endpoint"><code>DELETE /api/requests/:id</code></div>
        <div class="endpoint"><code>GET /api/technicians</code></div>
        <div class="endpoint"><code>GET /api/activities</code></div>
        
        <h2>🔐 Тест:</h2>
        <p>Email: <code>admin@deapseak.com</code> | Password: <code>admin123</code></p>
        <p>Email: <code>dispatcher@deapseak.com</code> | Password: <code>dispatcher123</code></p>
    </div>
</body>
</html>
    `);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'in-memory',
        version: '2.0.0-quickfix',
        endpoints: ['auth', 'requests', 'technicians', 'activities']
    });
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Login attempt:', req.body.email || req.body.username);
        
        const { email, username, password } = req.body;
        
        if ((!email && !username) || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email/username та пароль обов\'язкові'
            });
        }
        
        const user = users.find(u => 
            u.email === (email || username) || 
            u.username === (username || email)
        );
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Невірні облікові дані'
            });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Невірні облікові дані'
            });
        }
        
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        console.log('✅ Login успішний:', user.email);
        
        res.json({
            success: true,
            message: 'Вхід успішний',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка входу'
        });
    }
});

// Get requests (всі аутентифіковані користувачі можуть бачити заявки)
app.get('/api/requests', authenticateToken, (req, res) => {
    // Клієнти бачать тільки свої заявки
    if (req.user.role === 'client') {
        const userRequests = requests.filter(r => r.client === req.user.email || r.clientId === req.user.id);
        return res.json(userRequests);
    }
    
    // Технік бачить тільки призначені йому заявки
    if (req.user.role === 'technician') {
        const techRequests = requests.filter(r => r.assignedTo === req.user.id || r.assignedTo === req.user.email);
        return res.json(techRequests);
    }
    
    // Admin та dispatcher бачать всі заявки
    res.json(requests);
});

// Create request (всі можуть створювати)
app.post('/api/requests', authenticateToken, (req, res) => {
    const { title, client, description, location, priority, status } = req.body;
    
    if (!title || !client || !description) {
        return res.status(400).json({
            success: false,
            message: 'Обов\'язкові поля: title, client, description'
        });
    }
    
    const newRequest = {
        id: Math.max(...requests.map(r => r.id), 1000) + 1,
        title,
        client,
        description,
        location: location || '',
        priority: priority || 'medium',
        status: status || 'new',
        assignedTo: null,
        date: new Date().toLocaleDateString('uk-UA') + " " + new Date().toLocaleTimeString('uk-UA', {hour: '2-digit', minute: '2-digit'})
    };
    
    requests.push(newRequest);
    
    // Додаємо активність
    activities.unshift({
        id: activities.length + 1,
        type: "request",
        message: `Створено заявку: ${title}`,
        timestamp: new Date().toLocaleString('uk-UA'),
        icon: "fas fa-ticket-alt",
        color: "text-info"
    });
    
    res.status(201).json({
        success: true,
        message: 'Заявку створено',
        data: newRequest
    });
});

// Update request (тільки admin, dispatcher та призначений технік)
app.patch('/api/requests/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const requestIndex = requests.findIndex(r => r.id == id);
    
    if (requestIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Заявку не знайдено'
        });
    }
    
    const request = requests[requestIndex];
    
    // Перевірка прав доступу
    if (req.user.role === 'technician' && request.assignedTo !== req.user.id && request.assignedTo !== req.user.email) {
        return res.status(403).json({
            success: false,
            message: 'Ви можете редагувати тільки свої заявки'
        });
    }
    
    if (req.user.role === 'client') {
        return res.status(403).json({
            success: false,
            message: 'Клієнти не можуть редагувати заявки'
        });
    }
    
    const updateData = req.body;
    delete updateData.id; // Не дозволяємо змінювати ID
    
    requests[requestIndex] = { ...requests[requestIndex], ...updateData };
    
    // Додаємо активність
    activities.unshift({
        id: activities.length + 1,
        type: "edit",
        message: `Відредаговано заявку #${id}: ${updateData.title || requests[requestIndex].title}`,
        timestamp: new Date().toLocaleString('uk-UA'),
        icon: "fas fa-edit",
        color: "text-info"
    });
    
    res.json({
        success: true,
        message: 'Заявку оновлено',
        data: requests[requestIndex]
    });
});

// Delete request (тільки admin)
app.delete('/api/requests/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
    const { id } = req.params;
    const requestIndex = requests.findIndex(r => r.id == id);
    
    if (requestIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Заявку не знайдено'
        });
    }
    
    const deletedRequest = requests[requestIndex];
    requests.splice(requestIndex, 1);
    
    // Додаємо активність
    activities.unshift({
        id: activities.length + 1,
        type: "delete",
        message: `Видалено заявку #${id}: ${deletedRequest.title}`,
        timestamp: new Date().toLocaleString('uk-UA'),
        icon: "fas fa-trash",
        color: "text-danger"
    });
    
    res.json({
        success: true,
        message: 'Заявку видалено'
    });
});

// Get technicians
app.get('/api/technicians', authenticateToken, (req, res) => {
    res.json(technicians);
});

// Create assignment
app.post('/api/assignments', authenticateToken, (req, res) => {
    const { requestId, techId } = req.body;
    
    const request = requests.find(r => r.id == requestId);
    const tech = technicians.find(t => t.id == techId);
    
    if (!request || !tech) {
        return res.status(404).json({
            success: false,
            message: 'Заявка або технік не знайдені'
        });
    }
    
    // Оновлюємо заявку
    request.status = 'assigned';
    request.assignedTo = `${tech.firstName} ${tech.lastName}`;
    
    // Додаємо активність
    activities.unshift({
        id: activities.length + 1,
        type: "assignment",
        message: `Заявку #${requestId} призначено техніку ${tech.firstName} ${tech.lastName}`,
        timestamp: new Date().toLocaleString('uk-UA'),
        icon: "fas fa-user-check",
        color: "text-success"
    });
    
    res.json({
        success: true,
        message: 'Призначення створено',
        data: { requestId, techId, request }
    });
});

// Get activities
app.get('/api/activities', authenticateToken, (req, res) => {
    res.json(activities.slice(0, 10)); // Останні 10
});

// Get notifications
app.get('/api/notifications', authenticateToken, (req, res) => {
    res.json(notifications);
});

// Перевірка токена
app.get('/api/verify-token', authenticateToken, (req, res) => {
    res.json({
        success: true,
        valid: true,
        user: req.user
    });
});

// Отримання користувачів за роллю (тільки admin та dispatcher)
app.get('/api/users', authenticateToken, authorizeRoles('admin', 'dispatcher'), (req, res) => {
    const role = req.query.role;
    let filteredUsers = users;
    
    if (role) {
        filteredUsers = users.filter(user => user.role === role);
    }
    
    // Видаляємо паролі з відповіді
    const safeUsers = filteredUsers.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
    });
    
    res.json(safeUsers);
});

// Базові endpoints для ліфтів
app.get('/api/lifts', authenticateToken, (req, res) => {
    res.json([
        { id: 1, name: "Ліфт #1", address: "вул. Хрещатик 1", status: "active" },
        { id: 2, name: "Ліфт #2", address: "вул. Хрещатик 2", status: "maintenance" }
    ]);
});

app.get('/api/lifts/:id', authenticateToken, (req, res) => {
    const liftId = req.params.id;
    console.log('📋 Запит на отримання ліфта:', liftId);
    
    // Тимчасово: повертаємо mock дані
    // TODO: В майбутньому інтегрувати з MongoDB
    const mockLift = {
        id: liftId,
        _id: liftId,
        municipalNumber: `MUN-${liftId}`,
        serialNumber: `SN-${liftId}`,
        brand: 'OTIS',
        model: 'Gen2',
        type: 'passenger',
        capacity: 630,
        speed: 1.0,
        installationYear: 2020,
        address: 'вул. Хрещатик 1, Київ',
        postcode: '01001',
        liftsCountAtAddress: 1,
        lat: 50.4501,
        lng: 30.5234,
        clientName: 'Тестовий клієнт',
        clientEmail: 'client@test.com',
        clientPhone: '+380501234567',
        contactPerson: 'Іван Петренко',
        accessCode: '1234',
        tech: 'technician@deapseak.com',
        status: 'active',
        lastMaintenance: '2024-10-01',
        nextMaintenance: '2025-04-01',
        inspectionFrequency: 6,
        maintenanceNotes: 'Тестові нотатки',
        // Дані інспекції
        inspectionDate: '2024-11-01',
        inspectionType: 'routine',
        inspectionStatus: 'passed',
        inspectionComments: 'Все в нормі, ліфт функціонує правильно'
    };
    
    res.json({ success: true, data: mockLift });
});

// Створення ліфта (тільки admin та dispatcher)
app.post('/api/lifts', authenticateToken, authorizeRoles('admin', 'dispatcher'), (req, res) => {
    const newLift = { id: Date.now(), ...req.body };
    res.json({ success: true, data: newLift });
});

// Оновлення ліфта (admin, dispatcher, technician)
app.put('/api/lifts/:id', authenticateToken, authorizeRoles('admin', 'dispatcher', 'technician'), (req, res) => {
    const liftId = req.params.id;
    const updatedLift = { id: liftId, ...req.body };
    console.log('📝 Оновлення ліфта:', liftId);
    res.json({ success: true, data: updatedLift, message: 'Ліфт оновлено' });
});

// Видалення ліфта (тільки admin)
app.delete('/api/lifts/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
    res.json({ success: true, message: 'Ліфт видалено' });
});

// ===============================
// ERROR HANDLERS
// ===============================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Маршрут ${req.method} ${req.path} не знайдено`
    });
});

app.use((error, req, res, next) => {
    console.error('❌ Error:', error);
    res.status(500).json({
        success: false,
        message: 'Внутрішня помилка сервера'
    });
});

// ===============================
// ЗАПУСК СЕРВЕРА
// ===============================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 DEAPSEAK API Server запущено:`);
    console.log(`   📍 http://localhost:${PORT}`);
    console.log(`   🔐 POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   📡 GET  http://localhost:${PORT}/api/health`);
    console.log(`   📋 GET  http://localhost:${PORT}/api/requests`);
    console.log(`   👥 GET  http://localhost:${PORT}/api/technicians\n`);
    console.log('✅ Всі endpoints готові до роботи!');
});

module.exports = app;