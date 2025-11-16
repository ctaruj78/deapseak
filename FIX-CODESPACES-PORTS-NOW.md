# 🚨 ТЕРМІНОВЕ ВИПРАВЛЕННЯ ПОРТІВ CODESPACES

## ❌ Проблема:
```
HTTP/2 502 Bad Gateway
Failed to fetch
```

Порт **3001** НЕ опублікований в GitHub Codespaces.

---

## ✅ РІШЕННЯ (2 хвилини):

### Метод 1: Через VS Code UI (РЕКОМЕНДОВАНО)

#### Крок 1: Відкрити панель PORTS
1. Натисніть **`Ctrl+J`** (або **`Cmd+J`** на Mac)
2. Внизу екрану з'явиться панель
3. Клікніть на вкладку **"PORTS"** (біля Terminal, Problems, Output)

![Приклад](https://i.imgur.com/example.png)

#### Крок 2: Знайти порт 3001
Ви побачите список портів:
```
PORT    | VISIBILITY | LABEL
--------|------------|------------------
3001    | Private    | Backend API       ← ЗНАЙТИ ЦЕЙ
3002    | Private    | WebSocket Server
5000    | Public     | Frontend
27017   | Private    | MongoDB
```

#### Крок 3: Зробити порт 3001 PUBLIC
1. **Знайдіть рядок з портом `3001`**
2. **Клікніть ПРАВОЮ кнопкою миші** на цей рядок
3. В меню виберіть: **"Port Visibility"**
4. Клікніть: **"Public"**

✅ Тепер порт має показувати: `Public 🌐`

#### Крок 4: Повторити для порту 3002
1. Знайдіть порт **3002** (WebSocket)
2. Правий клік → Port Visibility → **Public**

#### Крок 5: Перевірити порт 5000
Переконайтесь що порт **5000** також **Public**

---

### Метод 2: Через Command Palette

1. **`Ctrl+Shift+P`** (або **`Cmd+Shift+P`** на Mac)
2. Введіть: `Ports: Focus on Ports View`
3. Enter
4. Потім виконайте Метод 1 (кроки 2-5)

---

## 🔍 Перевірка

### 1. В VS Code:
Після зміни видимості в панелі PORTS має бути:
```
PORT    | VISIBILITY      | LABEL
--------|-----------------|------------------
3001    | Public 🌐       | Backend API       ✅
3002    | Public 🌐       | WebSocket Server  ✅
5000    | Public 🌐       | Frontend          ✅
```

### 2. В терміналі:
```bash
# Тест локально (має працювати)
curl http://localhost:3001/health
# Очікується: {"status":"ok",...}

# Тест через публічний URL (тепер має працювати)
curl https://redesigned-waddle-v6w5g7rvxqpxf6pwg-3001.app.github.dev/health
# Очікується: {"status":"ok",...}
```

### 3. В браузері:
1. Відкрийте: `https://redesigned-waddle-v6w5g7rvxqpxf6pwg-5000.app.github.dev`
2. Натисніть **`Ctrl+Shift+R`** (hard reload)
3. Відкрийте Console (F12)
4. Спробуйте завантажити контракт
5. **НЕ має бути** помилок "Failed to fetch"

---

## 🎯 Публічні URL (після виправлення):

```
Frontend:  https://redesigned-waddle-v6w5g7rvxqpxf6pwg-5000.app.github.dev
Backend:   https://redesigned-waddle-v6w5g7rvxqpxf6pwg-3001.app.github.dev
WebSocket: https://redesigned-waddle-v6w5g7rvxqpxf6pwg-3002.app.github.dev
```

---

## ⚠️ ВАЖЛИВО

### Чому gh CLI не працює:
```bash
gh codespace ports visibility 3001:public
# Команда не виконується через обмеження Codespaces
```

**Єдиний спосіб** - через VS Code UI (панель PORTS).

### Чому порт Private:
GitHub Codespaces **за замовчуванням** робить всі порти приватними для безпеки. Треба вручну змінити на Public для CORS запитів між портами.

---

## 📹 Покрокова інструкція (з картинками)

### 1. Панель PORTS:
```
┌─────────────────────────────────────────┐
│ TERMINAL │ PROBLEMS │ OUTPUT │ PORTS ← │
├─────────────────────────────────────────┤
│ PORT │ VISIBILITY │ LABEL              │
│ 3001 │ Private    │ Backend API    ←── │ КЛІКНУТИ ПРАВОЮ
│ 3002 │ Private    │ WebSocket          │
│ 5000 │ Public 🌐  │ Frontend           │
└─────────────────────────────────────────┘
```

### 2. Меню після правого кліку:
```
┌──────────────────────────────┐
│ Forward Port                 │
│ Stop Forwarding Port         │
│ Copy Local Address           │
│ ► Port Visibility         ← ВИБРАТИ
│   ├─ Public              ← КЛІКНУТИ
│   └─ Private                 │
│ Change Port Label            │
│ Open in Browser              │
└──────────────────────────────┘
```

### 3. Результат:
```
┌─────────────────────────────────────────┐
│ PORT │ VISIBILITY      │ LABEL          │
│ 3001 │ Public 🌐       │ Backend API    │ ✅
│ 3002 │ Public 🌐       │ WebSocket      │ ✅
│ 5000 │ Public 🌐       │ Frontend       │ ✅
└─────────────────────────────────────────┘
```

---

## 🐛 Якщо досі не працює

### 1. Перезапустити backend:
```bash
npm run stop
npm run auto-start
```

### 2. Hard reload браузера:
- Windows/Linux: **`Ctrl+Shift+R`**
- Mac: **`Cmd+Shift+R`**
- Або: **`Ctrl+F5`**

### 3. Очистити кеш:
```javascript
// В консолі браузера (F12)
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

### 4. Перевірити backend логи:
```bash
tail -f logs/backend-server.log
# Шукайте: "CORS Request from origin"
```

---

## ✅ ОЧІКУВАНИЙ РЕЗУЛЬТАТ

### В Console (F12):
```javascript
🌐 Codespaces detected - Backend URL: https://....-3001.app.github.dev
📤 Uploading contract to: https://....-3001.app.github.dev/api/lifts/.../contract
📦 File: contract.pdf Size: 1234
✅ Контракт успішно завантажено!
```

### БЕЗ помилок:
- ❌ ~Failed to fetch~
- ❌ ~CORS policy~
- ❌ ~502 Bad Gateway~
- ❌ ~net::ERR_FAILED~

---

## 📞 ПОТРІБНА ДОПОМОГА?

Якщо після виконання всіх кроків проблема залишається:

1. **Перевірте чи backend працює:**
   ```bash
   ps aux | grep "node backend"
   curl http://localhost:3001/health
   ```

2. **Перевірте логи:**
   ```bash
   tail -100 logs/backend-server.log
   ```

3. **Створіть screenshot** панелі PORTS і надішліть

---

## 🎉 ГОТОВО!

Після виконання цих кроків:
- ✅ Порт 3001 публічний
- ✅ Порт 3002 публічний  
- ✅ Порт 5000 публічний
- ✅ CORS працює
- ✅ Завантаження контрактів працює
- ✅ Всі API запити працюють

**Тепер спробуйте завантажити контракт!** 🚀

---

*Останнє оновлення: 16.11.2025*
