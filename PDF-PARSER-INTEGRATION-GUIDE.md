# 🔧 ІНТЕГРАЦІЯ ПОКРАЩЕНОГО PDF ПАРСЕРА

## 📋 КОРОТКИЙ ПІДСУМОК

Створено **спеціалізований парсер для звітів Bureau Veritas**, який правильно обробляє португальські інспекційні звіти.

---

## 🆕 ЩО СТВОРЕНО

### 1. Новий парсер
**Файл:** `/services/pdf-parser-bureau-veritas.js`

**Особливості:**
- ✅ Розпізнає формат Bureau Veritas (NB2023-XXXX-XX-XX)
- ✅ Фільтрує секцію "NOTA DE CLÁUSULAS" (не плутає з порушеннями)
- ✅ Правильно витягує метадані з таблиць
- ✅ Підтримує португальські адреси
- ✅ Розпізнає статуси: Aprovado, Reprovado, Aprovado com C3/C2*

### 2. Документація
**Файл:** `/BUREAU-VERITAS-REPORT-ANALYSIS.md`

Містить:
- Детальний аналіз вашого звіту
- Пояснення чому виникла помилка
- Правильну інтерпретацію результатів

---

## 🚀 ЯК ВИКОРИСТОВУВАТИ

### Node.js / Backend

```javascript
const { parseBureauVeritasPDF } = require('./services/pdf-parser-bureau-veritas');

// Парсинг PDF файлу
const result = await parseBureauVeritasPDF('uploads/report.pdf');

if (result.success) {
    console.log('Status:', result.conclusion.status);
    console.log('Approved:', result.passed);
    console.log('Total violations:', result.stats.total);
    console.log('C1:', result.stats.critical);
    console.log('C2:', result.stats.medium);
    console.log('C3:', result.stats.low);
    
    // Метадані
    console.log('Report No:', result.metadata.reportNumber);
    console.log('Date:', result.metadata.date);
    console.log('Lift ID:', result.metadata.liftId);
    console.log('Location:', result.metadata.location);
    
    // Порушення
    result.violations.forEach(v => {
        console.log(`${v.classification} - Art ${v.article}: ${v.description}`);
    });
} else {
    console.error('Error:', result.error);
}
```

---

## 🔄 ІНТЕГРАЦІЯ З ІСНУЮЧИМ КОДОМ

### Варіант 1: Автоматичне визначення типу

Створити **universal PDF parser** який автоматично визначає формат:

```javascript
// services/pdf-parser-universal.js
const { parseBureauVeritasPDF } = require('./pdf-parser-bureau-veritas');
const { parsePDF } = require('./pdf-parser-enhanced');

async function parseInspectionReport(filePath) {
    // Читаємо перші 1000 символів для визначення типу
    const fs = require('fs');
    const pdfParse = require('pdf-parse');
    
    const buffer = fs.readFileSync(filePath);
    const partialPDF = await pdfParse(buffer, { max: 1 });
    const text = partialPDF.text;
    
    // Визначаємо тип звіту
    if (text.includes('BUREAU VERITAS') || /NB\d{4}-\d{4}/.test(text)) {
        console.log('📋 Detected: Bureau Veritas report');
        return await parseBureauVeritasPDF(filePath);
    } else {
        console.log('📋 Using: Generic parser');
        return await parsePDF(filePath);
    }
}

module.exports = { parseInspectionReport };
```

### Варіант 2: Прямий виклик

У місці завантаження PDF (наприклад, `unified-server.js` або frontend):

```javascript
// В API endpoint для завантаження звітів
app.post('/api/lifts/:id/inspection-report', upload.single('pdf'), async (req, res) => {
    try {
        const filePath = req.file.path;
        
        // Використовуємо новий парсер
        const { parseBureauVeritasPDF } = require('./services/pdf-parser-bureau-veritas');
        const result = await parseBureauVeritasPDF(filePath);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        
        // Зберігаємо результати в БД
        const inspection = {
            liftId: req.params.id,
            reportNumber: result.metadata.reportNumber,
            date: result.metadata.date,
            inspector: result.metadata.inspector,
            passed: result.passed,
            status: result.conclusion.status,
            violations: result.violations,
            stats: result.stats,
            pdfFile: req.file.filename
        };
        
        // Збереження в MongoDB
        await db.collection('inspections').insertOne(inspection);
        
        res.json({
            success: true,
            inspection,
            analysis: result
        });
        
    } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).json({ error: error.message });
    }
});
```

---

## 📊 ФОРМАТ ВІДПОВІДІ

```javascript
{
    success: true,
    reportType: 'bureau_veritas',
    
    // Метадані
    metadata: {
        reportNumber: 'NB2023-8010-01-01',
        date: '2023/05/22',
        liftId: '371-11.05/000030',
        location: 'PRACETA JUIZ CARLOS LOPES QUADROS, 4...',
        inspector: 'Fernando Emidio',
        company: 'BUREAU VERITAS RINAVE',
        owner: 'ADMINISTRAÇÃO DO EDIFÍCIO',
        maintenanceCompany: 'FESTLIFT',
        installationNumber: '371-11.05/000030',
        processNumber: '371-11.05/000030'
    },
    
    // Порушення
    violations: [
        {
            classification: 'C2',  // C1, C2, C3
            article: '45',         // Номер артикулу
            description: '...',    // Опис порушення
            articleInfo: {         // Інформація з бази даних
                title: 'Artigo 45º...',
                explanation: '...',
                why: '...',
                solution: '...',
                urgency: 'MODERADO'
            },
            classificationInfo: {  // Інформація про класифікацію
                level: 'MODERADO',
                description: '...',
                deadline: '30 dias',
                legalConsequence: '...'
            },
            detailedExplanation: '...' // Повне пояснення
        }
    ],
    
    // Статистика
    stats: {
        total: 0,
        critical: 0,  // C1
        medium: 0,    // C2
        low: 0,       // C3
        byArticle: {} // Групування по артикулах
    },
    
    // Висновок
    conclusion: {
        approved: true,
        status: 'APROVADO',
        reason: 'Elevador em conformidade...',
        text: 'APROVADO: Elevador em conformidade...'
    },
    
    summary: {
        total: 0,
        critical: 0,
        medium: 0,
        low: 0
    },
    
    passed: true,
    rawText: '...', // Повний текст PDF
    pageCount: 2
}
```

---

## 🎨 ІНТЕГРАЦІЯ З FRONTEND

### Відображення результатів

```javascript
// pages/admin/lifts.html або inspection.html

async function uploadInspectionReport(liftId, pdfFile) {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    
    try {
        const response = await fetch(`/api/lifts/${liftId}/inspection-report`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayInspectionResults(result.analysis);
        }
        
    } catch (error) {
        console.error('Upload failed:', error);
    }
}

function displayInspectionResults(analysis) {
    const container = document.getElementById('inspectionResults');
    
    // Статус
    const statusIcon = analysis.passed ? '✅' : '❌';
    const statusClass = analysis.passed ? 'success' : 'danger';
    const statusText = analysis.conclusion.status;
    
    let html = `
        <div class="alert alert-${statusClass}">
            <h3>${statusIcon} ${statusText}</h3>
            <p>${analysis.conclusion.reason}</p>
        </div>
    `;
    
    // Статистика
    html += `
        <div class="stats-row">
            <div class="stat-box critical">
                <h4>C1 - Критичні</h4>
                <div class="number">${analysis.stats.critical}</div>
            </div>
            <div class="stat-box medium">
                <h4>C2 - Середні</h4>
                <div class="number">${analysis.stats.medium}</div>
            </div>
            <div class="stat-box low">
                <h4>C3 - Легкі</h4>
                <div class="number">${analysis.stats.low}</div>
            </div>
        </div>
    `;
    
    // Список порушень
    if (analysis.violations.length > 0) {
        html += '<h3>📋 Виявлені порушення:</h3><div class="violations-list">';
        
        analysis.violations.forEach(v => {
            const badgeClass = {
                'C1': 'danger',
                'C2': 'warning',
                'C3': 'info'
            }[v.classification];
            
            html += `
                <div class="violation-card ${badgeClass}">
                    <span class="badge badge-${badgeClass}">${v.classification}</span>
                    <strong>Art. ${v.article}</strong>
                    <p>${v.description}</p>
                    <details>
                        <summary>Детальна інформація</summary>
                        <pre>${v.detailedExplanation}</pre>
                    </details>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    // Метадані
    html += `
        <div class="metadata">
            <h3>ℹ️ Інформація про звіт</h3>
            <table class="table">
                <tr><td>Номер звіту:</td><td>${analysis.metadata.reportNumber || 'N/A'}</td></tr>
                <tr><td>Дата:</td><td>${analysis.metadata.date || 'N/A'}</td></tr>
                <tr><td>Інспектор:</td><td>${analysis.metadata.inspector || 'N/A'}</td></tr>
                <tr><td>Локація:</td><td>${analysis.metadata.location || 'N/A'}</td></tr>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}
```

---

## 🧪 ТЕСТУВАННЯ

### Тест 1: Ваш звіт (APROVADO)

```bash
node -e "
const { parseBureauVeritasPDF } = require('./services/pdf-parser-bureau-veritas');
(async () => {
    const result = await parseBureauVeritasPDF('./uploads/your-report.pdf');
    console.log('Status:', result.conclusion.status);
    console.log('Passed:', result.passed);
    console.log('Violations:', result.stats.total);
})();
"
```

Очікуваний результат:
```
Status: APROVADO
Passed: true
Violations: 0
```

### Тест 2: Звіт з порушеннями

Якщо маєте звіт з реальними порушеннями, перевірте:
```
Status: REPROVADO
Passed: false
Violations: > 0
```

---

## 📝 НАСТУПНІ КРОКИ

### 1. Інтеграція в unified-server.js
- [ ] Додати endpoint `/api/parse-inspection-pdf`
- [ ] Підключити multer для завантаження файлів
- [ ] Інтегрувати новий парсер

### 2. Оновлення Frontend
- [ ] Додати кнопку "Аналізувати звіт" в `lifts.html`
- [ ] Створити красивий UI для відображення результатів
- [ ] Додати індикатори C1/C2/C3

### 3. База даних
- [ ] Додати поле `inspectionAnalysis` в колекцію `lifts`
- [ ] Зберігати історію інспекцій
- [ ] Створити індекси для пошуку

### 4. Нотифікації
- [ ] Email при виявленні C1/C2
- [ ] Нагадування про терміни виправлення
- [ ] Алерти перед закінченням сертифікату

---

## 💡 ПОРАДИ

1. **Завжди зберігайте оригінальний PDF** - парсер може помилятися
2. **Перевіряйте результати вручну** перші 5-10 звітів
3. **Збирайте статистику** - які формати парсяться добре, які ні
4. **Надавайте фідбек** - дозволяйте користувачам виправляти помилки

---

## 🆘 TROUBLESHOOTING

### Проблема: Парсер знаходить багато NOTA

**Рішення:** Використовуйте `pdf-parser-bureau-veritas.js` замість `pdf-parser-enhanced.js`

### Проблема: Не витягується локація

**Рішення:** Bureau Veritas має таблицю - перевірте що PDF містить текстовий шар (не скан)

### Проблема: Помилкові порушення

**Рішення:** Перевірте функцію `isExplanationText()` - можливо потрібно додати нові фрази-фільтри

---

*Документ створено: 21 січня 2026*  
*Версія: 1.0*  
*Система: DeapSeaK v2.0*
