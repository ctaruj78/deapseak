/**
 * =====================================================
 * СПЕЦІАЛІЗОВАНИЙ ПАРСЕР ДЛЯ ПОРТУГАЛЬСЬКИХ ЗВІТІВ ІНСПЕКЦІЇ
 * =====================================================
 * 
 * Підтримує:
 * ✅ Bureau Veritas Rinave (формат NB/DT-XXXX)
 * ✅ CML Lisboa (Câmara Municipal de Lisboa)
 * ✅ Інші португальські інспекційні органи
 * 
 * ОСОБЛИВОСТІ:
 * ✅ Розпізнає різні формати звітів
 * ✅ Правильно обробляє "NOTA DE CLÁUSULAS"
 * ✅ Не плутає пояснення класифікацій з порушеннями
 * ✅ Витягує інформацію з таблиць
 * ✅ Підтримує португальські адреси та символи
 */

const fs = require('fs');
const pdfParse = require('pdf-parse');

// Імпортуємо базу даних артикулів
const regulationArticles = require('./regulation-articles-complete');

// Імпортуємо matchByDescriptionText з окремого модуля
const { matchByDescriptionText } = require('./violation-keywords');

/**
 * BASE DE DADOS DE KEYWORDS DE VIOLAÇÕES
 * Permite reconhecer porушення pelo texto da descrição,
 * mesmo quando o número do artigo está em falta ou ilegível.
 *
 * Ordenação: do mais específico para o mais genérico.
 * Cada entrada pode ter vários 'patterns' — basta um bater.
 */
const violationKeywordsDB = [
    // --- LIMITADOR DE VELOCIDADE ---
    {
        patterns: [/limitador\s+de\s+velocidade/i],
        article: '9.9', classification: 'C3',
        title: 'Limitador de velocidade — estado de conservação',
        why: 'O limitador oxidado pode não acionar o para-quedas em caso de sobrevelocidade.',
        solution: 'Limpar, lubrificar e verificar calibração. Substituir se necessário.',
        urgency: 'MODERADO'
    },
    // --- BALAUSTRADA / COBERTURA DA CABINA ---
    {
        patterns: [/balaustrada/i, /cobertura\s+da\s+cabina/i],
        article: '8.3.2', classification: 'C3',
        title: 'Balaustrada na cobertura da cabina',
        why: 'Sem balaustrada, o técnico pode cair durante trabalhos no teto da cabina.',
        solution: 'Instalar balaustrada conforme EN 81-20 §5.2.6.',
        urgency: 'MODERADO'
    },
    // --- PAVIMENTO / PISO DA CABINA ---
    {
        patterns: [/pavimento\s+da\s+cabina.*danificad/i, /piso\s+da\s+cabina.*danificad/i, /pavimento.*cabina.*(danificad|deteriorad|partido)/i],
        article: '8.3.2', classification: 'C3',
        title: 'Pavimento da cabina danificado',
        why: 'Piso irregular aumenta risco de queda dos utilizadores, especialmente idosos.',
        solution: 'Reparar ou substituir o revestimento do piso da cabina.',
        urgency: 'BAIXO'
    },
    // --- CABOS DE SUSPENSÃO ---
    {
        patterns: [/cabos?\s+de\s+suspens[ãa]o.*desgaste/i, /cabos?\s+de\s+suspens[ãa]o.*partid/i, /cabos?\s+de\s+suspens[ãa]o.*fios?\s+partid/i, /filamentos?\s+partid/i],
        article: '9.2.2', classification: 'C3',
        title: 'Cabos de suspensão — sinais de desgaste',
        why: 'Fios/filamentos partidos indicam degradação. Pode levar a rutura total do cabo.',
        solution: 'Inspeção detalhada por técnico certificado. Substituir conjunto de cabos se necessário.',
        urgency: 'MODERADO'
    },
    {
        patterns: [/cabos?\s+de\s+suspens[ãa]o/i, /cabo.*contrapeso.*desgaste/i],
        article: '10', classification: 'C2',
        title: 'Cabos de suspensão',
        why: 'Rutura de cabo é acidente fatal.',
        solution: 'Substituição conforme EN 81 §9.1.',
        urgency: 'MODERADO'
    },
    // --- ILUMINAÇÃO ACESSO CASA DE MÁQUINAS (mais específico — antes da caixa) ---
    {
        patterns: [
            /ilumina[çc][ãa]o\s+de\s+acesso\s+a\s+casa\s+de\s+m[áa]quinas/i,
            /ilumina[çc][ãa]o.*acesso.*casa\s+de\s+m[áa]quinas/i,
            /pontos?\s+de\s+luz\s+inoperacion.*casa\s+de\s+m[áa]quinas/i
        ],
        article: '6.3.6', classification: 'C3',
        title: 'Iluminação de acesso à casa de máquinas — pontos inoperacionais',
        why: 'Iluminação insuficiente no acesso à casa de máquinas aumenta risco de queda e acidente dos técnicos durante manutenção ou emergência.',
        solution: 'Repor lâmpadas inoperacionais no corredor/acesso à casa de máquinas. Verificar circuito elétrico e disjuntor.',
        urgency: 'MODERADO'
    },
    // --- ILUMINAÇÃO DA CAIXA ---
    {
        patterns: [/ilumina[çc][ãa]o\s+da\s+caixa.*inoperacion/i, /luz.*caixa.*inoperacion/i, /ilumina[çc][ãa]o.*caixa.*avari/i, /na\s+ilumina[çc][ãa]o\s+da\s+caixa/i],
        article: '5.9', classification: 'C3',
        title: 'Iluminação da caixa — pontos inoperacionais',
        why: 'Iluminação insuficiente dificulta trabalhos de manutenção e emergências.',
        solution: 'Repor lâmpadas inoperacionais. Verificar circuito elétrico.',
        urgency: 'BAIXO'
    },
    // --- ILUMINAÇÃO CABINA ---
    {
        patterns: [/ilumina[çc][ãa]o\s+(?:da\s+)?cabina.*inoperacional/i, /luz.*cabina.*avari/i],
        article: '15', classification: 'C2',
        title: 'Iluminação da cabina',
        why: 'Pânico e quedas em caso de falha total de iluminação.',
        solution: 'Substituir lâmpadas e verificar bateria de emergência.',
        urgency: 'MODERADO'
    },
    // --- PORTA DE PATAMAR ---
    {
        patterns: [/porta\s+de\s+patamar.*n[ãa]o\s+fecha/i, /porta.*patamar.*avari/i, /porta.*patamar.*defeito/i],
        article: '7', classification: 'C1',
        title: 'Porta de patamar',
        why: 'Porta aberta com cabina ausente = queda na caixa.',
        solution: 'Reparar mecanismo de fecho e bloqueio imediatamente.',
        urgency: 'CRÍTICO'
    },
    // --- BLOQUEIO / FECHO PORTAS ---
    {
        patterns: [/bloqueio.*porta/i, /fecho.*porta.*avari/i, /contato.*porta.*defeito/i],
        article: '12', classification: 'C1',
        title: 'Bloqueio eletromecânico das portas',
        why: 'Porta abre com cabina em movimento = esmagamento/queda.',
        solution: 'Substituir contatos e verificar intertravamento.',
        urgency: 'CRÍTICO'
    },
    // --- PARA-QUEDAS ---
    {
        patterns: [/para[-\s]quedas.*avari/i, /para[-\s]quedas.*defeito/i, /para[-\s]quedas.*inoperacional/i],
        article: '13', classification: 'C1',
        title: 'Para-quedas',
        why: 'Sem para-quedas funcional a queda livre é fatal.',
        solution: 'Reparação ou substituição imediata. Imobilizar elevador.',
        urgency: 'CRÍTICO'
    },
    // --- NIVELAMENTO ---
    {
        patterns: [/nivelamento.*incorreto/i, /n[ãa]o\s+nivela/i, /desnível.*cabina/i, /sobrenivelamento/i],
        article: '23', classification: 'C2',
        title: 'Nivelamento da cabina',
        why: 'Degrau excessivo = quedas, especialmente em idosos e deficientes.',
        solution: 'Ajustar sistema de nivelamento (tolerância ±15 mm).',
        urgency: 'MODERADO'
    },
    // --- ALARME / COMUNICAÇÃO ---
    {
        patterns: [/bot[ãa]o\s+de\s+alarme.*defeito/i, /alarme.*inoperacional/i, /intercomunicador.*avari/i, /tel[ée]fone.*cabina.*n[ãa]o\s+func/i],
        article: '18', classification: 'C1',
        title: 'Sistema de alarme e comunicação',
        why: 'Pessoa encravada não consegue pedir socorro.',
        solution: 'Reparar botão de alarme e testar comunicação bidirecional.',
        urgency: 'CRÍTICO'
    },
    // --- SOBRECARGA ---
    {
        patterns: [/dispositivo\s+de\s+sobrecarga.*avari/i, /sobrecarga.*n[ãa]o\s+func/i],
        article: '40', classification: 'C2',
        title: 'Dispositivo de sobrecarga',
        why: 'Sobrecarga não detetada pode levar a rutura de cabos.',
        solution: 'Calibrar ou substituir sensor de peso.',
        urgency: 'MODERADO'
    },
    // --- VENTILAÇÃO ---
    {
        patterns: [/ventila[çc][ãa]o.*insuficiente/i, /ventila[çc][ãa]o.*cabina.*defeito/i],
        article: '16', classification: 'C2',
        title: 'Ventilação da cabina',
        why: 'Asfixia em caso de paragem prolongada.',
        solution: 'Garantir aberturas mínimas conforme EN 81.',
        urgency: 'MODERADO'
    },
    // --- PLACA DE IDENTIFICAÇÃO ---
    {
        patterns: [/placa.*carga\s+m[áa]xima/i, /placa.*identifica[çc][ãa]o.*ausente/i, /carga\s+m[áa]xima.*n[ãa]o\s+indicad/i],
        article: '20', classification: 'C3',
        title: 'Placa de identificação',
        why: 'Utilizadores não conhecem a carga máxima e podem sbrecarregar o elevador.',
        solution: 'Colocar placa legível com carga máxima e número de pessoas.',
        urgency: 'BAIXO'
    },
    // --- ILUMINAÇÃO CASA DE MÁQUINAS ---
    {
        patterns: [/ilumina[çc][ãa]o.*casa\s+de\s+m[áa]quinas/i, /luz.*casa\s+de\s+m[áa]quinas.*avari/i],
        article: '27', classification: 'C3',
        title: 'Iluminação da casa de máquinas',
        why: 'Acidentes de trabalho durante manutenção.',
        solution: 'Repor iluminação mínima 200 lux.',
        urgency: 'BAIXO'
    },
    // --- FREIO ---
    {
        patterns: [/freio.*avari/i, /freq.*n[ãa]o\s+func/i, /sistema\s+de\s+travagem.*defeito/i],
        article: '11', classification: 'C1',
        title: 'Sistema de travagem (freio)',
        why: 'Elevador sem freio funcional não consegue parar.',
        solution: 'Imobilizar e reparar imediatamente.',
        urgency: 'CRÍTICO'
    },
    // --- ACESSO CASA DE MÁQUINAS ---
    {
        patterns: [/porta\s+casa\s+de\s+m[áa]quinas.*n[ãa]o\s+fecha/i, /acesso.*casa\s+de\s+m[áa]quinas.*n[ãa]o\s+protegid/i],
        article: '26', classification: 'C2',
        title: 'Acesso à casa de máquinas',
        why: 'Acesso não autorizado a área de alta tensão e componentes em movimento.',
        solution: 'Instalar porta com fechadura e placa de aviso.',
        urgency: 'MODERADO'
    },
    // --- LIVRO DE REGISTOS ---
    {
        patterns: [/livro\s+de\s+registos.*em\s+falta/i, /livro\s+de\s+registos.*n[ãa]o\s+apresentad/i, /registos\s+de\s+manuten[çc][ãa]o.*n[ãa]o\s+apresentad/i, /livro\s+de\s+(?:registos|ocorr[êe]ncias).*atualizado/i, /livro\s+de\s+registos.*n[ãa]o\s+(?:dispon[íi]vel|exibid)/i],
        article: '47', classification: 'C3',
        title: 'Livro de registos de manutenção',
        why: 'Sem rastreabilidade da manutenção.',
        solution: 'Manter livro atualizado com todas as intervenções.',
        urgency: 'BAIXO'
    },
    // --- SINALIZADORES DE FASE ---
    {
        patterns: [
            /sinalizadores?\s+de\s+(?:presen[çc]a\s+de\s+)?fase/i,
            /indicadores?\s+de\s+fase.*inoperacion/i,
            /quadro\s+el[eé]ctrico.*fase.*inoperacion/i
        ],
        article: '13.1.1', classification: 'C3',
        title: 'Sinalizadores de presença de fase — inoperacionais',
        why: 'Sem indicação de fase no quadro elétrico, o técnico não consegue avaliar se o circuito está energizado, aumentando risco de eletrocussão.',
        solution: 'Substituir sinalizadores/lâmpadas piloto de presença de fase no quadro elétrico da casa de máquinas.',
        urgency: 'MODERADO'
    },
    // --- ALTURA INFERIOR A 1.80m NA CASA DE MÁQUINAS ---
    {
        patterns: [
            /altura\s+inferior\s+a\s+1[,.]80/i,
            /zonas?\s+de\s+circula[çc][ãa]o.*altura\s+inferior/i,
            /altura\s+livre.*inferior.*1[,.]80/i,
            /p[eé]-direito.*inferior.*1[,.]80/i
        ],
        article: '6.3.2.2', classification: 'C3',
        title: 'Zona de circulação/trabalho na casa de máquinas com altura < 1,80 m',
        why: 'Altura insuficiente obriga técnicos a trabalhar em posição forçada, aumentando risco de lesões, colisões e acidentes durante manutenção.',
        solution: 'Sinalizar zona com aviso de altura reduzida. Avaliar se é possível estruturalmente elevar o teto. Usar EPI adequado (capacete).',
        urgency: 'BAIXO'
    },
    // --- NÍVEL DE ILUMINAÇÃO CABINA < 50 LUX ---
    {
        patterns: [
            /n[ií]vel\s+de\s+ilumina[çc][ãa]o\s+da\s+cabina/i,
            /ilumina[çc][ãa]o.*cabina.*inferior\s+a\s+50\s+lux/i,
            /50\s+lux/i,
            /lux.*[óo]rg[ãa]os\s+de\s+comando/i
        ],
        article: '8.17.1', classification: 'C3',
        title: 'Nível de iluminação da cabina inferior a 50 lux',
        why: 'Iluminação abaixo de 50 lux na cabina dificulta a leitura dos botões de comando e aumenta risco de queda, especialmente para idosos e deficientes visuais.',
        solution: 'Substituir lâmpada(s) da cabina por solução de maior potência (LED). Verificar que o nível atinge mínimo 50 lux no pavimento e junto dos órgãos de comando.',
        urgency: 'BAIXO'
    },
    // --- OXIDAÇÃO GENÉRICA ---
    {
        patterns: [/oxidado/i, /corros[ãa]o/i, /ferrugem/i],
        article: null, classification: 'C3',
        title: 'Componente com oxidação/corrosão',
        why: 'Oxidação enfraquece componentes estruturais e de segurança.',
        solution: 'Tratar superfície, aplicar anti-corrosivo. Avaliar necessidade de substituição.',
        urgency: 'BAIXO'
    }
];

// matchByDescriptionText vem do módulo violation-keywords (importado acima)

/**
 * ВИТЯГУВАННЯ МЕТАДАНИХ - УНІВЕРСАЛЬНИЙ
 */
function extractMetadata(text) {
    const metadata = {
        reportNumber: null,
        date: null,
        liftId: null,
        location: null,
        inspector: null,
        company: null,
        owner: null,
        maintenanceCompany: null,
        installationNumber: null,
        processNumber: null,
        validUntil: null
    };
    
    console.log('\n🔍 Extracting Metadata...');
    
    // Визначаємо тип звіту
    if (text.includes('BUREAU VERITAS')) {
        metadata.company = 'BUREAU VERITAS RINAVE';
    } else if (text.includes('Câmara Municipal de Lisboa') || text.includes('CML')) {
        metadata.company = 'Câmara Municipal de Lisboa';
    } else if (text.includes('APCER')) {
        metadata.company = 'APCER';
    } else if (/\bGATECI\b/i.test(text)) {
        metadata.company = 'GATECI';
    } else if (/\bCERTIEL\b/i.test(text)) {
        metadata.company = 'CERTIEL';
    } else if (/\bNOMINARE\b/i.test(text)) {
        metadata.company = 'NOMINARE';
    }
    
    console.log('  📋 Company:', metadata.company || 'Unknown');
    
    // 1. НОМЕР ЗВІТУ - різні формати
    const reportPatterns = [
        /Relatório\s+n[ºo.]\s*([A-Z]{2}\d{4}-\d{3,6}-\d{2}-\d{2})/i, // Bureau Veritas: NB2022-26981-01-01 (5-digit middle)
        /CML\/(\d+\/\d+)/i, // CML: CML/3599/6599
        /Processo[:\s]+([A-Z0-9\/-]+)/i // Generic: Processo: 371-11.05/002019
    ];
    
    for (const pattern of reportPatterns) {
        const match = text.match(pattern);
        if (match) {
            metadata.reportNumber = match[1];
            console.log('  ✅ Report Number:', metadata.reportNumber);
            break;
        }
    }
    
    // 2. ДАТА ІНСПЕКЦІЇ - різні формати
    const datePatterns = [
        /Data\s+da\s+Inspe[çc][çc]?[ãa]o\s*[:\s]{1,30}(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i, // DD/MM/YYYY or DD-MM-YYYY (wide whitespace)
        /Data\s+da\s+Inspe[çc][çc]?[ãa]o\s*[:\s]{1,30}(\d{4}[\/\-]\d{2}[\/\-]\d{2})/i, // YYYY/MM/DD or YYYY-MM-DD
        /Data\s+da\s+Inspe[çc][çc]?[ãa]o\s*[:\s]{1,30}(\d{2}\s+de\s+\w+\s+de\s+\d{4})/i, // 30 de Junho de 2025
        /Inspe[çc][çc]?[ãa]o\s+realizada\s*(?:em|a)?\s*[:\s]{0,10}(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /data\s*(?:de\s+emiss[ãa]o|de\s+inspe[çc][ãa]o)?\s*[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /(\d{2}\s+de\s+\w+\s+de\s+\d{4})/i, // 30 de Junho de 2025 (anywhere)
        /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/, // Будь-яка дата YYYY/MM/DD or YYYY-MM-DD
        /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/ // Будь-яка дата DD/MM/YYYY or DD-MM-YYYY
    ];
    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            metadata.date = match[1];
            console.log('  ✅ Date:', metadata.date);
            break;
        }
    }
    
    // 3. НОМЕР УСТАНОВКИ (Installation Number)
    const installationMatch = text.match(/Instala[çc][ãa]o\s+n[ºo.]\s*(\d+[-\/]\d+[-\/\d]*)/i);
    if (installationMatch) {
        metadata.installationNumber = installationMatch[1];
        metadata.liftId = installationMatch[1]; // Використовуємо як ID ліфту
        console.log('  ✅ Installation No:', metadata.installationNumber);
    }
    
    // 4. НОМЕР ПРОЦЕСУ (may start with letters e.g. CML-14267-28770)
    const processMatch = text.match(/Processo\s+n[ºo.]\s*([A-Z0-9][A-Z0-9\-\/]+)/i);
    if (processMatch) {
        metadata.processNumber = processMatch[1].trim();
        // Also use as installationNumber for lift auto-match if not already set
        if (!metadata.installationNumber) {
            metadata.installationNumber = metadata.processNumber;
            metadata.liftId = metadata.processNumber;
        }
        console.log('  ✅ Process No:', metadata.processNumber);
    }

    // 4b. CERTIFICADO — n.º CML-... (validade + installationNumber fallback)
    const certInstMatch = text.match(/n\.º\s*([A-Z]{3}-\d{4,}-\d{4,})/i);
    if (certInstMatch && !metadata.installationNumber) {
        metadata.installationNumber = certInstMatch[1].trim();
        metadata.liftId = metadata.installationNumber;
        console.log('  ✅ Installation No (cert):', metadata.installationNumber);
    }
    // 4c. Validade / Próxima inspecção (valid until) — multiple formats
    const validUntilPatterns = [
        /Validade\s*[:\s]+(\d{4}[\/\-]\d{2}[\/\-]\d{2})/i,              // YYYY/MM/DD or YYYY-MM-DD
        /Validade\s*[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,              // DD/MM/YYYY or DD-MM-YYYY
        /V[aá]lid[ao]\s+at[eé]\s*[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /Pr[oó]xima\s+Inspe[çc][çc]?[ãa]o\s*[:\s]{1,30}(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /Pr[oó]xima\s+Inspe[çc][çc]?[ãa]o\s*[:\s]{1,30}(\d{4}[\/\-]\d{2}[\/\-]\d{2})/i,
        /Data\s+da\s+pr[oó]xima\s+inspe[çc][çc]?[ãa]o\s*[:\s]{1,30}(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /Prazo\s*(?:de\s+validade)?\s*[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ];
    for (const vp of validUntilPatterns) {
        const vm = text.match(vp);
        if (vm) {
            metadata.validUntil = vm[1];
            console.log('  ✅ Valid Until:', metadata.validUntil);
            break;
        }
    }
    
    // 5. ЛОКАЦІЯ - Bureau Veritas має таблицю
    const locationPatterns = [
        /Localiza[çc][ãa]o\s+da\s+instala[çc][ãa]o\s+(.+?)(?=C[óo]digo\s+Postal|Relatório|$)/is,
        /Local(?:iza[çc][ãa]o)?\s+(.+?)(?=\d{4}-\d{3}|C[óo]digo|$)/is
    ];
    for (const pattern of locationPatterns) {
        const match = text.match(pattern);
        if (match) {
            let location = match[1].trim()
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, ', ')
                .replace(/[\s,\.]+$/, '')  // trim trailing " ." or ", "
                .substring(0, 200);
            if (location.length >= 10) {
                metadata.location = location;
                console.log('  ✅ Location:', location.substring(0, 80));
                break;
            }
        }
    }
    
    // 6. ВЛАСНИК (Proprietário)
    const ownerMatch = text.match(/Propriet[áa]rio\s+(.+?)(?=Morada|Marca|$)/is);
    if (ownerMatch) {
        metadata.owner = ownerMatch[1].trim().replace(/\s+/g, ' ').substring(0, 100);
        console.log('  ✅ Owner:', metadata.owner.substring(0, 50));
    }
    
    // 7. КОМПАНІЯ ОБСЛУГОВУВАННЯ
    const maintenanceMatch = text.match(/Empresa\s+de\s+Manuten[çc][ãa]o\s+([A-ZÀ-Ú][^\n]{3,80})/i);
    if (maintenanceMatch) {
        metadata.maintenanceCompany = maintenanceMatch[1].trim();
        console.log('  ✅ Maintenance Company:', metadata.maintenanceCompany);
    }
    
    // 8. ІНСПЕКТОР — кілька форматів для BV/CML/GATECI/CERTIEL/APCER
    // Фрази висновку, які НЕ є іменами (GATECI/CERTIEL висновки)
    const bvInspectorRejectWords = /^(Nestas?|Estas?|Assim|Perante|Deste|Desta|Nessa|Neste|Tendo|Dado|Face|Atendendo|Considerando|Em\s+virtude|Em\s+face|Nos\s+termos|Pelo\s+exposto|Pelo\s+que|Em\s+cumprimento|De\s+acordo|Na\s+sequ[eê]ncia|n[ao]\s|em\s|d[aeo]\s)/i;
    const inspectorPatterns = [
        // Prefixed label forms (пріоритет — з двокрапкою або тире)
        /Inspe[ct]or\s+Respons[áa]vel\s*[:\-]\s*([A-ZÀ-Úa-záéíóúàâêôãõç][^\n,]{4,60})/i,
        /Inspe[ct]or\s*[:\-]\s*([A-ZÀ-Úa-záéíóúàâêôãõç][^\n,]{4,60})/i,
        /T[eé]cnico\s+Respons[áa]vel\s*[:\-]\s*([A-ZÀ-Úa-záéíóúàâêôãõç][^\n,]{4,60})/i,
        /Entidade\s+Inspetora(?:\s+Acreditada)?\s*[:\-]\s*([A-ZÀ-Úa-záéíóúàâêôãõç][^\n]{4,80})/i,
        /Technicien\s*[:\-]\s*([A-ZÀ-Úa-záéíóúàâêôãõç][^\n,]{4,60})/i,
        // BV signature block: date \n...\n  Name  ADMINISTRAÇÃO (or other all-caps entity)
        // Covers: "2022/11/11 \n\n\n  Pedro Marques  ADMINISTRAÇÃO..."
        /\d{4}\/\d{2}\/\d{2}\s+([A-ZÀ-Ú][a-záéíóúàâêôãõç]+\s+[A-ZÀ-Ú][a-záéíóúàâêôãõç]+)\s{2,}[A-ZÀÁÉÍÓÚÂÊÔÃÕ]{3}/,
        // Signature block: name before "Proprietário" — but NOT if the word before is "Inspector" (column header)
        /(?<!Inspector\s{1,5})([A-ZÀ-Ú][a-zà-ú]+\s+[A-ZÀ-Ú][a-zà-ú]+)\s+Propriet[áa]rio/i,
        // Fallback: company name (BV/GATECI/APCER/CERTIEL itself)
        /Entidade[^:\n]*[:\-]\s*([A-ZÀ-Ú][^\n]{4,60})/i
    ];
    for (const pattern of inspectorPatterns) {
        const match = text.match(pattern);
        if (match) {
            const candidate = match[1].trim().replace(/\s+/g, ' ').replace(/[;,.]+$/, '');
            // Reject conclusion phrases ("Nestas circunstâncias", "Assim,", etc.) and prepositions
            const notAName = /^(n[ao]\s|em\s|d[aeo]\s|para\s|pel[ao]s?\s|ao\s|à\s|os\s|as\s|um[a]?\s|este[s]?\s|esta\s|estas\s|não\s|que\s|sendo\s|por\s|com\s|após\s|antes\s|foram\s|situad|localiz|aquand|durante\s|moment)/i;
            if (candidate.length >= 4 && !/^\d/.test(candidate) && !/Data/i.test(candidate) &&
                !notAName.test(candidate) && !bvInspectorRejectWords.test(candidate)) {
                metadata.inspector = candidate.substring(0, 80);
                console.log('  ✅ Inspector:', metadata.inspector);
                break;
            }
        }
    }
    // Fallback to company if inspector still not found
    if (!metadata.inspector && metadata.company) {
        metadata.inspector = metadata.company;
    }

    // 9. CÓDIGO POSTAL e CIDADE — extrair da localização
    if (metadata.location) {
        const cpMatch = metadata.location.match(/(\d{4}[-\s]\d{3})/);
        if (cpMatch) metadata.postalCode = cpMatch[1].replace(/\s/, '-');

        // Cidade: palavra(s) UPPERCASE depois do código postal, ou antes de vírgula no início
        const cityAfterCp = metadata.location.match(/\d{4}[-\s]\d{3}[\s,]+([A-ZÀ-Úa-záéíóúàâêôãõç][^,\n]{2,40})/i);
        if (cityAfterCp) {
            metadata.city = cityAfterCp[1].trim().replace(/\s+/g, ' ');
        } else {
            // Try last token after comma
            const parts = metadata.location.split(',');
            const lastPart = parts[parts.length - 1].trim();
            if (lastPart.length > 2 && lastPart.length < 50 && !/\d{4}/.test(lastPart)) {
                metadata.city = lastPart.replace(/\s+/g, ' ');
            }
        }
        if (metadata.city) console.log('  ✅ City:', metadata.city);
        if (metadata.postalCode) console.log('  ✅ PostalCode (from location):', metadata.postalCode);
    }

    // Postal code fallback — scan full text directly for Portuguese format DDDD-DDD
    if (!metadata.postalCode) {
        // Prefer labeled form first
        const cpLabelMatch = text.match(/C[oó]digo\s+Postal\s*[:\s]+(\d{4}[-\s]\d{3})/i);
        if (cpLabelMatch) {
            metadata.postalCode = cpLabelMatch[1].replace(/\s/, '-');
            console.log('  ✅ PostalCode (labeled):', metadata.postalCode);
        } else {
            // Scan text for any PT postal code not inside a serial/process number context
            const cpFreeMatch = text.match(/\b(\d{4})-(\d{3})\b/);
            if (cpFreeMatch) {
                metadata.postalCode = `${cpFreeMatch[1]}-${cpFreeMatch[2]}`;
                console.log('  ✅ PostalCode (scan):', metadata.postalCode);
            }
        }
    }

    return metadata;
}

/**
 * ВИТЯГУВАННЯ ПОРУШЕНЬ - З ФІЛЬТРАЦІЄЮ "NOTA DE CLÁUSULAS"
 */
function extractViolations(text) {
    const violations = [];
    const seen = new Set();
    
    console.log('\n🔍 [Bureau Veritas] Extracting Violations...');
    
    // КРОК 1: Визначаємо чи є реальні порушення
    // Bureau Veritas має розділ "NOTA DE CLÁUSULAS" який є просто поясненням
    
    // Перевірка: чи є розділ з реальними порушеннями?
    const hasViolationsSection = 
        text.match(/RELAÇÃO\s+DE\s+CLÁUSULAS/i) ||
        text.match(/CLÁUSULAS\s+DETECTADAS/i) ||
        text.match(/DEFICIÊNCIAS\s+DETECTADAS/i) ||
        text.match(/NÃO\s+CONFORMIDADES/i);
    
    console.log('  Has violations section:', !!hasViolationsSection);
    
    // Перевірка статусу
    const statusChecks = {
        approved: text.match(/(?:Elevador\s+)?Aprovad[oa](?:\s+com\s+cláusulas\s+C3)?[:\s]/i),
        failed: text.match(/(?:Elevador\s+)?Reprovad[oa]/i),
        withC2Star: text.match(/Aprovad[oa]\s+com\s+cl[áa]usulas\s+C2\*/i),
        withImmobilization: text.match(/Reprovad[oa]\s+com\s+Imobiliza[çc][ãa]o/i)
    };
    
    console.log('  Status checks:', statusChecks);
    
    // КРОК 2: Знаходимо розділ з порушеннями
    const notaSectionStart = text.search(/NOTA\s+DE\s+CL[ÁA]USULAS/i);
    
    let searchText = text;
    
    if (notaSectionStart !== -1) {
        // Bureau Veritas: порушення між NOTA і RESULTADO
        const resultSectionStart = text.search(/RESULTADO\s+DA\s+INSPE[CÇ][CÇ][ÃA]O/i);
        
        if (resultSectionStart !== -1 && resultSectionStart > notaSectionStart) {
            // Bureau Veritas формат
            searchText = text.substring(notaSectionStart, resultSectionStart);
            console.log(`  📋 Bureau Veritas format: violations table ${searchText.length} chars`);
        } else {
            // CML або інший формат: порушення після NOTA до кінця (або до Lisboa/Porto/підпису)
            const endMarkers = [
                text.search(/Lisboa,\s*\d{2}\s+de\s+\w+\s+de\s+\d{4}/i),
                text.search(/Porto,\s*\d{2}\s+de\s+\w+\s+de\s+\d{4}/i),
                text.search(/O\s+DIRETOR\s+T[ÉE]CNICO/i),
                text.search(/www\.cm-lisboa\.pt/i)
            ].filter(pos => pos !== -1);
            
            const endPos = endMarkers.length > 0 ? Math.min(...endMarkers) : text.length;
            searchText = text.substring(notaSectionStart, endPos);
            console.log(`  📋 CML/Generic format: violations section ${searchText.length} chars (${notaSectionStart} to ${endPos})`);
        }
    } else {
        console.log('  ℹ️ No NOTA DE CLÁUSULAS section found, searching full text');
    }
    
    // КРОК 3: Шукаємо конкретні порушення в таблиці
    
    // Формат Bureau Veritas: "C2 Artº.46.º 2 – опис"
    // Підтримуємо артикули з пробілами: "46.º 2" або "46.2"
    const format1 = /([C][123])\s+Art[ºo°]?\.?\s*([\d\s\.º°]+?)\s+[-–—]\s*([^\n]{10,400})/gi;
    let match;
    let count = 0;
    
    console.log('  🔍 Searching for violations with Format 1...');
    
    while ((match = format1.exec(searchText)) !== null) {
        const classification = match[1];
        // Нормалізуємо: "46.º 2" → "46.2", видаляємо зайві пробіли
        let article = match[2].trim().replace(/[º°]/g, '.').replace(/\s+/g, '').replace(/\.+/g, '.').replace(/\.$/, '');
        const description = match[3].trim();
        
        console.log(`  🔍 Found candidate: ${classification} Art.${article} - ${description.substring(0, 50)}...`);
        
        // Фільтруємо текст з пояснень (це не порушення)
        if (isExplanationText(description)) {
            console.log(`  ⚠️ Filtered explanation: ${description.substring(0, 50)}...`);
            continue;
        }
        
        const key = `${classification}-${article}-${description.substring(0, 30)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(classification, article, description));
            count++;
            console.log(`  ✅ Added violation: ${classification} Art.${article}`);
        }
    }
    
    console.log(`  📊 Format 1 found: ${count} violations`);
    
    // Формат 2: Список маркерів з артикулами (інший формат)
    const format2 = /[•▪○-]\s*([^\n]{10,300}?)(?:Art\.?º?|Artigo)\s*(\d+[a-z]?\.?\d*)\s*\(([C][123])\)/gi;
    count = 0;
    
    while ((match = format2.exec(searchText)) !== null) {
        const description = match[1].trim();
        const article = match[2];
        const classification = match[3];
        
        if (isExplanationText(description)) {
            continue;
        }
        
        const key = `${classification}-${article}-${description.substring(0, 30)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(classification, article, description));
            count++;
        }
    }
    
    console.log(`  📊 Format 2 found: ${count} violations`);
    
    // Формат 3: CML Lisboa - таблиця "Artigo | Descrição"
    // Приклад: "ART. 20.º (DL 320/02) Falta de apresentação dos documentos..."
    // Важливо: текст може бути на кількох рядках
    const format3 = /ART[\.º\s]*(\d+[a-zº°\.]*)\s*(?:\(([^)]+)\))?\s*([\s\S]{15,600}?)(?=ART\.|Lisboa|Porto|O\s+DIRETOR|www\.|Página|$)/gi;
    count = 0;
    
    console.log('  🔍 Searching for violations with Format 3 (CML Lisboa)...');
    
    while ((match = format3.exec(searchText)) !== null) {
        let article = match[1].trim().replace(/[º°]/g, '.').replace(/\.+/g, '.').replace(/\.$/, '');
        const legalRef = match[2] ? match[2].trim() : ''; // DL 320/02
        let description = match[3].trim().replace(/\s+/g, ' '); // Нормалізуємо пробіли
        
        // Обрізаємо на першій крапці + пробіл після 50 символів (кінець речення)
        const sentenceEnd = description.indexOf('. ', 50);
        if (sentenceEnd !== -1 && sentenceEnd < 300) {
            description = description.substring(0, sentenceEnd + 1);
        } else if (description.length > 400) {
            description = description.substring(0, 400).trim();
        }
        
        console.log(`  🔍 Found CML format: Art.${article} ${legalRef} - ${description.substring(0, 60)}...`);
        
        if (isExplanationText(description)) {
            console.log(`  ⚠️ Filtered explanation: ${description.substring(0, 50)}...`);
            continue;
        }
        
        // Визначаємо класифікацію з контексту
        // Шукаємо заголовок C1/C2/C3 перед цим порушенням
        let classification = 'C2'; // За замовчуванням C2
        
        const textBeforeViolation = searchText.substring(0, match.index);
        const c1Header = textBeforeViolation.lastIndexOf('C  1  -');
        const c2Header = textBeforeViolation.lastIndexOf('C  2  -');
        const c3Header = textBeforeViolation.lastIndexOf('C  3  -');
        
        // Знаходимо найближчий заголовок
        const headers = [
            { pos: c1Header, class: 'C1' },
            { pos: c2Header, class: 'C2' },
            { pos: c3Header, class: 'C3' }
        ].filter(h => h.pos !== -1).sort((a, b) => b.pos - a.pos);
        
        if (headers.length > 0) {
            classification = headers[0].class;
            console.log(`  📍 Classification from header: ${classification}`);
        }
        
        const key = `${classification}-${article}-${description.substring(0, 30)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(classification, article, description));
            count++;
            console.log(`  ✅ Added CML violation: ${classification} Art.${article}`);
        }
    }
    
    console.log(`  📊 Format 3 (CML) found: ${count} violations`);
    
    // Формат 4: APCER та інші - "Artigo XX.º - опис" або "Cláusula C2 - Artigo XX"
    const format4 = /(?:Cl[áa]usula\s+)?([C][123])\s*[-:]\s*Art(?:igo|[ºo°.]?)\s*([\d\s\.º°]+?)\s+[-–—]\s*(.+?)(?=Cl[áa]usula|Art(?:igo|[ºo°.])|$)/gis;
    count = 0;
    
    console.log('  🔍 Searching for violations with Format 4 (APCER/Other)...');
    
    while ((match = format4.exec(searchText)) !== null) {
        const classification = match[1];
        let article = match[2].trim().replace(/[º°]/g, '.').replace(/\s+/g, '').replace(/\.+/g, '.').replace(/\.$/, '');
        let description = match[3].trim().replace(/\s+/g, ' ');
        
        // Обрізаємо довгий текст
        if (description.length > 300) {
            const sentenceEnd = description.indexOf('. ', 100);
            description = sentenceEnd !== -1 ? description.substring(0, sentenceEnd + 1) : description.substring(0, 300);
        }
        
        console.log(`  🔍 Found APCER format: ${classification} Art.${article} - ${description.substring(0, 60)}...`);
        
        if (isExplanationText(description)) {
            console.log(`  ⚠️ Filtered explanation: ${description.substring(0, 50)}...`);
            continue;
        }
        
        const key = `${classification}-${article}-${description.substring(0, 30)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(classification, article, description));
            count++;
            console.log(`  ✅ Added APCER violation: ${classification} Art.${article}`);
        }
    }
    
    console.log(`  📊 Format 4 (APCER/Other) found: ${count} violations`);
    
    // Формат 5: GATECI - Таблиця "TIPO | ARTIGO/PONTO | DEFICIÊNCIA DETETADA"
    // Приклад: C2  2º-1  Inexistência de proteção diferencial...
    const format5 = /^([C][123])\s*(\d+[º°]?[a-z]?\.?[-\s]*\d*)\s+(.+?)(?=^[C][123]\s*\d|^RESULTADO|^Avenida|$)/gim;
    count = 0;
    
    console.log('  🔍 Searching for violations with Format 5 (GATECI table)...');
    
    // Шукаємо таблицю з порушеннями (можливо без пробілів)
    const tablePatterns = [
        /TIPO\s*ARTIGO[\/\s]*PONTO\s*DEFICI[ÊE]NCIA\s*DETETADA([\s\S]+?)(?=RESULTADO|Avenida|$)/i,
        /TIPOARTIGO[\/]*PONTODEFICI[ÊE]NCIADETETADA([\s\S]+?)(?=RESULTADO|Avenida|$)/i // Без пробілів
    ];
    
    let tableMatch = null;
    for (const pattern of tablePatterns) {
        tableMatch = searchText.match(pattern);
        if (tableMatch) {
            console.log(`  ✅ Found table header with pattern: ${pattern.toString().substring(0, 50)}...`);
            break;
        }
    }
    
    if (tableMatch) {
        const tableContent = tableMatch[1];
        console.log(`  📋 Found GATECI table: ${tableContent.length} chars`);
        
        while ((match = format5.exec(tableContent)) !== null) {
            const classification = match[1];
            let article = match[2].trim()
                .replace(/[º°]/g, '.')
                .replace(/\s+/g, '')
                .replace(/\.+/g, '.')
                .replace(/\.$/, '')
                .replace(/\.-/g, '.'); // "86º.-4" → "86.4"
            
            let description = match[3].trim().replace(/\s+/g, ' ');
            
            // Обрізаємо на наступному рядку якщо текст закінчується
            if (description.length > 200) {
                description = description.substring(0, 200).trim();
            }
            
            console.log(`  🔍 Found GATECI format: ${classification} Art.${article} - ${description.substring(0, 60)}...`);
            
            if (isExplanationText(description)) {
                console.log(`  ⚠️ Filtered explanation: ${description.substring(0, 50)}...`);
                continue;
            }
            
            const key = `${classification}-${article}-${description.substring(0, 30)}`;
            if (!seen.has(key)) {
                seen.add(key);
                violations.push(createViolation(classification, article, description));
                count++;
                console.log(`  ✅ Added GATECI violation: ${classification} Art.${article}`);
            }
        }

        // Format 6: GATECI compacto sem espaços - "C3X.YDescrição" ou "C3X.Y.ZDescrição"
        // Cobre casos em que o pdf-parse concatena classificação + artigo + descrição sem separadores.
        // É comum para artigos de um nível decimal (ex. 9.9, 5.9) onde a coluna é mais estreita.
        const format6Compact = /(C[123])(\d+\.\d+(?:\.\d+)*)([A-ZÀ-Ú][^\n]{10,400}?)(?=C[123]\d|RESULTADO|Avenida|$)/gim;
        let count6 = 0;
        console.log('  🔍 Searching compact GATECI notation (Format 6, sem espaços)...');

        while ((match = format6Compact.exec(tableContent)) !== null) {
            const classification = match[1];
            const article = match[2];
            let description = match[3].trim().replace(/\s+/g, ' ');
            if (description.length > 200) description = description.substring(0, 200).trim();

            console.log(`  🔍 Compact GATECI: ${classification} Art.${article} - ${description.substring(0, 60)}...`);
            if (isExplanationText(description)) {
                console.log(`  ⚠️ Filtered: ${description.substring(0, 50)}...`);
                continue;
            }

            const key = `${classification}-${article}-${description.substring(0, 30)}`;
            if (!seen.has(key)) {
                seen.add(key);
                violations.push(createViolation(classification, article, description));
                count6++;
                console.log(`  ✅ Added compact GATECI: ${classification} Art.${article}`);
            }
        }
        console.log(`  📊 Format 6 (GATECI compact) found: ${count6} violations`);
    }
    
    console.log(`  📊 Format 5 (GATECI) found: ${count} violations`);

    // Format 6 fallback: якщо tableMatch не знайдено, шукаємо компактний формат в searchText
    if (!tableMatch) {
        const format6Fallback = /(C[123])(\d+\.\d+(?:\.\d+)*)([A-ZÀ-Ú][^\n]{10,400}?)(?=C[123]\d|RESULTADO|Avenida|$)/gim;
        let count6fb = 0;
        console.log('  🔍 Format 6 fallback (compact GATECI in searchText)...');
        let fbMatch;
        while ((fbMatch = format6Fallback.exec(searchText)) !== null) {
            const classification = fbMatch[1];
            const article = fbMatch[2];
            let description = fbMatch[3].trim().replace(/\s+/g, ' ');
            if (description.length > 200) description = description.substring(0, 200).trim();
            if (isExplanationText(description)) continue;
            const key = `${classification}-${article}-${description.substring(0, 30)}`;
            if (!seen.has(key)) {
                seen.add(key);
                violations.push(createViolation(classification, article, description));
                count6fb++;
                console.log(`  ✅ Format 6 fallback: ${classification} Art.${article}`);
            }
        }
        console.log(`  📊 Format 6 fallback found: ${count6fb} violations`);
    }

    // КРОК 3.7 — Format 7: VARREDURA POR KEYWORDS (texto livre sem artigo)
    // Quebra o texto do relatório em frases/linhas e tenta reconhecer
    // violações apenas pela descrição textual, sem precisar de artigo.
    // Útil para PDFs com tabelas corrompidas, OCR defeituoso ou formatos desconhecidos.
    // NOTA: Ignorado para relatórios APROVADOS — evita falsos positivos do texto explicativo
    //       da secção "NOTA DE CLÁUSULAS" que descreve as categorias C1/C2/C3.
    let count7 = 0;
    if (statusChecks.approved && !statusChecks.failed) {
        console.log('  ⏭️ Format 7 skipped: APROVADO report — keyword scan disabled to prevent false positives from explanatory text');
    } else {
        console.log('  🔍 Format 7: keyword-based scan (frases sem artigo)...');

        // Dividimos em frases razoáveis (ponto/ponto+newline/newline simples)
        const sentences = searchText
            .split(/[.\n]+/)
            .map(s => s.trim())
            .filter(s => s.length > 20 && s.length < 400);

        for (const sentence of sentences) {
            if (isExplanationText(sentence)) continue;

            const textHit = matchByDescriptionText(sentence);
            if (!textHit || !textHit.article) continue;

            // Verifica se já não foi encontrado por outro formato
            const key = `${textHit.classification}-${textHit.article}-${sentence.substring(0, 30)}`;
            if (seen.has(key)) continue;

            seen.add(key);
            violations.push(createViolation(textHit.classification, textHit.article, sentence));
            count7++;
            console.log(`  ✅ Format 7 keyword match: Art.${textHit.article} — "${sentence.substring(0, 60)}"`);
        }
    }
    console.log(`  📊 Format 7 (keyword scan) found: ${count7} violations`);

    // КРОК 4: Якщо РЕПРОВАДО але немає порушень - щось пішло не так
    if (statusChecks.failed && violations.length === 0) {
        console.log('  ⚠️ WARNING: Report marked as REPROVADO but no violations found!');
        console.log('  ℹ️ Attempting alternative parsing...');
        
        // Альтернативний пошук: текст після "Tipo Deficiência detectada"
        const altMatch = text.match(/Tipo\s+Defici[êe]ncia\s+detectada\s*([\s\S]{0,500}?)(?=RESULTADO|$)/i);
        if (altMatch) {
            const violationText = altMatch[1];
            console.log(`  🔍 Alternative search in: ${violationText.substring(0, 100)}...`);
            
            // Спробувати знайти будь-який C1/C2/C3 з артикулом (більш ліберальний regex)
            const altRegex = /([C][123])\s+Art[ºo°]?\.?\s*([\d\s\.º°]+?)\s+[-–—]\s*(.+)/gi;
            let altMatch2;
            while ((altMatch2 = altRegex.exec(violationText)) !== null) {
                const classification = altMatch2[1];
                let article = altMatch2[2].trim().replace(/[º°]/g, '.').replace(/\s+/g, '').replace(/\.+/g, '.').replace(/\.$/, '');
                const description = altMatch2[3].trim();                
                const key = `${classification}-${article}-${description.substring(0, 30)}`;
                if (!seen.has(key) && !isExplanationText(description)) {
                    seen.add(key);
                    violations.push(createViolation(classification, article, description));
                    console.log(`  ✅ Alternative found: ${classification} Art.${article}`);
                }
            }
        }
    }
    
    console.log(`\n📊 Total violations found: ${violations.length}`);
    
    return violations;
}

/**
 * Перевірка чи текст є поясненням (а не порушенням)
 */
function isExplanationText(text) {
    const explanationPhrases = [
        /correspondem\s+a\s+situa[çc][õo]es/i,
        /cuja\s+resolu[çc][ãa]o\s+deve/i,
        /n[ãa]o\s+apresentam\s+um\s+risco/i,
        /obrigam\s+[àa]\s+imobiliza[çc][ãa]o/i,
        /d[ãa]o\s+lugar\s+a\s+uma/i,
        /elevador\s+(?:aprovado|reprovado)/i,
        /foram\s+detet[ae]das\s+cl[áa]usulas\s+tipo/i,
        /remo[çc][ãa]o\s+destas\s+n[ãa]o\s+conformidades/i,
        /prazo\s+m[áa]ximo\s+de\s+\d+\s+anos/i,
        /despacho\s+n\.?[ºo]/i,
        /defici[êe]ncias\s+a\s+reparar\s+no\s+prazo/i,
        /data\s+da\s+inspe[çc][ãa]o\s+\d{4}-\d{2}-\d{2}/i,
        /valida[çc][ãa]o\/inspetor/i,
        /propriet[áa]rio\s*empresa\s+de\s+manuten[çc][ãa]o/i,
        /obriga[çc][õo]es\s+do\s+propriet[áa]rio/i,
        /classifica[çc][ãa]o\s+das\s+cl[áa]usulas/i,
        // Extra patterns for NOTA DE CLÁUSULAS explanation section
        /cl[áa]usulas?\s+tipo\s+C[123]/i,
        /n[ãa]o\s+representam\s+um\s+risco\s+imediato/i,
        /podem\s+aguardar\s+a\s+pr[óo]xima\s+inspe[çc][ãa]o/i,
        /prazo\s+m[áa]ximo\s+de\s+(um|1)\s+m[eê]s/i,
        /imobiliza[çc][ãa]o\s+imediata\s+do\s+elevador/i,
        /risco\s+para\s+a\s+seguran[çc]a\s+dos\s+utilizadores/i,
        /n[ãa]o\s+coloca[nm]\s+em\s+risco/i,
        /classifica[çc][õo]es?\s+das?\s+n[ãa]o\s+conformidades/i,
        /situa[çc][ãa]o\s+de\s+risco\s+elevado/i,
        /prazo\s+m[áa]ximo\s+de\s+\d+\s+dias/i
    ];
    
    // Перевірка на пояснювальні фрази
    if (explanationPhrases.some(pattern => pattern.test(text))) {
        return true;
    }
    
    // Фільтруємо короткі тексти з датами/іменами (footer інфо)
    if (text.length < 100) {
        if (/^\d{4}-\d{2}-\d{2}/.test(text) || 
            /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(text.trim()) ||
            /Jorge\s+Silva|Ruslan\s+Stepanyuk/i.test(text)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Створює об'єкт порушення
 */
function createViolation(classification, articleNum, description) {
    // Нормалізація номера артикулу
    const normalizedArticle = articleNum ? articleNum.replace(/\.$/, '') : '';
    
    // Отримуємо інформацію з бази даних за артикулом
    let article = regulationArticles[normalizedArticle];
    let usedParentFallback = false;
    
    // Якщо не знайдено — шукаємо основний артикул (напр. "8.3.2" → "8")
    if (!article && normalizedArticle.includes('.')) {
        const mainArticle = normalizedArticle.split('.')[0];
        article = regulationArticles[mainArticle];
        if (article) {
            usedParentFallback = true; // sub-cláusula → pai: enrichment SEMPRE necessário
            article = {
                ...article,
                title: article.title.replace(mainArticle, normalizedArticle),
            };
        }
    }

    // ── TEXT-BASED ENRICHMENT ──────────────────────────────────────────────
    // Quando a sub-cláusula (ex. 6.3.6) não existe na DB e usamos o pai (Art.6),
    // o título/why do pai são para outro contexto. Text-match corrige isso.
    let textMatch = null;
    if (!article || usedParentFallback || article.explanation === 'Consultar regulamento para detalhes específicos') {
        textMatch = matchByDescriptionText(description);
        if (textMatch) {
            // Se não tínhamos artigo, usar o artigo inferido pelo texto
            if (!normalizedArticle && textMatch.article) {
                // Retornar como novo violation com artigo descoberto pelo texto
                return createViolation(textMatch.classification || classification, textMatch.article, description);
            }
            // O text-match tem prioridade sobre os dados genéricos do artigo-pai.
            // Quando a sub-cláusula (ex. 6.3.6) não existe na DB e se usa o pai (6),
            // o 'why' e 'solution' do pai são para outro contexto (esmagamento, etc.).
            // O text-match identifica o contexto REAL pelo texto da descrição.
            if (!article) {
                article = {
                    title: textMatch.title,
                    explanation: textMatch.title,
                    why: textMatch.why,
                    solution: textMatch.solution,
                    urgency: textMatch.urgency,
                    textMatchedFrom: description.substring(0, 60)
                };
            } else {
                // Sobrescrever SEMPRE com dados do text-match (mais específicos)
                article = {
                    ...article,
                    title: textMatch.title || article.title,
                    why: textMatch.why,
                    solution: textMatch.solution,
                    urgency: textMatch.urgency,
                    textMatchedFrom: description.substring(0, 60)
                };
            }
            console.log(`  ✏️  Article enriched by text-match for: "${description.substring(0, 50)}..."`); 
        }
    }

    // Za замовчуванням (artigo desconhecido, sem text-match)
    if (!article) {
        article = {
            title: normalizedArticle ? `Artigo ${normalizedArticle}` : 'Artigo não identificado',
            explanation: 'Consultar regulamento para detalhes específicos',
            why: 'Cumprimento obrigatório da regulamentação',
            solution: 'Consultar técnico certificado',
            urgency: classification === 'C1' ? 'CRÍTICO' : classification === 'C2' ? 'MODERADO' : 'BAIXO'
        };
    }
    // ── FIM TEXT-BASED ENRICHMENT ─────────────────────────────────────────
    
    // Інформація про класифікацію
    const classificationInfo = {
        'C1': {
            level: 'CRÍTICO',
            description: 'Elevado risco - imobilização imediata',
            deadline: 'IMEDIATO',
            legalConsequence: 'Imobilização obrigatória até correção'
        },
        'C2': {
            level: 'MODERADO',
            description: 'Médio risco - correção obrigatória',
            deadline: '30 dias',
            legalConsequence: 'Reinspecção obrigatória + possível multa'
        },
        'C3': {
            level: 'LEVE',
            description: 'Baixo risco - manutenção preventiva',
            deadline: 'Próxima inspeção',
            legalConsequence: 'Verificação na próxima inspeção periódica'
        }
    };
    
    return {
        classification,
        article: normalizedArticle,
        description,
        articleInfo: article,
        classificationInfo: classificationInfo[classification],
        detailedExplanation: formatDetailedExplanation(article, classificationInfo[classification])
    };
}

/**
 * Форматує детальне пояснення
 */
function formatDetailedExplanation(article, classInfo) {
    return `
🔍 ${article.title}

O QUE É:
${article.explanation || 'Consultar regulamento'}

⚠️ PORQUÊ CORRIGIR:
${article.why || 'Cumprimento regulamentar obrigatório'}

✅ SOLUÇÃO:
${article.solution || 'Consultar técnico certificado'}

⏰ URGÊNCIA: ${article.urgency || classInfo.level}
📅 PRAZO: ${classInfo.deadline}
⚖️ CONSEQUÊNCIA LEGAL: ${classInfo.legalConsequence}

🎯 CLASSIFICAÇÃO: ${classInfo.level}
${classInfo.description}
    `.trim();
}

/**
 * Витягує висновок
 */
function extractConclusion(text, violations) {
    const c1Count = violations.filter(v => v.classification === 'C1').length;
    const c2Count = violations.filter(v => v.classification === 'C2').length;
    const c3Count = violations.filter(v => v.classification === 'C3').length;
    
    let approved = false;
    let status = 'REPROVADO';
    let reason = '';
    
    // Bureau Veritas логіка
    if (text.match(/Aprovad[oa]\s*$/im) && c1Count === 0 && c2Count === 0) {
        approved = true;
        status = c3Count > 0 ? 'APROVADO com cláusulas C3' : 'APROVADO';
        reason = c3Count > 0 ? 
            `Aprovado com ${c3Count} cláusula(s) C3 - verificar na próxima inspeção` :
            'Elevador em conformidade com regulamentos';
    } else if (c1Count > 0 || c2Count > 0) {
        approved = false;
        status = c1Count > 0 ? 'REPROVADO com Imobilização' : 'REPROVADO';
        reason = c1Count > 0 ?
            `${c1Count} cláusula(s) C1 (críticas) - IMOBILIZAÇÃO OBRIGATÓRIA` :
            `${c2Count} cláusula(s) C2 - reinspecção obrigatória após correções`;
    }
    
    return {
        approved,
        status,
        reason,
        text: `${status}: ${reason}`
    };
}

/**
 * Статистика
 */
function getViolationsStats(violations) {
    return {
        total: violations.length,
        critical: violations.filter(v => v.classification === 'C1').length,
        medium: violations.filter(v => v.classification === 'C2').length,
        low: violations.filter(v => v.classification === 'C3').length,
        byArticle: violations.reduce((acc, v) => {
            acc[v.article] = (acc[v.article] || 0) + 1;
            return acc;
        }, {})
    };
}

/**
 * ГОЛОВНА ФУНКЦІЯ ПАРСИНГУ - УНІВЕРСАЛЬНА ДЛЯ ВСІХ ФОРМАТІВ
 */
async function parseBureauVeritasPDF(filePath) {
    try {
        console.log('\n📄 ========== PORTUGUESE INSPECTION REPORT PARSING ==========');
        console.log('📄 File:', filePath);
        
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        // [?] representa caracteres não decodificados pelo pdf-parse (fontes spec. OI)
        const text = data.text
            .replace(/\[\?\]/g, '')       // remover placeholder pdf-parse
            .replace(/ {2,}/g, ' ');       // colapsar espaços duplos resultantes
        
        console.log('📊 Pages:', data.numpages);
        console.log('📊 Text length:', text.length, 'chars');
        
        // Визначаємо тип звіту
        let reportType = 'UNKNOWN';
        if (text.includes('BUREAU VERITAS')) {
            reportType = 'BUREAU VERITAS RINAVE';
        } else if (text.includes('Câmara Municipal de Lisboa') || text.includes('www.cm-lisboa.pt')) {
            reportType = 'CML LISBOA';
        } else if (text.includes('APCER')) {
            reportType = 'APCER';
        } else if (text.includes('gateci.pt') || text.includes('GATECI')) {
            reportType = 'GATECI';
        } else if (text.match(/C[âa]mara Municipal/i)) {
            reportType = 'CÂMARA MUNICIPAL (Other)';
        }
        
        console.log('🏢 Report type detected:', reportType);
        
        // Витягування даних
        const metadata = extractMetadata(text);
        metadata.reportType = reportType; // Додаємо тип звіту
        
        const violations = extractViolations(text);
        const stats = getViolationsStats(violations);
        const conclusion = extractConclusion(text, violations);
        
        console.log('\n📊 RESULTS:');
        console.log(`  Status: ${conclusion.status}`);
        console.log(`  Total violations: ${stats.total}`);
        console.log(`  C1 (Critical): ${stats.critical}`);
        console.log(`  C2 (Medium): ${stats.medium}`);
        console.log(`  C3 (Low): ${stats.low}`);
        
        console.log('========== PARSING COMPLETE ==========\n');
        
        return {
            success: true,
            reportType: reportType.toLowerCase().replace(/\s+/g, '_'),
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
            passed: conclusion.approved,
            rawText: text,
            pageCount: data.numpages
        };
        
    } catch (error) {
        console.error('❌ PDF parsing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    parseBureauVeritasPDF,
    extractMetadata,
    extractViolations,
    extractConclusion,
    getViolationsStats
};
