# 📧 Налаштування Brevo SMTP для Production

## ✅ ВЖЕ НАЛАШТОВАНО!

**Brevo SMTP вже повністю налаштовано і готовий до використання!**

### 🔑 Поточні налаштування (.env):

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=8b688f001@smtp-brevo.com
SMTP_PASS=xsmtpsib-eff1ed4c64a9493015a7277231ff34f428d3b843a2ae0f87ef2b9cb4225d3286-***
SMTP_FROM="LiftMaster Pro" <info@festlift.pt>
```

### 📦 Залежності:
- ✅ **nodemailer** v7.0.10 встановлено
- ✅ **Brevo SMTP** налаштовано
- ✅ **Email відправник** верифіковано: info@festlift.pt

### 🚀 Як використовувати:

1. **Створіть користувача** в адмін панелі (`/pages/admin/users.html`)
2. **Натисніть "Надіслати на Email"** після генерації пароля
3. **Email автоматично надішлеться** через Brevo SMTP

### 📊 Моніторинг:

Перевірити статистику відправок:
- **Dashboard:** https://app.brevo.com/
- **Statistics:** https://app.brevo.com/statistics/email
- **API Key:** xkeysib-eff1ed4c64a9493015a7277231ff34f428d3b843a2ae0f87ef2b9cb4225d3286-***

---

## 📖 Додаткова інформація (якщо потрібно змінити налаштування)

## Що таке Brevo?

**Brevo** (колишній Sendinblue) - це професійний сервіс для надсилання email з:
- ✅ Безкоштовним планом (300 email/день)
- ✅ Високою доставляємістю
- ✅ Аналітикою відправок
- ✅ SMTP та API
- ✅ Підтримкою транзакційних email

## 🚀 Крок 1: Реєстрація в Brevo

1. Перейдіть на https://www.brevo.com/
2. Натисніть **"Sign up free"**
3. Заповніть форму реєстрації:
   - Email (буде використовуватися для SMTP)
   - Компанія: **FestLift**
   - Країна: **Portugal**
4. Підтвердіть email

## 🔑 Крок 2: Отримання SMTP ключа

1. Увійдіть в обліковий запис Brevo
2. Перейдіть: **Settings → SMTP & API** (або https://app.brevo.com/settings/keys/smtp)
3. В розділі **"SMTP"** натисніть **"Generate a new SMTP key"**
4. Скопіюйте згенерований ключ (**це ваш пароль!**)

## 📝 Крок 3: Налаштування відправника

1. Перейдіть: **Senders & IP** (https://app.brevo.com/senders)
2. Натисніть **"Add a sender"**
3. Заповніть дані:
   - **Name:** `LiftMaster Pro` або `FestLift Support`
   - **Email:** Ваш домен email (наприклад: `noreply@festlift.pt`)
4. **Важливо:** Підтвердіть домен через DNS записи (якщо використовуєте власний домен)

## ⚙️ Крок 4: Налаштування .env файлу

Додайте наступні змінні в `.env` файл вашого backend:

```env
# ============================================
# BREVO SMTP CONFIGURATION
# ============================================

# Brevo SMTP сервер
SMTP_HOST=smtp-relay.brevo.com

# Порт (587 для TLS, 465 для SSL)
SMTP_PORT=587

# Ваш email з Brevo (той що використовували при реєстрації)
SMTP_USER=your-brevo-email@example.com

# SMTP ключ (згенерований в кроці 2)
SMTP_PASS=xsmtpsib-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0

# Відправник (ім'я та email)
SMTP_FROM="LiftMaster Pro" <noreply@festlift.pt>
```

### 📌 Приклад заповнення:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=admin@festlift.pt
SMTP_PASS=xsmtpsib-7c8d9e0f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8
SMTP_FROM="LiftMaster Pro" <noreply@festlift.pt>
```

## 🧪 Крок 5: Тестування

1. Перезапустіть backend сервер:
   ```bash
   npm run dev
   # або
   node backend/server.js
   ```

2. В адмін панелі створіть нового користувача
3. Натисніть **"Надіслати на Email"**
4. Перевірте консоль backend - має з'явитися:
   ```
   ✅ Email успішно надіслано через Brevo!
   📨 Message ID: <...>
   ```

5. Перевірте inbox користувача - має прийти email з паролем

## 📊 Моніторинг відправок

1. В Brevo панелі перейдіть: **Statistics → Email**
2. Тут ви побачите:
   - Скільки email надіслано
   - Скільки доставлено
   - Скільки відкрито
   - Помилки доставки

## 🔧 Налаштування DNS (для власного домену)

Якщо використовуєте email з `@festlift.pt`, додайте DNS записи:

### SPF запис:
```
Type: TXT
Host: @
Value: v=spf1 include:spf.brevo.com ~all
```

### DKIM запис:
```
Type: TXT
Host: mail._domainkey
Value: [отримаєте в Brevo після додавання домену]
```

### DMARC запис (опціонально):
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@festlift.pt
```

## 💰 Ліміти та ціни (2026)

### Безкоштовний план:
- 📨 **300 email/день**
- ✅ Безлімітні контакти
- ✅ SMTP & API
- ✅ Транзакційні email
- ✅ Базова аналітика

### Lite план ($25/місяць):
- 📨 **10,000 email/місяць**
- ✅ Все з безкоштовного
- ✅ Без брендингу Brevo
- ✅ Розширена аналітика

### Premium ($65/місяць):
- 📨 **20,000 email/місяць**
- ✅ Все з Lite
- ✅ A/B тестування
- ✅ Пріоритетна підтримка

## 🐛 Troubleshooting

### Помилка: "Authentication failed"
- Перевірте `SMTP_USER` (має бути email з Brevo)
- Перевірте `SMTP_PASS` (має бути SMTP ключ, не пароль від акаунта)

### Помилка: "Sender not verified"
- Перейдіть в **Senders & IP**
- Підтвердіть email відправника
- Якщо власний домен - налаштуйте DNS

### Email не приходять
1. Перевірте spam/junk папку
2. В Brevo перевірте **Statistics** → чи є помилки
3. Перевірте DNS записи (SPF, DKIM)

### Превищено ліміт
- На безкоштовному плані: 300 email/день
- Почекайте до наступного дня або оновіть план

## 📚 Корисні посилання

- 🌐 Brevo сайт: https://www.brevo.com/
- 📖 Документація SMTP: https://developers.brevo.com/docs/send-a-transactional-email
- 🔑 SMTP ключі: https://app.brevo.com/settings/keys/smtp
- 📊 Статистика: https://app.brevo.com/statistics/email
- 💬 Підтримка: https://help.brevo.com/

## ✅ Чеклист налаштування

- [ ] Зареєстрований акаунт в Brevo
- [ ] Згенерований SMTP ключ
- [ ] Додано та підтверджено email відправника
- [ ] Налаштовано `.env` файл
- [ ] Встановлено `nodemailer`: `npm install nodemailer`
- [ ] Перезапущено backend сервер
- [ ] Протестовано відправку email
- [ ] Налаштовано DNS (якщо власний домен)
- [ ] Перевірено доставку email

## 📧 Підтримка FestLift

Якщо виникли питання:
- 📞 Телефон: +351 961 777 666
- 📧 Email: suporte@festlift.pt
- 🌐 Web: https://festlift.pt

---

**Важливо:** Зберігайте SMTP ключ в безпеці! Не комітьте `.env` файл в git!
