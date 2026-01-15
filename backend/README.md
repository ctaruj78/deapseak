# DeapSeaK v2 - Backend Refactoring

## 📁 Структура

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── models/
│   ├── User.js             # User model with bcrypt
│   ├── Lift.js             # Lift model with geolocation
│   ├── Request.js          # Request/Ticket model
│   └── index.js            # Models export
├── middleware/
│   ├── auth.js             # JWT authentication
│   ├── roleAuth.js         # Role-based authorization
│   └── errorHandler.js     # Centralized error handling
├── controllers/           # Business logic (TBD)
├── routes/               # API routes (TBD)
└── utils/                # Helper functions (TBD)
```

## 🔐 Безпека

- ✅ Bcrypt password hashing (User model)
- ✅ JWT authentication middleware
- ✅ Role-based access control (admin, dispatcher, technician, client)
- ✅ Централізована обробка помилок

## 📊 Моделі

### User
- Ролі: admin, dispatcher, technician, client
- Автоматичне хешування паролів
- Віртуальне поле fullName
- Індекси для швидкого пошуку

### Lift
- Геолокація (2dsphere index)
- Історія інспекцій
- QR коди
- Зв'язки з User (technician, client)
- Методи: needsMaintenance(), calculateNextMaintenance()

### Request
- Зв'язки з Lift та User
- Статуси: new, assigned, in_progress, completed, cancelled
- Пріоритети: low, medium, high, urgent
- Фото до/після
- Коментарі та історія змін
- Методи: addComment(), changeStatus()

## 🚀 Використання

### Підключення до MongoDB

```javascript
const connectDB = require('./backend/config/database');
await connectDB();
```

### Використання моделей

```javascript
const { User, Lift, Request } = require('./backend/models');

// Створення користувача
const user = await User.create({
    username: 'tech1',
    email: 'tech1@festlift.pt',
    password: 'password123', // Автоматично хешується
    firstName: 'Олександр',
    lastName: 'Петренко',
    role: 'technician'
});

// Пошук ліфтів поблизу
const lifts = await Lift.find({
    location: {
        $near: {
            $geometry: {
                type: 'Point',
                coordinates: [longitude, latitude]
            },
            $maxDistance: 5000 // 5км
        }
    }
});
```

## ⚠️ Важливо

**Поточний api-server.js НЕ ЧІПАВСЯ!**

Нова модульна структура створена паралельно для поступової міграції.
Старий API продовжує працювати без змін.

## 📋 Наступні кроки

1. ✅ Створити controllers для бізнес-логіки
2. ✅ Створити routes для API endpoints
3. ✅ Створити backend/app.js точку входу
4. Налаштувати MongoDB (локально або Atlas)
5. Створити .env файл з конфігурацією
6. Тестування нового API паралельно зі старим

## 🚀 Як запустити

### 1. Налаштування MongoDB

**Локально:**
```bash
# Install MongoDB (якщо ще не встановлено)
# Ubuntu/Debian:
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb
```

**MongoDB Atlas (хмарне рішення):**
1. Створіть аккаунт на https://www.mongodb.com/cloud/atlas
2. Створіть cluster
3. Отримайте connection string
4. Додайте IP до whitelist

### 2. Конфігурація

```bash
# Скопіюйте .env.example в .env
cp ../.env.example .env

# Відредагуйте .env і додайте ваші налаштування:
# - MONGODB_URI
# - JWT_SECRET
# - EMAIL_* (якщо потрібна email функціональність)
```

### 3. Запуск

```bash
# З кореневої директорії проекту
npm run dev
# Або
node backend/app.js

# Новий backend запуститься на http://localhost:3002
# Старий api-server.js продовжує працювати на http://localhost:3001
```

### 4. Тестування API

```bash
# Health check
curl http://localhost:3002/health

# Реєстрація користувача
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "role": "client"
  }'

# Вхід
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "test@example.com",
    "password": "password123"
  }'
```

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Реєстрація
- `POST /login` - Вхід
- `GET /profile` - Профіль (auth)
- `PUT /profile` - Оновити профіль (auth)
- `POST /change-password` - Змінити пароль (auth)
- `GET /users` - Список користувачів (admin)
- `PUT /users/:id/role` - Змінити роль (admin)

### Lifts (`/api/lifts`)
- `GET /` - Список ліфтів
- `GET /stats` - Статистика
- `GET /nearby?longitude=X&latitude=Y` - Геопошук
- `GET /:id` - Деталі ліфта
- `POST /` - Створити (admin/dispatcher)
- `PUT /:id` - Оновити (admin/dispatcher)
- `POST /:id/inspection` - Додати інспекцію
- `POST /:id/assign-technician` - Призначити техніка

### Requests (`/api/requests`)
- `GET /` - Список запитів
- `GET /stats` - Статистика
- `GET /:id` - Деталі запиту
- `POST /` - Створити запит
- `POST /:id/assign` - Призначити техніку
- `PATCH /:id/status` - Змінити статус
- `POST /:id/comment` - Додати коментар
- `POST /:id/complete` - Завершити

## 🔄 Міграція з api-server.js

Старий `api-server.js` (порт 3001) продовжує працювати без змін.
Новий модульний backend (порт 3002) запускається паралельно.

Поступово можна переводити frontend для використання нового API:
1. Тестування нових endpoints
2. Оновлення frontend коду
3. Міграція даних з in-memory в MongoDB
4. Повне перемикання на новий backend
