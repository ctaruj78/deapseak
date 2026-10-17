/**
 * Pontos da EN 81-1:1998 (+A2:2004, +A3:2009) referidos nos relatórios GATECI
 * ("C29.10.10 …" = classe C2, ponto 9.10.10).
 *
 * ATENÇÃO: estes números NÃO são "Artigo N.º" do Decreto-Lei — não misturar com
 * regulation-articles-complete.js.
 *
 * Resolução: prefixo mais longo ("9.10.10" → "9.10" → "9"). Capítulos 5–16 cobertos;
 * subpontos só onde o significado é seguro.
 */

const CHAPTERS = {
    '5': {
        title: 'Caixa do elevador',
        why: 'A caixa protege pessoas contra o contacto com partes móveis e garante o espaço seguro do poço e da folga superior.',
        solution: 'Corrigir a deficiência na caixa/poço (proteções, iluminação, acessos, dispositivos de alarme) conforme o ponto indicado.',
    },
    '6': {
        title: 'Casa de máquinas e de polias',
        why: 'Humidade, falta de acesso, iluminação ou ventilação degradam o equipamento e criam risco eléctrico e de queda para o técnico.',
        solution: 'Eliminar a causa (infiltração, ventilação, acesso, iluminação) e verificar a casa de máquinas na próxima manutenção.',
    },
    '7': {
        title: 'Portas de patamar',
        why: 'As portas de patamar impedem a queda para a caixa; fecho ou encravamento deficiente é causa direta de acidentes graves.',
        solution: 'Ajustar/reparar fechaduras, contactos e folgas das portas; testar o encravamento em todos os pisos.',
    },
    '8': {
        title: 'Cabina, contrapeso e massa de equilíbrio',
        why: 'Paredes, piso, teto e portas da cabina protegem os utilizadores; defeitos aumentam o risco de queda, corte ou entalamento.',
        solution: 'Reparar ou substituir o elemento da cabina em causa.',
    },
    '9': {
        title: 'Suspensão, compensação e proteção contra excesso de velocidade',
        why: 'Cabos, limitador e para-quedas são a última barreira contra queda livre ou sobrevelocidade da cabina.',
        solution: 'Inspecionar, limpar/lubrificar ou substituir o componente; testar o dispositivo de proteção após a intervenção.',
    },
    '10': {
        title: 'Guias, amortecedores e fins de curso',
        why: 'Guiamento deficiente provoca vibração, desgaste e, no limite, descarrilamento da cabina; amortecedores e fins de curso limitam o curso.',
        solution: 'Substituir calços/roçadeiras desgastados, ajustar guias, verificar amortecedores e fins de curso.',
    },
    '11': {
        title: 'Folgas e distâncias de segurança (cabina/contrapeso)',
        why: 'Folgas insuficientes em topo ou poço podem esmagar pessoas durante manutenção ou em sobrecurso.',
        solution: 'Restabelecer as distâncias de segurança e verificar os dispositivos de limitação de curso.',
    },
    '12': {
        title: 'Máquina de elevação',
        why: 'Máquina, travão e redutor garantem a travagem e o controlo da cabina; fugas e desgaste comprometem a segurança e o ambiente.',
        solution: 'Reparar a fuga/desgaste (vedantes, óleo, travão) e verificar o funcionamento do travão.',
    },
    '13': {
        title: 'Instalação e aparelhos eléctricos',
        why: 'Deficiências eléctricas (cablagem, contactores, isolamento) causam avarias e risco de choque ou incêndio.',
        solution: 'Corrigir a instalação eléctrica por técnico habilitado e medir o isolamento.',
    },
    '14': {
        title: 'Proteção contra defeitos eléctricos, comandos e prioridades',
        why: 'Comandos, sinalização e dispositivos de alarme permitem operar o elevador e pedir socorro em segurança.',
        solution: 'Reparar o dispositivo/comando em causa e testar o seu funcionamento.',
    },
    '15': {
        title: 'Avisos, marcações e instruções de utilização',
        why: 'Placas e instruções em falta ou ilegíveis impedem o utilizador de agir corretamente numa emergência.',
        solution: 'Repor as placas e instruções obrigatórias (capacidade, alarme, instruções de emergência).',
    },
    '16': {
        title: 'Exames, ensaios, registo e manutenção',
        why: 'Sem registo e manutenção documentados não é possível demonstrar a conformidade do elevador.',
        solution: 'Regularizar o livro de registo e o plano de manutenção.',
    },
};

// Subpontos específicos (sobrepõem o capítulo). Chave = prefixo do ponto.
const CLAUSES = {
    '5.10': {
        title: 'Caixa — dispositivos de pedido de socorro',
        why: 'Quem trabalha na cobertura da cabina ou no poço tem de poder pedir socorro; sem comunicação o técnico fica isolado numa emergência.',
        solution: 'Reparar/substituir o dispositivo de alarme e a comunicação bidirecional na cobertura da cabina e no poço; testar.',
    },
    '6.3': {
        title: 'Casa de máquinas — condições do local',
        why: 'Humidade na casa de máquinas corrói o equipamento, degrada o isolamento eléctrico e pode causar avarias e choques.',
        solution: 'Localizar e eliminar a infiltração/condensação, secar e proteger o quadro e a máquina.',
    },
    '8.3': {
        title: 'Cabina — paredes, pavimento e teto',
        why: 'Pavimento ou revestimento irregular/danificado aumenta o risco de queda e tropeção dos utilizadores.',
        solution: 'Reparar ou substituir o revestimento/pavimento da cabina.',
    },
    '9.9': {
        title: 'Limitador de velocidade',
        why: 'O limitador aciona o para-quedas em sobrevelocidade; oxidação ou desgaste podem impedir a sua atuação.',
        solution: 'Limpar, lubrificar e verificar calibração/ cabo do limitador; substituir se necessário e repetir o ensaio de disparo.',
    },
    '9.10': {
        title: 'Proteção contra excesso de velocidade da cabina em subida',
        why: 'Sem este dispositivo, uma falha do travão com cabina leve pode levar a cabina a subir descontrolada até ao topo da caixa.',
        solution: 'Instalar/reparar o dispositivo de proteção contra subida excessiva (travagem da cabina, cabos ou veio) e ensaiá-lo.',
    },
    '10.1': {
        title: 'Guiamento da cabina e do contrapeso',
        why: 'Roçadeiras/calços desgastados aumentam a folga, provocam vibração e desgaste das guias.',
        solution: 'Substituir roçadeiras ou calços desgastados e lubrificar/ajustar as guias.',
    },
    '14.2.3': {
        title: 'Dispositivo de alarme / comunicação bidirecional na cabina',
        why: 'Pessoas presas na cabina têm de poder pedir socorro e ser ouvidas; a comunicação inoperacional é uma falha de segurança.',
        solution: 'Reparar ou substituir o telefone/intercomunicador e a ligação ao serviço de assistência; testar a comunicação nos dois sentidos.',
    },
};

/** Devolve a entrada mais específica para um ponto EN 81 ("9.10.10", "12", "8.3.2/10.1.2") ou null. */
function lookupEn81Clause(articleNum) {
    if (!articleNum) return null;
    const first = String(articleNum).split('/')[0].trim().replace(/\.$/, '');
    const parts = first.split('.');
    for (let n = parts.length; n >= 1; n--) {
        const key = parts.slice(0, n).join('.');
        if (CLAUSES[key]) return { ...CLAUSES[key], key, specific: true };
    }
    const chapter = CHAPTERS[parts[0]];
    return chapter ? { ...chapter, key: parts[0], specific: false } : null;
}

module.exports = { lookupEn81Clause, CHAPTERS, CLAUSES };
