# 🚀 DeapSeaK - Швидкий старт

## Автоматичний запуск системи (РЕКОМЕНДОВАНО)

### Один командний запуск:

```bash
./auto-start.sh
```

### Або через npm:

```bash
npm run auto-start
```

Цей скрипт автоматично:
- ✅ Перевірить Node.js та npm
- ✅ Запустить MongoDB (якщо не запущено)
- ✅ Встановить npm залежності (якщо потрібно)
- ✅ Створить .env файл (якщо не існує)
- ✅ Створить необхідні директорії
- ✅ Зупинить старі процеси
- ✅ Запустить всі сервери
- ✅ Перевірить що все працює

---

## Зупинка системи

```bash
./stop-servers.sh
```

або

```bash
npm run stop
```

---

## Перезапуск системи

```bash
npm run restart
```

---

## Що буде запущено?

| Сервіс | Порт | URL |
|--------|------|-----|
| **Frontend** | 5000 | http://localhost:5000 |
| **API Server** | 3001 | http://localhost:3001/api |
| **WebSocket** | 3002 | ws://localhost:3002 |
| **MongoDB** | 27017 | mongodb://localhost:27017 |

---

## Швидкі посилання

- 🔐 **Логін:** http://localhost:5000/login.html
- 📝 **Реєстрація:** http://localhost:5000/register.html
- 👨‍💼 **Адмін:** http://localhost:5000/pages/admin/
- 📞 **Диспетчер:** http://localhost:5000/pages/dispatcher/
- 🔧 **Технік:** http://localhost:5000/pages/tech/
- 👤 **Клієнт:** http://localhost:5000/pages/client/

---

## Корисні команди

### Переглянути логи
```bash
# Всі логи разом
tail -f logs/*.log

# Тільки API
tail -f logs/api-server.log

# Тільки WebSocket
tail -f logs/websocket-server.log

# MongoDB
tail -f mongodb/logs/mongod.log
```

### Перевірити статус
```bash
# API
curl http://localhost:3001/api/health

# MongoDB
pgrep mongod

# Які порти зайняті
lsof -i :3001 -i :3002 -i :5000
```

### Очистити логи
```bash
rm -rf logs/*.log
```

---

## Вирішення проблем

### MongoDB не запускається?

**Варіант 1: Системний MongoDB**
```bash
sudo systemctl start mongod
sudo systemctl status mongod
```

**Варіант 2: Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo
```

**Варіант 3: Локальний MongoDB в проекті**
```bash
# Скрипт автоматично спробує запустити локальний MongoDB
./auto-start.sh
```

---

### Порт вже зайнятий?

```bash
# Дізнатися який процес
lsof -i :3001

# Вбити процес
kill -9 $(lsof -t -i:3001)

# Або через скрипт
./stop-servers.sh
```

---

### npm залежності не встановлюються?

```bash
# Очистити кеш
npm cache clean --force

# Видалити node_modules
rm -rf node_modules package-lock.json

# Встановити заново
npm install
```

---

### Сервери не відповідають?

1. Перевірте логи:
```bash
tail -f logs/api-server.log
```

2. Перевірте .env файл:
```bash
cat .env
```

3. Перезапустіть систему:
```bash
npm run restart
```

---

## Режими запуску

### Режим 1: Автоматичний (рекомендовано)
```bash
./auto-start.sh
```
- Запускає все в фоні
- Виводить статус та посилання
- Створює PID файли для управління

### Режим 2: З моніторингом
```bash
./auto-start.sh --wait
```
- Запускає все в фоні
- **Залишається активним** для моніторингу
- Автоматично перезапускає при падінні
- Натисніть Ctrl+C для зупинки

### Режим 3: Development (з nodemon)
```bash
npm run dev:all
```
- Auto-reload при зміні коду
- Логи в терміналі
- Ctrl+C для зупинки

### Режим 4: Ручний
```bash
# Термінал 1: API
node api-server.js

# Термінал 2: WebSocket
node websocket-server.js

# Термінал 3: Frontend
node frontend-server.js
```

---

## Структура логів

```
logs/
├── api-server.log          # Логи API сервера
├── websocket-server.log    # Логи WebSocket
├── frontend-server.log     # Логи Frontend
├── API_Server.pid          # PID файл API
├── WebSocket_Server.pid    # PID WebSocket
└── Frontend_Server.pid     # PID Frontend

mongodb/logs/
└── mongod.log             # Логи MongoDB
```

---

## Demo акаунти

Після першого запуску створюються тестові акаунти:

| Роль | Email | Пароль |
|------|-------|--------|
| Адмін | admin@deapseak.com | admin123 |
| Диспетчер | dispatcher@deapseak.com | dispatcher123 |
| Технік | tech@deapseak.com | tech123 |
| Клієнт | client@deapseak.com | client123 |

---

## Налаштування .env

Основні параметри:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/deapseak

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=24h

# Server
PORT=3001
NODE_ENV=development

# Email (опціонально)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## Підтримка

Якщо виникають проблеми:

1. **Перевірте логи:** `tail -f logs/*.log`
2. **Перезапустіть:** `npm run restart`
3. **Очистіть та перезапустіть:**
   ```bash
   ./stop-servers.sh
   rm -rf logs/*.log
   ./auto-start.sh
   ```

---

## Чеклист перед запуском

- [ ] Node.js встановлено (v14+)
- [ ] MongoDB встановлено або Docker доступний
- [ ] Порти 3001, 3002, 5000 вільні
- [ ] npm залежності встановлено
- [ ] .env файл налаштовано

Якщо все зелене - запускайте:
```bash
./auto-start.sh
```

**🎉 Готово!** Відкрийте http://localhost:5000

