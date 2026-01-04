# 🤖 AI Widget Universal

Універсальний віджет AI асистента для всіх ролей користувачів системи DeapSeaK.

---

## ✨ Особливості

- **🎨 Адаптивний дизайн** - автоматично змінює кольори та іконки під роль користувача
- **🔐 JWT автентифікація** - визначає роль з токена, захищає від неавторизованого доступу
- **⚡ Швидкі дії** - контекстні кнопки для кожної ролі
- **💬 Розумний чат** - історія повідомлень, typing indicator, форматування тексту
- **📱 Адаптивний** - працює на всіх пристроях (desktop, tablet, mobile)
- **🎭 Анімації** - плавні переходи, pulse ефекти, slide up
- **📦 Standalone** - не потребує залежностей (крім Font Awesome)

---

## 🚀 Використання

### Базове підключення (ДУЖЕ ПРОСТО!)

Додайте **ОДИН** рядок в кінець вашої HTML сторінки, перед закриваючим тегом `</body>`:

```html
<!-- В кінці body, перед </body> -->
<script src="/components/ai-widget-universal.js"></script>
```

**ВСЕ!** Більше нічого не потрібно! 🎉

Віджет сам:
- ✅ Визначить роль користувача з JWT токена
- ✅ Завантажить Font Awesome (якщо ще не завантажено)
- ✅ Додасть стилі
- ✅ Створить кнопку та модальне вікно
- ✅ Налаштує функціонал під роль

---

## 🎭 Підтримувані ролі

Віджет автоматично адаптується під роль користувача:

| Роль | Колір | Іконка | Швидкі дії |
|------|-------|--------|-----------|
| **Admin** | 🔵 Синій (#3a86ff) | 🛡️ fa-user-shield | Статистика, Ризики, Звіт |
| **Dispatcher** | 🟢 Зелений (#06d6a0) | 🎧 fa-headset | Техніки, Запити, Терміново |
| **Technician** | 🟠 Помаранчевий (#f77f00) | 🔧 fa-wrench | Завдання, Діагностика, Безпека |
| **Client** | 🟣 Фіолетовий (#8338ec) | 👤 fa-user | Мої ліфти, Історія, Запит |
| **Default** | 🔵 Синій (#3a86ff) | 🤖 fa-robot | Допомога, Функції |

---

## 📋 Приклади використання

### 1. В існуючій сторінці

```html
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Моя сторінка</title>
    <!-- Ваші стилі та скрипти -->
</head>
<body>
    <!-- Ваш контент -->
    <h1>Панель адміністратора</h1>
    <!-- ... -->

    <!-- AI Widget - ТІЛЬКИ ЦЕЙ РЯДОК! -->
    <script src="/components/ai-widget-universal.js"></script>
</body>
</html>
```

### 2. В React/Vue компоненті

```javascript
// У вашому компоненті
useEffect(() => {
    // Динамічне завантаження скрипта
    const script = document.createElement('script');
    script.src = '/components/ai-widget-universal.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
        // Cleanup при демонтажі
        document.body.removeChild(script);
    };
}, []);
```

### 3. В AdminLTE шаблоні

```html
<!-- В шаблоні AdminLTE -->
<div class="content-wrapper">
    <!-- Ваш контент -->
</div>

<footer class="main-footer">
    <!-- Футер -->
</footer>

<!-- AI Widget -->
<script src="/components/ai-widget-universal.js"></script>
</body>
</html>
```

---

## 🎨 Кастомізація (опціонально)

Якщо потрібно змінити конфігурацію, можна передати параметри **перед** підключенням скрипта:

```html
<script>
    // Кастомна конфігурація (опціонально)
    window.AIWidgetConfig = {
        position: {
            bottom: '20px',
            right: '20px'
        },
        colors: {
            admin: '#FF5733',  // Власний колір для admin
            // інші ролі...
        }
    };
</script>
<script src="/components/ai-widget-universal.js"></script>
```

---

## 🔧 API Endpoint

Віджет відправляє повідомлення на:

```
POST /api/ai/chat
```

**Request:**
```json
{
    "message": "Текст повідомлення користувача",
    "history": [
        { "sender": "user", "text": "...", "time": "..." },
        { "sender": "assistant", "text": "...", "time": "..." }
    ]
}
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Response:**
```json
{
    "reply": "Відповідь AI асистента",
    "status": "success"
}
```

---

## 🧪 Тестування

Відкрийте демо сторінку для тестування:

```
http://localhost:5000/ai-widget-demo.html
```

На демо сторінці можна:
- ✅ Перемикати ролі
- ✅ Тестувати різні кольори та іконки
- ✅ Перевіряти швидкі дії
- ✅ Тестувати чат функціонал

---

## 📁 Структура файлів

```
components/
  └── ai-widget-universal.js  ← Єдиний файл компонента

archive/
  └── old-ai-widget/          ← Старі версії (архів)
      ├── ai-widget.js
      └── ai-assistant-include.html
```

---

## 🔐 Безпека

1. **JWT автентифікація** - всі запити до AI вимагають валідний токен
2. **Перевірка терміну дії** - якщо токен прострочений, віджет перенаправляє на логін
3. **Захист від XSS** - всі повідомлення фільтруються
4. **Rate limiting** - захист від спаму (на стороні сервера)

---

## 🌐 Браузерна підтримка

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## 📱 Адаптивність

Віджет автоматично адаптується під розмір екрану:

- **Desktop** (>768px): повна ширина 380px, висота 550px
- **Mobile** (<768px): майже на весь екран з відступами
- **Tablet**: проміжний розмір

---

## 🐛 Відладка

Включіть консоль браузера (F12) для перегляду логів:

```javascript
🤖 AI Widget Universal: роль користувача - admin
✅ AI Widget Universal: ініціалізовано успішно!
```

---

## ❓ FAQ

### Як видалити старий віджет зі сторінки?

Просто видаліть всі посилання на:
- `<script src="/components/ai-widget.js"></script>`
- `<script src="/assets/js/modules/ai-assistant.js"></script>`
- `<!-- AI Assistant Floating Button & Modal -->` блоки

І додайте новий:
- `<script src="/components/ai-widget-universal.js"></script>`

### Чи потрібно змінювати backend?

Ні! Віджет працює з існуючим `/api/ai/chat` endpoint.

### Як змінити позицію віджету?

Передайте конфігурацію перед підключенням скрипта (див. секцію "Кастомізація").

### Чи працює без JWT токена?

Кнопка відображається, але при спробі відправити повідомлення віджет покаже повідомлення про необхідність входу та перенаправить на логін.

---

## 📝 Changelog

### v2.0.0 (2026-01-04)
- ✨ Перша версія універсального віджету
- 🎨 Адаптивні кольори та іконки під ролі
- ⚡ Швидкі дії для кожної ролі
- 💬 Покращений chat UI
- 📱 Повна адаптивність
- 🔐 JWT автентифікація
- 🎭 Плавні анімації

---

## 👨‍💻 Автори

DeapSeaK Development Team & GitHub Copilot

---

## 📄 Ліцензія

MIT License - використовуйте вільно!

---

**🚀 Готові використовувати? Додайте один рядок і віджет працює!**

```html
<script src="/components/ai-widget-universal.js"></script>
```
