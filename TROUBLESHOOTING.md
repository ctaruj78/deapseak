# 🔧 Troubleshooting Guide - Вирішення проблем запуску

## ❌ Проблема: Сервер не запускається або працює на PORT 3001

### 🎯 Причина
GitHub Codespaces **автоматично встановлює системну змінну `PORT=3001`**, яка має вищий пріоритет ніж `.env` файл!

### ✅ Рішення

**1. Завжди використовуйте скрипт запуску:**
```bash
./start-unified.sh
```

**2. Якщо запускаєте вручну:**
```bash
export DEAPSEAK_PORT=5000
node unified-server.js
```

**3. Перевірте чи сервер запустився на правильному порту:**
```bash
curl http://localhost:5000/api/health
# Має повернути: {"status":"ok","port":5000,"mode":"unified"}
```

---

## ❌ Проблема: MongoDB не запускається

### 🔍 Діагностика
```bash
pgrep -fl mongod
# Якщо нічого не виводить - MongoDB не запущено
```

### ✅ Рішення 1: Автоматичний запуск
```bash
mkdir -p ~/mongodb-data
mongod --dbpath ~/mongodb-data --fork --logpath ~/mongodb-data/mongod.log
```

### ✅ Рішення 2: Перевірити логи
```bash
tail -50 ~/mongodb-data/mongod.log
```

### ⚠️ Типові помилки:

**Помилка: "Address already in use"**
```bash
# Знайти процес на порту 27017
lsof -i :27017
# Вбити старий процес
kill -9 <PID>
```

**Помилка: "Permission denied"**
```bash
# Виправити права доступу
chmod -R 755 ~/mongodb-data
```

---

## ❌ Проблема: Сервер запустився але не відповідає

### 🔍 Діагностика
```bash
# Перевірити чи процес працює
ps aux | grep "node.*unified-server"

# Перевірити логи
tail -30 logs/unified-server.log
```

### ✅ Можливі причини:

**1. Конфлікт портів:**
```bash
# Перевірити хто використовує порт 5000
lsof -i :5000
# Зупинити конфліктний процес
pkill -f "node.*unified-server"
```

**2. MongoDB не підключено:**
```bash
# Перевірити чи MongoDB доступний
mongosh --eval "db.version()"
```

**3. Помилки в коді:**
```bash
# Дивитися логи в реальному часі
tail -f logs/unified-server.log
```

---

## ❌ Проблема: "npm install" помилки

### ✅ Рішення:
```bash
# Очистити кеш npm
npm cache clean --force

# Видалити node_modules і package-lock.json
rm -rf node_modules package-lock.json

# Встановити заново
npm install
```

---

## ❌ Проблема: Codespaces URL не працює

### 🔍 Діагностика
```bash
# Перевірити чи порт 5000 forwarded
gh codespace ports
```

### ✅ Рішення:
```bash
# Зробити порт публічним
gh codespace ports visibility 5000:public

# Або через UI: PORTS tab → right click 5000 → Port Visibility → Public
```

**Правильний URL формат:**
```
https://<CODESPACE_NAME>-5000.app.github.dev
```

---

## ❌ Проблема: CORS помилки в браузері

### ✅ Рішення:
Перевірте чи `unified-server.js` має правильні CORS налаштування:

```javascript
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || 
            origin.includes('localhost') || 
            origin.includes('github.dev') ||
            origin.includes('app.github.dev')) {
            callback(null, true);
        } else {
            callback(null, true); // В dev режимі дозволяємо все
        }
    },
    credentials: true
}));
```

---

## ❌ Проблема: "Cannot find module" помилки

### ✅ Рішення:
```bash
# Перевірити чи всі залежності встановлені
npm list --depth=0

# Встановити відсутні залежності
npm install express mongoose cors bcrypt jsonwebtoken multer dotenv socket.io
```

---

## 🔧 Повна процедура перезапуску

**Якщо нічого не допомагає, виконайте повний restart:**

```bash
# 1. Зупинити все
pkill -f "node.*unified-server"
pkill -f mongod

# 2. Очистити логи
rm -rf logs/*
mkdir -p logs

# 3. Запустити MongoDB
mkdir -p ~/mongodb-data
mongod --dbpath ~/mongodb-data --fork --logpath ~/mongodb-data/mongod.log

# 4. Перевірити MongoDB
sleep 3
pgrep -fl mongod

# 5. Запустити сервер
./start-unified.sh

# 6. Перевірити статус
curl http://localhost:5000/api/health
```

---

## 📊 Корисні команди діагностики

```bash
# Перевірити всі процеси DeapSeaK
ps aux | grep -E "node|mongod"

# Перевірити порти
lsof -i :5000
lsof -i :27017

# Перевірити змінні оточення
env | grep -E "PORT|DEAPSEAK"

# Перевірити розмір логів
du -sh logs/*.log

# Останні 50 рядків логу
tail -50 logs/unified-server.log

# Фільтрувати тільки помилки
grep -i "error\|❌" logs/unified-server.log
```

---

## 🆘 Якщо нічого не допомагає

**1. Збір інформації для debug:**
```bash
# Створити debug звіт
cat > debug-report.txt << EOF
=== System Info ===
$(uname -a)
Node: $(node --version)
npm: $(npm --version)

=== Environment ===
$(env | grep -E "PORT|DEAPSEAK|MONGODB")

=== Processes ===
$(ps aux | grep -E "node|mongod")

=== Ports ===
$(lsof -i :5000 2>&1)
$(lsof -i :27017 2>&1)

=== Logs ===
$(tail -50 logs/unified-server.log 2>&1)
$(tail -20 ~/mongodb-data/mongod.log 2>&1)
EOF

cat debug-report.txt
```

**2. Відправити debug звіт розробнику**

**3. Або створити issue на GitHub з вмістом `debug-report.txt`**

---

## ✅ Checklist перед запуском

- [ ] MongoDB запущено: `pgrep mongod`
- [ ] PORT 5000 вільний: `lsof -i :5000` (має бути пусто)
- [ ] node_modules встановлено: `ls -d node_modules`
- [ ] .env файл існує: `cat .env | grep DEAPSEAK_PORT`
- [ ] Скрипт виконуваний: `ls -l start-unified.sh` (має бути `rwxr-xr-x`)
- [ ] Змінна DEAPSEAK_PORT=5000: `echo $DEAPSEAK_PORT`

**Якщо всі галочки ✅, запускайте:**
```bash
./start-unified.sh
```

---

## 📚 Додаткові ресурси

- [QUICK-START.md](QUICK-START.md) - Детальний гайд по запуску
- [PORT-CONFIGURATION-FINAL.md](PORT-CONFIGURATION-FINAL.md) - Конфігурація портів
- [README.md](README.md) - Основна документація

---

**Останнє оновлення:** 6 грудня 2024
**Версія:** DeapSeaK v2 Unified Server
