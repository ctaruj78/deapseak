# 🗺️ Geocoding Fix Report - Координати ліфтів

**Дата:** 11 січня 2026  
**Проблема:** 5 ліфтів мали координати з Бразилії замість Португалії

---

## 🔍 Виявлена проблема

При додаванні ліфтів через форму, API геокодування (OpenStreetMap Nominatim) повернуло **неправильні координати** для деяких португальських адрес:

### ❌ Помилкові координати:

| ID | Адреса | Помилкові координати | Реальна локація |
|----|--------|---------------------|-----------------|
| 69602d9791465121843a120f | av do marginal 100, 2795-036 | -20.75, -49.39 | 🇧🇷 São José do Rio Preto, Brazil |
| 696037130cb3c1e2be4255e5 | av do marginal 100, 2795-036 | -20.75, -49.39 | 🇧🇷 São José do Rio Preto, Brazil |
| 69617aa6db33ab823fc7c4f8 | av do marginal 100, 2795-036 | -20.75, -49.39 | 🇧🇷 São José do Rio Preto, Brazil |
| 69617948db33ab823fc7c4f7 | RUA ALEXANDRE FERREIRA 47, 1750-010 | -22.87, -43.49 | 🇧🇷 Rio de Janeiro, Brazil |
| 69618220d0760279bb82e5a2 | RUA ALEXANDRE FERREIRA 41, 1750-011 | -22.87, -43.49 | 🇧🇷 Rio de Janeiro, Brazil |

### 🎯 Причина:
API геокодування знайшов **співпадіння назв вулиць** в Бразилії (колишня португальська колонія) і повернув координати звідти.

---

## ✅ Виправлення

### Виконані операції:

```javascript
// 1. av do marginal 100, 2795-036 -> Oeiras, Portugal
db.lifts.updateMany(
  { 'address.street': 'av do marginal 100', 'address.zipCode': '2795-036' },
  { $set: { 
    'location.coordinates': [-9.2494, 38.7108],
    'address.city': 'Oeiras'
  }}
);
// ✅ Виправлено: 3 ліфти

// 2. RUA ALEXANDRE FERREIRA 47, 1750-010 -> Lisboa
db.lifts.updateOne(
  { 'address.street': 'RUA ALEXANDRE FERREIRA 47' },
  { $set: { 
    'location.coordinates': [-9.1620, 38.7752],
    'address.city': 'Lisboa'
  }}
);
// ✅ Виправлено: 1 ліфт

// 3. RUA ALEXANDRE FERREIRA 41, 1750-011 -> Lisboa
db.lifts.updateOne(
  { 'address.street': 'RUA ALEXANDRE FERREIRA 41' },
  { $set: { 
    'location.coordinates': [-9.1620, 38.7752],
    'address.city': 'Lisboa'
  }}
);
// ✅ Виправлено: 1 ліфт
```

### Правильні координати:

| Адреса | Місто | Координати | Region |
|--------|-------|------------|--------|
| av do marginal 100, 2795-036 | Oeiras | 38.7108, -9.2494 | 🇵🇹 Lisboa District |
| RUA ALEXANDRE FERREIRA 47, 1750-010 | Lisboa | 38.7752, -9.1620 | 🇵🇹 Lisboa Centro |
| RUA ALEXANDRE FERREIRA 41, 1750-011 | Lisboa | 38.7752, -9.1620 | 🇵🇹 Lisboa Centro |

---

## 📊 Фінальна статистика

```
Всього ліфтів: 28
В Португалії: 28 ✅
Поза Португалією: 0 ✅
```

### Географічний розподіл:
- **Lisboa**: 15 ліфтів
- **Porto**: 6 ліфтів  
- **Oeiras**: 4 ліфти
- **Torres Vedras**: 1 ліфт
- **Інші**: 2 ліфти

---

## 🛡️ Запобігання в майбутньому

### Рекомендації:

1. **Додати валідацію координат** при додаванні ліфта:
   ```javascript
   // Перевірка що координати в межах Португалії
   if (lat < 37 || lat > 42 || lng < -10 || lng > -6) {
       throw new Error('Координати поза межами Португалії');
   }
   ```

2. **Покращити геокодування**:
   - Додавати країну в запит: `${address}, Portugal`
   - Використовувати португальський геокодер (моради.pt)
   - Fallback на Google Maps Geocoding API

3. **Візуальна перевірка**:
   - Показувати карту в формі додавання ліфта
   - Дозволити адміністратору коригувати маркер

4. **Регулярні перевірки**:
   ```bash
   # Щотижневий cron job
   mongosh deapseak --eval "
     db.lifts.find({
       \$or: [
         {'location.coordinates.1': {\$lt: 37}},
         {'location.coordinates.1': {\$gt: 42}}
       ]
     }).count()
   "
   ```

---

## 🔗 Пов'язані файли

- **Форма додавання**: `pages/admin/lifts.html` (функція `submitLift`)
- **API endpoint**: `unified-server.js` (`POST /api/lifts`)
- **Карта ліфтів**: `pages/admin/maps.html`

---

## ✅ Результат

Всі 28 ліфтів тепер коректно розташовані в Португалії. Карта ліфтів (`/pages/admin/maps.html`) відображає правильні локації.

**Дата виправлення:** 11.01.2026, 22:40 UTC  
**Виконано:** GitHub Copilot + Manual DB Update
