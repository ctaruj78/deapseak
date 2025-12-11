#!/usr/bin/env node
/**
 * Тест визначення артикулів за змістом тексту
 */

// Імпортуємо функцію з unified-server.js
function detectArticleByContent(text) {
    const textLower = text.toLowerCase();
    
    // База знань: ключові слова → номер артикулу
    const articleDatabase = {
        'Art. 22': [
            'escada de acesso', 'acesso à casa das máquinas', 'acesso ao topo',
            'alçapão', 'contrabalançado', 'degrau', 'corrimão', 'pegas',
            'guarda-corpos', 'largura', 'inclinação', 'fixação'
        ],
        'Art. 74': [
            'fim de curso', 'dispositivo de segurança', 'contrapeso',
            'pára-choques', 'paragem', 'limite de curso', 'actuação'
        ],
        'Art. 85': [
            'peças salientes', 'máquinas', 'volantes', 'engrenagens',
            'correias', 'resguardadas', 'proteção de máquinas', 'polias'
        ],
        'Art. 6': [
            'porta de patamar', 'bloqueio', 'fechadura', 'sensor de porta',
            'contacto de porta', 'trinco'
        ],
        'Art. 12': [
            'travão', 'travagem', 'freio', 'sistema de travagem',
            'paragem de emergência'
        ],
        'Art. 35': [
            'iluminação', 'luz de emergência', 'iluminação da cabina',
            'fonte de luz', 'bateria de emergência'
        ],
        'Art. 45': [
            'pára-quedas', 'paraquedas', 'limitador de velocidade',
            'dispositivo de segurança', 'queda livre'
        ],
        'Art. 50': [
            'cabos', 'cabo de tração', 'desgaste', 'fios partidos',
            'suspensão', 'polias', 'tambor'
        ],
        'Art. 18': [
            'alarme', 'comunicação', 'telefone de emergência',
            'intercomunicador', 'botão de alarme'
        ],
        'Art. 25': [
            'documentação', 'manual', 'certificado', 'livro de registo',
            'relatório', 'ficha técnica'
        ],
        'Art. 8': [
            'ucm', 'unidade de comando', 'quadro elétrico',
            'armário de controlo', 'contactores'
        ],
        'Art. 15': [
            'sinalização', 'placa', 'identificação', 'marcação',
            'carga máxima', 'capacidade'
        ],
        'Art. 60': [
            'acessibilidade', 'braille', 'botões', 'altura de comando',
            'deficientes', 'largura de porta'
        ]
    };
    
    // Підрахунок збігів для кожного артикулу
    const scores = {};
    
    for (const [article, keywords] of Object.entries(articleDatabase)) {
        let score = 0;
        for (const keyword of keywords) {
            if (textLower.includes(keyword)) {
                score += keyword.split(' ').length;
            }
        }
        if (score > 0) {
            scores[article] = score;
        }
    }
    
    // Знаходимо артикул з найбільшою оцінкою
    if (Object.keys(scores).length > 0) {
        const bestMatch = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
        return { article: bestMatch[0], score: bestMatch[1], allScores: scores };
    }
    
    return null;
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║      🔍 ТЕСТ ВИЗНАЧЕННЯ АРТИКУЛІВ ЗА ЗМІСТОМ              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Тестові випадки з реальними порушеннями
const testCases = [
    {
        text: 'Não existe escada de acesso à casa das máquinas ou a existente não cumpre com os requisitos de segurança',
        expected: 'Art. 22'
    },
    {
        text: 'O acesso à casa das máquinas não é fácil e seguro. O alçapão não é contrabalançado.',
        expected: 'Art. 22'
    },
    {
        text: 'O dispositivo de fim de curso de segurança actua com o contrapeso assente sobre os pára-choques.',
        expected: 'Art. 74'
    },
    {
        text: 'As peças salientes das máquinas, nomeadamente volantes, engrenagens e correias, não estão devidamente resguardadas.',
        expected: 'Art. 85'
    },
    {
        text: 'O bloqueio da porta de patamar não funciona corretamente.',
        expected: 'Art. 6'
    },
    {
        text: 'Sistema de travagem defeituoso e não responde adequadamente.',
        expected: 'Art. 12'
    },
    {
        text: 'Falta iluminação de emergência na cabina do elevador.',
        expected: 'Art. 35'
    },
    {
        text: 'Cabos de suspensão apresentam desgaste excessivo e fios partidos.',
        expected: 'Art. 50'
    },
    {
        text: 'Alarme de emergência não funcional e sem comunicação.',
        expected: 'Art. 18'
    },
    {
        text: 'Falta documentação técnica e certificado de conformidade.',
        expected: 'Art. 25'
    }
];

let passed = 0;
let failed = 0;

console.log('📝 Тестування визначення артикулів:\n');

testCases.forEach((testCase, index) => {
    const result = detectArticleByContent(testCase.text);
    const detected = result ? result.article : 'Não detectado';
    const isCorrect = detected === testCase.expected;
    
    if (isCorrect) {
        passed++;
        console.log(`✅ Тест ${index + 1}: ${detected} (оцінка: ${result.score})`);
    } else {
        failed++;
        console.log(`❌ Тест ${index + 1}: очікувалось ${testCase.expected}, отримано ${detected}`);
        if (result) {
            console.log(`   Всі оцінки:`, result.allScores);
        }
    }
    console.log(`   Текст: ${testCase.text.substring(0, 80)}...`);
    console.log('');
});

console.log('═'.repeat(62));
console.log(`📊 Результати: ${passed} пройдено, ${failed} провалено`);
console.log('═'.repeat(62));

if (failed === 0) {
    console.log('🎉 ВСІ ТЕСТИ ПРОЙДЕНО!');
} else {
    console.log(`⚠️ ${failed} тестів провалено`);
}

console.log('\n💡 Приклад використання:');
console.log('   Текст: "escada de acesso defeituosa"');
const example = detectArticleByContent('escada de acesso defeituosa');
console.log('   Результат:', example);
