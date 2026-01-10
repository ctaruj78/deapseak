# 🖱️ Universal Table Drag-to-Scroll

Універсальний компонент для додавання функціоналу drag-to-scroll до всіх таблиць у системі.

## 📦 Що входить

1. **CSS**: `/assets/css/table-drag-scroll.css` - стилі для курсорів, scrollbar та анімації
2. **JavaScript**: `/assets/js/table-drag-scroll.js` - логіка drag-to-scroll з автоініціалізацією

## 🚀 Швидке підключення

### Варіант 1: Додати в окрему сторінку

Додайте в `<head>`:
```html
<link rel="stylesheet" href="/assets/css/table-drag-scroll.css">
```

Додайте перед закриваючим `</body>`:
```html
<script src="/assets/js/table-drag-scroll.js"></script>
```

### Варіант 2: Глобальне підключення (для всього сайту)

Відкрийте `index.html` або головний layout файл та додайте:

```html
<head>
    <!-- Інші стилі -->
    <link rel="stylesheet" href="/assets/css/table-drag-scroll.css">
</head>
<body>
    <!-- Ваш контент -->
    
    <!-- Інші скрипти -->
    <script src="/assets/js/table-drag-scroll.js"></script>
</body>
```

## 📋 Використання

### Автоматична активація

Скрипт автоматично знаходить і активує всі елементи з класом `.table-responsive`:

```html
<div class="table-responsive">
    <table class="table">
        <!-- Ваша таблиця -->
    </table>
</div>
```

### Додаткові класи

```html
<!-- Для широких таблиць (min-width: 1200px) -->
<div class="table-responsive table-wide">
    <table class="table">...</table>
</div>

<!-- Для дуже широких таблиць (min-width: 1600px) -->
<div class="table-responsive table-extra-wide">
    <table class="table">...</table>
</div>

<!-- Компактний режим (менше padding) -->
<div class="table-responsive table-compact">
    <table class="table">...</table>
</div>

<!-- З підказкою для користувача (зникає через 3 сек) -->
<div class="table-responsive" data-hint="true">
    <table class="table">...</table>
</div>
```

## ✨ Features

### 1. Drag-to-Scroll
- 🖱️ **Тягніть мишкою** вліво/вправо для горизонтального скролу
- 👆 **Курсор змінюється** на "grab" (рука) при наведенні
- ⚡ **Швидкість x2** для комфортної навігації
- 📱 **Працює на тачпадах** та мишках

### 2. Розумна логіка
- ✅ **Не блокує кнопки** - клік на `<button>`, `<a>`, `.btn` працює нормально
- ✅ **Не блокує input** - можна вводити текст у `<input>`, `<select>`
- ✅ **Розпізнає drag vs click** - якщо рух < 5px, це клік, не drag

### 3. Кастомний scrollbar
- 🎨 **Стильний дизайн** - синій scrollbar з плавними анімаціями
- 👀 **Завжди видимий** - не треба гадати де скролити
- 🌙 **Підтримка темної теми** - автоматично змінює колір в `.dark-mode`

### 4. Динамічні таблиці
- 🔄 **MutationObserver** - автоматично активує скрипт для нових таблиць
- ⚙️ **AJAX-friendly** - працює з таблицями, доданими через JavaScript
- 🔌 **Plug-and-play** - не потрібно викликати init() вручну

### 5. Responsive
- 📱 **Мобільні пристрої** - на телефонах використовує звичайний touch scroll
- 💻 **Десктоп** - drag-to-scroll тільки на великих екранах
- 🖥️ **Адаптивний** - перевіряє розмір вікна та таблиці

## 🎯 Приклади використання

### Приклад 1: Проста таблиця з ліфтами
```html
<div class="card">
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Модель</th>
                        <th>Локація</th>
                        <th>Клієнт</th>
                        <th>Статус</th>
                        <th>Дії</th>
                    </tr>
                </thead>
                <tbody id="lifts-table-body">
                    <!-- Дані з API -->
                </tbody>
            </table>
        </div>
    </div>
</div>
```

### Приклад 2: Компактна широка таблиця з підказкою
```html
<div class="table-responsive table-wide table-compact" data-hint="true">
    <table class="table table-hover">
        <!-- 15+ колонок -->
    </table>
</div>
```

### Приклад 3: Програмна ініціалізація
```javascript
// Якщо таблиця додається динамічно
const newTable = document.createElement('div');
newTable.className = 'table-responsive';
newTable.innerHTML = '<table>...</table>';
document.body.appendChild(newTable);

// Ініціалізувати вручну (необов'язково, MutationObserver зробить це автоматично)
TableDragScroll.init(newTable);
```

## ⚙️ API

### Глобальний об'єкт `window.TableDragScroll`

```javascript
// Ініціалізувати конкретний контейнер
TableDragScroll.init(container);

// Ініціалізувати всі .table-responsive на сторінці
TableDragScroll.initAll();

// Змінити налаштування
TableDragScroll.config.scrollSpeed = 3; // Збільшити швидкість
TableDragScroll.config.clickThreshold = 10; // Змінити поріг для клік vs drag
```

### Конфігурація

```javascript
TableDragScroll.config = {
    scrollSpeed: 2,           // Множник швидкості (1-5)
    clickThreshold: 5,        // Мінімальний рух для drag (px)
    detectScrollDelay: 100,   // Затримка перевірки скролу (ms)
    excludeSelectors: [...]   // Список селекторів для ігнорування
};
```

## 🔧 Налаштування

### Зміна швидкості скролу
```javascript
// У <script> після підключення table-drag-scroll.js
TableDragScroll.config.scrollSpeed = 3; // Швидше (за замовчуванням: 2)
```

### Додати свої exclude селектори
```javascript
TableDragScroll.config.excludeSelectors.push('.my-custom-button');
```

### Вимкнути для конкретної таблиці
```html
<!-- Додайте inline стилі -->
<div class="table-responsive" style="cursor: auto !important; user-select: auto !important;">
    <table>...</table>
</div>
```

## 🎨 Кастомізація стилів

### Змінити колір scrollbar
```css
.table-responsive::-webkit-scrollbar-thumb {
    background: #28a745; /* Зелений замість синього */
}
```

### Збільшити висоту scrollbar
```css
.table-responsive::-webkit-scrollbar {
    height: 16px; /* За замовчуванням: 12px */
}
```

### Прибрати індикатор "має скрол"
```css
.table-responsive::after {
    display: none !important;
}
```

## 🐛 Troubleshooting

### Проблема: Drag не працює
**Рішення**: Перевірте чи підключено скрипт:
```javascript
console.log(window.TableDragScroll); // Має бути об'єкт
```

### Проблема: Кнопки не клікаються
**Рішення**: Додайте клас `.btn` або перевірте `excludeSelectors`:
```javascript
console.log(TableDragScroll.config.excludeSelectors);
```

### Проблема: Scrollbar не видно
**Рішення**: Перевірте чи таблиця ширша за контейнер:
```javascript
const container = document.querySelector('.table-responsive');
console.log('Scroll?', container.scrollWidth > container.clientWidth);
```

### Проблема: Працює повільно
**Рішення**: Збільште швидкість:
```javascript
TableDragScroll.config.scrollSpeed = 3;
```

## 📊 Сумісність

- ✅ **Chrome** 90+
- ✅ **Firefox** 88+
- ✅ **Safari** 14+
- ✅ **Edge** 90+
- ✅ **Opera** 76+
- ⚠️ **IE11** - не підтримується (використовує MutationObserver)

## 🔗 Інтеграція з існуючими сторінками

### Сторінки де вже є таблиці:

1. **Admin - Lifts** (`pages/admin/lifts.html`) - ✅ Вже інтегровано
2. **Admin - Users** (`pages/admin/users.html`) - додайте файли
3. **Admin - Requests** (`pages/admin/requests.html`) - додайте файли
4. **Dispatcher - Requests** (`pages/dispatcher/requests.html`) - додайте файли
5. **Tech - Tasks** (`pages/tech/tasks.html`) - додайте файли
6. **Client - Requests** (`pages/client/requests.html`) - додайте файли
7. **Client - Invoices** (`pages/client/invoices.html`) - додайте файли

### Масове додавання

Запустіть скрипт:
```bash
cd /workspaces/deapseak
./add-drag-scroll-to-all-pages.sh
```

Або додайте вручну в кожну сторінку з таблицями.

## 📝 Changelog

### Version 1.0.0 (2026-01-10)
- ✨ Перша версія
- 🖱️ Drag-to-scroll для горизонтального скролу
- 🎨 Кастомний scrollbar
- 🔄 MutationObserver для динамічних таблиць
- 📱 Responsive підтримка
- 🌙 Темна тема
- 🎯 Розумне виключення інтерактивних елементів

## 👨‍💻 Автори

**DeapSeaK Development Team**
- GitHub Copilot
- Developer Team

## 📄 Ліцензія

MIT License - використовуйте вільно у вашому проекті!

---

**⭐ Корисно? Поставте зірку на GitHub!**
