/**
 * PDF Parser для португальських інспекційних звітів
 * Підтримує 4 різних формати звітів
 */

const pdfParse = require('pdf-parse');
const fs = require('fs');

// 📚 База знань португальського законодавства про ліфти
const regulationArticles = {
    // Decreto 513/70 - Artigos críticos de segurança
    '9': {
        title: 'Vedação da caixa (Art. 9º Dec. 513/70)',
        explanation: 'A caixa deve ser vedada em toda a altura com materiais resistentes ao fogo',
        why: 'Caixa mal vedada permite entrada de objetos ou pessoas, causando quedas ou choques',
        solution: 'Vedar caixa completamente com materiais incombustíveis certificados',
        urgency: 'ALTO',
        regulation: 'Decreto 513/70, Artigo 9º'
    },
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
        title: 'Caixa sobre locais acessíveis (Art. 14º Dec. 513/70)',
        explanation: 'Caixa não pode situar-se sobre locais acessíveis sem pára-quedas',
        why: 'Em caso de ruptura de cabos, cabina ou contrapeso podem cair sobre pessoas causando morte',
        solution: 'Instalar pára-quedas em todos os órgãos suspensos ou reforçar estrutura inferior',
        urgency: 'CRÍTICO',
        regulation: 'Decreto 513/70, Artigo 14º'
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
    '33': {
        title: 'Resistência mecânica das portas (Art. 33º Dec. 513/70)',
        explanation: 'Portas devem ter estrutura metálica e resistir a 30 kgf sem deformação',
        why: 'Portas fracas podem ceder quando alguém se apoia, causando queda na caixa do elevador',
        solution: 'Substituir portas por modelos com estrutura metálica certificada',
        urgency: 'ALTO',
        regulation: 'Decreto 513/70, Artigo 33º'
    },
    '39': {
        title: 'Encravamento das portas (Art. 39º Dec. 513/70)',
        explanation: 'Todas as portas devem ter dispositivos de encravamento seguros',
        why: 'Sem encravamento, porta pode abrir com cabina ausente, causando queda fatal na caixa',
        solution: 'Instalar dispositivos de encravamento certificados em todas as portas de patamar',
        urgency: 'CRÍTICO',
        regulation: 'Decreto 513/70, Artigo 39º'
    },
    '44': {
        title: 'Constituição da cabina (Art. 44º Dec. 513/70)',
        explanation: 'Cabina deve ser fechada com materiais não inflamáveis',
        why: 'Materiais inflamáveis em incêndio libertam gases tóxicos que podem matar ocupantes presos',
        solution: 'Revestir cabina com materiais incombustíveis certificados',
        urgency: 'ALTO',
        regulation: 'Decreto 513/70, Artigo 44º'
    },
    '52': {
        title: 'Ventilação da cabina (Art. 52º Dec. 513/70)',
        explanation: 'Cabina deve ter ventilação adequada para pessoas presas em avarias',
        why: 'Sem ventilação, pessoas podem sufocar se ficarem presas horas durante avaria',
        solution: 'Instalar aberturas de ventilação com malha de segurança',
        urgency: 'MÉDIO',
        regulation: 'Decreto 513/70, Artigo 52º'
    },
    '53': {
        title: 'Iluminação da cabina (Art. 53º Dec. 513/70)',
        explanation: 'Cabina deve ter iluminação permanente independente',
        why: 'No escuro, pessoas presas entram em pânico e podem ferir-se tentando sair',
        solution: 'Instalar iluminação de emergência com bateria autónoma',
        urgency: 'MÉDIO',
        regulation: 'Decreto 513/70, Artigo 53º'
    },
    '65': {
        title: 'Pára-quedas obrigatório (Art. 65º Dec. 513/70)',
        explanation: 'Cabina deve ter pára-quedas comandado por limitador de velocidade',
        why: 'Se cabos partirem, cabina cai em queda livre esmagando ocupantes - MORTE CERTA',
        solution: 'Instalar sistema de pára-quedas certificado com limitador de velocidade',
        urgency: 'CRÍTICO',
        regulation: 'Decreto 513/70, Artigo 65º'
    },
    '67': {
        title: 'Limitador de velocidade (Art. 67º Dec. 513/70)',
        explanation: 'Dispositivo que aciona pára-quedas se velocidade exceder limite',
        why: 'Sem limitador, excesso de velocidade não é detectado e pára-quedas não atua causando acidente',
        solution: 'Instalar e selar limitador de velocidade calibrado conforme norma',
        urgency: 'CRÍTICO',
        regulation: 'Decreto 513/70, Artigo 67º'
    },
    '77': {
        title: 'Folgas em cabinas sem portas (Art. 77º Dec. 513/70)',
        explanation: 'Folga entre cabina e parede não pode exceder 2 cm',
        why: 'Folgas excessivas podem prender dedos, braços ou crianças inteiras causando esmagamento',
        solution: 'Ajustar guias e alinhamento para reduzir folga a máximo 2 cm',
        urgency: 'ALTO',
        regulation: 'Decreto 513/70, Artigo 77º'
    },
    '78': {
        title: 'Folgas entre soleiras (Art. 78º Dec. 513/70)',
        explanation: 'Folga entre soleira de cabina e porta de patamar máximo 2 cm (portas manuais) ou 3,5 cm (automáticas)',
        why: 'Folgas excessivas podem prender roupas, sapatos ou causar quedas, especialmente crianças e idosos',
        solution: 'Ajustar mecanicamente as soleiras para garantir folga conforme norma',
        urgency: 'ALTO',
        regulation: 'Decreto 513/70, Artigo 78º'
    },
    '81': {
        title: 'Sistema de freio (Art. 81º Dec. 513/70)',
        explanation: 'Freio deve imobilizar automaticamente na falta de corrente',
        why: 'Falha do freio permite descida descontrolada esmagando ocupantes ou pessoas no patamar',
        solution: 'Substituir sistema de frenagem por modelo certificado com atuação automática',
        urgency: 'CRÍTICO',
        regulation: 'Decreto 513/70, Artigo 81º'
    },
    '85': {
        title: 'Proteção de peças móveis (Art. 85º Dec. 513/70)',
        explanation: 'Volantes, engrenagens e correias devem ter resguardos',
        why: 'Peças móveis sem proteção podem causar amputações, esmagamentos ou morte do técnico durante manutenção',
        solution: 'Instalar resguardos certificados em todas as peças salientes e móveis',
        urgency: 'CRÍTICO',
        regulation: 'Decreto 513/70, Artigo 85º'
    },
    '97': {
        title: 'Avisos na cabina (Art. 97º Dec. 513/70)',
        explanation: 'Cabina deve ter placa com carga máxima e contacto de conservação',
        why: 'Sem avisos, utilizadores sobrecarregam cabina causando ruptura de cabos ou falha de freios',
        solution: 'Afixar placas indeléveis com carga máxima, lotação e contacto de emergência',
        urgency: 'MÉDIO',
        regulation: 'Decreto 513/70, Artigo 97º'
    },
    '108': {
        title: 'Periodicidade de manutenção (Art. 108º Dec. 513/70)',
        explanation: 'Inspeção mensal obrigatória e revisão semestral completa',
        why: 'Sem manutenção regular, defeitos acumulam-se até falha catastrófica',
        solution: 'Contratar empresa certificada para manutenção mensal e revisão semestral',
        urgency: 'ALTO',
        regulation: 'Decreto 513/70, Artigo 108º'
    },
    '109': {
        title: 'Substituição de cabos (Art. 109º Dec. 513/70)',
        explanation: 'Cabos com >10% fios partidos ou corrosão devem ser substituídos IMEDIATAMENTE',
        why: 'Cabos deteriorados podem romper causando queda livre da cabina - MORTE CERTA',
        solution: 'Substituir imediatamente todos os cabos de suspensão por novos certificados',
        urgency: 'CRÍTICO',
        regulation: 'Decreto 513/70, Artigo 109º'
    },
    '110': {
        title: 'Livro de registo (Art. 110º Dec. 513/70)',
        explanation: 'Casa das máquinas deve ter livro com registo de todas as manutenções',
        why: 'Sem registo, impossível rastrear quando foi última manutenção ou que problemas foram detetados',
        solution: 'Adquirir livro aprovado pela DGEG e registar todas as intervenções',
        urgency: 'MÉDIO',
        regulation: 'Decreto 513/70, Artigo 110º'
    },
    'NOTA': {
        title: 'Dispositivo elétrico na soleira móvel',
        explanation: 'O dispositivo pode não funcionar corretamente nas extremidades',
        why: 'Falhas nas extremidades podem não detetar obstáculos, causando acidentes ao fechar portas',
        solution: 'Verificar e ajustar sensores nas extremidades ou substituir por sistema mais eficaz',
        urgency: 'MÉDIO'
    },
    
    // Decreto-Lei 320/2002 - Manutenção e Inspecção
    'DL320-3': {
        title: 'Manutenção regular obrigatória (Art. 3º DL 320/2002)',
        explanation: 'Elevador deve ter contrato de manutenção com EMA inscrita na DGE',
        why: 'Sem manutenção regular, defeitos acumulam-se até falha catastrófica causando morte',
        solution: 'Celebrar contrato de manutenção (simples ou completa) com EMA certificada',
        urgency: 'CRÍTICO',
        regulation: 'Decreto-Lei 320/2002, Artigo 3º',
        deadline: 'Imediato',
        penalty: '€1000 a €5000 + responsabilidade criminal'
    },
    'DL320-4': {
        title: 'Contrato de manutenção obrigatório (Art. 4º DL 320/2002)',
        explanation: 'Proprietário deve ter contrato válido com EMA',
        why: 'Elevador sem contrato não tem responsável legal pela segurança',
        solution: 'Assinar contrato de manutenção antes de entrada em serviço',
        urgency: 'ALTO',
        regulation: 'Decreto-Lei 320/2002, Artigo 4º',
        penalty: '€1000 a €5000'
    },
    'DL320-5': {
        title: 'Identificação da EMA na cabina (Art. 5º DL 320/2002)',
        explanation: 'Cabina deve ter placa visível com EMA, contactos e tipo de contrato',
        why: 'Sem identificação, utilizadores não sabem quem contactar em emergência',
        solution: 'Afixar placa legível com nome EMA, telefone e tipo contrato',
        urgency: 'MÉDIO',
        regulation: 'Decreto-Lei 320/2002, Artigo 5º'
    },
    'DL320-6': {
        title: 'EMA sem registo na DGE (Art. 6º DL 320/2002)',
        explanation: 'EMA deve estar inscrita no registo oficial da DGE',
        why: 'EMA sem registo pode não ter competência técnica nem seguro obrigatório',
        solution: 'Verificar se EMA tem registo DGE válido antes de contratar',
        urgency: 'CRÍTICO',
        regulation: 'Decreto-Lei 320/2002, Artigo 6º',
        penalty: '€7500 a €37500 para EMA'
    },
    'DL320-8': {
        title: 'Inspecção periódica (Art. 8º DL 320/2002)',
        explanation: 'Elevador deve ter inspecção periódica conforme periodicidade: 2, 4 ou 6 anos',
        why: 'Sem inspecção, defeitos críticos não são detetados causando acidentes mortais',
        solution: 'Requerer inspecção à Câmara Municipal antes do prazo expirar',
        urgency: 'ALTO',
        regulation: 'Decreto-Lei 320/2002, Artigo 8º',
        deadline: '2 anos (comercial), 4 anos (misto/grande), 6 anos (habitacional)',
        penalty: '€250 a €5000'
    },
    'DL320-9': {
        title: 'Participação de acidentes (Art. 9º DL 320/2002)',
        explanation: 'EMA e proprietário devem participar acidentes à Câmara Municipal',
        why: 'Acidentes não reportados impedem investigação e prevenção de mortes futuras',
        solution: 'Comunicar acidente em 3 dias (imediato se morte) à Câmara Municipal',
        urgency: 'CRÍTICO',
        regulation: 'Decreto-Lei 320/2002, Artigo 9º',
        deadline: '3 dias (imediato se vítimas mortais)',
        penalty: 'Responsabilidade criminal'
    },
    'DL320-11': {
        title: 'Elevador selado (Art. 11º DL 320/2002)',
        explanation: 'Elevador selado pela Câmara Municipal não pode funcionar',
        why: 'Selagem indica risco grave - funcionar pode matar',
        solution: 'Corrigir defeitos, solicitar reinspecção, aguardar desselagem',
        urgency: 'CRÍTICO',
        regulation: 'Decreto-Lei 320/2002, Artigo 11º',
        penalty: 'Responsabilidade criminal em caso de acidente'
    },
    'DL320-17': {
        title: 'Cabina sem porta (Art. 17º DL 320/2002)',
        explanation: 'Cabinas sem porta devem ser remodeladas em 5 anos (edifícios comerciais)',
        why: 'Cabina sem porta permite queda durante movimento ou contacto com caixa',
        solution: 'Instalar porta automática certificada na cabina',
        urgency: 'ALTO',
        regulation: 'Decreto-Lei 320/2002, Artigo 17º',
        deadline: '5 anos (comercial), dispensado em habitacional',
        penalty: 'Obrigação de remodelação'
    },
    'DL320-17-CARGA': {
        title: 'Controlo de carga (Art. 17º DL 320/2002)',
        explanation: 'Elevador deve ter dispositivo de controlo de sobrecarga',
        why: 'Sobrecarga pode causar ruptura de cabos ou falha de freios matando todos',
        solution: 'Instalar dispositivo que impede arranque com excesso de carga',
        urgency: 'ALTO',
        regulation: 'Decreto-Lei 320/2002, Artigo 17º n.º5',
        deadline: '3 anos desde publicação',
        penalty: 'Obrigação de instalação'
    },
    
    // ==================== DECRETO-LEI 295/98 - MARCAÇÃO CE E CONFORMIDADE ====================
    'DL295-4': {
        title: 'Sem Marcação CE de conformidade (Art. 4º + 11º DL 295/98)',
        explanation: 'Ascensor ou componente colocado no mercado SEM marcação CE',
        why: 'Equipamento não verificado por organismo notificado pode ter falhas graves de segurança causando acidentes fatais - cabos não testados, freios sem certificação, portas sem encravamento verificado',
        solution: 'Submeter a exame CE de tipo por organismo notificado + obter declaração de conformidade + apor marcação CE antes de comercializar',
        urgency: 'CRÍTICO',
        regulation: 'Decreto-Lei 295/98, Artigos 4º, 6º, 9º',
        deadline: 'Imediato - proibição de venda/instalação',
        penalty: '€2.494 a €44.892 + proibição de mercado pelo Ministro Economia'
    },
    'DL295-5': {
        title: 'Canalizações na caixa do ascensor (Art. 5º n.º3 DL 295/98)',
        explanation: 'Caixa contém canalizações ou instalações além das necessárias ao funcionamento',
        why: 'Canalizações de gás podem causar explosão, água pode inundar poço electrocutando técnicos, esgoto contamina durante resgate',
        solution: 'Remover TODAS canalizações estranhas - apenas elétricas e hidráulicas do ascensor',
        urgency: 'ALTO',
        regulation: 'Decreto-Lei 295/98, Artigo 5º n.º3',
        deadline: '30 dias',
        penalty: '€1.496 a €24.940'
    },
    'DL295-7-INDEVIDA': {
        title: 'Marcação CE indevida - Falsa conformidade (Art. 7º + 9º DL 295/98)',
        explanation: 'Marcação CE aposta SEM cumprir procedimentos de avaliação ou requisitos essenciais',
        why: 'Falsa certificação esconde perigos reais - público confia em segurança inexistente causando mortes',
        solution: 'Retirar marcação + submeter a avaliação correta por organismo notificado + corrigir não-conformidades',
        urgency: 'CRÍTICO',
        regulation: 'Decreto-Lei 295/98, Artigos 7º, 9º',
        deadline: 'Imediato - prazo fixado por fiscalização',
        penalty: 'Proibição mercado/serviço + €2.494 a €44.892 + responsabilidade criminal em caso acidente'
    },
    'DL295-ANEXO-I-2.2': {
        title: 'Cabina sem acessibilidade para deficientes (Anexo I n.º2.2 DL 295/98)',
        explanation: 'Cabina com dimensões que permitem mas não facilita acesso a pessoas deficientes',
        why: 'Cadeiras de rodas ou bengalas podem encravar em portas estreitas causando quedas ou esmagamentos',
        solution: 'Adaptar cabina: alargar porta, instalar corrimões, botões acessíveis, sinalização tátil',
        urgency: 'MODERADO',
        regulation: 'Decreto-Lei 295/98, Anexo I n.º2.2',
        deadline: 'Próxima remodelação ou 6 meses se prédio público',
        penalty: 'Incluído em não-conformidade - proibição de entrada em serviço'
    },
    'DL295-ANEXO-I-4.4': {
        title: 'Dispositivo anti-queda desativado - Movimento sem proteção (Anexo I n.º4.4 DL 295/98)',
        explanation: 'Ascensor pode mover-se quando dispositivo Art. 4.2 (pára-quedas) não está operacional',
        why: 'Se pára-quedas falhar OU estiver desligado, cabina cai em queda livre esmagando ocupantes - MORTE GARANTIDA',
        solution: 'Instalar bloqueio que impede movimento se pára-quedas não operacional + verificar circuito segurança',
        urgency: 'CRÍTICO',
        regulation: 'Decreto-Lei 295/98, Anexo I n.º4.4',
        deadline: '0 dias - DESATIVAR ELEVADOR IMEDIATAMENTE',
        penalty: 'Proibição entrada em serviço + responsabilidade criminal se continuar operação'
    },
    'DL295-ANEXO-III': {
        title: 'Marcação CE com grafismo incorreto (Anexo III DL 295/98)',
        explanation: 'Marcação CE não respeita grafismo oficial ou dimensões mínimas (5mm)',
        why: 'Marcação adulterada pode esconder origem duvidosa ou falsificação',
        solution: 'Apor marcação CE com grafismo correto segundo Anexo III + dimensão mínima 5mm',
        urgency: 'MODERADO',
        regulation: 'Decreto-Lei 295/98, Anexo III',
        deadline: '7 dias',
        penalty: 'Incluído em marcação CE indevida - €2.494 a €44.892'
    },
    'DL295-ANEXO-IV': {
        title: 'Componente de segurança sem certificação (Anexo IV DL 295/98)',
        explanation: 'Componente crítico (encravamento, pára-quedas, limitador, amortecedor) sem exame CE',
        why: 'Componente não testado pode falhar causando queda livre, esmagamento, electrocussão',
        solution: 'Substituir por componente certificado COM declaração CE + número organismo notificado',
        urgency: 'CRÍTICO',
        regulation: 'Decreto-Lei 295/98, Anexo IV + Art. 11º',
        deadline: 'Imediato - componente NÃO pode ser instalado',
        penalty: '€2.494 a €44.892 por componente + proibição instalação'
    }
};

const classificationInfo = {
    'C1': {
        level: 'CRÍTICO',
        color: 'red',
        icon: '🔴',
        meaning: 'Risco imediato de acidente grave ou morte',
        action: 'DESATIVAR ELEVADOR IMEDIATAMENTE',
        deadline: '0 dias (imobilização imediata)',
        legalConsequence: 'Responsabilidade criminal em caso de acidente',
        reference: 'Portaria 344/93 Art. 6º + DL 320/2002'
    },
    'C2': {
        level: 'MODERADO',
        color: 'orange',
        icon: '🟠',
        meaning: 'Não conformidade que pode evoluir para risco crítico',
        action: 'Correção necessária no prazo estabelecido',
        deadline: 'Prazo estabelecido pelo inspetor (geralmente 30-90 dias)',
        additionalInfo: '⚠️ ATENÇÃO: Despacho 17/2022 (2 anos) foi REVOGADO pelo Despacho 27/2024 em 24/09/2024',
        legalConsequence: 'Coima €2.000-€15.000 se não corrigido no prazo',
        reference: 'Portaria 344/93, Art. 6º e 7º | Decreto-Lei 320/2002'
    },
    'C3': {
        level: 'LEVE',
        color: 'yellow',
        icon: '🟡',
        meaning: 'Não conformidade menor sem risco imediato',
        action: 'Incluir em próxima manutenção',
        deadline: 'Até próxima inspeção periódica',
        legalConsequence: 'Advertência possível',
        reference: 'Portaria 344/93 Art. 6º'
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
 * 🔥 НОВА ФУНКЦІЯ: Аналіз звіту з фільтрацією службових текстів
 * Використовує ту саму логіку що й unified-server.js analyzeInspectionReport()
 */
function analyzeInspectionReportFromText(reportText) {
    console.log('🔍 Аналіз звіту з НОВОЮ логікою, довжина тексту:', reportText.length);
    
    const violations = [];
    const lines = reportText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Шукаємо явні мітки C1, C2, C3 на початку рядка
        const clauseMatch = line.match(/^(C[123])\s+/i);
        
        if (clauseMatch) {
            const severity = clauseMatch[1].toUpperCase();
            
            // Перевіряємо поточний рядок І наступний для пошуку номера статті
            const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
            const combinedText = line + ' ' + nextLine;
            
            // Витягуємо номер статті
            const articleMatch = combinedText.match(/Art[ºo]?\.\s*(\d+)\s*[ºo°\.]*\s*(\d*)/i);
            
            let article = null;
            
            if (articleMatch) {
                article = articleMatch[2] 
                    ? `${articleMatch[1]}.${articleMatch[2]}`
                    : `${articleMatch[1]}`;
            }
            
            // ФІЛЬТР: пропускаємо загальні пояснення та службові тексти
            const skipPhrases = [
                'foram detetadas cláusulas',
                'foram detectadas cláusulas',
                'correspondem a situações',
                'regularizar no prazo',
                'elevador reprovado',
                'estas cláusulas',
                'caso tenham sido'
            ];
            
            const isGenericText = skipPhrases.some(phrase => combinedText.toLowerCase().includes(phrase));
            
            if (isGenericText) {
                console.log(`⚠️ Пропущено (загальний текст): ${combinedText.substring(0, 80)}...`);
                continue;
            }
            
            // Витягуємо опис порушення
            let violation = nextLine || line;
            const violationMatch = (nextLine || line).match(/(?:Porушення:|–)\s*(.+)/i);
            if (violationMatch) {
                violation = violationMatch[1].trim();
            }
            
            // Якщо немає явного номера статті - визначаємо за змістом
            if (!article) {
                article = detectArticleByContentLocal(violation);
                if (article) {
                    console.log(`🎯 Артикул визначено за змістом: ${article}`);
                } else {
                    console.log(`⚠️ Пропущено (немає номера статті): ${line.substring(0, 80)}...`);
                    continue;
                }
            }
            
            // Перевіряємо дедуплікацію
            const isDuplicate = violations.some(v => 
                v.article === article && v.classification === severity
            );
            
            if (isDuplicate) {
                console.log(`⚠️ Пропущено (дублікат): ${article} - ${severity}`);
                continue;
            }
            
            violations.push({
                classification: severity,
                article: article,
                description: violation,
                category: determineCategoryFromTextLocal(violation)
            });
            
            console.log(`✅ Додано порушення: ${severity} - Art. ${article}`);
        }
    }
    
    console.log(`📊 Знайдено порушень: ${violations.length}`);
    return { violations };
}

/**
 * Визначення категорії за змістом тексту
 */
function determineCategoryFromTextLocal(text) {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('escada') || textLower.includes('acesso') || textLower.includes('alçapão')) {
        return 'Acesso e Circulação';
    }
    if (textLower.includes('fim de curso') || textLower.includes('dispositivo')) {
        return 'Dispositivos de Segurança';
    }
    if (textLower.includes('peças salientes') || textLower.includes('resguard') || textLower.includes('proteção')) {
        return 'Proteções e Resguardos';
    }
    if (textLower.includes('porta') || textLower.includes('bloqueio')) {
        return 'Segurança de Portas';
    }
    if (textLower.includes('travagem') || textLower.includes('travão')) {
        return 'Sistema de Travagem';
    }
    if (textLower.includes('iluminação') || textLower.includes('luz')) {
        return 'Iluminação';
    }
    if (textLower.includes('alarme') || textLower.includes('comunicação')) {
        return 'Sistema de Alarme';
    }
    if (textLower.includes('cabo') || textLower.includes('suspensão')) {
        return 'Cabos e Suspensão';
    }
    
    return 'Geral';
}

/**
 * Визначення артикулу за змістом (локальна копія)
 */
function detectArticleByContentLocal(text) {
    const textLower = text.toLowerCase();
    
    const articleDatabase = {
        '22': ['escada de acesso', 'acesso à casa das máquinas', 'alçapão', 'contrabalançado', 'corrimão', 'pegas'],
        '74': ['fim de curso', 'dispositivo de segurança', 'contrapeso', 'pára-choques'],
        '85': ['peças salientes', 'máquinas', 'volantes', 'engrenagens', 'correias', 'resguardadas'],
        '6': ['porta de patamar', 'bloqueio', 'fechadura', 'sensor de porta'],
        '12': ['travão', 'travagem', 'freio', 'sistema de travagem'],
        '35': ['iluminação', 'luz de emergência'],
        '45': ['pára-quedas', 'paraquedas', 'limitador de velocidade'],
        '50': ['cabos', 'cabo de tração', 'desgaste', 'fios partidos', 'suspensão'],
        '18': ['alarme', 'comunicação', 'telefone de emergência'],
        '25': ['documentação', 'manual', 'certificado', 'livro de registo'],
        '8': ['ucm', 'unidade de comando', 'quadro elétrico'],
        '15': ['sinalização', 'placa', 'identificação', 'carga máxima'],
        '60': ['acessibilidade', 'braille', 'deficientes']
    };
    
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
    
    if (Object.keys(scores).length > 0) {
        const bestMatch = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
        return bestMatch[0];
    }
    
    return null;
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
    
    // Формат 4: Tabela (C1 | 45 | опис)
    const format4Regex = /([C][123])\s*[|\t]\s*(\d+[a-z]?\.?\d*\.?\d*)\s*[|\t]\s*([^\n]{10,200})/gi;
    
    while ((match = format4Regex.exec(text)) !== null) {
        const key = `${match[1]}-${match[2]}-${match[3].substring(0, 50)}`;
        if (!seen.has(key)) {
            seen.add(key);
            violations.push(createViolation(match[1], match[2], match[3].trim(), 'table'));
        }
    }
    
    // Формат 5: Нумерований список з складними артикулами
    // Приклад: "4 - ART. 320 8 1 B C2 Artigo 8°.1 - Não foi completada..."
    // Приклад: "1 - ART. 740 74 A C2 De acordo com o Decreto-Lei..."
    // ⚠️ ВАЖЛИВО: Зупиняємося на "Nota :" або наступному порушенні
    const format5Regex = /(\d+)\s*[-–]\s*ART\.?\s+(\d+(?:\s+\d+)*)\s+([A-Z])\s+(C[123])\s+(.{15,400}?)(?=\s*\d+\s*[-–]\s*ART\.|Nota\s*:|$)/gis;
    
    while ((match = format5Regex.exec(text)) !== null) {
        const violationNum = match[1]; // Номер порушення (1, 2, 3...)
        const rawArticle = match[2].trim(); // "320 8 1" або "740 74"
        const letter = match[3]; // A, B, C, D...
        const classification = match[4];
        let description = match[5].trim();
        
        // Витягуємо правильний номер артикулу:
        // "740 74" → це "Decreto-Lei 740/74", беремо останнє "74"
        // "320 8 1" → це "DL 320/2002 Artigo 8.1", беремо перше "320"
        const numbers = rawArticle.split(/\s+/).map(n => parseInt(n));
        let articleNum;
        
        if (numbers.length === 1) {
            articleNum = numbers[0].toString(); // "105" → "105"
        } else if (numbers.length === 2 && numbers[0] === 740) {
            // Спеціальний випадок: "740 74" це Decreto-Lei 740/74
            articleNum = numbers[1].toString(); // → "74"
        } else {
            // Для "320 8 1" та інших - беремо перше число (основний артикул)
            articleNum = numbers[0].toString(); // "320 8 1" → "320"
        }
        
        // Очищаємо опис від зайвих символів
        description = description
            .replace(/^[-–—:.\s]+/, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Видаляємо тільки номери сторінок в кінці (наприклад: "текст 4 -")
        description = description.replace(/\s+\d+\s*[-–—]*\s*$/g, '').trim();
        
        // Якщо опис занадто довгий, обрізаємо до розумної довжини
        if (description.length > 500) {
            const cutPoint = description.substring(0, 500).lastIndexOf('.');
            if (cutPoint > 200) {
                description = description.substring(0, cutPoint + 1).trim();
            } else {
                description = description.substring(0, 500).trim() + '...';
            }
        }
        
        // 🔧 КОРЕКЦІЯ КЛАСИФІКАЦІЇ для Format 5
        let correctedClassification = classification;
        
        // Артикулі що ЗАВЖДИ C3 (низький ризик)
        const alwaysC3Articles = ['900', '901', '902'];
        
        // Перевірка чи це NOTA (примітка)
        const isNota = /^NOTA\s*:/i.test(description) || /^O\s+dispositivo\s+elétrico/i.test(description);
        
        if (alwaysC3Articles.includes(articleNum) || isNota) {
            if (correctedClassification !== 'C3') {
                console.log(`🔧 Format 5: Correcting Art.${articleNum} from ${correctedClassification} to C3 (NOTA)`);
                correctedClassification = 'C3';
            }
        }
        
        // Уніфікований ключ дедуплікації (такий самий як в Format 6)
        const key = `${correctedClassification}-${articleNum}-${description.substring(0, 100)}`;
        if (!seen.has(key)) {
            seen.add(key);
            console.log(`✅ Format 5 match: ${correctedClassification} Art.${articleNum} (${letter}) - "${description.substring(0, 60)}..."`);
            violations.push(createViolation(correctedClassification, articleNum, description, 'numbered_list'));
        }
    }
    
    // Формат 5B: NOTA (примітки) - завжди C3
    // Приклад: "Nota : Verificou-se que as portas interiores..."
    // Ці записи йдуть після основних порушень і є інформаційними
    const notaRegex = /(?:NOTA|Nota)\s*:\s*(.{30,400}?)(?=\d+\s*[-–]\s*ART\.|NOTA|Nota|$)/gis;
    
    while ((match = notaRegex.exec(text)) !== null) {
        let description = match[1].trim();
        
        // Очищаємо опис
        description = description
            .replace(/\s+/g, ' ')
            .replace(/[-–—]+$/, '')
            .trim();
        
        // Пропускаємо занадто короткі або загальні примітки
        if (description.length < 30 || /^(O|A|As|Os)\s+\w+\s+\w+$/i.test(description)) {
            continue;
        }
        
        // NOTA завжди C3 і артикул 900
        const key = `C3-900-${description.substring(0, 100)}`;
        if (!seen.has(key)) {
            seen.add(key);
            console.log(`✅ Format 5B (NOTA): C3 Art.900 - "${description.substring(0, 60)}..."`);
            violations.push(createViolation('C3', '900', `NOTA: ${description}`, 'nota'));
        }
    }
    
    // ⭐ Формат 6: Контекстний пошук для "NOTA DE CLÁUSULAS" та інших форматів
    // Використовується коли формати 1-5 не знайшли порушень
    if (violations.length === 0) {
        console.log('🔍 No violations found in formats 1-5, trying contextual search for C1/C2/C3...');
        
        // Перевіряємо чи це звіт з клаузами
        const hasClauseSection = /NOTA\s+DE\s+CLÁUSULAS|CLÁUSULAS?\s+DE\s+CUMPRIMENTO|NÃO\s+CONFORMIDADES?/i.test(text);
        
        if (hasClauseSection) {
            console.log('📋 Found clause section - using contextual extraction');
        } else {
            console.log('⚠️ Using contextual search without clause section header');
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
            // 🔥 ЗАГОЛОВКИ СЕКЦІЙ - НЕ порушення!
            /AS\s+CLÁUSULAS\s+A\s+SEGUIR\s+INDICADAS/i,
            /APLICADAS\s+NO\s+DECURSO\s+DE\s+INSPEÇÃO/i,
            /DEVERÃO\s+SER\s+REGULARIZADAS/i,
            /NO\s+MAIS\s+CURTO\s+ESPAÇO\s+DE\s+TEMPO/i,
            /NÃO\s+PODERÁ\s+ULTRAPASSAR\s+A\s+DATA/i,
            /PRÓXIMA\s+INSPEÇÃO?\s+PERIÓDICA/i,
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
            
            // 🔧 КОРЕКЦІЯ КЛАСИФІКАЦІЇ: Деякі артикулі мають фіксовану класифікацію
            // ⚠️ ВАЖЛИВО: Довіряємо класифікації з PDF (її ставить сертифікований інспектор)
            // Виправляємо ТІЛЬКИ якщо маємо точні дані з регламенту що класифікація неправильна
            let correctedClassification = classification;
            
            // Артикулі що ЗАВЖДИ C3 (низький ризик - примітки, документація)
            // Тільки конкретні артикулі підтверджені регламентом, БЕЗ автоматичного >= 900
            const alwaysC3Articles = ['900', '901', '902', 'NOTA'];
            
            // Артикулі що ЗАВЖДИ C2 (середній ризик)
            const alwaysC2Articles = ['85', '86', '87'];
            
            // Артикулі що ЗАВЖДИ C1 (критичний ризик - безпека)
            const alwaysC1Articles = ['14', '39', '9'];
            
            // Перевірка чи це NOTA (примітка) - завжди інформаційна, не порушення
            const isNota = /^NOTA\s*:/i.test(description) || /^O\s+dispositivo\s+elétrico/i.test(description);
            
            if (alwaysC1Articles.includes(articleNum)) {
                if (correctedClassification !== 'C1') {
                    console.log(`🔧 Correcting classification: Art.${articleNum} is always C1 (was ${correctedClassification})`);
                    correctedClassification = 'C1';
                }
            } else if (alwaysC2Articles.includes(articleNum)) {
                if (correctedClassification !== 'C2') {
                    console.log(`🔧 Correcting classification: Art.${articleNum} is always C2 (was ${correctedClassification})`);
                    correctedClassification = 'C2';
                }
            } else if (alwaysC3Articles.includes(articleNum) || isNota) {
                // ✅ ВИДАЛЕНО: || parseInt(articleNum) >= 900
                // Тепер довіряємо PDF класифікації для всіх артикулів крім конкретно перелічених
                if (correctedClassification !== 'C3') {
                    console.log(`🔧 Correcting classification: Art.${articleNum} is always C3 (was ${correctedClassification})`);
                    correctedClassification = 'C3';
                }
            }
            
            // 🔑 Унікальний ключ: класифікація + стаття + опис
            // Якщо та сама проблема має C2 і C3 - це ДВІ різні порушення!
            const key = `${correctedClassification}-${articleNum}-${description.substring(0, 100)}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                violations.push(createViolation(correctedClassification, articleNum, description, 'contextual'));
            } else {
                console.log(`⏭️ Skipping exact duplicate: ${correctedClassification} Art.${articleNum}`);
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
        
        // 🔥 ВИКОРИСТОВУЄМО НОВУ ЛОГІКУ з фільтрацією службових текстів
        const analysisResult = analyzeInspectionReportFromText(text);
        const violations = analysisResult.violations;
        
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
    getViolationsStats,
    regulationArticles,
    classificationInfo
};
