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
    
    // ===========================
    // GATECI FORMAT (значення йде на НОВОМУ РЯДКУ після мітки)
    // ===========================
    
    // 📍 Локація (GATECI): "Localização da instalação\n<address>"
    const gateciLocMatch = text.match(/Localiza[çc][ãa]o\s+da\s+instala[çc][ãa]o\s*\n([^\n]{5,150})/i);
    if (gateciLocMatch) {
        metadata.location = gateciLocMatch[1].trim();
        console.log('  ✅ [GATECI] Location:', metadata.location);
    }
    
    // 🆔 ID ліфта (GATECI): "Processo N.º\n5635" або "Instalação N.º\n1"
    const gateciProcessoMatch = text.match(/Processo\s+N\.?[ºo]\s*\n(\d+)/i);
    const gateciInstalacaoMatch = text.match(/Instala[çc][ãa]o\s+N\.?[ºo]\s*\n(\d+)/i);
    if (gateciProcessoMatch) {
        metadata.liftId = gateciProcessoMatch[1];
        console.log('  ✅ [GATECI] Processo (liftId):', metadata.liftId);
    } else if (gateciInstalacaoMatch) {
        metadata.liftId = gateciInstalacaoMatch[1];
        console.log('  ✅ [GATECI] Instalação (liftId):', metadata.liftId);
    }
    
    // 📅 Дата (GATECI): "Data da Inspeção\n2026-03-03"
    const gateciDateMatch = text.match(/Data\s+da\s+Inspe[çc][ãa]o\s*\n(\d{4}-\d{2}-\d{2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    if (gateciDateMatch) {
        metadata.date = gateciDateMatch[1];
        console.log('  ✅ [GATECI] Date:', metadata.date);
    }
    
    // 👤 Інспектор (GATECI): "Validação/Inspetor\n<Name>"
    const gateciInspMatch = text.match(/Valida[çc][ãa]o\s*\/\s*Inspe[ct]or\s*\n([^\n]{3,60})/i);
    if (gateciInspMatch) {
        const name = gateciInspMatch[1].trim();
        // Відкидаємо якщо це не схоже на ім'я (тільки цифри/спецсимволи)
        if (name.length >= 3 && /[a-záéíóúâêôçà-ú]/i.test(name)) {
            metadata.inspector = name;
            console.log('  ✅ [GATECI] Inspector:', metadata.inspector);
        }
    }
    
    // 🏢 Компанія (GATECI): "Empresa de Manutenção\n<name>"
    const gateciCompMatch = text.match(/Empresa\s+de\s+Manuten[çc][ãa]o\s*\n([^\n]{3,100})/i);
    if (gateciCompMatch) {
        metadata.company = gateciCompMatch[1].trim();
        console.log('  ✅ [GATECI] Company:', metadata.company);
    }
    
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
    
    // 📅 ДАТА - 6 форматів (пропускаємо якщо вже знайдено з GATECI)
    if (!metadata.date) {
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
    } // end if (!metadata.date)
    
    // 🏢 ID ЛІФТУ - 5 варіантів (пропускаємо якщо вже знайдено з GATECI)
    if (!metadata.liftId) {
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
    } // end if (!metadata.liftId)
    
    // 📍 АДРЕСА/ЛОКАЦІЯ - 10 ПОКРАЩЕНИХ ВАРІАНТІВ (пропускаємо якщо вже знайдено з GATECI)
    if (!metadata.location) {
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
    } // end if (!metadata.location)
    
    // 👤 ІНСПЕКТОР - 15 ПОКРАЩЕНИХ ВАРІАНТІВ (пропускаємо якщо вже знайдено з GATECI)
    if (!metadata.inspector) {
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
    } // end if (!metadata.inspector)
    
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
        
        // Якщо опис починається з "| DL." (формат IEP/Custóias), спробуємо отримати повний рядок
        // бо перший матч зупинився на «Artº NNº» всередині дужок і захопив лише префікс
        if (descriptionMatch && /^\s*\|\s*[A-Z]/.test(descriptionMatch[1])) {
            const fullLineMatch = afterClass.match(/C[123]\s*[-–—:.]?\s*(.{15,500}?)(?:\n|$)/);
            if (fullLineMatch && fullLineMatch[1].length > descriptionMatch[1].length) {
                descriptionMatch = fullLineMatch;
            }
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
        
        // Видаляємо IEP-формат префікс: "| DL. 320/2002 (Artº 20º) - " → ""
        description = description
            .replace(/^\s*\|\s*[A-Z]+\.?\s*[\d/]+\s*(?:\([^)]+\))?\s*[-–—]\s*/, '')
            .replace(/^\s*\|\s*/, '');
        
        if (!description || description.length < 10) {
            return;
        }
        
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
            /TÉCNICO\s+RESPONSÁVEL/i,
            // Textos do rodapé (secção «Notas:» — prazos C2/C3, contactos da entidade)
            /cláusulas do tipo\s+c[123]/i,
            /cumprir no prazo máximo/i,
            /de acordo com o decreto-lei n/i,
            /decreto legislativo regional/i,
            /instalações de elevação (em|na)/i,
            /entidade inspetora de instala/i,
            /responsável técnico/i,
            /^\s*,\s*cumprir/i
        ];
        
        const isNoise = excludePatterns.some(pattern => pattern.test(description));
        if (isNoise) {
            return;
        }
        
        // Перевіряємо чи не дублікат (використовуємо 150 символів щоб розрізнити
        // порушення з однаковим початком опису — напр. два Artigo 6 з різними деталями)
        const key = `${classification}-${articleNum}-${description.substring(0, 150)}`;
        if (!seen.has(key) && description.length >= 10) {
            seen.add(key);
            violations.push(createViolation(classification, articleNum, description, 'contextual'));
            count5++;
        }
    });
    console.log(`  Found: ${count5} additional violations`);
    
    // ⭐ Формат 6: GATECI (компактний) — C[123] + артикул + текст без пробілів
    // Приклади: C364º-1Não existe...  C393º - 1O dispositivo...  C313º.-1As faces...
    //           C3(MS) Ponto 2 das OMSApós a modernização...
    console.log('📋 Format 6: GATECI compact (C3<ART><TEXT>)');
    
    // Розбиваємо текст на потенційні записи GATECI
    // Шукаємо рядки що починаються з C1/C2/C3 і одразу йде або цифра/дужка
    const gatecLineRegex = /(C[123])(\d+[º°][.-]?\s*\d*|(\([A-Z]+\)[^\n]{0,40}?))([A-ZÁÉÍÓÚÂÊÔÃÇ][^C\n]{20,})/g;
    let count6 = 0;
    
    while ((match = gatecLineRegex.exec(text)) !== null) {
        const classification = match[1];
        let rawArticle = match[2].trim();
        let description = (match[4] || '').trim();
        
        // Нормалізуємо артикул: "64º-1" → "64", "(MS) Ponto 2" → "MS/2"
        let articleNum;
        const simpleArt = rawArticle.match(/^(\d+)[º°]/);
        const msArt = rawArticle.match(/^\(([A-Z]+)\)/);
        if (simpleArt) {
            articleNum = simpleArt[1];
        } else if (msArt) {
            articleNum = msArt[1] + (rawArticle.match(/Ponto\s*(\d+)/) ? '/' + rawArticle.match(/Ponto\s*(\d+)/)[1] : '');
        } else {
            articleNum = rawArticle.replace(/[º°\s.-]/g, '') || 'NOTA';
        }
        
        // Очищаємо опис — може бути злитий з наступним записом
        description = description.replace(/\s*C[123]\d.*$/s, '').trim();
        
        if (description.length < 15) continue;
        
        const key = `${classification}-${articleNum}-${description.substring(0, 80)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(classification, articleNum, description, 'gateci'));
            count6++;
            console.log(`  ✅ Format 6 GATECI: ${classification} Art.${articleNum} - "${description.substring(0, 50)}..."`);
        }
    }
    console.log(`  Found: ${count6} violations`);
    
    console.log(`\n📊 TOTAL VIOLATIONS: ${violations.length} (F1:${count1} F2:${count2} F3:${count3} F4:${count4} F5:${count5} F6:${count6})`);
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
    
    console.log(`  🔧 createViolation: class=${classification}, article="${articleNum}" (type=${typeof articleNum}), desc="${description.substring(0, 50)}..."`);
    
    // Перевірка чи це NOTA (без конкретного артикулу)
    if (!articleNum || articleNum === '0' || articleNum === null || articleNum === undefined) {
        // Шукаємо в описі номер артикулу
        const articleInDesc = description.match(/Art\.?(?:igo)?\.?º?\s*(\d+[a-z]?\.?\d*\.?\d*)/i);
        if (articleInDesc) {
            finalArticleNum = articleInDesc[1];
            console.log(`    ✅ Found article in description: ${finalArticleNum}`);
        } else {
            // Це NOTA або загальне зауваження
            finalArticleNum = 'NOTA';
            isNota = true;
            console.log(`    ⚠️ No article found - marking as NOTA`);
        }
    } else {
        console.log(`    ✅ Article provided: ${finalArticleNum}`);
    }
    
    // Нормалізуємо номер артикулу (видаляємо зайві крапки)
    if (finalArticleNum !== 'NOTA' && typeof finalArticleNum === 'string') {
        finalArticleNum = finalArticleNum.replace(/\.$/, '');
        console.log(`    🔄 Normalized article: ${finalArticleNum}`);
    }
    
    // Отримуємо інформацію про артикул
    let article = regulationArticles[finalArticleNum];
    
    // Якщо не знайдено і це підпункт (наприклад 45.1), спробуємо основний артикул
    if (!article && finalArticleNum !== 'NOTA' && typeof finalArticleNum === 'string' && finalArticleNum.includes('.')) {
        const mainArticle = finalArticleNum.split('.')[0];
        console.log(`    🔍 Subarticle ${finalArticleNum} not found, trying main article ${mainArticle}`);
        article = regulationArticles[mainArticle];
        if (article) {
            console.log(`    ✅ Found main article ${mainArticle} in database`);
            // Зберігаємо оригінальний підпункт у finalArticleNum для відображення
            article = {
                ...article,
                title: article.title.replace(mainArticle, finalArticleNum),
                explanation: `Subartigo ${finalArticleNum}: ${article.explanation}`
            };
        }
    }
    
    // Якщо все ще не знайдено, створюємо за замовчуванням
    if (!article) {
        article = {
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
        console.log(`    ⚠️ Article ${finalArticleNum} not in database - using default info`);
    }
    
    console.log(`    📚 Article info found: ${article.title || 'Unknown'}`);
    if (!regulationArticles[finalArticleNum] && !isNota) {
        console.log(`    ⚠️ WARNING: Article ${finalArticleNum} not found in database!`);
    }
    
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
 * Попередня обробка тексту звіту:
 * – відкидаємо юридичний розділ «OBRIGAÇÕES DO PROPRIETÁRIO», який містить
 *   згадки C1/C2/C3 у пояснювальному тексті (не реальні порушення).
 */
function preprocessReportText(text) {
    // Знаходимо кінець секції дефектів / початок юридичного блоку
    const stopPatterns = [
        /OBRIGA[CÇ][OÕ]ES\s+DO\s+PROPRIET[AÁ]RIO/i,
        /EM\s+RELA[CÇ][AÃ]O\s+[AÀ]S\s+DEFICI[EÊ]NCIAS\s+DETETADAS/i,
        /Classificação\s+das\s+Cláusulas/i,
        /FONTE[:\s]+DIRE[CÇ][AÃ]O/i,
        // Секція «Notas:» в кінці звіту IEP/Custóias (роз'яснення C1/C2/C3 + контакти)
        /\nNotas?\s*:\s*\n[\s\S]{0,20}?C1\s+[-–]/i
    ];
    for (const pat of stopPatterns) {
        const m = text.search(pat);
        if (m > 200) {
            console.log(`✂️ Truncating text at position ${m} (legal section detected)`);
            return text.substring(0, m);
        }
    }
    return text;
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
        
        // Відкидаємо юридичний розділ перед парсингом
        const cleanText = preprocessReportText(text);
        
        const reportType = detectReportType(text);
        const metadata = extractMetadata(text);   // метадані — з повного тексту
        const violations = extractViolations(cleanText);
        const conclusion = extractConclusion(text);
        const stats = getViolationsStats(violations);
        
        console.log(`\n📊 FINAL STATS:`);
        console.log(`  Total violations: ${stats.total}`);
        console.log(`  C1 (Critical): ${stats.critical}`);
        console.log(`  C2 (Medium): ${stats.medium}`);
        console.log(`  C3 (Low): ${stats.low}`);
        
        // Визначення статусу: спочатку з тексту документа, потім за статистикою
        const hasCritical = stats.critical > 0;
        const hasMedium  = stats.medium > 0;
        const hasViolations = stats.total > 0;
        
        // Пріоритет — явний висновок у документі (Aprovado / Reprovado)
        const docSaysApproved  = /Aprovado|APROVADO/i.test(text);
        const docSaysReprovado = /Reprovado|REPROVADO/i.test(text);
        
        let passed;
        let finalReportType;
        let finalConclusion = { ...conclusion };
        
        if (docSaysReprovado && !docSaysApproved) {
            passed = false;
            finalReportType = 'failed';
            finalConclusion.approved = false;
            console.log('❌ REPROVADO: explicit in document');
        } else if (docSaysApproved) {
            passed = stats.critical === 0 && stats.medium === 0;
            finalReportType = (stats.low > 0) ? 'approved_with_c3' : 'certificate';
            finalConclusion.approved = passed;
            console.log(`✅ APROVADO (documento): passed=${passed}, C3=${stats.low}`);
        } else {
            // Fallback: на основі статистики (старий алгоритм)
            if (hasCritical || hasMedium) {
                passed = false;
                finalReportType = 'failed';
                finalConclusion.approved = false;
                console.log(`❌ REPROVADO (stats): C1=${stats.critical}, C2=${stats.medium}`);
            } else if (stats.low > 0 && stats.low <= 5) {
                passed = true;
                finalReportType = 'approved_with_c3';
                finalConclusion.approved = true;
                console.log(`✅ APROVADO com ressalvas (stats): C3=${stats.low}`);
            } else {
                passed = !hasViolations;
                finalReportType = passed ? 'certificate' : 'failed';
                finalConclusion.approved = passed;
            }
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
