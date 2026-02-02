# 🔍 АНАЛІЗ PDF ЗВІТІВ ІНСПЕКЦІЇ - README

## 📊 ЩО ЦЕ?

Повний аналіз **2 звітів інспекції ліфтів** від Bureau Veritas + новий **спеціалізований парсер** для автоматичної обробки таких документів.

---

## ⚡ ШВИДКИЙ СТАРТ

### Для власників/адміністраторів:

**Ліфт Rua Mario Viegas, 122?**
- 🚨 **ТЕРМІНОВО!** → [ACTION-PLAN-MARIO-VIEGAS-URGENT.md](./ACTION-PLAN-MARIO-VIEGAS-URGENT.md)
- ☎️ Дзвінок FESTLIFT СЬОГОДНІ
- ⏰ Термін: 28/03/2025 (29 днів)

**Ліфт Praceta Juiz Carlos Lopes Quadros, 4?**
- ✅ Все добре → [BUREAU-VERITAS-REPORT-ANALYSIS.md](./BUREAU-VERITAS-REPORT-ANALYSIS.md)
- 📅 Наступна дія: Березень 2025

### Для розробників:

```bash
# Тест парсера
node test-bureau-veritas-parser.js ./your-report.pdf

# Інтеграція
see: PDF-PARSER-INTEGRATION-GUIDE.md
```

---

## 📚 ДОКУМЕНТАЦІЯ

| Файл | Опис | Для кого |
|------|------|----------|
| **[INDEX-PDF-ANALYSIS.md](./INDEX-PDF-ANALYSIS.md)** | Повна навігація | Всі |
| **[SUMMARY-PDF-ANALYSIS.md](./SUMMARY-PDF-ANALYSIS.md)** | Загальний огляд | Менеджери |
| **[ACTION-PLAN-MARIO-VIEGAS-URGENT.md](./ACTION-PLAN-MARIO-VIEGAS-URGENT.md)** | План на 30 днів | Власники ліфту #2 |
| **[BUREAU-VERITAS-REPORT-ANALYSIS.md](./BUREAU-VERITAS-REPORT-ANALYSIS.md)** | Аналіз звіту #1 | Власники ліфту #1 |
| **[ANALYSIS-DT2024-16084-MARIO-VIEGAS.md](./ANALYSIS-DT2024-16084-MARIO-VIEGAS.md)** | Аналіз звіту #2 | Власники ліфту #2 |
| **[COMPARISON-TWO-LIFTS.md](./COMPARISON-TWO-LIFTS.md)** | Порівняння | Аналітики |
| **[PDF-PARSER-INTEGRATION-GUIDE.md](./PDF-PARSER-INTEGRATION-GUIDE.md)** | Інтеграція | Розробники |
| **[PDF-ANALYSIS-QUICKSTART.md](./PDF-ANALYSIS-QUICKSTART.md)** | Швидкий старт | Розробники |

---

## 🎯 РЕЗУЛЬТАТИ АНАЛІЗУ

### Звіт #1: NB2023-8010-01-01 (Quinta da Alagoa)
```
✅ APROVADO
Порушень: 0
Дія: Нічого (все добре)
```

### Звіт #2: DT2024-16084-01-01 (Mario Viegas)
```
❌ REPROVADA C2
Порушень: 1 (датчик дверей)
Дія: Ремонт протягом 30 днів
Вартість: 230-520€
```

---

## 💻 КОД

**Парсер:** `services/pdf-parser-bureau-veritas.js`  
**Тести:** `test-bureau-veritas-parser.js`

**Використання:**
```javascript
const { parseBureauVeritasPDF } = require('./services/pdf-parser-bureau-veritas');
const result = await parseBureauVeritasPDF('report.pdf');
console.log('Status:', result.conclusion.status);
console.log('Violations:', result.stats.total);
```

---

## 📞 КОНТАКТИ

**Bureau Veritas:** 707 200 542  
**FESTLIFT:** Ruslan  

---

## 🚨 ТЕРМІНОВІСТЬ

**ВИСОКИЙ пріоритет:**
- Ліфт Mario Viegas, 122 - виправити до 28/03/2025

**Низький пріоритет:**
- Ліфт Quinta da Alagoa - зараз все OK

---

*Повна документація: [INDEX-PDF-ANALYSIS.md](./INDEX-PDF-ANALYSIS.md)*
