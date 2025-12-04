# 🧹 Правила чистоти проекту DeapSeaK

## ⚠️ КРИТИЧНО ВАЖЛИВО

**Ці правила ОБОВ'ЯЗКОВІ для дотримання при будь-яких змінах проекту!**

---

## 🔒 1. Єдина точка входу

### Unified Server (порт 5000)

```
✅ ПРАВИЛЬНО:
- unified-server.js на порту 5000
- Всі API endpoints: /api/*
- Всі статичні файли через той же сервер
- MongoDB: localhost:27017, база deapseak

❌ ЗАБОРОНЕНО:
- Створювати нові сервери на інших портах
- Використовувати порти 3001, 3002, 8080
- Розділяти frontend і backend сервери
```

### Конфігурація

```javascript
// config.js - ТІЛЬКИ ЦЕ
static getBaseUrl() {
    return 'http://localhost:5000';
}

// assets/js/config.js - ТІЛЬКИ ЦЕ
const API_BASE_URL = 'http://localhost:5000';
```

---

## 🔐 2. Автентифікація

### Акаунти (тільки з @deapseak.com)

```
✅ ДОЗВОЛЕНО:
admin@deapseak.com / admin123
dispatcher@deapseak.com / dispatcher123
tech1@deapseak.com / tech123
tech2@deapseak.com / tech123
client@deapseak.com / client123

❌ ЗАБОРОНЕНО:
- Створювати акаунти без email
- Використовувати старі логіни (admin, tech1, dispatcher1)
- Змішувати username і email в формах
```

### AuthManager

```javascript
// ✅ ПРАВИЛЬНО - через AuthManager
const response = await AuthManager.fetchWithAuth('/api/lifts');
const data = await response.json();

// ❌ НЕПРАВИЛЬНО - напряму fetch
const response = await fetch('/api/lifts', {
    headers: { 'Authorization': 'Bearer ' + token }
});
```

---

## 📁 3. Структура файлів

### Дозволені файли

```
/workspaces/deapseak/
├── unified-server.js          ✅ Єдиний сервер
├── config.js                  ✅ Конфігурація
├── login.html                 ✅ Вхід
├── index.html                 ✅ Головна
│
├── pages/                     ✅ Сторінки додатку
│   ├── admin/
│   ├── tech/
│   ├── dispatcher/
│   └── client/
│
├── assets/                    ✅ Ресурси
│   ├── js/
│   │   ├── auth.js           ✅ AuthManager (один!)
│   │   └── config.js         ✅ API_BASE_URL
│   ├── css/
│   └── img/
│
├── models/                    ✅ MongoDB моделі
├── services/                  ✅ Бізнес-логіка
└── API-INTEGRATION.md         ✅ Документація API
```

### ЗАБОРОНЕНІ файли/папки

```
❌ archive/          - видалено
❌ backup/           - тільки через .gitignore
❌ temp/             - тільки через .gitignore
❌ *.OLD, *.old      - видаляти відразу
❌ api.js            - застарілий ES6 export
❌ множинні auth.js  - тільки один!
```

---

## 🚫 4. Що НІКОЛИ не робити

### ❌ Дублікати

```html
<!-- НЕПРАВИЛЬНО - подвійне завантаження -->
<script src="assets/js/auth.js"></script>
...
<script src="assets/js/auth.js"></script>

<!-- ПРАВИЛЬНО - один раз -->
<script src="assets/js/auth.js"></script>
```

### ❌ ES6 Modules в браузері без type="module"

```javascript
// НЕПРАВИЛЬНО - викличе "Unexpected token 'export'"
export { LiftAPI, AuthManager };

// ПРАВИЛЬНО - CommonJS або глобальні змінні
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
```

### ❌ Hardcoded порти

```javascript
// НЕПРАВИЛЬНО
const API_URL = 'http://localhost:3001/api';

// ПРАВИЛЬНО
const API_URL = config.api.baseUrl + '/api';
// або
const API_URL = `${window.location.origin}/api`;
```

---

## ✅ 5. Перед кожним commit

### Checklist

- [ ] **Порт 5000** скрізь (config.js, assets/js/config.js)
- [ ] **Один auth.js** (немає дублікатів у HTML)
- [ ] **Email логін** (admin@deapseak.com, не просто admin)
- [ ] **Немає *.OLD файлів** у робочих директоріях
- [ ] **Немає console.log** з конфіденційною інформацією
- [ ] **.gitignore** покриває logs/, temp/, uploads/
- [ ] **Документація оновлена** (API-INTEGRATION.md)

### Команди перевірки

```bash
# Перевірка портів
grep -r "3001\|3002\|8080" config.js assets/js/config.js

# Перевірка дублікатів auth.js
grep -r "auth.js" login.html pages/**/*.html | wc -l

# Перевірка застарілих файлів
find . -name "*.OLD" -o -name "*.old" | grep -v node_modules

# Перевірка ES6 exports
find assets/js -name "*.js" -exec grep -l "^export " {} \;
```

---

## 📝 6. Процес внесення змін

### Перед початком роботи

1. `git pull` - отримати останні зміни
2. `git status` - перевірити стан
3. Прочитати цей файл (CLEAN-PROJECT.md)

### Під час роботи

1. Змінювати **тільки необхідні** файли
2. Не створювати дублікатів
3. Використовувати **існуючі** компоненти (AuthManager, config.js)
4. Тестувати зміни локально

### Після завершення

1. Запустити checklist (див. вище)
2. `git add` - тільки змінені файли
3. `git commit -m "чітке пояснення змін"`
4. Оновити документацію якщо потрібно

---

## 🔧 7. Виправлення помилок

### "Unexpected token 'export'"

```bash
# Знайти проблемний файл
find assets/js -name "*.js" -exec grep -l "^export " {} \;

# Перейменувати або видалити
mv assets/js/api.js assets/js/api.js.OLD
```

### "Identifier 'AuthManager' has already been declared"

```bash
# Знайти дублікати
grep -n "auth.js" login.html

# Видалити зайві <script> теги
```

### "not valid JSON" або 404 на API

```bash
# Перевірити порядок middleware в unified-server.js
# Статичні файли ПІСЛЯ API маршрутів!
```

---

## 📊 8. Моніторинг проекту

### Щотижнева перевірка

```bash
# Розмір проекту
du -sh . --exclude=node_modules

# Кількість файлів
find . -type f ! -path "*/node_modules/*" | wc -l

# Застарілі файли
find . -name "*.OLD" -o -name "*.backup" | grep -v node_modules

# Непотрібні логи
find logs/ -name "*.log" -mtime +7  # старші 7 днів
```

---

## 🎯 Основний принцип

> **"Один сервер, один порт, один AuthManager, одна база даних"**

Будь-яке відхилення від цього принципу має бути **обґрунтовано** і **задокументовано**.

---

**Версія:** 1.0  
**Дата:** 4 грудня 2025  
**Автор:** GitHub Copilot AI  
**Статус:** 🔒 ОБОВ'ЯЗКОВО ДО ВИКОНАННЯ
