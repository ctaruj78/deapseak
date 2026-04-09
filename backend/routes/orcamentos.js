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

// Multer para fotos de orçamentos
const orcamentoFotoStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/orcamentos', req.params.id);
        await fsPromises.mkdir(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const suffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, suffix + path.extname(file.originalname));
    }
});
const uploadOrcFoto = multer({
    storage: orcamentoFotoStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Apenas imagens JPG, PNG, WEBP, GIF são aceites'));
    }
});

// Tentar encontrar lift pela morada do cliente
async function detectarLiftPorMorada(morada) {
    if (!morada) return null;
    try {
        const db = mongoose.connection.db;
        const moradaNorm = morada.toLowerCase().trim();
        const lifts = await db.collection('lifts').find({}).toArray();
        for (const lift of lifts) {
            const addr = lift.address || {};
            const parts = [addr.street, addr.zipCode, addr.city].filter(Boolean);
            const addrStr = (typeof addr === 'string' ? addr : parts.join(', ')).toLowerCase();
            if (addrStr && moradaNorm.includes(addrStr.split(',')[0].trim()) || addrStr.includes(moradaNorm.split(',')[0].trim())) {
                return {
                    liftId: lift._id,
                    liftAddress: typeof addr === 'string' ? addr : parts.join(', ')
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
    return new Promise((resolve, reject) => {
        try {
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
            doc.fontSize(12).font('Helvetica-Bold').text('Serviços:', 50, doc.y);
            doc.moveDown(0.5);
            
            // Cabeçalho da tabela
            const tableTop = doc.y;
            const col1 = 50;
            const col2 = 300;
            const col3 = 380;
            const col4 = 480;
            
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Descrição', col1, tableTop);
            doc.text('Qtd', col2, tableTop, { width: 70, align: 'right' });
            doc.text('Preço', col3, tableTop, { width: 90, align: 'right' });
            doc.text('Total', col4, tableTop, { width: 70, align: 'right' });
            
            // Linha abaixo do cabeçalho
            doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();
            
            // Linhas da tabela
            let yPos = tableTop + 25;
            doc.font('Helvetica');
            
            orcamento.servicos.forEach((servico) => {
                if (yPos > 700) { // Nova página se necessário
                    doc.addPage();
                    yPos = 50;
                }
                
                doc.text(servico.descricao, col1, yPos, { width: 240 });
                doc.text(servico.quantidade.toString(), col2, yPos, { width: 70, align: 'right' });
                doc.text(`€${servico.precoUnitario.toFixed(2)}`, col3, yPos, { width: 90, align: 'right' });
                doc.text(`€${servico.total.toFixed(2)}`, col4, yPos, { width: 70, align: 'right' });
                
                yPos += 25;
            });
            
            // Linha antes dos totais
            doc.moveTo(col1, yPos).lineTo(550, yPos).stroke();
            yPos += 15;
            
            // Totais
            doc.fontSize(11).font('Helvetica-Bold');
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
                doc.fontSize(10).font('Helvetica-Bold').text('Notas:', 50, yPos);
                yPos += 15;
                doc.font('Helvetica').fontSize(9).text(orcamento.notas, 50, yPos, { width: 500 });
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
                    // Construímos caminho absoluto a partir de uploads/ na raiz do projecto
                    const absPath = path.join(__dirname, '../..', fotoPath.startsWith('/') ? fotoPath : '/' + fotoPath);
                    if (!fs.existsSync(absPath)) continue;
                    try {
                        const x = col === 0 ? 50 : 50 + imgW + gap;
                        if (yPos + imgH > 780) { doc.addPage(); yPos = 50; col = 0; }
                        doc.image(absPath, x, yPos, { width: imgW, height: imgH, fit: [imgW, imgH] });
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

// GET /api/orcamentos - Список всіх орçаментів
router.get('/', authenticate, authorizeRoles('admin', 'dispatcher'), async (req, res) => {
    try {
        // Auto-expirar todos os orçamentos vencidos antes de listar
        await autoExpirarOrcamentos();

        const { status, page = 1, limit = 20, search } = req.query;
        
        const query = {};
        
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
        
        // Пошук по клієнту або номеру
        if (search) {
            query.$or = [
                { numero: new RegExp(search, 'i') },
                { 'cliente.nome': new RegExp(search, 'i') },
                { 'cliente.email': new RegExp(search, 'i') }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const orcamentos = await Orcamento.find(query)
            .populate('criadoPor', 'name email')
            .sort({ data: -1 })
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
        res.setHeader('Content-Disposition', `attachment; filename="Orcamento_${orcamento.numero}.pdf"`);
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
        
        // Não permitir editar se já aprovado
        if (orcamento.status === 'aprovado') {
            return res.status(400).json({
                success: false,
                message: 'Orçamento aprovado não pode ser editado'
            });
        }
        
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
        
        await orcamento.save();
        
        res.json({
            success: true,
            message: 'Orçamento atualizado com sucesso',
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
        
        // Отримати email з body або використати з орçаменту
        const emailDestino = req.body.email || orcamento.cliente.email;
        
        console.log(`📧 Enviando orçamento ${orcamento.numero} para ${emailDestino}`);
        
        // ✅ Usar Brevo API (замість SMTP)
        const brevoKey = process.env.BREVO_API_KEY || '';
        const brevoKeyValid = brevoKey && !brevoKey.includes('YOUR-API-KEY') && brevoKey.startsWith('xkeysib-');
        if (!brevoKeyValid) {
            console.warn('⚠️ BREVO_API_KEY não configurado ou é um placeholder');
            
            // Modo desenvolvimento - apenas logging
            orcamento.status = 'enviado';
            orcamento.dataEnvio = new Date();
            orcamento.emailsEnviados.push({
                para: emailDestino,
                assunto: `Orçamento ${orcamento.numero} - FestLift - Elevadores e Serviços, Lda.`,
                data: new Date(),
                sucesso: false,
                erro: 'BREVO_API_KEY não configurado'
            });
            await orcamento.save();
            
            return res.json({
                success: true,
                message: 'Orçamento marcado como enviado (modo desenvolvimento)',
                data: orcamento,
                warning: 'Email não foi enviado - API não configurada'
            });
        }
        
        try {
            // Gerar token de acesso público para o orçamento
            const viewToken = generatePublicAccessToken(orcamento._id);
            const publicPdfUrl = buildPublicPdfUrl(req, orcamento._id, viewToken);
            
            console.log(`🔐 Token gerado para ID ${orcamento._id}: ${viewToken}`);
            
            // Usar Brevo API v3
            const brevo = require('@getbrevo/brevo');
            const apiInstance = new brevo.TransactionalEmailsApi();
            
            // Configurar API Key
            apiInstance.setApiKey(
                brevo.TransactionalEmailsApiApiKeys.apiKey,
                process.env.BREVO_API_KEY
            );
            
            // Parse EMAIL_FROM для правильного sender
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

            const validadeDate = new Date(orcamento.validadeAte);
            const validadeFormatted = validadeDate.toLocaleDateString('pt-PT', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });

            // Nota: O corpo do email é intencionalmente simples (carta de apresentação).
            // Os detalhes completos do orçamento constam APENAS no PDF em anexo.
            // Isto evita que clientes com Apple Mail / macOS vejam o conteúdo duplicado
            // (o macOS Mail renderiza o HTML inline e mostra também o PDF em anexo,
            //  dando a impressão de dois documentos idênticos).
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                to: orcamento.cliente.email,
                subject: `Orçamento ${orcamento.numero} - FestLift - Elevadores e Serviços, Lda.`,
                text: `Caro(a) ${orcamento.cliente.nome},\n\nEm anexo encontra o Orçamento ${orcamento.numero} no valor de €${orcamento.total.toFixed(2)} (IVA incluído), válido até ${validadeFormatted}.\n\nPara qualquer esclarecimento estamos ao dispor.\n\nCom os melhores cumprimentos,\nFestLift - Elevadores e Serviços, Lda.\ninfo@festlift.pt | +351 214 190 863`,
                html: `
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
                `
            };

            console.log('📄 Gerando PDF do orçamento...');
            const pdfBuffer = await gerarPDFOrcamento(orcamento);
            console.log(`✅ PDF gerado: ${pdfBuffer.length} bytes`);

            // Відправити через Brevo API
            const sendSmtpEmail = new brevo.SendSmtpEmail();
            sendSmtpEmail.sender = { 
                name: senderName, 
                email: senderEmail 
            };
            sendSmtpEmail.to = [{ 
                email: emailDestino, // Використати emailDestino замість orcamento.cliente.email
                name: orcamento.cliente.nome
            }];
            sendSmtpEmail.subject = mailOptions.subject;
            sendSmtpEmail.htmlContent = mailOptions.html;
            
            // Додати PDF як вкладення
            sendSmtpEmail.attachment = [{
                name: `Orcamento_${orcamento.numero}.pdf`,
                content: pdfBuffer.toString('base64')
            }];
            
            console.log('📧 Відправка через Brevo API:');
            console.log('   From:', JSON.stringify(sendSmtpEmail.sender));
            console.log('   To:', JSON.stringify(sendSmtpEmail.to));
            console.log('   Subject:', sendSmtpEmail.subject);
            console.log('   Attachment:', `Orcamento_${orcamento.numero}.pdf (${pdfBuffer.length} bytes)`);

            const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
            
            console.log(`✅ Orçamento ${orcamento.numero} enviado via Brevo API para ${emailDestino}`);
            console.log('   Message ID:', result.messageId);
            
            // Atualizar status do orçamento (usando updateOne щоб уникнути валідації)
            await Orcamento.updateOne(
                { _id: orcamento._id },
                {
                    $set: {
                        status: 'enviado',
                        dataEnvio: new Date()
                    },
                    $push: {
                        emailsEnviados: {
                            para: emailDestino,
                            assunto: `Orçamento ${orcamento.numero} - FestLift - Elevadores e Serviços, Lda.`,
                            data: new Date(),
                            sucesso: true,
                            messageId: result.messageId
                        }
                    }
                }
            );
            
            res.json({
                success: true,
                message: 'Orçamento enviado com sucesso via Brevo API',
                data: orcamento
            });
        } catch (apiError) {
            const brevoMsg = apiError.response?.body?.message || apiError.response?.text || apiError.message;
            const brevoCode = apiError.response?.body?.code || String(apiError.status || '');
            console.error(`❌ Erro Brevo API [${brevoCode}]: ${brevoMsg}`);
            if (apiError.status === 401 || brevoCode === 'unauthorized') {
                console.error('   ➡️ API key inválida — tentando SMTP como fallback...');
                
                // Fallback: tentar enviar via nodemailer SMTP
                try {
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
                    
                    const pdfBuffer = await gerarPDFOrcamento(orcamento);
                    console.log(`📄 PDF gerado para SMTP: ${pdfBuffer.length} bytes`);
                    const validadeDate = new Date(orcamento.validadeAte);
                    const validadeFormatted = validadeDate.toLocaleDateString('pt-PT', { 
                        day: '2-digit', month: '2-digit', year: 'numeric' 
                    });
                    
                    // Corpo simples — detalhes completos constam APENAS no PDF em anexo.
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
                    
                    await transporter.sendMail({
                        from: process.env.SMTP_FROM || process.env.SMTP_USER,
                        to: emailDestino,
                        subject: `Orçamento ${orcamento.numero} - FestLift - Elevadores e Serviços, Lda.`,
                        html: emailHTML,
                        attachments: [{
                            filename: `Orcamento_${orcamento.numero}.pdf`,
                            content: pdfBuffer
                        }]
                    });
                    
                    console.log(`✅ Email enviado via SMTP fallback com PDF anexado (${pdfBuffer.length} bytes)`);
                    await Orcamento.updateOne(
                        { _id: orcamento._id },
                        {
                            $set: { status: 'enviado', dataEnvio: new Date() },
                            $push: {
                                emailsEnviados: {
                                    para: emailDestino,
                                    assunto: `Orçamento ${orcamento.numero} - FestLift`,
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
                    console.error('❌ SMTP fallback também falhou:', smtpError.message);
                    // Se SMTP também falhou, marcar como enviado em dev mode
                    await Orcamento.updateOne(
                        { _id: orcamento._id },
                        {
                            $set: { status: 'enviado', dataEnvio: new Date() },
                            $push: {
                                emailsEnviados: {
                                    para: emailDestino,
                                    assunto: `Orçamento ${orcamento.numero} - FestLift`,
                                    data: new Date(),
                                    sucesso: false,
                                    erro: `API (401) e SMTP falharam: ${smtpError.message}`
                                }
                            }
                        }
                    );
                    return res.json({
                        success: true,
                        message: 'Orçamento marcado como enviado (modo desenvolvimento)',
                        data: orcamento,
                        warning: `API e SMTP falharam. Configure credenciais válidas.`
                    });
                }
            }
            console.error('   Detalhes completos:', apiError.response?.body || apiError.message);
            
            // Salvar log de erro (usando updateOne щоб уникнути валідації)
            await Orcamento.updateOne(
                { _id: orcamento._id },
                {
                    $push: {
                        emailsEnviados: {
                            para: emailDestino,
                            assunto: `Orçamento ${orcamento.numero} - FestLift - Elevadores e Serviços, Lda.`,
                            data: new Date(),
                            sucesso: false,
                            erro: apiError.message
                        }
                    }
                }
            );
            
            return res.status(500).json({
                success: false,
                message: `Erro ao enviar email: ${apiError.message}`,
                error: apiError.response?.body || apiError.message
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
        await orcamento.save();

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

        const { liftId } = req.body;

        if (!liftId) {
            // Desvincular
            orcamento.liftId = null;
            orcamento.liftAddress = null;
            await orcamento.save();
            return res.json({ success: true, message: 'Orçamento desvinculado do elevador', liftId: null, liftAddress: null });
        }

        // Buscar dados do lift
        const db = mongoose.connection.db;
        const { ObjectId } = mongoose.Types;
        let liftObjectId;
        try {
            liftObjectId = new ObjectId(liftId);
        } catch (e) {
            return res.status(400).json({ success: false, message: 'liftId inválido' });
        }

        const lift = await db.collection('lifts').findOne({ _id: liftObjectId });
        if (!lift) {
            return res.status(404).json({ success: false, message: 'Elevador não encontrado' });
        }

        const addr = lift.address || {};
        const liftAddress = typeof addr === 'string'
            ? addr
            : [addr.street, addr.zipCode, addr.city].filter(Boolean).join(', ');

        orcamento.liftId = liftObjectId;
        orcamento.liftAddress = liftAddress;
        await orcamento.save();

        console.log(`🔗 Orçamento ${orcamento.numero} vinculado ao elevador ${lift.municipalNumber || liftId}`);

        res.json({
            success: true,
            message: `Orçamento vinculado ao elevador ${lift.municipalNumber || ''}`,
            liftId: liftObjectId,
            liftAddress,
            municipalNumber: lift.municipalNumber || null
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

        const novos = req.files.map(f => `/uploads/orcamentos/${req.params.id}/${f.filename}`);
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
