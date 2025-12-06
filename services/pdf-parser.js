/**
 * PDF Parser для португальських інспекційних звітів
 * Підтримує 4 різних формати звітів
 */

const pdfParse = require('pdf-parse');
const fs = require('fs');

// 📚 База знань португальського законодавства про ліфти
const regulationArticles = {
    '12': {
        title: 'Dispositivos de segurança nas portas',
        explanation: 'Sensores que evitam que o elevador se mova com portas abertas',
        why: 'Previne quedas fatais e acidentes graves',
        solution: 'Instalar sensores certificados em todas as portas',
        urgency: 'CRÍTICO'
    },
    '13': {
        title: 'Manutenção preventiva obrigatória',
        explanation: 'Inspeções e manutenções regulares',
        why: 'Previne falhas mecânicas',
        solution: 'Contratar empresa certificada para manutenção mensal',
        urgency: 'MÉDIO'
    },
    '14': {
        title: 'Inspeções periódicas',
        explanation: 'Inspeções anuais por técnico certificado',
        why: 'Garante conformidade contínua',
        solution: 'Agendar inspeção com entidade acreditada',
        urgency: 'ALTO'
    },
    '15': {
        title: 'Documentação técnica completa',
        explanation: 'Manuais, certificados, histórico de manutenção',
        why: 'Permite rastreabilidade e decisões informadas',
        solution: 'Organizar pasta técnica com todos os documentos',
        urgency: 'MÉDIO'
    },
    '18': {
        title: 'Sistema de travagem de emergência',
        explanation: 'Sistema que para o elevador em caso de emergência',
        why: 'Previne acidentes em caso de falha do sistema principal',
        solution: 'Revisão completa e eventual substituição',
        urgency: 'CRÍTICO'
    },
    '20': {
        title: 'Sinalização de segurança',
        explanation: 'Placas informativas sobre capacidade e uso correto',
        why: 'Informa utilizadores sobre limites seguros',
        solution: 'Instalar sinalização conforme normas',
        urgency: 'BAIXO'
    },
    '45': {
        title: 'Ventilação adequada na cabine',
        explanation: 'Sistema de ventilação para conforto e segurança',
        why: 'Previne sufocação em caso de paragem prolongada',
        solution: 'Instalar ou reparar sistema de ventilação',
        urgency: 'MÉDIO'
    },
    '78': {
        title: 'Proteção de partes móveis da máquina',
        explanation: 'Peças salientes e móveis devem estar protegidas',
        why: 'Previne acidentes corporais graves com máquinas',
        solution: 'Instalar resguardos certificados em todas as rodas e partes móveis',
        urgency: 'ALTO'
    },
    '85': {
        title: 'Segurança no acesso à casa das máquinas',
        explanation: 'Proteções adequadas no acesso e componentes mecânicos',
        why: 'Evita acidentes durante manutenção e inspeção',
        solution: 'Implementar barreiras de proteção e sinalização adequada',
        urgency: 'ALTO'
    }
};

const classificationInfo = {
    'C1': {
        level: 'CRÍTICO',
        color: 'red',
        icon: '🔴',
        meaning: 'Risco imediato de acidente grave ou morte',
        action: 'DESATIVAR ELEVADOR IMEDIATAMENTE',
        deadline: '0-7 dias',
        legalConsequence: 'Responsabilidade criminal em caso de acidente'
    },
    'C2': {
        level: 'MODERADO',
        color: 'orange',
        icon: '🟠',
        meaning: 'Não conformidade que pode evoluir para risco crítico',
        action: 'Correção urgente necessária',
        deadline: '30 dias',
        legalConsequence: 'Coima administrativa possível'
    },
    'C3': {
        level: 'LEVE',
        color: 'yellow',
        icon: '🟡',
        meaning: 'Não conformidade menor sem risco imediato',
        action: 'Incluir em próxima manutenção',
        deadline: '90 dias',
        legalConsequence: 'Advertência possível'
    }
};

/**
 * Розпізнає тип португальського звіту
 */
function detectReportType(text) {
    // Тип 1: RELATÓRIO DE INSPEÇÃO TÉCNICA
    if (text.includes('RELATÓRIO DE INSPEÇÃO TÉCNICA') || 
        text.includes('RELATORIO DE INSPEÇÃO')) {
        return 'technical_inspection';
    }
    
    // Тип 2: AUTO DE VISTORIA
    if (text.includes('AUTO DE VISTORIA') || 
        text.includes('VISTORIA TÉCNICA')) {
        return 'vistoria';
    }
    
    // Тип 3: CERTIFICADO DE CONFORMIDADE
    if (text.includes('CERTIFICADO DE CONFORMIDADE') || 
        text.includes('CERTIFICAÇÃO')) {
        return 'certification';
    }
    
    // Тип 4: RELATÓRIO DE NÃO CONFORMIDADES
    if (text.includes('NÃO CONFORMIDADES') || 
        text.includes('RELATÓRIO DE DEFICIÊNCIAS')) {
        return 'non_conformities';
    }
    
    return 'unknown';
}

/**
 * Витягує метадані звіту (покращена версія)
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
    
    // Номер звіту - більше варіантів
    const reportNumMatch = text.match(/(?:Relatório|Certificado|Auto|NOTA)\s*(?:N\.?º|Nº|n\.?|DE\s+CLÁUSULAS)?\s*:?\s*(\d+[-\/]\d+)/i);
    if (reportNumMatch) {
        metadata.reportNumber = reportNumMatch[1];
    }
    
    // Дата - більше варіантів
    const dateMatch = text.match(/(?:DATA|Data|Emitido|Realizada)(?:\s+DA\s+INSPEÇÃO|\s+em)?\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    if (dateMatch) {
        metadata.date = dateMatch[1];
    }
    
    // ID ліфта (матrícula) - ELEVADOR Nº
    const liftIdMatch = text.match(/(?:ELEVADOR|Matrícula|Ascensor)\s*(?:N\.?º|Nº|n\.?)?\s*:?\s*(\d+)/i);
    if (liftIdMatch) {
        metadata.liftId = liftIdMatch[1];
    }
    
    // Локація - LOCALIZAÇÃO:
    const locationMatch = text.match(/(?:LOCALIZAÇÃO|Local|Morada|Endereço)\s*:?\s*([^\n]{10,150})/i);
    if (locationMatch) {
        metadata.location = locationMatch[1].trim();
    }
    
    // Інспектор - більше варіантів і форматів
    let inspectorMatch = text.match(/(?:TÉCNICO|Técnico|Inspetor|Inspector|Responsável|DIRECTOR\s+TÉCNICO|Assinado\s+por|Assinatura|Elaborado\s+por)\s*(?:RESPONSÁVEL)?\s*:?\s*([A-ZÇÁÉÍÓÚÂÊÔÃ][a-zçáéíóúâêôã\s]{2,60}?)(?:\n|CLÁUSULAS|C[123]|Página|Art|$)/i);
    
    if (!inspectorMatch) {
        // Альтернатива 1: шукаємо ім'я після "por"
        inspectorMatch = text.match(/(?:realizada|efetuada|elaborado|assinado)\s+por\s+([A-ZÇÁÉÍÓÚÂÊÔÃ][a-zçáéíóúâêôã]+(?:\s+[A-ZÇÁÉÍÓÚÂÊÔÃ][a-zçáéíóúâêôã]+){1,4})/i);
    }
    
    if (!inspectorMatch) {
        // Альтернатива 2: шукаємо перед Página (часто підпис в кінці)
        inspectorMatch = text.match(/([A-ZÇÁÉÍÓÚÂÊÔÃ][a-zçáéíóúâêôã]+(?:\s+[A-ZÇÁÉÍÓÚÂÊÔÃ][a-zçáéíóúâêôã]+){2,4})\s+Página\s*\d+/i);
    }
    
    if (!inspectorMatch) {
        // Альтернатива 3: шукаємо біля підпису або сертифікату
        inspectorMatch = text.match(/(?:certificado|atesto|certifica)\s+(?:que|por)\s+([A-ZÇÁÉÍÓÚÂÊÔÃ][a-zçáéíóúâêôã]+(?:\s+[A-ZÇÁÉÍÓÚÂÊÔÃ][a-zçáéíóúâêôã]+){1,4})/i);
    }
    
    if (inspectorMatch) {
        let inspector = inspectorMatch[1].trim();
        // Очищаємо від зайвого
        inspector = inspector
            .replace(/\s*(CLÁUSULAS|C[123]|ELEVADOR|Página|Impresso).*$/i, '')
            .replace(/^(O|A)\s+/i, '')  // Видаляємо артиклі
            .trim();
        if (inspector.length >= 5 && inspector.length <= 60) {
            metadata.inspector = inspector;
        }
    }
    
    console.log('📝 Inspector detection attempts:', {
        técnico: !!text.match(/TÉCNICO|Técnico/i),
        director: !!text.match(/DIRECTOR\s+TÉCNICO/i),
        por: !!text.match(/por\s+[A-Z]/),
        found: metadata.inspector
    });
    
    // Компанія - більше варіантів
    const companyMatch = text.match(/(?:EMPRESA|Entidade|Organismo)\s*(?:DE\s+MANUTENÇÃO)?\s*:?\s*([A-ZÇ][A-Za-zÇçÁÉÍÓÚÂÊÔÃ\s,.-]{5,80}?)(?:\n|TÉCNICO|CLÁUSULAS|$)/i);
    if (companyMatch) {
        let company = companyMatch[1].trim();
        // Очищаємо
        company = company.replace(/\s*(TÉCNICO|CLÁUSULAS|C[123]).*$/i, '').trim();
        if (company.length >= 5) {
            metadata.company = company;
        }
    }
    
    console.log('📄 Metadata extracted:', metadata);
    return metadata;
}

/**
 * Витягує порушення з тексту (5 форматів!) + повна інформація
 */
function extractViolations(text) {
    const violations = [];
    const seen = new Set(); // Уникаємо дублікатів
    
    // Формат 1: C1 Art.º 45 - опис
    const format1Regex = /([C][123])\s+Art\.?º?\s*(\d+[a-z]?\.?\d*\.?\d*)\s*[-–—]\s*([^\n]{10,200})/gi;
    let match;
    
    while ((match = format1Regex.exec(text)) !== null) {
        const key = `${match[1]}-${match[2]}-${match[3].substring(0, 50)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(match[1], match[2], match[3].trim(), 'standard'));
        }
    }
    
    // Формат 2: Artigo 45º - опис (C2)
    const format2Regex = /Art(?:igo|\.º?)\s*(\d+[a-z]?\.?\d*\.?\d*)\s*[-–—]\s*([^\n(]{10,150})\s*\(([C][123])\)/gi;
    
    while ((match = format2Regex.exec(text)) !== null) {
        const key = `${match[3]}-${match[1]}-${match[2].substring(0, 50)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(match[3], match[1], match[2].trim(), 'article_first'));
        }
    }
    
    // Формат 3: • Deficiência em ... Art 45 (C1)
    const format3Regex = /[•▪]\s*([^\n]{10,150})\s*Art\.?º?\s*(\d+[a-z]?\.?\d*\.?\d*)\s*\(([C][123])\)/gi;
    
    while ((match = format3Regex.exec(text)) !== null) {
        const key = `${match[3]}-${match[2]}-${match[1].substring(0, 50)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(match[3], match[2], match[1].trim(), 'bullet_point'));
        }
    }
    
    // Формат 4: Tabела (C1 | 45 | опис)
    const format4Regex = /([C][123])\s*[|\t]\s*(\d+[a-z]?\.?\d*\.?\d*)\s*[|\t]\s*([^\n]{10,200})/gi;
    
    while ((match = format4Regex.exec(text)) !== null) {
        const key = `${match[1]}-${match[2]}-${match[3].substring(0, 50)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(match[1], match[2], match[3].trim(), 'table'));
        }
    }
    
    // ⭐ Формат 5: Контекстний пошук для "NOTA DE CLÁUSULAS" та інших форматів
    // Якщо попередні формати нічого не знайшли, але є класифікації C1/C2/C3
    if (violations.length === 0) {
        console.log('🔍 Trying contextual search for C1/C2/C3...');
        
        // Перевіряємо чи це звіт з клаузами
        const hasClauseSection = /NOTA\s+DE\s+CLÁUSULAS|CLÁUSULAS?\s+DE\s+CUMPRIMENTO|NÃO\s+CONFORMIDADES?/i.test(text);
        
        if (hasClauseSection) {
            console.log('📋 Found clause section - using contextual extraction');
        }
        
        // ⚠️ ВИКЛЮЧЕННЯ: Патерни які НЕ є реальними порушеннями
        // ВАЖЛИВО: Використовуємо ТОЧНІ фрази, щоб не виключити реальні порушення!
        const excludePatterns = [
            /NOTA\s+DE\s+CLÁUSULAS/i,
            /CLÁUSULAS?\s+DE\s+CUMPRIMENTO\s+OBRIGATÓRIO/i,
            /AS\s+CLÁUSULAS?\s+QUE\s+A\s+SEGUIR\s+SE\s+INDICAM/i,
            /SÃO\s+APLICÁVEIS\s+FACE\s+AO\s+REGULAMENTO/i,
            /REGULAMENTO\s+DE\s+SEGURANÇA\s+DE\s+ELEVADORES/i,
            /CLASSIFICAÇÃO\s*:?\s*C[123]/i,
            /TIPO\s+DE\s+INSPEÇÃO\s*:/i,
            /DATA\s+(DA\s+)?INSPEÇÃO\s*:/i,
            /ELEVADOR\s+N[ºo]\s*:/i,
            /LOCALIZAÇÃO\s*:/i,
            /^\s*C[123]\s*$/,
            /^(C[123])\s*[-–—]\s*$/,
            // 🔥 ЛЕГЕНДА - більш строгі перевірки
            /^C[123]\s*[-–—]?\s*Correspondente\s+a\s+situações/i,
            /^Correspondente\s+a\s+situações\s+de\s+(elevado|médio|baixo)\s+risco/i,
            /cuja\s+resolução\s+deve\s+ser\s+imediata/i,
            /imediata\.\s*Estas\s+cláusulas\s+dão\s+lugar\s+à\s+imobilização/i,
            /não\s+obrigam\s+à\s+imobilização\s+das\s+instalações/i,
            /devem\s+ser\s+corrigidas\s+na\s+próxima\s+inspeção/i,
            /inspeção\s+periódica\s+seguinte/i,
            // 🔥 Footer/header
            /Página\s*\d+\s*de\s*\d+/i,
            /Impresso\s+ELEV/i,
            /Documento\s+impresso\s+em/i,
        ];
        
        // Шукаємо всі C1/C2/C3 в тексті
        const classificationMatches = [...text.matchAll(/\b(C[123])\b/g)];
        
        console.log(`🔎 Found ${classificationMatches.length} C1/C2/C3 classifications in text`);
        
        classificationMatches.forEach((classMatch) => {
            const classification = classMatch[1];
            const position = classMatch.index;
            
            // Беремо контекст навколо класифікації (ширший для перевірки)
            const contextStart = Math.max(0, position - 150);
            const contextEnd = Math.min(text.length, position + 400);
            const context = text.substring(contextStart, contextEnd);
            
            // Шукаємо номер статті поруч
            const articleMatch = context.match(/Art\.?º?\s*(\d+[a-z]?\.?\d*)|artigo\s*(\d+)/i);
            const articleNum = articleMatch ? (articleMatch[1] || articleMatch[2]) : '0';
            
            // Витягуємо опис після C1/C2/C3
            const afterClass = text.substring(position);
            
            // Шукаємо опис після класифікації (до наступного C або кінця рядка)
            // Покращена регулярка: зупиняємося на наступному C1/C2/C3, подвійному переносі, або Página
            let descriptionMatch = afterClass.match(/C[123]\s*[-–—:.]?\s*(.{15,300}?)(?:\n\n|C[123]|Página|P\s*á\s*g\s*i\s*n\s*a|CLÁUSULAS|$)/s);
            
            if (!descriptionMatch) {
                // Альтернатива: беремо текст до переносу або Artigo
                descriptionMatch = afterClass.match(/C[123]\s*[-–—:.]?\s*(.{15,200}?)(?:\n|Art\.?º?\s*\d|$)/);
            }
            
            let description = descriptionMatch ? descriptionMatch[1].trim() : '';
            
            // ⛔ ФІЛЬТР 1: Якщо опису немає взагалі
            if (!description || description.length < 10) {
                console.log(`⏭️ Skipping ${classification} - no description found`);
                return;
            }
            
            // Очищаємо опис від зайвого
            description = description
                .replace(/^\s*[-–—:.]\s*/, '') // Видаляємо початкові розділювачі
                .replace(/\s+/g, ' ') // Нормалізуємо пробіли
                .replace(/\s*\([^)]*C[123][^)]*\)\s*$/, '') // Видаляємо класифікацію в кінці якщо є
                .trim();
            
            // ⛔ ФІЛЬТР 3: Виключаємо спеціальні випадки в ОПИСІ
            // ВАЖЛИВО: Перевіряємо ШО опис ПОВНІСТЮ складається з цього, не частково!
            const descriptionExcludePatterns = [
                /^\d+[-\/]\d+[-\/]\d+$/,  // ТІЛЬКИ дата
                /^[\d\s.:-]+$/,  // ТІЛЬКИ цифри і розділювачі
                /^[A-Z\s]{2,15}$/,  // ТІЛЬКИ великі літери (заголовки)
                /^[A-Z][A-Z\s]+$/,  // Тільки великі літери (заголовки)
                /^(SIM|NÃO|OK|N\/A|APROVADO|REPROVADO)$/i,  // Односложні відповіді
                /^(AS\s+)?CLÁUSULAS?\s+QUE\s+A\s+SEGUIR/i,
                /^SÃO\s+APLICÁVEIS\s+FACE/i,
                /^FACE\s+AO\s+REGULAMENTO/i,
                // 🔥 ЛЕГЕНДА - строгіша перевірка
                /^Correspondente\s+a\s+situações/i,
                /situações\s+de\s+(elevado|médio|baixo)\s+risco/i,
                /cuja\s+resolução\s+deve\s+ser/i,
                /deve\s+ser\s+imediata/i,
                /Estas\s+cláusulas\s+dão\s+lugar/i,
                /dão\s+lugar\s+à\s+imobilização/i,
                /não\s+obrigam\s+à\s+imobilização/i,
                /devem\s+ser\s+corrigidas\s+na/i,
                /na\s+próxima\s+inspeção/i,
                /inspeção\s+periódica\s+seguinte/i,
                // 🔥 Footer
                /Página\s*\d+/i,
                /Impresso\s+ELEV/i,
                /Documento\s+impresso/i,
                /^\d{6}\s+Documento/i,
                // 🔥 Технічні нотатки
                /^NOTA:/i,
                /^O\s+dispositivo\s+elétrico/i,
                // 🔥 Метадані звіту
                /^TÉCNICO\s+RESPONSÁVEL/i,
                /^DIRECTOR\s+TÉCNICO/i,
                /^ENTIDADE\s+INSPETORA/i,
            ];
            
            const isDescriptionExcluded = descriptionExcludePatterns.some(pattern => pattern.test(description));
            if (isDescriptionExcluded) {
                console.log(`⏭️ Skipping ${classification} - description is noise: "${description.substring(0, 50)}"`);
                return;
            }
            
            // ⛔ ФІЛЬТР 4: Якщо опис занадто короткий після очищення
            if (description.length < 15) {
                console.log(`⏭️ Skipping ${classification} - description too short: "${description}"`);
                return;
            }
            
            // ⛔ ФІЛЬТР 5: Перевірка чи це не легенда (додаткова перевірка)
            const legendKeywords = [
                'Correspondente', 'situações de', 'resolução deve', 'imobilização',
                'próxima inspeção', 'periódica seguinte', 'Estas cláusulas'
            ];
            const hasMultipleLegendKeywords = legendKeywords.filter(kw => 
                description.includes(kw)
            ).length >= 2;
            
            if (hasMultipleLegendKeywords) {
                console.log(`⏭️ Skipping ${classification} - looks like legend text: "${description.substring(0, 50)}"`);
                return;
            }
            
            // ⛔ ФІЛЬТР 6: Якщо опис є номером артикля без тексту
            if (/^Art\.?º?\s*\d+\s*$/.test(description)) {
                console.log(`⏭️ Skipping ${classification} - only article number: "${description}"`);
                return;
            }
            
            console.log(`✅ Valid violation found: ${classification} - "${description.substring(0, 60)}..."`);
            
            // 🔑 Унікальний ключ: класифікація + стаття + опис
            // Якщо та сама проблема має C2 і C3 - це ДВІ різні порушення!
            const key = `${classification}-${articleNum}-${description.substring(0, 100)}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                violations.push(createViolation(classification, articleNum, description, 'contextual'));
            } else {
                console.log(`⏭️ Skipping exact duplicate: ${classification} Art.${articleNum}`);
            }
        });
    }
    
    console.log(`📋 Extracted ${violations.length} violations from text`);
    return violations;
}

/**
 * Створює об'єкт порушення з повною інформацією
 */
function createViolation(classification, article, description, format) {
    const articleNum = article.toString();
    const articleInfo = regulationArticles[articleNum] || {
        title: `Artigo ${articleNum}`,
        explanation: 'Consultar regulamentação completa',
        why: 'Verificar detalhes na norma técnica aplicável',
        solution: 'Consultar técnico certificado para avaliação e correção',
        urgency: 'AVALIAR'
    };
    
    const classInfo = classificationInfo[classification.toUpperCase()] || classificationInfo['C2'];
    
    // 📋 Створюємо детальне пояснення чому потрібно усунути
    const whyFix = `
🚨 **Classificação ${classification} - ${classInfo.level}**

⚠️ **Risco:** ${classInfo.meaning}

📜 **Base Legal:** ${articleInfo.title} (Artigo ${articleNum})
${articleInfo.explanation}

💡 **Por que eliminar:**
${articleInfo.why}

⏰ **Prazo obrigatório:** ${classInfo.deadline}

⚖️ **Consequências legais:** ${classInfo.legalConsequence}

🔧 **Como corrigir:**
${articleInfo.solution}

📋 **Ação requerida:** ${classInfo.action}
    `.trim();
    
    return {
        classification: classification.toUpperCase(),
        article: articleNum,
        description: description,
        format: format,
        
        // Інформація про класифікацію
        classificationInfo: {
            level: classInfo.level,
            color: classInfo.color,
            icon: classInfo.icon,
            meaning: classInfo.meaning,
            action: classInfo.action,
            deadline: classInfo.deadline,
            legalConsequence: classInfo.legalConsequence
        },
        
        // Інформація про статтю
        articleInfo: {
            title: articleInfo.title,
            fullName: `Art.º ${articleNum} - ${articleInfo.title}`,
            description: articleInfo.explanation,
            why: articleInfo.why,
            consequence: classInfo.meaning,
            solution: articleInfo.solution,
            urgency: articleInfo.urgency
        },
        
        // 🎯 Детальне пояснення чому усунути
        detailedExplanation: whyFix,
        
        // Для compatibility з frontend
        riskCategory: classification.toUpperCase(),
        regulation: {
            code: `Art.º ${articleNum}`,
            name: articleInfo.title,
            articleTitle: articleInfo.title,
            articleExplanation: whyFix
        },
        riskInfo: {
            description: `Prazo: ${classInfo.deadline} | ${classInfo.action}`
        }
    };
}

/**
 * Витягує висновок звіту
 */
function extractConclusion(text) {
    const conclusion = {
        approved: false,
        actionRequired: null,
        nextInspectionDate: null
    };
    
    // Перевірка на схвалення
    if (text.match(/APROVADO|APTO|CONFORME/i)) {
        conclusion.approved = true;
    }
    
    if (text.match(/REPROVADO|NÃO CONFORME|DEFICIÊNCIAS CRÍTICAS/i)) {
        conclusion.approved = false;
    }
    
    // Необхідні дії
    const actionMatch = text.match(/(?:Ação|Acção|Medidas)\s*(?:Necessária|Requerida|a tomar)\s*:?\s*([^\n]{10,200})/i);
    if (actionMatch) {
        conclusion.actionRequired = actionMatch[1].trim();
    }
    
    // Наступна інспекція
    const nextInspMatch = text.match(/(?:Próxima|Seguinte)\s*(?:Inspeção|Inspecção|Vistoria)\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    if (nextInspMatch) {
        conclusion.nextInspectionDate = nextInspMatch[1];
    }
    
    return conclusion;
}

/**
 * Статистика порушень
 */
function getViolationsStats(violations) {
    const stats = {
        total: violations.length,
        critical: 0,   // C1
        medium: 0,     // C2
        low: 0,        // C3
        byArticle: {}
    };
    
    violations.forEach(v => {
        // Підрахунок по класифікації
        if (v.classification === 'C1') stats.critical++;
        else if (v.classification === 'C2') stats.medium++;
        else if (v.classification === 'C3') stats.low++;
        
        // Підрахунок по статтям
        const article = v.article;
        if (!stats.byArticle[article]) {
            stats.byArticle[article] = {
                count: 0,
                descriptions: []
            };
        }
        stats.byArticle[article].count++;
        stats.byArticle[article].descriptions.push(v.description);
    });
    
    return stats;
}

/**
 * Головна функція парсингу PDF (з compatibility для unified-server)
 */
async function parsePDF(filePath) {
    try {
        console.log('📄 Reading PDF file:', filePath);
        // Читання PDF файлу
        const dataBuffer = fs.readFileSync(filePath);
        
        console.log('🔍 Parsing PDF with pdf-parse...');
        // Парсинг PDF
        const pdfData = await pdfParse(dataBuffer);
        
        const text = pdfData.text;
        console.log(`📝 Extracted text: ${text.length} characters, ${pdfData.numpages} pages`);
        console.log(`📄 First 500 chars: ${text.substring(0, 500)}...`);
        
        // Розпізнавання типу звіту
        const reportType = detectReportType(text);
        
        // Витягування даних
        const metadata = extractMetadata(text);
        console.log('🔍 Extracted metadata:', JSON.stringify(metadata, null, 2));
        const violations = extractViolations(text);
        const conclusion = extractConclusion(text);
        const stats = getViolationsStats(violations);
        
        console.log(`📊 Analysis result: ${violations.length} violations found (C1: ${stats.critical}, C2: ${stats.medium}, C3: ${stats.low})`);
        
        // 🎯 Визначення статусу на основі порушень
        const hasCritical = stats.critical > 0;  // C1
        const hasMedium = stats.medium > 0;      // C2
        const hasViolations = stats.total > 0;
        
        // Логіка APROVADO/REPROVADO:
        // C1 або C2 = REPROVADO (FAILED)
        // Тільки C3 (≤5) = APROVADO з застереженнями
        // Немає порушень = APROVADO
        let passed = !hasViolations;
        let finalReportType = 'certificate';
        let finalConclusion = {
            ...conclusion,
            approved: !hasViolations
        };
        
        if (hasCritical || hasMedium) {
            // C1 або C2 - завжди REPROVADO!
            passed = false;
            finalReportType = 'failed';
            finalConclusion.approved = false;
            console.log(`❌ REPROVADO: має C1=${stats.critical} або C2=${stats.medium}`);
        } else if (stats.low > 0 && stats.low <= 5) {
            // Тільки C3, не більше 5 - APROVADO з застереженнями
            passed = true;
            finalReportType = 'approved_with_c3';
            finalConclusion.approved = true;
            console.log(`✅ APROVADO з застереженнями: тільки C3=${stats.low}`);
        } else if (stats.low > 5) {
            // Більше 5 C3 - REPROVADO
            passed = false;
            finalReportType = 'failed';
            finalConclusion.approved = false;
        }
        
        console.log(`✅ Final verdict: ${passed ? 'APROVADO' : 'REPROVADO'} (${finalReportType})`);
        
        // Формат для unified-server.js
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
            // Legacy format для сумісності
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
 * Парсинг PDF з буфера (для upload)
 */
async function parsePDFBuffer(buffer) {
    try {
        const pdfData = await pdfParse(buffer);
        const text = pdfData.text;
        
        const reportType = detectReportType(text);
        const metadata = extractMetadata(text);
        const violations = extractViolations(text);
        const conclusion = extractConclusion(text);
        const stats = getViolationsStats(violations);
        
        return {
            success: true,
            reportType,
            metadata,
            violations,
            stats,
            conclusion,
            rawText: text,
            pageCount: pdfData.numpages
        };
        
    } catch (error) {
        console.error('Помилка парсингу PDF буфера:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Cleanup файлу після обробки
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
    parsePDFBuffer,
    cleanupFile,
    detectReportType,
    extractMetadata,
    extractViolations,
    extractConclusion,
    getViolationsStats
};
