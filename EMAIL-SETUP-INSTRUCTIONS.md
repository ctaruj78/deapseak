# 📧 Інструкція по налаштуванню Email для Orçamentos

## ⚠️ Поточний статус

**SMTP Email тимчасово недоступний** через застарілий ключ автентифікації Brevo.

### Що працює зараз:
- ✅ Створення кошторисів
- ✅ Збереження в MongoDB  
- ✅ Експорт в PDF
- ✅ Перегляд списку
- ⚠️ Відправка email (режим розробки - тільки логування)

## 🔧 Режим розробки (активний зараз)

При натисканні кнопки "Email":
1. ✅ Кошторис марк markirується як "enviado"
2. ✅ Зберігається запис про "відправку" в MongoDB
3. ⚠️ Email **НЕ** відправляється реально
4. 💡 В консолі сервера логується інформація про email

**Повідомлення користувачу:**
```
✅ Orçamento marcado como enviado
⚠️ Email não foi enviado - SMTP não está configurado (modo desenvolvimento)
```

## 🚀 Як налаштувати реальну відправку email

### Варіант 1: Оновити ключ Brevo (Рекомендовано)

1. **Увійти в Brevo Dashboard:**
   - URL: https://app.brevo.com/
   - Login: info@festlift.pt
   - Password: [пароль від акаунта]

2. **Згенерувати новий SMTP ключ:**
   - Перейти: Settings → SMTP & API → SMTP Keys
   - Натиснути "Generate a new SMTP key"
   - Скопіювати ключ (показується тільки 1 раз!)

3. **Оновити .env:**
   ```bash
   SMTP_PASS=xsmtpsib-[НОВИЙ_КЛЮЧ_ТУТ]
   ```

4. **Перезапустити сервер:**
   ```bash
   ./autostart.sh
   ```

### Варіант 2: Використати інший SMTP провайдер

#### Gmail SMTP:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-gmail@gmail.com
```

**Важливо для Gmail:**
- Увімкнути "2-Step Verification"
- Створити "App Password": https://myaccount.google.com/apppasswords

#### SendGrid:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-api-key-here
EMAIL_FROM=verified@yourdomain.com
```

#### Mailgun:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
EMAIL_FROM=noreply@your-domain.com
```

## 🧪 Тестування після налаштування

### 1. Тест з командної лінії:
```bash
node test-email-brevo.js
```

**Очікуваний результат:**
```
✅ EMAIL ВІДПРАВЛЕНО УСПІШНО!
📋 Деталі відправки:
   Message ID: <...>
   Response: 250 OK
```

### 2. Тест через систему:
1. Створити тестовий кошторис
2. Натиснути "Email"
3. Ввести **СВІЙ** email (для тесту)
4. Перевірити отримання email

## 📊 Перевірка логів

### Логи сервера:
```bash
tail -f logs/unified-server.log | grep -i email
```

### MongoDB - історія відправок:
```javascript
// В mongosh:
use deapseak
db.orcamentos.findOne(
  { numero: "ORC-2026-01-001" },
  { emailsEnviados: 1 }
)

// Показує:
{
  emailsEnviados: [
    {
      para: "cliente@example.com",
      data: "2026-01-14T10:30:00Z",
      sucesso: true/false,
      erro: "..." // якщо є
    }
  ]
}
```

## ⚙️ Технічні деталі

### Обробка помилок SMTP

Код автоматично:
1. Перевіряє наявність SMTP налаштувань
2. Намагається відправити email
3. При помилці:
   - Логує деталі помилки
   - Зберігає запис в MongoDB
   - Повертає success з warning
   - Не блокує роботу системи

### Коди помилок:

| Код | Причина | Рішення |
|-----|---------|---------|
| `ECONNREFUSED` | Неможливо підключитися до SMTP | Перевірити SMTP_HOST та SMTP_PORT |
| `EAUTH` | Помилка автентифікації | Оновити SMTP_USER та SMTP_PASS |
| `535 5.7.8` | Невірні credentials | Згенерувати новий SMTP ключ |
| `550 5.7.1` | Email не верифікований | Верифікувати sender в Brevo |

## 💡 Поради

### Для розробки:
- ✅ Використовуйте поточний режим (тільки логування)
- ✅ Тестуйте PDF експорт
- ✅ Всі інші функції працюють

### Для production:
- ⚠️ Оновіть SMTP ключ перед запуском
- ⚠️ Тестуйте відправку на свій email спочатку
- ⚠️ Перевіряйте ліміти провайдера

### Brevo ліміти (FREE):
- 📧 300 email/день
- 📧 Необмежена кількість контактів
- 📧 Базова статистика
- 📧 SMTP + API доступ

## 🔐 Безпека

**Ніколи не коммітьте:**
- ❌ `.env` файл
- ❌ SMTP паролі/ключі
- ❌ API ключі

**Використовуйте:**
- ✅ `.env.example` для шаблону
- ✅ `.gitignore` для `.env`
- ✅ Environment variables в production

## 📞 Підтримка Brevo

- 🌐 Dashboard: https://app.brevo.com/
- 📧 Support: support@brevo.com
- 📖 Docs: https://developers.brevo.com/
- 💬 Chat: Доступний в dashboard

## ✅ Контрольний список

- [ ] Увійти в Brevo Dashboard
- [ ] Згенерувати новий SMTP ключ
- [ ] Оновити SMTP_PASS в .env
- [ ] Перезапустити сервер
- [ ] Запустити тест: `node test-email-brevo.js`
- [ ] Створити тестовий кошторис
- [ ] Відправити на свій email
- [ ] Підтвердити отримання
- [ ] ✅ Email працює!

---

**Дата:** 14 січня 2026  
**Версія:** 2.1.0  
**Статус:** SMTP в режимі розробки, очікує оновлення ключа
