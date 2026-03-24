const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const Inspection = require('../../models/Inspection');

// ─── CRUD: Guardar inspecção na base de dados ────────────────────────────────

// POST /api/inspections — criar nova inspecção
router.post('/', auth, async (req, res) => {
    try {
        const {
            numero, data, inspector, liftLocation, liftModel,
            clientEmail, liftId, checklist, generalComments,
            recommendations, status
        } = req.body;

        if (!inspector || !liftLocation) {
            return res.status(400).json({ success: false, message: 'Técnico e localização são obrigatórios' });
        }

        // Gerar número automático se não fornecido
        const inspectionNumero = numero && numero.trim() ? numero.trim() : await Inspection.gerarNumero();

        const inspection = new Inspection({
            numero: inspectionNumero,
            data: data ? new Date(data) : new Date(),
            inspector,
            liftLocation,
            liftModel: liftModel || '',
            clientEmail: clientEmail || '',
            liftId: liftId || null,
            checklist: checklist || {},
            generalComments: generalComments || '',
            recommendations: recommendations || '',
            status: status || 'rascunho',
            criadoPor: req.user?.id || req.user?._id || null
        });

        await inspection.save();
        console.log(`✅ Inspecção guardada: ${inspection.numero}`);

        res.status(201).json({ success: true, inspection });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'Número de inspecção já existe' });
        }
        console.error('❌ Erro ao guardar inspecção:', error);
        res.status(500).json({ success: false, message: 'Erro ao guardar inspecção', error: error.message });
    }
});

// GET /api/inspections — listar inspecções (com filtros opcionais)
router.get('/', auth, async (req, res) => {
    try {
        const { status, inspector, liftId, from, to, limit = 100, page = 1 } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (inspector) filter.inspector = new RegExp(inspector, 'i');
        if (liftId) filter.liftId = liftId;
        if (from || to) {
            filter.data = {};
            if (from) filter.data.$gte = new Date(from);
            if (to) filter.data.$lte = new Date(to);
        }

        const total = await Inspection.countDocuments(filter);
        const inspections = await Inspection.find(filter)
            .sort({ data: -1, createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean();

        res.json({ success: true, inspections, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        console.error('❌ Erro ao listar inspecções:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar inspecções', error: error.message });
    }
});

// GET /api/inspections/:id — obter uma inspecção
router.get('/:id', auth, async (req, res) => {
    try {
        const inspection = await Inspection.findById(req.params.id).lean();
        if (!inspection) {
            return res.status(404).json({ success: false, message: 'Inspecção não encontrada' });
        }
        res.json({ success: true, inspection });
    } catch (error) {
        console.error('❌ Erro ao obter inspecção:', error);
        res.status(500).json({ success: false, message: 'Erro ao obter inspecção', error: error.message });
    }
});

// PUT /api/inspections/:id — actualizar inspecção
router.put('/:id', auth, async (req, res) => {
    try {
        const allowed = ['status', 'checklist', 'generalComments', 'recommendations',
                         'inspector', 'liftLocation', 'liftModel', 'clientEmail', 'data'];
        const update = {};
        allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

        const inspection = await Inspection.findByIdAndUpdate(
            req.params.id,
            { $set: update },
            { new: true, runValidators: true }
        );

        if (!inspection) {
            return res.status(404).json({ success: false, message: 'Inspecção não encontrada' });
        }
        res.json({ success: true, inspection });
    } catch (error) {
        console.error('❌ Erro ao actualizar inspecção:', error);
        res.status(500).json({ success: false, message: 'Erro ao actualizar inspecção', error: error.message });
    }
});

// DELETE /api/inspections/:id — apagar inspecção
router.delete('/:id', auth, async (req, res) => {
    try {
        const inspection = await Inspection.findByIdAndDelete(req.params.id);
        if (!inspection) {
            return res.status(404).json({ success: false, message: 'Inspecção não encontrada' });
        }
        res.json({ success: true, message: 'Inspecção apagada', numero: inspection.numero });
    } catch (error) {
        console.error('❌ Erro ao apagar inspecção:', error);
        res.status(500).json({ success: false, message: 'Erro ao apagar inspecção', error: error.message });
    }
});

// ─── Helper: gerar PDF do relatório de manutenção ───────────────────────────
function buildReportPDF(data) {
    return new Promise((resolve, reject) => {
        const {
            inspectionNumber, inspectionDate, inspector,
            liftLocation, liftModel, clientEmail,
            checklist, generalComments, recommendations
        } = data;

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const BLUE  = '#1a3a6b';
        const LGREY = '#f5f5f5';
        const TEXT  = '#222222';

        // ── Cabeçalho ──────────────────────────────────────────────────────
        doc.rect(40, 30, 515, 70).fill(BLUE);
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffffff')
           .text('FESTLIFT - Elevadores e Serviços, Lda.', 55, 45);
        doc.fontSize(11).font('Helvetica').fillColor('#cce0ff')
           .text('RELATÓRIO DE MANUTENÇÃO MENSAL', 55, 72);
        doc.fillColor(TEXT);

        let y = 120;

        // ── Info do relatório ───────────────────────────────────────────────
        const dataFormatted = inspectionDate
            ? new Date(inspectionDate).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '—';

        const infoRows = [
            ['Nº da Manutenção:', inspectionNumber || '—'],
            ['Data:', dataFormatted],
            ['Técnico Responsável:', inspector || '—'],
            ['Localização do Ascensor:', liftLocation || '—'],
            ['Modelo do Ascensor:', liftModel || '—'],
            ['Email do Cliente:', clientEmail || '—'],
        ];

        doc.rect(40, y, 515, infoRows.length * 22 + 10).fill(LGREY);
        doc.rect(40, y, 515, infoRows.length * 22 + 10).stroke('#cccccc');
        y += 8;
        infoRows.forEach(([label, value]) => {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(BLUE).text(label, 50, y, { continued: true });
            doc.font('Helvetica').fillColor(TEXT).text(' ' + value, { width: 400 });
            y += 22;
        });
        y += 10;

        // ── Checklist ──────────────────────────────────────────────────────
        if (checklist && Object.keys(checklist).length > 0) {
            doc.fontSize(12).font('Helvetica-Bold').fillColor(BLUE)
               .text('Resultados da Verificação', 40, y);
            y += 18;

            // Cabeçalho da tabela
            doc.rect(40, y, 515, 18).fill(BLUE);
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
            doc.text('Item', 50, y + 4, { width: 300 });
            doc.text('Estado', 360, y + 4, { width: 60, align: 'center' });
            doc.text('Observações', 425, y + 4, { width: 120 });
            doc.fillColor(TEXT);
            y += 18;

            let rowAlt = false;
            Object.entries(checklist).forEach(([key, val]) => {
                if (!val || !val.status) return;
                if (y > 730) { doc.addPage(); y = 50; }

                const itemName = key.replace(/-/g, ' ').replace(/_/g, ' ');
                const statusMap = { ok: { icon: '✓', color: '#28a745' }, warning: { icon: '⚠', color: '#e67e00' }, error: { icon: '✗', color: '#dc3545' }, na: { icon: 'N/A', color: '#888888' } };
                const s = statusMap[val.status] || { icon: '—', color: '#888' };

                const rowH = 18;
                if (rowAlt) doc.rect(40, y, 515, rowH).fill('#f9f9f9');
                doc.rect(40, y, 515, rowH).stroke('#e0e0e0');

                doc.fontSize(8).font('Helvetica').fillColor(TEXT)
                   .text(itemName.charAt(0).toUpperCase() + itemName.slice(1), 50, y + 4, { width: 300, lineBreak: false });
                doc.fillColor(s.color).font('Helvetica-Bold')
                   .text(s.icon, 360, y + 4, { width: 60, align: 'center', lineBreak: false });
                doc.fillColor('#555555').font('Helvetica')
                   .text(val.comment || '', 425, y + 4, { width: 120, lineBreak: false });

                y += rowH;
                rowAlt = !rowAlt;
            });
            y += 10;
        }

        // ── Observações ────────────────────────────────────────────────────
        if (generalComments && generalComments.trim()) {
            if (y > 680) { doc.addPage(); y = 50; }
            doc.fontSize(11).font('Helvetica-Bold').fillColor(BLUE).text('Observações Gerais', 40, y);
            y += 14;
            doc.rect(40, y, 515, 8).fill(BLUE);
            y += 12;
            doc.fontSize(9).font('Helvetica').fillColor(TEXT)
               .text(generalComments.trim(), 40, y, { width: 515 });
            y = doc.y + 12;
        }

        // ── Recomendações ──────────────────────────────────────────────────
        if (recommendations && recommendations.trim()) {
            if (y > 680) { doc.addPage(); y = 50; }
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#b8690a').text('Recomendações', 40, y);
            y += 14;
            doc.rect(40, y, 515, 8).fill('#e67e00');
            y += 12;
            doc.fontSize(9).font('Helvetica').fillColor(TEXT)
               .text(recommendations.trim(), 40, y, { width: 515 });
            y = doc.y + 12;
        }

        // ── Rodapé ─────────────────────────────────────────────────────────
        const footerY = 800;
        doc.rect(40, footerY - 5, 515, 0.5).fill('#cccccc');
        doc.fontSize(8).font('Helvetica').fillColor('#888888')
           .text(
               'FestLift - Elevadores e Serviços, Lda. | NIF: 515 924 741 | info@festlift.pt | Tel: +351 214 190 863 | Móvel: +351 926 380 243/244',
               40, footerY + 2, { align: 'center', width: 515 }
           );

        doc.end();
    });
}

// POST /api/inspections/download-pdf — download PDF directly (used by frontend)
router.post('/download-pdf', auth, async (req, res) => {
    try {
        const pdfBuffer = await buildReportPDF(req.body);
        const filename = `Relatorio_${(req.body.inspectionNumber || 'MANU').replace(/[\\/]/g, '-')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar PDF', error: error.message });
    }
});

// POST /api/inspections/send-report - Enviar relatório por email (com PDF anexo)
router.post('/send-report', auth, async (req, res) => {
    try {
        const {
            inspectionNumber,
            inspectionDate,
            inspector,
            liftLocation,
            liftModel,
            clientEmail,
            liftSerial,   // mantido por compatibilidade retroactiva
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

        // Gerar PDF para anexar
        const pdfBuffer = await buildReportPDF({
            inspectionNumber, inspectionDate, inspector,
            liftLocation, liftModel,
            clientEmail: clientEmail || liftSerial || recipientEmail,
            checklist, generalComments, recommendations
        });

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

        // Gerar HTML resumo do checklist
        let checklistHTML = '';
        if (checklist && typeof checklist === 'object') {
            const rows = Object.entries(checklist)
                .filter(([, v]) => v && v.status)
                .map(([key, v]) => {
                    const name = (key.replace(/-/g, ' ').replace(/_/g, ' '));
                    const label = name.charAt(0).toUpperCase() + name.slice(1);
                    const icons = { ok: { i: '✓', c: '#28a745' }, warning: { i: '⚠', c: '#e67e00' }, error: { i: '✗', c: '#dc3545' }, na: { i: 'N/A', c: '#888' } };
                    const s = icons[v.status] || { i: '—', c: '#888' };
                    return `<tr>
                        <td style="padding:7px 10px;border:1px solid #e0e0e0;">${label}</td>
                        <td style="padding:7px 10px;border:1px solid #e0e0e0;color:${s.c};font-weight:bold;text-align:center;">${s.i}</td>
                        <td style="padding:7px 10px;border:1px solid #e0e0e0;color:#555;">${v.comment || ''}</td>
                    </tr>`;
                });
            if (rows.length) {
                checklistHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead><tr>
                        <th style="padding:8px 10px;background:#1a3a6b;color:#fff;border:1px solid #1a3a6b;text-align:left;">Item</th>
                        <th style="padding:8px 10px;background:#1a3a6b;color:#fff;border:1px solid #1a3a6b;text-align:center;width:60px;">Estado</th>
                        <th style="padding:8px 10px;background:#1a3a6b;color:#fff;border:1px solid #1a3a6b;text-align:left;">Observações</th>
                    </tr></thead>
                    <tbody>${rows.join('')}</tbody></table>`;
            } else {
                checklistHTML = '<p style="color:#888;"><em>Nenhum item verificado</em></p>';
            }
        }

        // Formatar data
        const dataFormatted = inspectionDate
            ? new Date(inspectionDate).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : 'Não especificada';

        const pdfFilename = `Relatorio_${inspectionNumber.replace(/[\\/]/g, '-')}.pdf`;

        const mailOptions = {
            from: `FestLift <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject: `Relatório de Manutenção ${inspectionNumber} - FestLift`,
            attachments: [
                {
                    filename: pdfFilename,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ],
            html: `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:20px 0;">
  <tr><td align="center">
    <table width="100%" style="max-width:640px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #dde3ec;">

      <!-- HEADER -->
      <tr><td style="background:#1a3a6b;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">FESTLIFT, LDA</h1>
        <p style="margin:6px 0 0;color:#aac8f5;font-size:13px;">Elevadores e Serviços</p>
      </td></tr>

      <!-- TITLE -->
      <tr><td style="padding:24px 32px 0;">
        <h2 style="margin:0;color:#1a3a6b;font-size:18px;border-bottom:2px solid #1a3a6b;padding-bottom:10px;">
          📋 Relatório de Manutenção Mensal
        </h2>
      </td></tr>

      <!-- INFO TABLE -->
      <tr><td style="padding:16px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f8ff;border-radius:6px;border:1px solid #dde3ec;font-size:13px;">
          <tr><td style="padding:8px 14px;font-weight:bold;color:#1a3a6b;width:42%;">Nº da Manutenção:</td><td style="padding:8px 14px;">${inspectionNumber}</td></tr>
          <tr style="background:#edf2fb;"><td style="padding:8px 14px;font-weight:bold;color:#1a3a6b;">Data:</td><td style="padding:8px 14px;">${dataFormatted}</td></tr>
          <tr><td style="padding:8px 14px;font-weight:bold;color:#1a3a6b;">Técnico Responsável:</td><td style="padding:8px 14px;">${inspector || '—'}</td></tr>
          <tr style="background:#edf2fb;"><td style="padding:8px 14px;font-weight:bold;color:#1a3a6b;">Localização:</td><td style="padding:8px 14px;">${liftLocation || '—'}</td></tr>
          <tr><td style="padding:8px 14px;font-weight:bold;color:#1a3a6b;">Modelo do Ascensor:</td><td style="padding:8px 14px;">${liftModel || '—'}</td></tr>
        </table>
      </td></tr>

      <!-- CHECKLIST -->
      <tr><td style="padding:0 32px 16px;">
        <h3 style="color:#1a3a6b;font-size:15px;margin:0 0 10px;">Resultados da Verificação</h3>
        ${checklistHTML}
      </td></tr>

      ${generalComments ? `
      <tr><td style="padding:0 32px 16px;">
        <h3 style="color:#1a3a6b;font-size:15px;margin:0 0 8px;">Observações Gerais</h3>
        <p style="margin:0;background:#f5f8ff;padding:12px 16px;border-left:4px solid #1a3a6b;font-size:13px;color:#333;">${generalComments}</p>
      </td></tr>` : ''}

      ${recommendations ? `
      <tr><td style="padding:0 32px 16px;">
        <h3 style="color:#b8690a;font-size:15px;margin:0 0 8px;">Recomendações</h3>
        <p style="margin:0;background:#fff8ee;padding:12px 16px;border-left:4px solid #e67e00;font-size:13px;color:#333;">${recommendations}</p>
      </td></tr>` : ''}

      <!-- PDF NOTE -->
      <tr><td style="padding:0 32px 20px;">
        <p style="margin:0;background:#e8f5e9;padding:12px 16px;border-radius:6px;font-size:13px;color:#2e7d32;">
          📎 <strong>O relatório completo em PDF está em anexo.</strong><br>
          Pode abrir, guardar ou imprimir o ficheiro <em>${pdfFilename}</em> directamente no seu dispositivo.
        </p>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#f5f8ff;padding:16px 32px;text-align:center;border-top:1px solid #dde3ec;">
        <p style="margin:0;font-size:11px;color:#888;">
          FestLift - Elevadores e Serviços, Lda. | NIF: 515 924 741<br>
          ☎ +351 214 190 863 | +351 926 380 243/244 | info@festlift.pt<br>
          Av. do Parque 84B, Rio de Mouro, Lisboa 2635-609
        </p>
        <p style="margin:8px 0 0;font-size:10px;color:#bbb;">© ${new Date().getFullYear()} FestLift, Lda. — Email automático</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Relatório ${inspectionNumber} enviado para ${recipientEmail} com PDF`);

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
