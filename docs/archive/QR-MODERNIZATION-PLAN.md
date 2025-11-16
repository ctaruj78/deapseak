# 🔄 План модернізації QR системи

**Дата:** 12 жовтня 2025  
**Статус:** 📋 ПЛАН ДО ВИКОНАННЯ

---

## 🔍 Що знайдено в проекті

### 📂 Структура QR модуля:

#### 1. **JavaScript файли:**
- `/assets/js/qr.js` - Клас `QRManager` (базова генерація)
- `/assets/js/qr-utils.js` - Утиліти для API, сканування, історії
- `/assets/js/enhanced-lift-modal.js` - Генерація QR в модальному вікні ліфта
- `/assets/js/common.js` - Загальні функції (вже використовує qrcodejs)

#### 2. **HTML сторінки в `/pages/qr/`:**
- `qr-scanner.html` - Сканер QR кодів
- `qr-generator.html` - Генератор QR кодів
- `qr-batch.html` - Масова генерація
- `qr-management.html` - Керування QR кодами
- `qr-history.html` - Історія сканувань
- `qr-analytics.html` - Аналітика використання
- `generator.html` - Інший варіант генератора
- `scanner.html` - Інший варіант сканера
- `history.html` - Інша історія

#### 3. **Бібліотеки:**
- ❌ `/assets/libs/qrcode.min.js` - **СТАРА** (qrcode-generator, не працює)
- ✅ `/assets/libs/qrcodejs.min.js` - **НОВА** (правильна, працює)
- `/assets/libs/qrcode-loader.js` - Завантажувач (вже оновлено)

---

## ⚠️ Поточні проблеми

### 1. **Різні бібліотеки в різних місцях:**

**Файл `qr-generator.html`:**
```html
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
```
❌ Це **npm qrcode** бібліотека - **НЕПРАВИЛЬНА API** (toCanvas)

**Файл `generator.html`:**
```html
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
```
❌ Та сама неправильна бібліотека

**Файл `common.js`:**
```javascript
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
```
✅ Це **qrcodejs** - **ПРАВИЛЬНА API** (new QRCode)

### 2. **Різні формати даних:**

**В `qr.js`:**
```javascript
QRManager.generateQRCode(`qr-${lift.id}`, JSON.stringify({
    liftId: lift.id,
    serial: lift.serialNumber
}));
```
❌ Старий формат - тільки ID і серійник, **без адреси**

**В `enhanced-lift-modal.js` (нове):**
```javascript
const qrData = {
    id: municipalNumber.trim(),
    lift: liftNumber,
    addr: address.substring(0, 80)
};
```
✅ Новий формат - **з адресою для диспетчера**

### 3. **API не працює в Codespaces:**

Всі CDN посилання блокуються:
- `cdn.jsdelivr.net` - ❌ блоковано
- `cdnjs.cloudflare.com` - ❌ блоковано

Потрібно **локальні копії**!

---

## ✅ План модернізації

### Етап 1: Підготовка (1-2 години)

#### 1.1. Зробити інвентаризацію:
```bash
# Знайти всі місця де використовується QRCode/qrcode
grep -r "QRCode\|qrcode" pages/qr/*.html > qr-usage-report.txt
grep -r "QRCode\|qrcode" assets/js/*.js >> qr-usage-report.txt
```

#### 1.2. Створити резервні копії:
```bash
mkdir -p backup/qr-old
cp pages/qr/*.html backup/qr-old/
cp assets/js/qr*.js backup/qr-old/
```

#### 1.3. Документувати поточний стан:
- Які файли використовують яку бібліотеку
- Які API виклики де є
- Який формат даних де використовується

---

### Етап 2: Оновлення бібліотеки (2-3 години)

#### 2.1. Видалити старі CDN посилання:

**В усіх файлах замінити:**
```html
<!-- СТАРЕ (ВИДАЛИТИ): -->
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>

<!-- НОВЕ (ДОДАТИ): -->
<script src="/assets/libs/qrcodejs.min.js"></script>
```

**Файли для оновлення:**
- [ ] `/pages/qr/qr-generator.html`
- [ ] `/pages/qr/generator.html`
- [ ] (інші файли зі списку)

#### 2.2. Додати qrcode-loader:

У файли де потрібно:
```html
<script src="/assets/libs/qrcode-loader.js"></script>
```

---

### Етап 3: Уніфікація API (3-4 години)

#### 3.1. Оновити QRManager клас:

**Файл:** `/assets/js/qr.js`

**СТАРЕ:**
```javascript
new QRCode(container, {
    text: data,
    width: 128,
    height: 128,
    colorDark: "#000000",      // ❌ Не підтримується в qrcodejs
    colorLight: "#ffffff",      // ❌ Не підтримується в qrcodejs
    correctLevel: QRCode.CorrectLevel.H  // ❌ Не підтримується
});
```

**НОВЕ:**
```javascript
new QRCode(container, {
    text: data,
    width: 128,
    height: 128
    // qrcodejs не підтримує colorDark/colorLight/correctLevel
});
```

#### 3.2. Створити wrapper для сумісності:

```javascript
// qr-compatibility.js - для старого коду
class QRCodeWrapper {
    constructor(element, options) {
        // Видаляємо непідтримувані опції
        const cleanOptions = {
            text: options.text,
            width: options.width || 128,
            height: options.height || 128
        };
        
        // Виклик оригінальної бібліотеки
        return new window.QRCode(element, cleanOptions);
    }
}

// Для зворотної сумісності
if (typeof window.QRCode === 'undefined') {
    window.QRCode = QRCodeWrapper;
}
```

---

### Етап 4: Уніфікація формату даних (2-3 години)

#### 4.1. Створити стандарт формату:

**Файл:** `/assets/js/qr-data-format.js`

```javascript
/**
 * Стандартний формат QR даних для системи
 */
class QRDataFormat {
    /**
     * Створити QR дані для ліфта
     * @param {Object} lift - Об'єкт ліфта
     * @returns {String} JSON string для QR коду
     */
    static createLiftQRData(lift) {
        const data = {
            type: 'lift',  // Тип QR коду
            id: lift.municipalNumber || lift.serialNumber,
            lift: lift.liftNumber || 1,
            addr: (lift.address || '').substring(0, 80),
            
            // Опціональні поля (якщо є)
            ...(lift.floor && { floor: lift.floor }),
            ...(lift.phone && { phone: lift.phone.substring(0, 15) }),
            
            // Час створення
            created: new Date().toISOString().split('T')[0]  // Тільки дата (YYYY-MM-DD)
        };
        
        const jsonString = JSON.stringify(data);
        
        // Перевірка розміру
        if (jsonString.length > 2024) {
            console.warn('⚠️ QR data too long:', jsonString.length, 'chars');
            // Скорочуємо адресу якщо треба
            data.addr = data.addr.substring(0, 50);
            return JSON.stringify(data);
        }
        
        return jsonString;
    }
    
    /**
     * Розпарсити QR дані
     * @param {String} qrText - Текст з QR коду
     * @returns {Object} Об'єкт з даними
     */
    static parseQRData(qrText) {
        try {
            const data = JSON.parse(qrText);
            
            // Валідація обов'язкових полів
            if (!data.type || !data.id) {
                throw new Error('Невалідний формат QR коду');
            }
            
            return data;
        } catch (e) {
            // Можливо це старий формат (просто номер)
            if (qrText.match(/^[A-Z0-9\/-]+$/i)) {
                return {
                    type: 'lift-legacy',
                    id: qrText,
                    legacy: true
                };
            }
            throw new Error('Не вдалося розпарсити QR дані: ' + e.message);
        }
    }
    
    /**
     * Перевірити розмір QR даних
     * @param {String} qrText - Текст для QR коду
     * @returns {Object} {valid: boolean, length: number, maxLength: number}
     */
    static validateSize(qrText) {
        const maxLength = 2024;
        return {
            valid: qrText.length <= maxLength,
            length: qrText.length,
            maxLength: maxLength,
            remaining: maxLength - qrText.length
        };
    }
}
```

#### 4.2. Оновити всі місця генерації:

- [ ] `qr.js` - використовувати `QRDataFormat.createLiftQRData()`
- [ ] `enhanced-lift-modal.js` - вже використовує подібний формат, адаптувати
- [ ] `qr-generator.html` - використовувати новий формат
- [ ] інші місця

---

### Етап 5: Оновлення сканера (2-3 години)

#### 5.1. Оновити qr-scanner.html:

Додати підтримку нового формату:
```javascript
function processScan(qrText) {
    try {
        const data = QRDataFormat.parseQRData(qrText);
        
        if (data.legacy) {
            // Старий формат - показати попередження
            showLegacyWarning(data);
        } else {
            // Новий формат - показати всю інфу
            showScanResult(data);
        }
    } catch (e) {
        showError(e.message);
    }
}
```

#### 5.2. Додати відображення адреси:

```javascript
function showScanResult(data) {
    const html = `
        <div class="scan-success">
            <h3>✅ Ліфт: ${data.id}</h3>
            <p><strong>📍 Адреса:</strong> ${data.addr}</p>
            <p><strong>🏢 Ліфт №:</strong> ${data.lift}</p>
            ${data.floor ? `<p>📏 Поверх: ${data.floor}</p>` : ''}
            ${data.phone ? `<p>📞 Телефон: ${data.phone}</p>` : ''}
        </div>
    `;
    document.getElementById('scan-result').innerHTML = html;
}
```

---

### Етап 6: Оновлення інтеграцій (1-2 години)

#### 6.1. Оновити qr-utils.js:

Додати функції для роботи з новим форматом:
```javascript
/**
 * Реєстрація сканування з новим форматом
 */
async function scanQRCode(qrText, scannedBy = null) {
    const data = QRDataFormat.parseQRData(qrText);
    
    // Відправка на сервер
    return await fetch(`${apiBaseUrl}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            qrData: data,
            qrText: qrText,
            scannedBy: scannedBy,
            scannedAt: new Date().toISOString(),
            location: data.addr  // ← Додаємо адресу!
        })
    });
}
```

---

### Етап 7: Тестування (2-3 години)

#### 7.1. Юніт тести:

```javascript
// test-qr-format.js
describe('QRDataFormat', () => {
    it('створює валідні дані для ліфта', () => {
        const lift = {
            municipalNumber: 'CML-123',
            liftNumber: 1,
            address: 'вул. Шевченка, 10'
        };
        const qrText = QRDataFormat.createLiftQRData(lift);
        const data = QRDataFormat.parseQRData(qrText);
        
        expect(data.id).toBe('CML-123');
        expect(data.addr).toBe('вул. Шевченка, 10');
    });
    
    it('обробляє старий формат', () => {
        const data = QRDataFormat.parseQRData('CML-123');
        expect(data.legacy).toBe(true);
        expect(data.id).toBe('CML-123');
    });
    
    it('перевіряє розмір даних', () => {
        const qrText = 'x'.repeat(3000);
        const result = QRDataFormat.validateSize(qrText);
        expect(result.valid).toBe(false);
    });
});
```

#### 7.2. Інтеграційні тести:

**Список для перевірки:**
- [ ] Генерація QR в модальному вікні ліфта
- [ ] Генерація на сторінці qr-generator.html
- [ ] Масова генерація (qr-batch.html)
- [ ] Сканування на qr-scanner.html
- [ ] Завантаження PNG
- [ ] Друк QR коду
- [ ] Історія сканувань
- [ ] API інтеграція

---

## 📊 Оцінка часу

| Етап | Завдання | Час |
|------|----------|-----|
| 1 | Підготовка, інвентаризація | 1-2 год |
| 2 | Оновлення бібліотеки | 2-3 год |
| 3 | Уніфікація API | 3-4 год |
| 4 | Уніфікація формату даних | 2-3 год |
| 5 | Оновлення сканера | 2-3 год |
| 6 | Оновлення інтеграцій | 1-2 год |
| 7 | Тестування | 2-3 год |
| **ВСЬОГО** | | **13-20 годин** |

Реалістично: **2-3 робочих дні** (по 6-8 годин на день)

---

## 🎯 Пріоритети

### 🔴 Критично (зробити першим):
1. Замінити CDN на локальні файли (qrcodejs.min.js)
2. Виправити API виклики (colorDark/correctLevel)
3. Додати адресу в формат QR даних

### 🟡 Важливо (зробити другим):
4. Уніфікувати формат даних (QRDataFormat)
5. Оновити сканер для показу адреси
6. Протестувати основні сценарії

### 🟢 Бажано (якщо залишиться час):
7. Додати юніт тести
8. Створити документацію API
9. Оптимізувати розмір даних

---

## 📝 Наступні кроки

### Коли ви повернетесь:

1. **Почнемо з інвентаризації:**
   ```bash
   grep -r "QRCode" pages/qr/*.html | wc -l
   ```
   Подивимось скільки місць треба оновити

2. **Створимо чеклист:**
   - Список файлів для оновлення
   - Пріоритетність змін
   - План тестування

3. **Почнемо модернізацію:**
   - Спочатку найважливіші файли
   - Потім другорядні
   - В кінці тести

---

**Автор:** GitHub Copilot  
**Дата створення:** 12 жовтня 2025  
**Статус:** 📋 Готовий до виконання
