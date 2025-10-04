# 🔧 ТЕХНІЧНА ДОКУМЕНТАЦІЯ - DeapSeaK CRM System

## 📋 ОГЛЯД АРХІТЕКТУРИ

### Технологічний стек:
- **Backend**: Node.js + Express.js (порт 3001)
- **Database**: MongoDB 
- **Frontend**: Vanilla JavaScript + AdminLTE 3.2
- **UI Framework**: Bootstrap 4.6 + FontAwesome 6.4
- **Charts**: Chart.js
- **Authentication**: JWT tokens

### Структура проекту:
```
deapseak/
├── api-server.js              # Головний API сервер
├── db.js                      # MongoDB підключення
├── assets/js/modules/         # Frontend модулі
│   ├── assignment-manager.js  # Управління заявками
│   ├── monitoring-manager.js  # Моніторинг системи  
│   ├── chat-system.js        # Система чату
│   └── ...
├── models/                    # MongoDB схеми
│   ├── assignment-schema.js   # Схеми заявок
│   ├── chat-schema.js        # Схеми чату
│   └── ...
├── pages/                     # HTML сторінки
│   ├── crm-integrated.html   # Інтегрована CRM сторінка
│   └── ...
└── docs/                     # Документація
```

---

## 🗄️ БАЗА ДАНИХ (MongoDB)

### Основні колекції:

#### `users` - Користувачі системи
```javascript
{
  _id: ObjectId,
  username: String,
  email: String, 
  password: String, // bcrypt hashed
  firstName: String,
  lastName: String,
  role: String, // 'admin', 'dispatcher', 'tech', 'client'
  phone: String,
  isActive: Boolean,
  createdAt: Date,
  refreshTokens: [String]
}
```

#### `assignments` - Заявки на обслуговування
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  type: String, // 'maintenance', 'repair', 'installation', 'inspection'
  status: String, // 'pending', 'in-progress', 'completed', 'cancelled'
  priority: String, // 'low', 'medium', 'high', 'urgent'
  location: {
    address: String,
    building: String,
    floor: String,
    apartment: String,
    coordinates: { lat: Number, lng: Number }
  },
  client: { type: ObjectId, ref: 'User' },
  assignedTech: { type: ObjectId, ref: 'User' },
  qrCode: String,
  attachments: [AttachmentSchema],
  createdAt: Date,
  updatedAt: Date,
  completedAt: Date
}
```

#### `chat_messages` - Повідомлення чату
```javascript
{
  _id: ObjectId,
  text: String,
  from: { type: ObjectId, ref: 'User' },
  to: { type: ObjectId, ref: 'User' }, // for direct messages
  chatId: String,
  type: String, // 'direct', 'channel', 'system'
  attachments: [AttachmentSchema],
  timestamp: Date,
  edited: Boolean,
  editedAt: Date,
  readBy: [ReadStatusSchema]
}
```

#### `chat_channels` - Канали чату
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  type: String, // 'public', 'private'
  members: [String], // roles or user IDs
  admins: [{ type: ObjectId, ref: 'User' }],
  createdBy: { type: ObjectId, ref: 'User' },
  createdAt: Date,
  lastActivity: Date,
  settings: ChannelSettingsSchema
}
```

---

## 🌐 API ENDPOINTS

### Аутентифікація
```http
POST /api/register          # Реєстрація користувача
POST /api/login            # Вхід користувача  
POST /api/refresh-token    # Оновлення токену
POST /api/logout           # Вихід користувача
GET  /api/status          # Статус API (без авторизації)
```

### Управління заявками
```http
GET    /api/assignments              # Список заявок
POST   /api/assignments              # Створення заявки
GET    /api/assignments/:id          # Деталі заявки
PUT    /api/assignments/:id          # Оновлення заявки
DELETE /api/assignments/:id          # Видалення заявки
PUT    /api/assignments/:id/status   # Зміна статусу
GET    /api/assignments/qr/:qrId     # Заявка по QR коду
GET    /api/assignments/stats        # Статистика заявок
```

### Моніторинг системи  
```http
GET  /api/monitoring/stats           # Загальна статистика
GET  /api/monitoring/lifts           # Стан ліфтів
GET  /api/monitoring/alerts          # Активні алерти
POST /api/monitoring/alerts          # Створення алерта
PUT  /api/monitoring/alerts/:id/ack  # Підтвердження алерта
GET  /api/monitoring/metrics         # Системні метрики
POST /api/monitoring/test-alerts     # Тестові алерти
```

### Система чату
```http
GET    /api/users                    # Список користувачів
GET    /api/chat/channels            # Доступні канали
POST   /api/chat/channels            # Створення каналу
GET    /api/chat/messages            # Повідомлення чату
POST   /api/chat/messages            # Надсилання повідомлення
PUT    /api/chat/messages/:id        # Редагування повідомлення
DELETE /api/chat/messages/:id        # Видалення повідомлення
POST   /api/chat/messages/read       # Позначити як прочитано
GET    /api/chat/search             # Пошук повідомлень
GET    /api/chat/stats              # Статистика чату
```

---

## 🔧 НАЛАШТУВАННЯ СЕРЕДОВИЩА

### Змінні середовища (.env):
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/deapseak

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=24h

# Server
PORT=3001
NODE_ENV=development

# Upload limits
MAX_FILE_SIZE=10MB
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx
```

### Запуск системи:

#### 1. MongoDB:
```bash
# Запуск MongoDB
sudo systemctl start mongodb
# або
mongod --dbpath /path/to/db
```

#### 2. API Server:
```bash
cd /workspaces/deapseak
node api-server.js
```

#### 3. Frontend:
- Відкрити `/pages/crm-integrated.html` в браузері
- Або налаштувати веб-сервер для статичних файлів

---

## 🏗️ АРХІТЕКТУРА МОДУЛІВ

### Frontend модулі (ES6 Classes):

#### AssignmentManager
```javascript
class AssignmentManager {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api';
    this.assignments = [];
    this.currentUser = {};
  }
  
  // Основні методи
  async loadAssignments() { ... }
  async createAssignment(data) { ... }
  async updateAssignment(id, data) { ... }
  
  // CRM інтеграція  
  renderInContainer(containerId) { ... }
  renderWidget(containerId, title) { ... }
  getStats() { ... }
}
```

#### MonitoringManager  
```javascript
class MonitoringManager {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api';
    this.lifts = [];
    this.alerts = [];
    this.metrics = [];
  }
  
  // Основні методи
  async loadData() { ... }
  startRealTimeUpdates() { ... }
  createAlert(alert) { ... }
  
  // CRM інтеграція
  renderInContainer(containerId) { ... }
  renderWidget(containerId, title) { ... }
  getSystemStats() { ... }
}
```

#### ChatSystem
```javascript
class ChatSystem {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api';
    this.contacts = [];
    this.channels = [];
    this.messages = [];
  }
  
  // Основні методи
  async loadContacts() { ... }
  async sendMessage(text) { ... }
  setupSocketConnection() { ... }
  
  // CRM інтеграція
  renderInContainer(containerId) { ... }
  renderWidget(containerId, title) { ... }
  getChatStats() { ... }
}
```

---

## 🔐 СИСТЕМА АВТОРИЗАЦІЇ

### JWT Authentication Flow:
```javascript
// 1. Логін користувача
POST /api/login
{
  "username": "user@example.com",
  "password": "password123"
}

// 2. Отримання токенів
Response: {
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}

// 3. Використання токену
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
}

// 4. Оновлення токену при закінченні
POST /api/refresh-token
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Middleware для захисту маршрутів:
```javascript
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
```

---

## 🧪 ТЕСТУВАННЯ

### Автоматизовані тести:
- Файл: `/test-modules.html`
- Охоплення: API endpoints, модулі, інтеграція, продуктивність

### Запуск тестів:
```bash
# 1. Переконатися, що API сервер працює
curl http://localhost:3001/api/status

# 2. Відкрити тестову сторінку
open /test-modules.html

# 3. Натиснути "Запустити всі тести"
```

### Типи тестів:
- **API Tests**: Перевірка всіх endpoints
- **Module Tests**: Функціональність frontend модулів  
- **Integration Tests**: Взаємодія між модулями
- **Performance Tests**: Швидкість завантаження та відгуку

---

## 🚀 РОЗГОРТАННЯ

### Development:
```bash
# 1. Клонувати репозиторій
git clone <repository-url>
cd deapseak

# 2. Встановити залежності
npm install

# 3. Налаштувати MongoDB
# 4. Створити .env файл
# 5. Запустити сервер
node api-server.js
```

### Production:
```bash
# 1. Налаштувати змінні середовища
export NODE_ENV=production
export JWT_SECRET=<secure-secret>
export MONGODB_URI=<production-mongo-url>

# 2. Запустити з PM2
pm2 start api-server.js --name deapseak-api

# 3. Налаштувати Nginx reverse proxy
# 4. Налаштувати SSL сертифікати
# 5. Налаштувати backup MongoDB
```

---

## 🔍 МОНІТОРИНГ ТА ЛОГУВАННЯ

### Системні логи:
```javascript
// Структура логів
{
  timestamp: "2024-01-01T12:00:00Z",
  level: "info|warn|error",
  message: "User logged in",
  userId: "user-id",
  ip: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  data: { ... }
}
```

### Метрики для моніторингу:
- API response times
- Database query performance  
- Memory usage
- Active connections
- Error rates
- User activity

---

## 🔧 РОЗШИРЕННЯ СИСТЕМИ

### Додавання нового модуля:

#### 1. Створити файл модуля:
```javascript
// assets/js/modules/new-module.js
class NewModule {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api';
    this.init();
  }
  
  async init() { ... }
  
  // CRM інтеграція обов'язкова
  renderInContainer(containerId) { ... }
  renderWidget(containerId, title) { ... }
}
```

#### 2. Додати API endpoints:
```javascript
// В api-server.js
app.get('/api/new-module/', authenticateToken, async (req, res) => {
  // Логіка endpoints
});
```

#### 3. Створити MongoDB схему:
```javascript  
// models/new-module-schema.js
const newModuleSchema = new mongoose.Schema({
  // Поля схеми
});
```

#### 4. Інтегрувати в CRM:
```javascript
// В crm-integrated.html
showNewModule() {
  if (typeof newModule !== 'undefined' && newModule.renderInContainer) {
    newModule.renderInContainer('main-content');
  }
}
```

---

## 🐛 НАЛАГОДЖЕННЯ

### Поширені проблеми:

#### MongoDB connection errors:
```bash
# Перевірити статус
sudo systemctl status mongodb

# Перезапустити
sudo systemctl restart mongodb

# Перевірити логи
tail -f /var/log/mongodb/mongodb.log
```

#### API server errors:
```bash
# Перевірити порт
netstat -tlnp | grep 3001

# Перевірити процеси
ps aux | grep node

# Перевірити логи
node api-server.js 2>&1 | tee api.log
```

#### Frontend module errors:
```javascript
// Відкрити Developer Tools (F12)
// Перевірити Console на помилки
// Перевірити Network tab для API запитів
```

---

## 📚 ДОДАТКОВІ РЕСУРСИ

### Документація залежностей:
- [Express.js](https://expressjs.com/)
- [MongoDB](https://docs.mongodb.com/)
- [AdminLTE](https://adminlte.io/docs/)
- [Chart.js](https://www.chartjs.org/docs/)
- [Bootstrap](https://getbootstrap.com/docs/)

### Корисні команди:
```bash
# MongoDB
mongo --eval "db.stats()"
mongoexport --db deapseak --collection users --out users.json

# Node.js
npm audit
npm update
node --inspect api-server.js

# Git
git status
git add .
git commit -m "Update modules"
git push origin main
```

---

**Версія документації**: 2.0.0  
**Остання оновлення**: 2024  
**Команда розробки**: DeapSeaK Team

🔧 **Потрібна технічна допомога?** Створіть issue у репозиторії або зверніться до команди розробки.
