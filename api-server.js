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
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
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
        email: 'dispatcher@deapseak.com',
        password: '$2b$12$3yDVrfEYUofXT.4k5lDevOzadkyHSRWeyoBVFHQnWbsPHBH2UgL8m', // dispatcher123
        role: 'dispatcher',
        firstName: 'Диспетчер',
        lastName: '1'
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

// Get requests
app.get('/api/requests', authenticateToken, (req, res) => {
    res.json(requests);
});

// Create request
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

// Update request
app.patch('/api/requests/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const requestIndex = requests.findIndex(r => r.id == id);
    
    if (requestIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Заявку не знайдено'
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

// Delete request
app.delete('/api/requests/:id', authenticateToken, (req, res) => {
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