/**
 * Тест для діагностики проблеми з артикулами "NOTA"
 */

// Симулюємо витягнуті дані з PDF
const testViolations = [
    { classification: 'C2', article: '45', description: 'Test violation 1' },
    { classification: 'C2', article: '45.1', description: 'Test violation 2' },
    { classification: 'C3', article: null, description: 'Test violation 3 - Art. 47.2' },
    { classification: 'C2', article: undefined, description: 'Test violation 4 no article' },
    { classification: 'C2', article: '0', description: 'Test violation 5 zero' },
    { classification: 'C2', article: '12.', description: 'Test violation 6 with dot' }
];

// Завантажуємо базу даних
const regulationArticles = require('./services/regulation-articles-complete.js');

console.log('🔍 Testing article detection logic\n');
console.log('📚 Database has articles:', Object.keys(regulationArticles).slice(0, 10).join(', '), '...\n');

testViolations.forEach((v, idx) => {
    console.log(`\n--- Test ${idx + 1} ---`);
    console.log(`Input: class=${v.classification}, article="${v.article}" (type=${typeof v.article})`);
    console.log(`Description: "${v.description}"`);
    
    // Копіюємо логіку з createViolation
    let finalArticleNum = v.article;
    let isNota = false;
    
    // Перевірка чи це NOTA (без конкретного артикулу)
    if (!v.article || v.article === '0' || v.article === null || v.article === undefined) {
        // Шукаємо в описі номер артикулу
        const articleInDesc = v.description.match(/Art\.?(?:igo)?\.?º?\s*(\d+[a-z]?\.?\d*\.?\d*)/i);
        if (articleInDesc) {
            finalArticleNum = articleInDesc[1];
            console.log(`  ✅ Found article in description: ${finalArticleNum}`);
        } else {
            // Це NOTA або загальне зауваження
            finalArticleNum = 'NOTA';
            isNota = true;
            console.log(`  ⚠️ No article found - marking as NOTA`);
        }
    } else {
        console.log(`  ✅ Article provided: ${finalArticleNum}`);
    }
    
    // Нормалізуємо номер артикулу (видаляємо зайві крапки)
    if (finalArticleNum !== 'NOTA' && typeof finalArticleNum === 'string') {
        const originalArticle = finalArticleNum;
        finalArticleNum = finalArticleNum.replace(/\.$/, '');
        if (originalArticle !== finalArticleNum) {
            console.log(`  🔄 Normalized: "${originalArticle}" → "${finalArticleNum}"`);
        }
    }
    
    // Перевірка в базі даних
    const inDatabase = regulationArticles[finalArticleNum] !== undefined;
    console.log(`  📚 In database: ${inDatabase ? '✅ YES' : '❌ NO'}`);
    
    if (!inDatabase && finalArticleNum !== 'NOTA') {
        console.log(`  ⚠️ Article "${finalArticleNum}" not found in database!`);
        
        // Спробуємо знайти схожі
        const similar = Object.keys(regulationArticles).filter(k => 
            k.includes(finalArticleNum) || finalArticleNum.includes(k)
        );
        if (similar.length > 0) {
            console.log(`  💡 Similar articles in DB: ${similar.join(', ')}`);
        }
    }
    
    console.log(`  ✅ Final result: Article ${finalArticleNum}`);
});

console.log('\n\n📊 Database statistics:');
console.log(`  Total articles: ${Object.keys(regulationArticles).length}`);
console.log(`  Article keys: ${Object.keys(regulationArticles).join(', ')}`);
