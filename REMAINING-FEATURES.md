# Список залишкових функцій для реалізації

**Дата створення:** 12 листопада 2025  
**Статус:** 🔄 В ОЧІКУВАННІ  
**Пріоритет:** СЕРЕДНІЙ/НИЗЬКИЙ

---

## ✅ ЗАВЕРШЕНІ функції

1. ✅ Скидання паролю (password reset)
2. ✅ Блокування користувачів (user ban/unban)
3. ✅ Відстеження навантаження техніків (workload tracking)
4. ✅ Перевірка isActive при логіні
5. ✅ Email шаблон для скидання паролю

---

## 🔄 ЗАЛИШКОВІ функції (на основі вашого feedback)

### 1. Автоматичне призначення за спеціалізацією
**Пріоритет:** 🟡 СЕРЕДНІЙ  
**Складність:** ⭐⭐⭐

**Що потрібно:**
- Створити `/backend/services/assignmentService.js`
- Функція `findBestTechnician(requestType, location)`
- Алгоритм підбору:
  - Фільтр за `specialty` (hydraulic/electric/mechanical)
  - Перевірка `currentAssignments < maxAssignments`
  - Перевірка `status !== 'offline'`
  - (Опціонально) Розрахунок відстані до об'єкта
- Інтеграція в `requestController.assignRequest()`

**Приклад використання:**
```javascript
// У requestController.js
const bestTechnician = await assignmentService.findBestTechnician(
    request.type,  // 'maintenance' | 'repair' | 'emergency'
    request.liftLocation
);

if (!bestTechnician) {
    throw new AppError('Немає вільних техніків', 503);
}

request.assignedTo = bestTechnician._id;
```

---

### 2. Динамічна система сповіщень
**Пріоритет:** 🟡 СЕРЕДНІЙ  
**Складність:** ⭐⭐⭐⭐

**Що потрібно:**

#### Бекенд
- Створити модель `/backend/models/Notification.js`:
  ```javascript
  {
      userId: ObjectId,
      type: Enum ['info', 'warning', 'success', 'error'],
      title: String,
      message: String,
      link: String,
      read: Boolean (default: false),
      createdAt: Date
  }
  ```

- Створити `/backend/controllers/notificationController.js`:
  - `getNotifications()` - отримати всі для користувача
  - `markAsRead()` - позначити як прочитане
  - `markAllAsRead()` - позначити всі як прочитані
  - `deleteNotification()` - видалити сповіщення

- Створити `/backend/routes/notificationRoutes.js`
- Інтеграція в lifecycle запитів (створення, призначення, завершення)

#### Фронтенд
- Dropdown для сповіщень у navbar
- Real-time оновлення через WebSocket
- Лічильник непрочитаних сповіщень
- Посилання на відповідні сторінки

**Приклад інтеграції:**
```javascript
// У requestController.assignRequest()
await Notification.create({
    userId: request.client,
    type: 'info',
    title: 'Запит призначено',
    message: `Техніка ${technician.firstName} призначено до запиту #${request._id}`,
    link: `/pages/client/requests.html?id=${request._id}`
});

// Emit через WebSocket
websocketService.emitToUser(request.client, 'new-notification', notification);
```

---

### 3. QR система - документація та розширення
**Пріоритет:** 🟢 НИЗЬКИЙ  
**Складність:** ⭐⭐

**Що є зараз:**
- ✅ Генерація QR для ліфтів (`GET /api/lifts/:id/qr`)
- ✅ Сторінка `lift-info.html` для перегляду інформації

**Що додати:**
1. Документація API в `/docs/QR-SYSTEM-API.md`
2. Створення запитів через QR (для клієнтів)
3. Історія обслуговування ліфта по QR
4. QR сканер у мобільному вигляді

**API розширення:**
```javascript
GET  /api/qr/:liftId/info       // Інфо про ліфт
GET  /api/qr/:liftId/history    // Історія обслуговування
POST /api/qr/:liftId/request    // Створити запит через QR
GET  /api/qr/validate/:token    // Валідація QR коду
```

---

### 4. Dashboard з аналітикою та звітами
**Пріоритет:** 🟢 НИЗЬКИЙ  
**Складність:** ⭐⭐⭐⭐⭐

**Що потрібно:**

#### Бекенд
- Створити `/backend/controllers/analyticsController.js`:
  - `getDashboardStats()` - загальна статистика
  - `getRequestsByPeriod()` - запити за часом
  - `getTechnicianPerformance()` - метрики техніків
  - `getLiftStatistics()` - статистика по ліфтах
  - `getRevenueReport()` - фінансовий звіт

- Створити `/backend/routes/analyticsRoutes.js`

#### Фронтенд
- Створити `/pages/admin/dashboard.html`
- Інтеграція Chart.js:
  - Line chart - запити за часом
  - Bar chart - запити по типах
  - Pie chart - статус запитів
  - Doughnut chart - завантаження техніків

**Приклад метрик:**
```javascript
// Dashboard stats
{
    totalRequests: 1250,
    completedRequests: 980,
    activeRequests: 120,
    cancelledRequests: 150,
    totalLifts: 450,
    activeTechnicians: 25,
    avgResponseTime: '2.5 hours',
    avgCompletionTime: '4 hours',
    requestsByMonth: [
        { month: 'Jan', count: 45 },
        { month: 'Feb', count: 52 },
        // ...
    ],
    technicianStats: [
        { name: 'Іван Петренко', completed: 120, rating: 4.8 },
        // ...
    ]
}
```

---

### 5. Покращення пагінації та фільтрації
**Пріоритет:** 🟡 СЕРЕДНІЙ  
**Складність:** ⭐⭐

**Що потрібно:**
- Розширити `/backend/middleware/queryMiddleware.js`
- Додати фільтри:
  - Діапазон дат (createdAt between)
  - Множинний вибір статусів
  - Пошук по кількох полях одночасно
  - Сортування по кількох колонках

**Приклад запиту:**
```javascript
GET /api/requests?
    page=1&
    limit=20&
    status=assigned,in_progress&
    dateFrom=2025-01-01&
    dateTo=2025-12-31&
    search=hydraulic&
    sortBy=createdAt,priority&
    sortOrder=desc,asc
```

---

### 6. Покращення реєстрації клієнтів
**Пріоритет:** 🟢 НИЗЬКИЙ  
**Складність:** ⭐

**Що потрібно:**
- Додати email верифікацію (опціонально)
- Додати поле "Організація/Компанія" в User model
- Додати можливість завантаження аватара
- Додати термси та умови (checkbox)

---

### 7. Email інтеграція - покращення
**Пріоритет:** 🟢 НИЗЬКИЙ  
**Складність:** ⭐

**Що є зараз:**
- ✅ Real Nodemailer integration
- ✅ HTML templates для всіх подій

**Що додати:**
- Додати поле в `.env` для SMTP конфігурації
- Додати тестову сторінку `/pages/admin/email-test.html`
- Додати логування відправлених emails у БД (опціонально)
- Додати можливість змінити шаблони через адмін панель (опціонально)

---

## 📊 Статистика виконання

| Категорія | Завершено | Залишилось | Відсоток |
|-----------|-----------|------------|----------|
| Аутентифікація | 5/5 | 0 | 100% |
| Керування користувачами | 4/5 | 1 | 80% |
| Запити | 8/10 | 2 | 80% |
| Техніки | 3/4 | 1 | 75% |
| Сповіщення | 0/1 | 1 | 0% |
| Аналітика | 0/1 | 1 | 0% |
| QR система | 2/4 | 2 | 50% |

**Загальний прогрес:** 22/30 (73%)

---

## 🎯 Рекомендований порядок реалізації

1. **Автоматичне призначення** (1-2 дні)
   - Критично для покращення workflow диспетчерів
   - Використовує вже реалізовані поля specialty та workload

2. **Динамічні сповіщення** (2-3 дні)
   - Значно покращить UX
   - Real-time updates додають "живості" системі

3. **Покращення фільтрації** (1 день)
   - Швидке покращення, великий impact

4. **QR документація та розширення** (1-2 дні)
   - Вже є основа, потрібно лише доповнити

5. **Analytics Dashboard** (3-5 днів)
   - Найскладніше, але дуже корисно для адмінів
   - Потрібна якісна візуалізація

---

## 💡 Примітки

- Всі критичні функції безпеки та аутентифікації **ЗАВЕРШЕНІ** ✅
- Система готова до production з поточним функціоналом
- Залишкові функції - це "nice to have" для покращення UX
- Можна впроваджувати поступово, без breaking changes

---

**Автор:** GitHub Copilot  
**Останнє оновлення:** 12 листопада 2025

