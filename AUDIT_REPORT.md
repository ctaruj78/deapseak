# AUDIT REPORT — FestLift (2026-06-27)
===========================================

**Аудитор:** Claude Sonnet 4.6 (Senior Full-Stack QA/DevOps)  
**Гілка:** v2_refactor  
**Стек:** Node.js/Express + MongoDB + Vanilla JS/HTML  
**Попередній аудит:** 2026-06-22 (фікси: SweetAlert CSS, XSS admin/dispatcher, atomic counters, JWT security)

---

## 🔴 CRITICAL (2)

### [CR-01] IDOR — `/api/tasks` не фільтрує роль `technician`
**Файл:** `unified-server.js:2500`  
**Проблема:** Фільтр `req.user.role === 'tech'` не покриває рядок `'technician'`. В системі є два варіанти назви ролі. Технік з роллю `'technician'` отримує **всі завдання** всіх користувачів без обмежень.  
**Ризик:** Витік конфіденційних даних між техніками, порушення приватності клієнтів.  
**Фікс:** Замінити на `['tech', 'technician'].includes(req.user.role)`.

---

### [CR-02] Відкритий пароль у `console.log`
**Файл:** `unified-server.js:4158`  
**Проблема:** При автоматичному створенні клієнта виводиться `rawPassword` у відкритому вигляді: `console.log(\`👤 Новий клієнт: ${clientEmail} / пароль: ${rawPassword}\`)`. На продакшені PM2 логи зберігаються у файлі і доступні через `~/.pm2/logs/`.  
**Ризик:** Компрометація всіх автоматично створених облікових записів клієнтів.  
**Фікс:** Прибрати пароль з лог-рядка, залишити лише `clientEmail`.

---

## 🟠 HIGH (4)

### [HI-01] XSS — `pages/tech/dashboard.html:688`
**Проблема:** `${address}` (значення з `task.location` або `task.lift?.address`) вставляється напряму в `row.innerHTML`. Якщо дані ліфта містять `<script>` або `"><img onerror=...>` — виконається код.  
**Ризик:** XSS через поле адреси ліфта.  
**Фікс:** Додати `escapeHtml()` helper і застосувати до всіх полів.

---

### [HI-02] XSS — `pages/tech/tasks.html:1001, 1071`
**Проблема:** `${task.liftId}`, `${task.type}`, `${task.liftAddress}`, `${task.description}` без екранування в `innerHTML`.  
**Ризик:** XSS через поля задач (опис може вводити диспетчер).  
**Фікс:** Застосувати `escapeHtml()` до всіх рядкових змінних.

---

### [HI-03] XSS — `pages/tech/task-map.html:148`
**Проблема:** `${lift.model}`, `${lift.manufacturer}`, `${fullAddress}` без екранування в `innerHTML`.  
**Ризик:** XSS через дані ліфта у вікні карти.  
**Фікс:** Застосувати `escapeHtml()`.

---

### [HI-04] Витік неопублікованих статей — `/api/knowledge-base/:id`
**Файл:** `unified-server.js:2201`  
**Проблема:** `GET /api/knowledge-base/:id` — **без авторизації**, без фільтру `status: 'published'`. Будь-хто, знаючи MongoDB ObjectId статті, може отримати чернетку або неопубліковану статтю.  
**Ризик:** Інформаційне розкриття (чернетки, внутрішні нотатки).  
**Фікс:** Додати фільтр `status: 'published'` для анонімних запитів (або вимагати токен).

---

## 🟡 MEDIUM (2)

### [ME-01] IDOR — `/api/tasks/:id` (без перевірки власника)
**Файл:** `unified-server.js:2517`  
**Проблема:** Будь-який авторизований користувач (навіть клієнт) може запросити `GET /api/tasks/:id` і отримати чужу задачу — немає перевірки ані ролі, ані приналежності.  
**Ризик:** Витік деталей завдань між ролями.  
**Фікс:** Додати перевірку ролі та фільтр по `assignedTo` для техніків.

---

### [ME-02] Відсутні індекси на колекції `tasks`
**Файл:** `unified-server.js:553-582`  
**Проблема:** Індекси створюються для `lifts`, `requests`, `inspections`, `orcamentos`, `users`, `qr_scans` — але **не для `tasks`**. При зростанні бази запит `find({ assignedTo })` виконує повний скан.  
**Ризик:** Деградація продуктивності при масштабуванні.  
**Фікс:** Додати `createIndex` для `{ assignedTo: 1, status: 1 }` та `{ dueDate: 1 }`.

---

## 🟢 LOW (1)

### [LO-01] Відсутній `lean()` у `backend/routes/orcamentos.js`
**Файл:** `backend/routes/orcamentos.js` (21 запит, 0 lean())  
**Проблема:** Read-only запити `findById`, `find` повертають повні Mongoose документи з усіма методами — зайве навантаження на пам'ять та GC.  
**Фікс:** Додати `.lean()` до read-only запитів (де документ не змінюється).

---

## ✅ ЩО ДОБРЕ (не чіпаємо)

- ✅ JWT — без хардкоду, сервер зупиняється якщо немає `JWT_SECRET`
- ✅ Rate limiting — на login/refresh/forgot-password/AI
- ✅ Helmet — підключено (без CSP через AdminLTE CDN, відомо)
- ✅ mongoSanitize — захист від NoSQL injection
- ✅ Backup restore — path traversal захищений через `_sanitizeBackupFileName`
- ✅ File uploads — mimetype validation на всіх multer handlers
- ✅ QR public alert — honeypot + IP rate limit + whitelist issueTypes
- ✅ Password change — перевіряє currentPassword через bcrypt
- ✅ DB indexes — 13+ indexes на основних колекціях
- ✅ XSS escaping — admin/lifts.html та dispatcher вже мають `escapeHtml`
- ✅ .env в .gitignore

---

## FIXED FILES (після виправлень):
- `unified-server.js` — CR-01, CR-02, HI-04, ME-01, ME-02
- `pages/tech/dashboard.html` — HI-01
- `pages/tech/tasks.html` — HI-02
- `pages/tech/task-map.html` — HI-03
- `backend/routes/orcamentos.js` — LO-01

---

## TEST RESULTS:
*(оновлюється після кожного фіксу)*
