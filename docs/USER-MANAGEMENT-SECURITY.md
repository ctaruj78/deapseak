# 🔐 Безпека Управління Користувачами

## Проблема
**Питання:** Якщо клієнт створив свій пароль (який адмін не знає), як адмін може видалити або заблокувати цього користувача?

## ✅ Рішення: Система Деактивації

### Як Працює Система

#### 1. **Створення Користувача (Адмін)**

```http
POST /api/auth/register
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "joao123",
  "email": "joao@example.com",
  "password": "temporaryPass123",  // Тимчасовий пароль
  "role": "client",
  "firstName": "João",
  "lastName": "Silva"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Користувача створено",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "joao@example.com",
      "username": "joao123",
      "isActive": true
    }
  }
}
```

**📧 Адмін надсилає email клієнту:**
- Email: joao@example.com
- Тимчасовий пароль: temporaryPass123
- Посилання: https://yourdomain.com/login

---

#### 2. **Перший Вхід Клієнта**

Клієнт входить з тимчасовим паролем і змінює його на свій власний:

```http
POST /api/auth/login
Content-Type: application/json

{
  "login": "joao@example.com",
  "password": "temporaryPass123"
}
```

**Після входу клієнт змінює пароль:**
```http
PUT /api/auth/change-password
Authorization: Bearer <client_token>
Content-Type: application/json

{
  "currentPassword": "temporaryPass123",
  "newPassword": "MySecurePassword456!"
}
```

**🔐 Тепер клієнт має пароль, який знає тільки він!**

---

## 🚨 Блокування Користувача (Адмін)

### Коли Потрібно Заблокувати?
- Клієнт більше не є вашим клієнтом
- Порушення умов використання
- Підозрілa активність
- Неоплачені рахунки

### API Endpoint

```http
PUT /api/auth/users/:id/toggle-ban
Authorization: Bearer <admin_token>
```

**Request:**
```bash
curl -X PUT http://localhost:5000/api/auth/users/507f1f77bcf86cd799439011/toggle-ban \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1..."
```

**Response (Блокування):**
```json
{
  "success": true,
  "message": "Користувача заблоковано",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "joao@example.com",
      "isActive": false  // ❌ Заблоковано
    }
  }
}
```

**Response (Розблокування):**
```json
{
  "success": true,
  "message": "Користувача розблоковано",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "joao@example.com",
      "isActive": true  // ✅ Розблоковано
    }
  }
}
```

---

## 🔒 Що Відбувається Після Блокування?

### При Спробі Входу:

```http
POST /api/auth/login
Content-Type: application/json

{
  "login": "joao@example.com",
  "password": "MySecurePassword456!"
}
```

**Response:**
```json
{
  "success": false,
  "message": "Акаунт заблоковано. Зверніться до адміністратора",
  "statusCode": 403
}
```

### Перевірка у Коді:

**backend/controllers/authController.js (lines 78-82):**
```javascript
// Перевірка статусу акаунту
if (!user.isActive) {
    throw new AppError('Акаунт заблоковано. Зверніться до адміністратора', 403);
}
```

---

## 🗑️ Видалення Користувача (Опціонально)

### API Endpoint

```http
DELETE /api/auth/users/:id
Authorization: Bearer <admin_token>
```

**Request:**
```bash
curl -X DELETE http://localhost:5000/api/auth/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1..."
```

**Response:**
```json
{
  "success": true,
  "message": "Користувача видалено"
}
```

**⚠️ УВАГА:** Видалення є НЕЗВОРОТНІМ! Рекомендується використовувати деактивацію (`isActive: false`) замість видалення.

---

## 🛡️ Захист

### 1. **Адмін НЕ може заблокувати самого себе**

```javascript
if (user._id.toString() === req.user.id) {
    throw new AppError('Не можна забанити самого себе', 400);
}
```

### 2. **Адмін НЕ може заблокувати іншого адміна**

```javascript
if (user.role === 'admin') {
    throw new AppError('Не можна забанити адміністратора', 400);
}
```

### 3. **Тільки адміни можуть блокувати користувачів**

```javascript
// backend/routes/authRoutes.js
router.put('/users/:id/toggle-ban', 
    authenticate, 
    authorizeRoles('admin'),  // ✅ Тільки admin
    authController.toggleUserBan
);
```

---

## 📊 База Даних

### User Schema (MongoDB)

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  username: "joao123",
  email: "joao@example.com",
  password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy", // хешований
  role: "client",
  firstName: "João",
  lastName: "Silva",
  isActive: false,  // ❌ Заблоковано адміном
  lastLogin: ISODate("2025-12-15T10:30:00.000Z"),
  createdAt: ISODate("2025-01-01T08:00:00.000Z"),
  updatedAt: ISODate("2025-12-20T14:45:00.000Z")
}
```

---

## 🎯 Рекомендації

### Замість Видалення:

❌ **НЕ робіть:**
```bash
# Видалення користувача
DELETE /api/auth/users/:id
```

✅ **РОБІТЬ:**
```bash
# Деактивація користувача
PUT /api/auth/users/:id/toggle-ban
```

### Причини:
1. **Збереження історії** - всі заявки, звіти залишаються
2. **Можливість відновлення** - можна розблокувати пізніше
3. **Аудит** - можна перевірити хто і коли був заблокований
4. **Безпека** - немає втрати даних

---

## 📝 Frontend Інтеграція

### Приклад UI для Адміна

**pages/admin/users-management.html:**

```html
<!-- Таблиця користувачів -->
<table class="table">
  <thead>
    <tr>
      <th>Ім'я</th>
      <th>Email</th>
      <th>Роль</th>
      <th>Статус</th>
      <th>Дії</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>João Silva</td>
      <td>joao@example.com</td>
      <td>Client</td>
      <td>
        <span class="badge badge-success">Активний</span>
      </td>
      <td>
        <button onclick="toggleUserBan('507f1f77bcf86cd799439011')" 
                class="btn btn-warning btn-sm">
          <i class="fas fa-ban"></i> Заблокувати
        </button>
        <button onclick="deleteUser('507f1f77bcf86cd799439011')" 
                class="btn btn-danger btn-sm">
          <i class="fas fa-trash"></i> Видалити
        </button>
      </td>
    </tr>
  </tbody>
</table>

<script>
async function toggleUserBan(userId) {
    if (!confirm('Ви впевнені, що хочете заблокувати цього користувача?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/auth/users/${userId}/toggle-ban`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            location.reload(); // Оновити таблицю
        } else {
            alert('Помилка: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Помилка при блокуванні користувача');
    }
}
</script>
```

---

## ✅ Висновок

**Ваша система вже ПРАВИЛЬНО налаштована!**

### Що працює:
✅ Адмін створює користувача з тимчасовим паролем  
✅ Клієнт змінює пароль на свій власний  
✅ Адмін може заблокувати користувача без знання його пароля  
✅ Заблокований користувач НЕ може увійти  
✅ Адмін може розблокувати користувача пізніше  
✅ Адмін може видалити користувача (але краще деактивувати)  

### API Routes:
- `POST /api/auth/register` - Створити користувача (admin)
- `PUT /api/auth/users/:id/toggle-ban` - Заблокувати/Розблокувати (admin)
- `DELETE /api/auth/users/:id` - Видалити (admin)
- `PUT /api/auth/change-password` - Змінити пароль (власний)

**Система безпечна та функціональна!** 🎉
