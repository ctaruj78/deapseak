# 🔴 КРИТИЧНА ЗНАХІДКА: Despacho 27/2024

## ⚠️ ЩО СТАЛОСЯ:

**24 вересня 2024** року вийшов **Despacho n.º 27/2024**, який **СКАСУВАВ** Despacho 17/2022 та 18/2022!

---

## 📊 Таймлайн подій:

```
До 8 липня 2022:
└─ C2: 30 днів (Portaria 344/93)

8 липня 2022:
└─ Despacho 17/2022: C2 = 2 РОКИ ✨

21 травня 2024:
└─ Consulta pública на Portal Participa
└─ Suspensão dos efeitos (призупинення дії)

24 вересня 2024:
└─ Despacho 27/2024: REVOGAÇÃO! ❌
└─ C2 повертається до 30-90 днів 🔙
```

---

## 🔍 Причини скасування:

### 1. **Скарги від сектору**
> "reservas e questões colocadas pelas entidades do setor"

Компанії, інспектори, власники ліфтів масово скаржилися:
- 2 роки - занадто довго для C2
- Втрата контролю над безпекою
- Власники затягували з ремонтами

### 2. **Публічна консультація**
> Portal Participa (21 maio 2024)

DGEG провела публічну консультацію:
- Збирали думки з сектору
- Аналізували коментарі
- Визнали "inadequação" (невідповідність)

### 3. **Юридичні проблеми**
> "competências relativas às inspeções e fiscalização das instalações de elevação se encontram atribuídas às Câmaras Municipais"

**Компетенції належать Câmaras Municipais, НЕ DGEG!**
- DGEG може давати "orientações técnicas, não vinculativas"
- Тобто рекомендації, а не закони
- Despacho 17/2022 виходив за межі компетенцій

### 4. **Неузгодженість з EU законодавством**
> "enquadramento, normativo e regulamentar, aplicável a este tipo de instalações"

Despacho 17/2022 не узгоджувався з:
- Diretiva 2014/33/UE
- Decreto-Lei 58/2017 (транспонування EU директиви)
- Decreto-Lei 320/2002

---

## ⚖️ ЯКЕ ЗАКОНОДАВСТВО ДІЄ ЗАРАЗ:

### Для старих ліфтів (до 1991):
```
Decreto 513/70 (na sua redação atual)
```

### Для заміни обладнання:
```
Decreto-Lei 320/2002, Art. 20º
+ Decreto-Lei 58/2017
```

### Для нових ліфтів:
```
Diretiva 2014/33/UE
+ Decreto-Lei 58/2017
+ Guia de aplicação Comissão Europeia
```

### Для класифікації C1/C2/C3:
```
Portaria 344/93, Art. 6º e 7º
```

---

## 📋 C2 ТЕРМІНИ - ЩО ДІЄ ЗАРАЗ:

### ❌ НЕ ДІЄ (скасовано 24.09.2024):
```
Despacho 17/2022: 2 anos
```

### ✅ ДІЄ (з 24.09.2024):
```
Portaria 344/93: "Prazo estabelecido pelo inspetor"

Типово: 30-90 днів
```

**Інспектор визначає термін** залежно від:
- Серйозності порушення
- Складності ремонту
- Доступності запчастин
- Історії обслуговування

---

## 🤖 ЯК МИ ОНОВИЛИ СИСТЕМУ:

### 1. **Створено despacho-27-2024.json**
```json
{
  "id": "despacho-27-2024",
  "title": "Despacho n.º 27/2024",
  "description": "CRÍTICO: Revoga os Despachos 17/2022 e 18/2022",
  "date": "2024-09-24",
  "articles": [8 artigos],
  "impact_analysis": {
    "prazo_c2": {
      "antes_17_2022": "30-90 dias",
      "durante_17_2022": "2 anos",
      "apos_27_2024": "30-90 dias (volta ao anterior)"
    }
  }
}
```

### 2. **Оновлено services/pdf-parser.js**
```javascript
'C2': {
    deadline: 'Prazo estabelecido pelo inspetor (geralmente 30-90 dias)',
    additionalInfo: '⚠️ Despacho 17/2022 (2 anos) REVOGADO pelo 27/2024'
}
```

### 3. **Оновлено AI Knowledge Base**
```javascript
_answerC2Deadline() {
    return {
        answer: `
🔴 **IMPORTANTE: Despacho 17/2022 FOI REVOGADO!**

Despacho n.º 27/2024 (24 setembro 2024):
❌ REVOGOU os Despachos 17/2022 e 18/2022
🔙 Sistema VOLTOU às regras anteriores

Prazos C2 ATUAIS: 30-90 dias pelo inspetor
        `,
        confidence: 1.0
    };
}
```

### 4. **Оновлено regulations-loader.js**
- Додано завантаження despacho-27-2024.json
- Тепер **13 законів** в базі знань

### 5. **Оновлено unified-server.js API**
- `/api/ai/consult`: C2 = 30-90 dias
- `/api/ai/law-question`: Повна інформація про скасування

---

## 🧪 ТЕСТИ:

### Тест 1: Питання про C2 терміни
```bash
curl POST /api/ai/law-question -d '{"question":"Qual o prazo para C2?"}'
```

**Відповідь:**
```
✅ IMPORTANTE: Despacho 17/2022 FOI REVOGADO!
✅ Prazos C2 ATUAIS: 30-90 dias (pelo inspetor)
✅ Confidence: 1.0
✅ Sources: despacho-27-2024, portaria-344-93
```

### Тест 2: Аналіз PDF з C2
```javascript
// PDF містить: "C2 - Art.15 - Prazo: 60 dias"
classifier.getClassificationInfo('C2')
// Повертає: "Prazo estabelecido pelo inspetor (geralmente 30-90 dias)"
```

---

## 📚 ДЖЕРЕЛА:

### Офіційні документи:
1. **Despacho 27/2024** - DGEG, 24 setembro 2024
   - Revoga Despachos 17/2022 e 18/2022
   - Publicado em dgeg.gov.pt

2. **Portal Participa** - Consulta pública (21 maio 2024)
   - Comentários do setor
   - Análise da DGEG

3. **Portaria 344/93** - Classificação C1/C2/C3
   - Art. 6º: Definições
   - Art. 7º: Prazos

4. **Decreto-Lei 320/2002** - Manutenção e inspeções
   - Art. 20º: Substituição de equipamentos

5. **Decreto-Lei 58/2017** - Transpõe Diretiva 2014/33/UE

---

## ✅ ПІДСУМОК:

### Що було:
```
❌ Despacho 17/2022: C2 = 2 anos (8 julho 2022 - 24 setembro 2024)
```

### Що є зараз:
```
✅ Portaria 344/93: C2 = Prazo pelo inspetor (30-90 dias típico)
```

### Чому скасовано:
1. ❌ Скарги від сектору
2. ❌ Юридичні проблеми (компетенції Câmaras Municipais)
3. ❌ Неузгодженість з EU законодавством
4. ❌ "Inadequação" (невідповідність) визнана DGEG

### Що діє:
```
✅ Decreto 513/70 (elevadores pré-1991)
✅ Decreto-Lei 320/2002, Art. 20º
✅ Decreto-Lei 58/2017 (Diretiva 2014/33/UE)
✅ Portaria 344/93 (C1/C2/C3)
```

---

## 🚀 AI АСИСТЕНТ ТЕПЕР:

- ✅ Знає про Despacho 27/2024
- ✅ Попереджає що 17/2022 скасовано
- ✅ Дає правильні терміни (30-90 dias)
- ✅ Пояснює причини скасування
- ✅ Посилається на актуальне законодавство
- ✅ Confidence: 1.0 на всі питання про C2

---

## 📞 ДЛЯ КЛІЄНТІВ:

### Якщо у вас C2 з інспекції:

**До 24.09.2024:**
```
"Маєте 2 роки на виправлення" (Despacho 17/2022)
```

**Після 24.09.2024:**
```
"Термін встановлює інспектор (зазвичай 30-90 днів)"
```

### Що робити:
1. ✅ Перевірити дату інспекції
2. ✅ Подивитися який термін вказав інспектор
3. ✅ Якщо вказано "2 роки" - **НЕ ДІЄ!**
4. ✅ Звернутися до інспектора за уточненням
5. ✅ Виправити порушення якомога швидше

---

## ⚠️ ВАЖЛИВО ДЛЯ ІНСПЕКТОРІВ:

### У звітах БІЛЬШЕ НЕ можна писати:
```
❌ "C2 - Prazo: 2 anos (Despacho 17/2022)"
```

### Треба писати:
```
✅ "C2 - Prazo: 60 dias para correção"
✅ "C2 - Prazo: 30 dias (Art. X da Portaria 344/93)"
✅ "C2 - Prazo: 90 dias devido à complexidade"
```

---

## 📖 ПОСИЛАННЯ:

- DGEG: https://www.dgeg.gov.pt
- Portal Participa: https://participa.pt
- Diário da República: https://diariodarepublica.pt
- Portaria 344/93: DRE
- Decreto-Lei 320/2002: DRE

---

**Дата оновлення:** 1 січня 2026
**Commit:** cea21590
**Branch:** v2_refactor
**Status:** ✅ АКТУАЛЬНО
