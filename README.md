# 🏢 DeapSeaK v2 - Lift Management System# DeapSeaK - Система управління ліфтами



Система управління ліфтами з повною підтримкою MongoDB, JWT автентифікацією та геолокацією.## Опис проекту



## 🚀 Швидкий стартDeapSeaK - це повнофункціональна система управління ліфтами з багаторольовим доступом, QR-кодуванням, MongoDB інтеграцією та сучасним веб-інтерфейсом. Система включає панелі для адміністраторів, диспетчерів, техніків і клієнтів.



```bash## Основні функції

# Запуск всієї системи

./scripts/start-system.sh- 🏢 **Багаторольова система** - адмін, диспетчер, технік, клієнт

- 📱 **QR-система** - генерація, сканування та управління QR-кодами

# Зупинка серверів- 🗄️ **MongoDB інтеграція** - централізоване зберігання даних

./scripts/stop-servers.sh- 🔐 **JWT авторизація** - безпечна система входу

```- 📊 **Аналітика та звітність** - статистика використання

- 🎨 **AdminLTE інтерфейс** - сучасний адаптивний дизайн

Система автоматично запустить:

- 🐳 MongoDB 7.0 (Docker)## Структура проекту

- 🔧 Backend API v2 (Node.js + Express)

- 🎨 Frontend Server (Static files)```

📁 /workspaces/deapseak/

## 📋 Вимоги├── 📄 index.html              # Головна сторінка

├── 📄 login.html              # Сторінка входу

- Node.js 18+├── 🔧 api-server.js           # Backend API сервер

- Docker├── 🗄️ db.js                  # MongoDB підключення

- MongoDB Client Tools (опціонально)├── 📋 start-servers.sh        # Скрипт автозапуску серверів

├── 📁 pages/                  # Сторінки за ролями

## 🏗️ Архітектура v2│   ├── admin/                 # Панель адміністратора

│   ├── dispatcher/            # Панель диспетчера

```│   ├── tech/                  # Панель техніка

deapseak/│   └── client/                # Панель клієнта

├── backend/               # Backend API v2├── 📁 assets/                 # Статичні ресурси

│   ├── models/           # Mongoose моделі│   ├── css/                   # Стилі

│   ├── controllers/      # Бізнес-логіка│   ├── js/                    # JavaScript модулі

│   ├── routes/           # API маршрути│   └── img/                   # Зображення

│   ├── middleware/       # Middleware (auth, errors)├── 📁 models/                 # MongoDB схеми

│   ├── config/           # Конфігурація (DB, JWT)├── 📁 plugins/                # Бібліотеки (AdminLTE, Bootstrap)

│   └── app.js            # Entry point└── 📁 templates/              # Шаблони документів

├── frontend/             # Frontend (HTML/JS/CSS)```

│   ├── pages/            # HTML сторінки

│   ├── assets/           # Статичні ресурси## Швидкий старт

│   └── config.js         # Frontend конфігурація

├── scripts/              # Утиліти### Автоматичний запуск (рекомендується)

│   ├── start-system.sh   # Запуск системи

│   ├── stop-servers.sh   # Зупинка серверів```bash

│   └── init-database.js  # Ініціалізація БД# Зробіть скрипт виконуваним (тільки один раз)

├── mongodb/              # MongoDB даніchmod +x start-servers.sh

│   └── data/             # Persistent storage

└── logs/                 # Логи серверів# Запустіть всі сервери

```./start-servers.sh

```

## 🔐 Облікові дані (Test)

### Ручний запуск

**Admin:**

- Email: `ctaruj78@gmail.com`#### 1. Запуск MongoDB

- Username: `ctaruj78````bash

- Password: `Solomia1704fel!`# Створіть директорії для MongoDB

sudo mkdir -p /data/db && sudo chown -R $USER:$USER /data/db

**Інші користувачі:**

- Dispatcher: `dispatcher` / `password123`# Запустіть MongoDB

- Technician1: `tech1` / `password123`mongod --dbpath /data/db --logpath /data/db/mongod.log --fork

- Technician2: `tech2` / `password123````

- Client1: `client1` / `password123`

- Client2: `client2` / `password123`#### 2. Запуск API сервера

```bash

## 🌐 Endpointscd /workspaces/deapseak

node api-server.js

### Local Development# Або у фоновому режимі:

- **Frontend:** http://localhost:5000/login.htmlnohup node api-server.js > api-server.log 2>&1 &

- **Backend API:** http://localhost:3002```

- **MongoDB:** mongodb://localhost:27017/deapseak

#### 3. Запуск веб-сервера

### GitHub Codespaces```bash

- **Frontend:** `https://<codespace>-5000.app.github.dev/login.html`cd /workspaces/deapseak

- **Backend API:** `https://<codespace>-3002.app.github.dev`python3 -m http.server 8080

# Або у фоновому режимі:

## 📡 API Documentationnohup python3 -m http.server 8080 > web-server.log 2>&1 &

```

### Authentication

```bash## Доступ до системи

# Login

POST /api/auth/login### Основні URL

Body: { "login": "ctaruj78@gmail.com", "password": "Solomia1704fel!" }

- 🏠 **Головна сторінка**: http://localhost:8080/index.html

# Register- 🔑 **Сторінка входу**: http://localhost:8080/login.html

POST /api/auth/register- 🎛️ **QR інтерфейс**: http://localhost:8080/qr-interface.html

Body: { "username": "user", "email": "user@example.com", "password": "pass", "role": "client" }- 🔍 **Тестування API**: http://localhost:8080/test-qr-api.html



# Get Profile### Тестові користувачі

GET /api/auth/profile

Headers: { "Authorization": "Bearer <token>" }| Роль | Логін | Пароль |

|------|-------|--------|

# Get All Users (admin only)| Адміністратор | `admin` | `admin123` |

GET /api/auth/users| Диспетчер | `dispatcher1` | `dispatcher123` |

```| Технік | `tech1` | `tech123` |

| Клієнт | `client1` | `client123` |

### Lifts

```bash### Порти серверів

# Get all lifts

GET /api/lifts?page=1&limit=20&status=operational- 📊 **MongoDB**: localhost:27017

- 🔗 **API сервер**: http://localhost:3001

# Get lift by ID- 🌐 **Веб-сайт**: http://localhost:8080

GET /api/lifts/:id

## API Endpoints

# Get lift by municipal number

GET /api/lifts/municipal/:municipalNumber### Авторизація

- `POST /api/login` - Вхід в систему

# Create lift- `POST /api/register` - Реєстрація користувача

POST /api/lifts

Body: { "municipalNumber": "12345", "address": {...}, "location": {...}, ... }### QR-система

- `GET /api/qr/codes` - Отримання QR-кодів

# Update lift- `POST /api/qr/codes` - Створення QR-коду

PUT /api/lifts/:id- `DELETE /api/qr/codes/:id` - Видалення QR-коду

Body: { "status": "maintenance", ... }- `POST /api/qr/scan` - Сканування QR-коду

- `GET /api/qr/stats` - Статистика QR-системи

# Delete lift- `GET /api/qr/scans` - Історія сканувань

DELETE /api/lifts/:id

### Службові

# Get lifts nearby (geolocation)- `GET /api/health` - Статус API сервера

GET /api/lifts/nearby?longitude=30.5234&latitude=50.4501&maxDistance=5000

## Тестування

# Get lifts stats

GET /api/lifts/stats### QR API тестування

1. Відкрийте http://localhost:8080/test-qr-api.html

# Update lift status2. Натисніть **"Перевірити API"** - має показати статус OK

PATCH /api/lifts/:id/status3. Натисніть **"Ініціалізувати тестові дані"** для створення демо QR-кодів

Body: { "status": "operational" }4. Тестуйте всі QR операції через кнопки на сторінці



# Add inspection### Перевірка статусу серверів

POST /api/lifts/:id/inspection```bash

Body: { "inspector": "John Doe", "notes": "...", "photos": [] }# Перевірити MongoDB

ps aux | grep mongod

# Assign technician

POST /api/lifts/:id/technician# Перевірити API сервер

Body: { "technicianId": "<user_id>" }ps aux | grep "node api-server.js"

```curl http://localhost:3001/api/health



### Requests (Service Tickets)# Перевірити веб-сервер

```bashps aux | grep "http.server"

# Get all requestscurl -I http://localhost:8080

GET /api/requests?page=1&limit=20&status=open```



# Get request by ID## Керування проектом

GET /api/requests/:id

### Збереження змін у Git

# Create request```bash

POST /api/requestsgit add .

Body: { "lift": "<lift_id>", "title": "...", "description": "...", "priority": "high" }git commit -m "Опис ваших змін"

git push origin main

# Update request```

PUT /api/requests/:id

Body: { "status": "in-progress", ... }### Зупинка серверів

```bash

# Delete request# Зупинити всі процеси

DELETE /api/requests/:idpkill -f 'mongod|api-server|http.server'



# Get requests stats# Або окремо

GET /api/requests/statspkill -f mongod           # MongoDB

pkill -f api-server       # API сервер

# Add commentpkill -f http.server      # Веб-сервер

POST /api/requests/:id/comment```

Body: { "text": "Comment text" }

## Технології

# Update status

PATCH /api/requests/:id/status- **Frontend**: HTML5, CSS3, JavaScript ES6+, AdminLTE, Bootstrap 4

Body: { "status": "completed" }- **Backend**: Node.js, Express.js

- **База даних**: MongoDB

# Assign technician- **Авторизація**: JWT (JSON Web Tokens)

POST /api/requests/:id/assign- **QR-коди**: Html5-qrcode, QRCode.js

Body: { "technicianId": "<user_id>" }- **Іконки**: Font Awesome

```- **Графіки**: Chart.js



## 🗄️ База даних## Розробка



### Ініціалізація### Додавання нового функціоналу

```bash1. Створіть відповідні API endpoints в `api-server.js`

# Створити тестові дані2. Додайте MongoDB схеми в папку `models/`

node scripts/init-database.js3. Створіть frontend інтерфейс в відповідній папці `pages/`

```4. Додайте утилітні функції в `assets/js/`

5. Протестуйте через тестові сторінки

Створить:

- 6 користувачів (1 admin, 1 dispatcher, 2 technicians, 2 clients)### Структура API відповідей

- 3 ліфти в Києві з геолокацією```javascript

- 3 заявки на обслуговування// Успішна відповідь

{

### MongoDB Management  "success": true,

```bash  "data": {...},

# Підключитися до MongoDB  "message": "Операція виконана успішно"

docker exec -it deapseak-mongodb mongosh deapseak}



# Backup// Помилка

docker exec deapseak-mongodb mongodump -d deapseak -o /backup{

  "success": false,

# Restore  "error": "Опис помилки",

docker exec deapseak-mongodb mongorestore -d deapseak /backup/deapseak  "code": 400

}

# Зупинити MongoDB```

docker stop deapseak-mongodb

## Документація

# Запустити MongoDB

docker start deapseak-mongodb- 📋 [План розвитку](TODO.md)

- 📊 [Звіт про QR-інтеграцію](QR-SYSTEM-INTEGRATION-REPORT.md)

# Видалити контейнер (УВАГА: видалить дані!)- 🔗 [API документація](docs/api-documentation.md)

docker stop deapseak-mongodb && docker rm deapseak-mongodb- 📖 [Технічний посібник](docs/technical-guide.md)

```

## Підтримка

## 🧪 Тестування

Для вирішення проблем:

```bash1. Перевірте статус серверів командами вище

# Комплексна перевірка системи2. Перегляньте логи: `api-server.log`, `web-server.log`, `/data/db/mongod.log`

/tmp/full-system-check.sh3. Переконайтеся що всі порти доступні

4. Використайте тестову сторінку для діагностики API

# Перевірка API

curl http://localhost:3002/health---



# Тест автентифікації**Проект DeapSeaK - Система управління ліфтами**  

curl -X POST http://localhost:3002/api/auth/login \*Версія 1.0 - MongoDB & QR інтеграція завершена*  

  -H "Content-Type: application/json" \*Дата оновлення: 30 вересня 2025*

  -d '{"login":"ctaruj78@gmail.com","password":"Solomia1704fel!"}'

# Тест з токеном
TOKEN="<your_jwt_token>"
curl http://localhost:3002/api/lifts \
  -H "Authorization: Bearer $TOKEN"
```

## 🔧 Розробка

### Запуск окремих сервісів

**MongoDB:**
```bash
docker start deapseak-mongodb
```

**Backend:**
```bash
cd /workspaces/deapseak
node backend/app.js
# або в фоні:
nohup node backend/app.js > logs/backend.log 2>&1 &
```

**Frontend:**
```bash
node frontend-server.js
# або в фоні:
nohup node frontend-server.js > logs/frontend.log 2>&1 &
```

### Логи
```bash
# Backend
tail -f logs/backend.log

# Frontend
tail -f logs/frontend.log

# MongoDB
docker logs -f deapseak-mongodb
```

### Environment Variables
Файл `.env`:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/deapseak

# JWT
JWT_SECRET=your_secret_here_ctaruj78_deapseak_2024
JWT_REFRESH_SECRET=your_refresh_secret_here_ctaruj78_deapseak_2024
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Server
V2_PORT=3002
FRONTEND_PORT=5000
NODE_ENV=development

# Email (опціонально)
EMAIL_USER=ctaruj78@gmail.com
EMAIL_PASSWORD=your_app_password_here
```

## 📚 Додаткова документація

- [MongoDB Setup Guide](MONGODB-SETUP-COMPLETE.md) - Детальна інструкція з налаштування MongoDB
- [502 Error Fix](FIX-502-ERROR.md) - Виправлення проблем з Codespaces портами

## 🎯 Функціонал

### ✅ Реалізовано
- JWT автентифікація з refresh tokens
- CRUD операції для ліфтів
- CRUD операції для заявок
- Геолокація ліфтів (MongoDB GeoJSON)
- Пошук ліфтів поблизу
- Статистика та звіти
- Фільтрація та пагінація
- Історія інспекцій
- Завантаження фото
- Система коментарів
- Призначення технічних спеціалістів
- Role-based access control (admin, dispatcher, technician, client)

### 🚧 В розробці
- Email нотифікації
- WebSocket для real-time оновлень
- Mobile app (React Native)
- QR код система для ліфтів
- Експорт звітів (PDF/Excel)

## 📞 Підтримка

Якщо виникли проблеми:
1. Перевірте логи: `tail -f logs/*.log`
2. Перезапустіть систему: `./scripts/stop-servers.sh && ./scripts/start-system.sh`
3. Перевірте порти: `lsof -i:3002,5000,27017`
4. Перевірте MongoDB: `docker ps | grep deapseak-mongodb`

## 📝 Ліцензія

MIT License - див. файл [LICENSE](LICENSE)

## 👨‍💻 Автор

**ctaruj78**
- Email: ctaruj78@gmail.com
- GitHub: [@ctaruj78](https://github.com/ctaruj78)

---

**DeapSeaK v2.0.0** - Modern Lift Management System
