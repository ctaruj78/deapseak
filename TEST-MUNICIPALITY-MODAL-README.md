# 🧪 Тестування Модального Вікна Муніципалітетів - Швидкий старт

## 🚀 Як запустити тести за 10 секунд

```bash
# Один command - все готово!
node test-municipality-modal.js
```

## 📊 Що тестується?

### ✅ Працює (5/6):
1. **GET Lift Data** - отримання даних ліфта з municipality
2. **Email Templates** - перевірка всіх placeholders
3. **Municipalities API** - отримання списку 37 concelhos
4. **Copy Data** - копіювання даних в JSON
5. **Close Modal** - закриття модального вікна

### ❌ Не працює (1/6):
6. **POST Send Email** - endpoint потрібно створити

## 📋 Результати останнього запуску

```
🎯 Тестовий ліфт: TEST-OEIRAS-001
📮 Postal Code: 2795-146
🏛️ Município: Oeiras (15 km from Rio de Mouro)
📧 Email: geral@cm-oeiras.pt
📞 Phone: +351 214 409 200
```

## 📁 Файли

- `test-municipality-modal.js` - скрипт тестування (Node.js)
- `test-results.txt` - останні результати
- `MUNICIPALITY-MODAL-TEST-REPORT.md` - детальний звіт

## 🔧 Вимоги

- ✅ Node.js 18+
- ✅ Unified Server на port 5000
- ✅ JWT токен в `~/.deapseak-token`
- ✅ Тестовий ліфт `69602002fa867aced6aba725`

## 💡 Якщо токен прострочений

```bash
# Логін + запуск тестів
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"info@festlift.pt","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4) \
  && echo "$TOKEN" > ~/.deapseak-token \
  && node test-municipality-modal.js
```

## 📖 Детальна інформація

Дивіться: `MUNICIPALITY-MODAL-TEST-REPORT.md`

## 🎯 Наступні кроки

1. Створити `POST /api/lifts/:id/notify-municipality`
2. Інтегрувати Nodemailer + Brevo SMTP
3. Додати логування в `notification_history`
4. Створити dashboard комунікацій

---

**Створено:** 2026-01-08  
**Статус:** ✅ Готово до використання  
