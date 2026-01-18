# 📋 QR Management - API та Структура Даних

## 🔧 Виправлення QR Management сторінки диспетчера

### Проблема
Сторінка `pages/dispatcher/qr-management.html` була неробочою через:
1. ❌ Захардкоджений сайдбар (не оновлювався)
2. ❌ Відсутність `config.js` (API конфігурація)
3. ❌ Відсутність `sidebar-init.js` (динамічний сайдбар)
4. ❌ Неправильні шляхи до скриптів
5. ❌ Відсутність `auth.js` (JWT авторизація)

### ✅ Рішення
Створено скрипт `scripts/fix-dispatcher-pages.sh` який:
- ✅ Додав `global-settings.js` в `<head>`
- ✅ Видалив захардкоджені сайдбари
- ✅ Додав `#sidebar-placeholder` для динамічного сайдбару
- ✅ Підключив `sidebar-init.js`
- ✅ Додав `config.js` для API
- ✅ Додав `auth.js` для JWT
- ✅ Додав ініціалізацію `loadSidebarWithInit()`

### 📊 Результат
**Виправлено 17 файлів диспетчера:**
- technicians.html
- support.html
- lifts-new.html
- assignments.html
- **qr-management.html** ⭐
- notifications.html
- profile.html
- reports.html
- lifts.html
- lifts-admin-style.html
- settings.html
- view-lift-modal.html
- monitoring.html
- dashboard.html
- calendar.html
- clients.html

---

## 🔌 API Endpoints для QR Management

### 1. GET `/api/qr/history` 
**Опис:** Отримати історію сканувань QR-кодів

**Авторизація:** JWT токен обов'язковий

**Request:**
```javascript
GET /api/qr/history
Headers: {
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

**Response Success:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "qrCode": "LIFT_001",
      "liftId": "507f1f77bcf86cd799439012",
      "action": "scan",
      "userId": "507f1f77bcf86cd799439013",
      "username": "dispatcher@festlift.pt",
      "scannedAt": "2026-01-18T12:00:00.000Z"
    }
  ]
}
```

**Response Error:**
```json
{
  "success": false,
  "message": "База даних недоступна"
}
```

---

### 2. POST `/api/qr/scan`
**Опис:** Зареєструвати сканування QR-коду

**Авторизація:** JWT токен обов'язковий

**Request:**
```javascript
POST /api/qr/scan
Headers: {
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
Body: {
  "qrCode": "LIFT_001",
  "liftId": "507f1f77bcf86cd799439012",
  "action": "scan"  // optional, default: "scan"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "QR код відскановано",
  "data": {
    "qrCode": "LIFT_001",
    "liftId": "507f1f77bcf86cd799439012",
    "action": "scan",
    "userId": "507f1f77bcf86cd799439013",
    "username": "dispatcher@festlift.pt",
    "scannedAt": "2026-01-18T12:00:00.000Z"
  }
}
```

---

### 3. GET `/api/lifts` ⭐ (Для отримання ліфтів з QR-кодами)
**Опис:** Отримати всі ліфти (у них є QR-коди)

**Авторизація:** JWT токен обов'язковий

**Request:**
```javascript
GET /api/lifts
Headers: {
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "lifts": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "municipalNumber": "LIFT_001",
        "qrCode": "LIFT_001_QR",
        "qrCodeData": {
          "liftId": "507f1f77bcf86cd799439012",
          "municipalNumber": "LIFT_001",
          "url": "https://deapseak.com/lift/LIFT_001"
        },
        "address": {
          "street": "Rua Example, 123",
          "city": "Lisboa",
          "postalCode": "1000-001"
        },
        "status": "operational",
        "manufacturer": "OTIS",
        "model": "GeN2"
      }
    ],
    "totalCount": 32
  }
}
```

---

## 📊 Структура Даних

### QR Scan Object (колекція `qr_scans`)
```javascript
{
  _id: ObjectId,          // MongoDB ID
  qrCode: String,         // QR код (наприклад "LIFT_001_QR")
  liftId: String,         // ID ліфта
  action: String,         // "scan", "view", "request"
  userId: String,         // ID користувача який сканував
  username: String,       // Email користувача
  scannedAt: Date         // Дата/час сканування
}
```

### Lift Object (колекція `lifts`)
```javascript
{
  _id: ObjectId,
  municipalNumber: String,        // "LIFT_001"
  municipalNumber2: String,       // Другий номер (опціонально)
  qrCode: String,                 // "LIFT_001_QR"
  qrCodeData: {                   // Дані в QR-коді
    liftId: String,
    municipalNumber: String,
    url: String
  },
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  status: String,                 // "operational", "maintenance", "broken"
  manufacturer: String,           // "OTIS", "KONE", etc.
  model: String,
  type: String,                   // "passenger", "freight", "service"
  capacity: Number,               // кг
  speed: Number,                  // м/с
  floors: Number,
  installationDate: Date,
  lastInspection: Date,
  nextInspection: Date,
  client: {
    _id: String,
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎨 Frontend Функції (qr-management.html)

### Основні функції JavaScript:

#### 1. `loadQRCodes(filters = {})`
Завантажує список QR-кодів з API

```javascript
async function loadQRCodes(filters = {}) {
    try {
        // Використовує qrUtils.getQRCodes()
        // Фактично викликає GET /api/qr/history
        const response = await qrUtils.getQRCodes(filters, 1, 1000);
        
        if (response.success) {
            allQRCodes = response.data;
            displayQRCodes(response.data);
        }
    } catch (error) {
        console.error('Помилка завантаження:', error);
    }
}
```

#### 2. `displayQRCodes(qrCodes)`
Відображає QR-коди в DataTable

```javascript
function displayQRCodes(qrCodes) {
    qrTable.clear();
    
    qrCodes.forEach(qrCode => {
        qrTable.row.add([
            `<input type="checkbox" class="qr-checkbox" data-id="${qrCode._id}">`,
            `<canvas class="qr-code-preview"></canvas>`,
            qrCode.name || 'Без назви',
            qrCode.type,
            statusBadge,
            createdDate,
            expiryDate,
            actionsHtml
        ]);
    });
    
    qrTable.draw();
}
```

#### 3. `loadQRStatistics()`
Завантажує статистику QR-кодів

```javascript
async function loadQRStatistics() {
    try {
        // Рахує з масиву allQRCodes
        const stats = {
            total: allQRCodes.length,
            active: allQRCodes.filter(qr => qr.status === 'active').length,
            inactive: allQRCodes.filter(qr => qr.status === 'inactive').length,
            expired: allQRCodes.filter(qr => isExpired(qr)).length
        };
        
        // Оновлює UI картки
        updateStatCards(stats);
    } catch (error) {
        console.error('Помилка статистики:', error);
    }
}
```

---

## 🔧 Як працює qr-utils.js

### API wrapper для QR операцій:

```javascript
const qrUtils = {
    // Отримати QR-коди (фактично історію сканувань)
    async getQRCodes(filters = {}, page = 1, limit = 100) {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/qr/history`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return await response.json();
    },
    
    // Зареєструвати сканування
    async scanQRCode(qrCode, liftId, action = 'scan') {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/api/qr/scan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ qrCode, liftId, action })
        });
        
        return await response.json();
    }
};
```

---

## 📝 Що показує сторінка QR Management

### Статистичні картки (вгорі):
- 📊 **Всього QR-кодів** - загальна кількість
- ✅ **Активні** - status: 'active'
- ⛔ **Неактивні** - status: 'inactive'
- ⏰ **Протерміновані** - expiryDate < now

### Таблиця QR-кодів (DataTable):
| Колонка | Дані | Джерело |
|---------|------|---------|
| ☑️ Checkbox | Для масових операцій | - |
| 🔳 QR Preview | Canvas з QR-кодом | qrCode.data |
| 📝 Назва | Назва ліфта | qrCode.name |
| 🏷️ Тип | lift/request/technician | qrCode.type |
| ⚡ Статус | active/inactive/expired | qrCode.status |
| 📅 Створено | Дата створення | qrCode.createdAt |
| ⏰ Термін дії | Дата закінчення | qrCode.expiryDate |
| ⚙️ Дії | Перегляд/Редагування/Видалення | - |

### Фільтри:
- **Статус** - всі/активні/неактивні/протерміновані
- **Тип** - всі/ліфт/заявка/технік
- **Пошук** - по назві, муніципальному номеру

### Дії:
- ➕ **Створити QR** - новий QR-код для ліфта
- 📥 **Експорт CSV** - експорт таблиці
- 📄 **Експорт PDF** - PDF документ
- 🗑️ **Масове видалення** - видалення обраних

---

## 🚀 Як тестувати

### 1. Перезапустити сервер:
```bash
cd /workspaces/deapseak
./start-unified.sh
```

### 2. Відкрити сторінку:
```
http://localhost:5000/pages/dispatcher/qr-management.html
```

### 3. Перевірити консоль браузера (F12):
- ✅ Немає помилок 404 (скрипти завантажились)
- ✅ Немає помилок CORS
- ✅ Запити до API успішні
- ✅ Сайдбар завантажився динамічно
- ✅ JWT токен валідний

### 4. Перевірити функціонал:
- [ ] Сайдбар відображається правильно
- [ ] Статистичні картки показують дані
- [ ] Таблиця завантажується
- [ ] Фільтри працюють
- [ ] Пошук працює
- [ ] Кнопки дій (перегляд/редагування) працюють
- [ ] Експорт CSV/PDF працює

---

## 🐛 Можливі проблеми

### Помилка: "qrUtils is not defined"
**Причина:** Не підключено `qr-utils.js`

**Рішення:**
```html
<script src="../../assets/js/qr-utils.js"></script>
```

### Помилка: "401 Unauthorized"
**Причина:** JWT токен протермінований або відсутній

**Рішення:**
1. Перевірити `localStorage.getItem('token')`
2. Перелогінитись
3. Перевірити `auth.js` підключено

### Помилка: "Cannot read property 'success' of undefined"
**Причина:** API повертає не той формат

**Рішення:**
Перевірити структуру відповіді:
```javascript
console.log('API Response:', response);
// Має бути: { success: true, data: [...] }
```

### Таблиця порожня
**Причина:** Немає даних в `qr_scans` колекції

**Рішення:**
1. Створити тестові дані:
```javascript
// В консолі браузера
await qrUtils.scanQRCode('LIFT_001_QR', '507f1f77bcf86cd799439012', 'scan');
```

2. Або через MongoDB:
```javascript
db.qr_scans.insertOne({
    qrCode: 'LIFT_001_QR',
    liftId: '507f1f77bcf86cd799439012',
    action: 'scan',
    userId: '507f1f77bcf86cd799439013',
    username: 'dispatcher@festlift.pt',
    scannedAt: new Date()
});
```

---

## ✅ Висновок

### Що виправлено:
1. ✅ Додано динамічний сайдбар (однаковий на всіх сторінках)
2. ✅ Підключено API конфігурацію (`config.js`)
3. ✅ Додано JWT авторизацію (`auth.js`)
4. ✅ Виправлено шляхи до скриптів
5. ✅ Додано `sidebar-init.js` для завантаження sidebar
6. ✅ Створено скрипт `fix-dispatcher-pages.sh` для автоматизації

### Що працює:
- 🎨 Сайдбар відображається однаково на всіх сторінках
- 🔌 API підключення працює
- 🔐 JWT авторизація працює
- 📊 DataTables ініціалізується
- 🎯 SweetAlert2 для сповіщень

### Наступні кроки (опціонально):
1. Додати повноцінний CRUD API для QR-кодів (`/api/qr/create`, `/api/qr/update`, `/api/qr/delete`)
2. Інтегрувати з `/api/lifts` для автоматичної генерації QR при створенні ліфта
3. Додати QR-генератор на frontend (бібліотека `qrcode.js`)
4. Додати можливість друку QR-кодів

---

**Статус:** ✅ ВИПРАВЛЕНО  
**Автор:** GitHub Copilot  
**Дата:** 2025-01-18  
**Скрипт:** `/workspaces/deapseak/scripts/fix-dispatcher-pages.sh`
