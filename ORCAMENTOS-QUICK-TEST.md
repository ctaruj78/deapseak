# 🧪 Швидкий тест системи кошторисів

## ✅ Перевірка роботи системи

### 1️⃣ Перевірка сервера
```bash
# Статус сервера
ps aux | grep node | grep -v grep

# Перевірка API
curl https://[ваш-url]:5000/api/health
```

**Очікувана відповідь:** `{"status":"ok",...}`

---

## 2️⃣ Тест створення кошторису

### Крок 1: Відкрийте сторінку створення
```
URL: /pages/admin/invoice-template.html
```

### Крок 2: Заповніть форму
```
Cliente: Test Company Lda
Morada: Rua Test, 123
        Lisboa, 1000-001
Email: test@example.pt

Serviços:
1. Manutenção técnica de elevador | Qtd: 1 | Preço: 100.00
2. Reparação de motor           | Qtd: 1 | Preço: 250.00
```

### Крок 3: Збережіть
1. Натисніть **"Guardar Orçamento"** 🟢
2. Відкрийте консоль браузера (F12)
3. Перевірте логи:

```javascript
// Очікувані логи:
💾 Iniciando salvamento do orçamento...
📦 Serviços coletados: 2
👤 Cliente: {...}
🔑 Token encontrado: SIM
🌐 Enviando para /api/orcamentos...
📡 Resposta recebida: 201 Created
✅ Orçamento salvo com ID: [ObjectId]
📝 Número: ORC-2026-01-XXX
```

4. Підтвердіть діалог успіху

**✅ УСПІХ якщо:**
- Немає помилок у консолі
- З'явилося повідомлення про успіх
- Показано номер орçаменту

---

## 3️⃣ Тест експорту PDF

### Після збереження кошторису:
1. Натисніть **"PDF"** 📄
2. Перевірте завантаження файлу
3. Відкрийте PDF

**✅ УСПІХ якщо:**
- PDF завантажується
- Файл називається: `Orcamento_ORC-2026-01-XXX.pdf`
- Містить:
  - Логотип FESTLIFT (або назву)
  - Номер та дату
  - Дані клієнта
  - Таблицю послуг
  - Розрахунки (Subtotal, IVA 23%, Total)
  - Банківські реквізити BPI
  - Примітки

---

## 4️⃣ Тест списку кошторисів

### Крок 1: Відкрийте список
```
URL: /pages/admin/orcamentos-list.html
```

### Крок 2: Перевірте відображення
**✅ УСПІХ якщо:**
- Відображаються карточки кошторисів
- На карточці видно:
  - Номер (ORC-YYYY-MM-XXX)
  - Ім'я клієнта
  - Email
  - Дату створення
  - Валідність (30 днів)
  - Сумарну вартість
  - Статус (Rascunho 🟤)
  - Кнопки: Ver, Editar, Eliminar

### Крок 3: Спробуйте фільтри
```
Status: Rascunho
Cliente: Test
```

**✅ УСПІХ якщо:**
- Фільтрація працює
- Результати оновлюються

---

## 5️⃣ Тест відправки email (опційно)

### Передумова: Налаштований Brevo SMTP

1. Натисніть **"Email"** ✉️
2. Введіть email клієнта
3. Підтвердьте відправку

**✅ УСПІХ якщо:**
- Повідомлення "Email enviado com sucesso"
- Клієнт отримує email з орçаментом

---

## 🐛 Діагностика проблем

### Якщо кошторис не зберігається:

#### Перевірте консоль браузера (F12):
```javascript
// Шукайте помилки:
❌ Token encontrado: NÃO  → Увійдіть знову
❌ 401 Unauthorized       → Токен застарів
❌ 500 Internal Error     → Перевірте сервер
❌ Network Error          → Перевірте підключення
```

#### Перевірте сервер:
```bash
# Логи сервера
tail -f logs/unified-server.log

# Статус MongoDB
mongosh --eval "db.adminCommand('ping')"

# Перезапуск
./autostart.sh
```

### Якщо список порожній:

#### MongoDB перевірка:
```bash
mongosh deapseak

# В mongosh:
use deapseak
db.orcamentos.find().pretty()
```

**Очікувано:** Список документів

#### Перевірте консоль браузера:
```javascript
// Шукайте:
📋 Resultado da API: {success: true, data: [...]}
```

### Якщо PDF не генерується:

#### Перевірте консоль:
```javascript
// Шукайте помилки:
❌ jsPDF is not defined  → Перезавантажте сторінку
❌ autoTable is not a function → CDN не завантажено
```

#### Перевірте інтернет:
```bash
curl https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
```

---

## 📊 Перевірка бази даних

### MongoDB команди:
```bash
mongosh deapseak

# Кількість орçаментів
db.orcamentos.countDocuments()

# Останні 5 орçаментів
db.orcamentos.find().sort({data: -1}).limit(5).pretty()

# Пошук по клієнту
db.orcamentos.find({"cliente.nome": /Test/i}).pretty()

# Статистика по статусам
db.orcamentos.aggregate([
  {$group: {_id: "$status", count: {$sum: 1}}}
])
```

---

## 🎯 Контрольний список

- [ ] Сервер запущено ✅
- [ ] MongoDB працює ✅
- [ ] Можу увійти в систему ✅
- [ ] Створив тестовий кошторис ✅
- [ ] Кошторис зберігся ✅
- [ ] Згенерував PDF ✅
- [ ] Список відображається ✅
- [ ] Фільтри працюють ✅
- [ ] (Опційно) Email відправлено ✅

---

## 💡 Корисні URL

```
Логін:        /pages/auth/login.html
Створити:     /pages/admin/invoice-template.html
Список:       /pages/admin/orcamentos-list.html
API Health:   /api/health
API List:     /api/orcamentos
```

---

## 🆘 Швидка допомога

### Повний перезапуск:
```bash
# Зупинити все
pkill -f node
pkill -f mongod

# Очистити кеш браузера (Ctrl+Shift+Del)

# Запустити знову
./autostart.sh
```

### Перевірка токену:
```javascript
// В консолі браузера (F12):
console.log(localStorage.getItem('liftmanager_jwt'));

// Якщо null - увійдіть знову
```

---

**Час тестування: ~5-10 хвилин**  
**Успіхів! 🚀**
