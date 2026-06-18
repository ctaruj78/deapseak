const express = require('express');
const router = express.Router();
const Orcamento = require('../../models/Orcamento');
const mongoose = require('mongoose');
require('../models/User'); // ensure User schema is registered for populate()
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const fsPromises = require('fs').promises;
const sharp = require('sharp');

// Multer para fotos de orçamentos — usa memoryStorage para converter para WebP
const uploadOrcFoto = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB original; WebP será muito menor
    fileFilter: (req, file, cb) => {
        if (/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Apenas imagens JPG, PNG, WEBP, GIF, HEIC são aceites'));
    }
});

function normalizeText(value = '') {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9/\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeMunicipal(value = '') {
    return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function extractMunicipalCandidates(text = '') {
    const matches = String(text || '').match(/\b\d{3,6}\/\d{2,6}\b/g) || [];
    return [...new Set(matches.map(normalizeMunicipal))];
}

function liftAddressToString(lift) {
    const addr = lift?.address || {};
    if (typeof addr === 'string') return addr;
    return [addr.street, addr.zipCode, addr.city].filter(Boolean).join(', ');
}

function scoreLiftForOrcamento(orcamento, lift) {
    let score = 0;

    const liftMunicipal = normalizeMunicipal(lift.municipalNumber || '');
    const textPool = [
        orcamento?.cliente?.morada,
        orcamento?.liftAddress,
        orcamento?.notas,
        ...(Array.isArray(orcamento?.servicos) ? orcamento.servicos.map(s => s?.descricao) : [])
    ].filter(Boolean).join(' | ');

    const municipalCandidates = extractMunicipalCandidates(textPool);
    if (liftMunicipal && municipalCandidates.includes(liftMunicipal)) {
        score += 120;
    }

    const liftStreet = normalizeText(lift?.address?.street || '');
    const cliAddress = normalizeText(orcamento?.cliente?.morada || '');
    const liftAddress = normalizeText(orcamento?.liftAddress || '');
    if (liftStreet && cliAddress && (cliAddress.includes(liftStreet) || liftStreet.includes(cliAddress))) {
        score += 70;
    }
    if (liftStreet && liftAddress && (liftAddress.includes(liftStreet) || liftStreet.includes(liftAddress))) {
        score += 85;
    }

    const liftZip = normalizeText(lift?.address?.zipCode || '');
    if (liftZip && (cliAddress.includes(liftZip) || liftAddress.includes(liftZip))) {
        score += 20;
    }

    return score;
}

async function detectarLiftPorOrcamento(orcamento) {
    try {
        const db = mongoose.connection.db;
        const email = (orcamento?.cliente?.email || '').toLowerCase();

        let lifts = [];
        if (email) {
            lifts = await db.collection('lifts').find({ clientEmail: email }).toArray();
        }
        if (!lifts.length) {
            lifts = await db.collection('lifts').find({}).toArray();
        }

        if (!lifts.length) return null;

        const scored = lifts
            .map(lift => ({
                lift,
                score: scoreLiftForOrcamento(orcamento, lift)
            }))
            .sort((a, b) => b.score - a.score);

        const best = scored[0];
        const second = scored[1];
        if (!best || best.score < 80) return null;
        if (second && best.score - second.score < 20) return null;

        return {
            liftId: best.lift._id,
            liftAddress: liftAddressToString(best.lift),
            municipalNumber: best.lift.municipalNumber || null
        };
    } catch (e) {
        console.warn('⚠️ detectarLiftPorOrcamento error:', e.message);
        return null;
    }
}

// Tentar encontrar lift pela morada do cliente
async function detectarLiftPorMorada(morada) {
    if (!morada) return null;
    try {
        const db = mongoose.connection.db;
        const moradaNorm = normalizeText(morada);
        const lifts = await db.collection('lifts').find({}).toArray();
        for (const lift of lifts) {
            const addrStr = normalizeText(liftAddressToString(lift));
            const street = normalizeText(lift?.address?.street || '');
            if (!addrStr) continue;

            if ((street && moradaNorm.includes(street)) || addrStr.includes(moradaNorm) || moradaNorm.includes(addrStr)) {
                return {
                    liftId: lift._id,
                    liftAddress: liftAddressToString(lift)
                };
            }
        }
    } catch (e) {
        console.warn('⚠️ detectarLiftPorMorada error:', e.message);
    }
    return null;
}

// Expirar automaticamente orçamentos 'enviado' cuja validadeAte já passou
async function autoExpirarOrcamentos(filterExtra = {}) {
    const now = new Date();
    // First migrate any remaining string dates (legacy data)
    const col = Orcamento.collection;
    const legacyDocs = await col.find({ status: 'enviado', validadeAte: { $type: 'string' }, ...filterExtra }).toArray();
    for (const doc of legacyDocs) {
        if (typeof doc.validadeAte === 'string') {
            await col.updateOne({ _id: doc._id }, { $set: { validadeAte: new Date(doc.validadeAte) } });
        }
    }
    // Now expire properly-typed Date fields
    const result = await Orcamento.updateMany(
        { status: 'enviado', validadeAte: { $lt: now }, ...filterExtra },
        { $set: { status: 'expirado' } }
    );
    if (result.modifiedCount > 0) {
        console.log(`⏰ Auto-expirados ${result.modifiedCount} orçamento(s)`);
    }
}

// Função para gerar PDF do orçamento
async function gerarPDFOrcamento(orcamento) {
    // Pre-convert photos to JPEG buffers — pdfkit doesn't support WebP
    const photoBuffers = new Map();
    for (const fotoPath of (orcamento.fotos || [])) {
        const absPath = path.join(__dirname, '../..', fotoPath.startsWith('/') ? fotoPath : '/' + fotoPath);
        if (!fs.existsSync(absPath)) continue;
        try {
            const buf = await sharp(absPath).jpeg({ quality: 85 }).toBuffer();
            photoBuffers.set(fotoPath, buf);
        } catch (e) {
            console.warn('⚠️ Erro ao converter foto para JPEG:', fotoPath, e.message);
        }
    }

    return new Promise((resolve, reject) => {
        try {
            const ORCAMENTO_COLOR = '#1a3a6b';
            const OBSERVACAO_COLOR = '#000000';
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];
            
            // Coletar chunks do PDF
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            
            // Cabeçalho com logótipo
            const logoPath = path.join(__dirname, '../../assets/img/logo.png');
            if (fs.existsSync(logoPath)) {
                // Fundo azul escuro atrás do logótipo
                doc.rect(40, 35, 185, 80).fill('#1a3a6b');
                doc.image(logoPath, 50, 45, { width: 160 });
                doc.y = 130;
            } else {
                doc.fontSize(24).font('Helvetica-Bold').text('FestLift - Elevadores e Serviços, Lda.', { align: 'center' });
                doc.moveDown();
            }
            doc.fontSize(10).font('Helvetica');
            doc.text('Av. do Parque 84B, Rio de Mouro, Lisboa 2635-609', { align: 'center' });
            doc.text('Tel: +351 214 190 863 | Móvel: +351 926 380 243/244', { align: 'center' });
            doc.text('Email: info@festlift.pt | NIF: 515924741', { align: 'center' });
            doc.moveDown();
            
            // Linha separadora
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();
            
            // Título do Orçamento
            doc.fontSize(18).font('Helvetica-Bold').text(`Orçamento ${orcamento.numero}`, { align: 'center' });
            doc.moveDown();
            
            // Informações do Cliente
            doc.fontSize(12).font('Helvetica-Bold').text('Cliente:', 50, doc.y);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Nome: ${orcamento.cliente.nome}`, 50, doc.y + 5);
            doc.text(`Email: ${orcamento.cliente.email}`, 50, doc.y + 5);
            if (orcamento.cliente.morada) {
                doc.text(`Morada: ${orcamento.cliente.morada}`, 50, doc.y + 5);
            }
            if (orcamento.cliente.telefone) {
                doc.text(`Telefone: ${orcamento.cliente.telefone}`, 50, doc.y + 5);
            }
            if (orcamento.cliente.nif) {
                doc.text(`NIF: ${orcamento.cliente.nif}`, 50, doc.y + 5);
            }
            doc.moveDown();
            
            // Data e Validade
            const dataOrçamento = new Date(orcamento.data);
            const validade = new Date(dataOrçamento);
            validade.setDate(validade.getDate() + 30);
            
            doc.fontSize(10);
            doc.text(`Data: ${dataOrçamento.toLocaleDateString('pt-PT')}`, 50, doc.y);
            doc.text(`Validade: ${validade.toLocaleDateString('pt-PT')}`, 50, doc.y + 5);
            doc.moveDown(2);
            
            // Tabela de Serviços
            doc.fontSize(12).font('Helvetica-Bold').fillColor(ORCAMENTO_COLOR).text('Serviços:', 50, doc.y);
            doc.moveDown(0.5);
            
            // Cabeçalho da tabela
            const tableTop = doc.y;
            const col1 = 50;
            const col2 = 300;
            const col3 = 380;
            const col4 = 480;
            
            doc.fontSize(10).font('Helvetica-Bold').fillColor(ORCAMENTO_COLOR);
            doc.text('Descrição', col1, tableTop);
            doc.text('Qtd', col2, tableTop, { width: 70, align: 'right' });
            doc.text('Preço', col3, tableTop, { width: 90, align: 'right' });
            doc.text('Total', col4, tableTop, { width: 70, align: 'right' });
            
            // Linha abaixo do cabeçalho
            doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();
            
            // Linhas da tabela
            let yPos = tableTop + 25;
            doc.font('Helvetica').fontSize(10).fillColor(ORCAMENTO_COLOR);
            
            orcamento.servicos.forEach((servico) => {
                // Calcular altura real do texto de descrição (pode ter múltiplas linhas)
                const descText = servico.descricao || '';
                const descHeight = doc.heightOfString(descText, { width: 240 });
                const rowHeight = Math.max(descHeight, 12) + 10; // padding de 10pt

                if (yPos + rowHeight > 700) { // Nova página se necessário
                    doc.addPage();
                    yPos = 50;
                }
                
                doc.font('Helvetica').fontSize(10).fillColor(ORCAMENTO_COLOR);
                doc.text(descText, col1, yPos, { width: 240, lineBreak: true });
                doc.text(servico.quantidade.toString(), col2, yPos, { width: 70, align: 'right' });
                doc.text(`€${servico.precoUnitario.toFixed(2)}`, col3, yPos, { width: 90, align: 'right' });
                doc.text(`€${servico.total.toFixed(2)}`, col4, yPos, { width: 70, align: 'right' });
                
                yPos += rowHeight;
            });
            
            // Linha antes dos totais
            doc.moveTo(col1, yPos).lineTo(550, yPos).stroke();
            yPos += 15;
            
            // Totais
            doc.fontSize(11).font('Helvetica-Bold').fillColor(ORCAMENTO_COLOR);
            doc.text('Subtotal:', col3, yPos, { width: 90, align: 'right' });
            doc.text(`€${orcamento.subtotal.toFixed(2)}`, col4, yPos, { width: 70, align: 'right' });
            
            yPos += 20;
            doc.text('IVA (23%):', col3, yPos, { width: 90, align: 'right' });
            doc.text(`€${orcamento.iva.toFixed(2)}`, col4, yPos, { width: 70, align: 'right' });
            
            yPos += 20;
            doc.fontSize(14);
            doc.text('TOTAL:', col3, yPos, { width: 90, align: 'right' });
            doc.text(`€${orcamento.total.toFixed(2)}`, col4, yPos, { width: 70, align: 'right' });
            
            // Notas
            yPos += 35; // espaço após a linha TOTAL (fontSize 14 + gap)
            if (orcamento.notas) {
                if (yPos > 680) { doc.addPage(); yPos = 50; }
                doc.fontSize(10).font('Helvetica-Bold').fillColor(OBSERVACAO_COLOR).text('Notas:', 50, yPos);
                yPos += 15;
                doc.font('Helvetica').fontSize(9).fillColor(OBSERVACAO_COLOR).text(orcamento.notas, 50, yPos, { width: 500 });
                yPos = doc.y + 15;
            }

            // Dados Bancários para pagamento
            // Altura necessária para a caixa bancária: ~80px
            if (yPos > 660) { doc.addPage(); yPos = 50; }

            const bankBoxX = 50;
            const bankBoxWidth = 480;
            const bankBoxHeight = 95;

            // Caixa de fundo (azul claro)
            doc.rect(bankBoxX, yPos, bankBoxWidth, bankBoxHeight)
               .fill('#e8f0fb');

            // Borda azul
            doc.rect(bankBoxX, yPos, bankBoxWidth, bankBoxHeight)
               .stroke('#1a3a6b');

            // Título
            doc.fontSize(10).font('Helvetica-Bold')
               .fillColor('#1a3a6b')
               .text('Dados Bancários para Pagamento', bankBoxX + 10, yPos + 10);

            // Linha separadora dentro da caixa
            doc.moveTo(bankBoxX + 10, yPos + 23)
               .lineTo(bankBoxX + bankBoxWidth - 10, yPos + 23)
               .strokeColor('#1a3a6b').stroke();

            // Conteúdo bancário em duas colunas
            doc.fontSize(9).font('Helvetica').fillColor('#333333');
            const leftCol = bankBoxX + 10;
            const rightCol = bankBoxX + 250;
            const bankTextY = yPos + 30;

            doc.font('Helvetica-Bold').text('IBAN:', leftCol, bankTextY);
            doc.font('Helvetica').text(process.env.COMPANY_IBAN || 'PT50 0010 0000 5854 8320 0015 4', leftCol + 35, bankTextY);

            doc.font('Helvetica-Bold').text('BIC/SWIFT:', leftCol, bankTextY + 14);
            doc.font('Helvetica').text(process.env.COMPANY_BIC || 'BBPIPTPL', leftCol + 60, bankTextY + 14);

            doc.font('Helvetica-Bold').text('Banco:', rightCol, bankTextY);
            doc.font('Helvetica').text(process.env.COMPANY_BANK || 'Banco BPI', rightCol + 42, bankTextY);

            doc.font('Helvetica-Bold').text('Titular:', rightCol, bankTextY + 14);
            doc.font('Helvetica').text(
                process.env.COMPANY_ACCOUNT_HOLDER || 'FestLift - Elevadores e Serviços, Lda.',
                rightCol + 42, bankTextY + 14, { width: 178, lineBreak: true }
            );

            doc.font('Helvetica-Bold').text('Referência:', leftCol, bankTextY + 40);
            doc.font('Helvetica').text(orcamento.numero, leftCol + 65, bankTextY + 40);

            // Restaurar cor padrão
            doc.fillColor('#000000');
            yPos += bankBoxHeight + 15;

            // Fotografias do orçamento
            if (orcamento.fotos && orcamento.fotos.length > 0) {
                if (yPos > 650) { doc.addPage(); yPos = 50; }
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('Documentação Fotográfica:', 50, yPos);
                yPos += 18;
                doc.moveTo(50, yPos).lineTo(550, yPos).stroke('#cccccc');
                yPos += 8;

                const imgW = 230;
                const imgH = 170;
                const gap = 20;
                let col = 0; // 0 = esquerda, 1 = direita
                for (const fotoPath of orcamento.fotos) {
                    const imgBuf = photoBuffers.get(fotoPath);
                    if (!imgBuf) continue;
                    try {
                        const x = col === 0 ? 50 : 50 + imgW + gap;
                        if (yPos + imgH > 780) { doc.addPage(); yPos = 50; col = 0; }
                        doc.image(imgBuf, x, yPos, { width: imgW, height: imgH, fit: [imgW, imgH] });
                        if (col === 1) { yPos += imgH + 12; col = 0; } else { col = 1; }
                    } catch (imgErr) {
                        console.warn('⚠️ Erro ao inserir foto no PDF:', fotoPath, imgErr.message);
                    }
                }
                if (col === 1) { yPos += imgH + 12; } // última linha com 1 foto
                yPos += 10;
            }

            // Rodapé — sempre na última página, abaixo do conteúdo
            const footerY = Math.max(yPos + 10, 770);
            if (footerY > 810) { doc.addPage(); }
            doc.fontSize(8).font('Helvetica').fillColor('#666666');
            doc.text('FestLift - Elevadores e Serviços, Lda. | NIF: 515 924 741 | Email: info@festlift.pt', 50, footerY, { align: 'center', width: 500 });
            doc.text('Tel: +351 214 190 863 | Móvel: +351 926 380 243/244 | Av. do Parque 84B, Rio de Mouro, Lisboa 2635-609', 50, footerY + 12, { align: 'center', width: 500 });
            doc.fillColor('#000000');
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

function generatePublicAccessToken(id) {
    return crypto
        .createHash('sha256')
        .update(id.toString() + (process.env.JWT_SECRET || 'deapseak_secret_key_2024'))
        .digest('hex')
        .substring(0, 16);
}

function buildPublicPdfUrl(req, orcamentoId, token) {
    const configuredBaseUrl = process.env.PUBLIC_BASE_URL;
    const runtimeBaseUrl = `${req.protocol}://${req.get('host')}`;
    const baseUrl = (configuredBaseUrl || runtimeBaseUrl).replace(/\/$/, '');
    return `${baseUrl}/api/orcamentos/public/${orcamentoId}/pdf?token=${token}`;
}

// PUBLIC ROUTE: GET /api/orcamentos/public/:id - Перегляд орçаменту без авторизації (з токеном)
router.get('/public/:id', async (req, res) => {
    try {
        const { token } = req.query;
        const { id } = req.params;
        
        // Перевірка токену (простий base64(id + secret))
        const expectedToken = generatePublicAccessToken(id);
        
        if (!token || token !== expectedToken) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso inválido'
            });
        }
        
        const orcamento = await Orcamento.findById(id)
            .populate('criadoPor', 'name email');
        
        if (!orcamento) {
            return res.status(404).json({
                success: false,
                message: 'Orçamento não encontrado'
            });
        }
        
        res.json({
            success: true,
            data: orcamento
        });
    } catch (error) {
        console.error('Erro ao buscar orçamento público:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar orçamento',
            error: error.message
        });
    }
});

// GET /api/orcamentos/public/:id/pdf - Публічне завантаження PDF по токену
router.get('/public/:id/pdf', async (req, res) => {
    try {
        const { id } = req.params;
        const { token } = req.query;
        const expectedToken = generatePublicAccessToken(id);

        if (!token || token !== expectedToken) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso inválido'
            });
        }

        const orcamento = await Orcamento.findById(id);
        if (!orcamento) {
            return res.status(404).json({
                success: false,
                message: 'Orçamento não encontrado'
            });
        }

        // Генеруємо PDF та віддаємо як attachment
        const pdfBuffer = await gerarPDFOrcamento(orcamento);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Orcamento_${orcamento.numero}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Erro ao gerar PDF público:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar PDF',
            error: error.message
        });
    }
});

// GET /api/orcamentos/my - Orçamentos do cliente autenticado (por email)
router.get('/my', authenticate, authorizeRoles('client'), async (req, res) => {
    try {
        const clienteEmail = req.user.email;
        // Auto-expirar os orçamentos vencidos deste cliente antes de devolver
        await autoExpirarOrcamentos({ 'cliente.email': clienteEmail.toLowerCase() });

        const orcamentos = await Orcamento.find({
            'cliente.email': clienteEmail.toLowerCase(),
            status: { $in: ['enviado', 'aprovado', 'rejeitado', 'expirado'] }
        })
            .sort({ data: -1 })
            .select('-emailsEnviados -pdfPath');

        // Re-vinculação automática para registos antigos sem liftId
        for (const orcamento of orcamentos) {
            if (orcamento.liftId) continue;

            const detected = await detectarLiftPorOrcamento(orcamento);
            if (!detected) continue;

            orcamento.liftId = detected.liftId;
            orcamento.liftAddress = detected.liftAddress || orcamento.liftAddress || null;

            const existingLifts = Array.isArray(orcamento.lifts) ? orcamento.lifts : [];
            const hasDetected = existingLifts.some(item => String(item?.liftId || item) === String(detected.liftId));
            if (!hasDetected) {
                orcamento.lifts = [...existingLifts, detected.liftId];
            }

            await orcamento.save();
            console.log(`🔧 Auto-link orçamento ${orcamento.numero} → elevador ${detected.municipalNumber || detected.liftId}`);
        }

        res.json({ success: true, data: orcamentos });
    } catch (error) {
        console.error('Erro ao buscar orçamentos do cliente:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar orçamentos', error: error.message });
    }
});

// POST /api/orcamentos/:id/resposta - Cliente aprova ou rejeita o orçamento
router.post('/:id/resposta', authenticate, async (req, res) => {
    try {
        const { status, observacao } = req.body;
        if (!['aprovado', 'rejeitado'].includes(status)) {
            return res.status(400).json({ success: false, message: "Status deve ser 'aprovado' ou 'rejeitado'" });
        }

        const orcamento = await Orcamento.findById(req.params.id);
        if (!orcamento) {
            return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        }

        // Verificar que o email do utilizador autenticado corresponde ao cliente do orçamento
        if (orcamento.cliente.email.toLowerCase() !== req.user.email.toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Sem permissão para responder a este orçamento' });
        }

        if (orcamento.status !== 'enviado') {
            return res.status(400).json({
                success: false,
                message: `Orçamento já foi respondido (status atual: '${orcamento.status}')`
            });
        }

        orcamento.status = status;
        orcamento.dataResposta = new Date();
        orcamento.aprovadoPor = 'cliente';
        orcamento.aprovadoPorUser = req.user.id;
        if (observacao) orcamento.observacao = observacao;
        await orcamento.save();

        res.json({
            success: true,
            message: status === 'aprovado' ? 'Orçamento aprovado com sucesso!' : 'Orçamento rejeitado.',
            data: { status: orcamento.status, dataResposta: orcamento.dataResposta }
        });
    } catch (error) {
        console.error('Erro ao responder orçamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao processar resposta', error: error.message });
    }
});

// GET /api/orcamentos - Lista de orçamentos
// admin/dispatcher: todos (com filtros)
// client: apenas os seus (compatível com páginas legadas que chamam /api/orcamentos)
router.get('/', authenticate, authorizeRoles('admin', 'dispatcher', 'client'), async (req, res) => {
    try {
        // Auto-expirar todos os orçamentos vencidos antes de listar
        await autoExpirarOrcamentos();

        const { status, page = 1, limit = 20, search } = req.query;
        
        const query = {};
        
        // Clientes só podem ver os próprios orçamentos
        if (req.user.role === 'client' && req.user.email) {
            query['cliente.email'] = req.user.email.toLowerCase();
        }

        // Фільтр по статусу
        if (status) {
            query.status = status;
        }

        // Архів: за замовчуванням не показуємо архівовані
        if (req.query.archived === 'true') {
            query.archived = true;
        } else {
            query.archived = { $ne: true };
        }
        
        // Пошук по клієнту ou номеру
        if (search) {
            query.$or = [
                { numero: new RegExp(search, 'i') },
                { 'cliente.nome': new RegExp(search, 'i') },
                { 'cliente.email': new RegExp(search, 'i') }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const orcamentosQuery = Orcamento.find(query)
            .populate('criadoPor', 'name email')
            .sort({ data: -1 });

        // Для клієнта не повертаємо службові поля
        if (req.user.role === 'client') {
            orcamentosQuery.select('-emailsEnviados -pdfPath');
        }

        const orcamentos = await orcamentosQuery
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await Orcamento.countDocuments(query);
        
        res.json({
            success: true,
            data: orcamentos,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erro ao buscar orçamentos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar orçamentos',
            error: error.message
        });
    }
});

// GET /api/orcamentos/next-number - Obter próximo número disponível (admin/dispatcher only)
router.get('/next-number', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const ano = new Date().getFullYear();
        const mes = String(new Date().getMonth() + 1).padStart(2, '0');
        
        // Buscar último orçamento do mês
        const ultimoOrcamento = await Orcamento.findOne({
            numero: new RegExp(`^ORC-${ano}-${mes}`)
        }).sort({ numero: -1 });
        
        let sequencia = 1;
        if (ultimoOrcamento) {
            const match = ultimoOrcamento.numero.match(/ORC-\d{4}-\d{2}-(\d{3})/);
            if (match) sequencia = parseInt(match[1]) + 1;
        }
        
        const numero = `ORC-${ano}-${mes}-${String(sequencia).padStart(3, '0')}`;
        
        res.json({
            success: true,
            numero,
            proximaSequencia: sequencia
        });
    } catch (error) {
        console.error('❌ Erro ao gerar próximo número:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar próximo número',
            error: error.message
        });
    }
});

// GET /api/orcamentos/stats/dashboard - Estatísticas (deve ficar antes de /:id)
router.get('/stats/dashboard', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const stats = await Orcamento.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValor: { $sum: '$total' }
                }
            }
        ]);

        const totalOrcamentos = await Orcamento.countDocuments();
        const totalValor = await Orcamento.aggregate([
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        res.json({
            success: true,
            data: {
                total: totalOrcamentos,
                valorTotal: totalValor[0]?.total || 0,
                porStatus: stats
            }
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas', error: error.message });
    }
});

// GET /api/orcamentos/:id/pdf - Download autenticado do PDF (admin/dispatcher/cliente)
router.get('/:id/pdf', authenticate, async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id);
        if (!orcamento) {
            return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        }

        // Cliente só pode descarregar o seu próprio orçamento
        if (req.user.role === 'client' && orcamento.cliente.email.toLowerCase() !== req.user.email.toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Sem permissão para este orçamento' });
        }

        const pdfBuffer = await gerarPDFOrcamento(orcamento);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Orcamento_${orcamento.numero}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Erro ao gerar PDF autenticado:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar PDF', error: error.message });
    }
});

// GET /api/orcamentos/:id - Detalhe do orçamento
router.get('/:id', authenticate, async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id)
            .populate('criadoPor', 'name email');

        if (!orcamento) {
            return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        }

        // Cliente só pode ver o seu próprio orçamento
        if (req.user.role === 'client' && orcamento.cliente.email.toLowerCase() !== req.user.email.toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Sem permissão para este orçamento' });
        }

        res.json({ success: true, data: orcamento });
    } catch (error) {
        console.error('Erro ao buscar orçamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar orçamento', error: error.message });
    }
});

// POST /api/orcamentos - Criar novo orçamento (admin/dispatcher only)
router.post('/', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const { cliente, servicos, subtotal, iva, total, notas, liftId: bodyLiftId, lifts: bodyLifts, liftAddress: bodyLiftAddress } = req.body;
        
        // Validação básica
        if (!cliente || !cliente.nome || !cliente.email || !cliente.morada) {
            return res.status(400).json({
                success: false,
                message: 'Dados do cliente incompletos'
            });
        }
        
        if (!servicos || servicos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Pelo menos um serviço é obrigatório'
            });
        }
        
        // Gerar número automático
        const numero = await Orcamento.gerarNumero();
        
        // Data de criação e validade automática (30 dias)
        const dataAtual = new Date();
        const validadeAte = new Date(dataAtual);
        validadeAte.setDate(validadeAte.getDate() + 30);

        // Detectar ligação ao elevador
        let liftId = null;
        let liftAddress = bodyLiftAddress || null;
        // Normalizar array de lifts vindos do frontend
        let liftsArray = [];
        if (Array.isArray(bodyLifts) && bodyLifts.length > 0) {
            liftsArray = bodyLifts.filter(Boolean);
            // Usar o primeiro como liftId principal para compatibilidade
            liftId = liftsArray[0];
        } else if (bodyLiftId) {
            liftId = bodyLiftId;
            liftsArray = [bodyLiftId];
        }

        // Se temos liftId mas não temos liftAddress, buscar pelo id
        if (liftId && !liftAddress) {
            try {
                const db = mongoose.connection.db;
                const { ObjectId } = mongoose.Types;
                const lift = await db.collection('lifts').findOne({ _id: new ObjectId(liftId) });
                if (lift) {
                    const addr = lift.address || {};
                    liftAddress = typeof addr === 'string' ? addr : [addr.street, addr.zipCode, addr.city].filter(Boolean).join(', ');
                }
            } catch (e) { /* ignore invalid id */ }
        }

        // Se não temos nenhum lift, tentar detectar pela morada
        if (!liftId) {
            const detected = await detectarLiftPorMorada(cliente.morada);
            if (detected) {
                liftId = detected.liftId;
                liftAddress = detected.liftAddress;
                liftsArray = [detected.liftId];
            }
        }
        
        // Criar orçamento
        const orcamento = new Orcamento({
            numero,
            data: dataAtual,
            validadeAte,
            cliente,
            servicos,
            subtotal,
            iva,
            total,
            notas,
            criadoPor: req.user.id,
            status: 'rascunho',
            liftId: liftId || null,
            lifts: liftsArray,
            liftAddress: liftAddress || null
        });
        
        await orcamento.save();
        
        console.log(`✅ Orçamento criado: ${numero}${liftsArray.length ? ` → ${liftsArray.length} lift(s)` : ''}`);

        res.status(201).json({
            success: true,
            message: 'Orçamento criado com sucesso',
            data: orcamento,
            liftLinked: !!liftId,
            liftAddress: liftAddress || null
        });
    } catch (error) {
        console.error('Erro ao criar orçamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar orçamento',
            error: error.message
        });
    }
});

// PUT /api/orcamentos/:id - Atualizar orçamento (admin/dispatcher only)
router.put('/:id', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id);
        
        if (!orcamento) {
            return res.status(404).json({
                success: false,
                message: 'Orçamento não encontrado'
            });
        }
        
        const wasApproved = orcamento.status === 'aprovado';
        
        const { cliente, servicos, subtotal, iva, total, notas, status, numero, data, lifts: bodyLifts, liftAddress: bodyLiftAddress } = req.body;
        
        if (cliente) orcamento.cliente = cliente;
        if (servicos) orcamento.servicos = servicos;
        if (subtotal !== undefined) orcamento.subtotal = subtotal;
        if (iva !== undefined) orcamento.iva = iva;
        if (total !== undefined) orcamento.total = total;
        if (notas) orcamento.notas = notas;
        if (status) orcamento.status = status;
        // Дозволити оновлення numero та data (хоча зазвичай не потрібно)
        if (numero) orcamento.numero = numero;
        if (data) orcamento.data = data;
        // Оновлення масиву ліфтів
        if (Array.isArray(bodyLifts)) {
            orcamento.lifts = bodyLifts.filter(Boolean);
            if (bodyLifts.length > 0) orcamento.liftId = bodyLifts[0];
        }
        if (bodyLiftAddress !== undefined) orcamento.liftAddress = bodyLiftAddress || null;

        if (wasApproved) {
            orcamento.status = 'rascunho';
            orcamento.dataResposta = null;
            orcamento.aprovadoPor = null;
            orcamento.aprovadoPorUser = null;
            orcamento.observacao = null;
        }
        
        await orcamento.save();
        
        res.json({
            success: true,
            message: wasApproved
                ? 'Orçamento atualizado e reaberto como rascunho'
                : 'Orçamento atualizado com sucesso',
            data: orcamento
        });
    } catch (error) {
        console.error('Erro ao atualizar orçamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar orçamento',
            error: error.message
        });
    }
});

// DELETE /api/orcamentos/:id - Deletar orçamento (admin/dispatcher only)
router.delete('/:id', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id);
        
        if (!orcamento) {
            return res.status(404).json({
                success: false,
                message: 'Orçamento não encontrado'
            });
        }
        
        // Não permitir deletar se aprovado
        if (orcamento.status === 'aprovado') {
            return res.status(400).json({
                success: false,
                message: 'Orçamento aprovado não pode ser deletado'
            });
        }
        
        await orcamento.deleteOne();
        
        res.json({
            success: true,
            message: 'Orçamento deletado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao deletar orçamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar orçamento',
            error: error.message
        });
    }
});

// POST /api/orcamentos/:id/enviar - Enviar orçamento por email (admin/dispatcher only)
router.post('/:id/enviar', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    console.log(`🔔 POST /:id/enviar викликано - ID: ${req.params.id}`);
    console.log(`   User: ${req.user?.email || 'UNKNOWN'}`);
    console.log(`   Body:`, req.body);
    
    try {
        const orcamento = await Orcamento.findById(req.params.id);
        
        if (!orcamento) {
            console.log(`❌ Orçamento не знайдено: ${req.params.id}`);
            return res.status(404).json({
                success: false,
                message: 'Orçamento não encontrado'
            });
        }
        
        // Отримати email з body ou використати з орçаменту
        const emailDestino = req.body.email || orcamento.cliente.email;
        
        console.log(`📧 Enviando orçamento ${orcamento.numero} para ${emailDestino}`);
        
        // ✅ Enviar via SMTP (Brevo SMTP relay)
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

        // Parse EMAIL_FROM para sender correto
        let senderName = 'FestLift - Elevadores e Serviços, Lda.';
        let senderEmail = 'info@festlift.pt';
        if (process.env.EMAIL_FROM) {
            const fromMatch = process.env.EMAIL_FROM.match(/^(.+?)\s*<(.+?)>$/);
            if (fromMatch) {
                senderName = fromMatch[1].trim();
                senderEmail = fromMatch[2].trim();
            } else {
                senderEmail = process.env.EMAIL_FROM;
            }
        }
        const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER;
        const smtpFromEmail = (smtpFrom || '').match(/<([^>]+)>/)?.[1] || smtpFrom;
        const adminBcc = process.env.EMAIL_BCC || smtpFromEmail || null;

        const validadeDate = new Date(orcamento.validadeAte);
        const validadeFormatted = validadeDate.toLocaleDateString('pt-PT', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        // Nota: corpo simples — detalhes completos constam APENAS no PDF em anexo.
        // Evita duplicação no Apple Mail / macOS Mail.
        const emailHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 28px 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; letter-spacing: 1px;">FestLift</h1>
                    <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Elevadores e Serviços, Lda.</p>
                </div>
                <div style="padding: 32px 30px;">
                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #333;">
                        Caro(a) <strong>${orcamento.cliente.nome}</strong>,
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #333; line-height: 1.6;">
                        Enviamos em anexo o <strong>Orçamento ${orcamento.numero}</strong>,
                        no valor de <strong style="color: #667eea;">€${orcamento.total.toFixed(2)}</strong> (IVA incluído),
                        válido até <strong>${validadeFormatted}</strong>.
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 15px; color: #333; line-height: 1.6;">
                        Para qualquer questão ou esclarecimento, estamos inteiramente ao dispor.
                    </p>
                    <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 13px; color: #555;">
                            📎 O orçamento detalhado encontra-se no ficheiro PDF em anexo.
                        </p>
                    </div>
                    ${orcamento.fotos && orcamento.fotos.length > 0 ? `
                    <div style="margin-bottom: 24px;">
                        <p style="font-size: 13px; color: #555; margin-bottom: 10px;"><strong>📷 Documentação fotográfica:</strong></p>
                        <div style="display:flex; flex-wrap:wrap; gap:8px;">
                            ${orcamento.fotos.map(fotoPath => {
                                const absUrl = req.protocol + '://' + req.get('host') + (fotoPath.startsWith('/') ? fotoPath : '/' + fotoPath);
                                return `<img src="${absUrl}" style="width:160px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ddd;" alt="Foto">`;
                            }).join('')}
                        </div>
                    </div>` : ''}
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

        console.log('📄 Gerando PDF do orçamento...');
        const pdfBuffer = await gerarPDFOrcamento(orcamento);
        console.log(`✅ PDF gerado: ${pdfBuffer.length} bytes`);

        try {
            await transporter.sendMail({
                from: smtpFrom,
                to: emailDestino,
                bcc: adminBcc && adminBcc.toLowerCase() !== emailDestino.toLowerCase() ? adminBcc : undefined,
                subject: `Orçamento ${orcamento.numero} - FestLift - Elevadores e Serviços, Lda.`,
                html: emailHTML,
                attachments: [{
                    filename: `Orcamento_${orcamento.numero}.pdf`,
                    content: pdfBuffer
                }]
            });

            console.log(`✅ Orçamento ${orcamento.numero} enviado via SMTP para ${emailDestino}`);

            await Orcamento.updateOne(
                { _id: orcamento._id },
                {
                    $set: { status: 'enviado', dataEnvio: new Date() },
                    $push: {
                        emailsEnviados: {
                            para: emailDestino,
                            assunto: `Orçamento ${orcamento.numero} - FestLift - Elevadores e Serviços, Lda.`,
                            data: new Date(),
                            sucesso: true
                        }
                    }
                }
            );

            return res.json({
                success: true,
                message: 'Orçamento enviado com sucesso via SMTP',
                data: orcamento
            });
        } catch (smtpError) {
            console.error('❌ Erro SMTP:', smtpError.message);

            await Orcamento.updateOne(
                { _id: orcamento._id },
                {
                    $push: {
                        emailsEnviados: {
                            para: emailDestino,
                            assunto: `Orçamento ${orcamento.numero} - FestLift`,
                            data: new Date(),
                            sucesso: false,
                            erro: smtpError.message
                        }
                    }
                }
            );

            return res.status(500).json({
                success: false,
                message: `Erro ao enviar email via SMTP: ${smtpError.message}`,
                error: smtpError.message
            });
        }
    } catch (error) {
        console.error('Erro ao enviar orçamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar orçamento',
            error: error.message
        });
    }
});

// PATCH /api/orcamentos/:id/status - Mudar status (admin/dispatcher)
router.patch('/:id/status', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const { status, observacao } = req.body;
        const allowedStatuses = ['rascunho', 'enviado', 'aprovado', 'rejeitado', 'expirado'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status inválido. Use: ${allowedStatuses.join(', ')}`
            });
        }

        const orcamento = await Orcamento.findById(req.params.id);
        if (!orcamento) {
            return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        }

        orcamento.status = status;
        if (['aprovado', 'rejeitado'].includes(status)) {
            orcamento.dataResposta = new Date();
            orcamento.aprovadoPor = req.user.role;
            orcamento.aprovadoPorUser = req.user.id;
        }
        if (observacao) orcamento.observacao = observacao;
        await orcamento.save({ validateModifiedOnly: true });

        const msg = {
            aprovado:  'Orçamento aprovado com sucesso',
            rejeitado: 'Orçamento rejeitado',
            enviado:   'Orçamento marcado como enviado',
            rascunho:  'Orçamento revertido para rascunho',
            expirado:  'Orçamento marcado como expirado'
        }[status] || `Status alterado para '${status}'`;

        res.json({ success: true, message: msg, data: orcamento });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar status', error: error.message });
    }
});

// POST /api/orcamentos/:id/archive - Arquivar orçamento (admin/dispatcher)
router.post('/:id/archive', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id);
        if (!orcamento) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        orcamento.archived = true;
        orcamento.archivedAt = new Date();
        orcamento.archivedBy = req.user.username || req.user.email || req.user.id;
        await orcamento.save();
        res.json({ success: true, message: 'Orçamento arquivado com sucesso' });
    } catch (error) {
        console.error('Erro ao arquivar orçamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao arquivar', error: error.message });
    }
});

// POST /api/orcamentos/:id/unarchive - Restaurar do arquivo (somente admin)
router.post('/:id/unarchive', authenticate, authorizeRoles('admin'), async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id);
        if (!orcamento) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        orcamento.archived = false;
        orcamento.archivedAt = undefined;
        orcamento.archivedBy = undefined;
        await orcamento.save();
        res.json({ success: true, message: 'Orçamento restaurado do arquivo' });
    } catch (error) {
        console.error('Erro ao restaurar orçamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao restaurar', error: error.message });
    }
});

// PATCH /api/orcamentos/:id/link-lift - Vincular/desvincular orçamento a um elevador
router.patch('/:id/link-lift', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id);
        if (!orcamento) {
            return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        }

        const { liftId, liftIds } = req.body;
        const requestedLiftIds = Array.isArray(liftIds)
            ? liftIds.filter(Boolean).map(String)
            : (liftId ? [String(liftId)] : []);

        if (!requestedLiftIds.length) {
            // Desvincular
            orcamento.liftId = null;
            orcamento.lifts = [];
            orcamento.liftAddress = null;
            await orcamento.save();
            return res.json({ success: true, message: 'Orçamento desvinculado do elevador', liftId: null, lifts: [], liftAddress: null });
        }

        // Buscar dados dos lifts
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

        // Persist both legacy single-lift field and new multi-lift array.
        orcamento.liftId = primaryLift._id;
        orcamento.lifts = liftsPayload;
        orcamento.liftAddress = liftAddress || null;
        await orcamento.save();

        console.log(`🔗 Orçamento ${orcamento.numero} vinculado a ${orderedLifts.length} elevador(es)`);

        res.json({
            success: true,
            message: orderedLifts.length > 1
                ? `Orçamento vinculado a ${orderedLifts.length} elevadores`
                : `Orçamento vinculado ao elevador ${primaryLift.municipalNumber || ''}`,
            liftId: primaryLift._id,
            liftIds: orderedLifts.map(l => l._id),
            lifts: liftsPayload,
            liftAddress,
            municipalNumber: primaryLift.municipalNumber || null
        });
    } catch (error) {
        console.error('Erro ao vincular orçamento a elevador:', error);
        res.status(500).json({ success: false, message: 'Erro ao vincular', error: error.message });
    }
});

// POST /api/orcamentos/:id/fotos — upload de fotos
router.post('/:id/fotos', authenticate, authorizeRoles('admin', 'dispatcher'), uploadOrcFoto.array('fotos', 20), async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id);
        if (!orcamento) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'Nenhum ficheiro enviado' });

        // Converter cada foto para WebP com sharp (qualidade 82, máx 1920px)
        const dir = path.join(__dirname, '../../uploads/orcamentos', req.params.id);
        await fsPromises.mkdir(dir, { recursive: true });

        const novos = [];
        for (const f of req.files) {
            const suffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
            const filename = suffix + '.webp';
            const destPath = path.join(dir, filename);
            await sharp(f.buffer)
                .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 82 })
                .toFile(destPath);
            novos.push(`/uploads/orcamentos/${req.params.id}/${filename}`);
        }

        orcamento.fotos = [...(orcamento.fotos || []), ...novos];
        await orcamento.save();

        res.json({ success: true, fotos: orcamento.fotos, novasFotos: novos });
    } catch (error) {
        console.error('Erro ao guardar fotos:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/orcamentos/:id/fotos/:index — remover uma foto
router.delete('/:id/fotos/:index', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id);
        if (!orcamento) return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });

        const idx = parseInt(req.params.index, 10);
        if (isNaN(idx) || idx < 0 || idx >= orcamento.fotos.length) {
            return res.status(400).json({ success: false, message: 'Índice de foto inválido' });
        }

        const fotoPath = orcamento.fotos[idx];
        orcamento.fotos.splice(idx, 1);
        await orcamento.save();

        // Apagar ficheiro do disco
        const fullPath = path.join(__dirname, '../..', fotoPath);
        fsPromises.unlink(fullPath).catch(() => {});

        res.json({ success: true, fotos: orcamento.fotos });
    } catch (error) {
        console.error('Erro ao remover foto:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
