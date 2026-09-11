const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ContratoManutencao = require('../../models/ContratoManutencao');
const PropostaManutencao = require('../../models/PropostaManutencao');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { CONDICOES_GERAIS_ARTIGOS, CONDICOES_GERAIS_ARTIGOS_COMPLETA } = require('../constants/propostaManutencaoTerms');

// Um contrato assinado por ambas as partes não cria sozinho o(s) registo(s) de
// elevador — dados como fabricante, capacidade ou coordenadas GPS não constam
// de um contrato e só podem vir de uma visita técnica real. Em vez de inventar
// esses valores, avisa a equipa para o fazer com dados verdadeiros.
async function notificarLiftPendente(contrato) {
    try {
        const staffUsers = await User.find({ role: { $in: ['admin', 'dispatcher'] } }).select('_id role').lean();
        const instalacaoDesc = contrato.instalacao?.morada || contrato.instalacao?.edificio || contrato.cliente?.morada || '—';
        const notifDocs = staffUsers.map(u => ({
            userId: u._id.toString(),
            type: 'contrato_assinado_sem_lift',
            title: 'Contrato assinado — registar elevador(es)',
            message: `Contrato ${contrato.numero} (${contrato.cliente?.nome || '—'}) foi assinado por ambas as partes. Registe o(s) ${contrato.numAscensores || 1} elevador(es) em ${instalacaoDesc} para ativar manutenção e inspeções.`,
            contratoId: contrato._id.toString(),
            icon: 'fas fa-elevator',
            priority: 'high',
            read: false,
            actionUrl: u.role === 'admin' ? '/pages/admin/lifts.html' : '/pages/dispatcher/lifts.html',
            createdAt: new Date()
        }));
        if (notifDocs.length > 0) {
            await mongoose.connection.db.collection('notifications').insertMany(notifDocs);
        }
    } catch (error) {
        console.error('Erro ao notificar equipa sobre elevador pendente de registo:', error.message);
    }
}

function formatDatePT(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-PT');
}

// Token de acesso público — aleatório por documento (não um hash determinístico
// do id, que qualquer pessoa com o id podia recalcular offline), com expiração
// e invalidação após uso. Gera e persiste um novo token se não existir um válido.
const ACCESS_TOKEN_VALIDITY_DAYS = 90;

async function getOrCreatePublicAccessToken(contrato) {
    const now = new Date();
    if (contrato.accessToken && contrato.accessTokenExpiresAt && contrato.accessTokenExpiresAt > now) {
        return contrato.accessToken;
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(now.getTime() + ACCESS_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    await ContratoManutencao.updateOne(
        { _id: contrato._id },
        { $set: { accessToken: token, accessTokenExpiresAt: expiresAt } }
    );
    contrato.accessToken = token;
    contrato.accessTokenExpiresAt = expiresAt;
    return token;
}

function isValidPublicAccessToken(contrato, suppliedToken) {
    if (!contrato.accessToken || !suppliedToken) return false;
    if (contrato.accessTokenExpiresAt && contrato.accessTokenExpiresAt < new Date()) return false;
    const a = Buffer.from(contrato.accessToken);
    const b = Buffer.from(String(suppliedToken));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function buildPublicSigningUrl(req, contrato) {
    const token = await getOrCreatePublicAccessToken(contrato);
    const configuredBaseUrl = process.env.SITE_URL || process.env.PUBLIC_BASE_URL;
    const runtimeBaseUrl = `${req.protocol}://${req.get('host')}`;
    const baseUrl = (configuredBaseUrl || runtimeBaseUrl).replace(/\/$/, '');
    return `${baseUrl}/pages/public/contrato-assinatura.html?id=${contrato._id}&token=${token}`;
}

function getSmtpTransporter() {
    const nodemailer = require('nodemailer');
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
}

function gerarPasswordTemporaria() {
    // crypto.randomBytes, não Math.random() — Math.random() usa um PRNG não
    // criptográfico cujo estado é recuperável a partir de poucos valores
    // observados, o que tornava as passwords temporárias adivinháveis.
    return crypto.randomBytes(12).toString('base64url');
}

// Cria conta de cliente (se ainda não existir) quando o contrato é assinado via link público.
// Devolve { created, user }.
async function garantirContaCliente(cliente, req) {
    const email = (cliente.email || '').trim().toLowerCase();
    if (!email) return { created: false, user: null };

    const existente = await User.findOne({ email }).lean();
    if (existente) return { created: false, user: existente };

    const rawPassword = gerarPasswordTemporaria();
    const nomeParts = (cliente.nome || 'Cliente FestLift').trim().split(/\s+/);
    let username = email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') || 'cliente';
    if (await User.findOne({ username }).lean()) {
        username = `${username}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const novoUser = new User({
        username,
        email,
        password: rawPassword, // hash automático no pre('save') do schema
        role: 'client',
        firstName: nomeParts[0] || 'Cliente',
        lastName: nomeParts.slice(1).join(' ') || 'FestLift',
        isActive: true,
        mustChangePassword: true,
        tempPasswordHint: rawPassword
    });
    await novoUser.save();

    try {
        const siteBase = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
        const transporter = getSmtpTransporter();
        const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER;
        await transporter.sendMail({
            from: smtpFrom,
            to: email,
            subject: 'Bem-vindo(a) à plataforma FestLift — os seus dados de acesso',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #1a3a6b 0%, #2355a0 100%); color: white; padding: 28px 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 22px;">FestLift</h1>
                        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Plataforma de Gestão de Elevadores</p>
                    </div>
                    <div style="padding: 32px 30px;">
                        <p style="margin: 0 0 16px 0; font-size: 15px; color: #333;">Caro(a) <strong>${novoUser.firstName}</strong>,</p>
                        <p style="margin: 0 0 16px 0; font-size: 15px; color: #333; line-height: 1.6;">Assinou com sucesso o seu contrato de manutenção. Criámos uma conta na plataforma FestLift para si acompanhar os seus elevadores, faturas e pedidos.</p>
                        <div style="background: #eef3fb; border-left: 4px solid #1a3a6b; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
                            <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 0; font-size: 14px;"><strong>Palavra-passe temporária:</strong> <code style="background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #c5cae9;">${rawPassword}</code></p>
                        </div>
                        <p style="margin: 0 0 20px 0; font-size: 13px; color: #e53935; font-weight: bold;">⚠️ Por razões de segurança, ser-lhe-á pedido para alterar a palavra-passe no primeiro acesso.</p>
                        <a href="${siteBase}/pages/auth/login.html" style="display:inline-block;background:#1a3a6b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:bold;">Entrar na plataforma →</a>
                    </div>
                    <div style="background: #f8f9fa; padding: 18px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                        <p style="margin: 0; font-size: 12px; color: #888;">info@festlift.pt &nbsp;|&nbsp; +351 214 190 863</p>
                    </div>
                </div>`
        });
    } catch (emailError) {
        console.error('⚠️ Erro ao enviar email de boas-vindas ao novo cliente:', emailError.message);
    }

    return { created: true, user: novoUser };
}

function dataUrlToBuffer(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!match) return null;
    try {
        return Buffer.from(match[2], 'base64');
    } catch (e) {
        return null;
    }
}

async function gerarPDFContratoManutencao(contrato) {
    return new Promise((resolve, reject) => {
        try {
            const AZUL = '#1a3a6b';
            const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

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

            const tipoLabel = contrato.tipo === 'completa' ? 'Manutenção Completa' : 'Manutenção Simples';
            doc.fontSize(17).font('Helvetica-Bold').fillColor(AZUL)
                .text(`Contrato de ${tipoLabel} Nº ${contrato.numero}`, { align: 'center' });
            doc.moveDown(0.5);

            doc.fontSize(9).font('Helvetica-Oblique').fillColor('#333333').text(
                'Reconhecido pela DGEG como Empresa de Manutenção de Instalações de Elevação (EMIE), nos termos da Lei n.º 65/2013 de 27 de Agosto. Certificado EMIE: EC 2/2.208.',
                50, doc.y, { width: 500, align: 'center' }
            );
            doc.moveDown();
            doc.fillColor('#000000');

            doc.fontSize(12).font('Helvetica-Bold').fillColor(AZUL).text('Cliente', 50, doc.y);
            doc.fontSize(10).font('Helvetica').fillColor('#000000');
            doc.text(`Nome: ${contrato.cliente?.nome || '—'}`, 50, doc.y + 5);
            if (contrato.cliente?.nif) doc.text(`NIF: ${contrato.cliente.nif}`, 50, doc.y + 5);
            if (contrato.cliente?.morada) doc.text(`Morada: ${contrato.cliente.morada}${contrato.cliente.codigoPostal ? ', ' + contrato.cliente.codigoPostal : ''}`, 50, doc.y + 5);
            doc.text(`Email: ${contrato.cliente?.email || '—'}`, 50, doc.y + 5);
            doc.moveDown();

            if (contrato.instalacao && (contrato.instalacao.edificio || contrato.instalacao.morada)) {
                doc.fontSize(12).font('Helvetica-Bold').fillColor(AZUL).text('Instalação', 50, doc.y);
                doc.fontSize(10).font('Helvetica').fillColor('#000000');
                if (contrato.instalacao.edificio) doc.text(`Edifício: ${contrato.instalacao.edificio}`, 50, doc.y + 5);
                if (contrato.instalacao.nome) doc.text(`Nome: ${contrato.instalacao.nome}`, 50, doc.y + 5);
                if (contrato.instalacao.morada) doc.text(`Morada: ${contrato.instalacao.morada}${contrato.instalacao.codigoPostal ? ', ' + contrato.instalacao.codigoPostal : ''}`, 50, doc.y + 5);
                doc.moveDown();
            }

            doc.fontSize(10).font('Helvetica').fillColor('#000000');
            doc.text(`Data: ${formatDatePT(contrato.data)}`, 50, doc.y);
            doc.moveDown();

            doc.fontSize(12).font('Helvetica-Bold').fillColor(AZUL).text('Termos do Contrato', 50, doc.y);
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica').fillColor('#000000');

            const renovacao = contrato.renovacao || {};
            const termosTexto = `Entre a FESTLIFT, Lda., com sede na Avenida do Parque nº 84-B, Rio de Mouro, 2635-609, pessoa coletiva n.º 515924741, reconhecida pela Direção Geral de Energia e Geologia (DGEG), com o certificado n.º EC 2/2.208, como Empresa de Manutenção de Instalações de Elevação (EMIE), nos termos da Lei n.º 65/2013 de 27 de Agosto e legislação complementar, e o Cliente identificado acima, é firmado o presente Contrato de ${tipoLabel} respeitante a ${contrato.numAscensores || '__'} ascensor(es), destinado(s) a transporte de pessoas, instalado(s) em ${contrato.localInstalacao || '—'}. ` +
                `Pela aceitação do presente contrato a EMIE obriga-se a fornecer, de acordo com as Condições Gerais abaixo, um serviço de manutenção para o equipamento discriminado. ` +
                `O preço do serviço de manutenção é de €${(contrato.precoMensal || 0).toFixed(2)} por mês, por unidade, acrescido de IVA à taxa legal em vigor. ` +
                `O pagamento é ${contrato.pagamento || 'Trimestral e adiantado'}. ` +
                `O contrato terá início em ${formatDatePT(contrato.dataInicioContrato)} e manter-se-á válido durante ${contrato.duracaoAnos || 1} ano(s), considerando-se tacitamente prorrogado por períodos de ${renovacao.periodo || '1 ano'}, salvo denúncia por qualquer das partes com pelo menos ${renovacao.avisoDias || '60 dias'} de antecedência, através de ${renovacao.metodoNotificacao || 'carta registada'}${renovacao.emailNotificacao ? ' (' + renovacao.emailNotificacao + ')' : ''}. ` +
                `Em caso de denúncia antecipada pelo Cliente, a FESTLIFT terá direito a indemnização no valor da totalidade das mensalidades previstas até ao termo do prazo contratado.`;

            doc.text(termosTexto, 50, doc.y, { width: 500, align: 'justify' });
            doc.moveDown();

            if (doc.y > 650) { doc.addPage(); }
            doc.fontSize(12).font('Helvetica-Bold').fillColor(AZUL).text('Condições Gerais', 50, doc.y);
            doc.moveDown(0.3);

            const artigosAplicaveis = contrato.tipo === 'completa' ? CONDICOES_GERAIS_ARTIGOS_COMPLETA : CONDICOES_GERAIS_ARTIGOS;
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

            if (contrato.notas) {
                doc.moveDown();
                if (doc.y > 720) { doc.addPage(); }
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Notas:', 50, doc.y);
                doc.font('Helvetica').fontSize(9).text(contrato.notas, 50, doc.y + 3, { width: 500 });
            }

            // Assinaturas
            doc.addPage();
            doc.fontSize(13).font('Helvetica-Bold').fillColor(AZUL).text('Assinaturas', 50, 60, { align: 'center', width: 500 });
            doc.moveDown();

            const colWidth = 230;
            const leftX = 50;
            const rightX = 320;
            const sigTopY = doc.y + 10;

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('FESTLIFT, Lda. (Fornecedora / EMIE)', leftX, sigTopY, { width: colWidth });
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('Cliente', rightX, sigTopY, { width: colWidth });

            const boxY = sigTopY + 20;
            doc.rect(leftX, boxY, colWidth, 90).stroke('#cccccc');
            doc.rect(rightX, boxY, colWidth, 90).stroke('#cccccc');

            const empresaBuf = dataUrlToBuffer(contrato.assinaturaEmpresa?.imagem);
            if (empresaBuf) {
                try { doc.image(empresaBuf, leftX + 5, boxY + 5, { fit: [colWidth - 10, 80] }); } catch (e) { /* imagem inválida, ignora */ }
            } else {
                doc.fontSize(9).font('Helvetica-Oblique').fillColor('#999999').text('Aguarda assinatura', leftX, boxY + 38, { width: colWidth, align: 'center' });
            }

            const clienteBuf = dataUrlToBuffer(contrato.assinaturaCliente?.imagem);
            if (clienteBuf) {
                try { doc.image(clienteBuf, rightX + 5, boxY + 5, { fit: [colWidth - 10, 80] }); } catch (e) { /* imagem inválida, ignora */ }
            } else {
                doc.fontSize(9).font('Helvetica-Oblique').fillColor('#999999').text('Aguarda assinatura', rightX, boxY + 38, { width: colWidth, align: 'center' });
            }

            doc.fontSize(8).font('Helvetica').fillColor('#666666');
            doc.text(`Data: ${formatDatePT(contrato.assinaturaEmpresa?.data)}`, leftX, boxY + 96, { width: colWidth });
            doc.text(`Data: ${formatDatePT(contrato.assinaturaCliente?.data)}`, rightX, boxY + 96, { width: colWidth });

            // Rodapé (reservado a NIF/contactos — só na última página) e numeração
            // "Nº do contrato — Página X de Y" (em todas) — sem isto, páginas de um
            // contrato assinado podem ser substituídas/reordenadas sem deixar rasto.
            // Corre depois de todo o conteúdo (incluindo addPage automáticos) e antes
            // de doc.end(), com bufferPages. Zera temporariamente a margem inferior e
            // usa posições relativas a doc.page.height: sem isso o pdfkit interpreta a
            // escrita perto do fundo como "não cabe" e insere uma página em branco extra
            // só para essa linha (foi exatamente isto que aconteceu com o rodapé antigo,
            // escrito a y fixo 792 — acima do limite imprimível de ~792 numa A4).
            const pageRange = doc.bufferedPageRange();
            for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
                doc.switchToPage(i);
                const oldBottomMargin = doc.page.margins.bottom;
                doc.page.margins.bottom = 0;

                if (i === pageRange.start + pageRange.count - 1) {
                    doc.fontSize(8).font('Helvetica').fillColor('#666666');
                    doc.text('FestLift - Elevadores e Serviços, Lda. | NIF: 515 924 741 | Email: info@festlift.pt', 50, doc.page.height - 56, { align: 'center', width: doc.page.width - 100, lineBreak: false });
                    doc.text('Tel: +351 214 190 863 | Móvel: +351 926 380 243 | Avenida do Parque nº 84-B, Rio de Mouro, 2635-609', 50, doc.page.height - 44, { align: 'center', width: doc.page.width - 100, lineBreak: false });
                }

                doc.fontSize(8).font('Helvetica').fillColor('#666666')
                    .text(`${contrato.numero} — Página ${i + 1} de ${pageRange.count}`, 50, doc.page.height - 28, { align: 'center', width: doc.page.width - 100, lineBreak: false });
                doc.page.margins.bottom = oldBottomMargin;
            }
            doc.fillColor('#000000');

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

// POST /api/contratos-manutencao/from-proposta/:propostaId - Gera (ou devolve) o contrato a partir de proposta aprovada
router.post('/from-proposta/:propostaId', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const proposta = await PropostaManutencao.findById(req.params.propostaId).lean();
        if (!proposta) {
            return res.status(404).json({ success: false, message: 'Proposta não encontrada' });
        }
        if (proposta.status !== 'aprovado') {
            return res.status(400).json({ success: false, message: 'Só é possível gerar contrato a partir de uma proposta aprovada' });
        }

        const existenteDoc = await ContratoManutencao.findOne({ propostaId: proposta._id });
        if (existenteDoc) {
            // Fluxo: editar uma proposta já aprovada reabre-a como 'rascunho' (ver
            // PUT /:id em propostasManutencao.js), obrigando a reaprová-la antes de
            // gerar o contrato outra vez. Como propostaId é único, este endpoint
            // nunca cria um segundo contrato — por isso, se ainda ninguém assinou,
            // sincronizamos o contrato pendente com os dados atuais da proposta em
            // vez de devolver a versão antiga congelada na primeira geração.
            if (existenteDoc.status === 'pendente') {
                existenteDoc.tipo = proposta.tipo;
                existenteDoc.cliente = proposta.cliente;
                existenteDoc.instalacao = proposta.instalacao;
                existenteDoc.faturacao = proposta.faturacao;
                existenteDoc.numAscensores = proposta.numAscensores;
                existenteDoc.localInstalacao = proposta.localInstalacao;
                existenteDoc.precoMensal = proposta.precoMensal;
                existenteDoc.pagamento = proposta.pagamento;
                existenteDoc.dataInicioContrato = proposta.dataInicioContrato;
                existenteDoc.duracaoAnos = proposta.duracaoAnos;
                existenteDoc.renovacao = proposta.renovacao;
                existenteDoc.liftId = proposta.liftId || null;
                existenteDoc.lifts = proposta.lifts || [];
                existenteDoc.liftAddress = proposta.liftAddress || null;
                await existenteDoc.save();
                console.log(`🔄 Contrato ${existenteDoc.numero} sincronizado com a proposta ${proposta.numero} (edição pós-geração)`);
                return res.json({ success: true, message: 'Contrato existente atualizado com os dados mais recentes da proposta', data: existenteDoc.toObject(), jaExistia: true });
            }
            return res.json({ success: true, message: 'Contrato já existente para esta proposta', data: existenteDoc.toObject(), jaExistia: true });
        }

        const numero = await ContratoManutencao.gerarNumero();

        const contrato = new ContratoManutencao({
            numero,
            propostaId: proposta._id,
            data: new Date(),
            tipo: proposta.tipo,
            cliente: proposta.cliente,
            instalacao: proposta.instalacao,
            faturacao: proposta.faturacao,
            numAscensores: proposta.numAscensores,
            localInstalacao: proposta.localInstalacao,
            precoMensal: proposta.precoMensal,
            pagamento: proposta.pagamento,
            dataInicioContrato: proposta.dataInicioContrato,
            duracaoAnos: proposta.duracaoAnos,
            renovacao: proposta.renovacao,
            liftId: proposta.liftId || null,
            lifts: proposta.lifts || [],
            liftAddress: proposta.liftAddress || null,
            criadoPor: req.user.id,
            status: 'pendente'
        });

        await contrato.save();
        console.log(`✅ Contrato de manutenção gerado a partir da proposta ${proposta.numero}: ${numero}`);

        res.status(201).json({ success: true, message: 'Contrato criado com sucesso', data: contrato, jaExistia: false });
    } catch (error) {
        console.error('Erro ao gerar contrato a partir de proposta:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar contrato', error: error.message });
    }
});

// GET /api/contratos-manutencao - Lista (admin/dispatcher: todos; client: apenas os seus)
router.get('/', authenticate, authorizeRoles('admin', 'dispatcher', 'client'), async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search } = req.query;
        const query = {};

        if (req.user.role === 'client') {
            if (!req.user.email) {
                return res.status(400).json({ success: false, message: 'Token de utilizador incorreto' });
            }
            query['cliente.email'] = req.user.email.toLowerCase();
        }

        if (status) query.status = status;

        if (search) {
            const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { numero: new RegExp(safeSearch, 'i') },
                { 'cliente.nome': new RegExp(safeSearch, 'i') },
                { 'cliente.email': new RegExp(safeSearch, 'i') }
            ];
        }

        const skip = (page - 1) * limit;

        const contratos = await ContratoManutencao.find(query)
            .populate('criadoPor', 'name email')
            .sort({ data: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();
        const total = await ContratoManutencao.countDocuments(query);

        res.json({
            success: true,
            data: contratos,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Erro ao buscar contratos:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar contratos', error: error.message });
    }
});

// GET /api/contratos-manutencao/condicoes-gerais/texto?tipo=completa|simples - Texto integral das Condições Gerais (público — texto legal não sensível)
router.get('/condicoes-gerais/texto', (req, res) => {
    const artigos = req.query.tipo === 'completa' ? CONDICOES_GERAIS_ARTIGOS_COMPLETA : CONDICOES_GERAIS_ARTIGOS;
    res.json({ success: true, data: artigos });
});

// ─────────────────────────────────────────────────────────────
// Rotas públicas de assinatura (sem autenticação — acesso por token)
// Permite que um cliente sem conta na plataforma veja e assine o contrato.
// ─────────────────────────────────────────────────────────────

function contratoParaPublico(contrato) {
    const obj = contrato.toObject ? contrato.toObject() : contrato;
    delete obj.criadoPor;
    delete obj.emailsEnviados;
    return obj;
}

// GET /api/contratos-manutencao/public/:id?token=...
router.get('/public/:id', async (req, res) => {
    try {
        const contrato = await ContratoManutencao.findById(req.params.id).lean();
        if (!contrato) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });

        if (!isValidPublicAccessToken(contrato, req.query.token)) {
            return res.status(401).json({ success: false, message: 'Link de acesso inválido ou expirado' });
        }

        res.json({ success: true, data: contratoParaPublico(contrato) });
    } catch (error) {
        console.error('Erro ao buscar contrato público:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar contrato', error: error.message });
    }
});

// GET /api/contratos-manutencao/public/:id/pdf?token=...
router.get('/public/:id/pdf', async (req, res) => {
    try {
        const contrato = await ContratoManutencao.findById(req.params.id).lean();
        if (!contrato) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });

        if (!isValidPublicAccessToken(contrato, req.query.token)) {
            return res.status(401).json({ success: false, message: 'Link de acesso inválido ou expirado' });
        }

        const pdfBuffer = await gerarPDFContratoManutencao(contrato);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Contrato_${contrato.numero}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Erro ao gerar PDF público do contrato:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar PDF', error: error.message });
    }
});

// POST /api/contratos-manutencao/public/:id/assinar?token=... — assinatura do cliente sem login
router.post('/public/:id/assinar', async (req, res) => {
    try {
        const contrato = await ContratoManutencao.findById(req.params.id);
        if (!contrato) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });

        if (!isValidPublicAccessToken(contrato, req.query.token)) {
            return res.status(401).json({ success: false, message: 'Link de acesso inválido ou expirado' });
        }

        const { imagem, nomeAssinante } = req.body;
        if (!dataUrlToBuffer(imagem)) {
            return res.status(400).json({ success: false, message: 'Assinatura inválida' });
        }

        if (contrato.status === 'cancelado') {
            return res.status(400).json({ success: false, message: 'Contrato cancelado não pode ser assinado' });
        }
        if (!contrato.assinaturaEmpresa) {
            return res.status(400).json({ success: false, message: 'A FESTLIFT ainda não assinou este contrato' });
        }
        if (contrato.assinaturaCliente) {
            return res.status(400).json({ success: false, message: 'Este contrato já foi assinado pelo cliente' });
        }

        const { created, user } = await garantirContaCliente(contrato.cliente, req);

        contrato.assinaturaCliente = {
            imagem,
            data: new Date(),
            assinadoPor: user ? user._id : null,
            nomeAssinante: (nomeAssinante || '').trim() || contrato.cliente.nome
        };
        contrato.status = 'assinado';
        if (created) contrato.contaClienteCriada = true;
        // Nota: o token mantém-se válido até expirar (90 dias) — a página de
        // assinatura reutiliza-o logo a seguir para mostrar/descarregar o PDF
        // assinado, por isso não pode ser invalidado no mesmo pedido.
        contrato.accessTokenUsedAt = new Date();
        await contrato.save();
        notificarLiftPendente(contrato).catch(() => {});

        res.json({
            success: true,
            message: 'Contrato assinado com sucesso!',
            data: contratoParaPublico(contrato),
            contaCriada: created
        });
    } catch (error) {
        console.error('Erro ao assinar contrato (link público):', error);
        res.status(500).json({ success: false, message: 'Erro ao registar assinatura', error: error.message });
    }
});

// GET /api/contratos-manutencao/:id/link-assinatura - Obter o link público de assinatura (admin/dispatcher)
router.get('/:id/link-assinatura', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const contrato = await ContratoManutencao.findById(req.params.id).lean();
        if (!contrato) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
        if (!contrato.assinaturaEmpresa) {
            return res.status(400).json({ success: false, message: 'A FESTLIFT deve assinar o contrato antes de partilhar o link com o cliente' });
        }

        res.json({ success: true, url: await buildPublicSigningUrl(req, contrato) });
    } catch (error) {
        console.error('Erro ao gerar link de assinatura:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar link', error: error.message });
    }
});

// POST /api/contratos-manutencao/:id/enviar-link - Enviar o link de assinatura por email ao cliente (admin/dispatcher)
router.post('/:id/enviar-link', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const contrato = await ContratoManutencao.findById(req.params.id);
        if (!contrato) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
        if (!contrato.assinaturaEmpresa) {
            return res.status(400).json({ success: false, message: 'A FESTLIFT deve assinar o contrato antes de enviar ao cliente' });
        }
        if (contrato.assinaturaCliente) {
            return res.status(400).json({ success: false, message: 'Este contrato já foi assinado pelo cliente' });
        }

        const url = await buildPublicSigningUrl(req, contrato);
        const assunto = `Assine o seu contrato de manutenção ${contrato.numero} - FestLift`;
        const emailDestino = contrato.cliente.email;

        // Só prometemos "acesso automático após assinar" a quem ainda não tem conta —
        // um cliente já existente assina com o login que já usa, sem novo email de credenciais.
        const jaTemConta = !!(await User.findOne({ email: emailDestino.toLowerCase() }).lean());
        const avisoAcesso = jaTemConta ? '' : `<p style="margin: 0 0 20px 0; font-size: 14px; color: #555; line-height: 1.6;">Após assinar, criaremos automaticamente o seu acesso à plataforma FestLift — receberá um segundo email com o email de acesso e uma palavra-passe temporária, para acompanhar os seus elevadores, faturas e pedidos.</p>`;

        try {
            const transporter = getSmtpTransporter();
            const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER;
            await transporter.sendMail({
                from: smtpFrom,
                to: emailDestino,
                subject: assunto,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #1a3a6b 0%, #2355a0 100%); color: white; padding: 28px 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 22px;">FestLift</h1>
                            <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Elevadores e Serviços, Lda.</p>
                        </div>
                        <div style="padding: 32px 30px;">
                            <p style="margin: 0 0 16px 0; font-size: 15px; color: #333;">Caro(a) <strong>${contrato.cliente.nome}</strong>,</p>
                            <p style="margin: 0 0 20px 0; font-size: 15px; color: #333; line-height: 1.6;">O seu contrato de manutenção <strong>${contrato.numero}</strong> já foi assinado pela FESTLIFT e está pronto para a sua assinatura. Não precisa de criar conta nenhuma — basta abrir o link abaixo, rever os termos e assinar.</p>
                            ${avisoAcesso}
                            <a href="${url}" style="display:inline-block;background:#1a3a6b;color:#fff;text-decoration:none;padding:13px 30px;border-radius:6px;font-size:15px;font-weight:bold;">Rever e assinar contrato →</a>
                        </div>
                        <div style="background: #f8f9fa; padding: 18px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0; font-size: 12px; color: #888;">info@festlift.pt &nbsp;|&nbsp; +351 214 190 863</p>
                        </div>
                    </div>`
            });

            contrato.emailsEnviados.push({ para: emailDestino, assunto, sucesso: true });
            await contrato.save();

            res.json({ success: true, message: `Link de assinatura enviado para ${emailDestino}`, url });
        } catch (smtpError) {
            console.error('❌ Erro SMTP ao enviar link de assinatura:', smtpError.message);
            contrato.emailsEnviados.push({ para: emailDestino, assunto, sucesso: false, erro: smtpError.message });
            await contrato.save();
            res.status(500).json({ success: false, message: `Erro ao enviar email: ${smtpError.message}` });
        }
    } catch (error) {
        console.error('Erro ao enviar link de assinatura:', error);
        res.status(500).json({ success: false, message: 'Erro ao enviar link', error: error.message });
    }
});

// GET /api/contratos-manutencao/by-proposta/:propostaId
router.get('/by-proposta/:propostaId', authenticate, authorizeRoles('admin', 'dispatcher', 'client'), async (req, res) => {
    try {
        const contrato = await ContratoManutencao.findOne({ propostaId: req.params.propostaId }).lean();
        if (!contrato) return res.status(404).json({ success: false, message: 'Ainda não existe contrato para esta proposta' });

        if (req.user.role === 'client' && contrato.cliente.email.toLowerCase() !== (req.user.email || '').toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Sem permissão para este contrato' });
        }

        res.json({ success: true, data: contrato });
    } catch (error) {
        console.error('Erro ao buscar contrato por proposta:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar contrato', error: error.message });
    }
});

// GET /api/contratos-manutencao/:id/pdf
router.get('/:id/pdf', authenticate, async (req, res) => {
    try {
        const contrato = await ContratoManutencao.findById(req.params.id).lean();
        if (!contrato) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });

        if (req.user.role === 'client' && contrato.cliente.email.toLowerCase() !== (req.user.email || '').toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Sem permissão para este contrato' });
        }

        const pdfBuffer = await gerarPDFContratoManutencao(contrato);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Contrato_${contrato.numero}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Erro ao gerar PDF do contrato:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar PDF', error: error.message });
    }
});

// GET /api/contratos-manutencao/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const contrato = await ContratoManutencao.findById(req.params.id).populate('criadoPor', 'name email').lean();
        if (!contrato) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });

        if (req.user.role === 'client' && contrato.cliente.email.toLowerCase() !== (req.user.email || '').toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Sem permissão para este contrato' });
        }

        res.json({ success: true, data: contrato });
    } catch (error) {
        console.error('Erro ao buscar contrato:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar contrato', error: error.message });
    }
});

// POST /api/contratos-manutencao/:id/assinar-empresa (admin/dispatcher)
router.post('/:id/assinar-empresa', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const { imagem } = req.body;
        if (!dataUrlToBuffer(imagem)) {
            return res.status(400).json({ success: false, message: 'Assinatura inválida' });
        }

        const contrato = await ContratoManutencao.findById(req.params.id);
        if (!contrato) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
        if (contrato.status === 'cancelado') {
            return res.status(400).json({ success: false, message: 'Contrato cancelado não pode ser assinado' });
        }
        const jaEstavaAssinado = contrato.status === 'assinado';

        contrato.assinaturaEmpresa = {
            imagem,
            data: new Date(),
            assinadoPor: req.user.id,
            nomeAssinante: req.user.name || req.user.username || 'FESTLIFT'
        };
        contrato.status = contrato.assinaturaCliente ? 'assinado' : 'assinado_festlift';
        await contrato.save();
        if (contrato.status === 'assinado' && !jaEstavaAssinado) {
            notificarLiftPendente(contrato).catch(() => {});
        }

        res.json({ success: true, message: 'Assinatura da FESTLIFT registada', data: contrato });
    } catch (error) {
        console.error('Erro ao assinar contrato (empresa):', error);
        res.status(500).json({ success: false, message: 'Erro ao registar assinatura', error: error.message });
    }
});

// POST /api/contratos-manutencao/:id/assinar-cliente (client, apenas o seu próprio contrato)
router.post('/:id/assinar-cliente', authenticate, authorizeRoles('client'), async (req, res) => {
    try {
        const { imagem } = req.body;
        if (!dataUrlToBuffer(imagem)) {
            return res.status(400).json({ success: false, message: 'Assinatura inválida' });
        }

        const contrato = await ContratoManutencao.findById(req.params.id);
        if (!contrato) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });

        if (contrato.cliente.email.toLowerCase() !== (req.user.email || '').toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Sem permissão para este contrato' });
        }
        if (contrato.status === 'cancelado') {
            return res.status(400).json({ success: false, message: 'Contrato cancelado não pode ser assinado' });
        }
        if (!contrato.assinaturaEmpresa) {
            return res.status(400).json({ success: false, message: 'A FESTLIFT ainda não assinou este contrato' });
        }

        contrato.assinaturaCliente = {
            imagem,
            data: new Date(),
            assinadoPor: req.user.id,
            nomeAssinante: req.user.name || req.user.username || contrato.cliente.nome
        };
        contrato.status = 'assinado';
        await contrato.save();
        notificarLiftPendente(contrato).catch(() => {});

        res.json({ success: true, message: 'Assinatura registada. Contrato assinado por ambas as partes!', data: contrato });
    } catch (error) {
        console.error('Erro ao assinar contrato (cliente):', error);
        res.status(500).json({ success: false, message: 'Erro ao registar assinatura', error: error.message });
    }
});

// POST /api/contratos-manutencao/:id/cancelar (admin)
router.post('/:id/cancelar', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const contrato = await ContratoManutencao.findById(req.params.id);
        if (!contrato) return res.status(404).json({ success: false, message: 'Contrato não encontrado' });
        if (contrato.status === 'assinado') {
            return res.status(400).json({ success: false, message: 'Contrato já assinado por ambas as partes não pode ser cancelado' });
        }

        contrato.status = 'cancelado';
        await contrato.save();

        res.json({ success: true, message: 'Contrato cancelado', data: contrato });
    } catch (error) {
        console.error('Erro ao cancelar contrato:', error);
        res.status(500).json({ success: false, message: 'Erro ao cancelar contrato', error: error.message });
    }
});

module.exports = router;
