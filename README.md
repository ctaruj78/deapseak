# 🏢 DeapSeaK v2 - Lift Management System

Система управління ліфтами з повною підтримкою MongoDB, JWT автентифікацією, WebSocket real-time оновленнями та адаптивним інтерфейсом.

---

## 🚀 Швидкий старт (НОВИНКА!)

### Автоматичний запуск одною командою:

```bash
./auto-start.sh
```

або через npm:

```bash
npm run auto-start
```

**Скрипт автоматично зробить:**
- ✅ Перевірить всі залежності (Node.js, npm, MongoDB)
- ✅ Запустить MongoDB якщо потрібно  
- ✅ Встановить npm пакети
- ✅ Створить .env файл
- ✅ Запустить Backend (API + WebSocket)
- ✅ Запустить Frontend
- ✅ Покаже статус та корисні посилання

**🎉 Готово за 30 секунд!** Відкрийте: **http://localhost:5000**

---

### Інші команди:

```bash
npm run stop       # Зупинити всі сервери
npm run restart    # Перезапустити систему
tail -f logs/*.log # Переглянути логи в реальному часі
```

📖 **Детальна документація:** [QUICK-START.md](QUICK-START.md)

---

## 📊 Доступні сервіси після запуску

| Сервіс | URL | Опис |
|--------|-----|------|
| 🌐 **Frontend** | http://localhost:5000 | Веб-інтерфейс |
| 🔗 **API** | http://localhost:3001/api | REST API |
| 💬 **WebSocket** | ws://localhost:3002 | Real-time оновлення |
| 🗄️ **MongoDB** | mongodb://localhost:27017 | База даних |

---

## �� Demo акаунти

| Роль | Email | Пароль |
|------|-------|--------|
| 👨‍💼 Адмін | admin@deapseak.com | admin123 |
| 📞 Диспетчер | dispatcher@deapseak.com | dispatcher123 |
| 🔧 Технік | tech@deapseak.com | tech123 |
| 👤 Клієнт | client@deapseak.com | client123 |

---

## ✨ Основні функції

### Для адміністраторів:
- 👥 Управління користувачами (створення, редагування, блокування)
- 🏢 Управління ліфтами (реєстр, QR-коди, статистика)
- 📋 Управління запитами (перегляд, призначення, аналітика)
- 📊 Аналітика та звітність (PDF, Excel export)
- ⚙️ Налаштування системи

### Для диспетчерів:
- �� Прийом заявок від клієнтів
- 👨‍🔧 Призначення техніків на запити
- 📊 Моніторинг статусу робіт
- 🚨 Управління пріоритетами
- 📧 Email сповіщення

### Для техніків:
- 📋 Список призначених завдань
- 📍 Геолокація об'єктів
- 📸 Завантаження фото робіт
- ⏱️ Відстеження часу виконання
- ✅ Завершення запитів з описом

### Для клієнтів:
- 📱 Створення запитів на обслуговування
- 📷 QR-сканування для інформації про ліфт
- 📊 Перегляд історії запитів
- ⭐ Оцінка роботи техніків
- 🔔 Сповіщення про статус

---

## 🛠️ Технології

### Backend:
- **Node.js** + **Express** - REST API
- **MongoDB** + **Mongoose** - База даних
- **JWT** - Автентифікація
- **Socket.io** - WebSocket real-time
- **Nodemailer** - Email сповіщення
- **bcrypt** - Хешування паролів
- **pdfkit** + **exceljs** - Генерація звітів
- **qrcode** - Генерація QR-кодів

### Frontend:
- **AdminLTE 3** - UI Framework
- **Bootstrap 4** - CSS Framework
- **jQuery** - DOM manipulation
- **Chart.js** - Графіки та діаграми
- **Font Awesome** - Іконки
- **Socket.io-client** - WebSocket клієнт

---

## 📁 Структура проекту

```
📁 deapseak/
├── 📄 auto-start.sh           # 🚀 Автоматичний запуск
├── 📄 stop-servers.sh         # 🛑 Зупинка серверів
├── 📄 package.json            # npm конфігурація
├── 📄 .env                    # Змінні оточення
│
├── 📁 backend/                # Backend API
│   ├── app.js                 # Express додаток
│   ├── 📁 controllers/        # Бізнес-логіка
│   ├── 📁 models/             # Mongoose моделі
│   ├── 📁 routes/             # API маршрути
│   ├── 📁 middleware/         # Middleware (auth, errors)
│   └── 📁 services/           # Сервіси (email, websocket)
│
├── 📁 pages/                  # Frontend сторінки
│   ├── 📁 admin/              # Панель адміністратора
│   ├── 📁 dispatcher/         # Панель диспетчера
│   ├── 📁 tech/               # Панель техніка
│   └── 📁 client/             # Панель клієнта
│
├── 📁 assets/                 # Статичні файли
│   ├── 📁 css/                # Стилі
│   ├── 📁 js/                 # JavaScript
│   └── 📁 img/                # Зображення
│
├── 📁 logs/                   # Логи серверів
├── 📁 uploads/                # Завантажені файли
└── 📁 mongodb/                # MongoDB data
```

---

## 🔧 Ручна установка (якщо потрібно)

### 1. Клонування репозиторію:
```bash
git clone https://github.com/yourusername/deapseak.git
cd deapseak
```

### 2. Встановлення залежностей:
```bash
npm install
```

### 3. Запуск MongoDB:
```bash
# Варіант 1: Docker
docker run -d -p 27017:27017 --name mongodb mongo

# Варіант 2: Локально
sudo systemctl start mongod
```

### 4. Налаштування .env:
```bash
cp .env.example .env
# Відредагуйте .env файл
```

### 5. Запуск:
```bash
./auto-start.sh
```

---

## 📋 Вимоги

- **Node.js** >= 18.x
- **npm** >= 8.x
- **MongoDB** >= 7.x
- **Bash** (для скриптів)

---

## 🐛 Вирішення проблем

### MongoDB не запускається?
```bash
# Перевірити статус
pgrep mongod

# Запустити вручну
sudo systemctl start mongod

# Або через Docker
docker run -d -p 27017:27017 mongo
```

### Порт зайнятий?
```bash
# Знайти процес
lsof -i :3001

# Зупинити все
./stop-servers.sh
```

### npm помилки?
```bash
# Очистити кеш
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Додаткова документація

- [QUICK-START.md](QUICK-START.md) - Детальний гайд по запуску
- [ROLE-BASED-LOGIC-FIX-REPORT.md](ROLE-BASED-LOGIC-FIX-REPORT.md) - Звіт про виправлення
- [REMAINING-FEATURES.md](REMAINING-FEATURES.md) - Майбутні функції

---

## 🔐 Безпека

- ✅ JWT токени з refresh mechanism
- ✅ bcrypt хешування паролів
- ✅ Rate limiting для API
- ✅ CORS налаштування
- ✅ Input validation (express-validator)
- ✅ XSS protection
- ✅ MongoDB injection prevention

---

## 📄 Ліцензія

MIT License - використовуйте вільно!

---

## 👨‍💻 Автор

GitHub Copilot & Development Team

---

## 🎯 Roadmap

- [x] ✅ Автоматичний запуск системи
- [x] ✅ Password reset функціонал
- [x] ✅ User ban/unban
- [x] ✅ Technician workload tracking
- [ ] 🔄 Auto-assignment by specialty
- [ ] 🔄 Dynamic notifications
- [ ] 🔄 Analytics dashboard
- [ ] 🔄 Mobile app integration

---

**🚀 Готові до роботи? Запустіть:**

```bash
./auto-start.sh
```

**та відкрийте:** http://localhost:5000

---

⭐ **Не забудьте поставити зірку на GitHub!**
