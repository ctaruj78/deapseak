# 🧹 Інструкції по очищенню кешу та тестових даних

## Проблема
Браузер кешує старі версії JavaScript файлів з видаленими функціями `testSave()` та `manualRefreshTable()`.

## Рішення

### 1️⃣ Жорстке оновлення сторінки (РЕКОМЕНДОВАНО)
**Windows/Linux**: `Ctrl + Shift + R` або `Ctrl + F5`  
**Mac**: `Cmd + Shift + R`

Це оновить сторінку з повним очищенням кешу.

### 2️⃣ Очищення localStorage (якщо є тестові ліфти)
Відкрийте консоль браузера (`F12`) та виконайте:

```javascript
// Видалити всі тестові дані
localStorage.clear();

// АБО видалити тільки дані ліфтів
Object.keys(localStorage).forEach(key => {
    if (key.includes('lift') || key === 'lifts' || key === 'allLifts') {
        localStorage.removeItem(key);
    }
});

// Оновити сторінку
location.reload(true);
```

### 3️⃣ Повне очищення кешу браузера
1. Відкрийте DevTools (`F12`)
2. Перейдіть на вкладку **Application** (Chrome) або **Storage** (Firefox)
3. В лівій панелі оберіть **Clear storage**
4. Натисніть **Clear site data**
5. Оновіть сторінку

## ✅ Що виправлено

### Версії файлів оновлено:
- `auth.js?v=20241116` → `auth.js?v=20241206` ✅
- `lifts.js?v=20241116` → `lifts.js?v=20241206` ✅
- `simple-lift-modal.js?v=20241116` → `simple-lift-modal.js?v=20241206` ✅
- `form-validator.js?v=20241116` → `form-validator.js?v=20241206` ✅
- `enhanced-lift-modal.js?v=20241116` → `enhanced-lift-modal.js?v=20241206` ✅

### Видалено з коду:
- ❌ Функція `testSave()` - тестове автозаповнення форми
- ❌ Функція `manualRefreshTable()` - ручне оновлення таблиці (114 рядків)
- ❌ Підключення `test-lift-saving.js`

## 📝 Після очищення

1. **Оновіть сторінку**: `Ctrl + Shift + R`
2. **Перевірте консоль**: Не повинно бути помилок про `testSave` або `manualRefreshTable`
3. **Створіть новий ліфт**: Через звичайну форму, без тестових кнопок
4. **Перевірте CRUD**: Create → Edit → View → Delete повинні працювати

## 🐛 Якщо проблеми залишаються

Перезапустіть сервер:
```bash
cd /workspaces/deapseak
pkill -f "node.*unified-server" || true
node unified-server.js
```

Потім оновіть сторінку з очищенням кешу.
