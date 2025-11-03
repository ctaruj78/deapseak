# 📦 Інструкція з встановлення DEAPSEAK

## Вимоги

- Node.js 18+ 
- MongoDB 6.0+
- npm або yarn

## Крок 1: Клонування репозиторію

```bash
git clone https://github.com/your-username/deapseak.git
cd deapseak
```

## Крок 2: Встановлення залежностей

```bash
# Видаліть старі файли (якщо є)
rm -rf node_modules package-lock.json

# Встановіть залежності
npm install
```

## Крок 3: Встановлення MongoDB

### Варіант A: Docker (рекомендовано)

```bash
docker run -d --name mongodb-deapseak -p 27017:27017 mongo:6.0
```

### Варіант B: Локальна установка (Ubuntu)

```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Крок 4: Налаштування змінних середовища

Створіть файл `.env` в кореневій директорії:

```bash
cat > .env << 'EOF'
# Database
MONGODB_URI=mongodb://localhost:27017/deapseak

# Server
NODE_ENV=development
PORT=3001
WS_PORT=3002

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# Logging
LOG_LEVEL=info
EOF
```

## Крок 5: Запуск проекту

```bash
# Запуск в development режимі (API + WebSocket)
npm run dev

# Або окремо:
npm run start      # Тільки API сервер
npm run websocket  # Тільки WebSocket сервер
```

## Крок 6: Перевірка роботи

```bash
# Перевірте API
curl http://localhost:3001/api/health

# Перевірте порти
netstat -tlnp | grep -E "(3001|3002)"
```

## Доступ до системи

- **API**: http://localhost:3001
- **WebSocket**: ws://localhost:3002
- **Адмін**: admin@deapseak.com / admin123

## Тестування

```bash
npm test
```

## Troubleshooting

### MongoDB не підключається

```bash
# Перевірте чи працює MongoDB
docker ps | grep mongo
# або
sudo systemctl status mongod

# Переглянути логи
docker logs mongodb-deapseak
```

### Порти зайняті

```bash
# Знайдіть процеси на портах
lsof -i :3001
lsof -i :3002

# Вбийте процес
kill -9 <PID>
```

### Проблеми з залежностями

```bash
# Очистіть все і перевстановіть
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## Production Deployment

1. Змініть `JWT_SECRET` на унікальний випадковий ключ
2. Встановіть `NODE_ENV=production`
3. Використовуйте HTTPS
4. Налаштуйте firewall правила
5. Використовуйте process manager (PM2)

```bash
npm install -g pm2
pm2 start api-server.js --name "deapseak-api"
pm2 start websocket-server.js --name "deapseak-ws"
pm2 save
pm2 startup
```

## Підтримка

- Email: support@deapseak.com
- GitHub Issues: https://github.com/your-username/deapseak/issues