/**
 * ВАЛІДАТОР КЛАУЗ - Відокремлює реальні порушення від службових текстів
 * 
 * Проблема: AI розпізнавав загальні тексти як порушення
 * Рішення: Строга валідація структури порушення
 * 
 * Автор: GitHub Copilot
 * Дата: 2026-01-01
 */

/**
 * Патерни службових текстів (НЕ є порушеннями)
 */
const serviceTextPatterns = [
    // Фрази про виявлення клауз
    /foram\s+dete[tc]tadas\s+cl[áa]usulas/i,
    /foram\s+dete[tc]tadas\s+cl[áa]usulas\s+tipo/i,
    /detectadas\s+cl[áa]usulas/i,
    /dete[tc]tada[s]?\s+cl[áa]usulas?\s+(?:do\s+)?tipo/i,
    
    // Терміни та інструкції
    /regularizar\s+no\s+prazo/i,
    /prazo\s+(?:de|m[áa]ximo)/i,
    /no\s+prazo\s+de\s+\d+\s+dias/i,
    /prazo\s+m[áa]ximo\s+de\s+\d+/i,
    
    // Описи класифікацій
    /correspondem\s+a\s+situa[çc][õo]es/i,
    /situa[çc][õo]es\s+de\s+(?:elevado|m[ée]dio|baixo)\s+risco/i,
    /estas\s+cl[áa]usulas/i,
    /as\s+cl[áa]usulas/i,
    /cl[áa]usulas?\s+(?:do\s+)?tipo\s+C[123]/i,
    
    // Результати інспекції
    /elevador\s+reprovado/i,
    /elevador\s+aprovado/i,
    /resultado\s+da\s+inspe[çc][ãa]o/i,
    /relat[óo]rio\s+de\s+inspe[çc][ãa]o/i,
    /este\s+relat[óo]rio/i,
    
    // Юридичні посилання
    /decreto[-\s]lei\s+n[º.]\s*\d+/i,
    /despacho\s+n[º.]\s*\d+/i,
    /conforme\s+(?:decreto|despacho)/i,
    /âmbito\s+do\s+decreto/i,
    /di[áa]rio\s+da\s+rep[úu]blica/i,
    
    // Інструкції інспектора
    /caso\s+tenham\s+sido/i,
    /devem\s+ser\s+(?:corrigidas|executadas|removidas)/i,
    /obrigam\s+[àa]\s+imobiliza[çc][ãa]o/i,
    /n[ãa]o\s+obrigam\s+[àa]/i,
    /dão\s+lugar\s+a\s+uma\s+reinspe[çc][ãa]o/i,
    /remo[çc][ãa]o\s+destas\s+n[ãa]o\s+conformidades/i,
    
    // Технічні примітки загального характеру
    /^observa[çc][ãa]o\s+geral/i,
    /^nota\s*:?\s*$/i,
    /^remo[çc][ãa]o\s+destas/i,
    /constatações\s+do\s+inspector/i,
    /momento\s+da\s+inspe[çc][ãa]o/i,
    
    // Пояснення ризиків (метатекст)
    /para\s+a\s+seguran[çc]a\s+de\s+pessoas/i,
    /pessoas\s+e\s+bens/i,
    /seguran[çc]a\s+de\s+pessoas\s+e\s+bens/i
];

/**
 * Технічні терміни, які мають бути в реальному порушенні
 */
const technicalTerms = [
    // Проблеми існування
    /não\s+existe/i,
    /ausên(?:cia|te)/i,
    /falta/i,
    /inexist(?:ente|ência)/i,
    
    // Проблеми відповідності
    /não\s+cumpre/i,
    /não\s+está\s+conforme/i,
    /não\s+respeita/i,
    
    // Проблеми стану
    /não\s+(?:é|está)/i,
    /deficient/i,
    /inadequado/i,
    /danificado/i,
    /insuficient/i,
    /inapropriado/i,
    /incorreto/i,
    /não\s+(?:são|estão)/i,
    
    // Проблеми функціональності
    /não\s+funciona/i,
    /não\s+actua/i,
    /não\s+opera/i,
    /inoperante/i,
    /actua\s+com/i,  // "actua com o contrapeso assente" = проблема
    
    // Проблеми захисту
    /não\s+(?:protegido|resguardado|seguro)/i,
    /(?:desprotegido|não.*resguardadas)/i,
    /não\s+devidamente/i,
    
    // Розміри та габарити
    /(?:dimens[õo]es|largura|altura|distância)\s+(?:insuficiente|inadequada)/i,
    /(?:tem|possui)\s+\d+[,.]?\d*\s*(?:m|cm|mm)/i
];

/**
 * Перевіряє чи є текст валідним порушенням
 * 
 * @param {string} classification - C1, C2 або C3
 * @param {string} articleNum - Номер статті (наприклад, "22", "74.2")
 * @param {string} description - Опис порушення
 * @returns {Object} { valid: boolean, reason: string }
 */
function isValidViolation(classification, articleNum, description) {
    // 1. Перевірка класифікації
    if (!classification || !/^C[123]$/i.test(classification.trim())) {
        return { 
            valid: false, 
            reason: 'Невалідна класифікація (має бути C1, C2 або C3)' 
        };
    }
    
    // 2. Перевірка номера статті (ОБОВ'ЯЗКОВО!)
    if (!articleNum || articleNum === 'NOTA' || articleNum === '0' || articleNum === null) {
        return { 
            valid: false, 
            reason: 'Відсутній номер артикулу (порушення має містити Art. XX)' 
        };
    }
    
    // 3. Перевірка що номер статті - це число
    if (!/^\d+/.test(articleNum.toString())) {
        return {
            valid: false,
            reason: 'Номер артикулу має починатися з цифри'
        };
    }
    
    // 4. Перевірка довжини опису
    let cleanDesc = description.replace(/\s+/g, ' ').trim();
    
    // ⭐ КРИТИЧНО: Видаляємо постфікси службових текстів В КІНЦІ
    // Деякі реальні порушення мають службовий текст ПІСЛЯ технічного опису
    const serviceTextSuffixes = [
        /RESULTADO\s+DA\s+INSPE[ÇC][ÃA]O.*$/i,
        /Este\s+Relat[óo]rio.*$/i,
        /reflecte\s+as\s+constata[çc][õo]es.*$/i,
        /âmbito\s+do\s+Decreto[-\s]Lei.*$/i,
        /Elevador\s+(?:Aprovado|Reprovado).*$/i
    ];
    
    for (const suffix of serviceTextSuffixes) {
        cleanDesc = cleanDesc.replace(suffix, '').trim();
    }
    
    if (cleanDesc.length < 20) {
        return { 
            valid: false, 
            reason: `Опис занадто короткий (${cleanDesc.length} символів, мінімум 20)` 
        };
    }
    
    // 5. Перевірка на службові фрази (ПЕРШОЧЕРГОВО!)
    // ВАЖЛИВО: Перевіряємо тільки ПОЧАТОК і СЕРЕДИНУ тексту, не кінець!
    // Деякі реальні порушення містять службовий текст В КІНЦІ
    const firstPart = cleanDesc.substring(0, Math.min(cleanDesc.length, 200)); // Перші 200 символів
    
    for (const pattern of serviceTextPatterns) {
        if (pattern.test(firstPart)) {
            return { 
                valid: false, 
                reason: `Службовий текст (містить: ${pattern.source.substring(0, 40)}...)` 
            };
        }
    }
    
    // 6. Перевірка на технічний зміст
    const hasTechnicalContent = technicalTerms.some(pattern => pattern.test(cleanDesc));
    
    if (!hasTechnicalContent) {
        return { 
            valid: false, 
            reason: 'Відсутній технічний зміст (немає опису конкретної проблеми)' 
        };
    }
    
    // 7. Перевірка на мінімальну кількість слів
    const words = cleanDesc.split(/\s+/).filter(w => w.length > 2);
    if (words.length < 5) {
        return {
            valid: false,
            reason: `Занадто мало слів (${words.length}, мінімум 5)`
        };
    }
    
    // ✅ Всі перевірки пройдені
    return { valid: true };
}

/**
 * Статистика валідації (для дебагу)
 */
class ValidationStats {
    constructor() {
        this.total = 0;
        this.valid = 0;
        this.rejected = {};
    }
    
    add(isValid, reason = null) {
        this.total++;
        if (isValid) {
            this.valid++;
        } else {
            this.rejected[reason] = (this.rejected[reason] || 0) + 1;
        }
    }
    
    report() {
        console.log('\n📊 СТАТИСТИКА ВАЛІДАЦІЇ КЛАУЗ:');
        console.log(`   Всього перевірено: ${this.total}`);
        console.log(`   ✅ Валідні: ${this.valid} (${((this.valid/this.total)*100).toFixed(1)}%)`);
        console.log(`   ❌ Відхилені: ${this.total - this.valid} (${(((this.total-this.valid)/this.total)*100).toFixed(1)}%)\n`);
        
        if (Object.keys(this.rejected).length > 0) {
            console.log('   Причини відхилення:');
            Object.entries(this.rejected)
                .sort((a, b) => b[1] - a[1])
                .forEach(([reason, count]) => {
                    console.log(`     • ${reason}: ${count}`);
                });
        }
        console.log('');
    }
}

module.exports = {
    isValidViolation,
    serviceTextPatterns,
    technicalTerms,
    ValidationStats
};
