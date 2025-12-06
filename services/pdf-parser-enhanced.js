/**
 * ПОКРАЩЕНА ВЕРСІЯ PDF PARSER - ПОРТУГАЛЬСЬКІ ЗВІТИ ІНСПЕКЦІЇ ЛІФТІВ
 * 
 * ПОКРАЩЕННЯ:
 * ✅ Більше патернів для інспекторів (10+ варіантів)
 * ✅ Краще розпізнавання адрес (rua, avenida, código postal)
 * ✅ Покращене витягування дат (3 формати)
 * ✅ Додаткові формати клауз (C1/C2/C3)
 * ✅ Контекстний пошук для пропущених клауз
 * ✅ ПОВНА БАЗА ДАНИХ - 43 артикули з Decreto-Lei 320/2002
 */

const fs = require('fs');
const pdfParse = require('pdf-parse');

// ПОВНА БАЗА ДАНИХ АРТИКУЛІВ - Decreto-Lei n.º 320/2002
const regulationArticlesComplete = require('./regulation-articles-complete');

// Використовуємо повну базу даних
const regulationArticles = regulationArticlesComplete;

const classificationInfo = {
    'C1': {
        level: 'CRÍTICO',
        description: 'Situações de elevado risco',
        action: 'Correção imediata - imobilização',
        deadline: 'Imediato',
        legalConsequence: 'Imobilização do elevador até correção',
        risks: '⚠️ PERIGO IMINENTE: Risco de morte ou lesões graves. Acidentes podem ocorrer a qualquer momento. O elevador DEVE ser imobilizado imediatamente.',
        financialImpact: '💰 Elevador parado = prejuízo diário + multas pesadas + responsabilidade civil em caso de acidente',
        timeToFix: 'URGENTE - Técnicos devem intervir nas próximas 24-48h'
    },
    'C2': {
        level: 'MODERADO',
        description: 'Situações de médio risco',
        action: 'Correção obrigatória',
        deadline: '30 dias',
        legalConsequence: 'Multa possível se não corrigido',
        risks: '⚠️ RISCO REAL: Embora não exija imobilização imediata, pode evoluir para C1. Acidentes menos graves mas com potencial de lesões. Desconforto e insegurança para utilizadores.',
        financialImpact: '💰 Multas de €500-€5000 se não corrigido. Risco de processos judiciais. Valor do imóvel pode diminuir. Seguro pode não cobrir acidentes.',
        timeToFix: 'IMPORTANTE - Agendar correção nas próximas 2-4 semanas',
        realExamples: '📋 Exemplos reais: Portas que não fecham bem levaram a quedas de utilizadores. Falta de iluminação resultou em pânico e ferimentos.'
    },
    'C3': {
        level: 'LEVE',
        description: 'Situações de baixo risco',
        action: 'Incluir em próxima manutenção',
        deadline: '90 dias',
        legalConsequence: 'Advertência possível',
        risks: '⚠️ NÃO IGNORE: "Leve" não significa "sem importância". Problemas pequenos acumulam-se. C3 não corrigidos podem evoluir para C2 ou C1 com o tempo.',
        financialImpact: '💰 Correção agora é barata. Esperar pode multiplicar custos por 10x. Manutenção preventiva é sempre mais económica que reparação de emergência.',
        timeToFix: 'PLANEJAR - Incluir na próxima manutenção programada (60-90 dias)',
        realExamples: '📋 Caso real: Sinalização desgastada (C3) não foi corrigida. Utilizador confuso apertou botão errado, causou pânico. Evoluiu para reclamação e processo.',
        prevention: '✅ Manter tudo C3 corrigido = elevador sempre "como novo" = valor do imóvel preservado = utilizadores satisfeitos'
    }
};

/**
 * VITAG МЕТАДАНИХ - ПОКРАЩЕНА ВЕРСІЯ
 */
function extractMetadata(text) {
    const metadata = {
        reportNumber: null,
        date: null,
        liftId: null,
        location: null,
        inspector: null,
        company: null
    };
    
    console.log('\n🔍 ========== METADATA EXTRACTION START ==========');
    
    // 📋 НОМЕР ЗВІТУ - 5 варіантів
    const reportNumberPatterns = [
        /(?:Relatório|Certificado|Auto|RELATÓRIO)\s*(?:N\.?º|Nº|n\.?|DE\s+CLÁUSULAS)?\s*:?\s*(\d+[-\/]\d+)/i,
        /n[úu]mero[:\s]+(\d+[\/\-]\d+)/i,
        /relat[óo]rio[:\s]+n[úuº.]*\s*(\d+[\/\-]\d+)/i,
        /processo[:\s]+(\d+[\/\-]\d+)/i,
        /ref[:\s]+(\d+[\/\-]\d+)/i
    ];
    
    for (const pattern of reportNumberPatterns) {
        const match = text.match(pattern);
        if (match) {
            metadata.reportNumber = match[1];
            console.log('  ✅ Report number:', metadata.reportNumber);
            break;
        }
    }
    if (!metadata.reportNumber) console.log('  ❌ No report number found');
    
    // 📅 ДАТА - 6 форматів
    const datePatterns = [
        /(?:DATA|Data|Emitido|Realizada)(?:\s+DA\s+INSPEÇÃO|\s+em|\s+de)?\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
        /data[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i,  // 15 de Junho de 2024
        /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,  // 2024-06-15
        /em\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
        /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/
    ];
    
    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            metadata.date = match[1];
            console.log('  ✅ Date:', metadata.date);
            break;
        }
    }
    if (!metadata.date) console.log('  ❌ No date found');
    
    // 🏢 ID ЛІФТУ - 5 варіантів
    const liftIdPatterns = [
        /(?:ELEVADOR|Matrícula|Ascensor|Equipamento)\s*(?:N\.?º|Nº|n\.?)?\s*:?\s*(\d+)/i,
        /elevador[:\s]+n[úuº.]*\s*(\d+)/i,
        /ascensor[:\s]+n[úuº.]*\s*(\d+)/i,
        /lift[:\s]+id[:\s]*(\d+)/i,
        /mat[ríi]cula[:\s]+(\w+)/i
    ];
    
    for (const pattern of liftIdPatterns) {
        const match = text.match(pattern);
        if (match) {
            metadata.liftId = match[1];
            console.log('  ✅ Lift ID:', metadata.liftId);
            break;
        }
    }
    if (!metadata.liftId) console.log('  ❌ No lift ID found');
    
    // 📍 АДРЕСА/ЛОКАЦІЯ - 10 ПОКРАЩЕНИХ ВАРІАНТІВ
    console.log('\n📍 Searching for location...');
    const locationPatterns = [
        // 1. Традиційне "LOCALIZAÇÃO:"
        /(?:LOCALIZAÇÃO|Local(?:ização)?|Morada|Endereço)\s*:?\s*([^\n]{10,150})/i,
        // 2. Rua / Avenida
        /((?:Rua|Avenida|Av\.|R\.|Praça|Pç\.|Travessa)\s+[A-ZÀ-Ú][^\n]{5,100})/i,
        // 3. Código postal + cidade
        /(\d{4}[-\s]?\d{3}\s+[A-ZÀ-Ú][a-zà-ú\s]+(?:,\s*Portugal)?)/,
        // 4. "sito em" / "localizado em"
        /(?:sito|localizado)\s+em\s+([^\n]{10,120})/i,
        // 5. "endereço:"
        /endere[çc]o\s*:?\s*([^\n]{10,120})/i,
        // 6. "instalação:"
        /instala[çc][ãa]o\s*:?\s*([^\n]{10,120})/i,
        // 7. Rua ... nº ...
        /((?:Rua|Avenida)\s+[^,\n]+,?\s*n[ºo.]\s*\d+[^\n]{0,50})/i,
        // 8. Місто, Portugal
        /([A-ZÀ-Ú][a-zà-ú\s]+,\s*\d{4}[-\s]\d{3})/,
        // 9. "Local:"
        /local\s*:?\s*([^\n]{10,120})/i,
        // 10. Edifício + вулиця
        /(?:Edif[íi]cio|Pr[ée]dio)\s+([^\n]{10,120})/i
    ];
    
    for (let i = 0; i < locationPatterns.length; i++) {
        const pattern = locationPatterns[i];
        const match = text.match(pattern);
        if (match) {
            let location = match[1].trim();
            // Очищаємо від зайвого
            location = location
                .replace(/\s*(TÉCNICO|CLÁUSULAS|C[123]|ELEVADOR|Página).*$/i, '')
                .replace(/^\s*(O|A|o|a)\s+/, '')
                .trim();
            if (location.length >= 10 && location.length <= 150) {
                metadata.location = location;
                console.log(`  ✅ Method ${i + 1} success: ${location.substring(0, 60)}...`);
                break;
            }
        }
    }
    if (!metadata.location) console.log('  ❌ No location found with any method');
    
    // 👤 ІНСПЕКТОР - 15 ПОКРАЩЕНИХ ВАРІАНТІВ
    console.log('\n👤 Searching for inspector name...');
    const inspectorPatterns = [
        // 1. TÉCNICO: Ім'я
        /T[ÉE]CNICO\s*(?:RESPONSÁVEL)?\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 2. Director Técnico: Ім'я
        /DIRECTOR\s+T[ÉE]CNICO\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 3. Assinado por
        /assinad[oa]\s+por\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 4. Assinatura:
        /assinatura\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 5. Responsável:
        /respons[áa]vel\s*(?:t[ée]cnico)?\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 6. Inspetor / Inspector
        /inspe[ct]or\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 7. Elaborado por
        /elaborado\s+por\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 8. Realizado por
        /realizado\s+por\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 9. Efetuado por
        /efetuado\s+por\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 10. "por Ім'я" (загальний варіант)
        /\bpor\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){2,4})\b/,
        // 11. Перед "Página"
        /([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){2,4})\s+P[áa]gina\s*\d+/i,
        // 12. Certifico que ... (підпис)
        /certifico?\s+(?:que|por)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 13. Atesto que ...
        /atesto\s+(?:que|por)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 14. Nome: (загальний варіант)
        /nome\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 15. Техник з сертифікатом
        /t[ée]cnico\s+(?:certificado\s+)?n[ºo.]\s*\d+\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i
    ];
    
    for (let i = 0; i < inspectorPatterns.length; i++) {
        const pattern = inspectorPatterns[i];
        const match = text.match(pattern);
        if (match) {
            let name = match[1].trim();
            // Очищаємо від зайвого
            name = name
                .replace(/\s*(CLÁUSULAS|C[123]|ELEVADOR|Página|Art|Impresso|TÉCNICO).*$/i, '')
                .replace(/^(O|A|o|a)\s+/, '')  // Видаляємо артиклі
                .trim();
            // Перевірка: ім'я має бути 5-60 символів, не включати цифри, мінімум 2 слова
            const wordCount = name.split(/\s+/).length;
            if (name.length >= 5 && name.length <= 60 && !/\d/.test(name) && wordCount >= 2) {
                metadata.inspector = name;
                console.log(`  ✅ Method ${i + 1} success: ${name}`);
                break;
            } else {
                console.log(`  ⚠️ Method ${i + 1} found but rejected: "${name}" (len=${name.length}, words=${wordCount})`);
            }
        }
    }
    if (!metadata.inspector) console.log('  ❌ No inspector name found with any method');
    
    // 🏭 КОМПАНІЯ - 7 варіантів
    const companyPatterns = [
        /(?:EMPRESA|Entidade|Organismo|Sociedade)\s*(?:DE\s+MANUTENÇÃO|INSPETORA)?\s*:?\s*([A-ZÀ-Ú][A-Za-zÀ-Úà-ú\s,.-]{5,100}?)(?:\n|TÉCNICO|CLÁUSULAS|$)/i,
        /empresa\s*:?\s*([^\n]{5,100})/i,
        /entidade\s*:?\s*([^\n]{5,100})/i,
        /(?:Lda|S\.A\.|Unipessoal|LDA)\s*([A-ZÀ-Ú][^\n]{5,80})/,
        /([A-ZÀ-Ú][A-Za-zÀ-Úà-ú\s&]+(?:Lda|S\.A\.|Unipessoal|LDA))/,
        /organiza[çc][ãa]o\s*:?\s*([^\n]{5,100})/i,
        /\b([A-ZÀ-Ú][A-ZÀ-Úà-ú\s]+(?:ELEVADORES|INSPEÇÕES|MANUTENÇÃO))\b/i
    ];
    
    for (const pattern of companyPatterns) {
        const match = text.match(pattern);
        if (match) {
            let company = match[1].trim();
            company = company
                .replace(/\s*(TÉCNICO|CLÁUSULAS|C[123]).*$/i, '')
                .trim();
            if (company.length >= 5 && company.length <= 100) {
                metadata.company = company;
                console.log('  ✅ Company:', company);
                break;
            }
        }
    }
    if (!metadata.company) console.log('  ❌ No company found');
    
    console.log('========== METADATA EXTRACTION END ==========\n');
    return metadata;
}

/**
 * ВИТЯГУВАННЯ КЛАУЗ/ПОРУШЕНЬ - ПОКРАЩЕНА ВЕРСІЯ
 */
function extractViolations(text) {
    const violations = [];
    const seen = new Set();
    
    console.log('\n🔍 ========== VIOLATIONS EXTRACTION START ==========');
    
    // Формат 1: C1 Art.º 45 - опис (стандартний)
    console.log('📋 Format 1: C1 Art.º 45 - description');
    const format1Regex = /([C][123])\s+Art\.?º?\s*(\d+[a-z]?\.?\d*\.?\d*)\s*[-–—]\s*([^\n]{10,300})/gi;
    let match;
    let count1 = 0;
    
    while ((match = format1Regex.exec(text)) !== null) {
        const key = `${match[1]}-${match[2]}-${match[3].substring(0, 50)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(match[1], match[2], match[3].trim(), 'standard'));
            count1++;
        }
    }
    console.log(`  Found: ${count1} violations`);
    
    // Формат 2: Artigo 45º - опис (C2)
    console.log('📋 Format 2: Artigo 45º - description (C2)');
    const format2Regex = /Art(?:igo|\.º?)\s*(\d+[a-z]?\.?\d*\.?\d*)\s*[-–—]\s*([^\n(]{10,200})\s*\(([C][123])\)/gi;
    let count2 = 0;
    
    while ((match = format2Regex.exec(text)) !== null) {
        const key = `${match[3]}-${match[1]}-${match[2].substring(0, 50)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(match[3], match[1], match[2].trim(), 'article_first'));
            count2++;
        }
    }
    console.log(`  Found: ${count2} violations`);
    
    // Формат 3: • Deficiência em ... Art 45 (C1)
    console.log('📋 Format 3: • Description Art 45 (C1)');
    const format3Regex = /[•▪○]\s*([^\n]{10,200})\s*Art\.?º?\s*(\d+[a-z]?\.?\d*\.?\d*)\s*\(([C][123])\)/gi;
    let count3 = 0;
    
    while ((match = format3Regex.exec(text)) !== null) {
        const key = `${match[3]}-${match[2]}-${match[1].substring(0, 50)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(match[3], match[2], match[1].trim(), 'bullet_point'));
            count3++;
        }
    }
    console.log(`  Found: ${count3} violations`);
    
    // Формат 4: Таблиця (C1 | 45 | опис)
    console.log('📋 Format 4: Table (C1 | 45 | description)');
    const format4Regex = /([C][123])\s*[|\t]\s*(\d+[a-z]?\.?\d*\.?\d*)\s*[|\t]\s*([^\n]{10,300})/gi;
    let count4 = 0;
    
    while ((match = format4Regex.exec(text)) !== null) {
        const key = `${match[1]}-${match[2]}-${match[3].substring(0, 50)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(match[1], match[2], match[3].trim(), 'table'));
            count4++;
        }
    }
    console.log(`  Found: ${count4} violations`);
    
    // ⭐ Формат 5: КОНТЕКСТНИЙ ПОШУК (для пропущених клауз)
    console.log('📋 Format 5: Contextual search for missing clauses');
    const classificationMatches = [...text.matchAll(/\b(C[123])\b/g)];
    console.log(`  Found ${classificationMatches.length} C1/C2/C3 markers in text`);
    
    let count5 = 0;
    classificationMatches.forEach((classMatch) => {
        const classification = classMatch[1];
        const position = classMatch.index;
        
        // Контекст навколо класифікації
        const contextStart = Math.max(0, position - 100);
        const contextEnd = Math.min(text.length, position + 400);
        const context = text.substring(contextStart, contextEnd);
        
        // Шукаємо номер статті - ПОКРАЩЕНО
        // Метод 1: В близькому контексті
        let articleMatch = context.match(/Art\.?(?:igo)?\.?º?\s*(\d+[a-z]?\.?\d*\.?\d*)/i);
        let articleNum = articleMatch ? articleMatch[1] : null;
        
        // Метод 2: Шукаємо в самому описі після класифікації
        if (!articleNum) {
            const afterClassShort = text.substring(position, position + 200);
            articleMatch = afterClassShort.match(/Art\.?(?:igo)?\.?º?\s*(\d+[a-z]?\.?\d*\.?\d*)/i);
            articleNum = articleMatch ? articleMatch[1] : null;
        }
        
        // Метод 3: Шукаємо ПЕРЕД класифікацією (іноді артикул йде спочатку)
        if (!articleNum) {
            const beforeClass = text.substring(Math.max(0, position - 150), position);
            articleMatch = beforeClass.match(/Art\.?(?:igo)?\.?º?\s*(\d+[a-z]?\.?\d*\.?\d*)/i);
            articleNum = articleMatch ? articleMatch[1] : null;
        }
        
        // Витягуємо опис після C1/C2/C3
        const afterClass = text.substring(position);
        let descriptionMatch = afterClass.match(/C[123]\s*[-–—:.]?\s*(.{15,400}?)(?:\n\n|C[123]|Página|P\s*á\s*g|CLÁUSULAS|Art\.?º?\s*\d|$)/s);
        
        if (!descriptionMatch) {
            descriptionMatch = afterClass.match(/C[123]\s*[-–—:.]?\s*(.{15,300}?)(?:\n|$)/);
        }
        
        let description = descriptionMatch ? descriptionMatch[1].trim() : '';
        
        if (!description || description.length < 15) {
            return;
        }
        
        // Очищаємо опис
        description = description
            .replace(/^\s*[-–—:.]\s*/, '')
            .replace(/\s+/g, ' ')
            .replace(/\s*\([^)]*C[123][^)]*\)\s*$/, '')
            .trim();
        
        // Фільтруємо шум
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
        
        const isNoise = excludePatterns.some(pattern => pattern.test(description));
        if (isNoise) {
            return;
        }
        
        // Перевіряємо чи не дублікат
        const key = `${classification}-${articleNum}-${description.substring(0, 50)}`;
        if (!seen.has(key) && description.length >= 15) {
            seen.add(key);
            violations.push(createViolation(classification, articleNum, description, 'contextual'));
            count5++;
        }
    });
    console.log(`  Found: ${count5} additional violations`);
    
    console.log(`\n📊 TOTAL VIOLATIONS: ${violations.length} (F1:${count1} F2:${count2} F3:${count3} F4:${count4} F5:${count5})`);
    console.log('========== VIOLATIONS EXTRACTION END ==========\n');
    
    return violations;
}

/**
 * Створює об'єкт порушення з повною інформацією
 */
function createViolation(classification, articleNum, description, format) {
    // ⭐ СПЕЦІАЛЬНА ОБРОБКА ДЛЯ NOTA БЕЗ АРТИКУЛУ
    let finalArticleNum = articleNum;
    let isNota = false;
    
    // Перевірка чи це NOTA (без конкретного артикулу)
    if (!articleNum || articleNum === '0' || articleNum === null) {
        // Шукаємо в описі номер артикулу
        const articleInDesc = description.match(/Art\.?(?:igo)?\.?º?\s*(\d+[a-z]?\.?\d*\.?\d*)/i);
        if (articleInDesc) {
            finalArticleNum = articleInDesc[1];
        } else {
            // Це NOTA або загальне зауваження
            finalArticleNum = 'NOTA';
            isNota = true;
        }
    }
    
    // Отримуємо інформацію про артикул
    const article = regulationArticles[finalArticleNum] || {
        title: isNota ? 'NOTA - Observação Geral' : `Artigo ${finalArticleNum}`,
        explanation: isNota ? 
            'Observação ou recomendação técnica que não se enquadra num artigo específico' : 
            'Informação detalhada não disponível - consultar regulamento',
        why: isNota ? 
            'Melhorar segurança geral e prevenir problemas futuros' : 
            'Cumprir com regulamento de segurança de elevadores',
        solution: isNota ? 
            'Avaliar recomendação e implementar se aplicável' : 
            'Consultar técnico especializado para verificar conformidade',
        urgency: isNota ? 
            'Avaliar caso a caso' : 
            'Consultar classificação',
        risks: isNota ?
            '⚠️ NOTAS são avisos técnicos importantes. Mesmo sem artigo específico, podem indicar problemas reais que merecem atenção.' :
            '⚠️ Artigo não catalogado - consultar regulamento oficial para detalhes completos.'
    };
    
    return {
        classification: classification,
        article: finalArticleNum,
        description: description,
        format: format,
        classificationInfo: classificationInfo[classification],
        articleInfo: article,
        detailedExplanation: `
${article.title}

🔍 O QUE É:
${article.explanation}

${article.risks ? `⚠️ RISCOS REAIS:\n${article.risks}\n` : ''}
⚠️ PORQUÊ CORRIGIR:
${article.why}

✅ SOLUÇÃO:
${article.solution}

⏰ URGÊNCIA:
${article.urgency}

🎯 CLASSIFICAÇÃO ${classification} - ${classificationInfo[classification].level}:
${classificationInfo[classification].description}

📅 PRAZO: ${classificationInfo[classification].deadline}
🔧 AÇÃO: ${classificationInfo[classification].action}

${classificationInfo[classification].risks ? `⚠️ IMPACTO DESTA CLASSIFICAÇÃO:\n${classificationInfo[classification].risks}\n` : ''}
${classificationInfo[classification].financialImpact ? `💰 IMPACTO FINANCEIRO:\n${classificationInfo[classification].financialImpact}\n` : ''}
${classificationInfo[classification].realExamples ? `📋 EXEMPLOS REAIS:\n${classificationInfo[classification].realExamples}\n` : ''}
${classificationInfo[classification].prevention ? `✅ PREVENÇÃO:\n${classificationInfo[classification].prevention}\n` : ''}
⚖️ CONSEQUÊNCIA LEGAL: ${classificationInfo[classification].legalConsequence}
        `.trim()
    };
}

/**
 * Розпізнає тип звіту
 */
function detectReportType(text) {
    if (text.includes('RELATÓRIO DE INSPEÇÃO TÉCNICA') || text.includes('RELATORIO DE INSPEÇÃO')) {
        return 'technical_inspection';
    }
    if (text.includes('AUTO DE VISTORIA') || text.includes('VISTORIA TÉCNICA')) {
        return 'vistoria';
    }
    if (text.includes('CERTIFICADO DE CONFORMIDADE') || text.includes('CERTIFICAÇÃO')) {
        return 'certification';
    }
    if (text.includes('NÃO CONFORMIDADES') || text.includes('RELATÓRIO DE DEFICIÊNCIAS')) {
        return 'non_conformities';
    }
    return 'unknown';
}

/**
 * Витягує висновок
 */
function extractConclusion(text) {
    const conclusion = {
        approved: false,
        text: '',
        recommendations: []
    };
    
    if (text.includes('APROVADO') || text.includes('CONFORME')) {
        conclusion.approved = true;
        conclusion.text = 'Elevador aprovado na inspeção';
    } else if (text.includes('REPROVADO') || text.includes('NÃO CONFORME')) {
        conclusion.approved = false;
        conclusion.text = 'Elevador reprovado - correções necessárias';
    }
    
    return conclusion;
}

/**
 * Статистика порушень
 */
function getViolationsStats(violations) {
    const stats = {
        total: violations.length,
        critical: violations.filter(v => v.classification === 'C1').length,
        medium: violations.filter(v => v.classification === 'C2').length,
        low: violations.filter(v => v.classification === 'C3').length,
        byArticle: {}
    };
    
    violations.forEach(v => {
        if (!stats.byArticle[v.article]) {
            stats.byArticle[v.article] = 0;
        }
        stats.byArticle[v.article]++;
    });
    
    return stats;
}

/**
 * ГОЛОВНА ФУНКЦІЯ - ПАРСИНГ PDF
 */
async function parsePDF(filePath) {
    try {
        console.log('\n📄 ========== PDF PARSING START ==========');
        console.log('📄 Reading PDF file:', filePath);
        
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        const text = pdfData.text;
        
        console.log(`📝 Extracted: ${text.length} characters, ${pdfData.numpages} pages`);
        console.log(`📄 First 300 chars: ${text.substring(0, 300)}...`);
        
        const reportType = detectReportType(text);
        const metadata = extractMetadata(text);
        const violations = extractViolations(text);
        const conclusion = extractConclusion(text);
        const stats = getViolationsStats(violations);
        
        console.log(`\n📊 FINAL STATS:`);
        console.log(`  Total violations: ${stats.total}`);
        console.log(`  C1 (Critical): ${stats.critical}`);
        console.log(`  C2 (Medium): ${stats.medium}`);
        console.log(`  C3 (Low): ${stats.low}`);
        
        // Визначення статусу
        const hasCritical = stats.critical > 0;
        const hasMedium = stats.medium > 0;
        const hasViolations = stats.total > 0;
        
        let passed = !hasViolations;
        let finalReportType = 'certificate';
        let finalConclusion = { ...conclusion, approved: !hasViolations };
        
        if (hasCritical || hasMedium) {
            passed = false;
            finalReportType = 'failed';
            finalConclusion.approved = false;
            console.log(`❌ REPROVADO: C1=${stats.critical} or C2=${stats.medium}`);
        } else if (stats.low > 0 && stats.low <= 5) {
            passed = true;
            finalReportType = 'approved_with_c3';
            finalConclusion.approved = true;
            console.log(`✅ APROVADO com ressalvas: C3=${stats.low}`);
        } else if (stats.low > 5) {
            passed = false;
            finalReportType = 'failed';
            finalConclusion.approved = false;
        }
        
        console.log('========== PDF PARSING END ==========\n');
        
        return {
            success: true,
            analysis: {
                reportType,
                metadata,
                violations,
                stats,
                conclusion: finalConclusion,
                summary: {
                    total: stats.total,
                    critical: stats.critical,
                    medium: stats.medium,
                    low: stats.low
                },
                passed: passed,
                reportType: finalReportType
            },
            reportType,
            metadata,
            violations,
            stats,
            conclusion: finalConclusion,
            rawText: text,
            pageCount: pdfData.numpages,
            info: pdfData.info
        };
        
    } catch (error) {
        console.error('❌ PDF parsing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Cleanup файлу
 */
async function cleanupFile(filePath) {
    try {
        fs.unlinkSync(filePath);
        console.log('🗑️ Cleaned up file:', filePath);
    } catch (error) {
        console.error('⚠️ Could not delete file:', error.message);
    }
}

module.exports = {
    parsePDF,
    cleanupFile,
    extractMetadata,
    extractViolations,
    getViolationsStats
};
