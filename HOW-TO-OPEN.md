# ⚠️ ВАЖЛИВО: Як правильно відкривати DeapSeaK

## ❌ НЕПРАВИЛЬНО - Посилання не працюють!

Якщо ви відкриваєте файл напряму з провідника:
```
file:///workspaces/deapseak/index.html
```

**Проблема:** Браузер блокує JavaScript та переходи між сторінками з міркувань безпеки (CORS policy).

**Симптоми:**
- ❌ Кнопки "Вхід", "Реєстрація" не працюють
- ❌ "Demo", "AI Асистент" не відкриваються
- ❌ Console shows: "Cross-Origin Request Blocked"
- ❌ API запити не виконуються

---

## ✅ ПРАВИЛЬНО - Через веб-сервер!

### Варіант 1: Автоматичний запуск (РЕКОМЕНДОВАНО)

```bash
./autostart.sh
```

**Що робить скрипт:**
1. ✅ Зупиняє старі процеси
2. ✅ Запускає MongoDB автоматично
3. ✅ Встановлює залежності якщо потрібно
4. ✅ Запускає Unified Server на PORT 5000
5. ✅ Показує правильний URL для відкриття
6. ✅ Намагається автоматично відкрити браузер

**Потім відкрийте:**
```
http://localhost:5000
```

---

### Варіант 2: Ручний запуск

```bash
# 1. Запустити MongoDB
mongod --dbpath ~/mongodb-data --fork --logpath ~/mongodb-data/mongod.log

# 2. Запустити сервер
./start-unified.sh

# 3. Відкрити в браузері
http://localhost:5000
```

---

### Варіант 3: GitHub Codespaces

```bash
./autostart.sh
```

**Відкрийте URL:**
```
https://<YOUR-CODESPACE-NAME>-5000.app.github.dev
```

Скрипт автоматично покаже правильний URL! 🎉

---

## 🔍 Як перевірити що все працює

### 1. Перевірити чи сервер запущено:
```bash
curl http://localhost:5000/api/health
```

**Правильна відповідь:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-06T...",
  "port": 5000,
  "mode": "unified"
}
```

### 2. Перевірити чи сторінки доступні:
```bash
curl -I http://localhost:5000/pages/auth/login.html
```

**Правильна відповідь:**
```
HTTP/1.1 200 OK
```

### 3. Відкрити в браузері:
```
http://localhost:5000
```

**Перевірити:**
- ✅ Кнопка "Вхід" відкриває `/pages/auth/login.html`
- ✅ Кнопка "Реєстрація" відкриває `/pages/auth/register.html`
- ✅ "Demo" відкриває `/pages/crm-demo.html`
- ✅ "AI Асистент" відкриває `/pages/ai-demo.html`
- ✅ Всі посилання працюють!

---

## 🎯 Типові помилки

### Помилка 1: "Connection refused"
```
curl: (7) Failed to connect to localhost port 5000: Connection refused
```

**Рішення:**
```bash
# Сервер не запущено! Запустіть:
./autostart.sh
```

---

### Помилка 2: "404 Not Found"
```
curl http://localhost:5000/pages/auth/login.html
404 Not Found
```

**Рішення:**
```bash
# Перевірте чи файл існує:
ls -la /workspaces/deapseak/pages/auth/login.html

# Перевірте логи сервера:
tail -f logs/unified-server.log
```

---

### Помилка 3: Відкрито `file:///` замість `http://`

**Симптом:** В адресному рядку браузера:
```
file:///workspaces/deapseak/index.html  ❌ НЕПРАВИЛЬНО!
```

**Рішення:**
```
http://localhost:5000  ✅ ПРАВИЛЬНО!
```

---

### Помилка 4: Порт 3001 замість 5000

**Симптом:** Сервер запустився на PORT 3001

**Рішення:**
```bash
# Використовуйте ./autostart.sh або ./start-unified.sh
# Вони встановлюють DEAPSEAK_PORT=5000

# НЕ запускайте напряму:
node unified-server.js  ❌ (буде PORT 3001 в Codespaces)

# Використовуйте скрипт:
./autostart.sh  ✅ (завжди PORT 5000)
```

---

## 📚 Шляхи до важливих сторінок

Всі шляхи відносно `http://localhost:5000`:

| Сторінка | URL |
|----------|-----|
| **Головна** | `/` або `/index.html` |
| **Логін** | `/pages/auth/login.html` |
| **Реєстрація** | `/pages/auth/register.html` |
| **Demo CRM** | `/pages/crm-demo.html` |
| **AI Асистент Demo** | `/pages/ai-demo.html` |
| **Admin Panel** | `/pages/admin/dashboard.html` |
| **Technician** | `/pages/tech/dashboard.html` |
| **Client** | `/pages/client/dashboard.html` |
| **Dispatcher** | `/pages/dispatcher/dashboard.html` |
| **QR Scanner** | `/pages/qr/qr-scanner.html` |

---

## 🚀 Швидкий старт для нових користувачів

### Крок 1: Запуск системи
```bash
cd /workspaces/deapseak
./autostart.sh
```

### Крок 2: Дочекатися повідомлення
```
✅ СИСТЕМА УСПІШНО ЗАПУЩЕНА!
🌐 URL: http://localhost:5000
```

### Крок 3: Відкрити в браузері
```
http://localhost:5000
```

### Крок 4: Увійти з demo акаунтом
```
Email: info@festlift.pt
Password: admin123
```

---

## ✅ Checklist

Перед тим як писати "не працює", перевірте:

- [ ] Сервер запущено через `./autostart.sh` або `./start-unified.sh`
- [ ] MongoDB запущено (`pgrep mongod`)
- [ ] Сервер на PORT 5000 (`curl http://localhost:5000/api/health`)
- [ ] Відкриваєте `http://localhost:5000`, а не `file:///...`
- [ ] Браузер підтримує JavaScript (не text-browser)
- [ ] Немає блокування від firewall
- [ ] В консолі браузера немає CORS помилок

---

## 🆘 Допомога

Якщо все ще не працює:

1. **Зберіть діагностичну інформацію:**
```bash
echo "=== Processes ===" && ps aux | grep -E "mongod|unified-server"
echo "=== Ports ===" && lsof -i :5000
echo "=== Health ===" && curl http://localhost:5000/api/health
echo "=== Logs ===" && tail -20 logs/unified-server.log
```

2. **Повний перезапуск:**
```bash
pkill -f "node.*unified-server" && pkill -f mongod
sleep 2
./autostart.sh
```

3. **Читайте документацію:**
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [STARTUP-FIX-COMPLETE.md](STARTUP-FIX-COMPLETE.md)
- [README.md](README.md)

---

**Пам'ятайте:** Завжди використовуйте `http://localhost:5000`, а не відкривайте файли напряму! 🎯
