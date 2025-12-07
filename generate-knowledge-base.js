#!/usr/bin/env node
/**
 * Генератор оновленої бази знань португальського законодавства
 * Об'єднує дані з JSON файлів та PDF Parser
 */

const fs = require('fs');
const path = require('path');

// Завантажити PDF Parser
const parser = require('./services/pdf-parser.js');

// Завантажити JSON законів
const dec513 = JSON.parse(fs.readFileSync('./data/regulations/decreto-513-70.json', 'utf8'));
const dl320 = JSON.parse(fs.readFileSync('./data/regulations/decreto-lei-320-2002.json', 'utf8'));
const dl295 = JSON.parse(fs.readFileSync('./data/regulations/decreto-lei-295-98.json', 'utf8'));

console.log('📚 Генерація бази знань португальського законодавства...\n');

// Створити повну базу знань
const knowledgeBase = {
    metadata: {
        country: "Portugal",
        last_updated: new Date().toISOString().split('T')[0],
        language: "pt-PT",
        scope: "Regulamentação de Elevadores e Inspeções",
        version: "2.0",
        generated_by: "DeapSeaK AI Knowledge Generator",
        laws_count: 3,
        total_articles: dec513.criticalArticles.length + dl320.chapters.length + dl295.articles.length,
        total_violation_codes: Object.keys(parser.regulationArticles).length
    },
    regulations: [
        // ========== DECRETO 513/70 ==========
        {
            id: "DEC_513_1970",
            type: "decreto",
            number: "513/70",
            date: "1970-10-28",
            title: dec513.metadata.title,
            status: "vigente_parcial",
            summary: dec513.metadata.summary,
            scope: dec513.sections.map(s => s.title),
            source: {
                file: "decreto-513-70.json",
                sections_count: dec513.sections.length,
                critical_articles: dec513.criticalArticles.length
            },
            inspection_points: dec513.criticalArticles.map(art => ({
                point: `art_${art.article}`,
                article: `Artigo ${art.article}.º`,
                requirement: art.title,
                description: art.description,
                client_explanation: art.why || parser.regulationArticles[art.article]?.why || art.description,
                urgency: art.classification || 'ALTO',
                deadline: art.deadline || 'Imediato se crítico',
                common_violations: [art.description]
            })),
            articles: dec513.criticalArticles.map(art => ({
                number: art.article,
                title: art.title,
                description: art.description,
                why: art.why,
                classification: art.classification
            })),
            penalties: dec513.penalties
        },
        
        // ========== DL 320/2002 ==========
        {
            id: "DL_320_2002",
            type: "decreto-lei",
            number: "320/2002",
            date: "2002-12-28",
            title: dl320.metadata.title,
            subtitle: dl320.metadata.subtitle,
            status: "vigente",
            summary: dl320.metadata.summary,
            scope: dl320.chapters.map(ch => ch.title),
            source: {
                file: "decreto-lei-320-2002.json",
                chapters_count: dl320.chapters.length,
                critical_requirements: dl320.criticalRequirements.length
            },
            inspection_points: dl320.criticalRequirements.map(req => ({
                point: req.code,
                article: req.title,
                requirement: req.description,
                description: req.description,
                client_explanation: req.danger,
                urgency: req.classification,
                penalty: req.penalty,
                legal_basis: req.legalBasis
            })),
            chapters: dl320.chapters,
            maintenance_types: dl320.maintenanceTypes,
            inspection_periodicity: dl320.inspectionPeriodicity,
            penalties: dl320.penalties
        },
        
        // ========== DL 295/98 ==========
        {
            id: "DL_295_1998",
            type: "decreto-lei",
            number: "295/98",
            date: "1998-09-22",
            title: dl295.metadata.title,
            status: "vigente",
            summary: dl295.metadata.scope,
            scope: dl295.chapters,
            transposes: dl295.metadata.transposes,
            source: {
                file: "decreto-lei-295-98.json",
                articles_count: dl295.articles.length,
                critical_requirements: dl295.criticalRequirements.length
            },
            inspection_points: dl295.criticalRequirements.map(req => ({
                point: req.code,
                article: req.title,
                requirement: req.description,
                description: req.description,
                client_explanation: req.danger,
                urgency: req.classification,
                penalty: req.penalty,
                legal_basis: req.legalBasis
            })),
            articles: dl295.articles,
            certification_routes: dl295.certificationRoutes,
            technical_annexes: dl295.technicalAnnexes,
            authorities: dl295.authorities,
            penalties: dl295.penalties,
            transition_dates: dl295.transitionDates
        }
    ],
    
    // База кодів порушень з PDF Parser
    violation_codes: Object.keys(parser.regulationArticles).map(code => ({
        code: code,
        title: parser.regulationArticles[code].title,
        explanation: parser.regulationArticles[code].explanation,
        why: parser.regulationArticles[code].why,
        solution: parser.regulationArticles[code].solution,
        urgency: parser.regulationArticles[code].urgency,
        regulation: parser.regulationArticles[code].regulation,
        deadline: parser.regulationArticles[code].deadline,
        penalty: parser.regulationArticles[code].penalty
    })),
    
    // Класифікація порушень
    classifications: parser.classificationInfo,
    
    // Підсумок для AI
    ai_summary: {
        total_laws: 3,
        laws: [
            {
                id: "513/70",
                focus: "Технічна безпека - caixa, portas, cabos, freios",
                year: 1970,
                codes: Object.keys(parser.regulationArticles).filter(c => !c.startsWith('DL')).length
            },
            {
                id: "320/2002",
                focus: "Manutenção e inspecção periódica - contratos EMA",
                year: 2002,
                codes: Object.keys(parser.regulationArticles).filter(c => c.startsWith('DL320')).length
            },
            {
                id: "295/98",
                focus: "Marcação CE e conformidade - organismos notificados",
                year: 1998,
                codes: Object.keys(parser.regulationArticles).filter(c => c.startsWith('DL295')).length
            }
        ],
        most_critical: Object.keys(parser.regulationArticles)
            .filter(code => parser.regulationArticles[code].urgency === 'CRÍTICO')
            .slice(0, 10)
            .map(code => ({
                code,
                title: parser.regulationArticles[code].title,
                why: parser.regulationArticles[code].why.substring(0, 100) + '...'
            }))
    }
};

// Зберегти оновлену базу
const outputPath = './data/portugal-lift-regulations.json';
fs.writeFileSync(outputPath, JSON.stringify(knowledgeBase, null, 2), 'utf8');

console.log('✅ База знань створена успішно!');
console.log('');
console.log('📊 Статистика:');
console.log(`   • Законів: ${knowledgeBase.metadata.laws_count}`);
console.log(`   • Артиклів: ${knowledgeBase.metadata.total_articles}`);
console.log(`   • Кодів порушень: ${knowledgeBase.metadata.total_violation_codes}`);
console.log('');
console.log('📚 Закони:');
knowledgeBase.regulations.forEach(reg => {
    console.log(`   ✓ ${reg.number} (${reg.date}): ${reg.source.articles_count || reg.source.chapters_count} елементів`);
});
console.log('');
console.log('🔴 Критичні порушення (топ 10):');
knowledgeBase.ai_summary.most_critical.forEach((v, i) => {
    console.log(`   ${i+1}. ${v.code}: ${v.title}`);
});
console.log('');
console.log(`💾 Файл збережено: ${outputPath}`);
console.log(`📦 Розмір: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
console.log('');
console.log('🚀 База готова для AI Assistant!');
