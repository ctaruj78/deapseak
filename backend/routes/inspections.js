const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');

// POST /api/inspections/send-report - Enviar relatório por email
router.post('/send-report', auth, async (req, res) => {
    try {
        const {
            inspectionNumber,
            inspectionDate,
            inspector,
            liftLocation,
            liftModel,
            liftSerial,
            checklist,
            generalComments,
            recommendations,
            recipientEmail
        } = req.body;

        // Validação
        if (!recipientEmail || !inspectionNumber) {
            return res.status(400).json({
                success: false,
                message: 'Email e número da manutenção são obrigatórios'
            });
        }

        // Configurar transporter Brevo SMTP
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Gerar HTML do checklist
        let checklistHTML = '';
        
        // Organizar checklist por categorias
        const categories = {
            'Sistemas de Segurança': [],
            'Sistemas Mecânicos': [],
            'Sistemas Elétricos': [],
            'Lubrificação': [],
            'Limpeza e Geral': [],
            'Documentação': []
        };

        // Se checklist for objeto (não array), converter
        if (checklist && typeof checklist === 'object') {
            Object.entries(checklist).forEach(([key, value]) => {
                if (value.status && value.status !== '') {
                    // Tentar determinar categoria pelo nome do item
                    let itemName = key.replace(/-/g, ' ').replace(/_/g, ' ');
                    itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
                    
                    let statusIcon = '';
                    let statusColor = '';
                    
                    switch(value.status) {
                        case 'ok':
                            statusIcon = '✓';
                            statusColor = '#28a745';
                            break;
                        case 'warning':
                            statusIcon = '⚠';
                            statusColor = '#ffc107';
                            break;
                        case 'error':
                            statusIcon = '✗';
                            statusColor = '#dc3545';
                            break;
                        case 'na':
                            statusIcon = 'N/A';
                            statusColor = '#6c757d';
                            break;
                    }
                    
                    const itemHTML = `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;">
                                <span style="color: ${statusColor}; font-weight: bold;">${statusIcon}</span> ${itemName}
                            </td>
                            <td style="padding: 8px; border: 1px solid #ddd;">
                                ${value.comment || '-'}
                            </td>
                        </tr>
                    `;
                    
                    // Adicionar à primeira categoria (simplificado)
                    if (!checklistHTML) {
                        checklistHTML = '<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">';
                        checklistHTML += '<tr><th style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; text-align: left;">Item</th><th style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; text-align: left;">Observações</th></tr>';
                    }
                    checklistHTML += itemHTML;
                }
            });
            
            if (checklistHTML) {
                checklistHTML += '</table>';
            } else {
                checklistHTML = '<p style="color: #666;"><em>Nenhum item verificado</em></p>';
            }
        }

        // Formatar data
        const dataFormatted = inspectionDate ? new Date(inspectionDate).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) : 'Não especificada';

        // Email HTML
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'DeapSeaK System <noreply@deapseak.com>',
            to: recipientEmail,
            subject: `Relatório de Manutenção ${inspectionNumber} - FESTLIFT`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">FESTLIFT, LDA</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Manutenção de Elevadores</p>
                    </div>
                    
                    <div style="padding: 30px;">
                        <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                            📋 Relatório de Manutenção Mensal
                        </h2>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; width: 40%;">Nº da Manutenção:</td>
                                    <td style="padding: 8px 0;">${inspectionNumber}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Data:</td>
                                    <td style="padding: 8px 0;">${dataFormatted}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Técnico Responsável:</td>
                                    <td style="padding: 8px 0;">${inspector || 'Não especificado'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Localização:</td>
                                    <td style="padding: 8px 0;">${liftLocation || 'Não especificada'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Modelo:</td>
                                    <td style="padding: 8px 0;">${liftModel || 'Não especificado'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Número de Série:</td>
                                    <td style="padding: 8px 0;">${liftSerial || 'Não especificado'}</td>
                                </tr>
                            </table>
                        </div>

                        <h3 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
                            Resultados da Verificação
                        </h3>
                        ${checklistHTML}

                        ${generalComments ? `
                            <h3 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
                                Observações Gerais
                            </h3>
                            <p style="background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 10px 0;">
                                ${generalComments}
                            </p>
                        ` : ''}

                        ${recommendations ? `
                            <h3 style="color: #333; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
                                Recomendações
                            </h3>
                            <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 10px 0;">
                                ${recommendations}
                            </p>
                        ` : ''}
                    </div>

                    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
                        <p style="margin: 0; font-size: 12px; color: #666;">
                            Este é um email automático gerado pelo sistema FESTLIFT.<br>
                            Para mais informações, contacte-nos através do nosso sistema.
                        </p>
                        <p style="margin: 10px 0 0 0; font-size: 11px; color: #999;">
                            © ${new Date().getFullYear()} FESTLIFT, LDA - Todos os direitos reservados
                        </p>
                    </div>
                </div>
            `
        };

        // Enviar email
        await transporter.sendMail(mailOptions);

        console.log(`✅ Relatório de manutenção ${inspectionNumber} enviado para ${recipientEmail}`);

        res.json({
            success: true,
            message: `Relatório enviado com sucesso para ${recipientEmail}`
        });

    } catch (error) {
        console.error('❌ Erro ao enviar relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar relatório por email',
            error: error.message
        });
    }
});

module.exports = router;
