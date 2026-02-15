# 🔑 DeapSeaK v2.0 - Demo Credentials

**Дата:** 11 лютого 2026  
**Версія:** v2.0 (FestLift Edition)

---

## 🌐 Доступ до системи

### URL:
- **Головна:** https://redesigned-waddle-v6w5g7rvxqpxf6pwg-5000.app.github.dev
- **Логін:** https://redesigned-waddle-v6w5g7rvxqpxf6pwg-5000.app.github.dev/pages/auth/login.html

---

## 👥 Demo акаунти

| Роль | Email | Пароль | Спеціалізація |
|------|-------|--------|---------------|
| 👨‍💼 **Адмін** | info@festlift.pt | admin123 | Повний доступ |
| 📞 **Диспетчер** | dispatcher@festlift.pt | dispatcher123 | Управління заявками |
| 🔧 **Технік** | tech1@festlift.pt | tech123 | Загальне обслуговування |
| 🔧 **Технік 2** | tech2@festlift.pt | tech123 | Електрика |
| 🔧 **Технік 3** | tech3@festlift.pt | tech123 | Механіка |
| 👤 **Клієнт** | client@festlift.pt | client123 | Перегляд заявок |

---

## ✅ Статус перевірки

Всі акаунти перевірені та працюють ✅

```bash
✅ info@festlift.pt          - Успішний вхід
✅ dispatcher@festlift.pt    - Успішний вхід
✅ tech1@festlift.pt         - Успішний вхід
✅ client@festlift.pt        - Успішний вхід
```

---

## 🔧 Оновлення акаунтів

### Пересоздати користувачів:
```bash
mongosh deapseak --quiet --eval 'db.users.deleteMany({});'
node create-demo-users.js
```

### Перевірити акаунти:
```bash
mongosh deapseak --eval 'db.users.find({}, {email:1, username:1, role:1}).pretty()'
```

---

## 📝 Зміни від попередньої версії

### Оновлено (11.02.2026):
- ✅ Email домен: `deapseak.com` → `festlift.pt`
- ✅ Admin email: `admin@deapseak.com` → `info@festlift.pt`
- ✅ Роль техніків: `tech` → `technician` (відповідає Mongoose schema)
- ✅ Структура користувача: `fullName` → `firstName` + `lastName`
- ✅ Формат телефону: `+351 912 345 678` → `+351912345678` (без пробілів)
- ✅ Спеціалізація: українські назви → enum (`general`, `electric`, `mechanical`)

---

## 🚀 Quick Start

1. **Запустити систему:**
   ```bash
   ./autostart.sh
   ```

2. **Відкрити в браузері:**
   https://redesigned-waddle-v6w5g7rvxqpxf6pwg-5000.app.github.dev

3. **Увійти як адмін:**
   - Email: `info@festlift.pt`
   - Пароль: `admin123`

---

**Готово до використання! 🎉**
