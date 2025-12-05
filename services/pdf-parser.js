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
 * Витягує метадані звіту
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
    
    // Номер звіту
    const reportNumMatch = text.match(/(?:Relatório|Certificado|Auto)\s*(?:N\.?º|Nº|n\.?)\s*:?\s*(\d+[-\/]\d+)/i);
    if (reportNumMatch) {
        metadata.reportNumber = reportNumMatch[1];
    }
    
    // Дата
    const dateMatch = text.match(/(?:Data|Emitido em|Realizada em)\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    if (dateMatch) {
        metadata.date = dateMatch[1];
    }
    
    // ID ліфта (матrícula)
    const liftIdMatch = text.match(/(?:Matrícula|Ascensor)\s*(?:N\.?º|Nº|n\.?)?\s*:?\s*(\d+)/i);
    if (liftIdMatch) {
        metadata.liftId = liftIdMatch[1];
    }
    
    // Локація
    const locationMatch = text.match(/(?:Local|Morada|Endereço)\s*:?\s*([^\n]{10,100})/i);
    if (locationMatch) {
        metadata.location = locationMatch[1].trim();
    }
    
    // Інспектор
    const inspectorMatch = text.match(/(?:Técnico|Inspetor|Inspector)\s*:?\s*([A-ZÇÁÉÍÓÚÂÊÔÃ][a-zçáéíóúâêôã\s]+)/i);
    if (inspectorMatch) {
        metadata.inspector = inspectorMatch[1].trim();
    }
    
    // Компанія
    const companyMatch = text.match(/(?:Entidade|Empresa|Organismo)\s*:?\s*([A-Z][A-Za-z\s,.-]{5,50})/);
    if (companyMatch) {
        metadata.company = companyMatch[1].trim();
    }
    
    return metadata;
}

/**
 * Витягує порушення з тексту (4 формати) + повна інформація
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
        explanation: 'Consultar regulamentação',
        why: 'Verificar norma técnica',
        solution: 'Consultar técnico certificado',
        urgency: 'AVALIAR'
    };
    
    const classInfo = classificationInfo[classification.toUpperCase()] || classificationInfo['C2'];
    
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
        
        // Для compatibility з frontend
        riskCategory: classification.toUpperCase(),
        regulation: {
            code: `Art.º ${articleNum}`,
            name: articleInfo.title,
            articleTitle: articleInfo.title,
            articleExplanation: `${articleInfo.explanation}\n\n💡 Por que é importante: ${articleInfo.why}\n\n🔧 Solução: ${articleInfo.solution}`
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
        const violations = extractViolations(text);
        const conclusion = extractConclusion(text);
        const stats = getViolationsStats(violations);
        
        console.log(`📊 Analysis result: ${violations.length} violations found (C1: ${stats.critical}, C2: ${stats.medium}, C3: ${stats.low})`);
        
        // Формат для unified-server.js
        return {
            success: true,
            analysis: {
                reportType,
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
                passed: stats.critical === 0 && stats.total < 5,
                reportType: stats.critical === 0 ? (stats.total === 0 ? 'certificate' : 'approved_with_c3') : 'failed'
            },
            // Legacy format для сумісності
            reportType,
            metadata,
            violations,
            stats,
            conclusion,
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
