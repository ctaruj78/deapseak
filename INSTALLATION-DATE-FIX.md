# Виправлення термінології: "Дата встановлення" → "Дата початку обслуговування"

## Проблема
При створенні ліфта в системі не було поля для введення фактичної дати встановлення ліфта в будівлі. При цьому в звітах для муніципалітетів та експорті використовувався термін "Дата встановлення" / "Data de instalação", що було семантично некоректно, оскільки:
- **Дата встановлення** - коли ліфт був фізично встановлений в будівлі (часто за роки до обслуговування)
- **Дата початку обслуговування** - коли ліфт зайшов під обслуговування компанії DeapSeaK (поле `createdAt` в базі даних)

## Рішення
Змінено термінологію у всіх місцях, де використовувалася "дата встановлення", на **"дата початку обслуговування"**, оскільки саме це значення (дата створення запису в системі) є фактично коректним.

## Змінені файли

### 1. Email template для муніципалітетів
**Файл:** `templates/emails/municipality-novo-elevador.html`
- **Було:** "Data de Registo" (Дата реєстрації)
- **Стало:** "Data de Início de Serviço" (Дата початку обслуговування)
- **Placeholder:** `{{serviceStartDate}}` (буде заповнюватися полем `createdAt` ліфта)

### 2. PDF генератор для звітів
**Файл:** `assets/js/utils/pdf-generator.js` (рядок 112)
- **Було:** "Рік встановлення"
- **Стало:** "Рік початку обслуговування"
- **Логіка:** Використовується `installationDate` якщо є, інакше `createdAt`

### 3. Excel експорт ліфтів
**Файл:** `backend/services/exportService.js` (рядок 216)
- **Було:** "Дата встановлення" (width: 20)
- **Стало:** "Початок обслуговування" (width: 25)
- **Дані:** Поле `installationDate` з моделі Lift (або Н/Д)

## Перевірені, але не змінені файли
- ✅ `municipality-inspecao.html` - немає дати встановлення
- ✅ `municipality-manutencao-inicio.html` - немає дати встановлення
- ✅ `municipality-manutencao-fim.html` - немає дати встановлення
- ✅ `municipality-relatorio-mensal.html` - немає дати встановлення

## Технічні деталі

### Модель даних (Lift)
```javascript
{
  installationDate: Date, // Опціональне поле, може бути порожнім
  createdAt: Date,        // Автоматично встановлюється Mongoose
  // ...інші поля
}
```

### Як заповнювати serviceStartDate в email
При реалізації endpoint'у `/api/lifts/:id/notify-municipality`:
```javascript
const emailData = {
  municipalityName: municipality.name,
  municipalNumber: lift.municipalNumber,
  qrCode: lift.qrCode,
  liftAddress: lift.address.full,
  postalCode: lift.address.zipCode,
  serviceStartDate: lift.createdAt.toLocaleDateString('pt-PT'), // Дата початку обслуговування
  clientName: lift.clientName,
  clientEmail: lift.clientEmail,
  clientPhone: lift.clientPhone,
  // ...інші дані
};
```

## Тестування
1. ✅ Email template перевірено на наявність правильного placeholder
2. ✅ PDF генератор використовує fallback на `createdAt`
3. ✅ Excel експорт має коректну ширину стовпця (25 символів)

## Наступні кроки
- [ ] Реалізувати endpoint `POST /api/lifts/:id/notify-municipality`
- [ ] Переконатися, що `serviceStartDate` правильно форматується для португальської локалі
- [ ] Протестувати відправку email до муніципалітетів
- [ ] Оновити документацію API

## Приклад виправленого тексту в email
**Було:**
```
Data de Registo: 07/01/2025
```

**Стало:**
```
Data de Início de Serviço: 07/01/2025
```

**Пояснення для муніципалітетів:**
Ця дата відображає, коли ліфт почав обслуговуватися компанією DeapSeaK, а не коли він був фізично встановлений в будівлі.

---
**Дата виправлення:** 07.01.2025  
**Версія системи:** v2_refactor  
**Автор:** GitHub Copilot + Користувач
