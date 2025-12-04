# 🔗 Повна інтеграція проекту DeapSeaK

## 📋 Огляд

**Unified Server** на порту **5000** - це єдина точка входу для всього проекту:
- ✅ Frontend (статичні файли HTML/CSS/JS)
- ✅ REST API (всі операції з даними)
- ✅ MongoDB інтеграція
- ✅ JWT авторизація

---

## 🔐 Автентифікація

### Акаунти в системі

```javascript
// Всі акаунти використовують EMAIL для входу
admin@deapseak.com / admin123        // Адміністратор
dispatcher@deapseak.com / dispatcher123  // Диспетчер
tech1@deapseak.com / tech123         // Технік 1
tech2@deapseak.com / tech123         // Технік 2
```

### API Endpoints

#### POST /api/auth/login
```javascript
// Запит
{
  "email": "admin@deapseak.com",
  "password": "admin123"
}

// Відповідь
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@deapseak.com",
    "role": "admin",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

---

## 🏗️ API Endpoints (повний список)

### 🔹 Health Check
```
GET /api/health
```

### 🔹 Ліфти (Lifts)

```javascript
GET    /api/lifts           // Отримати всі ліфти
POST   /api/lifts           // Створити ліфт
PUT    /api/lifts/:id       // Оновити ліфт
DELETE /api/lifts/:id       // Видалити ліфт
```

**Приклад створення ліфта:**
```javascript
const response = await AuthManager.fetchWithAuth('/api/lifts', {
  method: 'POST',
  body: JSON.stringify({
    municipalNumber: "12345",
    factoryNumber: "ABC-123",
    address: "вул. Шевченка, 1",
    city: "Київ",
    status: "working",
    manufacturer: "Otis",
    model: "Gen2",
    installYear: 2020
  })
});
const data = await response.json();
```

### 🔹 Заявки (Requests)

```javascript
GET    /api/requests        // Отримати всі заявки
POST   /api/requests        // Створити заявку
PUT    /api/requests/:id    // Оновити заявку
DELETE /api/requests/:id    // Видалити заявку
```

**Приклад створення заявки:**
```javascript
const response = await AuthManager.fetchWithAuth('/api/requests', {
  method: 'POST',
  body: JSON.stringify({
    liftId: "L001",
    type: "maintenance",
    priority: "medium",
    status: "new",
    title: "Планове ТО",
    description: "Щомісячне обслуговування"
  })
});
```

### 🔹 Користувачі (Users)

```javascript
GET    /api/users           // Отримати всіх користувачів
GET    /api/users/:id       // Отримати користувача
```

---

## 📁 Структура проекту

```
/workspaces/deapseak/
├── unified-server.js          # 🚀 Головний сервер (порт 5000)
├── config.js                  # ⚙️ Конфігурація (PORT=5000)
├── login.html                 # 🔐 Сторінка входу
├── index.html                 # 🏠 Головна сторінка
│
├── pages/
│   ├── admin/
│   │   ├── lifts.html        # Управління ліфтами
│   │   ├── requests.html     # Управління заявками
│   │   └── users.html        # Управління користувачами
│   │
│   ├── tech/
│   │   ├── dashboard.html    # Панель техніка
│   │   └── tasks.html        # Завдання техніка
│   │
│   └── client/
│       └── dashboard.html    # Панель клієнта
│
└── assets/
    └── js/
        ├── config.js         # API_BASE_URL = 'http://localhost:5000'
        └── auth-manager.js   # AuthManager для роботи з API
```

---

## 🔧 Використання AuthManager

### Ініціалізація

```html
<!-- В кожній HTML сторінці -->
<script src="/assets/js/config.js"></script>
<script src="/assets/js/auth-manager.js"></script>
```

### Перевірка авторизації

```javascript
if (!AuthManager.isAuthenticated()) {
    window.location.href = '/login.html';
}

const currentUser = AuthManager.getCurrentUser();
console.log('Поточний користувач:', currentUser.username, currentUser.role);
```

### GET запити

```javascript
const response = await AuthManager.fetchWithAuth('/api/lifts');
const data = await response.json();

if (data.success) {
    console.log('Ліфти:', data.data);
}
```

### POST запити

```javascript
const response = await AuthManager.fetchWithAuth('/api/lifts', {
    method: 'POST',
    body: JSON.stringify({
        municipalNumber: "12345",
        address: "вул. Шевченка, 1"
    })
});
const data = await response.json();
```

### PUT запити

```javascript
const response = await AuthManager.fetchWithAuth(`/api/lifts/${liftId}`, {
    method: 'PUT',
    body: JSON.stringify({
        status: 'maintenance'
    })
});
```

### DELETE запити

```javascript
const response = await AuthManager.fetchWithAuth(`/api/lifts/${liftId}`, {
    method: 'DELETE'
});
```

---

## 🌐 CORS налаштування

Unified-server підтримує запити з:
```javascript
origin: [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'https://*.app.github.dev'  // GitHub Codespaces
]
```

---

## 🗄️ MongoDB Collections

### users
```javascript
{
    _id: ObjectId,
    username: String,
    email: String,
    password: String (bcrypt),
    role: 'admin' | 'dispatcher' | 'technician' | 'client',
    firstName: String,
    lastName: String,
    createdAt: ISOString
}
```

### lifts
```javascript
{
    _id: ObjectId,
    municipalNumber: String,
    factoryNumber: String,
    address: String,
    city: String,
    status: 'working' | 'maintenance' | 'broken' | 'offline',
    manufacturer: String,
    model: String,
    installYear: Number,
    createdAt: ISOString,
    createdBy: String,
    updatedAt: ISOString,
    updatedBy: String
}
```

### requests
```javascript
{
    _id: ObjectId,
    liftId: String,
    type: 'emergency' | 'maintenance' | 'repair' | 'inspection',
    priority: 'critical' | 'high' | 'medium' | 'low',
    status: 'new' | 'assigned' | 'in_progress' | 'completed' | 'cancelled',
    title: String,
    description: String,
    technician: String,
    createdAt: ISOString,
    createdBy: String,
    updatedAt: ISOString,
    updatedBy: String,
    scheduledAt: ISOString,
    completedAt: ISOString
}
```

---

## 🚀 Запуск проекту

```bash
# 1. Запустити MongoDB
mongod --dbpath ./mongodb/data

# 2. Запустити unified-server
PORT=5000 node unified-server.js

# 3. Відкрити в браузері
http://localhost:5000/login.html
```

---

## ✅ Checklist інтеграції сторінки

Щоб інтегрувати нову сторінку з API:

- [ ] Додати `<script src="/assets/js/config.js"></script>`
- [ ] Додати `<script src="/assets/js/auth-manager.js"></script>`
- [ ] Перевірити авторизацію: `AuthManager.isAuthenticated()`
- [ ] Використовувати `AuthManager.fetchWithAuth()` для всіх API запитів
- [ ] Обробляти помилки 401 (unauthorized) → redirect на /login.html
- [ ] Обробляти помилки 403 (forbidden) → показати повідомлення
- [ ] Додати logout кнопку: `AuthManager.logout()`

---

## 🔍 Troubleshooting

### Проблема: "not valid JSON"
✅ **Рішення:** Статичні файли перенесено в кінець unified-server.js, API працює

### Проблема: "Невалідний токен"
✅ **Рішення:** Вийдіть і увійдіть знову (localStorage.clear())

### Проблема: Порт 3001 замість 5000
✅ **Рішення:** Всі конфіги оновлено на 5000

### Проблема: Старі демо-акаунти (admin, tech1)
✅ **Рішення:** Використовуйте нові з @deapseak.com

---

## 📊 Статус інтеграції

| Компонент | Статус | Примітки |
|-----------|--------|----------|
| Unified Server | ✅ | Порт 5000, всі endpoints |
| MongoDB | ✅ | База deapseak |
| JWT Auth | ✅ | 24h expiry |
| Login Page | ✅ | Email-based |
| Admin/Lifts | ✅ | CRUD операції |
| Admin/Requests | ✅ | CRUD операції |
| Admin/Users | ✅ | GET операції |
| Tech Dashboard | 🔄 | Потрібна перевірка |
| Client Dashboard | 🔄 | Потрібна перевірка |

---

**Версія:** 2.0  
**Дата:** 4 грудня 2025  
**Порт:** 5000 (unified)
