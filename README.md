# DeapSeak Project

[![CI/CD Pipeline](https://github.com/ctaruj78/deapseak/actions/workflows/ci.yml/badge.svg)](https://github.com/ctaruj78/deapseak/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-17%20passed-success)](https://github.com/ctaruj78/deapseak/actions)
[![Coverage](https://img.shields.io/badge/coverage-check%20CI-blue)](https://github.com/ctaruj78/deapseak/actions)

# DeapSeaK - Система управління ліфтами

## Опис проекту

DeapSeaK - це повнофункціональна система управління ліфтами з багаторольовим доступом, QR-кодуванням, MongoDB інтеграцією та сучасним веб-інтерфейсом. Система включає панелі для адміністраторів, диспетчерів, техніків і клієнтів.

## Основні функції

- 🏢 **Багаторольова система** - адмін, диспетчер, технік, клієнт
- 📱 **QR-система** - генерація, сканування та управління QR-кодами
- 🗄️ **MongoDB інтеграція** - централізоване зберігання даних
- 🔐 **JWT авторизація** - безпечна система входу
- 📊 **Аналітика та звітність** - статистика використання
- 🎨 **AdminLTE інтерфейс** - сучасний адаптивний дизайн

## Структура проекту

```
📁 /workspaces/deapseak/
├── 📄 index.html              # Головна сторінка
├── 📄 login.html              # Сторінка входу
├── 🔧 api-server.js           # Backend API сервер
├── 🗄️ db.js                  # MongoDB підключення
├── 📋 start-servers.sh        # Скрипт автозапуску серверів
├── 📁 pages/                  # Сторінки за ролями
│   ├── admin/                 # Панель адміністратора
│   ├── dispatcher/            # Панель диспетчера
│   ├── tech/                  # Панель техніка
│   └── client/                # Панель клієнта
├── 📁 assets/                 # Статичні ресурси
│   ├── css/                   # Стилі
│   ├── js/                    # JavaScript модулі
│   └── img/                   # Зображення
├── 📁 models/                 # MongoDB схеми
├── 📁 plugins/                # Бібліотеки (AdminLTE, Bootstrap)
└── 📁 templates/              # Шаблони документів
```

## Швидкий старт

### Автоматичний запуск (рекомендується)

```bash
# Зробіть скрипт виконуваним (тільки один раз)
chmod +x start-servers.sh

# Запустіть всі сервери
./start-servers.sh
```

### Ручний запуск

#### 1. Запуск MongoDB
```bash
# Створіть директорії для MongoDB
sudo mkdir -p /data/db && sudo chown -R $USER:$USER /data/db

# Запустіть MongoDB
mongod --dbpath /data/db --logpath /data/db/mongod.log --fork
```

#### 2. Запуск API сервера
```bash
cd /workspaces/deapseak
node api-server.js
# Або у фоновому режимі:
nohup node api-server.js > api-server.log 2>&1 &
```

#### 3. Запуск веб-сервера
```bash
cd /workspaces/deapseak
python3 -m http.server 8080
# Або у фоновому режимі:
nohup python3 -m http.server 8080 > web-server.log 2>&1 &
```

## Доступ до системи

### Основні URL

- 🏠 **Головна сторінка**: http://localhost:8080/index.html
- 🔑 **Сторінка входу**: http://localhost:8080/login.html
- 🎛️ **QR інтерфейс**: http://localhost:8080/qr-interface.html
- 🔍 **Тестування API**: http://localhost:8080/test-qr-api.html

### Тестові користувачи

| Роль | Логін | Пароль |
|------|-------|--------|
| Адміністратор | `admin@example.com` | `admin123` |
| Диспетчер | `dispatcher1@example.com` | `dispatcher123` |
| Технік | `tech1@example.com` | `tech123` |
| Клієнт | `client1@example.com` | `client123` |

### Порти серверів

- 📊 **MongoDB**: localhost:27017
- 🔗 **API сервер**: http://localhost:3001
- 🌐 **Веб-сайт**: http://localhost:8080

## API Endpoints

### Авторизація
- `POST /api/login` - Вхід в систему
- `POST /api/register` - Реєстрація користувача

### QR-система
- `GET /api/qr/codes` - Отримання QR-кодів
- `POST /api/qr/codes` - Створення QR-коду
- `DELETE /api/qr/codes/:id` - Видалення QR-коду
- `POST /api/qr/scan` - Сканування QR-коду
- `GET /api/qr/stats` - Статистика QR-системи
- `GET /api/qr/scans` - Історія сканувань

### Службові
- `GET /api/health` - Статус API сервера

## Тестування

### QR API тестування
1. Відкрийте http://localhost:8080/test-qr-api.html
2. Натисніть **"Перевірити API"** - має показати статус OK
3. Натисніть **"Ініціалізувати тестові дані"** для створення демо QR-кодів
4. Тестуйте всі QR операції через кнопки на сторінці

### Перевірка статусу серверів
```bash
# Перевірити MongoDB
ps aux | grep mongod

# Перевірити API сервер
ps aux | grep "node api-server.js"
curl http://localhost:3001/api/health

# Перевірити веб-сервер
ps aux | grep "http.server"
curl -I http://localhost:8080
```

## Керування проектом

### Збереження змін у Git
```bash
git add .
git commit -m "Опис ваших змін"
git push origin main
```

### Зупинка серверів
```bash
# Зупинити всі процеси
pkill -f 'mongod|api-server|http.server'

# Або окремо
pkill -f mongod           # MongoDB
pkill -f api-server       # API сервер
pkill -f http.server      # Веб-сервер
```

## Технології

- **Frontend**: HTML5, CSS3, JavaScript ES6+, AdminLTE, Bootstrap 4
- **Backend**: Node.js, Express.js
- **База даних**: MongoDB
- **Авторизація**: JWT (JSON Web Tokens)
- **QR-коди**: Html5-qrcode, QRCode.js
- **Іконки**: Font Awesome
- **Графіки**: Chart.js

## Розробка

### Додавання нового функціоналу
1. Створіть відповідні API endpoints в `api-server.js`
2. Додайте MongoDB схеми в папку `models/`
3. Створіть frontend інтерфейс в відповідній папці `pages/`
4. Додайте утилітні функції в `assets/js/`
5. Протестуйте через тестові сторінки

### Структура API відповідей
```javascript
// Успішна відповідь
{
  "success": true,
  "data": {...},
  "message": "Операція виконана успішно"
}

// Помилка
{
  "success": false,
  "error": "Опис помилки",
  "code": 400
}
```

## Документація

- 📋 [План розвитку](TODO.md)
- 📊 [Звіт про QR-інтеграцію](QR-SYSTEM-INTEGRATION-REPORT.md)
- 🔗 [API документація](docs/api-documentation.md)
- 📖 [Технічний посібник](docs/technical-guide.md)

## 📋 Аудити та Звіти

### Аудит порожніх елементів
- 📊 [AUDIT-EMPTY-ELEMENTS-REPORT.md](AUDIT-EMPTY-ELEMENTS-REPORT.md) - Комплексний аналіз порожніх кнопок, посилань та іконок
- 🔧 [EMPTY-ELEMENTS-FILLING-PLAN.md](EMPTY-ELEMENTS-FILLING-PLAN.md) - Детальний план наповнення з кодом

**Результати аудиту:**
- ✅ 250+ AdminLTE компоненти (нормально)
- ⚠️ 10-15 елементів потребують функціональності
- 🎯 Пріоритет: profile.html, users.html, register.html, technicians.html, qr-management.html

## Підтримка

Для вирішення проблем:
1. Перевірте статус серверів командами вище
2. Перегляньте логи: `api-server.log`, `web-server.log`, `/data/db/mongod.log`
3. Переконайтеся що всі порти доступні
4. Використайте тестову сторінку для діагностики API

---

**Проект DeapSeaK - Система управління ліфтами**  
*Версія 1.0 - MongoDB & QR інтеграція завершена*  
*Дата оновлення: 30 вересня 2025*
