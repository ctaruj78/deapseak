# DeapSeaK v2 - MongoDB Setup Complete! ✅

## 🎉 Готово! Все налаштовано та працює

### ✅ Що виконано:

1. **MongoDB 7.0** встановлено в Docker контейнері
   - Контейнер: `deapseak-mongodb`
   - Порт: `27017`
   - Автоматичний запуск: `--restart unless-stopped`

2. **База даних** ініціалізована з тестовими даними:
   - 6 користувачів (admin, dispatcher, 2 техніки, 2 клієнти)
   - 3 ліфти в Києві
   - 3 заявки на обслуговування

3. **Backend сервер** запущено на порті **3002**
   - API endpoints працюють
   - JWT автентифікація активна
   - MongoDB підключено

### 🔐 Ваші облікові дані

#### 👑 ADMIN (Ваш акаунт):
```
Username: ctaruj78
Email: ctaruj78@gmail.com
Password: Solomia1704fel!
```

#### 📋 Dispatcher:
```
Username: dispatcher1
Email: dispatcher@deapseak.com
Password: dispatcher123
```

#### 🔧 Technicians:
```
Username: technician1
Email: tech1@deapseak.com
Password: tech123

Username: technician2
Email: tech2@deapseak.com
Password: tech123
```

#### 👥 Clients:
```
Username: client1
Email: client1@example.com
Password: client123

Username: client2
Email: client2@example.com
Password: client123
```

### 🚀 Як використовувати API

#### 1. Вхід (отримання токена)
```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "ctaruj78@gmail.com",
    "password": "Solomia1704fel!"
  }'
```

#### 2. Отримання списку ліфтів
```bash
# Спочатку отримайте токен з попереднього запиту
TOKEN="your-jwt-token-here"

curl http://localhost:3002/api/lifts \
  -H "Authorization: Bearer $TOKEN"
```

#### 3. Створення нової заявки
```bash
curl -X POST http://localhost:3002/api/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lift": "LIFT_ID_HERE",
    "title": "Проблема з ліфтом",
    "description": "Опис проблеми...",
    "priority": "high"
  }'
```

### 📊 Доступні API Endpoints

```
POST   /api/auth/register         - Реєстрація
POST   /api/auth/login            - Вхід
GET    /api/auth/profile          - Профіль
PUT    /api/auth/profile          - Оновити профіль
GET    /api/auth/users            - Список користувачів (admin)

GET    /api/lifts                 - Список ліфтів
GET    /api/lifts/:id             - Деталі ліфта
POST   /api/lifts                 - Створити ліфт (admin/dispatcher)
PUT    /api/lifts/:id             - Оновити ліфт
GET    /api/lifts/stats           - Статистика

GET    /api/requests              - Список заявок
GET    /api/requests/:id          - Деталі заявки
POST   /api/requests              - Створити заявку
POST   /api/requests/:id/assign   - Призначити техніка
PATCH  /api/requests/:id/status   - Змінити статус
POST   /api/requests/:id/comment  - Додати коментар
POST   /api/requests/:id/complete - Завершити заявку
```

### 🐳 Docker команди для MongoDB

```bash
# Перевірити статус
docker ps | grep deapseak-mongodb

# Подивитись логи
docker logs deapseak-mongodb

# Зупинити
docker stop deapseak-mongodb

# Запустити знову
docker start deapseak-mongodb

# Видалити контейнер
docker rm -f deapseak-mongodb

# Повністю перезапустити з чистою базою
docker rm -f deapseak-mongodb
rm -rf /workspaces/deapseak/mongodb/data/*
docker run -d --name deapseak-mongodb -p 27017:27017 \
  -v /workspaces/deapseak/mongodb/data:/data/db \
  --restart unless-stopped mongo:7.0
```

### 🔄 Управління backend сервером

```bash
# Запустити
cd /workspaces/deapseak
node backend/app.js

# У фоні
node backend/app.js > /tmp/backend.log 2>&1 &

# Подивитись логи (якщо в фоні)
tail -f /tmp/backend.log

# Зупинити
pkill -f "node backend/app.js"

# Перезапустити
pkill -f "node backend/app.js" && sleep 2 && node backend/app.js &
```

### 📁 Важливі файли

```
.env                              # Конфігурація (MongoDB URI, JWT secret, тощо)
backend/app.js                    # Головний файл сервера
backend/models/                   # MongoDB моделі
backend/controllers/              # Бізнес-логіка
backend/routes/                   # API маршрути
scripts/init-database.js          # Скрипт ініціалізації БД
mongodb/                          # Дані MongoDB
```

### 🛠️ Корисні команди

```bash
# Переініціалізувати базу даних
node scripts/init-database.js

# Перевірити підключення до MongoDB
docker exec -it deapseak-mongodb mongosh --eval "db.version()"

# Подивитись користувачів в БД
docker exec -it deapseak-mongodb mongosh deapseak --eval "db.users.find().pretty()"

# Подивитись ліфти
docker exec -it deapseak-mongodb mongosh deapseak --eval "db.lifts.find().pretty()"
```

### ⚠️ Примітки

1. **Старий api-server.js** (порт 3001) - НЕ ЧІПАВСЯ, працює як раніше
2. **Новий v2 backend** (порт 3002) - працює паралельно з MongoDB
3. **MongoDB** запускається автоматично при старті Docker
4. **Дані зберігаються** в `/workspaces/deapseak/mongodb/data`

### 🎯 Наступні кроки

1. Інтегрувати frontend з новим API (порт 3002)
2. Поступово мігрувати функції зі старого api-server.js
3. Тестувати всі можливості нового API
4. Налаштувати production environment

---

**Створено:** 2025-11-09  
**MongoDB Version:** 7.0  
**Backend Port:** 3002  
**Статус:** ✅ Працює
