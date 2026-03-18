const express = require('express');
const router = express.Router();
const Orcamento = require('../../models/Orcamento');
require('../models/User'); // ensure User schema is registered for populate()
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

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
            if (orcamento.notas) {
                doc.moveDown(2);
                doc.fontSize(10).font('Helvetica-Bold').text('Notas:', 50, doc.y);
                doc.font('Helvetica').text(orcamento.notas, 50, doc.y + 5, { width: 500 });
            }
            
            // Dados Bancários para pagamento
            doc.moveDown(2);
            doc.fontSize(10).font('Helvetica-Bold').text('Dados Bancários / Pagamento:', 50, doc.y);
            doc.moveTo(50, doc.y + 3).lineTo(380, doc.y + 3).stroke();
            doc.moveDown(0.5);
            doc.fontSize(9).font('Helvetica');
            doc.text(`IBAN: ${process.env.COMPANY_IBAN || 'PT50 0010 0000 5854 8320 0015 4'}`, 50, doc.y);
            doc.text(`BIC/SWIFT: ${process.env.COMPANY_BIC || 'BBPIPTPL'}`, 50, doc.y + 5);
            doc.text(`Banco: ${process.env.COMPANY_BANK || 'Banco BPI'}`, 50, doc.y + 5);
            doc.text(`Titular: ${process.env.COMPANY_ACCOUNT_HOLDER || 'FestLift - Elevadores e Serviços, Lda.'}`, 50, doc.y + 5);

            // Rodapé
            doc.fontSize(8).font('Helvetica');
            const footerY = 750;
            doc.text('FestLift - Elevadores e Serviços, Lda. | NIF: 515924741', 50, footerY, { align: 'center', width: 500 });
            doc.text('NIF: 515924741 | Email: info@festlift.pt | Tel: +351 214 190 863 | Móvel: +351 926 380 243/244', 50, footerY + 12, { align: 'center', width: 500 });
            doc.text('Av. do Parque 84B, Rio de Mouro, Lisboa 2635-609', 50, footerY + 24, { align: 'center', width: 500 });
            
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
router.get('/my', authenticate, async (req, res) => {
    try {
        const clienteEmail = req.user.email;
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
        if (observacao) orcamento.notas = (orcamento.notas ? orcamento.notas + '\n\n' : '') + `Resposta do cliente: ${observacao}`;
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
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search } = req.query;
        
        const query = {};
        
        // Фільтр по статусу
        if (status) {
            query.status = status;
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

// GET /api/orcamentos/next-number - Obter próximo número disponível
router.get('/next-number', authenticate, async (req, res) => {
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

// GET /api/orcamentos/:id - Detalhe do orçamento
router.get('/:id', authenticate, async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id)
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
        console.error('Erro ao buscar orçamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar orçamento',
            error: error.message
        });
    }
});

// POST /api/orcamentos - Criar novo orçamento
router.post('/', authenticate, async (req, res) => {
    try {
        const { cliente, servicos, subtotal, iva, total, notas } = req.body;
        
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
            status: 'rascunho'
        });
        
        await orcamento.save();
        
        res.status(201).json({
            success: true,
            message: 'Orçamento criado com sucesso',
            data: orcamento
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

// PUT /api/orcamentos/:id - Atualizar orçamento
router.put('/:id', authenticate, async (req, res) => {
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
        
        const { cliente, servicos, subtotal, iva, total, notas, status, numero, data } = req.body;
        
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

// DELETE /api/orcamentos/:id - Deletar orçamento
router.delete('/:id', authenticate, async (req, res) => {
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

// POST /api/orcamentos/:id/enviar - Enviar orçamento por email
router.post('/:id/enviar', authenticate, async (req, res) => {
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

            // Gerar HTML do orçamento
            let servicosHTML = '<table style="width: 100%; border-collapse: collapse;"><tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descrição</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Quantidade</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Preço Unit.</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th></tr>';
            
            orcamento.servicos.forEach(s => {
                servicosHTML += `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${s.descricao}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${s.quantidade}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€${s.precoUnitario.toFixed(2)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€${(s.quantidade * s.precoUnitario).toFixed(2)}</td>
                    </tr>
                `;
            });
            servicosHTML += '</table>';

            const validadeDate = new Date(orcamento.validadeAte);
            const validadeFormatted = validadeDate.toLocaleDateString('pt-PT', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });

            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                to: orcamento.cliente.email,
                subject: `Orçamento ${orcamento.numero} - FestLift - Elevadores e Serviços, Lda.`,
                text: `Orçamento ${orcamento.numero}\nCliente: ${orcamento.cliente.nome}\nTotal: €${orcamento.total.toFixed(2)}\nValidade: ${validadeFormatted}\n\nO PDF está anexado a este email.`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">FestLift</h1>
                            <p style="margin: 10px 0 0 0; font-size: 14px;">Manutenção de Elevadores</p>
                        </div>
                        
                        <div style="padding: 30px;">
                            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                                Orçamento ${orcamento.numero}
                            </h2>
                            
                            <div style="margin: 20px 0;">
                                <p><strong>Cliente:</strong> ${orcamento.cliente.nome}</p>
                                <p><strong>Email:</strong> ${orcamento.cliente.email}</p>
                                ${orcamento.cliente.morada ? `<p><strong>Morada:</strong> ${orcamento.cliente.morada}</p>` : ''}
                            </div>

                            <div style="margin: 20px 0;">
                                <p><strong>Data:</strong> ${new Date(orcamento.data).toLocaleDateString('pt-PT')}</p>
                                <p><strong>Validade:</strong> ${validadeFormatted}</p>
                            </div>

                            <h3 style="color: #667eea; margin-top: 30px;">Serviços</h3>
                            ${servicosHTML}

                            <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                                <table style="width: 100%; font-size: 16px;">
                                    <tr>
                                        <td style="text-align: right; padding: 5px;"><strong>Subtotal:</strong></td>
                                        <td style="text-align: right; padding: 5px; width: 120px;">€${orcamento.subtotal.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right; padding: 5px;"><strong>IVA (23%):</strong></td>
                                        <td style="text-align: right; padding: 5px;">€${orcamento.iva.toFixed(2)}</td>
                                    </tr>
                                    <tr style="border-top: 2px solid #667eea;">
                                        <td style="text-align: right; padding: 10px 5px 5px 5px;"><strong style="font-size: 18px; color: #667eea;">TOTAL:</strong></td>
                                        <td style="text-align: right; padding: 10px 5px 5px 5px;"><strong style="font-size: 18px; color: #667eea;">€${orcamento.total.toFixed(2)}</strong></td>
                                    </tr>
                                </table>
                            </div>

                            ${orcamento.notas ? `
                                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                                    <strong>Notas:</strong><br>
                                    ${orcamento.notas}
                                </div>
                            ` : ''}

                            <div style="margin-top: 30px; padding: 20px; background: #e7f3ff; border-radius: 8px; text-align: center;">
                                <p style="margin: 0 0 15px 0; color: #0066cc;">
                                    <strong>Este orçamento é válido até ${validadeFormatted}</strong>
                                </p>
                                <p style="margin: 10px 0 0 0; font-size: 14px; color: #333;">
                                    📎 O orçamento em PDF está anexado a este email
                                </p>
                            </div>
                        </div>

                        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
                            <p style="margin: 5px 0; font-size: 14px; color: #666;">
                                <strong>FestLift - Elevadores e Serviços, Lda.</strong><br>
                                Email: info@festlift.pt | Tel: +351 214 190 863<br>
                                <small>Este orçamento foi gerado automaticamente.</small>
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
                    const viewToken = generatePublicAccessToken(orcamento._id);
                    const publicPdfUrl = buildPublicPdfUrl(req, orcamento._id, viewToken);
                    const validadeDate = new Date(orcamento.validadeAte);
                    const validadeFormatted = validadeDate.toLocaleDateString('pt-PT', { 
                        day: '2-digit', month: '2-digit', year: 'numeric' 
                    });
                    
                    // Gerar HTML com mesmo template rico do Brevo API
                    let servicosHTML = '<table style="width: 100%; border-collapse: collapse;"><tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descrição</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Quantidade</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Preço Unit.</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th></tr>';
                    orcamento.servicos.forEach(s => {
                        servicosHTML += `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">${s.descricao}</td>
                                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${s.quantidade}</td>
                                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€${s.precoUnitario.toFixed(2)}</td>
                                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€${(s.quantidade * s.precoUnitario).toFixed(2)}</td>
                            </tr>
                        `;
                    });
                    servicosHTML += '</table>';
                    
                    const emailHTML = `
                        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                                <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">FestLift</h1>
                                <p style="margin: 10px 0 0 0; font-size: 14px;">Manutenção de Elevadores</p>
                            </div>
                            
                            <div style="padding: 30px;">
                                <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                                    📄 Orçamento ${orcamento.numero}
                                </h2>
                                
                                <div style="margin: 20px 0;">
                                    <p><strong>Cliente:</strong> ${orcamento.cliente.nome}</p>
                                    <p><strong>Email:</strong> ${orcamento.cliente.email}</p>
                                    ${orcamento.cliente.morada ? `<p><strong>Morada:</strong> ${orcamento.cliente.morada}</p>` : ''}
                                </div>

                                <div style="margin: 20px 0;">
                                    <p><strong>Data:</strong> ${new Date(orcamento.data).toLocaleDateString('pt-PT')}</p>
                                    <p><strong>Validade:</strong> ${validadeFormatted}</p>
                                </div>

                                <h3 style="color: #667eea; margin-top: 30px;">Serviços</h3>
                                ${servicosHTML}

                                <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                                    <table style="width: 100%; font-size: 16px;">
                                        <tr>
                                            <td style="text-align: right; padding: 5px;"><strong>Subtotal:</strong></td>
                                            <td style="text-align: right; padding: 5px; width: 120px;">€${orcamento.subtotal.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style="text-align: right; padding: 5px;"><strong>IVA (23%):</strong></td>
                                            <td style="text-align: right; padding: 5px;">€${orcamento.iva.toFixed(2)}</td>
                                        </tr>
                                        <tr style="border-top: 2px solid #667eea;">
                                            <td style="text-align: right; padding: 10px 5px 5px 5px;"><strong style="font-size: 18px; color: #667eea;">TOTAL:</strong></td>
                                            <td style="text-align: right; padding: 10px 5px 5px 5px;"><strong style="font-size: 18px; color: #667eea;">€${orcamento.total.toFixed(2)}</strong></td>
                                        </tr>
                                    </table>
                                </div>

                                ${orcamento.notas ? `
                                    <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                                        <strong>Notas:</strong><br>
                                        ${orcamento.notas}
                                    </div>
                                ` : ''}

                                <div style="margin-top: 30px; padding: 20px; background: #e7f3ff; border-radius: 8px; text-align: center;">
                                    <p style="margin: 0 0 15px 0; color: #0066cc;">
                                        <strong>Este orçamento é válido até ${validadeFormatted}</strong>
                                    </p>
                                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #333;">
                                        📎 O orçamento em PDF está anexado a este email
                                    </p>
                                </div>
                            </div>

                            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
                                <p style="margin: 5px 0; font-size: 14px; color: #666;">
                                    <strong>FestLift - Elevadores e Serviços, Lda.</strong><br>
                                    Email: info@festlift.pt | Tel: +351 214 190 863<br>
                                    <small>Este orçamento foi gerado automaticamente.</small>
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

// GET /api/orcamentos/stats - Estatísticas
router.get('/stats/dashboard', authenticate, async (req, res) => {
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
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas',
            error: error.message
        });
    }
});

// PATCH /api/orcamentos/:id/status - Mudar status (aprovar / rejeitar)
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        const allowedTransitions = ['aprovado', 'rejeitado'];

        if (!allowedTransitions.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status inválido. Use: ${allowedTransitions.join(', ')}`
            });
        }

        const orcamento = await Orcamento.findById(req.params.id);
        if (!orcamento) {
            return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        }

        if (orcamento.status !== 'enviado') {
            return res.status(400).json({
                success: false,
                message: `Apenas orçamentos com status 'enviado' podem ser aprovados ou rejeitados (atual: '${orcamento.status}')`
            });
        }

        orcamento.status = status;
        orcamento.dataResposta = new Date();
        await orcamento.save();

        res.json({
            success: true,
            message: `Orçamento ${status} com sucesso`,
            data: orcamento
        });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar status', error: error.message });
    }
});

module.exports = router;
