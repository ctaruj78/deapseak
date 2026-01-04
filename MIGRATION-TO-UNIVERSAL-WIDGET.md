# 🚀 Міграція на AI Widget Universal

## Швидкий старт - 3 кроки

### 1️⃣ Видалити старі посилання

Знайдіть та **видаліть** ці рядки зі всіх HTML файлів:

```html
<!-- ВИДАЛИТИ ЦІ: -->
<script src="/components/ai-widget.js"></script>
<script src="/assets/js/modules/ai-assistant.js"></script>
<!-- AI Assistant Floating Button & Modal -->
<!-- AI Assistant Widget -->
<!--#include file="../../templates/ai-assistant-include.html" -->
```

### 2️⃣ Додати новий віджет

Додайте **ОДИН** рядок перед закриваючим `</body>`:

```html
    <!-- AI Universal Widget -->
    <script src="/components/ai-widget-universal.js"></script>
</body>
```

### 3️⃣ Готово! 🎉

Відкрийте сторінку і віджет з'явиться автоматично!

---

## 🤖 Автоматична міграція

### Використання скрипта (рекомендовано)

```bash
# 1. Зробити backup
cp -r pages pages-backup

# 2. Запустити міграцію
./migrate-to-universal-widget.sh

# 3. Перевірити результат
# Відкрийте кілька сторінок в браузері

# 4. Якщо все ок - видалити backup
rm -rf pages-backup
```

---

## 📝 Ручна міграція (покрокова)

### Крок 1: Знайти файли зі старим віджетом

```bash
# Пошук файлів з старим віджетом
grep -r "ai-widget.js\|ai-assistant-include" pages/ --include="*.html" -l
```

### Крок 2: Для кожного файлу

#### Варіант A: Використання sed (Linux/Mac)

```bash
# Видалити старі рядки
sed -i '/ai-widget.js/d' pages/admin/dashboard.html
sed -i '/ai-assistant-include/d' pages/admin/dashboard.html

# Додати новий віджет
sed -i '/<\/body>/i\    <script src="/components/ai-widget-universal.js"></script>' pages/admin/dashboard.html
```

#### Варіант B: Вручну (рекомендовано для перших файлів)

1. Відкрити файл в редакторі
2. Ctrl+F → знайти `ai-widget` або `ai-assistant`
3. Видалити ці рядки
4. Перед `</body>` додати:
   ```html
   <script src="/components/ai-widget-universal.js"></script>
   ```
5. Зберегти

### Крок 3: Тестування

```bash
# Запустити сервер
./autostart.sh

# Відкрити в браузері
http://localhost:5000/pages/admin/dashboard.html

# Перевірити:
# ✅ Кнопка віджету з'явилася
# ✅ Натискається і відкривається чат
# ✅ Колір відповідає ролі
# ✅ Швидкі дії відображаються
```

---

## 📊 Список файлів для міграції

### Admin (pages/admin/)
- [ ] admin-dashboard.html
- [ ] lifts.html
- [ ] requests.html
- [ ] users.html
- [ ] analytics.html
- [ ] reports.html
- [ ] settings.html
- [ ] profile.html
- [ ] notifications.html
- [ ] qr-management.html
- [ ] ... (та інші)

### Dispatcher (pages/dispatcher/)
- [ ] dashboard.html
- [ ] assignments.html
- [ ] monitoring.html
- [ ] technicians.html
- [ ] calendar.html
- [ ] profile.html
- [ ] settings.html
- [ ] ... (та інші)

### Technician (pages/tech/)
- [ ] dashboard.html
- [ ] tasks.html
- [ ] history.html
- [ ] profile.html
- [ ] settings.html
- [ ] ... (та інші)

### Client (pages/client/)
- [ ] dashboard.html ✅ (вже має віджет)
- [ ] my-lifts.html ✅ (вже має віджет)
- [ ] requests.html ✅ (вже має віджет)
- [ ] invoices.html ✅ (вже має віджет)
- [ ] profile.html ✅ (вже має віджет)
- [ ] settings.html ✅ (вже має віджет)
- [ ] ... (та інші)

---

## ✅ Контрольний чек-лист

Після міграції кожної сторінки:

- [ ] Відкрити сторінку в браузері
- [ ] Перевірити що кнопка віджету з'явилася (правий нижній кут)
- [ ] Натиснути на кнопку - має відкритися чат
- [ ] Перевірити колір (має відповідати ролі)
- [ ] Перевірити швидкі дії (мають бути контекстні для ролі)
- [ ] Написати тестове повідомлення в чат
- [ ] Перевірити на мобільній версії (якщо важливо)

---

## 🐛 Вирішення проблем

### Віджет не з'являється

**Перевірте:**
1. Чи є рядок `<script src="/components/ai-widget-universal.js"></script>`?
2. Чи відкрита консоль (F12) - є помилки?
3. Чи файл `/components/ai-widget-universal.js` існує?
4. Чи сервер запущений?

**Рішення:**
```bash
# Перевірити що файл існує
ls -lh components/ai-widget-universal.js

# Перезапустити сервер
./autostart.sh

# Очистити кеш браузера
Ctrl+Shift+R (Chrome) або Cmd+Shift+R (Mac)
```

### Два віджети з'являються

**Причина:** Залишилися старі посилання

**Рішення:**
```bash
# Знайти дублікати
grep -n "ai-widget\|ai-assistant" pages/admin/dashboard.html

# Видалити старі рядки
```

### Віджет не того кольору

**Причина:** Роль не визначається правильно

**Перевірити:**
```javascript
// В консолі браузера
console.log(localStorage.getItem('token'));

// Декодувати JWT
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Role:', payload.role);
```

---

## 📈 Прогрес міграції

Трекайте прогрес:

```bash
# Скільки файлів має старий віджет
grep -r "ai-widget.js\|ai-assistant-include" pages/ --include="*.html" -l | wc -l

# Скільки файлів має новий віджет
grep -r "ai-widget-universal.js" pages/ --include="*.html" -l | wc -l

# Різниця = скільки залишилося мігрувати
```

---

## 🎉 Після завершення міграції

1. **Видалити старі файли:**
   ```bash
   # Вже архівовано в archive/old-ai-widget/
   ls archive/old-ai-widget/
   ```

2. **Закомітити зміни:**
   ```bash
   git add .
   git commit -m "Migrate to AI Widget Universal

   - Replaced old ai-widget.js with universal version
   - Removed ai-assistant-include.html references
   - All pages now use /components/ai-widget-universal.js
   - Archived old files to archive/old-ai-widget/"
   
   git push origin v2_refactor
   ```

3. **Оновити документацію:**
   - Оновити README.md з посиланням на AI-WIDGET-README.md
   - Додати в changelog

---

## 💡 Поради

1. **Починайте з однієї сторінки** - протестуйте перед масовою міграцією
2. **Робіть backup** - `cp pages pages-backup` перед початком
3. **Використовуйте git** - можна легко відкотити зміни
4. **Тестуйте кожну роль** - увійдіть під різними користувачами
5. **Перевіряйте на мобільних** - віджет має бути адаптивним

---

## 📞 Підтримка

Якщо виникли проблеми:

1. Перевірте консоль браузера (F12)
2. Подивіться логи сервера
3. Прочитайте `/components/AI-WIDGET-README.md`
4. Протестуйте на `/ai-widget-demo.html`

---

**Успішної міграції! 🚀**
