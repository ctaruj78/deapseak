# 📧 Налаштування Email для FestLift

**Дата:** 11 лютого 2026  
**Сервіс:** Brevo (колишній Sendinblue)  
**План:** Free - 300 emails/day

---

## 🔧 Поточні налаштування

### Brevo API ключ (ОСНОВНИЙ метод)
```env
BREVO_API_KEY=your-brevo-api-key-here
EMAIL_FROM=FestLift <info@festlift.pt>
```

> ⚠️ **ВАЖЛИВО:** Замініть `your-brevo-api-key-here` на ваш реальний ключ з Brevo Dashboard

### SMTP (Fallback метод)
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user@smtp-brevo.com
SMTP_PASS=your-smtp-api-key-here
```

> ⚠️ **ВАЖЛИВО:** Отримайте ваш SMTP API key з Brevo Dashboard → SMTP & API

---

## ✅ Виправлення помилки 535 Authentication failed

### Проблема:
```
❌ Помилка надсилання email: Invalid login: 535 5.7.8 Authentication failed
```

### Причина:
Endpoint `/api/send-email` використовував застарілий SMTP метод замість Brevo API.

### Рішення:
1. ✅ **Оновлено unified-server.js** - тепер використовує Brevo API як основний метод
2. ✅ **SMTP як fallback** - якщо API не спрацює, система спробує SMTP
3. ✅ **Додано перевірку** - система перевіряє наявність `BREVO_API_KEY` перед відправкою

---

## 🔄 Як працює відправка email

### 1. Основний метод - Brevo API (найнадійніший):
```javascript
await emailService._sendEmail(to, subject, html);
```

**Переваги:**
- ✅ Високий deliverability rate (99%+)
- ✅ Не потребує SMTP налаштувань
- ✅ Автоматичний tracking відкриттів та кліків
- ✅ 300 emails/день безкоштовно

### 2. Fallback метод - SMTP:
Якщо Brevo API не спрацює, система автоматично спробує SMTP:
```javascript
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
});
```

---

## 🧪 Тестування email

### ✅ Швидкий тест (рекомендовано):
```bash
./test-email-api.sh
```

**Очікуваний результат:**
```
🧪 Тестування Email API...
📝 Крок 1: Логін як адмін...
✅ Токен отримано: eyJhbGci...
📧 Крок 2: Відправка тестового email...

✅ Email успішно відправлено!
📬 Перевірте email: ctaruj78@gmail.com

📋 Останні логи Email:
✅ Email successfully sent via Brevo API to: ctaruj78@gmail.com
```

### Ручне тестування через API:
```bash
# 1. Отримати токен
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "info@festlift.pt", "password": "admin123"}' \
  | jq -r '.data.token')

# 2. Відправити email
curl -X POST http://localhost:5000/api/send-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello from FestLift!</h1>"
  }'
```

### Через Admin Panel:
1. Увійти як admin: `info@festlift.pt` / `admin123`
2. Відкрити **Users** → створити користувача
3. Натиснути кнопку "📧 Відправити пароль"
4. Перевірити консоль браузера та server logs

---

## 📊 Моніторинг

### Server logs:
```bash
tail -f logs/unified-server.log | grep EMAIL
```

### Успішна відправка:
```
📧 =============== EMAIL SENDING REQUEST ===============
📬 To: client@example.com
📋 Subject: Ваші дані для входу
👤 Requested by: info@festlift.pt
✅ Email successfully sent via Brevo API to: client@example.com
```

### Помилка:
```
❌ Brevo API error: ...
🔄 Спроба відправки через SMTP fallback...
✅ Email sent via SMTP fallback
```

---

## 🔑 Отримати новий API ключ Brevo

1. Відкрити https://app.brevo.com/
2. Увійти в акаунт FestLift
3. **Settings** → **SMTP & API**
4. **API Keys** → **Generate a new API key**
5. Скопіювати ключ та оновити `.env`:
   ```env
   BREVO_API_KEY=xkeysib-НОВИЙ_КЛЮЧ
   ```
6. Перезапустити сервер:
   ```bash
   ./autostart.sh
   ```

---

## 📝 Типи email в системі

### 1. Password Email (users.html)
- Відправляється після створення користувача
- Містить логін та тимчасовий пароль
- Endpoint: `/api/send-email`

### 2. New Request Notification (emailService.js)
- Відправляється клієнту після створення заявки
- Містить номер та деталі заявки
- Метод: `emailService.sendNewRequestNotification()`

### 3. Service Reminder (emailService.js)
- Нагадування про необхідність техобслуговування
- Відправляється автоматично
- Метод: `emailService.sendServiceReminder()`

### 4. Inspection Report (unified-server.js)
- Відправка звіту інспекції клієнту
- Endpoint: `/api/email/send-inspection-report`
- Містить PDF attachment (опціонально)

---

## ⚠️ Troubleshooting

### Помилка: "BREVO_API_KEY не налаштовано"
**Рішення:** Додайте ключ в `.env` файл

### Помилка: "535 Authentication failed"
**Рішення:** 
1. Перевірте чи валідний `BREVO_API_KEY`
2. Перезапустіть сервер після оновлення `.env`

### Помилка: "Daily quota exceeded"
**Рішення:** 
- Free план: 300 emails/день
- Upgrade до Starter: 20,000 emails/місяць за $25

### Email не доходить
**Перевірка:**
1. Brevo Dashboard → **Statistics** → **Transactional**
2. Перевірити чи email в спамі
3. Перевірити email адресу отримувача

---

## 📈 Ліміти

| План | Emails/день | Emails/місяць | Вартість |
|------|-------------|---------------|----------|
| **Free** | 300 | 9,000 | $0 |
| Starter | - | 20,000 | $25 |
| Business | - | 100,000 | $65 |
| Enterprise | - | Unlimited | Custom |

---

## 🎯 Результат

✅ Email система налаштована та працює  
✅ Brevo API як основний метод  
✅ SMTP fallback для надійності  
✅ Перевірка перед відправкою  
✅ Детальні логи для debugging  

**Готово до використання! 📧🚀**
