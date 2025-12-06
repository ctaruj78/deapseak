# 👥 Тестові облікові записи DeapSeak v2

## 📝 Створено: 6 грудня 2024

### 🔐 Дані для входу

| Роль | Email | Пароль | Ім'я |
|------|-------|--------|------|
| **👑 Admin** | `admin@example.com` | `admin123` | Admin System |
| **👤 Client** | `client@example.com` | `client123` | Іван Петренко |
| **🔧 Tech** | `tech@example.com` | `tech123` | Олег Коваленко |
| **📋 Dispatcher** | `dispatcher@example.com` | `dispatcher123` | Марія Шевченко |

---

## 🚀 Швидкий вхід

### Адміністратор
```
Email: admin@example.com
Password: admin123
```
**Доступ**: Повний контроль системи, управління користувачами, ліфтами, звітами

### Клієнт
```
Email: client@example.com
Password: client123
```
**Доступ**: Перегляд своїх ліфтів, створення заявок, AI-прогнози

### Технік
```
Email: tech@example.com
Password: tech123
```
**Доступ**: Завдання, інспекції, маршрути, AR-помічник

### Диспетчер
```
Email: dispatcher@example.com
Password: dispatcher123
```
**Доступ**: Призначення завдань, моніторинг техніків, розподіл заявок

---

## 🔄 Створення нових користувачів

### Через MongoDB
```javascript
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash('your_password', 10);

await User.create({
    firstName: 'Ім\'я',
    lastName: 'Прізвище',
    email: 'email@example.com',
    password: hashedPassword,
    phone: '+380501234567',
    role: 'admin', // admin, client, tech, dispatcher
    status: 'active'
});
```

### Через API (після входу як admin)
```bash
POST /api/users
{
    "firstName": "Ім'я",
    "lastName": "Прізвище",
    "email": "email@example.com",
    "password": "password123",
    "phone": "+380501234567",
    "role": "client",
    "status": "active"
}
```

---

## 📊 Статистика

- **Всього користувачів**: 4
- **Адмінів**: 1
- **Клієнтів**: 1
- **Техніків**: 1
- **Диспетчерів**: 1

---

## 🔒 Безпека

⚠️ **ВАЖЛИВО**: Це тестові облікові записи для розробки!

**Для продакшену**:
1. Змініть всі паролі на надійні
2. Використовуйте складні паролі (мінімум 12 символів)
3. Увімкніть двофакторну автентифікацію
4. Регулярно ротуйте паролі
5. Видаліть тестові акаунти

---

## 🛠️ Скрипт створення користувачів

Файл: `/workspaces/deapseak/scripts/create-test-users.js`

```bash
# Запустити скрипт
cd /workspaces/deapseak
node scripts/create-test-users.js
```

---

**Останнє оновлення**: 6 грудня 2024  
**База даних**: MongoDB `deapseak_v2`  
**Статус**: ✅ Активні
