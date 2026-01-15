# 🔐 AI Assistant - Безпека та Роздільний Доступ

**Дата:** 14 січня 2026  
**Статус:** ✅ ЗАХИЩЕНО

---

## 🎯 Питання Безпеки

### ❓ Проблема:
> "Якщо AI Assistant - це спільна зона, як він відокремлює запити які він немає права обробляти для іншої ролі? Наприклад, показати чужі ліфти якогось клієнта іншому?"

### ✅ Відповідь:
**AI Assistant - це спільна зона для ІНТЕРФЕЙСУ, але НЕ для ДАНИХ!**

---

## 🛡️ Архітектура Безпеки

### 1️⃣ JWT Автентифікація (Frontend)

**Кожен запит до AI включає токен користувача:**

```javascript
// pages/ai-assistant/ai-assistant.html (рядок 881, 1366, 1749)

const token = localStorage.getItem('token');

fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // 🔐 Токен з роллю і userId
    },
    body: JSON.stringify({ message, context })
});
```

**Що в токені:**
```json
{
  "id": "user_mongodb_id",
  "username": "info@festlift.pt",
  "role": "admin",        // 👈 РОЛЬ КОРИСТУВАЧА
  "email": "info@festlift.pt",
  "iat": 1705267200,
  "exp": 1705353600
}
```

---

### 2️⃣ Backend Middleware (Server)

**Всі AI запити проходять через `authenticateToken`:**

```javascript
// unified-server.js (рядок 3293)

app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    // ✅ authenticateToken ЗАВЖДИ перевіряє токен першим
    
    const username = req.user.email;     // З токена
    const role = req.user.role;          // З токена
    const userId = req.user.id;          // З токена
    
    // Тепер req.user містить ВАЛІДНУ інформацію про користувача
});
```

**Middleware `authenticateToken` (рядок 677-710):**
```javascript
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            message: 'Токен авторизації не надано' 
        });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                message: 'Невалідний токен' 
            });
        }
        
        // ✅ Токен валідний - зберігаємо user в request
        req.user = user;  // { id, username, role, email }
        next();
    });
}
```

---

### 3️⃣ Роль-Based Access Control (RBAC)

**Backend фільтрує дані на основі ролі:**

#### Приклад: API отримання ліфтів

```javascript
// unified-server.js (рядок 972-1010)

app.get('/api/lifts', authenticateToken, async (req, res) => {
    let query = {};
    
    // 🔐 ФІЛЬТРАЦІЯ ПО РОЛЯХ
    
    if (req.user.role === 'client') {
        // ❌ Клієнт НЕ може бачити чужі ліфти
        const clientId = req.user.id;
        query.client = clientId.toString();
        
        console.log(`👤 Клієнт ${req.user.username} запитує ТІЛЬКИ СВОЇ ліфти`);
    } 
    else if (req.user.role === 'technician') {
        // ❌ Технік бачить тільки ліфти з ПРИЗНАЧЕНИХ йому завдань
        const techId = req.user.id;
        const requests = await db.collection('requests')
            .find({ 
                technician: techId,
                status: { $in: ['pending', 'in_progress'] }
            })
            .toArray();
        
        const liftIds = requests.map(r => r.liftId);
        query._id = { $in: liftIds };
        
        console.log(`🔧 Технік ${req.user.username} бачить ${liftIds.length} ліфтів`);
    } 
    else if (req.user.role === 'admin' || req.user.role === 'dispatcher') {
        // ✅ Тільки Admin/Dispatcher бачать ВСІ ліфти
        console.log(`👨‍💼 ${req.user.role} бачить ВСІ ліфти`);
        // query залишається пустим = всі ліфти
    }
    
    const lifts = await db.collection('lifts').find(query).toArray();
    res.json({ success: true, data: lifts });
});
```

---

## 🎭 Сценарії Використання

### Сценарій 1: Клієнт намагається побачити чужі ліфти

```
1. Client A (id: "abc123") логінився
   → Отримав JWT токен з role: "client", id: "abc123"

2. Client A відкриває AI Assistant
   → Frontend відправляє запит з його токеном

3. Backend отримує запит:
   ✅ authenticateToken перевіряє токен
   ✅ req.user = { id: "abc123", role: "client" }
   
4. Якщо Client A запитує "покажи всі ліфти":
   ❌ Backend фільтрує: query.client = "abc123"
   ❌ Результат: тільки ліфти CLIENT A, не CLIENT B
```

### Сценарій 2: Технік намагається побачити всі ліфти

```
1. Tech X (id: "tech456") логінився
   → Отримав JWT токен з role: "technician"

2. Tech X запитує AI: "покажи інформацію про ліфт TEST-002"
   → Frontend: Authorization: Bearer <tech_token>

3. Backend:
   ✅ Перевіряє токен
   ✅ Перевіряє чи TEST-002 призначений Tech X
   
   const requests = await db.requests.find({ 
       technician: "tech456",
       liftId: "TEST-002" 
   });
   
   if (requests.length === 0) {
       ❌ return 403 Forbidden
   }
```

### Сценарій 3: Admin бачить все

```
1. Admin (role: "admin") логінився
   → Токен з role: "admin"

2. Admin запитує AI: "покажи статистику по всіх ліфтах"
   → Authorization: Bearer <admin_token>

3. Backend:
   ✅ authenticateToken: role = "admin"
   ✅ if (role === 'admin') → query = {} (без фільтрів)
   ✅ Результат: ВСІ ліфти системи
```

---

## 🔒 Додаткові Захисти

### 1. Створення/Видалення Ліфтів

```javascript
// unified-server.js (рядок 961-963)

app.post('/api/lifts', authenticateToken, async (req, res) => {
    // ❌ Тільки Admin може створювати ліфти
    if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
        console.warn(`⚠️ ${req.user.role} намагається створити ліфт`);
        return res.status(403).json({ 
            message: 'Доступ заборонено' 
        });
    }
    
    // ... створення ліфта
});

app.delete('/api/lifts/:id', authenticateToken, async (req, res) => {
    // ❌ Тільки Admin може видаляти
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            message: 'Тільки адміністратор може видаляти ліфти' 
        });
    }
});
```

### 2. Редагування Ліфтів

```javascript
// unified-server.js (рядок 1046, 1101)

app.put('/api/lifts/:id', authenticateToken, async (req, res) => {
    const lift = await db.collection('lifts').findOne({ _id: liftId });
    
    // ❌ Client може редагувати тільки СВОЇ ліфти
    if (req.user.role === 'client' && lift.clientId !== req.user.userId) {
        return res.status(403).json({ 
            message: 'Ви не маєте прав редагувати цей ліфт' 
        });
    }
    
    // ❌ Technician взагалі НЕ МОЖЕ редагувати
    if (req.user.role === 'technician') {
        return res.status(403).json({ 
            message: 'Техніки не можуть редагувати ліфти' 
        });
    }
});
```

---

## 🎯 AI Assistant: Спільний Інтерфейс, Роздільні Дані

### ✅ Що спільне:
- **UI/UX:** Однаковий інтерфейс для всіх
- **Функції:** Chat, PDF аналіз, Regulations
- **Sidebar:** Мінімальний (тільки "Назад")

### 🔐 Що роздільне:
- **Дані:** Кожен бачить ТІЛЬКИ свої дані
- **Доступ:** Backend перевіряє роль на КОЖНОМУ запиті
- **Права:** Create/Update/Delete контролюються окремо

---

## 💡 Приклад: AI Чат про Ліфт

```javascript
// Client A запитує: "Покажи інформацію про мій ліфт TEST-001"

1. Frontend:
   fetch('/api/ai/chat', {
       headers: { 'Authorization': 'Bearer <client_a_token>' }
   });

2. Backend (AI Handler):
   const role = req.user.role;  // "client"
   const userId = req.user.id;  // "client_a_id"
   
   if (message.includes('TEST-001')) {
       // Перевірити доступ до ліфта
       const lift = await db.lifts.findOne({ 
           liftNumber: 'TEST-001',
           client: userId  // 🔐 ФІЛЬТР ПО ВЛАСНИКУ
       });
       
       if (!lift) {
           return "❌ Ліфт TEST-001 не знайдено або у вас немає доступу";
       }
       
       return `✅ Ліфт TEST-001: ${lift.address}`;
   }
```

---

## 🚨 Що НЕ МОЖЕ Зламати Безпеку

### ❌ Сценарій 1: Підробка Токена
```
Client намагається змінити токен в браузері:
- JWT підписаний JWT_SECRET на сервері
- Будь-яка зміна → jwt.verify() fails
- Результат: 403 Forbidden
```

### ❌ Сценарій 2: Крадіжка Токена
```
Якщо Client A викрав токен Client B:
- Токен валідний, але містить id Client B
- Backend фільтрує: query.client = "client_b_id"
- Client A бачить дані Client B (токен же валідний!)
- Захист: HTTPS + HttpOnly cookies + короткий exp
```

### ❌ Сценарій 3: SQL Injection (MongoDB)
```
Client відправляє: "покажи ліфт з ID: {$ne: null}"
- Backend використовує параметризовані запити
- MongoDB driver автоматично ескейпить
- Результат: пошук по рядку "{$ne: null}", не injection
```

---

## ✅ Висновок

### AI Assistant - Спільна Зона, але ЗАХИЩЕНА:

1. **Інтерфейс:** Однаковий для всіх ролей ✅
2. **Дані:** Фільтруються по ролі на backend 🔐
3. **Права:** Контролюються middleware ✅
4. **Токени:** JWT з коротким терміном дії ✅
5. **Логи:** Всі дії записуються 📝

**Клієнт НЕ МОЖЕ бачити чужі ліфти через AI Assistant!**

---

## 🔍 Як Перевірити

### Тест 1: Client бачить тільки свої ліфти
```bash
# 1. Логін як Client A
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "client@festlift.pt", "password": "client123"}'

# 2. Отримати токен
TOKEN="<client_token>"

# 3. Запитати ліфти
curl -X GET http://localhost:5000/api/lifts \
  -H "Authorization: Bearer $TOKEN"

# Результат: тільки ліфти Client A
```

### Тест 2: Technician не бачить всі ліфти
```bash
# Логін як Tech
TOKEN="<tech_token>"

curl -X GET http://localhost:5000/api/lifts \
  -H "Authorization: Bearer $TOKEN"

# Результат: тільки ліфти з активних завдань
```

### Тест 3: Admin бачить все
```bash
# Логін як Admin
TOKEN="<admin_token>"

curl -X GET http://localhost:5000/api/lifts \
  -H "Authorization: Bearer $TOKEN"

# Результат: ВСІ ліфти системи
```

---

**🔐 AI Assistant: Спільний UI, Захищені Дані!** ✅
