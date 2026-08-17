#!/usr/bin/env node
/**
 * Seed do catálogo de categorias de orçamento de modernização.
 * Idempotente — upsert por `nome` usando $setOnInsert, seguro para correr
 * mais que uma vez: NUNCA sobrescreve uma categoria já existente (mesmo que
 * tenha sido editada manualmente no admin), só cria as que faltarem.
 *
 * Uso:
 *   node scripts/seed-orcamento-categorias.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const OrcamentoCategoria = require('../models/OrcamentoCategoria');

async function getDB() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/deapseak';
    await mongoose.connect(uri);
}

// Snapshot alinhado com o catálogo em produção (sincronizado 2026-08-17).
// Categorias que também resolvem uma não-conformidade (critico:true) trazem
// `norma` + `notaNaoConformidade`, inseridos no PDF apenas quando a categoria
// NÃO estiver incluída no orçamento.
const categorias = [
    {
        nome: 'Quadro de Elevador de tecnologia CPU STO',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 6200,
        descricao: 'Fornecimento e instalação de novo Quadro de Elevador de tecnologia CPU STO com variador de frequência 7.5 KW-17a, com sistema SIMPLEX, Alarme, Botoeira de Revisão e unidade de cabina, instalação elétrica de caixa, instalação elétrica de cabina e respetivos cabos de manobra de ligação ao quadro, limites e fins de curso, conjunto de sensores magnéticos para as paragens e mudanças, manobra coletiva de descida. Dispositivos que asseguram a segurança e funcionamento do elevador.',
        norma: '[VERIFICAR] EN 81-20:2014, Secção 5.10 (instalação elétrica) e 5.11 (proteção contra falhas — circuito de segurança); D.L. n.º 320/2002',
        notaNaoConformidade: '[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Um quadro de manobra desatualizado (ex.: lógica a relés, sem monitorização adequada do circuito de segurança) é uma das causas mais comuns de reprovação em inspeção periódica, por não garantir a deteção de falhas nos dispositivos de segurança (limitador de velocidade, fins de curso, contactos de porta).',
        critico: true,
        ordem: 0
    },
    {
        nome: 'Botoneira de Cabina',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 800,
        descricao: 'Botoneira de Cabina — fornecimento e instalação de nova botoneira de superfície em Aço INOX escovado. Display 7 SEGMENTOS com sinalização de excesso de carga, setas de indicação de sentido, indicação de piso. Botões antivandálicos com Braille e iluminação LED. Quadro luminoso com contacto de assistência. Sinalização acústica de alarme. Botões para pisos, botão de alarme, botão STOP',
        norma: '[VERIFICAR] EN 81-20:2014 (botão de alarme e botão STOP na botoneira de cabina); EN 81-70:2021 (acessibilidade — Braille, botões táteis, altura)',
        notaNaoConformidade: '[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Uma botoneira de cabina antiga pode não garantir alarme funcional permanente nem cumprir requisitos de acessibilidade (Braille, botões táteis, altura de instalação).',
        critico: false,
        ordem: 0
    },
    {
        nome: 'Botoeiras de Patamar',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 150,
        descricao: 'Fornecimento e instalação de botoeiras de patamar de superfície em Aço Inox escovado com botão de chamada. Display patamar piso principal',
        norma: '[VERIFICAR] EN 81-70:2021 (acessibilidade — Braille, botões táteis, altura de instalação)',
        notaNaoConformidade: '[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Botoeiras de patamar antigas podem não cumprir requisitos de acessibilidade (altura, Braille, contraste). Risco de não-conformidade menor que outros itens estruturais.',
        critico: false,
        ordem: 0
    },
    {
        nome: 'Quadro de entrada',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 650,
        descricao: 'Quadro de entrada novo',
        norma: '[VERIFICAR] EN 81-20:2014, Secção 5.10 (alimentação elétrica); RTIEBT — Regulamento Técnico das Instalações Elétricas de Baixa Tensão',
        notaNaoConformidade: '[RASCUNHO — VERIFICAR COM TÉCNICO RESPONSÁVEL] Um quadro de entrada desatualizado pode não garantir proteção diferencial e seccionamento adequados da alimentação elétrica do elevador, exigidos pela regulamentação elétrica em vigor.',
        critico: true,
        ordem: 0
    },
    {
        nome: 'Proteção de motor',
        grupo: 'mecanico',
        unidade: 'un',
        precoSugerido: 350,
        descricao: 'Proteção roda tração contra queda dos cabos e proteção total de roda',
        norma: '[VERIFICAR] EN 81-20:2014, Pontos 5.5.7.1 e 5.5.7.2 (proteção das rodas de tração e desvio contra acidentes corporais, saída dos cabos e introdução de corpos estranhos)',
        critico: false,
        ordem: 0
    },
    {
        nome: 'Roçadeiras de contrapeso',
        grupo: 'mecanico',
        unidade: 'un',
        precoSugerido: 70,
        descricao: 'Fornecimento e instalação de roçadeiras de contrapeso',
        critico: false,
        ordem: 0
    },
    {
        nome: 'Pintura casa de maquina',
        grupo: 'estrutural',
        unidade: 'un',
        precoSugerido: 550,
        descricao: 'Pintura casa de maquina paredes e teto com tinta branca, chão com tinta cinza antiderrapante',
        critico: false,
        ordem: 0
    },
    {
        nome: 'Iluminação de caixa',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 320,
        descricao: 'Iluminação de caixa fita dupla LED',
        norma: '[VERIFICAR] EN 81-20:2014, Ponto 5.2.1.4.1 (iluminação de caixa)',
        critico: false,
        ordem: 0
    },
    {
        nome: 'Escada no poço',
        grupo: 'estrutural',
        unidade: 'un',
        precoSugerido: 280,
        descricao: 'Escada no poço',
        norma: '[VERIFICAR] EN 81-20:2014, Ponto 5.2.2.4.b (dispositivo de acesso ao poço — escada)',
        critico: false,
        ordem: 0
    },
    {
        nome: 'Roçadeiras de cabina',
        grupo: 'mecanico',
        unidade: 'un',
        precoSugerido: 80,
        descricao: 'Fornecimento e instalação de roçadeiras de cabina',
        critico: false,
        ordem: 40
    },
    {
        nome: 'Luz casa de máquina (LED)',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 170,
        descricao: 'Luz casa de máquina (tipo LED, baixo consumo, 2 armaduras duplas)',
        norma: '[VERIFICAR] EN 81-20:2014, Ponto 5.2.1.4.2 (iluminação da zona de trabalho na casa de máquinas — mínimo 200 lux)',
        critico: false,
        ordem: 50
    },
    {
        nome: 'Luz de emergência para casa de maquina',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 80,
        descricao: 'Fornecimento e instalação de luz de emergência para casa de maquina',
        critico: false,
        ordem: 60
    },
    {
        nome: 'Calço móvel',
        grupo: 'mecanico',
        unidade: 'un',
        precoSugerido: 430,
        descricao: 'Fornecimento e instalação de calço móvel',
        critico: false,
        ordem: 70
    },

    // ─── Vendável e crítica — gera aviso se NÃO for incluída ───────────────
    {
        nome: 'Fechaduras de patamar com duplo contacto elétrico',
        grupo: 'seguranca',
        unidade: 'un',
        precoSugerido: 220,
        descricao: 'Adaptação/substituição de fechaduras de patamar por fechaduras com 2 contactos elétricos independentes',
        norma: 'EN 81-20:2014, Art. 5.3.9 (intravamento de portas de patamar), Art. 5.3.9.1 (duplo contacto elétrico obrigatório), Art. 5.3.9.3 (verificação da posição da cabina antes da abertura)',
        notaNaoConformidade: 'Se a cabina não estiver no patamar e as portas puderem ser abertas — por falha mecânica ou ausência de intravamento — existe risco imediato e grave de queda no poço. Este cenário é frequente em elevadores antigos com fechaduras de lagartas sem duplo contacto verificado. A instalação de fechaduras com 2 contactos elétricos independentes é obrigatória em todas as portas de patamar.',
        critico: true,
        ordem: 90
    },

    // ─── Tipicamente fora do âmbito da modernização elétrica (obra civil do condomínio) ───
    {
        nome: 'Fechamento total da caixa do elevador (poço/shaft)',
        grupo: 'estrutural',
        unidade: 'verba',
        precoSugerido: 0,
        descricao: 'Obras de construção civil para fecho total da caixa do elevador (paredes, chão e teto), conforme EN 81-20',
        norma: 'EN 81-20:2014, Art. 5.2.1 (paredes/chão/teto da caixa), Art. 5.2.5 (proteção contra acesso inadvertido); D.L. n.º 320/2002, Art. 9.º',
        notaNaoConformidade: 'A caixa do elevador deve ser completamente fechada em toda a sua altura, sem aberturas para o exterior que permitam o acesso a partes móveis. A presença de frentes de caixa abertas ou sem vedação constitui risco grave de queda ou contacto com componentes em movimento.',
        critico: true,
        ordem: 100
    },
    {
        nome: 'Resistência ao fogo de portas de patamar e paredes (EI 30)',
        grupo: 'estrutural',
        unidade: 'verba',
        precoSugerido: 0,
        descricao: 'Substituição de portas de patamar e reforço de paredes da caixa para resistência ao fogo mínima EI 30',
        norma: 'EN 81-58:2003 (resistência ao fogo — classif. mínima E30); RGEU Art. 64.º; D.L. n.º 220/2008 de 12 de novembro (SCIE — segurança contra incêndio em edifícios)',
        notaNaoConformidade: 'As portas de patamar e paredes da caixa devem ter resistência ao fogo mínima de EI 30 (30 minutos). Em edifícios antigos, as portas originais frequentemente não possuem certificado de resistência ao fogo — sendo necessária a sua substituição integral, obra não incluída neste orçamento.',
        critico: true,
        ordem: 110
    },
    {
        nome: 'Comunicação bidirecional e iluminação de emergência na cabina',
        grupo: 'seguranca',
        unidade: 'verba',
        precoSugerido: 0,
        descricao: 'Instalação de sistema de comunicação bidirecional 24h (telealarm) e iluminação de emergência na cabina',
        norma: 'EN 81-20:2014, Art. 5.10.7 (comunicação bidirecional em caso de encarceramento); EN 81-28:2003 (alarme remoto em elevadores de passageiros); D.L. n.º 320/2002, Art. 18.º (serviço de assistência permanente)',
        notaNaoConformidade: 'É obrigatória comunicação bidirecional permanente entre a cabina e serviço de socorro disponível 24 horas, com iluminação de emergência na cabina de autonomia mínima de 1 hora. A ligação ao serviço de monitorização remota (telealarm) é exigida e deve ser contratada separadamente.',
        critico: true,
        ordem: 120
    },

    // ─── Adicionadas a partir das cláusulas de cumprimento obrigatório de um relatório de inspeção periódica (2026-08-17) ───
    {
        nome: 'Escada de acesso à casa das máquinas',
        grupo: 'estrutural',
        unidade: 'verba',
        precoSugerido: 0,
        descricao: 'Fornecimento e instalação de escada de acesso à casa das máquinas, com fixação firme, largura mínima de 0,70 m, inclinação máxima de 60°, corrimão ou pegas e guarda-corpos, garantindo o acesso seguro para manutenção e ensaios.',
        norma: 'Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70, de 30/10, com alterações do Dec. Reg. 13/80, de 16/05, e D.L. 320/2002, de 28/12), Art. 22.º § 3.º (requisitos da escada de acesso) e Art. 24.º § 1.º (acesso seguro e fácil a todos os órgãos da instalação)',
        notaNaoConformidade: 'A ausência de escada de acesso conforme, ou a existência de escada com largura inferior a 0,70 m, ângulo de inclinação superior a 60°, sem fixação firme, corrimão/pegas ou guarda-corpos, impede o acesso seguro à casa das máquinas para manutenção e ensaios, constituindo risco de queda para o técnico.',
        critico: true,
        ordem: 130
    },
    {
        nome: 'Redução de aberturas no pavimento da casa das máquinas',
        grupo: 'estrutural',
        unidade: 'verba',
        precoSugerido: 0,
        descricao: 'Vedação/fecho das aberturas nos maciços e no pavimento da casa das máquinas, reduzindo-as ao mínimo indispensável à passagem dos elementos móveis.',
        norma: 'Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70, de 30/10, com alterações do Dec. Reg. 13/80, de 16/05, e D.L. 320/2002, de 28/12), Art. 26.º',
        notaNaoConformidade: 'As aberturas nos maciços e no pavimento da casa das máquinas devem ser reduzidas ao mínimo indispensável à passagem dos elementos móveis, para evitar quedas de objetos ou de pessoas para a caixa do elevador.',
        critico: true,
        ordem: 140
    },
    {
        nome: 'Reparação de parede do poço',
        grupo: 'estrutural',
        unidade: 'verba',
        precoSugerido: 0,
        descricao: 'Reparação e consolidação (reboco/alvenaria) da parede degradada junto ao poço do elevador.',
        norma: '[VERIFICAR] Regulamento de Segurança de Elevadores Elétricos (Dec. 513/70, de 30/10, com alterações do Dec. Reg. 13/80, de 16/05, e D.L. 320/2002, de 28/12) — código de artigo tal como consta do relatório de inspeção (Art. 900), confirmar numeração exata antes de citar no PDF',
        notaNaoConformidade: 'A degradação da parede junto ao poço compromete a integridade estrutural da caixa do elevador, devendo ser reparada.',
        critico: true,
        ordem: 150
    },
    {
        nome: 'Maxilas de travão acionadas individualmente',
        grupo: 'mecanico',
        unidade: 'un',
        precoSugerido: 0,
        descricao: 'Fornecimento e instalação de maxilas de travão de acionamento individual na máquina de tração, para maior fiabilidade do sistema de frenagem.',
        norma: 'Recomendação do relatório de inspeção periódica (não é uma não-conformidade classificada C1/C2/C3, apenas uma recomendação técnica)',
        critico: false,
        ordem: 160
    }
];

async function seed() {
    await getDB();
    console.log(`🔌 Ligado ao MongoDB`);

    // Permite saltar categorias já criadas manualmente (nomes diferentes dos do seed)
    // ex.: SKIP_NOMES="Nome A|Nome B" node scripts/seed-orcamento-categorias.js
    const skip = (process.env.SKIP_NOMES || '').split('|').map(s => s.trim()).filter(Boolean);

    let criadas = 0, jaExistiam = 0, saltadas = 0;
    for (const cat of categorias) {
        if (skip.includes(cat.nome)) { saltadas++; continue; }
        const existe = await OrcamentoCategoria.exists({ nome: cat.nome });
        if (existe) { jaExistiam++; continue; }
        await OrcamentoCategoria.create(cat);
        criadas++;
    }

    console.log(`✅ Categorias criadas: ${criadas}, já existiam (não tocadas): ${jaExistiam}, saltadas: ${saltadas}, total no seed: ${categorias.length}`);
    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
});
