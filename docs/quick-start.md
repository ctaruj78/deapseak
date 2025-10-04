# 🚀 ШВИДКИЙ СТАРТ - DeapSeaK CRM

## ⚡ Запуск за 5 хвилин

### 1️⃣ Перевірити систему
```bash
# Перевірити Node.js
node --version  # потрібно ≥ 14

# Перевірити MongoDB
mongod --version  # потрібно ≥ 4.0
```

### 2️⃣ Запустити MongoDB
```bash
# Linux/macOS
sudo systemctl start mongodb

# Windows
net start MongoDB

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 3️⃣ Запустити API сервер
```bash
cd /workspaces/deapseak
node api-server.js
```
✅ Очікуваний результат: `🚀 API сервер запущено на порту 3001`

### 4️⃣ Відкрити CRM систему
1. Відкрити браузер
2. Перейти до: `file:///workspaces/deapseak/pages/crm-integrated.html`
3. Або запустити локальний веб-сервер:
```bash
cd /workspaces/deapseak
python3 -m http.server 8080
# Потім: http://localhost:8080/pages/crm-integrated.html
```

---

## 🎯 Перші кроки в CRM

### Панель управління
- **Заявки**: Управління заявками на обслуговування
- **Моніторинг**: Відстеження стану ліфтів та системи
- **Чат**: Комунікація між користувачами
- **Профіль**: Налаштування облікового запису

### Створення першої заявки
1. Натиснути "Заявки" → "Додати заявку"
2. Заповнити форму:
   - Назва: "Тестова заявка"
   - Тип: "Maintenance"
   - Пріоритет: "Medium"
3. Натиснути "Зберегти"

### Перевірка моніторингу
1. Перейти в "Моніторинг"
2. Переглянути дашборд з графіками
3. Перевірити статистику системи

---

## 🧪 Швидке тестування

### Автоматичні тести
```bash
# Відкрити тестову сторінку
open /workspaces/deapseak/test-modules.html
# Або в браузері: file:///workspaces/deapseak/test-modules.html

# Натиснути "Запустити всі тести"
```

### Ручна перевірка API
```bash
# Перевірити статус API
curl http://localhost:3001/api/status

# Тест реєстрації користувача
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

---

## ❗ Швидкі виправлення

### Проблема: API сервер не запускається
```bash
# Перевірити зайнятість порту
lsof -i :3001

# Вбити процес на порту 3001
kill -9 $(lsof -ti:3001)

# Перезапустити
node api-server.js
```

### Проблема: MongoDB не підключається
```bash
# Перевірити статус
sudo systemctl status mongodb

# Запустити вручну
mongod --dbpath /var/lib/mongodb

# Перевірити підключення
mongo --eval "db.adminCommand('ismaster')"
```

### Проблема: Frontend не завантажується
```bash
# Перевірити файли
ls -la /workspaces/deapseak/pages/crm-integrated.html

# Запустити простий веб-сервер
python3 -m http.server 8080
# Перейти: http://localhost:8080/pages/crm-integrated.html
```

---

## 🔧 Корисні команди

### Розробка
```bash
# Перезапуск API з автоматичним перезавантаженням
npx nodemon api-server.js

# Перегляд логів в реальному часі
tail -f api-server.log

# Backup бази даних
mongodump --db deapseak --out ./backup/$(date +%Y%m%d)
```

### Налагодження
```bash
# Перевірка всіх процесів
ps aux | grep -E "(node|mongo)"

# Перевірка портів
netstat -tlnp | grep -E "(3001|27017)"

# Очищення логів
> api-server.log
```

---

## 📱 Мобільна версія

CRM система адаптована для мобільних пристроїв:
- ✅ Адаптивний дизайн
- ✅ Touch-friendly інтерфейс  
- ✅ Оптимізовані форми
- ✅ Швидке завантаження

---

## 🆘 Технічна підтримка

### Контакти
- **Документація**: `/docs/user-manual.md`
- **Технічна документація**: `/docs/technical-guide.md`
- **API документація**: `/docs/api-documentation.md`

### Звітування про помилки
Створіть детальний звіт з:
1. Описом проблеми
2. Кроками для відтворення
3. Скріншотами (якщо потрібно)
4. Логами з консолі браузера
5. Версією браузера та ОС

---

**✨ Готово! Система готова до роботи!**

🎉 **Вітаємо з успішним запуском DeapSeaK CRM!**