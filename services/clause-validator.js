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
    
    // Проблеми стану — основні
    /não\s+(?:é|está)/i,
    /deficient/i,
    /inadequad[oa]/i,
    /danificad[oa]/i,
    /insuficient/i,
    /inapropriado/i,
    /incorreto/i,
    /não\s+(?:são|estão)/i,
    
    // Проблеми стану — розширені
    /(?:mau\s+estado|deteriorad[oa]|desgastad[oa])/i,
    /(?:oxidado|ferruge[mn]|corroíd[oa])/i,
    /(?:part(?:ido|ida)|rach(?:ado|ada)|quebrad[oa])/i,
    /(?:avari[ae]d[oa]|estragad[oa])/i,
    /(?:obstruíd[oa]|bloquead[oa])/i,
    
    // Проблеми функціональності
    /não\s+funciona/i,
    /não\s+actua/i,
    /não\s+opera/i,
    /inoperante/i,
    /actua\s+com/i,  // "actua com o contrapeso assente" = проблема
    /n[ãa]o\s+accion/i,
    /inoperacion/i,
    
    // Проблеми захисту та безпеça
    /não\s+(?:protegido|resguardado|seguro)/i,
    /(?:desprotegido|não.*resguardadas?)/i,
    /não\s+devidamente/i,
    /sem\s+(?:proteção|protecção|resguardo|sinalização|dispositivo)/i,
    /sem\s+(?:luz|iluminação|emergência)\b/i,

    // Проблеми розмірів та габаритів
    /(?:dimens[õo]es|largura|altura|dist[âa]ncia)\s+(?:insuficiente|inadequada)/i,
    /(?:tem|possui)\s+\d+[,.]?\d*\s*(?:m|cm|mm)/i,
    /(?:excede[m]?|superior\s+a)\s+\d/i,
    /inferior\s+a\s+\d/i,
    /folga\s+(?:excessive|excessiva|inadequada|superior)/i,
    
    // Проблеми відповідності специфікаціям
    /fora\s+das?\s+(?:especificações|normas|regulamento)/i,
    /fora\s+d[oa]\s+(?:prazo|período|limite)/i,
    /não\s+(?:laminad[oa]|temperad[oa]|homologad[oa]|certificad[oa])/i,
    /não\s+conform(?:e|idade)/i,
    /incumpre/i,
    
    // Проблеми позначення та сигналізації
    /não\s+sinalizado/i,
    /sinalética.*(?:deteriorad|desaparecid|ilegível|ausente)/i,
    /sinalização\s+(?:inadequada|ausente|deficiente|ilegível)/i,
    
    // Проблеми доступу та ескейпу
    /(?:saída\s+de\s+emergência|escotilha).*(?:não|sem|ausente|avari)/i,
    /acesso\s+(?:impedido|obstruído|impossível)/i
];

/**
 * Артикули, порушення яких майже завжди технічно валідні.
 * Для цих артикулів не вимагаємо точного match у technicalTerms,
 * якщо violation має достатній опис і чіткий CX-тип.
 */
const articleWhitelist = new Set([
    '7', '8', '9', '10', '11', '12', '13', '14', '15',  // Порти, кабіна, захист
    '22', '23', '24', '25', '26',                          // Безпека
    '30', '31', '32', '33', '34', '35',                    // Електричні
    '45', '46', '47', '48', '49', '50',                    // Конструктив
    '60', '61', '62', '63', '64', '65',                    // Додаткові
    '74', '74.1', '74.2', '74.3',                          // Відповідність
    '86', '87', '88'                                        // Перевірки
]);

/**
 * Мінімальна довжина опису для whitelisted артикулів (менш строга)
 */
const WHITELIST_MIN_LENGTH = 15;

/**
 * Перевіряє чи є текст валідним порушенням
 * 
 * @param {string} classification - C1, C2 або C3
 * @param {string} articleNum - Номер статті (наприклад, "22", "74.2")
 * @param {string} description - Опис порушення
 * @param {Object} [options] - Опціональні параметри
 * @param {number} [options.confidence] - Довіра джерела (0-1). При >= 0.85 пом'якшуємо валідацію.
 * @returns {Object} { valid: boolean, reason: string }
 */
function isValidViolation(classification, articleNum, description, options = {}) {
    const confidence = options.confidence || 0.7;

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
    
    const minLength = articleWhitelist.has(articleNum) ? WHITELIST_MIN_LENGTH : 20;
    if (cleanDesc.length < minLength) {
        return { 
            valid: false, 
            reason: `Opção muito curta (${cleanDesc.length} chars, mínimo ${minLength})` 
        };
    }
    
    // 5. Перевірка на службові фрази (ПЕРШОЧЕРГОВО!)
    const firstPart = cleanDesc.substring(0, Math.min(cleanDesc.length, 200));
    
    for (const pattern of serviceTextPatterns) {
        if (pattern.test(firstPart)) {
            return { 
                valid: false, 
                reason: `Texto de serviço (contém: ${pattern.source.substring(0, 40)}...)` 
            };
        }
    }
    
    // 6. Перевірка на технічний зміст
    // ⭐ ПОСЛАБЛЕННЯ: для whitelisted артикулів або high-confidence джерел
    //    достатньо щоб опис не був службовим текстом
    const isWhitelisted = articleWhitelist.has(articleNum) || 
                          articleWhitelist.has(articleNum.split('.')[0]);
    const isHighConfidence = confidence >= 0.85;

    const hasTechnicalContent = technicalTerms.some(pattern => pattern.test(cleanDesc));
    
    if (!hasTechnicalContent && !isWhitelisted && !isHighConfidence) {
        // Останній шанс: перевіряємо чи є хоча б один технічний термін
        // в більш широкому розумінні (будь-яке заперечення + іменник)
        const hasNegation = /\bnão\b|\bnem\b|\bsem\b|\bjamais\b/i.test(cleanDesc);
        const hasNoun = /\b(?:porta|cabo|freio|motor|botão|painel|luz|iluminação|sensor|contato|proteção|sinalização|escotilha|balaustrada|ventilação|macacos?|amortecedor|limitador|parachoque|guia|car[ro]?ilho|cabina|caixa|sala|cubo|poço|pavimento|piso)\b/i.test(cleanDesc);
        
        if (!(hasNegation && hasNoun)) {
            return { 
                valid: false, 
                reason: 'Sem conteúdo técnico (sem descrição de problema específico)' 
            };
        }
    }
    
    // 7. Перевірка на мінімальну кількість слів
    const words = cleanDesc.split(/\s+/).filter(w => w.length > 2);
    const minWords = isWhitelisted ? 4 : 5;
    if (words.length < minWords) {
        return {
            valid: false,
            reason: `Palavras a menos (${words.length}, mínimo ${minWords})`
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
    articleWhitelist,
    ValidationStats
};
