# 🚀 DeapSeaK v2 - Quick Start Guide

## Що змінилося?

✅ **Створено нову модульну архітектуру в папці `backend/`**

- MongoDB моделі з Mongoose
- JWT автентифікація
- Role-based авторизація (admin, dispatcher, technician, client)
- Геопросторові запити для ліфтів
- Повна історія запитів та коментарів

⚠️ **Старий `api-server.js` НЕ ЧІПАВСЯ і продовжує працювати!**

## Як запустити обидва сервери паралельно

### 1. Встановити MongoDB

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl status mongodb
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
Завантажте з https://www.mongodb.com/try/download/community

### 2. Налаштувати .env

```bash
# Скопіювати приклад
cp .env.example .env

# Відредагувати (мінімально потрібно):
nano .env
```

Мінімальні налаштування:
```bash
NODE_ENV=development
PORT=3002
MONGODB_URI=mongodb://localhost:27017/deapseak
JWT_SECRET=your-secret-key-change-in-production
```

### 3. Запустити старий API (порт 3001)

```bash
# Термінал 1
node api-server.js
# Працює на http://localhost:3001
```

### 4. Запустити новий модульний backend (порт 3002)

```bash
# Термінал 2
node backend/app.js
# Або з nodemon:
npm run dev

# Працює на http://localhost:3002
```

### 5. Перевірити що працює

```bash
# Старий API
curl http://localhost:3001/api/users

# Новий API
curl http://localhost:3002/health
curl http://localhost:3002/api/auth/users
```

## 🧪 Тестування нового API

### Реєстрація користувача

```bash
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tech1",
    "email": "tech@deapseak.com",
    "password": "password123",
    "firstName": "Олександр",
    "lastName": "Петренко",
    "role": "technician"
  }'
```

### Вхід

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "tech@deapseak.com",
    "password": "password123"
  }'
```

Збережіть отриманий `token` для наступних запитів.

### Створення ліфта (потрібен token admin/dispatcher)

```bash
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:3002/api/lifts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "municipalNumber": "LIFT-001",
    "address": {
      "street": "вул. Хрещатик, 1",
      "city": "Київ",
      "zipCode": "01001"
    },
    "location": {
      "type": "Point",
      "coordinates": [30.5234, 50.4501]
    },
    "manufacturer": "Otis",
    "model": "Gen2",
    "capacity": 630,
    "floors": 12
  }'
```

### Пошук ліфтів поблизу

```bash
curl "http://localhost:3002/api/lifts/nearby?longitude=30.5234&latitude=50.4501&maxDistance=1000" \
  -H "Authorization: Bearer $TOKEN"
```

## 📁 Структура проекту

```
deapseak/
├── api-server.js              # ✅ Старий API (працює, не чіпався)
├── backend/                   # 🆕 Новий модульний backend
│   ├── app.js                 # Express app + server
│   ├── config/
│   │   └── database.js        # MongoDB connection
│   ├── models/
│   │   ├── User.js            # User model + bcrypt
│   │   ├── Lift.js            # Lift model + geospatial
│   │   └── Request.js         # Request/ticket model
│   ├── controllers/
│   │   ├── authController.js  # Auth logic
│   │   ├── liftController.js  # Lift CRUD
│   │   └── requestController.js
│   ├── routes/
│   │   ├── authRoutes.js      # /api/auth
│   │   ├── liftRoutes.js      # /api/lifts
│   │   └── requestRoutes.js   # /api/requests
│   └── middleware/
│       ├── auth.js            # JWT middleware
│       ├── roleAuth.js        # RBAC middleware
│       └── errorHandler.js    # Error handling
└── .env.example               # 🆕 Оновлений приклад конфігурації
```

## 🔑 Ролі та доступ

| Роль | Доступ |
|------|--------|
| **admin** | Повний доступ до всього |
| **dispatcher** | Управління ліфтами, призначення запитів |
| **technician** | Перегляд призначених запитів, оновлення статусів |
| **client** | Створення запитів, перегляд своїх ліфтів |

## 🔄 Наступні кроки

1. ✅ Модульний backend створено
2. ✅ MongoDB моделі з валідацією
3. ✅ Middleware (auth, RBAC, errors)
4. ✅ Controllers з бізнес-логікою
5. ✅ RESTful routes
6. ⏳ Тестування паралельно зі старим API
7. ⏳ Поступова міграція frontend
8. ⏳ Міграція даних в MongoDB

## 🆘 Troubleshooting

**MongoDB не запускається:**
```bash
# Перевірити статус
sudo systemctl status mongodb

# Подивитись логи
sudo journalctl -u mongodb

# Перезапустити
sudo systemctl restart mongodb
```

**Порт зайнятий:**
```bash
# Знайти процес на порту 3002
lsof -i :3002

# Вбити процес
kill -9 <PID>
```

**JWT помилки:**
- Перевірте що `JWT_SECRET` встановлено в `.env`
- Токен передається в header: `Authorization: Bearer <token>`
- Токен дійсний 7 днів (за замовчуванням)

## 📚 Документація API

Повну документацію API дивись в `backend/README.md`

Або відкрийте в браузері:
- http://localhost:3002/ - API info
- http://localhost:3002/health - Health check
