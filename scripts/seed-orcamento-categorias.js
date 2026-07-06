#!/usr/bin/env node
/**
 * Seed inicial do catálogo de categorias de orçamento de modernização.
 * Idempotente — usa upsert por `nome`, seguro para correr mais que uma vez.
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

// Baseado no orçamento de modernização ORC-2026-002 (Rua Gomes Freire n.º 3).
// Categorias que também resolvem uma não-conformidade (critico:true) trazem
// `norma` + `notaNaoConformidade`, inseridos no PDF apenas quando a categoria
// NÃO estiver incluída no orçamento.
const categorias = [
    // ─── Vendáveis, sem risco de não-conformidade se excluídas ─────────────
    {
        nome: 'Quadro de Elevador CPU STO (variador de frequência)',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 5950.00,
        descricao: 'Fornecimento e instalação de novo Quadro de Elevador de tecnologia CPU STO com variador de frequência 7.5 KW-17a, com sistema SIMPLEX, Alarme, Botoeira de Revisão e unidade de cabina, instalação elétrica de caixa, instalação elétrica de cabina e respetivos cabos de manobra de ligação ao quadro, limites e fins de curso, conjunto de sensores magnéticos para as paragens e mudanças, manobra coletiva de descida. Dispositivos que asseguram a segurança e funcionamento do elevador. NORMA 81-20 EN',
        ordem: 10
    },
    {
        nome: 'Botoneira de Cabina (Aço Inox)',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 770.00,
        descricao: 'Fornecimento e instalação de nova botoneira de superfície em Aço INOX escovado. Display 7 SEGMENTOS com sinalização de excesso de carga, setas de indicação de sentido, indicação de piso. Botões antivandálicos com Braille e iluminação LED. Quadro luminoso com contacto de assistência. Sinalização acústica de alarme. Botões para pisos, botão de alarme, botão STOP',
        ordem: 20
    },
    {
        nome: 'Botoeiras de Patamar (Aço Inox)',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 150.00,
        descricao: 'Fornecimento e instalação de botoeiras de patamar de superfície em Aço Inox escovado com botão de chamada. Display patamar piso principal',
        ordem: 30
    },
    {
        nome: 'Roçadeiras de cabina',
        grupo: 'mecanico',
        unidade: 'un',
        precoSugerido: 80.00,
        descricao: 'Fornecimento e instalação de roçadeiras de cabina',
        ordem: 40
    },
    {
        nome: 'Luz casa de máquina (LED)',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 170.00,
        descricao: 'Luz casa de máquina (tipo LED, baixo consumo, 2 armaduras duplas)',
        ordem: 50
    },
    {
        nome: 'Luz de emergência',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 80.00,
        descricao: 'Fornecimento e instalação de luz de emergência',
        ordem: 60
    },
    {
        nome: 'Calço móvel',
        grupo: 'mecanico',
        unidade: 'un',
        precoSugerido: 430.00,
        descricao: 'Fornecimento e instalação de calço móvel',
        ordem: 70
    },
    {
        nome: 'Quadro de entrada novo',
        grupo: 'eletrico',
        unidade: 'un',
        precoSugerido: 550.00,
        descricao: 'Fornecimento e instalação de quadro de entrada novo',
        ordem: 80
    },

    // ─── Vendável e crítica — gera aviso se NÃO for incluída ───────────────
    {
        nome: 'Fechaduras de patamar com duplo contacto elétrico',
        grupo: 'seguranca',
        unidade: 'un',
        precoSugerido: 220.00,
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
    }
];

async function seed() {
    await getDB();
    console.log(`🔌 Ligado ao MongoDB`);

    // Permite saltar categorias já criadas manualmente (nomes diferentes dos do seed)
    // ex.: SKIP_NOMES="Nome A|Nome B" node scripts/seed-orcamento-categorias.js
    const skip = (process.env.SKIP_NOMES || '').split('|').map(s => s.trim()).filter(Boolean);

    let criadas = 0, atualizadas = 0, saltadas = 0;
    for (const cat of categorias) {
        if (skip.includes(cat.nome)) { saltadas++; continue; }
        const res = await OrcamentoCategoria.findOneAndUpdate(
            { nome: cat.nome },
            { $set: cat },
            { upsert: true, new: true, setDefaultsOnInsert: true, rawResult: true }
        );
        if (res.lastErrorObject && res.lastErrorObject.updatedExisting) atualizadas++;
        else criadas++;
    }

    console.log(`✅ Categorias criadas: ${criadas}, atualizadas: ${atualizadas}, saltadas: ${saltadas}, total: ${categorias.length}`);
    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
});
