# 🔧 ВИПРАВЛЕННЯ CORS У GITHUB CODESPACES

## ❌ Проблема

```
Access to fetch at 'https://...3002.app.github.dev/api/lifts' 
from origin 'https://...5000.app.github.dev' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Причина**: Порт 3002 (Backend API) **ПРИВАТНИЙ** у GitHub Codespaces і повертає `401 Unauthorized` при спробі CORS preflight запиту.

---

## ✅ РІШЕННЯ: Зробити Порти Публічними

### 📋 Крок 1: Відкрити Панель PORTS

**Варіант A: Через клавіатуру**
```
Натисніть: Ctrl+` (або Ctrl+J)
```

**Варіант B: Через меню**
```
View → Terminal → Ports (вкладка)
```

Ви побачите таблицю з портами:

```
╔═══════╦══════════╦═══════════════════════════════════════╗
║ Port  ║ Visibility ║ Label / URL                        ║
╠═══════╬══════════╬═══════════════════════════════════════╣
║ 3002  ║ Private  ║ Backend API v2                      ║
║ 5000  ║ Private  ║ Frontend Server                     ║
║ 27017 ║ Private  ║ MongoDB Database                    ║
╚═══════╩══════════╩═══════════════════════════════════════╝
```

---

### 🔓 Крок 2: Зробити Порт 3002 PUBLIC

1. **Знайдіть рядок з портом `3002`**
2. **Клікніть ПРАВОЮ кнопкою миші** на цей рядок
3. У контекстному меню виберіть: **`Port Visibility`**
4. Виберіть: **`Public`**

**Результат:**
```
✅ Port 3002: Public 🌐
```

---

### 🔓 Крок 3: Зробити Порт 5000 PUBLIC

1. **Знайдіть рядок з портом `5000`**
2. **Клікніть ПРАВОЮ кнопкою миші** на цей рядок
3. У контекстному меню виберіть: **`Port Visibility`**
4. Виберіть: **`Public`**

**Результат:**
```
✅ Port 5000: Public 🌐
```

---

### 🔄 Крок 4: Перезавантажити Сторінку

У браузері натисніть:
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

Це зробить **hard reload** і очистить кеш CORS помилок.

---

## 🎯 Перевірка Результату

Після виконання кроків панель PORTS має виглядати так:

```
╔═══════╦══════════╦══════════════════════════════════════════╗
║ Port  ║ Visibility ║ Label / URL                            ║
╠═══════╬══════════╬══════════════════════════════════════════╣
║ 3002  ║ Public 🌐 ║ Backend API v2                         ║
║ 5000  ║ Public 🌐 ║ Frontend Server                        ║
║ 27017 ║ Private   ║ MongoDB Database (має бути приватним)  ║
╚═══════╩══════════╩══════════════════════════════════════════╝
```

### ✅ Тест CORS

Відкрийте консоль браузера (F12) та виконайте:

```javascript
fetch('https://redesigned-waddle-v6w5g7rvxqpxf6pwg-3002.app.github.dev/api/lifts', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('liftmanager_jwt')}`
  }
})
.then(r => console.log('✅ CORS працює!', r.status))
.catch(e => console.error('❌ CORS помилка:', e));
```

**Очікуваний результат:**
```
✅ CORS працює! 200
```

---

## 🔧 Альтернативний Метод: Через gh CLI

Якщо UI метод не працює, спробуйте через термінал:

```bash
# Зробити порт 3002 публічним
gh codespace ports visibility 3002:public -c $CODESPACE_NAME

# Зробити порт 5000 публічним
gh codespace ports visibility 5000:public -c $CODESPACE_NAME

# Перевірити статус портів
gh codespace ports -c $CODESPACE_NAME | grep -E "3002|5000"
```

**Очікуваний вивід:**
```
3002   public   https://redesigned-waddle-v6w5g7rvxqpxf6pwg-3002.app.github.dev
5000   public   https://redesigned-waddle-v6w5g7rvxqpxf6pwg-5000.app.github.dev
```

---

## 🚨 Типові Помилки

### Помилка 1: "Port not forwarded"
```
error updating port 3002 to public: error getting tunnel port: 
error sending get tunnel port request: unsuccessful request, response: 404 Not Found
```

**Рішення:** Порт не форвардиться. Перезапустіть сервер:
```bash
./stop-servers.sh
./auto-start.sh
```

### Помилка 2: "401 Unauthorized" все ще
```
GET https://...3002.app.github.dev/api/lifts net::ERR_FAILED 401
```

**Рішення:** Порт все ще приватний. Перевірте visibility ще раз через UI.

### Помилка 3: CORS помилка після зміни visibility
```
No 'Access-Control-Allow-Origin' header is present
```

**Рішення:** 
1. Зробіть hard reload (Ctrl+Shift+R)
2. Очистіть кеш браузера
3. Перезапустіть Backend: `pkill -f "node backend/app.js" && node backend/app.js &`

---

## 📊 Що Було Виправлено

### Конфігурація
- ✅ `.devcontainer/devcontainer.json` - додано порти 3002, 5000 як публічні
- ✅ `backend/app.js` - покращено CORS з логуванням origin
- ✅ `setup-codespaces-ports.sh` - оновлено для нових портів

### CORS Заголовки (backend/app.js)
```javascript
Access-Control-Allow-Origin: https://...5000.app.github.dev
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With,Accept
Access-Control-Max-Age: 86400
```

### Явна Обробка OPTIONS
```javascript
app.options('*', cors(corsOptions));
```

---

## 🎓 Пояснення

### Чому це потрібно?

**GitHub Codespaces** автоматично проксіює всі порти через HTTPS:
```
localhost:3002 → https://redesigned-waddle-v6w5g7rvxqpxf6pwg-3002.app.github.dev
```

За замовчуванням порти **ПРИВАТНІ** і вимагають авторизацію:
```
HTTP/2 401 Unauthorized
www-authenticate: tunnel
```

Це блокує **CORS preflight** запити від браузера, тому що:
1. Браузер відправляє OPTIONS запит
2. Codespaces проксі повертає 401 (не авторизовано)
3. Браузер блокує запит (CORS помилка)

**Рішення:** Зробити порт **PUBLIC** = без авторизації = CORS працює.

---

## 🔗 Корисні Посилання

- [GitHub Codespaces Ports Documentation](https://docs.github.com/en/codespaces/developing-in-codespaces/forwarding-ports-in-your-codespace)
- [CORS MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## ✅ Підсумок

**ДО виправлення:**
```
❌ Port 3002: Private → 401 Unauthorized → CORS blocked
❌ Port 5000: Private
```

**ПІСЛЯ виправлення:**
```
✅ Port 3002: Public → CORS працює
✅ Port 5000: Public → Frontend доступний
✅ API запити виконуються успішно
```

---

**Створено:** 13 листопада 2025  
**Статус:** READY TO TEST 🚀
