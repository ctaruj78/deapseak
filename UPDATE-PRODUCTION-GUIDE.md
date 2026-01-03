# 🔄 Update Production - Quick Guide

## Як оновити production після змін в коді

---

## 📝 Короткий алгоритм

```
Локальні зміни → Git push → Production pull → Restart
```

---

## ✅ Workflow (покроково)

### 1️⃣ Локально - зберегти зміни:

```bash
# Перевірити що змінилось
git status

# Додати всі файли (КРІМ .env - він в .gitignore)
git add .

# Закомітити з описом
git commit -m "Add contact form email functionality"

# Відправити на GitHub
git push origin v2_refactor
```

**Важливо:** `.env` НЕ пушиться - це правильно! Секрети залишаються локально.

---

### 2️⃣ На Production сервері - оновити код:

#### Варіант A: VPS (Ubuntu/PM2)
```bash
# SSH до сервера
ssh user@your-server.com

# Перейти в папку проекту
cd /var/www/deapseak

# Отримати зміни з GitHub
git pull origin v2_refactor

# Встановити нові залежності (якщо додавали в package.json)
npm install --production

# Перезапустити додаток
pm2 restart deapseak

# Перевірити що працює
pm2 logs deapseak --lines 50
```

#### Варіант B: Heroku
```bash
# Локально - просто push
git push heroku v2_refactor:main

# Heroku автоматично:
# - Завантажить код
# - Встановить залежності
# - Перезапустить додаток
# - Використає існуючі Config Vars (секрети)

# Перевірити логи
heroku logs --tail
```

#### Варіант C: Docker
```bash
# На сервері
ssh user@server
cd /var/www/deapseak

# Отримати зміни
git pull origin v2_refactor

# Пересобрати і перезапустити контейнери
docker-compose down
docker-compose up -d --build

# Перевірити
docker-compose logs -f app
```

---

### 3️⃣ Перевірити що працює:

```bash
# Перевірити API
curl https://your-domain.com/api/health

# Очікуваний результат:
# {"status":"ok","timestamp":"2026-01-03T...","port":5000}

# Відкрити в браузері
https://your-domain.com

# Перевірити функціонал:
# - Логін працює
# - Contact form відправляє email
# - WebSocket підключається
```

---

## 🔐 Що з секретами (.env)?

### На production сервері .env створюється ОДИН РАЗ вручну!

**Сценарій 1: Перший deploy (створити .env):**
```bash
# SSH до сервера
ssh user@server
cd /var/www/deapseak

# Створити .env
nano .env
```

Вставити (замінити на свої значення):
```env
MONGODB_URI=mongodb://localhost:27017/deapseak
JWT_SECRET=your-production-secret-here
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=YOUR-BREVO-USER@smtp-brevo.com
SMTP_PASS=xsmtpsib-your-production-key-here
SMTP_FROM="LiftMaster Pro" <info@festlift.pt>
ADMIN_EMAIL=info@festlift.pt
NODE_ENV=production
```

**Зберегти:** `Ctrl+O`, `Enter`, `Ctrl+X`

**Сценарій 2: Оновлення коду (НЕ чіпати .env):**
```bash
# .env вже існує на сервері - не треба нічого міняти!
git pull origin v2_refactor  # .env не завантажується (в .gitignore)
pm2 restart deapseak         # Використовує існуючий .env
```

**Сценарій 3: Додали нову змінну в .env.example:**
```bash
# 1. Локально оновили .env.example
git add .env.example
git commit -m "Add ADMIN_EMAIL to .env.example"
git push

# 2. На production - додати вручну
ssh user@server
cd /var/www/deapseak
git pull  # Завантажить .env.example (для довідки)
nano .env # Додати нову змінну ADMIN_EMAIL=...
pm2 restart deapseak
```

---

## 📊 Troubleshooting

### Проблема: "Module not found"
**Причина:** Додали нову залежність, не встановили на production

**Рішення:**
```bash
ssh user@server
cd /var/www/deapseak
npm install --production
pm2 restart deapseak
```

---

### Проблема: "Cannot connect to MongoDB"
**Причина:** MongoDB не запущено або неправильний MONGODB_URI

**Рішення:**
```bash
# Перевірити MongoDB
systemctl status mongod

# Якщо не запущено
systemctl start mongod

# Перевірити .env
cat .env | grep MONGODB_URI

# Перезапустити додаток
pm2 restart deapseak
```

---

### Проблема: "Email not sending"
**Причина:** SMTP_PASS неправильний або прострочений

**Рішення:**
```bash
# 1. Згенерувати новий SMTP key на Brevo
# https://app.brevo.com/ → SMTP & API

# 2. Оновити на production
ssh user@server
nano /var/www/deapseak/.env
# Замінити SMTP_PASS=...

# 3. Перезапустити
pm2 restart deapseak

# 4. Тестувати
curl -X POST https://your-domain.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Test message"}'
```

---

### Проблема: "502 Bad Gateway"
**Причина:** Node.js додаток не запущено

**Рішення:**
```bash
# Подивитись PM2 статус
pm2 status

# Якщо offline - переглянути логи
pm2 logs deapseak --lines 100

# Перезапустити
pm2 restart deapseak

# Якщо не допомагає - запустити заново
pm2 delete deapseak
pm2 start unified-server.js --name deapseak
pm2 save
```

---

## 🎯 Best Practices

### ✅ DO:
- Завжди тестуйте локально перед push
- Пишіть зрозумілі commit messages
- Перевіряйте логи після deploy
- Робіть backup MongoDB перед великими змінами
- Використовуйте staging environment для тестування

### ❌ DON'T:
- НЕ комітьте .env файли
- НЕ пушіть прямо на production без тестування
- НЕ видаляйте .env на сервері (секрети втратяться!)
- НЕ зберігайте паролі в коді (hardcoded)
- НЕ deploy в час пік навантаження

---

## 📅 Типовий production update:

```bash
# === ЛОКАЛЬНО ===
# Зробили зміни в unified-server.js
nano unified-server.js

# Перевірили що працює
./autostart.sh
# Тестуємо в браузері http://localhost:5000

# Закомітили
git add unified-server.js
git commit -m "Fix contact form validation"
git push origin v2_refactor

# === НА СЕРВЕРІ ===
ssh user@production-server
cd /var/www/deapseak
git pull origin v2_refactor
pm2 restart deapseak
pm2 logs deapseak --lines 20

# === ПЕРЕВІРКА ===
curl https://your-domain.com/api/health
# Відкрити браузер і протестувати
```

**Весь процес: 2-3 хвилини** ⚡

---

## 🔄 Автоматизація (GitHub Actions)

Щоб НЕ заходити на сервер кожен раз - налаштуйте CI/CD:

**Файл `.github/workflows/deploy.yml`:**
```yaml
name: Auto Deploy

on:
  push:
    branches: [ v2_refactor ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Deploy via SSH
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/deapseak
          git pull origin v2_refactor
          npm install --production
          pm2 restart deapseak
```

**Налаштувати:**
1. GitHub repo → Settings → Secrets → Actions
2. Додати:
   - `SERVER_HOST` = IP сервера
   - `SERVER_USER` = SSH користувач
   - `SSH_PRIVATE_KEY` = Приватний SSH ключ

**Результат:**
```
git push → GitHub бачить зміни → Автоматично deploy на сервер → Готово!
```

---

## 📞 Підтримка

Якщо щось не працює:
1. Перевірити логи: `pm2 logs deapseak`
2. Перевірити процеси: `pm2 status`
3. Перевірити MongoDB: `systemctl status mongod`
4. Перевірити Nginx: `systemctl status nginx`

**Контакт:** info@festlift.pt

---

✅ **Готово!** Тепер ви знаєте як оновлювати production безпечно!
