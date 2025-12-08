const express = require('express');
const router = express.Router();
const Orcamento = require('../../models/Orcamento');
const auth = require('../middleware/auth');

// GET /api/orcamentos - Список всіх орçаментів
router.get('/', auth, async (req, res) => {
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

// GET /api/orcamentos/:id - Detalhe do orçamento
router.get('/:id', auth, async (req, res) => {
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
router.post('/', auth, async (req, res) => {
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
        
        // Criar orçamento
        const orcamento = new Orcamento({
            numero,
            data: new Date(),
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
router.put('/:id', auth, async (req, res) => {
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
        
        const { cliente, servicos, subtotal, iva, total, notas, status } = req.body;
        
        if (cliente) orcamento.cliente = cliente;
        if (servicos) orcamento.servicos = servicos;
        if (subtotal !== undefined) orcamento.subtotal = subtotal;
        if (iva !== undefined) orcamento.iva = iva;
        if (total !== undefined) orcamento.total = total;
        if (notas) orcamento.notas = notas;
        if (status) orcamento.status = status;
        
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
router.delete('/:id', auth, async (req, res) => {
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
router.post('/:id/enviar', auth, async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id);
        
        if (!orcamento) {
            return res.status(404).json({
                success: false,
                message: 'Orçamento não encontrado'
            });
        }
        
        // ✅ Enviar por email via Brevo SMTP
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

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
            from: process.env.EMAIL_FROM,
            to: orcamento.cliente.email,
            subject: `Orçamento ${orcamento.numero} - FESTLIFT, LDA`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">FESTLIFT, LDA</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Manutenção de Elevadores</p>
                    </div>
                    
                    <div style="padding: 30px;">
                        <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                            Orçamento ${orcamento.numero}
                        </h2>
                        
                        <div style="margin: 20px 0;">
                            <p><strong>Cliente:</strong> ${orcamento.cliente.nome}</p>
                            <p><strong>Email:</strong> ${orcamento.cliente.email}</p>
                            ${orcamento.cliente.telefone ? `<p><strong>Telefone:</strong> ${orcamento.cliente.telefone}</p>` : ''}
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
                            <p style="margin: 0; color: #0066cc;">
                                <strong>Este orçamento é válido até ${validadeFormatted}</strong>
                            </p>
                        </div>
                    </div>

                    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
                        <p style="margin: 5px 0; font-size: 14px; color: #666;">
                            <strong>FESTLIFT, LDA - Manutenção de Elevadores</strong><br>
                            Email: info@festlift.pt | Tel: +351 XXX XXX XXX<br>
                            <small>Este orçamento foi gerado automaticamente.</small>
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        // Atualizar status do orçamento
        orcamento.status = 'enviado';
        orcamento.dataEnvio = new Date();
        orcamento.emailsEnviados.push({
            para: orcamento.cliente.email,
            assunto: `Orçamento ${orcamento.numero} - FESTLIFT, LDA`,
            data: new Date(),
            enviadoPor: req.user.userId,
            sucesso: true
        });
        
        await orcamento.save();
        
        console.log(`✅ Orçamento ${orcamento.numero} enviado para ${orcamento.cliente.email}`);
        
        res.json({
            success: true,
            message: 'Orçamento enviado com sucesso',
            data: orcamento
        });
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
router.get('/stats/dashboard', auth, async (req, res) => {
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

module.exports = router;
