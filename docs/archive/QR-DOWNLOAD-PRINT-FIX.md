# 🐛 QR КОД - ВИПРАВЛЕННЯ DOWNLOAD/PRINT

**Дата:** 12 жовтня 2025  
**Проблеми:**
1. ❌ QR не відображається (білий квадрат)
2. ❌ Кнопка PNG каже "згенеруйте спочатку код"
3. ❌ Кнопка Друк не працює

---

## 🔍 ПРИЧИНА

Методи `downloadQRCode()` та `printQRCode()` шукали **canvas**:
```javascript
const canvas = $(previewContainer).find('canvas')[0];
if (!canvas) {
    this.showMessage('Спочатку згенеруйте QR-код', 'error');
}
```

Але бібліотека `qrcode-generator` створює **IMG**, а не canvas! ❌

---

## ✅ ВИПРАВЛЕННЯ

### 1. Метод `downloadQRCode()` 
**Файл:** `/assets/js/enhanced-lift-modal.js`

```javascript
// БУЛО
const canvas = $(previewContainer).find('canvas')[0];
if (!canvas) { return; }
link.href = canvas.toDataURL();

// СТАЛО
const img = $(previewContainer).find('img')[0];
const canvas = $(previewContainer).find('canvas')[0];
const qrElement = img || canvas;

if (!qrElement) { return; }

// Якщо це IMG - використовуємо src напряму
if (qrElement.tagName === 'IMG') {
    link.href = qrElement.src;
} else {
    link.href = qrElement.toDataURL();
}
```

### 2. Метод `printQRCode()`
Аналогічно виправлено - шукає і img, і canvas.

---

## 🧪 ТЕСТУВАННЯ

### Файл для діагностики: **`qr-dom-debug.html`**

Цей файл:
1. ✅ Завантажує бібліотеку
2. ✅ Генерує QR код
3. ✅ Показує ЩО САМЕ створилось (IMG/Canvas)
4. ✅ Виводить всі CSS властивості
5. ✅ Показує src IMG елемента

**Відкрийте файл і натисніть "Генерувати QR"**

Має показати:
```
✅ Конструктор виконався без помилок
🖼️ Знайдено IMG:
  width: 200
  height: 200
  src length: 5000+ (base64 даних)
  src preview: data:image/gif;base64,R0lGOD...
  Computed CSS:
    display: block
    visibility: visible
    opacity: 1
```

---

## 🎯 ОЧІКУВАНІ РЕЗУЛЬТАТИ

### У `pages/admin/lifts.html`:

1. **Генерація:**
   - Натиснути кнопку з іконкою QR
   - ✅ Має з'явитись QR код

2. **Download PNG:**
   - Натиснути кнопку "PNG"
   - ✅ Має завантажитись файл `QR-lift-НОМЕР-1.png`

3. **Друк:**
   - Натиснути кнопку "Друк"
   - ✅ Має відкритись вікно друку з QR кодом

---

## 📊 ДОДАТКОВІ ВИПРАВЛЕННЯ

### У CSS (`enhanced-lift-modal.css`):
```css
#mainQrPreview img,
#mainQrPreview canvas {
    display: block !important;
    margin: 0 auto;
    background: white !important;
    border: 3px solid white;
}
```

---

## 🚀 НАСТУПНІ КРОКИ

1. Відкрити **`qr-dom-debug.html`**
2. Натиснути "Генерувати QR"
3. Подивитись логи - чи створюється IMG
4. Якщо IMG є але не видно - проблема в CSS
5. Якщо IMG немає - проблема в бібліотеці

---

**Тестуйте `qr-dom-debug.html` і скажіть що показує в логах!** 🐛
