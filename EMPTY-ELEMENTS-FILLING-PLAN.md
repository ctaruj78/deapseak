# 🔧 ТЕХНІЧНИЙ ПЛАН НАПОВНЕННЯ ПОРОЖНІХ ЕЛЕМЕНТІВ

## Блокувальні елементи для наповнення

### 1️⃣ pages/admin/profile.html - Action кнопки

**Місцерозташування:** Лінії 657-669  
**Проблема:** 4 кнопки без функціональності

```html
<!-- ВИДАЛИТИ ЦЕ -->
<a href="#" class="action-btn system">
<a href="#" class="action-btn security">
<a href="#" class="action-btn backup">
<a href="#" class="action-btn analytics">

<!-- ДОДАТИ ЦЕ -->
<a href="#" class="action-btn system" onclick="openSystemSettings(); return false;">
<a href="#" class="action-btn security" onclick="openSecuritySettings(); return false;">
<a href="#" class="action-btn backup" onclick="createBackupNow(); return false;">
<a href="#" class="action-btn analytics" onclick="viewUserAnalytics(); return false;">
```

**Функції для додання в pages/admin/profile.html:**
```javascript
function openSystemSettings() {
    console.log('📋 Відкриття системних налаштувань...');
    // Можна добавити модальне вікно або редирект на settings.html
    window.location.href = 'settings.html';
}

function openSecuritySettings() {
    console.log('🔒 Відкриття налаштувань безпеки...');
    // Показати модальне вікно з двофакторною авторизацією, паролем тощо
    showSecurityModal();
}

function createBackupNow() {
    console.log('💾 Створення резервної копії...');
    // Відправити запит на API
    fetch('/api/backup/create', { method: 'POST' })
        .then(r => r.json())
        .then(d => alert('✅ Резервна копія створена'))
        .catch(e => alert('❌ Помилка: ' + e));
}

function viewUserAnalytics() {
    console.log('📊 Відкриття аналітики...');
    window.location.href = 'unified-analytics.html';
}
```

---

### 2️⃣ pages/admin/users.html - Детальніше посилання

**Місцерозташування:** Лінії 176, 188, 200, 212 (4 картки статистики)  
**Проблема:** "Детальніше" посилання ведуть на #

```javascript
// Додати функцію в users.html
function viewUserStats() {
    console.log('👥 Відкриття деталей користувачів...');
    // Прокрутити вниз до таблиці користувачів
    document.getElementById('usersTable').scrollIntoView({ behavior: 'smooth' });
}

// Або редирект на детальну аналітику
function viewUserStats() {
    window.location.href = 'unified-analytics.html#user-stats';
}
```

---

### 3️⃣ pages/dispatcher/technicians.html - Disabled кнопки

**Місцерозташування:** Лінії 170, 210, 216  
**Проблема:** Кнопки "Редагувати", "Видалити", "Деактивувати" відключені

```javascript
// Активувати при виборі рядка
document.querySelectorAll('tr[data-technician-id]').forEach(row => {
    row.addEventListener('click', function() {
        // Видалити disabled з кнопок
        document.querySelector('button[onclick*="edit"]').disabled = false;
        document.querySelector('button[onclick*="delete"]').disabled = false;
        document.querySelector('button[onclick*="deactivate"]').disabled = false;
        
        // Зберегти ID вибраного техніка
        window.selectedTechnicianId = this.dataset.technicianId;
    });
});

// Функції дій
function editTechnician() {
    if (!window.selectedTechnicianId) {
        alert('⚠️ Виберіть техніка');
        return;
    }
    console.log('✏️ Редагування техніка', window.selectedTechnicianId);
    // Відкрити модальне вікно
}

function deleteTechnician() {
    if (!confirm('🗑️ Ви впевнені?')) return;
    console.log('🗑️ Видалення техніка', window.selectedTechnicianId);
    // Відправити DELETE запит
}

function deactivateTechnician() {
    console.log('⛔ Деактивація техніка', window.selectedTechnicianId);
    // Відправити PATCH запит
}
```

---

### 4️⃣ pages/admin/qr-management.html - Save Filter кнопка

**Місцерозташування:** Лінія 429  
**Проблема:** Кнопка для збереження фільтру відключена

```javascript
// Активувати при змінені фільтру
document.querySelectorAll('input[name*="filter"], select[name*="filter"]').forEach(el => {
    el.addEventListener('change', function() {
        // Активувати кнопку
        document.getElementById('saveFilterBtn').disabled = false;
        console.log('💾 Фільтр змінено - кнопка активна');
    });
});

// Функція збереження
function saveFilter() {
    const filters = {
        status: document.getElementById('statusFilter')?.value,
        date: document.getElementById('dateFilter')?.value,
        location: document.getElementById('locationFilter')?.value
    };
    
    console.log('💾 Збереження фільтру', filters);
    // Зберегти в localStorage або API
    localStorage.setItem('qr_filters', JSON.stringify(filters));
    alert('✅ Фільтри збережені');
}
```

---

### 5️⃣ register.html - Умови використання

**Місцерозташування:** Лінії 83-84  
**Проблема:** Посилання на умови использования ведуть на #

**Рішення 1 (Швидке):** Додати сторінку
```html
<!-- Створити /terms-of-service.html -->
<a href="/terms-of-service.html" target="_blank">умовами використання</a>
<a href="/privacy-policy.html" target="_blank">політику конфіденційності</a>
```

**Рішення 2 (Модальне):** Показати в модальному вікні
```html
<!-- Додати атрибут data-toggle -->
<a href="#" data-toggle="modal" data-target="#termsModal">умовами використання</a>

<!-- Модальне вікно -->
<div class="modal fade" id="termsModal">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Умови використання</h5>
            </div>
            <div class="modal-body">
                <h6>1. Загальні умови</h6>
                <p>DeapSeaK - це система управління ліфтами...</p>
                <!-- Додати текст умов -->
            </div>
        </div>
    </div>
</div>
```

---

## ✅ Вже функціональні (НЕ потребують наповнення)

### pages/admin/support.html (Лінії 284-296)
```html
✅ <a href="#" class="action-btn diagnostic" onclick="runDiagnostics()">
✅ <a href="#" class="action-btn backup" onclick="createBackup()">
✅ <a href="#" class="action-btn logs" onclick="viewLogs()">
✅ <a href="#" class="action-btn update" onclick="checkUpdates()">
```

### pages/admin/qr-analytics.html (Лінії 261-303)
```html
✅ <a href="#" class="small-box-footer" onclick="scanAnalytics.showTab('daily')">
✅ <a href="#" class="small-box-footer" onclick="scanAnalytics.showTab('users')">
✅ <a href="#" class="small-box-footer" onclick="scanAnalytics.showTab('locations')">
✅ <a href="#" class="small-box-footer" onclick="scanAnalytics.showTab('devices')">
```

---

## 📋 Перевірка списку

Переконайтеся, що це все функціонально перед комітом:

- [ ] **profile.html** - 4 action кнопки мають onclick
- [ ] **users.html** - 4 "детальніше" посилання мають функціональність
- [ ] **technicians.html** - Disabled кнопки активуються при виборі
- [ ] **qr-management.html** - Save Filter кнопка активується при змінері
- [ ] **register.html** - Посилання на terms/privacy ведуть на сторінки
- [ ] **Жодна кнопка не залишилась порожною**

---

## 🎯 Очікуваний результат

✅ **Після наповнення всі елементи должны будуть:**
1. Мати видиму дію при кліку
2. Відправляти сповіщення користувачу
3. Виконувати корисну функцію або редирект
4. Не бути `disabled` без причини

