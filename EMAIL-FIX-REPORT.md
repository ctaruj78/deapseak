# 📧 Звіт про виправлення Email системи

**Дата:** 14 січня 2026  
**Версія:** 2.1.0  
**Проблема:** `ECONNREFUSED 127.0.0.1:587` - помилка відправки email

---

## ❌ Виявлена проблема

### Симптоми:
```
❌ Erro: connect ECONNREFUSED 127.0.0.1:587
```

### Причина:
1. **SMTP налаштування не були задані в `.env`**
   - Відсутні: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
   
2. **Застарілий SMTP ключ Brevo**
   - Ключ перестав працювати (помилка автентифікації 535 5.7.8)

---

## ✅ Виконані виправлення

### 1. Додано SMTP налаштування в `.env` ✅

```env
# ════════════════════════════════════════════════════════
# 📧 Brevo SMTP Email Configuration
# ════════════════════════════════════════════════════════
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user@smtp-brevo.com
SMTP_PASS=your-smtp-api-key-here
EMAIL_FROM="FestLift" <info@festlift.pt>
BREVO_API_KEY=your-brevo-api-key-here
```

> ⚠️ **ВАЖЛИВО:** Замініть `your-brevo-api-key-here` і `your-smtp-api-key-here` на реальні ключі

### 2. Покращена обробка помилок SMTP ✅

**Файл:** `/workspaces/deapseak/backend/routes/orcamentos.js`

**Зміни:**
- ✅ Перевірка наявності SMTP налаштувань
- ✅ Graceful degradation при помилках
- ✅ Режим розробки без блокування роботи
- ✅ Детальне логування помилок
- ✅ Збереження історії спроб відправки

**Логіка:**
```javascript
1. Перевірити чи налаштовано SMTP
   ├─ НІ → Режим розробки (тільки логування)
   └─ ТАК → Спробувати відправити
       ├─ УСПІХ → Зберегти + status "enviado"
       └─ ПОМИЛКА → Логування + warning користувачу
```

### 3. Створено тестовий скрипт ✅

**Файл:** `/workspaces/deapseak/test-email-brevo.js`

**Функції:**
- Перевірка SMTP налаштувань
- Тест підключення до Brevo
- Відправка тестового email
- Детальна діагностика помилок

**Використання:**
```bash
node test-email-brevo.js
```

### 4. Створена документація ✅

**Файли:**
- `EMAIL-SETUP-INSTRUCTIONS.md` - повна інструкція
- `test-email-brevo.js` - тестовий скрипт
- `ORCAMENTOS-FIX-REPORT.md` - оновлено

---

## 🔧 Поточний режим роботи

### Режим розробки (активний)

**Що працює:**
- ✅ Створення кошторисів
- ✅ Збереження в MongoDB
- ✅ Генерація PDF
- ✅ Перегляд списку
- ✅ Кнопка "Email"
- ⚠️ Email НЕ відправляється реально

**Поведінка при натисканні "Email":**
1. Кошторис маркується як "enviado"
2. Зберігається запис в MongoDB (emailsEnviados)
3. Повертається повідомлення:
   ```
   ✅ Orçamento marcado como enviado
   ⚠️ Email não foi enviado - SMTP não configurado (modo desenvolvimento)
   ```
4. Логування в консолі сервера

**Користувач бачить:**
```
✅ Orçamento marcado como enviado (SMTP não configurado - modo desenvolvimento)
⚠️ Email não foi enviado - SMTP não está configurado
```

---

## 🚀 Як активувати реальну відправку

### Варіант 1: Оновити ключ Brevo (Рекомендовано)

```bash
# 1. Увійти в Brevo
https://app.brevo.com/
Login: info@festlift.pt

# 2. Згенерувати новий SMTP ключ
Settings → SMTP & API → Generate new SMTP key

# 3. Оновити .env
SMTP_PASS=xsmtpsib-[НОВИЙ_КЛЮЧ]

# 4. Перезапустити
./autostart.sh

# 5. Тест
node test-email-brevo.js
```

### Варіант 2: Використати Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-gmail@gmail.com
```

**Важливо:** Створити App Password в Gmail:
https://myaccount.google.com/apppasswords

---

## 📊 Що записується в MongoDB

### Schema emailsEnviados:
```javascript
{
  _id: ObjectId("..."),
  numero: "ORC-2026-01-001",
  emailsEnviados: [
    {
      para: "cliente@example.com",
      assunto: "Orçamento ORC-2026-01-001 - FESTLIFT, LDA",
      data: ISODate("2026-01-14T10:30:00Z"),
      sucesso: false,  // false в режимі розробки
      erro: "SMTP não configurado" // причина
    }
  ]
}
```

### Перевірка в MongoDB:
```javascript
use deapseak
db.orcamentos.find(
  { "emailsEnviados.0": { $exists: true } },
  { numero: 1, emailsEnviados: 1 }
).pretty()
```

---

## 🧪 Тестування

### Перевірка SMTP налаштувань:
```bash
# Простий тест
node test-email-brevo.js

# Очікуваний результат (застарілий ключ):
❌ ПОМИЛКА ВІДПРАВКИ:
Повідомлення: Invalid login: 535 5.7.8 Authentication failed
```

### Перевірка режиму розробки:
```bash
# 1. Створити кошторис в системі
# 2. Натиснути "Email"
# 3. Перевірити логи:
tail -f logs/unified-server.log | grep -i "email\|orçamento"

# Очікувано:
⚠️ SMTP não configurado - apenas logging
📧 Email que seria enviado:
   Para: cliente@example.com
   Orçamento: ORC-2026-01-001
   Total: €123.00
```

---

## 🎯 Переваги реалізованого рішення

### 1. Система не ламається ✅
- Помилки SMTP не блокують роботу
- Користувач може продовжувати роботу
- Всі дані зберігаються коректно

### 2. Прозорість ✅
- Чіткі повідомлення про статус
- Логування всіх спроб
- Історія в MongoDB

### 3. Гнучкість ✅
- Працює в режимі розробки
- Легко перемкнути на production
- Підтримка різних SMTP провайдерів

### 4. Відстеження ✅
- Всі спроби відправки логуються
- MongoDB зберігає історію
- Можливість аналізу помилок

---

## 📝 Наступні кроки

### Для адміністратора:

1. **Оновити SMTP ключ:**
   - [ ] Увійти в Brevo Dashboard
   - [ ] Згенерувати новий ключ
   - [ ] Оновити `.env`
   - [ ] Перезапустити сервер
   - [ ] Тестувати

2. **Альтернатива - Gmail:**
   - [ ] Створити App Password
   - [ ] Налаштувати в `.env`
   - [ ] Тестувати

### Для користувача:

**Зараз можна:**
- ✅ Створювати кошториси
- ✅ Зберігати в системі
- ✅ Генерувати PDF
- ✅ Завантажувати PDF
- ✅ Надсилати PDF вручну

**Після налаштування SMTP:**
- ✅ Автоматична відправка email
- ✅ Професійний HTML дизайн
- ✅ Tracking відкриттів (Brevo)

---

## 🔐 Безпека

### Що НЕ треба робити:
- ❌ Коммітити `.env` в Git
- ❌ Публікувати SMTP ключі
- ❌ Передавати ключі в чатах

### Що треба робити:
- ✅ Зберігати ключі в `.env`
- ✅ Використовувати `.env.example` для шаблону
- ✅ Регулярно оновлювати ключі
- ✅ Ротація ключів кожні 3-6 місяців

---

## 📞 Підтримка

### Brevo:
- 🌐 Dashboard: https://app.brevo.com/
- 📧 Support: support@brevo.com
- 📖 Docs: https://developers.brevo.com/

### Система:
- 📋 Логи: `tail -f logs/unified-server.log`
- 🔍 MongoDB: `mongosh deapseak`
- 🧪 Тест: `node test-email-brevo.js`

---

## ✅ Підсумок

### Виправлено:
1. ✅ Додано SMTP налаштування в `.env`
2. ✅ Покращена обробка помилок
3. ✅ Режим розробки без блокування
4. ✅ Детальне логування
5. ✅ Тестовий скрипт
6. ✅ Документація

### Працює:
- ✅ Створення кошторисів
- ✅ Збереження
- ✅ PDF генерація
- ✅ Список
- ✅ Кнопка Email (режим розробки)

### Потребує:
- ⚠️ Оновлення SMTP ключа Brevo (для production)

---

**Статус:** ✅ Система повністю функціональна в режимі розробки  
**Email:** ⚠️ Режим розробки - тільки логування (очікує оновлення SMTP ключа)

**Версія:** 2.1.0  
**Дата:** 14 січня 2026
