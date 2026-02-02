/**
 * =====================================================
 * СПЕЦІАЛІЗОВАНИЙ ПАРСЕР ДЛЯ ПОРТУГАЛЬСЬКИХ ЗВІТІВ ІНСПЕКЦІЇ
 * =====================================================
 * 
 * Підтримує:
 * ✅ Bureau Veritas Rinave (формат NB/DT-XXXX)
 * ✅ CML Lisboa (Câmara Municipal de Lisboa)
 * ✅ Інші португальські інспекційні органи
 * 
 * ОСОБЛИВОСТІ:
 * ✅ Розпізнає різні формати звітів
 * ✅ Правильно обробляє "NOTA DE CLÁUSULAS"
 * ✅ Не плутає пояснення класифікацій з порушеннями
 * ✅ Витягує інформацію з таблиць
 * ✅ Підтримує португальські адреси та символи
 */

const fs = require('fs');
const pdfParse = require('pdf-parse');

// Імпортуємо базу даних артикулів
const regulationArticles = require('./regulation-articles-complete');

/**
 * ВИТЯГУВАННЯ МЕТАДАНИХ - УНІВЕРСАЛЬНИЙ
 */
function extractMetadata(text) {
    const metadata = {
        reportNumber: null,
        date: null,
        liftId: null,
        location: null,
        inspector: null,
        company: null,
        owner: null,
        maintenanceCompany: null,
        installationNumber: null,
        processNumber: null
    };
    
    console.log('\n🔍 Extracting Metadata...');
    
    // Визначаємо тип звіту
    if (text.includes('BUREAU VERITAS')) {
        metadata.company = 'BUREAU VERITAS RINAVE';
    } else if (text.includes('Câmara Municipal de Lisboa') || text.includes('CML')) {
        metadata.company = 'Câmara Municipal de Lisboa';
    } else if (text.includes('APCER')) {
        metadata.company = 'APCER';
    }
    
    console.log('  📋 Company:', metadata.company || 'Unknown');
    
    // 1. НОМЕР ЗВІТУ - різні формати
    const reportPatterns = [
        /Relatório\s+n[ºo.]\s*([A-Z]{2}\d{4}-\d{4}-\d{2}-\d{2})/i, // Bureau Veritas: NB2023-8010-01-01
        /CML\/(\d+\/\d+)/i, // CML: CML/3599/6599
        /Processo[:\s]+([A-Z0-9\/-]+)/i // Generic: Processo: 371-11.05/002019
    ];
    
    for (const pattern of reportPatterns) {
        const match = text.match(pattern);
        if (match) {
            metadata.reportNumber = match[1];
            console.log('  ✅ Report Number:', metadata.reportNumber);
            break;
        }
    }
    
    // 2. ДАТА ІНСПЕКЦІЇ - різні формати
    const datePatterns = [
        /Data\s+da\s+Inspe[çc][çc]?[ãa]o[:\s]+(\d{2}\/\d{2}\/\d{4})/i, // DD/MM/YYYY
        /Data\s+da\s+Inspe[çc][çc]?[ãa]o[:\s]+(\d{4}\/\d{2}\/\d{2})/i, // YYYY/MM/DD
        /(\d{2}\s+de\s+\w+\s+de\s+\d{4})/i, // 30 de Junho de 2025
        /(\d{4}\/\d{2}\/\d{2})/, // Будь-яка дата YYYY/MM/DD
        /(\d{2}\/\d{2}\/\d{4})/ // Будь-яка дата DD/MM/YYYY
    ];
    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            metadata.date = match[1];
            console.log('  ✅ Date:', metadata.date);
            break;
        }
    }
    
    // 3. НОМЕР УСТАНОВКИ (Installation Number)
    const installationMatch = text.match(/Instala[çc][ãa]o\s+n[ºo.]\s*(\d+[-\/]\d+[-\/\d]*)/i);
    if (installationMatch) {
        metadata.installationNumber = installationMatch[1];
        metadata.liftId = installationMatch[1]; // Використовуємо як ID ліфту
        console.log('  ✅ Installation No:', metadata.installationNumber);
    }
    
    // 4. НОМЕР ПРОЦЕСУ
    const processMatch = text.match(/Processo\s+n[ºo.]\s*(\d+[-\/]\d+[-\/\d]*)/i);
    if (processMatch) {
        metadata.processNumber = processMatch[1];
        console.log('  ✅ Process No:', metadata.processNumber);
    }
    
    // 5. ЛОКАЦІЯ - Bureau Veritas має таблицю
    const locationPatterns = [
        /Localiza[çc][ãa]o\s+da\s+instala[çc][ãa]o\s+(.+?)(?=C[óo]digo\s+Postal|Relatório|$)/is,
        /Local(?:iza[çc][ãa]o)?\s+(.+?)(?=\d{4}-\d{3}|C[óo]digo|$)/is
    ];
    for (const pattern of locationPatterns) {
        const match = text.match(pattern);
        if (match) {
            let location = match[1].trim()
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, ', ')
                .substring(0, 200);
            if (location.length >= 10) {
                metadata.location = location;
                console.log('  ✅ Location:', location.substring(0, 80));
                break;
            }
        }
    }
    
    // 6. ВЛАСНИК (Proprietário)
    const ownerMatch = text.match(/Propriet[áa]rio\s+(.+?)(?=Morada|Marca|$)/is);
    if (ownerMatch) {
        metadata.owner = ownerMatch[1].trim().replace(/\s+/g, ' ').substring(0, 100);
        console.log('  ✅ Owner:', metadata.owner.substring(0, 50));
    }
    
    // 7. КОМПАНІЯ ОБСЛУГОВУВАННЯ
    const maintenanceMatch = text.match(/Empresa\s+de\s+Manuten[çc][ãa]o\s+([A-ZÀ-Ú][^\n]{3,80})/i);
    if (maintenanceMatch) {
        metadata.maintenanceCompany = maintenanceMatch[1].trim();
        console.log('  ✅ Maintenance Company:', metadata.maintenanceCompany);
    }
    
    // 8. ІНСПЕКТОР - Bureau Veritas має підписи
    const inspectorPatterns = [
        /Inspector\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,3})/i,
        /([A-ZÀ-Ú][a-zà-ú]+\s+[A-ZÀ-Ú][a-zà-ú]+)\s+Propriet[áa]rio/i
    ];
    for (const pattern of inspectorPatterns) {
        const match = text.match(pattern);
        if (match) {
            metadata.inspector = match[1].trim();
            console.log('  ✅ Inspector:', metadata.inspector);
            break;
        }
    }
    
    return metadata;
}

/**
 * ВИТЯГУВАННЯ ПОРУШЕНЬ - З ФІЛЬТРАЦІЄЮ "NOTA DE CLÁUSULAS"
 */
function extractViolations(text) {
    const violations = [];
    const seen = new Set();
    
    console.log('\n🔍 [Bureau Veritas] Extracting Violations...');
    
    // КРОК 1: Визначаємо чи є реальні порушення
    // Bureau Veritas має розділ "NOTA DE CLÁUSULAS" який є просто поясненням
    
    // Перевірка: чи є розділ з реальними порушеннями?
    const hasViolationsSection = 
        text.match(/RELAÇÃO\s+DE\s+CLÁUSULAS/i) ||
        text.match(/CLÁUSULAS\s+DETECTADAS/i) ||
        text.match(/DEFICIÊNCIAS\s+DETECTADAS/i) ||
        text.match(/NÃO\s+CONFORMIDADES/i);
    
    console.log('  Has violations section:', !!hasViolationsSection);
    
    // Перевірка статусу
    const statusChecks = {
        approved: text.match(/(?:Elevador\s+)?Aprovad[oa](?:\s+com\s+cláusulas\s+C3)?[:\s]/i),
        failed: text.match(/(?:Elevador\s+)?Reprovad[oa]/i),
        withC2Star: text.match(/Aprovad[oa]\s+com\s+cl[áa]usulas\s+C2\*/i),
        withImmobilization: text.match(/Reprovad[oa]\s+com\s+Imobiliza[çc][ãa]o/i)
    };
    
    console.log('  Status checks:', statusChecks);
    
    // КРОК 2: Знаходимо розділ з порушеннями
    const notaSectionStart = text.search(/NOTA\s+DE\s+CL[ÁA]USULAS/i);
    
    let searchText = text;
    
    if (notaSectionStart !== -1) {
        // Bureau Veritas: порушення між NOTA і RESULTADO
        const resultSectionStart = text.search(/RESULTADO\s+DA\s+INSPE[CÇ][CÇ][ÃA]O/i);
        
        if (resultSectionStart !== -1 && resultSectionStart > notaSectionStart) {
            // Bureau Veritas формат
            searchText = text.substring(notaSectionStart, resultSectionStart);
            console.log(`  📋 Bureau Veritas format: violations table ${searchText.length} chars`);
        } else {
            // CML або інший формат: порушення після NOTA до кінця (або до Lisboa/Porto/підпису)
            const endMarkers = [
                text.search(/Lisboa,\s*\d{2}\s+de\s+\w+\s+de\s+\d{4}/i),
                text.search(/Porto,\s*\d{2}\s+de\s+\w+\s+de\s+\d{4}/i),
                text.search(/O\s+DIRETOR\s+T[ÉE]CNICO/i),
                text.search(/www\.cm-lisboa\.pt/i)
            ].filter(pos => pos !== -1);
            
            const endPos = endMarkers.length > 0 ? Math.min(...endMarkers) : text.length;
            searchText = text.substring(notaSectionStart, endPos);
            console.log(`  📋 CML/Generic format: violations section ${searchText.length} chars (${notaSectionStart} to ${endPos})`);
        }
    } else {
        console.log('  ℹ️ No NOTA DE CLÁUSULAS section found, searching full text');
    }
    
    // КРОК 3: Шукаємо конкретні порушення в таблиці
    
    // Формат Bureau Veritas: "C2 Artº.46.º 2 – опис"
    // Підтримуємо артикули з пробілами: "46.º 2" або "46.2"
    const format1 = /([C][123])\s+Art[ºo°]?\.?\s*([\d\s\.º°]+?)\s+[-–—]\s*([^\n]{10,400})/gi;
    let match;
    let count = 0;
    
    console.log('  🔍 Searching for violations with Format 1...');
    
    while ((match = format1.exec(searchText)) !== null) {
        const classification = match[1];
        // Нормалізуємо: "46.º 2" → "46.2", видаляємо зайві пробіли
        let article = match[2].trim().replace(/[º°]/g, '.').replace(/\s+/g, '').replace(/\.+/g, '.').replace(/\.$/, '');
        const description = match[3].trim();
        
        console.log(`  🔍 Found candidate: ${classification} Art.${article} - ${description.substring(0, 50)}...`);
        
        // Фільтруємо текст з пояснень (це не порушення)
        if (isExplanationText(description)) {
            console.log(`  ⚠️ Filtered explanation: ${description.substring(0, 50)}...`);
            continue;
        }
        
        const key = `${classification}-${article}-${description.substring(0, 30)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(classification, article, description));
            count++;
            console.log(`  ✅ Added violation: ${classification} Art.${article}`);
        }
    }
    
    console.log(`  📊 Format 1 found: ${count} violations`);
    
    // Формат 2: Список маркерів з артикулами (інший формат)
    const format2 = /[•▪○-]\s*([^\n]{10,300}?)(?:Art\.?º?|Artigo)\s*(\d+[a-z]?\.?\d*)\s*\(([C][123])\)/gi;
    count = 0;
    
    while ((match = format2.exec(searchText)) !== null) {
        const description = match[1].trim();
        const article = match[2];
        const classification = match[3];
        
        if (isExplanationText(description)) {
            continue;
        }
        
        const key = `${classification}-${article}-${description.substring(0, 30)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(classification, article, description));
            count++;
        }
    }
    
    console.log(`  📊 Format 2 found: ${count} violations`);
    
    // Формат 3: CML Lisboa - таблиця "Artigo | Descrição"
    // Приклад: "ART. 20.º (DL 320/02) Falta de apresentação dos documentos..."
    // Важливо: текст може бути на кількох рядках
    const format3 = /ART[\.º\s]*(\d+[a-zº°\.]*)\s*(?:\(([^)]+)\))?\s*([\s\S]{15,600}?)(?=ART\.|Lisboa|Porto|O\s+DIRETOR|www\.|Página|$)/gi;
    count = 0;
    
    console.log('  🔍 Searching for violations with Format 3 (CML Lisboa)...');
    
    while ((match = format3.exec(searchText)) !== null) {
        let article = match[1].trim().replace(/[º°]/g, '.').replace(/\.+/g, '.').replace(/\.$/, '');
        const legalRef = match[2] ? match[2].trim() : ''; // DL 320/02
        let description = match[3].trim().replace(/\s+/g, ' '); // Нормалізуємо пробіли
        
        // Обрізаємо на першій крапці + пробіл після 50 символів (кінець речення)
        const sentenceEnd = description.indexOf('. ', 50);
        if (sentenceEnd !== -1 && sentenceEnd < 300) {
            description = description.substring(0, sentenceEnd + 1);
        } else if (description.length > 400) {
            description = description.substring(0, 400).trim();
        }
        
        console.log(`  🔍 Found CML format: Art.${article} ${legalRef} - ${description.substring(0, 60)}...`);
        
        if (isExplanationText(description)) {
            console.log(`  ⚠️ Filtered explanation: ${description.substring(0, 50)}...`);
            continue;
        }
        
        // Визначаємо класифікацію з контексту
        // Шукаємо заголовок C1/C2/C3 перед цим порушенням
        let classification = 'C2'; // За замовчуванням C2
        
        const textBeforeViolation = searchText.substring(0, match.index);
        const c1Header = textBeforeViolation.lastIndexOf('C  1  -');
        const c2Header = textBeforeViolation.lastIndexOf('C  2  -');
        const c3Header = textBeforeViolation.lastIndexOf('C  3  -');
        
        // Знаходимо найближчий заголовок
        const headers = [
            { pos: c1Header, class: 'C1' },
            { pos: c2Header, class: 'C2' },
            { pos: c3Header, class: 'C3' }
        ].filter(h => h.pos !== -1).sort((a, b) => b.pos - a.pos);
        
        if (headers.length > 0) {
            classification = headers[0].class;
            console.log(`  📍 Classification from header: ${classification}`);
        }
        
        const key = `${classification}-${article}-${description.substring(0, 30)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(classification, article, description));
            count++;
            console.log(`  ✅ Added CML violation: ${classification} Art.${article}`);
        }
    }
    
    console.log(`  📊 Format 3 (CML) found: ${count} violations`);
    
    // Формат 4: APCER та інші - "Artigo XX.º - опис" або "Cláusula C2 - Artigo XX"
    const format4 = /(?:Cl[áa]usula\s+)?([C][123])\s*[-:]\s*Art(?:igo|[ºo°.]?)\s*([\d\s\.º°]+?)\s+[-–—]\s*(.+?)(?=Cl[áa]usula|Art(?:igo|[ºo°.])|$)/gis;
    count = 0;
    
    console.log('  🔍 Searching for violations with Format 4 (APCER/Other)...');
    
    while ((match = format4.exec(searchText)) !== null) {
        const classification = match[1];
        let article = match[2].trim().replace(/[º°]/g, '.').replace(/\s+/g, '').replace(/\.+/g, '.').replace(/\.$/, '');
        let description = match[3].trim().replace(/\s+/g, ' ');
        
        // Обрізаємо довгий текст
        if (description.length > 300) {
            const sentenceEnd = description.indexOf('. ', 100);
            description = sentenceEnd !== -1 ? description.substring(0, sentenceEnd + 1) : description.substring(0, 300);
        }
        
        console.log(`  🔍 Found APCER format: ${classification} Art.${article} - ${description.substring(0, 60)}...`);
        
        if (isExplanationText(description)) {
            console.log(`  ⚠️ Filtered explanation: ${description.substring(0, 50)}...`);
            continue;
        }
        
        const key = `${classification}-${article}-${description.substring(0, 30)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(classification, article, description));
            count++;
            console.log(`  ✅ Added APCER violation: ${classification} Art.${article}`);
        }
    }
    
    console.log(`  📊 Format 4 (APCER/Other) found: ${count} violations`);
    
    // Формат 5: GATECI - Таблиця "TIPO | ARTIGO/PONTO | DEFICIÊNCIA DETETADA"
    // Приклад: C2  2º-1  Inexistência de proteção diferencial...
    const format5 = /^([C][123])\s*(\d+[º°]?[a-z]?\.?[-\s]*\d*)\s+(.+?)(?=^[C][123]\s*\d|^RESULTADO|^Avenida|$)/gim;
    count = 0;
    
    console.log('  🔍 Searching for violations with Format 5 (GATECI table)...');
    
    // Шукаємо таблицю з порушеннями (можливо без пробілів)
    const tablePatterns = [
        /TIPO\s*ARTIGO[\/\s]*PONTO\s*DEFICI[ÊE]NCIA\s*DETETADA([\s\S]+?)(?=RESULTADO|Avenida|$)/i,
        /TIPOARTIGO[\/]*PONTODEFICI[ÊE]NCIADETETADA([\s\S]+?)(?=RESULTADO|Avenida|$)/i // Без пробілів
    ];
    
    let tableMatch = null;
    for (const pattern of tablePatterns) {
        tableMatch = searchText.match(pattern);
        if (tableMatch) {
            console.log(`  ✅ Found table header with pattern: ${pattern.toString().substring(0, 50)}...`);
            break;
        }
    }
    
    if (tableMatch) {
        const tableContent = tableMatch[1];
        console.log(`  📋 Found GATECI table: ${tableContent.length} chars`);
        
        while ((match = format5.exec(tableContent)) !== null) {
            const classification = match[1];
            let article = match[2].trim()
                .replace(/[º°]/g, '.')
                .replace(/\s+/g, '')
                .replace(/\.+/g, '.')
                .replace(/\.$/, '')
                .replace(/\.-/g, '.'); // "86º.-4" → "86.4"
            
            let description = match[3].trim().replace(/\s+/g, ' ');
            
            // Обрізаємо на наступному рядку якщо текст закінчується
            if (description.length > 200) {
                description = description.substring(0, 200).trim();
            }
            
            console.log(`  🔍 Found GATECI format: ${classification} Art.${article} - ${description.substring(0, 60)}...`);
            
            if (isExplanationText(description)) {
                console.log(`  ⚠️ Filtered explanation: ${description.substring(0, 50)}...`);
                continue;
            }
            
            const key = `${classification}-${article}-${description.substring(0, 30)}`;
            if (!seen.has(key)) {
                seen.add(key);
                violations.push(createViolation(classification, article, description));
                count++;
                console.log(`  ✅ Added GATECI violation: ${classification} Art.${article}`);
            }
        }
    }
    
    console.log(`  📊 Format 5 (GATECI) found: ${count} violations`);
    
    // КРОК 4: Якщо РЕПРОВАДО але немає порушень - щось пішло не так
    if (statusChecks.failed && violations.length === 0) {
        console.log('  ⚠️ WARNING: Report marked as REPROVADO but no violations found!');
        console.log('  ℹ️ Attempting alternative parsing...');
        
        // Альтернативний пошук: текст після "Tipo Deficiência detectada"
        const altMatch = text.match(/Tipo\s+Defici[êe]ncia\s+detectada\s*([\s\S]{0,500}?)(?=RESULTADO|$)/i);
        if (altMatch) {
            const violationText = altMatch[1];
            console.log(`  🔍 Alternative search in: ${violationText.substring(0, 100)}...`);
            
            // Спробувати знайти будь-який C1/C2/C3 з артикулом (більш ліберальний regex)
            const altRegex = /([C][123])\s+Art[ºo°]?\.?\s*([\d\s\.º°]+?)\s+[-–—]\s*(.+)/gi;
            let altMatch2;
            while ((altMatch2 = altRegex.exec(violationText)) !== null) {
                const classification = altMatch2[1];
                let article = altMatch2[2].trim().replace(/[º°]/g, '.').replace(/\s+/g, '').replace(/\.+/g, '.').replace(/\.$/, '');
                const description = altMatch2[3].trim();                
                const key = `${classification}-${article}-${description.substring(0, 30)}`;
                if (!seen.has(key) && !isExplanationText(description)) {
                    seen.add(key);
                    violations.push(createViolation(classification, article, description));
                    console.log(`  ✅ Alternative found: ${classification} Art.${article}`);
                }
            }
        }
    }
    
    console.log(`\n📊 Total violations found: ${violations.length}`);
    
    return violations;
}

/**
 * Перевірка чи текст є поясненням (а не порушенням)
 */
function isExplanationText(text) {
    const explanationPhrases = [
        /correspondem\s+a\s+situa[çc][õo]es/i,
        /cuja\s+resolu[çc][ãa]o\s+deve/i,
        /n[ãa]o\s+apresentam\s+um\s+risco/i,
        /obrigam\s+[àa]\s+imobiliza[çc][ãa]o/i,
        /d[ãa]o\s+lugar\s+a\s+uma/i,
        /elevador\s+(?:aprovado|reprovado)/i,
        /foram\s+detet[ae]das\s+cl[áa]usulas\s+tipo/i,
        /remo[çc][ãa]o\s+destas\s+n[ãa]o\s+conformidades/i,
        /prazo\s+m[áa]ximo\s+de\s+\d+\s+anos/i,
        /despacho\s+n\.?[ºo]/i,
        /defici[êe]ncias\s+a\s+reparar\s+no\s+prazo/i,
        /data\s+da\s+inspe[çc][ãa]o\s+\d{4}-\d{2}-\d{2}/i,
        /valida[çc][ãa]o\/inspetor/i,
        /propriet[áa]rio\s*empresa\s+de\s+manuten[çc][ãa]o/i,
        /obriga[çc][õo]es\s+do\s+propriet[áa]rio/i,
        /classifica[çc][ãa]o\s+das\s+cl[áa]usulas/i
    ];
    
    // Перевірка на пояснювальні фрази
    if (explanationPhrases.some(pattern => pattern.test(text))) {
        return true;
    }
    
    // Фільтруємо короткі тексти з датами/іменами (footer інфо)
    if (text.length < 100) {
        if (/^\d{4}-\d{2}-\d{2}/.test(text) || 
            /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(text.trim()) ||
            /Jorge\s+Silva|Ruslan\s+Stepanyuk/i.test(text)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Створює об'єкт порушення
 */
function createViolation(classification, articleNum, description) {
    // Нормалізація номера артикулу
    const normalizedArticle = articleNum.replace(/\.$/, '');
    
    // Отримуємо інформацію з бази даних
    let article = regulationArticles[normalizedArticle];
    
    // Якщо не знайдено - шукаємо основний артикул
    if (!article && normalizedArticle.includes('.')) {
        const mainArticle = normalizedArticle.split('.')[0];
        article = regulationArticles[mainArticle];
        if (article) {
            article = {
                ...article,
                title: article.title.replace(mainArticle, normalizedArticle),
            };
        }
    }
    
    // За замовчуванням
    if (!article) {
        article = {
            title: `Artigo ${normalizedArticle}`,
            explanation: 'Consultar regulamento para detalhes específicos',
            why: 'Cumprimento obrigatório da regulamentação',
            solution: 'Consultar técnico certificado',
            urgency: classification === 'C1' ? 'CRÍTICO' : classification === 'C2' ? 'MODERADO' : 'BAIXO'
        };
    }
    
    // Інформація про класифікацію
    const classificationInfo = {
        'C1': {
            level: 'CRÍTICO',
            description: 'Elevado risco - imobilização imediata',
            deadline: 'IMEDIATO',
            legalConsequence: 'Imobilização obrigatória até correção'
        },
        'C2': {
            level: 'MODERADO',
            description: 'Médio risco - correção obrigatória',
            deadline: '30 dias',
            legalConsequence: 'Reinspecção obrigatória + possível multa'
        },
        'C3': {
            level: 'LEVE',
            description: 'Baixo risco - manutenção preventiva',
            deadline: 'Próxima inspeção',
            legalConsequence: 'Verificação na próxima inspeção periódica'
        }
    };
    
    return {
        classification,
        article: normalizedArticle,
        description,
        articleInfo: article,
        classificationInfo: classificationInfo[classification],
        detailedExplanation: formatDetailedExplanation(article, classificationInfo[classification])
    };
}

/**
 * Форматує детальне пояснення
 */
function formatDetailedExplanation(article, classInfo) {
    return `
🔍 ${article.title}

O QUE É:
${article.explanation || 'Consultar regulamento'}

⚠️ PORQUÊ CORRIGIR:
${article.why || 'Cumprimento regulamentar obrigatório'}

✅ SOLUÇÃO:
${article.solution || 'Consultar técnico certificado'}

⏰ URGÊNCIA: ${article.urgency || classInfo.level}
📅 PRAZO: ${classInfo.deadline}
⚖️ CONSEQUÊNCIA LEGAL: ${classInfo.legalConsequence}

🎯 CLASSIFICAÇÃO: ${classInfo.level}
${classInfo.description}
    `.trim();
}

/**
 * Витягує висновок
 */
function extractConclusion(text, violations) {
    const c1Count = violations.filter(v => v.classification === 'C1').length;
    const c2Count = violations.filter(v => v.classification === 'C2').length;
    const c3Count = violations.filter(v => v.classification === 'C3').length;
    
    let approved = false;
    let status = 'REPROVADO';
    let reason = '';
    
    // Bureau Veritas логіка
    if (text.match(/Aprovad[oa]\s*$/im) && c1Count === 0 && c2Count === 0) {
        approved = true;
        status = c3Count > 0 ? 'APROVADO com cláusulas C3' : 'APROVADO';
        reason = c3Count > 0 ? 
            `Aprovado com ${c3Count} cláusula(s) C3 - verificar na próxima inspeção` :
            'Elevador em conformidade com regulamentos';
    } else if (c1Count > 0 || c2Count > 0) {
        approved = false;
        status = c1Count > 0 ? 'REPROVADO com Imobilização' : 'REPROVADO';
        reason = c1Count > 0 ?
            `${c1Count} cláusula(s) C1 (críticas) - IMOBILIZAÇÃO OBRIGATÓRIA` :
            `${c2Count} cláusula(s) C2 - reinspecção obrigatória após correções`;
    }
    
    return {
        approved,
        status,
        reason,
        text: `${status}: ${reason}`
    };
}

/**
 * Статистика
 */
function getViolationsStats(violations) {
    return {
        total: violations.length,
        critical: violations.filter(v => v.classification === 'C1').length,
        medium: violations.filter(v => v.classification === 'C2').length,
        low: violations.filter(v => v.classification === 'C3').length,
        byArticle: violations.reduce((acc, v) => {
            acc[v.article] = (acc[v.article] || 0) + 1;
            return acc;
        }, {})
    };
}

/**
 * ГОЛОВНА ФУНКЦІЯ ПАРСИНГУ - УНІВЕРСАЛЬНА ДЛЯ ВСІХ ФОРМАТІВ
 */
async function parseBureauVeritasPDF(filePath) {
    try {
        console.log('\n📄 ========== PORTUGUESE INSPECTION REPORT PARSING ==========');
        console.log('📄 File:', filePath);
        
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        const text = data.text;
        
        console.log('📊 Pages:', data.numpages);
        console.log('📊 Text length:', text.length, 'chars');
        
        // Визначаємо тип звіту
        let reportType = 'UNKNOWN';
        if (text.includes('BUREAU VERITAS')) {
            reportType = 'BUREAU VERITAS RINAVE';
        } else if (text.includes('Câmara Municipal de Lisboa') || text.includes('www.cm-lisboa.pt')) {
            reportType = 'CML LISBOA';
        } else if (text.includes('APCER')) {
            reportType = 'APCER';
        } else if (text.includes('gateci.pt') || text.includes('GATECI')) {
            reportType = 'GATECI';
        } else if (text.match(/C[âa]mara Municipal/i)) {
            reportType = 'CÂMARA MUNICIPAL (Other)';
        }
        
        console.log('🏢 Report type detected:', reportType);
        
        // Витягування даних
        const metadata = extractMetadata(text);
        metadata.reportType = reportType; // Додаємо тип звіту
        
        const violations = extractViolations(text);
        const stats = getViolationsStats(violations);
        const conclusion = extractConclusion(text, violations);
        
        console.log('\n📊 RESULTS:');
        console.log(`  Status: ${conclusion.status}`);
        console.log(`  Total violations: ${stats.total}`);
        console.log(`  C1 (Critical): ${stats.critical}`);
        console.log(`  C2 (Medium): ${stats.medium}`);
        console.log(`  C3 (Low): ${stats.low}`);
        
        console.log('========== PARSING COMPLETE ==========\n');
        
        return {
            success: true,
            reportType: reportType.toLowerCase().replace(/\s+/g, '_'),
            metadata,
            violations,
            stats,
            conclusion,
            summary: {
                total: stats.total,
                critical: stats.critical,
                medium: stats.medium,
                low: stats.low
            },
            passed: conclusion.approved,
            rawText: text,
            pageCount: data.numpages
        };
        
    } catch (error) {
        console.error('❌ PDF parsing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    parseBureauVeritasPDF,
    extractMetadata,
    extractViolations,
    extractConclusion,
    getViolationsStats
};
