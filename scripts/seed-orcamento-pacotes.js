#!/usr/bin/env node
/**
 * Seed de pacotes de orçamento (tipo:'pacote'): linhas vendáveis que agrupam
 * várias categorias individuais por componente. Pacotes independentes — motor,
 * travão, operador de porta, etc. vendem-se separadamente.
 *
 * Idempotente — upsert por `nome`; `inclui` é atualizado a cada execução.
 * precoSugerido = 0 (preencher no admin). Nomes em `inclui` são resolvidos na BD;
 * os que não existirem são listados no fim.
 *
 * Uso:  node scripts/seed-orcamento-pacotes.js [--dry-run]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const OrcamentoCategoria = require('../models/OrcamentoCategoria');

const DRY = process.argv.includes('--dry-run');

const pacotes = [
    {
        nome: 'PACOTE — Conjunto limitador de velocidade',
        zona: 'maquina', grupo: 'seguranca',
        descricao: 'Fornecimento e instalação de conjunto limitador de velocidade completo: limitador, roda tensora com proteção de saída do cabo, cabo, contacto elétrico de paragem e todos os elementos de fixação, com regulação, ensaio de atuação e selagem.',
        inclui: [
            'Limitador de velocidade — substituição (limitador/cabo)',
            'Limitador de velocidade — fixação (pontos de fixação)',
            'Limitador de velocidade — selagem',
            'Roda tensora do limitador — proteção de saída do cabo',
            'Limitador de velocidade — contacto elétrico de paragem na subida',
            'Excesso de velocidade na subida — proteção da cabina'
        ]
    },
    {
        nome: 'PACOTE — Roda tensora do limitador',
        zona: 'poco', grupo: 'seguranca',
        descricao: 'Fornecimento e instalação de roda tensora do limitador de velocidade com proteção contra saída do cabo, incluindo contacto de controlo de tensão e ensaio.',
        inclui: ['Roda tensora do limitador — proteção de saída do cabo']
    },
    {
        nome: 'PACOTE — Máquina de tração',
        zona: 'maquina', grupo: 'mecanico',
        descricao: 'Fornecimento e instalação de máquina de tração, incluindo apoio/bancada, gornes, proteção contra saída dos cabos, resguardo de peças rotativas, afinação e ensaio. (Motor e travão em pacotes próprios.)',
        inclui: [
            'Máquina de tração — reparação de folgas no eixo',
            'Máquina de tração — reparação de fuga de óleo',
            'Máquina de tração — reparação do apoio (bancada)',
            'Máquina — resguardo de peças rotativas (volante, engrenagens, correias)',
            'Gornes — substituição (desgaste)',
            'Roda de tração — proteção contra saída dos cabos (gornes)'
        ]
    },
    {
        nome: 'PACOTE — Motor de tração',
        zona: 'maquina', grupo: 'eletrico',
        descricao: 'Fornecimento e instalação de motor de tração com proteção térmica (sonda PTC), ligações e ensaio.',
        inclui: ['Motor de tração — proteção térmica (sonda PTC)']
    },
    {
        nome: 'PACOTE — Travão',
        zona: 'maquina', grupo: 'seguranca',
        descricao: 'Fornecimento e instalação de travão com maxilas de atuação independente, monitorização e chave de desfrenagem manual, incluindo ensaio.',
        inclui: [
            'Maxilas de travão acionadas individualmente',
            'Travão — monitorização',
            'Travão — chave de desfrenagem manual'
        ]
    },
    {
        nome: 'PACOTE — Quadro de manobra (comando)',
        zona: 'quadro', grupo: 'eletrico',
        descricao: 'Fornecimento e instalação de quadro de manobra completo, incluindo variador, proteções, bypass das portas, UCM, paragem por imobilização anormal, modo bombeiros, identificação de circuitos, ligações e ensaios.',
        inclui: [
            'Quadro de Elevador de tecnologia CPU STO',
            'Bypass das portas — monitorização independente',
            'UCM (movimento incontrolável) — condições de ensaio',
            'Imobilização anormal da cabina/contrapeso — dispositivo de paragem',
            'Modo bombeiros — condições de ensaio',
            'Interruptor geral — junto à máquina / dispositivo STOP',
            'Invólucro e barramento do quadro geral — proteção contra contactos diretos',
            'Proteção diferencial 30 mA — tomadas, iluminação e saídas',
            'Proteção diferencial — tipo B para variador / ordem das proteções',
            'Quadro elétrico — identificação de circuitos e proteções (em português)'
        ]
    },
    {
        nome: 'PACOTE — Operador de porta de cabina',
        zona: 'cabina', grupo: 'mecanico',
        descricao: 'Fornecimento e instalação de operador de porta de cabina, incluindo regulação, contactos, botão de abertura e ensaio.',
        inclui: ['Botão de abertura da porta']
    },
    {
        nome: 'PACOTE — Portas de patamar',
        zona: 'patamar', grupo: 'seguranca',
        descricao: 'Revisão/adequação das portas de patamar: fechaduras com duplo contacto elétrico, braço elástico, amortecedor hidráulico do fecho, visor, aviso da chave de desencravamento, soleiras e tratamento anticorrosivo e pintura.',
        inclui: [
            'Fechaduras de patamar com duplo contacto elétrico',
            'Braço elástico — inversão do fecho da porta',
            'Portas de patamar — amortecedor hidráulico do fecho',
            'Portas de patamar — visor (dimensão ≤ 15 cm)',
            'Chave de desencravamento — aviso de perigo',
            'Soleiras cabina/patamar — ajuste de folga (≤ 2 cm)',
            'Portas de patamar — tratamento anticorrosivo e pintura'
        ]
    },
    {
        nome: 'PACOTE — Cabos de suspensão',
        zona: 'caixa', grupo: 'mecanico',
        descricao: 'Fornecimento e instalação de cabos de suspensão, com igualização da tensão, marcação da zona de desencravamento e ensaio.',
        inclui: [
            'Cabos de suspensão — substituição (desgaste, fios partidos)',
            'Cabos de suspensão — encurtamento (esticados)',
            'Cabos de suspensão — marcação da zona de desencravamento',
            'Igualizador de tensão dos cabos — substituição das molas'
        ]
    },
    {
        nome: 'PACOTE — Botoneiras e sinalização',
        zona: 'cabina', grupo: 'eletrico',
        descricao: 'Fornecimento e instalação de botoneira de cabina e botoeiras de patamar, com setas/sinalizadores, indicação de posição, identificação do elevador, mensagem de voz e sinalização de sobrecarga.',
        inclui: [
            'Botoneira de Cabina',
            'Botoneira — botão STOP e identificação dos botões',
            'Botoeiras de Patamar',
            'Setas/sinalizadores',
            'Indicação da presença da cabina / luz permanente',
            'Número de identificação do elevador',
            'Mensagem de voz de posição',
            'Sobrecarga — sinalização sonora e visual'
        ]
    },
    {
        nome: 'PACOTE — Iluminação e emergência',
        zona: 'cabina', grupo: 'eletrico',
        descricao: 'Iluminação (≥ 50 lux) da cabina, caixa, patamares e casa das máquinas, com luzes de emergência e comunicação bidirecional.',
        inclui: [
            'Iluminação (≥ 50 lux) — luminárias/LED',
            'Iluminação de caixa',
            'Iluminação (≥ 50 lux) — luminárias',
            'Iluminação da casa das máquinas (LED)',
            'Luz de emergência da casa das máquinas',
            'Comunicação bidirecional e luz de emergência da cabina'
        ]
    }
];

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const todas = await OrcamentoCategoria.find({ tipo: { $ne: 'pacote' } }, 'nome').lean();
    const porNome = new Map(todas.map(c => [c.nome, c._id]));
    const faltam = [];

    for (const [i, p] of pacotes.entries()) {
        const ids = [];
        p.inclui.forEach(n => porNome.has(n) ? ids.push(porNome.get(n)) : faltam.push(`${p.nome} -> ${n}`));
        console.log(`${DRY ? '[dry] ' : ''}${p.nome} (${ids.length}/${p.inclui.length})`);
        if (DRY) continue;
        await OrcamentoCategoria.updateOne(
            { nome: p.nome },
            {
                $set: { tipo: 'pacote', inclui: ids, zona: p.zona, grupo: p.grupo, descricao: p.descricao },
                $setOnInsert: { nome: p.nome, unidade: 'verba', precoSugerido: 0, norma: '', notaNaoConformidade: '', critico: false, ativo: true, ordem: i }
            },
            { upsert: true }
        );
    }
    if (faltam.length) console.log('\nNomes não encontrados:\n' + faltam.join('\n'));
    await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
