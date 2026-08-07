const express = require('express');
const router = express.Router();
const PropostaManutencao = require('../../models/PropostaManutencao');
const mongoose = require('mongoose');
require('../models/User'); // garante que o schema User está registado para populate()
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { CONDICOES_GERAIS_ARTIGOS, CONDICOES_GERAIS_ARTIGOS_COMPLETA } = require('../constants/propostaManutencaoTerms');

async function autoExpirarPropostas(filterExtra = {}) {
    try {
        await PropostaManutencao.updateMany(
            { status: 'enviado', validadeAte: { $lt: new Date() }, ...filterExtra },
            { $set: { status: 'expirado' } }
        );
    } catch (error) {
        console.error('⚠️ Erro ao auto-expirar propostas de manutenção:', error.message);
    }
}

function formatDatePT(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-PT');
}

async function gerarPDFPropostaManutencao(proposta) {
    return new Promise((resolve, reject) => {
        try {
            const AZUL = '#1a3a6b';
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Cabeçalho com logótipo
            const logoPath = path.join(__dirname, '../../assets/img/logo.png');
            if (fs.existsSync(logoPath)) {
                doc.rect(40, 35, 185, 80).fill(AZUL);
                doc.image(logoPath, 50, 45, { width: 160 });
                doc.y = 130;
            } else {
                doc.fontSize(24).font('Helvetica-Bold').text('FestLift - Elevadores e Serviços, Lda.', { align: 'center' });
                doc.moveDown();
            }
            doc.fillColor('#000000').fontSize(10).font('Helvetica');
            doc.text('Avenida do Parque nº 84-B, Rio de Mouro, 2635-609', { align: 'center' });
            doc.text('Tel: +351 214 190 863 | Móvel: +351 926 380 243', { align: 'center' });
            doc.text('Email: info@festlift.pt | NIF: 515924741', { align: 'center' });
            doc.moveDown();

            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();

            // Título
            const tipoLabel = proposta.tipo === 'completa' ? 'Manutenção Completa' : 'Manutenção Simples';
            doc.fontSize(17).font('Helvetica-Bold').fillColor(AZUL)
                .text(`Proposta de Contrato de ${tipoLabel} Nº ${proposta.numero}`, { align: 'center' });
            doc.moveDown(0.5);

            // Aviso EMIE
            doc.fontSize(9).font('Helvetica-Oblique').fillColor('#333333').text(
                'Reconhecido pela DGEG como Empresa de Manutenção de Instalações de Elevação (EMIE), nos termos da Lei n.º 65/2013 de 27 de Agosto. Certificado EMIE: EC 2/2.208.',
                50, doc.y, { width: 500, align: 'center' }
            );
            doc.moveDown();
            doc.fillColor('#000000');

            // Bloco Cliente
            doc.fontSize(12).font('Helvetica-Bold').fillColor(AZUL).text('Cliente', 50, doc.y);
            doc.fontSize(10).font('Helvetica').fillColor('#000000');
            doc.text(`Nome: ${proposta.cliente?.nome || '—'}`, 50, doc.y + 5);
            if (proposta.cliente?.nif) doc.text(`NIF: ${proposta.cliente.nif}`, 50, doc.y + 5);
            if (proposta.cliente?.morada) doc.text(`Morada: ${proposta.cliente.morada}${proposta.cliente.codigoPostal ? ', ' + proposta.cliente.codigoPostal : ''}`, 50, doc.y + 5);
            doc.text(`Email: ${proposta.cliente?.email || '—'}`, 50, doc.y + 5);
            doc.moveDown();

            // Bloco Instalação
            if (proposta.instalacao && (proposta.instalacao.edificio || proposta.instalacao.morada)) {
                doc.fontSize(12).font('Helvetica-Bold').fillColor(AZUL).text('Instalação', 50, doc.y);
                doc.fontSize(10).font('Helvetica').fillColor('#000000');
                if (proposta.instalacao.edificio) doc.text(`Edifício: ${proposta.instalacao.edificio}`, 50, doc.y + 5);
                if (proposta.instalacao.nome) doc.text(`Nome: ${proposta.instalacao.nome}`, 50, doc.y + 5);
                if (proposta.instalacao.nif) doc.text(`NIF: ${proposta.instalacao.nif}`, 50, doc.y + 5);
                if (proposta.instalacao.morada) doc.text(`Morada: ${proposta.instalacao.morada}${proposta.instalacao.codigoPostal ? ', ' + proposta.instalacao.codigoPostal : ''}`, 50, doc.y + 5);
                doc.moveDown();
            }

            // Bloco Faturação (apenas se distinto da Instalação)
            if (proposta.faturacao && (proposta.faturacao.nome || proposta.faturacao.morada || proposta.faturacao.nif)) {
                doc.fontSize(12).font('Helvetica-Bold').fillColor(AZUL).text('Faturação', 50, doc.y);
                doc.fontSize(10).font('Helvetica').fillColor('#000000');
                if (proposta.faturacao.nome) doc.text(`Nome: ${proposta.faturacao.nome}`, 50, doc.y + 5);
                if (proposta.faturacao.nif) doc.text(`NIF: ${proposta.faturacao.nif}`, 50, doc.y + 5);
                if (proposta.faturacao.unidadesContratadas) doc.text(`Unidades contratadas: ${proposta.faturacao.unidadesContratadas}`, 50, doc.y + 5);
                if (proposta.faturacao.morada) doc.text(`Morada: ${proposta.faturacao.morada}${proposta.faturacao.codigoPostal ? ', ' + proposta.faturacao.codigoPostal : ''}`, 50, doc.y + 5);
                doc.moveDown();
            }

            // Data e validade
            doc.fontSize(10).font('Helvetica').fillColor('#000000');
            doc.text(`Data: ${formatDatePT(proposta.data)}`, 50, doc.y);
            doc.text(`Válida até: ${formatDatePT(proposta.validadeAte)}`, 50, doc.y + 5);
            doc.moveDown();

            // Termos do contrato — parágrafo corrido
            doc.fontSize(12).font('Helvetica-Bold').fillColor(AZUL).text('Termos do Contrato', 50, doc.y);
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica').fillColor('#000000');

            const renovacao = proposta.renovacao || {};
            const termosTexto = `Contrato de ${tipoLabel} respeitante a ${proposta.numAscensores || '__'} ascensor(es), destinado(s) a transporte de pessoas, instalado(s) em ${proposta.localInstalacao || '—'}. ` +
                `O preço do serviço de manutenção é de €${(proposta.precoMensal || 0).toFixed(2)} por mês, por unidade, acrescido de IVA à taxa legal em vigor. ` +
                `O pagamento é ${proposta.pagamento || 'Trimestral e adiantado'}. ` +
                `O contrato terá início em ${formatDatePT(proposta.dataInicioContrato)} e manter-se-á válido durante ${proposta.duracaoAnos || 1} ano(s), considerando-se tacitamente prorrogado por períodos de ${renovacao.periodo || '1 ano'}, salvo denúncia por qualquer das partes com pelo menos ${renovacao.avisoDias || '60 dias'} de antecedência, através de ${renovacao.metodoNotificacao || 'carta registada'}${renovacao.emailNotificacao ? ' (' + renovacao.emailNotificacao + ')' : ''}. ` +
                `Em caso de denúncia antecipada pelo Cliente, a FESTLIFT terá direito a indemnização no valor da totalidade das mensalidades previstas até ao termo do prazo contratado.`;

            doc.text(termosTexto, 50, doc.y, { width: 500, align: 'justify' });
            doc.moveDown();

            // Condições Gerais (texto integral)
            if (doc.y > 650) { doc.addPage(); }
            doc.fontSize(12).font('Helvetica-Bold').fillColor(AZUL).text('Condições Gerais', 50, doc.y);
            doc.moveDown(0.3);

            const artigosAplicaveis = proposta.tipo === 'completa' ? CONDICOES_GERAIS_ARTIGOS_COMPLETA : CONDICOES_GERAIS_ARTIGOS;
            artigosAplicaveis.forEach((artigo) => {
                if (doc.y > 700) { doc.addPage(); }
                doc.fontSize(10).font('Helvetica-Bold').fillColor(AZUL).text(artigo.titulo, 50, doc.y, { width: 500 });
                doc.moveDown(0.2);
                doc.fontSize(9).font('Helvetica').fillColor('#000000');
                artigo.itens.forEach((item, idx) => {
                    if (doc.y > 740) { doc.addPage(); }
                    doc.text(`${idx + 1}. ${item}`, 50, doc.y, { width: 500, align: 'justify' });
                    doc.moveDown(0.25);
                });
                doc.moveDown(0.2);
            });

            // Notas
            if (proposta.notas) {
                doc.moveDown();
                if (doc.y > 720) { doc.addPage(); }
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Notas:', 50, doc.y);
                doc.font('Helvetica').fontSize(9).text(proposta.notas, 50, doc.y + 3, { width: 500 });
            }

            // Rodapé
            const footerY = Math.max(doc.y + 20, 770);
            if (footerY > 810) { doc.addPage(); }
            doc.fontSize(8).font('Helvetica').fillColor('#666666');
            doc.text('FestLift - Elevadores e Serviços, Lda. | NIF: 515 924 741 | Email: info@festlift.pt', 50, footerY, { align: 'center', width: 500 });
            doc.text('Tel: +351 214 190 863 | Móvel: +351 926 380 243 | Avenida do Parque nº 84-B, Rio de Mouro, 2635-609', 50, footerY + 12, { align: 'center', width: 500 });
            doc.fillColor('#000000');

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

// GET /api/propostas-manutencao/my - Propostas do cliente autenticado
router.get('/my', authenticate, authorizeRoles('client'), async (req, res) => {
    try {
        const clienteEmail = req.user.email;
        await autoExpirarPropostas({ 'cliente.email': clienteEmail.toLowerCase() });

        const propostas = await PropostaManutencao.find({
            'cliente.email': clienteEmail.toLowerCase(),
            status: { $in: ['solicitado', 'enviado', 'aprovado', 'rejeitado', 'expirado'] }
        })
            .sort({ data: -1 })
            .select('-emailsEnviados -pdfPath')
            .lean();

        res.json({ success: true, data: propostas });
    } catch (error) {
        console.error('Erro ao buscar propostas do cliente:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar propostas', error: error.message });
    }
});

// POST /api/propostas-manutencao/solicitar - Cliente pede uma proposta para um novo elevador
// (ex.: cliente que quer mudar de empresa de manutenção e ainda não tem nenhum elevador nosso na base)
router.post('/solicitar', authenticate, authorizeRoles('client'), async (req, res) => {
    try {
        const { nif, morada, codigoPostal, edificio, numAscensores, observacoes } = req.body;

        if (!morada || !String(morada).trim()) {
            return res.status(400).json({ success: false, message: 'A morada da instalação é obrigatória' });
        }
        if (!numAscensores || Number(numAscensores) < 1) {
            return res.status(400).json({ success: false, message: 'Indique o número de elevadores' });
        }

        const numero = await PropostaManutencao.gerarNumero();
        const dataAtual = new Date();
        const validadeAte = new Date(dataAtual);
        validadeAte.setDate(validadeAte.getDate() + 30);

        const User = require('../models/User');
        const clientUser = await User.findById(req.user.id).select('firstName lastName username email').lean();
        const nomeCliente = clientUser
            ? (`${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim() || clientUser.username || clientUser.email)
            : req.user.email;

        const proposta = new PropostaManutencao({
            numero,
            data: dataAtual,
            validadeAte,
            cliente: {
                nome: nomeCliente,
                morada,
                codigoPostal,
                nif,
                email: req.user.email
            },
            instalacao: {
                edificio,
                morada,
                codigoPostal,
                // O cliente indica um único NIF no formulário de pedido — normalmente
                // o do prédio a manter, que é o que importa para o contrato. Fica
                // também em cliente.nif; o operador pode separar os dois ao responder,
                // caso o contacto e o prédio sejam entidades fiscais diferentes.
                nif
            },
            numAscensores: Number(numAscensores),
            notas: observacoes,
            criadoPor: req.user.id,
            status: 'solicitado',
            origem: 'cliente'
        });

        await proposta.save();

        console.log(`📨 Pedido de proposta de manutenção submetido pelo cliente: ${numero} (${req.user.email})`);

        try {
            const staffUsers = await User.find({ role: { $in: ['admin', 'dispatcher'] } }).select('_id role').lean();
            const notifDocs = staffUsers.map(u => ({
                userId: u._id.toString(),
                type: 'proposta_solicitada',
                title: 'Novo pedido de proposta de manutenção',
                message: `${nomeCliente} pediu uma proposta para ${morada}${numAscensores ? ` (${numAscensores} elevador(es))` : ''}.`,
                propostaId: proposta._id.toString(),
                icon: 'fas fa-paper-plane',
                priority: 'normal',
                read: false,
                actionUrl: u.role === 'admin'
                    ? '/pages/admin/propostas-manutencao-list.html'
                    : '/pages/dispatcher/propostas-manutencao-list.html',
                createdAt: new Date()
            }));
            if (notifDocs.length > 0) {
                await mongoose.connection.db.collection('notifications').insertMany(notifDocs);
            }
        } catch (notifErr) {
            console.error('Erro ao criar notificações internas de pedido de proposta:', notifErr.message);
        }

        try {
            const emailService = require('../services/emailService');
            emailService.sendNewPropostaSolicitadaNotification(proposta).catch(err =>
                console.error('Erro ao notificar equipa sobre novo pedido de proposta:', err.message)
            );
        } catch (_) {}

        res.status(201).json({
            success: true,
            message: 'Pedido enviado com sucesso! A FestLift irá analisar e enviar-lhe uma proposta em breve.',
            data: proposta
        });
    } catch (error) {
        console.error('Erro ao submeter pedido de proposta:', error);
        res.status(500).json({ success: false, message: 'Erro ao submeter pedido', error: error.message });
    }
});

// POST /api/propostas-manutencao/:id/resposta - Cliente aprova ou rejeita a proposta
router.post('/:id/resposta', authenticate, async (req, res) => {
    try {
        const { status, observacao } = req.body;
        if (!['aprovado', 'rejeitado'].includes(status)) {
            return res.status(400).json({ success: false, message: "Status deve ser 'aprovado' ou 'rejeitado'" });
        }

        const proposta = await PropostaManutencao.findById(req.params.id);
        if (!proposta) {
            return res.status(404).json({ success: false, message: 'Proposta não encontrada' });
        }

        if (proposta.cliente.email.toLowerCase() !== req.user.email.toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Sem permissão para responder a esta proposta' });
        }

        if (proposta.status !== 'enviado') {
            return res.status(400).json({
                success: false,
                message: `Proposta já foi respondida (status atual: '${proposta.status}')`
            });
        }

        proposta.status = status;
        proposta.dataResposta = new Date();
        proposta.aprovadoPor = 'cliente';
        proposta.aprovadoPorUser = req.user.id;
        if (observacao) proposta.observacao = observacao;
        await proposta.save();

        res.json({
            success: true,
            message: status === 'aprovado' ? 'Proposta aprovada com sucesso!' : 'Proposta rejeitada.',
            data: { status: proposta.status, dataResposta: proposta.dataResposta }
        });
    } catch (error) {
        console.error('Erro ao responder proposta:', error);
        res.status(500).json({ success: false, message: 'Erro ao processar resposta', error: error.message });
    }
});

// GET /api/propostas-manutencao - Lista (admin/dispatcher: todas; client: apenas as suas)
router.get('/', authenticate, authorizeRoles('admin', 'dispatcher', 'client'), async (req, res) => {
    try {
        await autoExpirarPropostas();

        const { status, page = 1, limit = 20, search } = req.query;
        const query = {};

        if (req.user.role === 'client') {
            if (!req.user.email) {
                return res.status(400).json({ success: false, message: 'Token de utilizador incorreto' });
            }
            query['cliente.email'] = req.user.email.toLowerCase();
        }

        if (status) query.status = status;

        if (req.query.archived === 'true') {
            query.archived = true;
        } else {
            query.archived = { $ne: true };
        }

        if (search) {
            const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { numero: new RegExp(safeSearch, 'i') },
                { 'cliente.nome': new RegExp(safeSearch, 'i') },
                { 'cliente.email': new RegExp(safeSearch, 'i') }
            ];
        }

        const skip = (page - 1) * limit;

        const propostasQuery = PropostaManutencao.find(query)
            .populate('criadoPor', 'name email')
            .sort({ data: -1 });

        if (req.user.role === 'client') {
            propostasQuery.select('-emailsEnviados -pdfPath');
        }

        const propostas = await propostasQuery.skip(skip).limit(parseInt(limit));
        const total = await PropostaManutencao.countDocuments(query);

        res.json({
            success: true,
            data: propostas,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erro ao buscar propostas:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar propostas', error: error.message });
    }
});

// GET /api/propostas-manutencao/next-number
router.get('/next-number', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const ano = new Date().getFullYear();
        const mes = String(new Date().getMonth() + 1).padStart(2, '0');

        const ultima = await PropostaManutencao.findOne({
            numero: new RegExp(`^PROP-${ano}-${mes}`)
        }).sort({ numero: -1 }).lean();

        let sequencia = 1;
        if (ultima) {
            const match = ultima.numero.match(/PROP-\d{4}-\d{2}-(\d{3})/);
            if (match) sequencia = parseInt(match[1]) + 1;
        }

        const numero = `PROP-${ano}-${mes}-${String(sequencia).padStart(3, '0')}`;
        res.json({ success: true, numero, proximaSequencia: sequencia });
    } catch (error) {
        console.error('❌ Erro ao gerar próximo número:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar próximo número', error: error.message });
    }
});

// GET /api/propostas-manutencao/stats/dashboard
router.get('/stats/dashboard', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const stats = await PropostaManutencao.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const total = await PropostaManutencao.countDocuments();

        res.json({ success: true, data: { total, porStatus: stats } });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas', error: error.message });
    }
});

// GET /api/propostas-manutencao/:id/pdf - Download autenticado do PDF
router.get('/:id/pdf', authenticate, async (req, res) => {
    try {
        const proposta = await PropostaManutencao.findById(req.params.id);
        if (!proposta) {
            return res.status(404).json({ success: false, message: 'Proposta não encontrada' });
        }

        if (req.user.role === 'client' && proposta.cliente.email.toLowerCase() !== (req.user.email || '').toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Sem permissão para esta proposta' });
        }

        const pdfBuffer = await gerarPDFPropostaManutencao(proposta);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Proposta_${proposta.numero}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Erro ao gerar PDF autenticado:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar PDF', error: error.message });
    }
});

// GET /api/propostas-manutencao/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const proposta = await PropostaManutencao.findById(req.params.id)
            .populate('criadoPor', 'name email');

        if (!proposta) {
            return res.status(404).json({ success: false, message: 'Proposta não encontrada' });
        }

        if (req.user.role === 'client' && proposta.cliente.email.toLowerCase() !== (req.user.email || '').toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Sem permissão para esta proposta' });
        }

        res.json({ success: true, data: proposta });
    } catch (error) {
        console.error('Erro ao buscar proposta:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar proposta', error: error.message });
    }
});

// POST /api/propostas-manutencao - Criar nova proposta (admin/dispatcher)
router.post('/', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const {
            cliente, instalacao, faturacao, numAscensores, localInstalacao,
            precoMensal, pagamento, dataInicioContrato, duracaoAnos, renovacao,
            notas, liftId: bodyLiftId, lifts: bodyLifts, liftAddress: bodyLiftAddress,
            tipo, criarTambemCompleta
        } = req.body;

        if (!cliente || !cliente.nome || !cliente.email) {
            return res.status(400).json({ success: false, message: 'Dados do cliente incompletos' });
        }

        const dataAtual = new Date();
        const validadeAte = new Date(dataAtual);
        validadeAte.setDate(validadeAte.getDate() + 30);

        let liftId = null;
        let liftAddress = bodyLiftAddress || null;
        let liftsArray = [];
        if (Array.isArray(bodyLifts) && bodyLifts.length > 0) {
            liftsArray = bodyLifts.filter(Boolean);
            liftId = liftsArray[0];
        } else if (bodyLiftId) {
            liftId = bodyLiftId;
            liftsArray = [bodyLiftId];
        }

        const dadosComuns = {
            data: dataAtual,
            validadeAte,
            cliente,
            instalacao,
            faturacao,
            numAscensores,
            localInstalacao,
            precoMensal,
            pagamento,
            dataInicioContrato,
            duracaoAnos,
            renovacao,
            notas,
            criadoPor: req.user.id,
            status: 'rascunho',
            liftId: liftId || null,
            lifts: liftsArray,
            liftAddress: liftAddress || null
        };

        const numero = await PropostaManutencao.gerarNumero();
        const proposta = new PropostaManutencao({
            ...dadosComuns,
            numero,
            tipo: tipo === 'completa' ? 'completa' : 'simples'
        });
        await proposta.save();
        console.log(`✅ Proposta de manutenção criada: ${numero} (${proposta.tipo})`);

        let propostaCompleta = null;
        if (criarTambemCompleta && proposta.tipo === 'simples') {
            const numeroCompleta = await PropostaManutencao.gerarNumero();
            propostaCompleta = new PropostaManutencao({
                ...dadosComuns,
                numero: numeroCompleta,
                tipo: 'completa',
                propostaIrmaId: proposta._id
            });
            await propostaCompleta.save();

            proposta.propostaIrmaId = propostaCompleta._id;
            await proposta.save();

            console.log(`✅ Proposta irmã (Completa) criada: ${numeroCompleta}`);
        }

        res.status(201).json({
            success: true,
            message: propostaCompleta
                ? `Propostas criadas com sucesso: ${proposta.numero} (Simples) e ${propostaCompleta.numero} (Completa)`
                : 'Proposta criada com sucesso',
            data: proposta,
            dataCompleta: propostaCompleta
        });
    } catch (error) {
        console.error('Erro ao criar proposta:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar proposta', error: error.message });
    }
});

// PUT /api/propostas-manutencao/:id - Atualizar proposta (admin/dispatcher)
router.put('/:id', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const proposta = await PropostaManutencao.findById(req.params.id);
        if (!proposta) {
            return res.status(404).json({ success: false, message: 'Proposta não encontrada' });
        }

        const wasApproved = proposta.status === 'aprovado';

        const {
            cliente, instalacao, faturacao, numAscensores, localInstalacao,
            precoMensal, pagamento, dataInicioContrato, duracaoAnos, renovacao,
            notas, status, lifts: bodyLifts, liftAddress: bodyLiftAddress, tipo
        } = req.body;

        if (cliente) proposta.cliente = cliente;
        if (instalacao) proposta.instalacao = instalacao;
        if (faturacao) proposta.faturacao = faturacao;
        if (tipo === 'simples' || tipo === 'completa') proposta.tipo = tipo;
        if (numAscensores !== undefined) proposta.numAscensores = numAscensores;
        if (localInstalacao !== undefined) proposta.localInstalacao = localInstalacao;
        if (precoMensal !== undefined) proposta.precoMensal = precoMensal;
        if (pagamento) proposta.pagamento = pagamento;
        if (dataInicioContrato) proposta.dataInicioContrato = dataInicioContrato;
        if (duracaoAnos !== undefined) proposta.duracaoAnos = duracaoAnos;
        if (renovacao) proposta.renovacao = renovacao;
        if (notas !== undefined) proposta.notas = notas;
        if (status) proposta.status = status;
        if (Array.isArray(bodyLifts)) {
            proposta.lifts = bodyLifts.filter(Boolean);
            if (bodyLifts.length > 0) proposta.liftId = bodyLifts[0];
        }
        if (bodyLiftAddress !== undefined) proposta.liftAddress = bodyLiftAddress || null;

        if (wasApproved) {
            proposta.status = 'rascunho';
            proposta.dataResposta = null;
            proposta.aprovadoPor = null;
            proposta.aprovadoPorUser = null;
            proposta.observacao = null;
        }

        await proposta.save();

        res.json({
            success: true,
            message: wasApproved ? 'Proposta atualizada e reaberta como rascunho' : 'Proposta atualizada com sucesso',
            data: proposta
        });
    } catch (error) {
        console.error('Erro ao atualizar proposta:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar proposta', error: error.message });
    }
});

// DELETE /api/propostas-manutencao/:id (admin/dispatcher)
router.delete('/:id', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const proposta = await PropostaManutencao.findById(req.params.id);
        if (!proposta) {
            return res.status(404).json({ success: false, message: 'Proposta não encontrada' });
        }

        if (proposta.status === 'aprovado') {
            return res.status(400).json({ success: false, message: 'Proposta aprovada não pode ser eliminada' });
        }

        await proposta.deleteOne();
        res.json({ success: true, message: 'Proposta eliminada com sucesso' });
    } catch (error) {
        console.error('Erro ao eliminar proposta:', error);
        res.status(500).json({ success: false, message: 'Erro ao eliminar proposta', error: error.message });
    }
});

// POST /api/propostas-manutencao/:id/enviar - Enviar proposta por email (admin/dispatcher)
router.post('/:id/enviar', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const proposta = await PropostaManutencao.findById(req.params.id);
        if (!proposta) {
            return res.status(404).json({ success: false, message: 'Proposta não encontrada' });
        }

        const emailDestino = req.body.email || proposta.cliente.email;

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER;
        const smtpFromEmail = (smtpFrom || '').match(/<([^>]+)>/)?.[1] || smtpFrom;
        const adminBcc = process.env.EMAIL_BCC || smtpFromEmail || null;

        const validadeFormatted = formatDatePT(proposta.validadeAte);

        const emailHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #1a3a6b 0%, #2355a0 100%); color: white; padding: 28px 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; letter-spacing: 1px;">FestLift</h1>
                    <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Elevadores e Serviços, Lda.</p>
                </div>
                <div style="padding: 32px 30px;">
                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #333;">
                        Caro(a) <strong>${proposta.cliente.nome}</strong>,
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #333; line-height: 1.6;">
                        Enviamos em anexo a <strong>Proposta de Contrato de Manutenção ${proposta.numero}</strong>,
                        no valor de <strong style="color: #1a3a6b;">€${(proposta.precoMensal || 0).toFixed(2)}/mês</strong> por unidade (+ IVA),
                        válida até <strong>${validadeFormatted}</strong>.
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 15px; color: #333; line-height: 1.6;">
                        Para qualquer questão ou esclarecimento, estamos inteiramente ao dispor.
                    </p>
                    <div style="background: #eef3fb; border-left: 4px solid #1a3a6b; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 13px; color: #555;">
                            📎 A proposta detalhada encontra-se no ficheiro PDF em anexo.
                        </p>
                    </div>
                    <p style="margin: 0; font-size: 15px; color: #333;">
                        Com os melhores cumprimentos,<br>
                        <strong>FestLift - Elevadores e Serviços, Lda.</strong>
                    </p>
                </div>
                <div style="background: #f8f9fa; padding: 18px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; font-size: 12px; color: #888;">
                        info@festlift.pt &nbsp;|&nbsp; +351 214 190 863<br>
                        <small>Este email foi gerado automaticamente — por favor não responda diretamente.</small>
                    </p>
                </div>
            </div>
        `;

        const pdfBuffer = await gerarPDFPropostaManutencao(proposta);
        const assunto = `Proposta de Manutenção ${proposta.numero} - FestLift - Elevadores e Serviços, Lda.`;

        try {
            await transporter.sendMail({
                from: smtpFrom,
                to: emailDestino,
                bcc: adminBcc && adminBcc.toLowerCase() !== emailDestino.toLowerCase() ? adminBcc : undefined,
                subject: assunto,
                html: emailHTML,
                attachments: [{
                    filename: `Proposta_${proposta.numero}.pdf`,
                    content: pdfBuffer
                }]
            });

            await PropostaManutencao.updateOne(
                { _id: proposta._id },
                {
                    $set: { status: 'enviado', dataEnvio: new Date() },
                    $push: { emailsEnviados: { para: emailDestino, assunto, data: new Date(), sucesso: true } }
                }
            );

            console.log(`✅ Proposta ${proposta.numero} enviada via SMTP para ${emailDestino}`);
            return res.json({ success: true, message: 'Proposta enviada com sucesso via SMTP', data: proposta });
        } catch (smtpError) {
            console.error('❌ Erro SMTP:', smtpError.message);
            await PropostaManutencao.updateOne(
                { _id: proposta._id },
                { $push: { emailsEnviados: { para: emailDestino, assunto, data: new Date(), sucesso: false, erro: smtpError.message } } }
            );
            return res.status(500).json({ success: false, message: `Erro ao enviar email via SMTP: ${smtpError.message}`, error: smtpError.message });
        }
    } catch (error) {
        console.error('Erro ao enviar proposta:', error);
        res.status(500).json({ success: false, message: 'Erro ao enviar proposta', error: error.message });
    }
});

// PATCH /api/propostas-manutencao/:id/status
router.patch('/:id/status', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const { status, observacao } = req.body;
        const allowedStatuses = ['rascunho', 'enviado', 'aprovado', 'rejeitado', 'expirado'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Status inválido. Use: ${allowedStatuses.join(', ')}` });
        }

        const proposta = await PropostaManutencao.findById(req.params.id);
        if (!proposta) {
            return res.status(404).json({ success: false, message: 'Proposta não encontrada' });
        }

        proposta.status = status;
        if (['aprovado', 'rejeitado'].includes(status)) {
            proposta.dataResposta = new Date();
            proposta.aprovadoPor = req.user.role;
            proposta.aprovadoPorUser = req.user.id;
        }
        if (observacao) proposta.observacao = observacao;
        await proposta.save({ validateModifiedOnly: true });

        const msg = {
            aprovado: 'Proposta aprovada com sucesso',
            rejeitado: 'Proposta rejeitada',
            enviado: 'Proposta marcada como enviada',
            rascunho: 'Proposta revertida para rascunho',
            expirado: 'Proposta marcada como expirada'
        }[status] || `Status alterado para '${status}'`;

        res.json({ success: true, message: msg, data: proposta });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar status', error: error.message });
    }
});

// POST /api/propostas-manutencao/:id/archive
router.post('/:id/archive', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const result = await PropostaManutencao.updateOne(
            { _id: req.params.id },
            { $set: { archived: true, archivedAt: new Date(), archivedBy: req.user.username || req.user.email || req.user.id } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Proposta não encontrada' });
        res.json({ success: true, message: 'Proposta arquivada com sucesso' });
    } catch (error) {
        console.error('Erro ao arquivar proposta:', error);
        res.status(500).json({ success: false, message: 'Erro ao arquivar', error: error.message });
    }
});

// POST /api/propostas-manutencao/:id/unarchive (somente admin)
router.post('/:id/unarchive', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const result = await PropostaManutencao.updateOne(
            { _id: req.params.id },
            { $unset: { archived: '', archivedAt: '', archivedBy: '' } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Proposta não encontrada' });
        res.json({ success: true, message: 'Proposta restaurada do arquivo' });
    } catch (error) {
        console.error('Erro ao restaurar proposta:', error);
        res.status(500).json({ success: false, message: 'Erro ao restaurar', error: error.message });
    }
});

// PATCH /api/propostas-manutencao/:id/link-lift - Vincular/desvincular elevador(es) manualmente
router.patch('/:id/link-lift', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const proposta = await PropostaManutencao.findById(req.params.id);
        if (!proposta) {
            return res.status(404).json({ success: false, message: 'Proposta não encontrada' });
        }

        const { liftId, liftIds } = req.body;
        const requestedLiftIds = Array.isArray(liftIds)
            ? liftIds.filter(Boolean).map(String)
            : (liftId ? [String(liftId)] : []);

        if (!requestedLiftIds.length) {
            proposta.liftId = null;
            proposta.lifts = [];
            proposta.liftAddress = null;
            await proposta.save();
            return res.json({ success: true, message: 'Proposta desvinculada do elevador', liftId: null, lifts: [], liftAddress: null });
        }

        const db = mongoose.connection.db;
        const { ObjectId } = mongoose.Types;
        const objectIds = [];
        for (const id of requestedLiftIds) {
            try {
                objectIds.push(new ObjectId(id));
            } catch (e) {
                return res.status(400).json({ success: false, message: `liftId inválido: ${id}` });
            }
        }

        const lifts = await db.collection('lifts').find({ _id: { $in: objectIds } }).toArray();
        if (!lifts.length) {
            return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        }

        const byId = new Map(lifts.map(l => [String(l._id), l]));
        const orderedLifts = requestedLiftIds.map(id => byId.get(String(id))).filter(Boolean);
        if (!orderedLifts.length) {
            return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        }

        const primaryLift = orderedLifts[0];
        const addr = primaryLift.address || {};
        const liftAddress = typeof addr === 'string'
            ? addr
            : [addr.street, addr.zipCode, addr.city].filter(Boolean).join(', ');

        const liftsPayload = orderedLifts.map(lift => {
            const liftAddr = lift.address || {};
            return {
                liftId: lift._id,
                municipalNumber: lift.municipalNumber || null,
                address: typeof liftAddr === 'string'
                    ? liftAddr
                    : [liftAddr.street, liftAddr.zipCode, liftAddr.city].filter(Boolean).join(', '),
                clientName: lift.clientName || null
            };
        });

        proposta.liftId = primaryLift._id;
        proposta.lifts = liftsPayload;
        proposta.liftAddress = liftAddress || null;
        await proposta.save();

        console.log(`🔗 Proposta ${proposta.numero} vinculada a ${orderedLifts.length} elevador(es)`);

        res.json({
            success: true,
            message: orderedLifts.length > 1
                ? `Proposta vinculada a ${orderedLifts.length} elevadores`
                : `Proposta vinculada ao elevador ${primaryLift.municipalNumber || ''}`,
            liftId: primaryLift._id,
            liftIds: orderedLifts.map(l => l._id),
            lifts: liftsPayload,
            liftAddress,
            municipalNumber: primaryLift.municipalNumber || null
        });
    } catch (error) {
        console.error('Erro ao vincular proposta a elevador:', error);
        res.status(500).json({ success: false, message: 'Erro ao vincular', error: error.message });
    }
});

module.exports = router;
