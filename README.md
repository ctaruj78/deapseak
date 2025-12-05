# 🏢 DeapSeaK v2 - Lift Management System

Система управління ліфтами з повною підтримкою MongoDB, JWT автентифікацією, WebSocket real-time оновленнями та адаптивним інтерфейсом.

---

## 🚀 Швидкий старт

### Запуск системи однією командою:

```bash
./start-unified.sh
```

**Скрипт автоматично:**
- ✅ Зупинить попередні процеси
- ✅ Перевірить MongoDB (має бути запущена)
- ✅ Встановить залежності якщо потрібно
- ✅ Запустить Unified Server на **PORT 5000**
- ✅ Перевірить health endpoint
- ✅ Покаже корисні посилання

**🎉 Готово за 10 секунд!** Відкрийте: **http://localhost:5000**

---

### Інші команди:

```bash
# Запуск системи
./start-unified.sh     # Запустити Unified Server (рекомендовано)

# Зупинка
pkill -f "node.*unified-server"  # Зупинити сервер

# Логи
tail -f logs/unified-server.log  # Переглянути логи в реальному часі

# Перевірки
npm run check-ports    # Перевірити конфігурацію портів
npm run cleanup        # Очистити проект
npm run analyze-logs   # Проаналізувати console.log
```

📖 **Детальна документація:** [QUICK-START.md](QUICK-START.md)

---

## 📊 Unified Server Architecture

### Один сервер для всього:

| Сервіс | URL | Опис |
|--------|-----|------|
| 🌐 **Frontend** | http://localhost:5000 | Веб-інтерфейс |
| 🔗 **API** | http://localhost:5000/api/* | REST API |
| 💬 **WebSocket** | ws://localhost:5000 | Real-time оновлення |
| 🤖 **AI Chat** | http://localhost:5000/api/ai/chat | AI асистент |
| 🗄️ **MongoDB** | mongodb://localhost:27017 | База даних |

### GitHub Codespaces:

| Сервіс | URL Pattern | Опис |
|--------|-------------|------|
| 🌐 **Всі сервіси** | `https://YOUR-CODESPACE-5000.app.github.dev` | Unified Server |

✅ **Тільки ОДИН порт 5000** - все на одному сервері!

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

### Запуск та конфігурація:
- [QUICK-START.md](QUICK-START.md) - Детальний гайд по запуску
- [PORTS-CONFIG.md](docs/PORTS-CONFIG.md) - **Конфігурація портів (ВАЖЛИВО!)**

### Оптимізація та maintenance:
- [SYSTEM-AUDIT-REPORT.md](docs/SYSTEM-AUDIT-REPORT.md) - **Повний аудит системи**
- [OPTIMIZATION-QUICK-GUIDE.md](docs/OPTIMIZATION-QUICK-GUIDE.md) - **Швидкий гайд по оптимізації**

### Звіти та features:
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

---

## 🤖 AI Асистент

**Новинка!** AI Асистент тепер доступний для всіх ролей:

### 📍 Де знайти:
- 👨‍💼 **Admin**: Меню → AI Асистент → [Відкрити](pages/admin/ai-assistant-full.html)
- 🔧 **Technician**: Меню → AI Асистент → [Відкрити](pages/tech/ai-assistant.html)
- 👤 **Client**: Меню → AI Асістент → [Відкрити](pages/client/ai-assistant.html)
- 📞 **Dispatcher**: Меню → AI Асистент → [Відкрити](pages/dispatcher/ai-assistant.html)

### 🎯 Можливості:
1. **Chat** - консультації в реальному часі
2. **Legal** - юридичні питання про ліфти
3. **Regulations** - 7 португальських законів
4. **Analysis** - аналіз PDF звітів інспекції

### 📖 Документація:
Детальний посібник: [AI-ASSISTANT-GUIDE.md](AI-ASSISTANT-GUIDE.md)

### 💡 Приклади використання:
- 🔧 **Технік**: Аналізує звіт на місці у клієнта
- 👤 **Клієнт**: Завантажує звіт сусіда для консультації
- 📞 **Диспетчер**: Консультує по телефону з базою законів
- 👨‍💼 **Адмін**: Масовий аналіз звітів компанії

