# 🚀 DeapSeaK v2 - Quick Start Guide

## Що змінилося в v2?

✅ **UNIFIED SERVER - Все на одному порті 5000!**

- ✅ Frontend + API + WebSocket на одному порті
- ✅ MongoDB з Mongoose моделями
- ✅ JWT автентифікація
- ✅ Role-based авторизація (admin, client, dispatcher, tech, guest)
- ✅ Геопросторові запити для ліфтів
- ✅ Email notifications (nodemailer)
- ✅ PDF parsing Portuguese inspection reports
- ✅ AI Assistant з 32 регуляціями

⚠️ **Старі файли `api-server.js`, `websocket-server.js`, `frontend-server.js` БІЛЬШЕ НЕ ВИКОРИСТОВУЮТЬСЯ!**

## Швидкий запуск

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

### 2. Налаштувати .env (опціонально)

```bash
# Скопіювати приклад якщо потрібно
cp .env.example .env
```

Мінімальні налаштування (за замовчуванням вже правильні):
```bash
NODE_ENV=development
PORT=5000                                      # Unified server port
MONGODB_URI=mongodb://localhost:27017/deapseak
JWT_SECRET=deapseak-secret-key-2024
```

### 3. Запустити Unified Server (ОДИН порт 5000)

```bash
# Автоматичний запуск (рекомендовано)
./auto-start.sh

# Або вручну
node unified-server.js

# Працює на http://localhost:5000
# API: http://localhost:5000/api/*
# WebSocket: ws://localhost:5000
```

### 4. Перевірити що працює

```bash
# Health check
curl http://localhost:5000/api/health

# Отримати список користувачів
curl http://localhost:5000/api/users

# Frontend
open http://localhost:5000/login.html
```

## 🧪 Тестування API

### Логін (отримання JWT token)

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@deapseak.com",
    "password": "admin123"
  }'
```

Збережіть отриманий `token` для наступних запитів.

### Отримати список ліфтів (потрібен token)

```bash
TOKEN="your-jwt-token-here"

curl -X GET http://localhost:5000/api/lifts \
  -H "Authorization: Bearer $TOKEN"
```

### Створення ліфта (потрібен token admin)

```bash
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:5000/api/lifts \
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
## 📁 Структура Unified Server

```
unified-server.js          # 🆕 Все в одному файлі (Express + Socket.IO)
├── Static Files           # Frontend на /
├── API Routes             # REST API на /api/*
├── WebSocket Server       # Socket.IO на ws://
├── MongoDB Connection     # База даних deapseak
└── Services:
    ├── services/pdf-parser.js           # Парсинг PDF звітів
    ├── services/export-service.js       # PDF/Excel експорт
    ├── services/action-plan-generator.js # Генерація планів дій
    ├── services/email-service.js        # Email notifications
    ├── services/ai-helpers.js           # AI база знань
    └── services/unified-ai.js           # AI асистент
```

## 🔑 Ролі та доступ

| Роль | Email | Пароль | Доступ |
|------|-------|--------|--------|
| **admin** | admin@deapseak.com | admin123 | Повний доступ |
| **client** | client1@deapseak.com | client123 | Свої ліфти/заявки |
| **dispatcher** | dispatcher@deapseak.com | dispatcher123 | Управління заявками |
| **tech** | tech1@deapseak.com | tech123 | Виконання робіт |

## 🎯 Доступні сторінки

- 🔐 http://localhost:5000/login.html - Логін
- 👨‍💼 http://localhost:5000/pages/admin/ - Адмін панель
- 📞 http://localhost:5000/pages/dispatcher/ - Диспетчер
- 🔧 http://localhost:5000/pages/tech/ - Технік
- 👤 http://localhost:5000/pages/client/ - Клієнт
- 🤖 http://localhost:5000/pages/ai-assistant/ - AI Асистент

## 🔄 Що запускає auto-start.sh

1. ✅ Перевіряє Node.js, npm, MongoDB
2. ✅ Встановлює npm залежності
3. ✅ Запускає MongoDB
4. ✅ Зупиняє старі процеси на порту 5000
5. ✅ Запускає unified-server.js
6. ✅ Перевіряє що сервер працює
7. ✅ Показує корисні посилання

## 🆘 Troubleshooting

**MongoDB не запускається:**
```bash
# Автоматичний запуск через скрипт
./auto-start.sh

# Або вручну
sudo systemctl start mongod
sudo systemctl status mongod
```

**Порт 5000 зайнятий:**
```bash
# Зупинити всі сервери
./stop-servers.sh

# Або вручну знайти процес
lsof -i :5000
kill -9 <PID>
```

**JWT помилки:**
- Перевірте що ви залогінені через /login.html
- Токен дійсний 7 днів
- Токен зберігається в localStorage

**Ліфти не з'являються:**
```bash
# Створити демо-дані
node -e "require('./scripts/create-demo-lifts.js')"

# Або через MongoDB
mongosh deapseak --eval "db.lifts.countDocuments()"
```

## 📚 Додаткова документація

- [README.md](README.md) - Головна документація
- [QUICK-START.md](QUICK-START.md) - Детальний швидкий старт
- [AUTO-START-COMPLETE.md](AUTO-START-COMPLETE.md) - Про auto-start.sh
- [EMAIL-NOTIFICATIONS-GUIDE.md](EMAIL-NOTIFICATIONS-GUIDE.md) - Email система
- [IMPLEMENTATION-COMPLETE.md](IMPLEMENTATION-COMPLETE.md) - Звіт реалізації

## 🎉 Готово!

Тепер у вас працює повноцінна система на **одному порті 5000**:
- ✅ Frontend (HTML/CSS/JS)
- ✅ REST API (/api/*)
- ✅ WebSocket (Socket.IO)
- ✅ MongoDB база даних
- ✅ JWT автентифікація
- ✅ Email notifications
- ✅ PDF parsing
- ✅ AI Assistant

**Відкрийте http://localhost:5000 і почніть працювати!** 🚀
