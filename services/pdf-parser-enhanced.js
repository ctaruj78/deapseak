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
const { isLikelyScanned, ocrPDF } = require('./pdf-ocr-gemini');

// ПОВНА БАЗА ДАНИХ АРТИКУЛІВ - Decreto-Lei n.º 320/2002
const regulationArticlesComplete = require('./regulation-articles-complete');
// Keywords DB partilhada — enriquece sub-cláusulas não catalogadas
const { matchByDescriptionText: matchViolationByText } = require('./violation-keywords');

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
    // GATECI FORMAT (значення йде на НОВОМУ РЯДКУ або з відступами після мітки)
    // ===========================

    // Визначаємо компанію інспекції — якщо це GATECI, фіксуємо одразу щоб уникнути
    // витягнення довгої описової фрази як назви компанії
    if (!metadata.company) {
        if (/\bGATECI\b/i.test(text)) {
            metadata.company = 'GATECI';
            console.log('  ✅ Company: GATECI');
        } else if (/\bCERTIEL\b/i.test(text)) {
            metadata.company = 'CERTIEL';
            console.log('  ✅ Company: CERTIEL');
        } else if (/\bNOMINARE\b/i.test(text)) {
            metadata.company = 'NOMINARE';
            console.log('  ✅ Company: NOMINARE');
        }
    }

    // 📍 Локація (GATECI): "Localização da instalação\n<address>" OR "Localização da instalação     <address>"
    // !! FIX: gateciLocMatch was previously defined but NEVER applied to metadata.location !!
    const gateciLocPatterns = [
        // Значення на новому рядку
        /Localiza[çc][ãa]o\s+da\s+instala[çc][ãa]o\s*\n([^\n]{5,150})/i,
        // Значення на тому ж рядку через відступи (табличний формат GATECI)
        /Localiza[çc][ãa]o\s+da\s+instala[çc][ãa]o\s{2,}([^\n]{5,150})/i,
        // "Local da instalação" (без 'ização')
        /Local\s+da\s+instala[çc][ãa]o\s+([^\n]{5,150})/i,
    ];
    for (const gp of gateciLocPatterns) {
        const gm = text.match(gp);
        if (gm) {
            const loc = gm[1].trim().replace(/\s+/g, ' ');
            // Відкидаємо якщо це виглядає як адреса компанії-інспектора (Porto Salvo / Tagus Park)
            if (loc.length >= 5 && loc.length <= 200 && !/TAGUS\s*PARK/i.test(loc) && !/PORTO\s*SALVO/i.test(loc)) {
                metadata.location = loc;
                console.log('  ✅ GATECI location found:', loc.substring(0, 70));
                break;
            }
        }
    }

    if (!metadata.location) {
        console.log('\n📍 Searching for location...');
        const locationPatterns = [
            // 1. Labeled forms — highest priority (specific to lift location)
            /Local\s+da\s+instala[çc][ãa]o\s*:?\s*([^\n]{10,150})/i,
            /(?:LOCALIZAÇÃO|Localização|Morada\s+da\s+instala[çc][ãa]o|Endereço\s+da\s+instala[çc][ãa]o)\s*:?\s*([^\n]{10,150})/i,
            // 2. Postal code + city (identifies correct location by structure)
            /(\d{4}[-\s]?\d{3}\s+[A-ZÀ-Ú][a-zà-úa-z\s]+(?:,\s*Portugal)?)/,
            // 3. "sito em" / "localizado em"
            /(?:sito|localizado)\s+em\s+([^\n]{10,120})/i,
            // 4. Labeled "endereço:" / "morada:"
            /endere[çc]o\s*:?\s*([^\n]{10,120})/i,
            /morada\s*:?\s*([^\n]{10,120})/i,
            // 5. "instalação:" labeled
            /instala[çc][ãa]o\s*:?\s*([^\n]{10,120})/i,
            // 6. City + postal code (reversed)
            /([A-ZÀ-Ú][a-zà-úa-z\s]+,\s*\d{4}[-\s]\d{3})/,
            // 7. "local:" labeled
            /local\s*:?\s*([^\n]{10,120})/i,
            // 8. Building/edificio
            /(?:Edif[íi]cio|Pr[ée]dio)\s+([^\n]{10,120})/i,
            // 9. Rua/Avenida — LAST RESORT: may match inspection company HQ address
            //    Only used if nothing above worked
            /((?:Rua|Avenida|Av\.|R\.)\s+[A-ZÀ-Ú][^\n]{5,100},?\s*n[º°o.]\s*\d+[^\n]{0,50})/i,
            /((?:Rua|Avenida|Av\.|R\.)\s+[A-ZÀ-Ú][^\n]{5,80})/i
        ];
        for (let i = 0; i < locationPatterns.length; i++) {
            const pattern = locationPatterns[i];
            const match = text.match(pattern);
            if (match) {
                let location = match[1].trim();
                location = location.replace(/\s*(TÉCNICO|CLÁUSULAS|C[123]|ELEVADOR|Página).*$/i, '').replace(/^\s*(O|A|o|a)\s+/, '').trim();
                // Відкидаємо адресу самої компанії-інспектора якщо вона відома
                if (/TAGUS\s*PARK|PORTO\s*SALVO|PORTO SALVO/i.test(location)) continue;
                if (location.length >= 10 && location.length <= 150) {
                    metadata.location = location;
                    console.log(`  ✅ Method ${i + 1} success: ${location.substring(0, 60)}...`);
                    break;
                }
            }
        }
        if (!metadata.location) console.log('  ❌ No location found with any method');
    } // end if (!metadata.location)

    // 🔢 НОМЕР ЗВІТУ / ПРОЦЕСУ
    const reportNumberPatterns = [
        /(?:RELAT[ÓO]RIO|REPORT|REFER[ÊE]NCIA|REF)\s*(?:N[ÚUº.]*\s*)?:?\s*([A-Z0-9]+(?:[\/\-][A-Z0-9]+){1,4})/i,
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
        // GATECI / BV: "Data da Inspecção   DD/MM/YYYY" (old or new Portuguese spelling)
        /Data\s+da\s+Inspe[çc][çc]?[ãa]o[:\s]{1,15}(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
        /Data\s+da\s+Inspe[çc][çc]?[ãa]o[:\s]{1,15}(\d{4}[\/\-]\d{2}[\/\-]\d{2})/i,
        /(?:DATA|Data|Emitido|Realizada)(?:\s+DA\s+INSPE[ÇC][ÇC]?[ÃA]O|\s+em|\s+de)?\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
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
    
    // 📍 АДРЕСА/ЛОКАЦІЯ - додаткові варіанти (пропускаємо якщо вже знайдено з GATECI)
    if (!metadata.location) {
    console.log('\n📍 Searching for location (pass 2)...');
    const locationPatterns2 = [
        // 1. Традиційне "LOCALIZAÇÃO:"
        /(?:LOCALIZAÇÃO|Local(?:ização)?|Morada|Endereço)\s*:?\s*([^\n]{10,150})/i,
        // 2. Поштовий індекс + місто
        /(\d{4}[-\s]?\d{3}\s+[A-ZÀ-Ú][a-zà-ú\s]+(?:,\s*Portugal)?)/,
        // 3. "sito em" / "localizado em"
        /(?:sito|localizado)\s+em\s+([^\n]{10,120})/i,
        // 4. "endereço:"
        /endere[çc]o\s*:?\s*([^\n]{10,120})/i,
        // 5. "instalação:"
        /instala[çc][ãa]o\s*:?\s*([^\n]{10,120})/i,
        // 6. City, Portugal
        /([A-ZÀ-Ú][a-zà-ú\s]+,\s*\d{4}[-\s]\d{3})/,
        // 7. "local:"
        /local\s*:?\s*([^\n]{10,120})/i,
        // 8. Edifício + rua
        /(?:Edif[íi]cio|Pr[ée]dio)\s+([^\n]{10,120})/i,
        // 9-10. Rua/Avenida — LAST RESORT
        /((?:Rua|Avenida|Av\.|R\.)\s+[A-ZÀ-Ú][^\n]{5,100},?\s*n[º°o.]\s*\d+[^\n]{0,50})/i,
        /((?:Rua|Avenida|Av\.|R\.)\s+[A-ZÀ-Ú][^\n]{5,80})/i
    ];
    
    for (let i = 0; i < locationPatterns2.length; i++) {
        const pattern = locationPatterns2[i];
        const match = text.match(pattern);
        if (match) {
            let location = match[1].trim();
            // Очищаємо від зайвого
            location = location
                .replace(/\s*(TÉCNICO|CLÁUSULAS|C[123]|ELEVADOR|Página).*$/i, '')
                .replace(/^\s*(O|A|o|a)\s+/, '')
                .trim();
            // Відкидаємо адресу компанії-інспектора
            if (/TAGUS\s*PARK|PORTO\s*SALVO/i.test(location)) continue;
            if (location.length >= 10 && location.length <= 150) {
                metadata.location = location;
                console.log(`  ✅ Method2 ${i + 1} success: ${location.substring(0, 60)}...`);
                break;
            }
        }
    }
    if (!metadata.location) console.log('  ❌ No location found with any method');
    } // end if (!metadata.location)
    
    // 👤 ІНСПЕКТОР - покращені варіанти (пропускаємо якщо вже знайдено з GATECI)
    if (!metadata.inspector) {
    console.log('\n👤 Searching for inspector name...');
    // Фрази з висновку, що хоч і збігаються з патернами, але НЕ є іменами
    const inspectorRejectWords = /^(Nestas?|Estas?|Assim|Perante|Deste|Desta|Nessa|Neste|Tendo|Dado|Face|Atendendo|Considerando|Em\s+virtude|Em\s+face|Nos\s+termos|Pelo\s+exposto|Pelo\s+que|Em\s+cumprimento|De\s+acordo|Na\s+sequ[eê]ncia)/i;
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
        // 12. Certifico que ...
        /certifico?\s+(?:que|por)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 13. Atesto que ...
        /atesto\s+(?:que|por)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 14. Nome:
        /nome\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,4})/i,
        // 15. Técnico com certificado
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
            // Відкидаємо фрази з висновку (напр. "Нестас циркунстансіас")
            if (inspectorRejectWords.test(name)) {
                console.log(`  ⚠️ Method ${i + 1} rejected (conclusion phrase): "${name}"`);
                continue;
            }
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
    
    // 🏭 КОМПАНІЯ - примітка: GATECI/CERTIEL/NOMINARE вже встановлені раніше
    // Тут використовуємо патерни тільки якщо company ще не знайдено
    if (!metadata.company) {
    const companyPatterns = [
        /(?:EMPRESA|Entidade|Organismo|Sociedade)\s*(?:DE\s+MANUTENÇÃO|INSPETORA)?\s*:?\s*([A-ZÀ-Ú][A-Za-zÀ-Úà-ú\s,.-]{5,60}?)(?:\n|TÉCNICO|CLÁUSULAS|$)/i,
        /empresa\s*:?\s*([^\n]{5,60})/i,
        /entidade\s*:?\s*([^\n]{5,60})/i,
        /(?:Lda|S\.A\.|Unipessoal|LDA)\s*([A-ZÀ-Ú][^\n]{5,60})/,
        /([A-ZÀ-Ú][A-Za-zÀ-Úà-ú\s&]+(?:Lda|S\.A\.|Unipessoal|LDA))/,
        /organiza[çc][ãa]o\s*:?\s*([^\n]{5,60})/i,
        // Останній шанс: назва з ключовими словами — обмежуємо 50 символами!
        /\b([A-ZÀ-Ú][A-ZÀ-Úà-ú\s]{3,45}(?:ELEVADORES|INSPEÇÕES|MANUTENÇÃO))\b/i
    ];
    
    for (const pattern of companyPatterns) {
        const match = text.match(pattern);
        if (match) {
            let company = match[1].trim();
            company = company
                .replace(/\s*(TÉCNICO|CLÁUSULAS|C[123]).*$/i, '')
                .trim();
            if (company.length >= 5 && company.length <= 60) {
                metadata.company = company;
                console.log('  ✅ Company:', company);
                break;
            }
        }
    }
    if (!metadata.company) console.log('  ❌ No company found');
    } // end if (!metadata.company)
    
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
        const key = `${match[1]}-${match[2]}-${match[3].trim()}`;
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
        const key = `${match[3]}-${match[1]}-${match[2].trim()}`;
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
        const key = `${match[3]}-${match[2]}-${match[1].trim()}`;
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
        const key = `${match[1]}-${match[2]}-${match[3].trim()}`;
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
        
        // Метод 4: GATECI формат — одразу після C[123] йде "NNº" або "NNº.-N"
        if (!articleNum) {
            const afterClassDirect = text.substring(position + 2, position + 20);
            const directArt = afterClassDirect.match(/^[\s\n]*(\d+)[º°]/);
            if (directArt) articleNum = directArt[1];
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
            .replace(/^\d+[º°][.-]?\s*\d*\s*(?:;\s*\d+[º°][.-]?\s*\d*)?(?:\s*;\s*[0-9.]+\s+EN\s+[\w-]+)?\s*/, '') // Видаляємо артикул(и) з початку опису (GATECI)
            .replace(/^[-.\s\d]+(?=[A-ZÁÉÍÓÚÂÊÔÃÇ])/, '') // Прибираємо залишки цифр/знаків перед першою літерою
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
            /^\s*,\s*cumprir/i,
            // GATECI footer/section headers (not violations)
            /Deficiências a reparar no prazo/i,
            /Data da Inspe[cç][aã]o/i,
            /Valida[cç][aã]o.*Inspe/i,
            /Propriet[aá]rio.*Empresa de Manuten/i,
            /reparar no prazo de \d+\s*dias/i,
            // Описи що починаються з C[123]+цифра — артефакт коли Format 5 підхоплює standalone C[123] рядок
            /^C[123]\d+[º°]/,
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
    // Приклади: C364º.-1Não existe...  C286º.-4Inexistência...
    //           C233º-2 ; 7.6.2 EN 81O vidro...  C36.3.5.1A casa de máquinas...
    //           C3Recomendação:... (без артикулу — article group порожній)
    console.log('📋 Format 6: GATECI compact (C3<ART><TEXT>)');

    // Хелпер: розбиває опис що містить вбудовані C[123]Текст або orphan article рядки
    function splitEmbeddedEntries(classification, articleNum, rawDesc) {
        const splitPoints = [];
        let m;
        // Pattern 1: \nC[123][Uppercase] — вбудована класифікація, напр. \nC3Recomendação
        const cSplitRe = /\n(C[123])([A-ZÁÉÍÓÚÂÊÔÃÇ])/g;
        while ((m = cSplitRe.exec(rawDesc)) !== null) {
            splitPoints.push({ pos: m.index, cls: m[1], art: null, skip: 3 }); // skip \nC3 (3 chars)
        }
        // Pattern 2: \n\d+[º°]...[Uppercase] — orphan article без C[123], напр. \n9º-1As
        const orphanRe = /\n(\d+[º°][.\-]{0,2}\d*)([A-ZÁÉÍÓÚÂÊÔÃÇ])/g;
        while ((m = orphanRe.exec(rawDesc)) !== null) {
            const rawArt = m[1];
            const alreadyCovered = splitPoints.some(sp => Math.abs(sp.pos - m.index) < 2);
            if (!alreadyCovered) {
                const artNum = rawArt.match(/^(\d+)[º°]/)?.[1] || null;
                splitPoints.push({ pos: m.index, cls: classification, art: artNum, skip: 1 + rawArt.length });
            }
        }
        if (splitPoints.length === 0) return [{ cls: classification, art: articleNum, desc: rawDesc }];
        splitPoints.sort((a, b) => a.pos - b.pos);
        const entries = [];
        const firstDesc = rawDesc.substring(0, splitPoints[0].pos).trim();
        if (firstDesc.length >= 15) entries.push({ cls: classification, art: articleNum, desc: firstDesc });
        for (let i = 0; i < splitPoints.length; i++) {
            const sp = splitPoints[i];
            const textStart = sp.pos + sp.skip;
            const textEnd = i + 1 < splitPoints.length ? splitPoints[i + 1].pos : rawDesc.length;
            const desc = rawDesc.substring(textStart, textEnd).trim();
            if (desc.length >= 15) entries.push({ cls: sp.cls, art: sp.art, desc: desc });
        }
        return entries.length > 0 ? entries : [{ cls: classification, art: articleNum, desc: rawDesc }];
    }

    // Артикул може бути: "86º.-4", "64º.-1", "33º-2 ; 7.6.2 EN 81", "6.3.5.1", "(MS) Ponto 2"
    // Або порожній (C3 одразу перед великою літерою): "C3Recomendação:"
    // Lookahead: зупиняємось перед C[123]+цифра/uppercase/newline або подвійним переносом
    const gatecLineRegex = /(C[123])(\d+(?:\.\d+){2,}|\d+[º°][.\-]{0,2}\s*\d*(?:\s*;\s*[\d.]+(?:\s+EN\s+[\w-]+)?)?|\([A-Z]+\)[^\n]{0,40}?|(?=[A-ZÁÉÍÓÚÂÊÔÃÇ]))([A-ZÁÉÍÓÚÂÊÔÃÇ].{15,}?)(?=C[123](?:[\d(\n]|[A-ZÁÉÍÓÚÂÊÔÃÇ])|\n{2,}|$)/gs;
    let count6 = 0;

    while ((match = gatecLineRegex.exec(text)) !== null) {
        const classification = match[1];
        let rawArticle = match[2].trim();
        let description = (match[3] || '').trim();

        // Нормалізуємо артикул: "86º.-4" → "86", "6.3.5.1" → "6.3.5.1", "(MS) Ponto 2" → "MS/2", "" → "NOTA"
        let articleNum;
        const decimalArt = rawArticle.match(/^(\d+(?:\.\d+){2,})/);
        const simpleArt = rawArticle.match(/^(\d+)[º°]/);
        const msArt = rawArticle.match(/^\(([A-Z]+)\)/);
        if (decimalArt) {
            articleNum = decimalArt[1];
        } else if (simpleArt) {
            articleNum = simpleArt[1];
        } else if (msArt) {
            articleNum = msArt[1] + (rawArticle.match(/Ponto\s*(\d+)/) ? '/' + rawArticle.match(/Ponto\s*(\d+)/)[1] : '');
        } else {
            articleNum = rawArticle.replace(/[º°\s.-]/g, '') || null; // null → NOTA via createViolation
        }

        // Очищаємо опис від можливих хвостів (footer тексту, повтори)
        description = description
            .replace(/\n{2,}.*/s, '')
            .replace(/Avenida.*$/s, '')
            .trim();

        if (description.length < 15) continue;

        // Розбиваємо опис якщо він містить вбудовані підзаписи
        const subEntries = splitEmbeddedEntries(classification, articleNum, description);
        for (const { cls, art, desc } of subEntries) {
            if (desc.length < 15) continue;
            const key = `${cls}-${art || 'NOTA'}-${desc}`;
            if (!seen.has(key)) {
                seen.add(key);
                violations.push(createViolation(cls, art, desc, 'gateci'));
                count6++;
                console.log(`  ✅ Format 6 GATECI: ${cls} Art.${art || 'NOTA'} - "${desc.substring(0, 50)}..."`);
            }
        }
    }
    console.log(`  Found: ${count6} violations`);
    
    // ⭐ Формат 7: GATECI таблиця де кожна колонка на новому рядку
    // PDF текст: "C2\n86º.-4\nInexistência...", "C3\n6.3.5.1\nA casa de máquinas..."
    // Тільки якщо між класифікацією та артикулом є новий рядок
    console.log('📋 Format 7: GATECI table with newlines between columns');
    const format7Regex = /(C[123])\n(\d+(?:\.\d+){2,}|\d+[º°][.\-]{0,2}\d*(?:[\s;]+[\d.]+(?:\s+EN\s+[\w-]+)?)?)\n([A-ZÁÉÍÓÚÂÊÔÃÇ].{15,}?)(?=\nC[123]\n|\n{2,}|$)/gms;
    let count7 = 0;
    
    while ((match = format7Regex.exec(text)) !== null) {
        const classification = match[1];
        const rawArticle = match[2].trim();
        let description = match[3].trim();
        
        const decimalArt7 = rawArticle.match(/^(\d+(?:\.\d+){2,})/);
        const simpleArt7 = rawArticle.match(/^(\d+)[º°]/);
        let articleNum = decimalArt7 ? decimalArt7[1] : (simpleArt7 ? simpleArt7[1] : (rawArticle.replace(/[º°\s.-]/g, '') || 'NOTA'));
        
        // Прибираємо footer тексту
        description = description.replace(/\nAvenida.*/s, '').trim();
        
        if (description.length < 15) continue;
        
        const key = `${classification}-${articleNum}-${description}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(classification, articleNum, description, 'gateci-table'));
            count7++;
            console.log(`  ✅ Format 7 GATECI-table: ${classification} Art.${articleNum} - "${description.substring(0, 50)}..."`);
        }
    }
    console.log(`  Found: ${count7} violations`);
    
    // Secondary dedup: prefer entries with a real article over NOTA for same description
    const seenByDesc = new Map(); // "C3-A casa de..." → index in violations
    const deduped = [];
    for (const v of violations) {
        const descKey = `${v.classification}-${v.description.substring(0, 120)}`;
        if (seenByDesc.has(descKey)) {
            const existing = deduped[seenByDesc.get(descKey)];
            // Replace NOTA with real article if we now have one
            if (existing.article === 'NOTA' && v.article !== 'NOTA') {
                deduped[seenByDesc.get(descKey)] = v;
            }
            // else keep existing (first wins)
        } else {
            seenByDesc.set(descKey, deduped.length);
            deduped.push(v);
        }
    }

    console.log(`\n📊 TOTAL VIOLATIONS: ${violations.length} raw → ${deduped.length} after desc-dedup (F1:${count1} F2:${count2} F3:${count3} F4:${count4} F5:${count5} F6:${count6} F7:${count7})`);
    console.log('========== VIOLATIONS EXTRACTION END ==========\n');
    
    return deduped;
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
    let usedParentFallback = false;
    if (!article && finalArticleNum !== 'NOTA' && typeof finalArticleNum === 'string' && finalArticleNum.includes('.')) {
        const mainArticle = finalArticleNum.split('.')[0];
        console.log(`    🔍 Subarticle ${finalArticleNum} not found, trying main article ${mainArticle}`);
        article = regulationArticles[mainArticle];
        if (article) {
            usedParentFallback = true; // sub-cláusula → pai: enrichment SEMPRE necessário
            console.log(`    ✅ Found main article ${mainArticle} in database`);
            // Зберігаємо оригінальний підпункт у finalArticleNum для відображення
            article = {
                ...article,
                title: article.title.replace(mainArticle, finalArticleNum),
                explanation: `Subartigo ${finalArticleNum}: ${article.explanation}`
            };
        }
    }

    // ── TEXT-BASED ENRICHMENT (sub-cláusulas) ────────────────────────────────
    // Quando usámos o pai como fallback, o título/why são do contexto errado.
    // matchViolationByText identifica o contexto real pelo texto da descrição.
    if (usedParentFallback || (!article && !isNota)) {
        const textMatch = matchViolationByText(description);
        if (textMatch) {
            article = article ? {
                ...article,
                title: textMatch.title,
                explanation: textMatch.title,
                why: textMatch.why,
                solution: textMatch.solution,
                urgency: textMatch.urgency
            } : {
                title: textMatch.title,
                explanation: textMatch.title,
                why: textMatch.why,
                solution: textMatch.solution,
                urgency: textMatch.urgency
            };
            console.log(`    ✏️  Enriched by text-match: ${textMatch.title.substring(0, 60)}`);
        }
    }
    // ── FIM TEXT-BASED ENRICHMENT ────────────────────────────────────────────
    
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
        let text = pdfData.text;
        let ocrUsed = false;
        
        console.log(`📝 Extracted: ${text.length} characters, ${pdfData.numpages} pages`);
        console.log(`📄 First 300 chars: ${text.substring(0, 300)}...`);
        
        // 🔍 Якщо тексту мало — скан, запускаємо OCR через Gemini Vision
        if (isLikelyScanned(text)) {
            console.log('🔎 Detected SCANNED PDF (low text content). Attempting Gemini Vision OCR...');
            const apiKey = process.env.GEMINI_API_KEY;
            const ocrResult = await ocrPDF(filePath, apiKey, pdfData.numpages || 8);
            if (ocrResult.success && ocrResult.text.length > 200) {
                text = ocrResult.text;
                ocrUsed = true;
                console.log(`✅ OCR extracted ${text.length} chars via Gemini Vision (${ocrResult.pagesProcessed} pages)`);
            } else {
                console.warn('⚠️ OCR did not produce usable text:', ocrResult.error || 'too short');
            }
        }
        
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
            info: pdfData.info,
            ocrUsed: ocrUsed
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
