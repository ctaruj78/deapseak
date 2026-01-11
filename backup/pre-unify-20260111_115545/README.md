# 🏢 DeapSeaK v2 - Lift Management System

Система управління ліфтами з повною підтримкою MongoDB, JWT автентифікацією, WebSocket real-time оновленнями та адаптивним інтерфейсом.

---

## 📁 Структура Проекту

```
deapseak/
├── 📄 unified-server.js          # Головний сервер (Frontend + API + WebSocket)
├── 📄 index.html                 # Головна сторінка
├── 📄 package.json               # Залежності
│
├── 📁 pages/                     # HTML сторінки
│   ├── auth/                     # login.html, register.html
│   ├── ai-assistant/             # AI асистент з PDF аналізом
│   ├── admin/                    # Адмін панель
│   ├── dispatcher/               # Диспетчер
│   ├── technician/               # Технік
│   └── client/                   # Клієнт
│
├── 📁 services/                  # Бізнес-логіка
│   └── pdf-parser.js             # Парсер PDF сертифікатів
│
├── 📁 models/                    # MongoDB моделі
├── 📁 assets/                    # CSS, JS, зображення
├── 📁 data/                      # JSON дані (регуляції)
├── 📁 scripts/                   # Скрипти запуску
├── 📁 tests/manual/              # Ручні тести
├── 📁 archive/old-servers/       # Застарілі сервери
└── 📁 docs/archive/              # Історична документація
```

---

## 🚀 Швидкий старт

### ⚡ ОДИН скрипт для запуску всього:

```bash
./autostart.sh
```

**Скрипт автоматично:**
- ✅ Зупинить старі процеси (MongoDB + Server)
- ✅ Запустить MongoDB автоматично
- ✅ Встановить npm залежності
- ✅ Запустить Unified Server на PORT 5000
- ✅ Перевірить всі сервіси
- ✅ Покаже правильний URL для браузера
- ✅ Спробує відкрити браузер автоматично

**🎉 Готово за 10 секунд!**

---

### 📊 Перші кроки після запуску

1. **Увійдіть** як адміністратор:
   - Email: `admin@deapseak.com`
   - Пароль: `admin123`

2. **Додайте ліфти** через меню "Ліфти" → "Додати ліфт":
   - Заповніть форму (назва, адреса, муніципальний номер)
   - Система автоматично згенерує QR-код
   - Ліфт відразу з'явиться в аналітиці

3. **Перегляньте аналітику**:
   - Unified Analytics - загальна статистика
   - Predictive Maintenance - AI прогнози та ризики
   - Dashboard - швидкий огляд

⚠️ **Важливо:** Система працює ТІЛЬКИ з реальними даними з MongoDB. Демо-дані видалені для точності аналітики.

---

### ⚠️ ВАЖЛИВО: Як правильно відкривати систему

#### ❌ НЕПРАВИЛЬНО:
Не відкривайте файл напряму з провідника (`file:///...`)!
Посилання та API не працюватимуть через CORS policy.

#### ✅ ПРАВИЛЬНО:
Після запуску `./autostart.sh` відкрийте в браузері:

**Локально:**
```
http://localhost:5000
```

**GitHub Codespaces:**
```
https://<CODESPACE_NAME>-5000.app.github.dev
```

Скрипт автоматично покаже правильний URL! 🎯

📖 **Детальна інструкція:** [HOW-TO-OPEN.md](HOW-TO-OPEN.md)

---

### Інші команди:

```bash
# Запуск системи
./start-unified.sh     # ⭐ Запустити Unified Server (ЗАВЖДИ використовуйте цей!)

# MongoDB
pgrep mongod           # Перевірити чи запущено
mongod --dbpath ~/mongodb-data --fork --logpath ~/mongodb-data/mongod.log  # Запустити вручну

# Зупинка
pkill -f "node.*unified-server"  # Зупинити сервер
pkill -f mongod                   # Зупинити MongoDB

# Логи
tail -f logs/unified-server.log  # Переглянути логи в реальному часі
tail -f ~/mongodb-data/mongod.log # MongoDB логи

# Перевірки
curl http://localhost:5000/api/health  # Перевірити API
ps aux | grep -E "node|mongod"          # Переглянути процеси
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
- 👨‍💼 **Admin**: Меню → AI Асистент → [Відкрити](pages/ai-assistant/ai-assistant.html)
- 🔧 **Technician**: Меню → AI Асистент → [Відкрити](pages/ai-assistant/ai-assistant.html)
- 👤 **Client**: Меню → AI Асістент → [Відкрити](pages/ai-assistant/ai-assistant.html)
- 📞 **Dispatcher**: Меню → AI Асистент → [Відкрити](pages/ai-assistant/ai-assistant.html)

### 🎯 Можливості:
1. **💬 Chat** - консультації в реальному часі з AI
2. **⚖️ Legal** - юридичні питання про ліфти
3. **📜 Regulations** - 7 португальських законів з поясненнями
4. **📊 Analysis** - **ГЛИБОКИЙ** аналіз PDF звітів інспекції:
   - ✅ Витягує порушення C1/C2/C3 з деталями
   - ✅ Пояснює **ЧОМУ** це небезпечно
   - ✅ Терміни усунення (0-7 днів для C1, 30 днів для C2)
   - ✅ Правові наслідки (кримінальна відповідальність!)
   - ✅ Конкретні інструкції як виправити
   - ✅ База знань 9 артиклів португальського законодавства

### 📖 Документація:
- Повний посібник: [AI-ASSISTANT-GUIDE.md](AI-ASSISTANT-GUIDE.md)
- Глибокий аналіз PDF: [AI-ASSISTANT-DEEP-ANALYSIS-RESTORED.md](AI-ASSISTANT-DEEP-ANALYSIS-RESTORED.md)

### 💡 Приклади використання:
- 🔧 **Технік**: Завантажує PDF → Бачить "C1 Art.78 - DESATIVAR ELEVADOR IMEDIATAMENTE" → Діє!
- 👤 **Клієнт**: Завантажує звіт сусіда → Розуміє що 3 C1 = критично → Контактує компанію
- 📞 **Диспетчер**: Консультує по телефону з базою законів + детальними поясненнями
- 👨‍💼 **Адмін**: Масовий аналіз → Планує ресурси за термінами (0-7 днів, 30 днів)


---

---

## 📧 Email System - Brevo Integration

### Профессійна відправка орçаменtos!

**Налаштовано Brevo (Sendinblue):**
- ✅ **300 email/день БЕЗКОШТОВНО** 
- ✅ Tracking: хто відкрив, коли, скільки разів
- ✅ Deliverability 99%+ (не йде в spam)
- ✅ Відправник: `FestLift <info@festlift.pt>`
- ✅ Dashboard з аналітикою: https://app.brevo.com/

**📖 Повна інструкція:** [BREVO-SETUP-GUIDE.md](BREVO-SETUP-GUIDE.md)

**Швидкий старт:**
```bash
1. Реєстрація: https://www.brevo.com/ (2 хв)
2. Dashboard → SMTP & API → Генеруй SMTP key
3. Копіюй в .env:
   SMTP_USER=твій-email-brevo
   SMTP_PASS=smtp-api-key
4. node test-brevo.js (тестування)
```

**Features:**
- 📨 Відправка орçаменtos клієнтам
- 📊 Статистика відкриттів
- 🔄 Fallback на SMTP хостингу
- 📧 Шаблони email (HTML)

---

## 🤖 AI Асистент - Нові можливості!

### Голосовий AI для технічних консультацій:

- 🎤 **Голосове введення (Speech-to-Text)**
  - Говоріть замість друку - 3-4x швидше!
  - Португальська мова (pt-PT)
  - Ідеально для техніків на об'єкті
  - ⚠️ **Потрібна авторизація** - увійдіть в систему перед використанням

- 🔊 **Озвучування відповідей (Text-to-Speech)**
  - Слухайте інструкції hands-free
  - Працюйте з інструментом в руках
  - Автоматична очистка від Markdown
  - **ТІЛЬКИ європейська португальська (pt-PT)** 🇵🇹
  - ❌ Бразильська португальська (pt-BR) **ЖОРСТКО ЗАБЛОКОВАНА**
  - ⚠️ **Якщо немає pt-PT**: TTS вимкнено, показує alert з інструкцією
  - 📖 **Як встановити pt-PT:** [INSTALL-PT-PT-VOICE.md](INSTALL-PT-PT-VOICE.md)

- 🔐 **JWT Автентифікація:**
  - Всі AI запити потребують валідного токена
  - Автоматична перевірка при завантаженні сторінки
  - Перенаправлення на логін якщо токен прострочений
  - Попередження якщо не авторизовані

- 📚 **База португальських законів:**
  - 7 регламентів (513/70, 320/2002, 163/2006, etc.)
  - 34+ статті з поясненнями
  - 📜 Посилання на офіційні тексти (Diário da República)
  - Типові порушення C1/C2/C3

- 🔧 **25+ технічних термінів:**
  - Cabos e polias, Motor e freio, Para-quedas
  - Iluminação, Casa de máquinas, Botões
  - Кожен термін з регламентом та порушеннями

- 🌍 **Білінгва PT/UA:**
  - Португальська та українська паралельно
  - Зручно для змішаних команд

### Доступ для всіх ролей:

- 👨‍💼 **Адміністратор:** http://localhost:5000/pages/ai-assistant/ai-assistant.html
- 🔧 **Технік:** http://localhost:5000/pages/ai-assistant/ai-assistant.html
- 👤 **Клієнт:** http://localhost:5000/pages/ai-assistant/ai-assistant.html
- 📞 **Диспетчер:** http://localhost:5000/pages/ai-assistant/ai-assistant.html

### Приклади запитів:

```
"Artigo 23"           → Portas de piso com fechadura
"caixa elevador"      → Artigo 14.º (auto-match)
"motor parado"        → Діагностика + інструкції
"quais regulamentos"  → Список всіх 7 законів
"para-quedas"         → Artigo 37.º + порушення
```

📖 **Детальна документація:** [VOICE-FEATURES-GUIDE.md](docs/VOICE-FEATURES-GUIDE.md)

