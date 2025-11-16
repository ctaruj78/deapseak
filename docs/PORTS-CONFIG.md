# 🔌 Конфігурація Портів - DeapSeaK v2

## ⚠️ ВАЖЛИВО: Централізована Конфігурація

Всі порти системи визначені в **ОДНОМУ** місці: `assets/js/config.js`

## 📋 Фіксовані Порти

| Сервіс | Порт | Призначення |
|--------|------|-------------|
| 🌐 Frontend | **5000** | Веб-інтерфейс користувача |
| 🔗 API | **3001** | REST API для бекенду |
| 💬 WebSocket | **3002** | Real-time оновлення |
| 🗄️ MongoDB | **27017** | База даних |

## 🚫 НЕ РОБІТЬ ЦЕ!

❌ **НЕ змінюйте порти** в окремих файлах  
❌ **НЕ використовуйте** hardcoded порти в коді  
❌ **НЕ плутайте** порт API (3001) з WebSocket (3002)

## ✅ РОБІТЬ ТАК!

### У JavaScript коді:

```javascript
// ✅ ПРАВИЛЬНО - використовуйте CONFIG
const apiUrl = CONFIG.API.getUrl('/api/lifts');
const wsUrl = CONFIG.WEBSOCKET.getUrl();

// ❌ НЕПРАВИЛЬНО - не використовуйте hardcoded значення
const apiUrl = 'http://localhost:3001/api/lifts';
```

### У HTML:

```html
<!-- ✅ ПРАВИЛЬНО - завантажте config.js ПЕРШИМ -->
<script src="../../assets/js/config.js?v=20241116"></script>
<script src="../../assets/js/auth.js?v=20241116"></script>
```

## 🛠️ Корисні Команди

### Перевірити конфігурацію портів:
```bash
npm run check-ports
```

### Додати config.js до всіх HTML файлів:
```bash
npm run fix-config
```

### Діагностика в браузері:
```javascript
// У консолі браузера (F12)
CONFIG.debug();
```

## 📝 Як Працює

1. **config.js** завантажується ПЕРШИМ в кожному HTML файлі
2. Всі інші модулі (auth.js, etc.) використовують `CONFIG.API.getUrl()`
3. Система автоматично визначає середовище:
   - GitHub Codespaces → використовує `.app.github.dev` домен
   - Localhost → використовує `localhost`
   - Production → використовує поточний домен

## 🔧 Що Робити При Проблемах

### Проблема: ERR_INTERNET_DISCONNECTED або Failed to fetch

1. Перевірте конфігурацію:
   ```bash
   npm run check-ports
   ```

2. Відкрийте консоль браузера (F12) і виконайте:
   ```javascript
   CONFIG.debug();
   ```

3. Перевірте чи правильний порт:
   - API має бути на **3001**
   - WebSocket має бути на **3002**

4. Жорстке оновлення браузера:
   - **Ctrl + Shift + R** (Windows/Linux)
   - **Cmd + Shift + R** (Mac)

### Проблема: Порти постійно змінюються

Це означає що десь в коді є hardcoded порт. Знайдіть і замініть на:

```javascript
// Замість:
const url = 'http://localhost:3002/api/...';

// Використовуйте:
const url = CONFIG.API.getUrl('/api/...');
```

## 📚 Додаткова Інформація

- Всі порти визначені в: `assets/js/config.js`
- AuthManager використовує CONFIG автоматично
- Скрипт перевірки: `scripts/check-ports.sh`
- Скрипт виправлення: `scripts/fix-config-includes.sh`

## ⚡ Швидкий Старт

```bash
# 1. Перевірити порти
npm run check-ports

# 2. Запустити систему
npm run auto-start

# 3. Відкрити браузер
# http://localhost:5000
```

---

**✅ Пам'ятайте:** Один файл конфігурації = Одна правда про порти!
