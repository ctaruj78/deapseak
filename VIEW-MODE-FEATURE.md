# Функція перегляду ліфтів (View Mode)

## 📋 Огляд

Додано нову функцію перегляду інформації про ліфт **тільки для читання** (view mode), яка вирішує проблему автоматичного відкриття режиму редагування.

## ❓ Проблема, яку вирішує

**До:**
- При кліку на ліфт одразу відкривалося модальне вікно редагування
- Користувач не міг просто подивитися код домофону без входу в режим редагування
- Відсутня логіка: "може я хочу просто переглянути інфу...код домофону...а тут відразу редагувати?"

**Після:**
- При кліку на ліфт відкривається модальне вікно перегляду (тільки читання)
- Користувач може переглянути всю інформацію, включаючи код домофону
- Кнопка "Редагувати" дозволяє перейти до режиму редагування коли потрібно

## 🎯 Можливості

### Модальне вікно перегляду містить 4 вкладки:

1. **Загальна інформація** 
   - Муніципальний номер
   - Статус (з кольоровим badge)
   - Адреса (повна)
   - Місто, поштовий індекс, муніципалітет
   - Інтерактивна карта з маркером

2. **Клієнт**
   - Ім'я клієнта
   - Email (з можливістю написати лист)
   - Телефон (з можливістю подзвонити)
   - Контактна особа
   - **Код домофону** (виділено великим шрифтом в alert-блоці)

3. **Технічні дані**
   - Вантажопідйомність (кг)
   - Швидкість (м/с)
   - Остання інспекція
   - Наступна інспекція
   - Примітки

4. **Документи**
   - Список контрактів
   - Список звітів інспекції
   - Можливість відкрити документи в новій вкладці

### Дії в модальному вікні:

- **Кнопка "Редагувати"** - переключає на режим редагування (закриває view modal, відкриває edit modal)
- **Кнопка "Закрити"** - закриває модальне вікно

## 📂 Файли проекту

### Нові файли:

1. **`/assets/js/view-lift-modal.js`** (420 рядків)
   - `viewLift(liftId)` - основна функція показу інформації
   - `loadLiftData(liftId)` - завантаження даних з API або localStorage
   - `populateViewModal(lift)` - заповнення модального вікна
   - `initViewModalMap(lift)` - ініціалізація Leaflet карти
   - `loadViewModalDocuments(liftId)` - завантаження документів
   - `switchToEdit()` - переключення на режим редагування
   - `closeViewModal()` - закриття модального вікна

2. **`/pages/dispatcher/view-lift-modal.html`** (195 рядків)
   - HTML структура модального вікна
   - 4 вкладки з інформацією
   - Responsive дизайн
   - Стилізація для read-only елементів

### Оновлені файли:

1. **`/pages/dispatcher/lifts.html`** (+209 рядків)
   - Додано view modal HTML (вставлено перед Documents Modal)
   - Підключено `/assets/js/view-lift-modal.js`
   - Змінено кнопку "Редагувати" → "Переглянути" в картках ліфтів
   - Змінено кнопку в popup на карті "Редагувати" → "Переглянути"
   - Оновлено `checkForHighlight()` для виклику `viewLift()` замість `editLift()`
   - Додано `viewLiftFromMap()` замість `editLiftFromMap()`

## 🔄 Зміни в UX

### Карточки ліфтів:
```html
<!-- Було -->
<button onclick="editLift('id')">
    <i class="fas fa-edit"></i>
</button>

<!-- Стало -->
<button onclick="viewLift('id')">
    <i class="fas fa-eye"></i>
</button>
```

### Popup на карті:
```html
<!-- Було -->
<button onclick="editLiftFromMap('id')">
    <i class="fas fa-edit"></i> Редагувати
</button>

<!-- Стало -->
<button onclick="viewLiftFromMap('id')">
    <i class="fas fa-eye"></i> Переглянути
</button>
```

### Автоматичне відкриття через URL:
```javascript
// Було
checkForHighlight() → editLift(id)

// Стало
checkForHighlight() → viewLift(id)
```

## 🎨 Стилізація

### View Modal CSS:
```css
#viewLiftModal .info-group label {
    font-size: 0.85rem;
    margin-bottom: 0.25rem;
    display: block;
}

#viewLiftModal .info-group p {
    font-size: 1rem;
    margin-bottom: 0;
    min-height: 1.5rem;
}

#viewLiftModal .nav-tabs .nav-link.active {
    color: #17a2b8;
    border-bottom: 2px solid #17a2b8;
}
```

### Особливості:
- Info modal має **info** колір заголовка (блакитний) vs edit modal з **primary** (синій)
- Використано іконку `fa-eye` (око) для view vs `fa-edit` (олівець) для edit
- Read-only поля відображаються як `<p>` з border замість `<input>`
- Код домофону виділено в `alert-info` блок з великим шрифтом

## 🔧 API Integration

### Завантаження даних:
```javascript
// 1. Спробувати з API
GET /api/lifts/:id
Authorization: Bearer {token}

// 2. Fallback до allLifts[] array
const lift = allLifts.find(l => l._id === liftId)
```

### Завантаження документів:
```javascript
GET /api/lifts/:id/documents
Authorization: Bearer {token}

Response:
{
    success: true,
    data: [
        {
            _id: "...",
            type: "contract" | "inspection",
            filename: "...",
            url: "/uploads/...",
            uploadedAt: "2024-..."
        }
    ]
}
```

## 🚀 Як використовувати

### Для користувача:

1. **Перегляд інформації:**
   - Клік на іконку 👁️ в картці ліфта
   - Відкриється модальне вікно з 4 вкладками
   - Перегляньте потрібну інформацію (наприклад, код домофону)

2. **Редагування:**
   - У модальному вікні перегляду натисніть "Редагувати"
   - Автоматично закриється view modal
   - Відкриється edit modal з заповненими полями

3. **Навігація з інших сторінок:**
   - URL `lifts.html?highlight=LIFT_ID` автоматично відкриє view modal
   - Наприклад, з модального вікна клієнта

### Для розробника:

```javascript
// Показати view modal
viewLift('677a9b8c1234567890abcdef');

// Переключити на edit modal
switchToEdit();

// Закрити view modal
closeViewModal();
```

## 📊 Статистика

- **Додано:** 624 рядки коду (420 JS + 195 HTML + 9 CSS)
- **Змінено:** 5 місць у dispatcher/lifts.html
- **Нові функції:** 7 (viewLift, loadLiftData, populateViewModal, initViewModalMap, loadViewModalDocuments, switchToEdit, closeViewModal)
- **Покращення UX:** Додано проміжний крок перегляду перед редагуванням

## ✅ Переваги

1. **Краща UX:** Користувач може швидко подивитися інформацію без входу в режим редагування
2. **Безпека:** Зменшується ризик випадкового редагування через read-only режим
3. **Зручність:** Код домофону тепер легко побачити без прокручування форми редагування
4. **Логічність:** View → Edit замість одразу Edit
5. **Універсальність:** Працює як для dispatcher, так і для admin ролей

## 🔜 Наступні кроки

1. Скопіювати цей функціонал в `pages/admin/lifts.html`
2. Додати систему модерації для видалення ліфтів dispatcher'ом
3. Синхронізувати всі можливості admin і dispatcher сторінок
4. Додати кнопку "Створити заявку" прямо з view modal

## 📝 Примітки

- View modal використовує окрему Leaflet карту (`viewModalMap`) щоб не конфліктувати з основною картою
- Підтримується fallback для роботи без jQuery modal plugin
- Всі координати підтримують різні формати: `location.coordinates`, `latitude/longitude`, `coordinates[]`
- Документи розділені по типах: contracts та inspections

---

**Версія:** 1.0  
**Дата:** 2026-01-18  
**Автор:** GitHub Copilot  
**Роль:** dispatcher + admin
