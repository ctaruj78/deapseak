require('dotenv').config();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// SMTP транспортер
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Реалістичні дані orçamento
const orcamento = {
    numero: 'ORC-2026-001',
    data: new Date().toLocaleDateString('pt-PT'),
    validade: new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('pt-PT'),
    
    cliente: {
        nome: 'Condomínio Edifício Central',
        morada: 'Rua das Flores, 123, 4º Andar',
        cidade: 'Lisboa',
        postal: '1200-194',
        nif: '501234567',
        telefone: '+351 21 234 5678',
        email: 'ctaruj78@gmail.com'
    },
    
    elevador: {
        local: 'Edifício Central - Torre A',
        tipo: 'Passageiros',
        capacidade: '630 kg (8 pessoas)',
        pisos: '5 pisos + cave',
        matricula: 'LIS-2015-0842'
    },
    
    servicos: [
        {
            descricao: 'Modernização completa do sistema de controlo',
            detalhes: 'Substituição do controlador antigo por sistema moderno com variador de frequência',
            quantidade: 1,
            preco_unitario: 4500.00
        },
        {
            descricao: 'Substituição de cabos de tração',
            detalhes: 'Cabos de aço galvanizado Ø12mm, certificados CE',
            quantidade: 6,
            preco_unitario: 280.00
        },
        {
            descricao: 'Renovação de portas de piso',
            detalhes: 'Portas automáticas com sistema de segurança anti-esmagamento',
            quantidade: 6,
            preco_unitario: 850.00
        },
        {
            descricao: 'Sistema de iluminação LED',
            detalhes: 'Iluminação de emergência com bateria backup',
            quantidade: 1,
            preco_unitario: 320.00
        },
        {
            descricao: 'Manutenção preventiva anual',
            detalhes: 'Contrato de manutenção com 12 visitas/ano e assistência 24/7',
            quantidade: 1,
            preco_unitario: 1200.00
        }
    ],
    
    observacoes: `
• Prazo de execução: 15-20 dias úteis
• Garantia: 24 meses sobre todos os componentes instalados
• Certificação: Emissão de certificado de conformidade CE
• Inspeção: Coordenação com entidade inspetora para certificação final
• Trabalhos executados por técnicos certificados
• Inclui limpeza e remoção de entulho
    `.trim()
};

// Calcular totais
const subtotal = orcamento.servicos.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);
const iva = subtotal * 0.23; // IVA 23%
const total = subtotal + iva;

console.log('\n📄 Gerando PDF orçamento...\n');

// Criar PDF
const pdfPath = path.join(__dirname, 'uploads', `orcamento-${orcamento.numero}.pdf`);
const doc = new PDFDocument({ margin: 50, size: 'A4' });
const writeStream = fs.createWriteStream(pdfPath);
doc.pipe(writeStream);

// Header com logo e informações da empresa (REAL DATA)
doc.fontSize(24).fillColor('#2c3e50').text('FESTLIFT, LDA', 50, 50);
doc.fontSize(10).fillColor('#7f8c8d')
    .text('Manutenção e Reparação de Elevadores', 50, 80)
    .text('Av. do Parque 84B, Rio de Mouro, Lisboa 2635-609', 50, 95)
    .text('Tel: +351 214 190 863 | Móvel: +351 926 380 243/244', 50, 110)
    .text('Email: info@festlift.pt | NIF: 515924741', 50, 125);// Linha decorativa
doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#3498db').lineWidth(2).stroke();

// Título do documento
doc.fontSize(20).fillColor('#2c3e50').text('ORÇAMENTO', 50, 150);
doc.fontSize(10).fillColor('#7f8c8d')
   .text(`N.º ${orcamento.numero}`, 450, 150, { align: 'right' })
   .text(`Data: ${orcamento.data}`, 450, 165, { align: 'right' })
   .text(`Validade: ${orcamento.validade}`, 450, 180, { align: 'right' });

// Dados do cliente
doc.fontSize(12).fillColor('#2c3e50').text('CLIENTE', 50, 220);
doc.fontSize(10).fillColor('#34495e')
   .text(orcamento.cliente.nome, 50, 240)
   .text(orcamento.cliente.morada, 50, 255)
   .text(`${orcamento.cliente.postal} ${orcamento.cliente.cidade}`, 50, 270)
   .text(`NIF: ${orcamento.cliente.nif}`, 50, 285)
   .text(`Tel: ${orcamento.cliente.telefone}`, 50, 300);

// Dados do elevador
doc.fontSize(12).fillColor('#2c3e50').text('ELEVADOR', 320, 220);
doc.fontSize(10).fillColor('#34495e')
   .text(`Local: ${orcamento.elevador.local}`, 320, 240)
   .text(`Tipo: ${orcamento.elevador.tipo}`, 320, 255)
   .text(`Capacidade: ${orcamento.elevador.capacidade}`, 320, 270)
   .text(`Pisos: ${orcamento.elevador.pisos}`, 320, 285)
   .text(`Matrícula: ${orcamento.elevador.matricula}`, 320, 300);

// Tabela de serviços
let yPos = 340;
doc.fontSize(12).fillColor('#2c3e50').text('SERVIÇOS', 50, yPos);
yPos += 25;

// Cabeçalho da tabela
doc.fontSize(9).fillColor('#ffffff')
   .rect(50, yPos, 495, 20).fillAndStroke('#3498db', '#3498db');
doc.fillColor('#ffffff')
   .text('Descrição', 55, yPos + 5)
   .text('Qtd', 380, yPos + 5)
   .text('P. Unit.', 420, yPos + 5)
   .text('Total', 490, yPos + 5);

yPos += 25;

// Itens
orcamento.servicos.forEach((item, index) => {
    const itemTotal = item.quantidade * item.preco_unitario;
    
    // Linha zebrada
    if (index % 2 === 0) {
        doc.rect(50, yPos - 5, 495, 35).fillAndStroke('#ecf0f1', '#ecf0f1');
    }
    
    doc.fontSize(9).fillColor('#2c3e50')
       .text(item.descricao, 55, yPos, { width: 300 })
       .fontSize(8).fillColor('#7f8c8d')
       .text(item.detalhes, 55, yPos + 12, { width: 300 });
    
    doc.fontSize(9).fillColor('#2c3e50')
       .text(item.quantidade.toString(), 380, yPos)
       .text(`€${item.preco_unitario.toFixed(2)}`, 420, yPos)
       .text(`€${itemTotal.toFixed(2)}`, 480, yPos, { align: 'right' });
    
    yPos += 35;
});

// Totais
yPos += 10;
doc.fontSize(10).fillColor('#7f8c8d')
   .text('Subtotal:', 380, yPos)
   .text(`€${subtotal.toFixed(2)}`, 480, yPos, { align: 'right' });

yPos += 20;
doc.text('IVA (23%):', 380, yPos)
   .text(`€${iva.toFixed(2)}`, 480, yPos, { align: 'right' });

yPos += 20;
doc.fontSize(12).fillColor('#2c3e50')
   .text('TOTAL:', 380, yPos)
   .fontSize(14)
   .text(`€${total.toFixed(2)}`, 480, yPos, { align: 'right' });

// Observações
yPos += 40;
doc.fontSize(10).fillColor('#2c3e50').text('OBSERVAÇÕES:', 50, yPos);
yPos += 20;
doc.fontSize(9).fillColor('#34495e')
   .text(orcamento.observacoes, 50, yPos, { width: 495, align: 'left' });

// Footer
doc.fontSize(8).fillColor('#95a5a6')
   .text('Este orçamento é válido por 30 dias. Todos os valores incluem IVA à taxa legal em vigor.', 50, 750, { align: 'center', width: 495 })
   .text('FESTLIFT, LDA | NIF: 515924741 | Av. do Parque 84B, Rio de Mouro, Lisboa 2635-609', 50, 765, { align: 'center', width: 495 });

doc.end();

writeStream.on('finish', async () => {
    console.log('✅ PDF gerado:', pdfPath);
    console.log('\n📧 Enviando email...\n');
    
    // Email HTML
    const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #2c3e50; margin: 0 0 10px 0;">FESTLIFT</h1>
            <p style="color: #7f8c8d; margin: 0 0 30px 0;">Manutenção e Reparação de Elevadores</p>
            
            <h2 style="color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Orçamento N.º ${orcamento.numero}</h2>
            
            <p style="color: #34495e; line-height: 1.6;">
                Exmo(a) Sr(a),<br><br>
                Conforme solicitado, vimos apresentar o nosso orçamento para os trabalhos de modernização e manutenção do elevador 
                localizado em <strong>${orcamento.elevador.local}</strong>.
            </p>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">Resumo do Orçamento</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; color: #7f8c8d;">Subtotal:</td>
                        <td style="padding: 8px; text-align: right; color: #34495e;"><strong>€${subtotal.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; color: #7f8c8d;">IVA (23%):</td>
                        <td style="padding: 8px; text-align: right; color: #34495e;"><strong>€${iva.toFixed(2)}</strong></td>
                    </tr>
                    <tr style="border-top: 2px solid #bdc3c7;">
                        <td style="padding: 12px 8px; color: #2c3e50; font-size: 18px;"><strong>TOTAL:</strong></td>
                        <td style="padding: 12px 8px; text-align: right; color: #27ae60; font-size: 20px;"><strong>€${total.toFixed(2)}</strong></td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #34495e; line-height: 1.6;">
                <strong>📄 Documento em Anexo:</strong> Orçamento detalhado em formato PDF<br>
                <strong>📅 Validade:</strong> ${orcamento.validade}<br>
                <strong>⏱️ Prazo de Execução:</strong> 15-20 dias úteis<br>
                <strong>🛡️ Garantia:</strong> 24 meses
            </p>
            
            <div style="background-color: #d5f4e6; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #27ae60;">
                    <strong>✅ Todos os trabalhos certificados</strong><br>
                    <span style="color: #34495e; font-size: 14px;">Técnicos certificados e emissão de certificado de conformidade CE</span>
                </p>
            </div>
            
            <p style="color: #34495e; line-height: 1.6;">
                Ficamos ao dispor para qualquer esclarecimento adicional.<br><br>
                Com os melhores cumprimentos,
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
                <p style="color: #7f8c8d; font-size: 12px; line-height: 1.6; margin: 0;">
                    <strong style="color: #2c3e50;">FESTLIFT - Soluções em Elevadores Lda.</strong><br>
                    📧 info@festlift.pt | 📞 +351 21 234 5678<br>
                    📍 Lisboa, Portugal | NIF: 123456789
                </p>
            </div>
        </div>
    </div>
    `;
    
    const mailOptions = {
        from: `FestLift <${process.env.EMAIL_FROM || 'info@festlift.pt'}>`,
        to: orcamento.cliente.email,
        subject: `Orçamento ${orcamento.numero} - Modernização de Elevador`,
        html: emailHTML,
        attachments: [
            {
                filename: `Orcamento-${orcamento.numero}.pdf`,
                path: pdfPath,
                contentType: 'application/pdf'
            }
        ]
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado com sucesso!');
        console.log('📧 Para:', orcamento.cliente.email);
        console.log('📎 Anexo:', `Orcamento-${orcamento.numero}.pdf`);
        console.log('📬 Message ID:', info.messageId);
        console.log('\n🎉 Verifica tua caixa de email!\n');
        
        console.log('💰 Resumo do Orçamento:');
        console.log(`   Subtotal: €${subtotal.toFixed(2)}`);
        console.log(`   IVA (23%): €${iva.toFixed(2)}`);
        console.log(`   TOTAL: €${total.toFixed(2)}`);
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error.message);
    }
});
