# 🔒 Остаточна Конфігурація Портів - НЕ ЗМІНЮВАТИ!

## ✅ Затверджені Порти

| Сервіс | Порт | Призначення |
|--------|------|-------------|
| **Backend API v2** | **3002** | Express + MongoDB + WebSocket |
| **Frontend Server** | **5000** | Static HTML files |
| **MongoDB** | **27017** | Database |

---

## 📋 Файли з Конфігурацією

### 1. `.env` (Root)
```env
PORT=3002
V2_PORT=3002
FRONTEND_PORT=5000
```

### 2. `backend/.env`
```env
PORT=3002
```

### 3. `backend/app.js`
```javascript
const startServer = async (port = 3002) => {
```

### 4. `auto-start.sh`
```bash
BACKEND_PORT=3002
FRONTEND_PORT=5000
```

### 5. `.devcontainer/devcontainer.json`
```json
"forwardPorts": [5000, 3002, 27017]
```

### 6. `assets/js/auth.js`
```javascript
// GitHub Codespaces
const apiHost = hostname.replace(/(-\d+)(\.app\.github\.dev)/, '-3002$2');

// Localhost
return `http://localhost:3002${endpoint}`;
```

---

## ⚠️ ВАЖЛИВО

### ❌ НЕ ЗМІНЮВАТИ:
- Порт **3002** для Backend
- Порт **5000** для Frontend
- Порт **27017** для MongoDB

### ✅ Якщо потрібно змінити порт:
1. Відредагуйте **ВСІ** 6 файлів вище
2. Перезапустіть сервери: `./stop-servers.sh && ./auto-start.sh`
3. У GitHub Codespaces: змініть visibility нового порту на Public

---

## 🔧 Поточна Проблема з CORS

**Причина:** Порт 3002 **ПРИВАТНИЙ** у GitHub Codespaces

**Рішення:**
1. Ctrl+` → вкладка "PORTS"
2. Порт 3002 → правий клік → Port Visibility → **Public**
3. Порт 5000 → правий клік → Port Visibility → **Public**
4. Перезавантажити браузер: Ctrl+Shift+R

---

**Дата:** 13 листопада 2025  
**Версія:** FINAL 1.0  
**Статус:** 🔒 LOCKED - DO NOT CHANGE
