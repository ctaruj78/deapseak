# 🔍 AI Система Визначення Клауз - Повний Аналіз

**Дата аналізу:** 01 січня 2026  
**Проблема:** AI неправильно розпізнає клаузи C1/C2/C3 у звітах інспекцій

---

## 📊 Поточний Стан

### Інтегровані Закони в Системі

✅ **Вже маємо:**

1. **Decreto 513/70** - Основний регламент безпеки ліфтів
   - 📍 Файл: `data/regulations/decreto-513-70.json`
   - 📌 Артикули: 14, 39, 52, 67, 78, 85, 97, 108-110
   - 🎯 Критичні статті про:
     - Захист від падіння
     - Блокування дверей
     - Гальмівні системи
     - Захист механізмів

2. **Decreto-Lei 320/2002** - Обслуговування та інспекції
   - 📍 Файл: `data/regulations/decreto-lei-320-2002.json`
   - 📌 Повна структура: 278 рядків
   - 🎯 Розділи:
     - Глава 1: Загальні положення
     - Глава 2: Обслуговування (Manutenção)
     - Глава 3: Інспекції (Inspecção)
     - Артикули 1-45 з повними текстами

3. **База даних артикулів:** `services/regulation-articles-complete.js`
   - 📍 438 рядків коду
   - 📌 43 артикули з детальними поясненнями
   - 🎯 Структура кожного:
     - `title` - назва артикулу
     - `explanation` - що це означає
     - `why` - чому це небезпечно
     - `solution` - як виправити
     - `urgency` - термін усунення
     - `risks` - конкретні ризики
     - `classification` - C1/C2/C3/INFO

4. **Decreto-Lei 295/98** - Директива про ліфти
   - 📍 Файл: `data/regulations/decreto-lei-295-98.json`
   - 🎯 Розміщення на ринку, CE маркування

5. **Decreto Regulamentar 13/80** - Технічні вимоги
   - 📍 Файл: `data/regulations/decreto-regulamentar-13-80.json`

6. **Directiva 95/16/CE** - Європейська директива
   - 📍 Файл: `data/regulations/directiva-95-16-ce.json`

---

## ❌ Проблема: Неправильне Визначення Клауз

### Приклад з реального звіту користувача

**Вхідні дані (10 рядків):**
```
C2 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.22.° 3 – Não existe escada...

C2 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.22.º 2 – O acesso à casa das máquinas...

C2 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.74º 2 – O dispositivo de fim de curso...

C3 Artigo NOTA - NOTA - Observação Geral
Porушення: Artº.85º – As peças salientes das máquinas...

❌ C2 Artigo NOTA - NOTA - Observação Geral
Porушення: Regularizar no prazo de 30 dias Caso tenham sido...

❌ C2 Artigo NOTA - NOTA - Observação Geral
Porушення: foram detetadas cláusulas tipo

❌ C3 Artigo NOTA - NOTA - Observação Geral
Porушення: foram detetadas cláusulas tipo

❌ C2 Artigo NOTA - NOTA - Observação Geral
Porушення: *: foram detectadas cláusulas tipo

❌ C2 Artigo NOTA - NOTA - Observação Geral
Porушення: *, correspondem a situações de médio risco...

❌ C2 Artigo NOTA - NOTA - Observação Geral
Porушення: , correspondem a situações de médio risco...
```

**Очікуваний результат:** 4 реальні порушення (3× C2, 1× C3)  
**Поточна система:** Розпізнає всі 10 як порушення ❌

---

## 🔍 Корінь Проблеми

### 1. **Відсутність перевірки на номер статті**

```javascript
// services/pdf-parser-enhanced.js, рядок ~320
// ❌ ПРОБЛЕМА: Немає обов'язкової перевірки номера артикулу
const articleMatch = context.match(/Art\.?(?:igo)?\.?º?\s*(\d+[a-z]?\.?\d*\.?\d*)/i);
let articleNum = articleMatch ? articleMatch[1] : null;

// Якщо немає артикулу - додається як "NOTA"
if (!articleNum || articleNum === '0' || articleNum === null) {
    finalArticleNum = 'NOTA';
    isNota = true;
}
```

**Наслідок:** Службові тексти без номерів статей розпізнаються як порушення!

---

### 2. **Недостатня фільтрація шуму**

```javascript
// services/pdf-parser-enhanced.js, рядок ~380
const excludePatterns = [
    /^\d+[-\/]\d+[-\/]\d+$/,
    /^[\d\s.:-]+$/,
    /^[A-Z\s]{2,15}$/,
    /^(SIM|NÃO|OK|N\/A|APROVADO|REPROVADO)$/i,
    /NOTA\s+DE\s+CLÁUSULAS/i,
    /CLÁUSULAS?\s+DE\s+CUMPRIMENTO/i,
    /Correspondente\s+a\s+situações/i,
    /cuja\s+resolução\s+deve\s+ser/i,
    /Página\s*\d+/i,
    /Impresso\s+ELEV/i,
    /TÉCNICO\s+RESPONSÁVEL/i
];
```

**Пропущено:**
- ❌ "foram detetadas cláusulas tipo"
- ❌ "Regularizar no prazo de"
- ❌ "Elevador Reprovado:"
- ❌ "correspondem a situações"
- ❌ "estas cláusulas"

---

### 3. **Немає валідації структури порушення**

**Правильна структура порушення має містити:**
1. ✅ Класифікація: C1, C2 або C3
2. ✅ Номер статті: Art. 22, Art. 74, Art. 85
3. ✅ Опис проблеми: конкретний технічний опис
4. ✅ Мінімальна довжина: 20+ символів реального тексту

**Службовий текст:**
- ❌ Немає номера статті
- ❌ Загальні фрази ("foram detetadas")
- ❌ Пояснювальний текст ("correspondem a")

---

## ✅ Рішення

### 1. **Строга перевірка номера статті**

```javascript
// ОБОВ'ЯЗКОВО: Порушення БЕЗ номера статті = НЕ ПОРУШЕННЯ!
if (!articleNum || articleNum === '0' || articleNum === null) {
    console.log(`  ❌ Відхилено (немає артикулу): ${description.substring(0, 60)}...`);
    return; // НЕ ДОДАВАТИ до violations
}
```

---

### 2. **Розширена фільтрація службових текстів**

```javascript
const serviceTextPatterns = [
    // Фрази про виявлення клауз
    /foram\s+dete[tc]tadas\s+cl[áa]usulas/i,
    /foram\s+dete[tc]tadas\s+cl[áa]usulas\s+tipo/i,
    /detectadas\s+cl[áa]usulas/i,
    
    // Терміни та інструкції
    /regularizar\s+no\s+prazo/i,
    /prazo\s+(?:de|m[áa]ximo)/i,
    /no\s+prazo\s+de\s+\d+\s+dias/i,
    
    // Описи класифікацій
    /correspondem\s+a\s+situa[çc][õo]es/i,
    /situa[çc][õo]es\s+de\s+(?:elevado|m[ée]dio|baixo)\s+risco/i,
    /estas\s+cl[áa]usulas/i,
    /as\s+cl[áa]usulas/i,
    
    // Результати інспекції
    /elevador\s+reprovado/i,
    /elevador\s+aprovado/i,
    /resultado\s+da\s+inspe[çc][ãa]o/i,
    /relat[óo]rio\s+de\s+inspe[çc][ãa]o/i,
    
    // Юридичні посилання
    /decreto[-\s]lei\s+n[º.]\s*\d+/i,
    /despacho\s+n[º.]\s*\d+/i,
    /conforme\s+(?:decreto|despacho)/i,
    
    // Інструкції інспектора
    /caso\s+tenham\s+sido/i,
    /devem\s+ser\s+(?:corrigidas|executadas)/i,
    /obrigam\s+[àa]\s+imobiliza[çc][ãa]o/i,
    /n[ãa]o\s+obrigam\s+[àa]/i,
    
    // Технічні примітки загального характеру
    /^observa[çc][ãa]o\s+geral/i,
    /^nota\s*:?\s*$/i,
    /^remo[çc][ãa]o\s+destas/i
];

const isServiceText = serviceTextPatterns.some(pattern => pattern.test(description));
if (isServiceText) {
    console.log(`  ❌ Відхилено (службовий текст): ${description.substring(0, 60)}...`);
    return;
}
```

---

### 3. **Валідація структури порушення**

```javascript
function isValidViolation(classification, articleNum, description) {
    // 1. Перевірка класифікації
    if (!/^C[123]$/.test(classification)) {
        return { valid: false, reason: 'Невалідна класифікація' };
    }
    
    // 2. Перевірка номера статті (ОБОВ'ЯЗКОВО!)
    if (!articleNum || articleNum === 'NOTA' || articleNum === '0') {
        return { valid: false, reason: 'Відсутній номер артикулу' };
    }
    
    // 3. Перевірка довжини опису
    const cleanDesc = description.replace(/\s+/g, ' ').trim();
    if (cleanDesc.length < 20) {
        return { valid: false, reason: 'Опис занадто короткий' };
    }
    
    // 4. Перевірка на технічний зміст
    // Має містити дієслова дії або технічні терміни
    const hasTechnicalContent = /(?:não\s+existe|não\s+cumpre|não\s+(?:é|está)|deficiente|inadequado|ausente|danificado|insuficient|falta)/i.test(cleanDesc);
    
    if (!hasTechnicalContent) {
        return { valid: false, reason: 'Відсутній технічний зміст' };
    }
    
    // 5. Перевірка на службові фрази
    const hasServicePhrase = /(?:foram\s+detetadas|regularizar|correspondem|estas\s+cláusulas|prazo)/i.test(cleanDesc);
    
    if (hasServicePhrase) {
        return { valid: false, reason: 'Містить службові фрази' };
    }
    
    return { valid: true };
}
```

---

### 4. **Покращена логіка створення порушень**

```javascript
function createViolation(classification, articleNum, description, format) {
    // Валідація ПЕРЕД створенням
    const validation = isValidViolation(classification, articleNum, description);
    
    if (!validation.valid) {
        console.log(`  ❌ Порушення відхилено: ${validation.reason}`);
        console.log(`     C:${classification} A:${articleNum} D:${description.substring(0, 50)}...`);
        return null; // НЕ створювати об'єкт
    }
    
    // Отримуємо інформацію з бази даних
    const article = regulationArticles[articleNum] || {
        title: `Artigo ${articleNum}`,
        explanation: 'Consultar regulamento para detalhes',
        why: 'Não especificado',
        solution: 'Verificar conformidade',
        urgency: 'Depende da classificação',
        risks: 'Consultar regulamento'
    };
    
    // Повертаємо валідне порушення
    return {
        classification: classification.toUpperCase(),
        article: `Art. ${articleNum}`,
        articleNumber: articleNum,
        description: description.trim(),
        severity: classificationInfo[classification.toUpperCase()],
        regulation: article,
        detectionFormat: format,
        timestamp: new Date().toISOString()
    };
}
```

---

## 📚 Закони, які ПОТРІБНО ДОДАТИ

### ❌ Не інтегровані, але критично важливі:

#### 1. **Portaria 344/93** - Норми інспекцій
- 📋 **Що регулює:** Процедури періодичних інспекцій
- 🎯 **Чому важливо:** Визначає ЯК проводити інспекції, що перевіряти
- 📍 **Файл створити:** `data/regulations/portaria-344-93.json`
- 🔍 **Використання:** Перелік пунктів перевірки для інспекторів

#### 2. **Despacho 17/2022/DG** - Терміни усунення
- 📋 **Що регулює:** Нові терміни для виправлення C2 (2 роки замість 30 днів)
- 🎯 **Чому важливо:** АКТУАЛЬНІ терміни! Старі дані застарілі
- 📍 **Файл створити:** `data/regulations/despacho-17-2022.json`
- 🔍 **Критично:** C2 тепер = 2 роки, не 30 днів!

#### 3. **EN 81-20:2020** - Європейський стандарт
- 📋 **Що регулює:** Технічні вимоги до безпеки ліфтів (заміна EN 81-1/2)
- 🎯 **Чому важливо:** Нові ліфти мають відповідати EN 81-20
- 📍 **Файл створити:** `data/regulations/en-81-20.json`
- 🔍 **Використання:** Посилання на конкретні пункти стандарту

#### 4. **EN 81-50:2020** - Безпека монтажу
- 📋 **Що регулює:** Вимоги до обстеження та тестування
- 🎯 **Чому важливо:** Процедури перевірки безпеки
- 📍 **Файл створити:** `data/regulations/en-81-50.json`

#### 5. **Decreto-Lei 163/2006** - Сертифікація техніків
- 📋 **Що регулює:** Кваліфікація інспекторів і технічного персоналу
- 🎯 **Чому важливо:** Хто може проводити інспекції
- 📍 **Файл створити:** `data/regulations/decreto-lei-163-2006.json`

#### 6. **Lei 58/2013** - Безпека обладнання
- 📋 **Що регулює:** Загальна безпека обладнання під тиском і підйомного
- 🎯 **Чому важливо:** Загальні принципи відповідальності
- 📍 **Файл створити:** `data/regulations/lei-58-2013.json`

#### 7. **Regulamento CE 765/2008** - Акредитація
- 📋 **Що регулює:** Акредитація інспекційних органів
- 🎯 **Чому важливо:** Легітимність інспекційних компаній
- 📍 **Файл створити:** `data/regulations/regulamento-ce-765-2008.json`

---

## 🎯 План Впровадження

### Етап 1: Виправлення логіки розпізнавання (НЕГАЙНО) ⚡

**Файли для редагування:**
1. `services/pdf-parser-enhanced.js`
   - Додати `isValidViolation()`
   - Додати `serviceTextPatterns`
   - Оновити `createViolation()` з валідацією
   - Додати обов'язкову перевірку номера статті

**Тестування:**
```bash
node test-clause-detection-real.js
# Має показати: 4 порушення (3× C2, 1× C3)
```

**Критерії успіху:**
- ✅ Розпізнає тільки 4 реальні порушення
- ✅ Відхиляє 6 службових текстів
- ✅ Кожне порушення має валідний номер статті
- ✅ Немає помилкових спрацювань

---

### Етап 2: Інтеграція нових законів (1-2 тижні) 📚

**Пріоритет HIGH:**
1. **Despacho 17/2022/DG** - терміни усунення
   - Оновити `classificationInfo` в `pdf-parser-enhanced.js`
   - C2: deadline змінити з "30 dias" на "2 anos"

2. **Portaria 344/93** - норми інспекцій
   - Створити JSON з переліком пунктів перевірки
   - Додати до `regulation-articles-complete.js`

**Пріоритет MEDIUM:**
3. **EN 81-20:2020** - технічні стандарти
4. **Decreto-Lei 163/2006** - сертифікація

**Пріоритет LOW:**
5. **Lei 58/2013**, **Regulamento CE 765/2008**

---

### Етап 3: AI навчання (поточне) 🤖

**Покращення AI асистента:**

1. **Розширення бази знань:**
   - Додати всі 7 нових законів до AI контексту
   - Оновити `data/portugal-lift-regulations.json`

2. **Покращення промптів:**
   ```javascript
   // backend/services/ai-regulations-context.js
   const regulationsContext = `
   Ви - експерт з португальського законодавства про ліфти.
   
   ВАЖЛИВО: Розрізняйте ПОРУШЕННЯ та СЛУЖБОВІ ТЕКСТИ!
   
   ПОРУШЕННЯ має містити:
   1. Класифікацію: C1, C2 або C3
   2. Номер статті: Art. 22, Art. 74, тощо
   3. Конкретний опис проблеми
   
   НЕ є порушеннями:
   - Загальні пояснення ("foram detetadas cláusulas")
   - Інструкції ("regularizar no prazo")
   - Юридичні посилання
   - Результати інспекції загалом
   `;
   ```

3. **Додати приклади:**
   ```javascript
   const trainingExamples = [
       {
           text: "C2 Artº.22.° 3 – Não existe escada...",
           isViolation: true,
           reason: "Має класифікацію + номер статті + опис"
       },
       {
           text: "C2 foram detetadas cláusulas tipo",
           isViolation: false,
           reason: "Немає номера статті, службовий текст"
       }
   ];
   ```

---

## 📊 Метрики успіху

### Перед виправленням:
- ❌ 10/10 розпізнано як порушення (100% FP rate)
- ❌ 6 помилкових спрацювань
- ❌ 0% точність на службових текстах

### Після виправлення (очікується):
- ✅ 4/4 реальні порушення розпізнані (100% TP rate)
- ✅ 6/6 службових текстів відфільтровані (100% TN rate)
- ✅ 0 помилкових спрацювань (0% FP rate)
- ✅ **Точність: 100%**

---

## 🔧 Код для впровадження

### Новий файл: `services/clause-validator.js`

```javascript
/**
 * ВАЛІДАТОР КЛАУЗ - Відокремлює реальні порушення від службових текстів
 */

const serviceTextPatterns = [
    /foram\s+dete[tc]tadas\s+cl[áa]usulas/i,
    /regularizar\s+no\s+prazo/i,
    /correspondem\s+a\s+situa[çc][õo]es/i,
    /elevador\s+reprovado/i,
    /estas\s+cl[áa]usulas/i,
    /decreto[-\s]lei\s+n[º.]\s*\d+/i,
    /caso\s+tenham\s+sido/i,
    /devem\s+ser\s+(?:corrigidas|executadas)/i,
    /obrigam\s+[àa]\s+imobiliza[çc][ãa]o/i,
    /^observa[çc][ãa]o\s+geral/i
];

function isValidViolation(classification, articleNum, description) {
    // 1. Класифікація
    if (!/^C[123]$/i.test(classification)) {
        return { valid: false, reason: 'Невалідна класифікація' };
    }
    
    // 2. Номер статті (ОБОВ'ЯЗКОВО!)
    if (!articleNum || articleNum === 'NOTA' || articleNum === '0') {
        return { valid: false, reason: 'Відсутній номер артикулу' };
    }
    
    // 3. Довжина
    const cleanDesc = description.replace(/\s+/g, ' ').trim();
    if (cleanDesc.length < 20) {
        return { valid: false, reason: 'Опис занадто короткий' };
    }
    
    // 4. Технічний зміст
    const hasTechnicalContent = /(?:não\s+existe|não\s+cumpre|não\s+(?:é|está)|deficient|inadequado|ausent|danificado|insuficient|falta)/i.test(cleanDesc);
    if (!hasTechnicalContent) {
        return { valid: false, reason: 'Відсутній технічний зміст' };
    }
    
    // 5. Службові фрази
    const hasServiceText = serviceTextPatterns.some(p => p.test(cleanDesc));
    if (hasServiceText) {
        return { valid: false, reason: 'Службовий текст' };
    }
    
    return { valid: true };
}

module.exports = {
    isValidViolation,
    serviceTextPatterns
};
```

---

## 📝 Висновки

### Корінь проблеми:
1. ❌ Немає обов'язкової перевірки номера статті
2. ❌ Недостатня фільтрація службових текстів
3. ❌ Відсутня валідація структури порушення

### Рішення:
1. ✅ Строга валідація: тільки порушення з номером статті
2. ✅ Розширений фільтр службових фраз (25+ патернів)
3. ✅ Перевірка технічного змісту опису
4. ✅ Окремий модуль валідації (`clause-validator.js`)

### Закони для інтеграції:
1. **Despacho 17/2022/DG** - КРИТИЧНО (терміни усунення)
2. **Portaria 344/93** - HIGH (норми інспекцій)
3. **EN 81-20:2020** - MEDIUM (технічні стандарти)
4. 4 додаткові регламенти - LOW priority

### Наступні кроки:
1. ⚡ Впровадити валідацію клауз (сьогодні)
2. 📚 Інтегрувати Despacho 17/2022 (цей тиждень)
3. 🤖 Оновити AI промпти з новими правилами
4. 🧪 Тестування на реальних звітах

---

**Автор аналізу:** GitHub Copilot  
**Статус:** Готово до впровадження ✅
