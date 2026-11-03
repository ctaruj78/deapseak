const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

        if (!this.smtpConfigured) {
            console.warn('⚠️  SMTP não configurado — emails não serão enviados (definir SMTP_HOST, SMTP_USER, SMTP_PASS no .env)');
        }

        const fromRaw = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"FestLift" <info@festlift.pt>';
        this.from = fromRaw;

        const fromEmail = fromRaw.match(/<([^>]+)>/)?.[1] || fromRaw;
        this.adminBcc = process.env.EMAIL_BCC || fromEmail || null;

        if (this.smtpConfigured) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: { rejectUnauthorized: false }
            });
            console.log(`✅ Email Service initialized — SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
        }
    }

    async _sendEmail(to, subject, htmlContent, attachments = [], bcc = null) {
        if (!this.smtpConfigured) {
            console.warn(`⚠️  Email não enviado para ${to} — SMTP não configurado`);
            return;
        }

        let toField;
        if (typeof to === 'string') {
            toField = to;
        } else if (Array.isArray(to)) {
            toField = to.map(t => (typeof t === 'string' ? t : (t.name ? `${t.name} <${t.email}>` : t.email))).join(', ');
        } else if (to && to.email) {
            toField = to.name ? `${to.name} <${to.email}>` : to.email;
        } else {
            console.warn('⚠️  Email não enviado — destinatário inválido:', to);
            return;
        }

        const mailOptions = {
            from: this.from,
            to: toField,
            subject,
            html: htmlContent
        };

        if (typeof htmlContent === 'string' && htmlContent.includes('cid:festlift-logo@festlift')) {
            mailOptions.attachments = [{
                filename: 'festlift-logo.png',
                path: require('path').join(__dirname, '../../assets/img/festlift-logo.png'),
                cid: 'festlift-logo@festlift',
                contentDisposition: 'inline'
            }];
        }

        const effectiveBcc = bcc || (this.adminBcc && toField !== this.adminBcc ? this.adminBcc : null);
        if (effectiveBcc) mailOptions.bcc = effectiveBcc;

        if (attachments && attachments.length > 0) {
            mailOptions.attachments = (mailOptions.attachments || []).concat(attachments.map(a => ({
                filename: a.name,
                content: Buffer.from(a.content, 'base64'),
                cid: a.contentId || undefined,
                encoding: 'base64'
            })));
        }

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email enviado: ${info.messageId} → ${toField}`);
            return info;
        } catch (error) {
            const msg = error.responseCode ? `[${error.responseCode}] ${error.response}` : error.message;
            console.error(`❌ SMTP error: ${msg}`);
            throw error;
        }
    }

    async sendEmail(to, subject, htmlContent, bcc = null) {
        return await this._sendEmail(to, subject, htmlContent, [], bcc);
    }

    // Escape HTML special characters in user-supplied strings before embedding in email HTML
    _esc(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Shared branded wrapper — consistent FestLift header/footer for all emails
    // Números de emergência (pessoa presa) — configuráveis em EMERGENCY_PHONES (separados por vírgula)
    _emergencyPhonesHtml() {
        const raw = process.env.EMERGENCY_PHONES || '926 380 243, 926 380 244';
        return raw.split(',').map(n => n.trim()).filter(Boolean)
            .map(n => `<strong>${this._esc(n)}</strong>`).join(' / ');
    }

    _tpl(headerColor, headerLabel, bodyHtml) {
        const logoUrl = 'cid:festlift-logo@festlift';
        return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);">
  <tr><td bgcolor="${headerColor}" style="background-color:${headerColor};padding:22px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle">
        <img src="${logoUrl}" alt="FestLift" width="180" height="59" style="display:block;border:0;width:180px;height:59px;" />
      </td>
      <td align="right" valign="middle"><div style="font-size:13px;color:rgba(255,255,255,.9);font-weight:600;">${headerLabel}</div></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px 36px;color:#333;font-size:14px;line-height:1.7;">${bodyHtml}</td></tr>
  <tr><td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #e8e8e8;margin:0;"></td></tr>
  <tr><td style="padding:20px 36px;background:#fafafa;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:12px;color:#888;">
        <strong style="color:#555;">FestLift — Elevadores e Serviços, Lda.</strong><br>
        Av. do Parque 84B, Rio de Mouro, 2635-609 Lisboa<br>
        <a href="mailto:info@festlift.pt" style="color:#1565c0;text-decoration:none;">info@festlift.pt</a>
        &nbsp;·&nbsp; +351 214 190 863
      </td>
      <td align="right" style="font-size:11px;color:#bbb;vertical-align:bottom;">
        ${new Date().toLocaleDateString('pt-PT', { day:'2-digit', month:'long', year:'numeric' })}
      </td>
    </tr></table>
  </td></tr>
</table></td></tr></table></body></html>`;
    }

    // Novo pedido de servico — notificacao ao cliente
    async sendNewRequestNotification(request, client) {
        try {
            const name = this._esc(`${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Cliente');
            const body = `
                <p>Caro(a) <strong>${name}</strong>,</p>
                <p>O seu pedido de servico foi recebido e esta a ser processado pela nossa equipa.</p>
                <div style="background:#e8f0fe;border-left:4px solid #1565c0;border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;"><strong>Número do pedido:</strong> #${request._id}</p>
                    <p style="margin:0 0 8px 0;"><strong>Descrição:</strong> ${this._esc(request.title)}</p>
                    <p style="margin:0 0 8px 0;"><strong>Tipo:</strong> ${this.getRequestTypeText(request.type)}</p>
                    <p style="margin:0 0 8px 0;"><strong>Prioridade:</strong> ${this.getPriorityText(request.priority)}</p>
                    <p style="margin:0 0 8px 0;"><strong>Estado:</strong> ${this.getStatusText(request.status)}</p>
                    <p style="margin:0;"><strong>Data de criação:</strong> ${new Date(request.createdAt).toLocaleString('pt-PT')}</p>
                </div>
                <p>Sera notificado(a) sobre qualquer atualizacao do estado do pedido.</p>
                <p style="font-size:12px;color:#888;margin-top:24px;">Este e um email automatico — por favor nao responda diretamente.</p>`;
            await this._sendEmail(client.email, `✅ Pedido de servico recebido — FestLift`, this._tpl('#1565c0', 'Pedido de Servico', body));
            console.log(`✅ Email sent to ${client.email} about new request #${request._id}`);
        } catch (error) {
            console.error('❌ Error sending email:', error);
        }
    }

    // Notificação interna — admin/dispatcher recebe email quando cliente cria pedido
    async sendNewRequestInternalNotification(request, client) {
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'info@festlift.pt';
            const clientName = this._esc(`${client?.firstName || ''} ${client?.lastName || ''}`.trim() || client?.email || 'Cliente');
            const liftMunNum = request.lift?.municipalNumber || request.liftMunicipalNumber;
            const liftAddrObj = request.lift?.address;
            const liftAddress = liftAddrObj
                ? [liftAddrObj.street, liftAddrObj.city].filter(Boolean).join(', ')
                : request.liftAddress;
            const liftInfoParts = [];
            if (liftAddress) liftInfoParts.push(this._esc(liftAddress));
            if (liftMunNum) liftInfoParts.push(`Nº ${this._esc(liftMunNum)}`);
            const liftInfo = liftInfoParts.length ? liftInfoParts.join(' — ') : 'Elevador não especificado';
            const priorityColor = request.priority === 'high' || request.priority === 'urgent' ? '#c62828' : '#f9a825';
            const clientEmailEsc = this._esc(client?.email || '');
            const body = `
                <p>Foi submetido um novo pedido de servico por um cliente.</p>
                <div style="background:#fff3e0;border-left:4px solid ${priorityColor};border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;"><strong>Pedido:</strong> #${request._id}</p>
                    <p style="margin:0 0 8px 0;"><strong>Título:</strong> ${this._esc(request.title)}</p>
                    <p style="margin:0 0 8px 0;"><strong>Descrição:</strong> ${this._esc(request.description) || '—'}</p>
                    <p style="margin:0 0 8px 0;"><strong>Tipo:</strong> ${this.getRequestTypeText(request.type)}</p>
                    <p style="margin:0 0 8px 0;"><strong>Prioridade:</strong> ${this.getPriorityText(request.priority)}</p>
                    <p style="margin:0 0 8px 0;"><strong>Elevador:</strong> ${liftInfo}</p>
                    <p style="margin:0;"><strong>Cliente:</strong> ${clientName}${clientEmailEsc ? ` — <a href="mailto:${clientEmailEsc}">${clientEmailEsc}</a>` : ''}</p>
                </div>
                <p>Aceda ao painel de gestão para atribuir um técnico e processar o pedido.</p>`;
            await this._sendEmail(
                adminEmail,
                `📋 Novo pedido de serviço #${request._id} — ${clientName}`,
                this._tpl('#f9a825', 'Novo Pedido de Serviço', body)
            );
            console.log(`✅ Internal notification sent to ${adminEmail} for request #${request._id}`);
        } catch (error) {
            console.error('❌ Error sending internal notification:', error);
        }
    }

    // Notificação interna — admin/dispatcher recebe email quando cliente pede uma proposta de manutenção
    // (ex.: cliente com elevador de outra empresa que quer mudar para a FestLift)
    async sendNewPropostaSolicitadaNotification(proposta) {
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'info@festlift.pt';
            const clienteNome = this._esc(proposta.cliente?.nome || 'Cliente');
            const clienteEmailEsc = this._esc(proposta.cliente?.email || '');
            const morada = this._esc(proposta.instalacao?.morada || proposta.cliente?.morada || '—');
            const codigoPostal = this._esc(proposta.instalacao?.codigoPostal || proposta.cliente?.codigoPostal || '');
            const nif = this._esc(proposta.cliente?.nif || '—');
            const body = `
                <p>Um cliente submeteu um <strong>pedido de proposta de manutenção</strong> através do painel, para um elevador que ainda não está na nossa base de dados.</p>
                <div style="background:#fff3e0;border-left:4px solid #f9a825;border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;"><strong>Pedido:</strong> ${this._esc(proposta.numero)}</p>
                    <p style="margin:0 0 8px 0;"><strong>Cliente:</strong> ${clienteNome}${clienteEmailEsc ? ` — <a href="mailto:${clienteEmailEsc}">${clienteEmailEsc}</a>` : ''}</p>
                    <p style="margin:0 0 8px 0;"><strong>NIF:</strong> ${nif}</p>
                    <p style="margin:0 0 8px 0;"><strong>Morada da instalação:</strong> ${morada}${codigoPostal ? `, ${codigoPostal}` : ''}</p>
                    <p style="margin:0;"><strong>Nº de elevadores:</strong> ${proposta.numAscensores || '—'}</p>
                    ${proposta.observacaoCliente ? `<p style="margin:8px 0 0 0;"><strong>Observações do cliente:</strong> ${this._esc(proposta.observacaoCliente)}</p>` : ''}
                </div>
                <p>Aceda ao painel de gestão para preencher os termos comerciais e enviar a proposta ao cliente.</p>`;
            await this._sendEmail(
                adminEmail,
                `📨 Novo pedido de proposta de manutenção — ${clienteNome}`,
                this._tpl('#f9a825', 'Pedido de Proposta de Manutenção', body)
            );
            console.log(`✅ Internal notification sent to ${adminEmail} for proposta solicitada ${proposta.numero}`);
        } catch (error) {
            console.error('❌ Error sending internal notification (proposta solicitada):', error);
        }
    }

    // Alerta QR público — email imediato à equipa (admin/dispatcher). Falhar aqui não pode ser silencioso:
    // o visitante só avisa por QR, por isso este email é o único aviso fora do painel.
    async sendPublicQrAlertInternalNotification(request, { isTrapped = false, issueLabel = '' } = {}) {
        const adminEmail = process.env.ADMIN_EMAIL || 'info@festlift.pt';
        const siteUrl = process.env.SITE_URL || 'https://crm.festlift.pt';
        const reporter = request.reporter || {};
        const color = isTrapped ? '#c62828' : '#f9a825';
        const body = `
            <p>${isTrapped ? '<strong style="color:#c62828;">🚨 PESSOA PRESA NO ELEVADOR — ação imediata.</strong>' : 'Um visitante reportou um problema através do QR público do elevador.'}</p>
            <div style="background:#fff3e0;border-left:4px solid ${color};border-radius:6px;padding:18px 22px;margin:20px 0;">
                <p style="margin:0 0 8px 0;"><strong>Pedido:</strong> ${this._esc(request.requestNumber || '')}</p>
                <p style="margin:0 0 8px 0;"><strong>Situação:</strong> ${this._esc(issueLabel)}</p>
                <p style="margin:0 0 8px 0;"><strong>Elevador:</strong> ${this._esc([request.liftAddress, request.liftMunicipalNumber ? `Nº ${request.liftMunicipalNumber}` : ''].filter(Boolean).join(' — ') || '—')}</p>
                <p style="margin:0 0 8px 0;"><strong>Cliente:</strong> ${this._esc(request.liftClient || '—')}</p>
                <p style="margin:0 0 8px 0;"><strong>Visitante:</strong> ${this._esc(reporter.name || 'N/D')} — ${this._esc(reporter.phone || '')} — <a href="mailto:${this._esc(reporter.email || '')}">${this._esc(reporter.email || '')}</a></p>
                <p style="margin:0;"><strong>Detalhes:</strong> ${this._esc((request.description || '').split('Detalhes: ').pop())}</p>
            </div>
            <a href="${siteUrl}/pages/admin/requests.html" style="display:inline-block;background:#1565c0;color:#fff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:bold;">Abrir pedidos →</a>`;
        try {
            await this._sendEmail(
                adminEmail,
                `${isTrapped ? '🚨 URGENTE — Pessoa presa' : '⚠️ Alerta QR'} — ${issueLabel} — ${request.liftMunicipalNumber || ''}`,
                this._tpl(color, isTrapped ? 'Alerta Urgente' : 'Alerta QR Público', body)
            );
            console.log(`✅ Alerta QR público enviado para ${adminEmail}`);
        } catch (error) {
            console.error('❌ Erro ao enviar alerta QR público à equipa:', error);
        }
    }

    // Alerta QR público — aviso imediato ao cliente (responsável pelo elevador), com todos os detalhes
    async sendPublicQrAlertClientNotification(request, client, { isTrapped = false, issueLabel = '' } = {}) {
        if (!client?.email) return;
        try {
            const siteUrl = process.env.SITE_URL || 'https://crm.festlift.pt';
            const reporter = request.reporter || {};
            const color = isTrapped ? '#c62828' : '#f9a825';
            const name = this._esc(`${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Cliente');
            const details = (request.description || '').split('Detalhes: ').pop();
            const body = `
                <p>Caro(a) <strong>${name}</strong>,</p>
                <p>${isTrapped ? '<strong style="color:#c62828;">🚨 Foi reportada uma pessoa presa num elevador do seu edifício.</strong> A nossa equipa foi alertada e está a tratar da situação com prioridade. Linha de emergência: ${this._emergencyPhonesHtml()}.' : 'Foi reportado um problema num elevador do seu edifício através do QR público. A nossa equipa já foi notificada e irá tratar do assunto.'}</p>
                <div style="background:#fff3e0;border-left:4px solid ${color};border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;"><strong>Referência:</strong> ${this._esc(request.requestNumber || '')}</p>
                    <p style="margin:0 0 8px 0;"><strong>Situação:</strong> ${this._esc(issueLabel)}</p>
                    <p style="margin:0 0 8px 0;"><strong>Elevador:</strong> ${this._esc([request.liftAddress, request.liftMunicipalNumber ? `Nº ${request.liftMunicipalNumber}` : ''].filter(Boolean).join(' — ') || '—')}</p>
                    <p style="margin:0 0 8px 0;"><strong>Reportado por:</strong> ${this._esc(reporter.name || 'N/D')} — ${this._esc(reporter.phone || '')} — ${this._esc(reporter.email || '')}</p>
                    <p style="margin:0;"><strong>Detalhes:</strong> ${this._esc(details)}</p>
                </div>
                <p>Será informado(a) quando for atribuído um técnico e quando o problema ficar resolvido.</p>
                <a href="${siteUrl}/pages/client/requests.html" style="display:inline-block;background:#1565c0;color:#fff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:bold;">Ver pedido →</a>
                <p style="font-size:12px;color:#888;margin-top:24px;">Este e um email automatico — por favor nao responda diretamente.</p>`;
            await this._sendEmail(client.email, `${isTrapped ? '🚨 URGENTE — Pessoa presa' : '⚠️ Ocorrência reportada'} — ${request.requestNumber || ''} — FestLift`, this._tpl(color, isTrapped ? 'Alerta Urgente' : 'Ocorrência Reportada', body));
        } catch (error) {
            console.error('❌ Erro ao enviar alerta QR ao cliente:', error);
        }
    }

    // Alerta QR público — confirmação de receção ao visitante
    async sendPublicQrReporterReceived(request) {
        const to = request.reporter?.email;
        if (!to) return;
        try {
            const body = `
                <p>Caro(a) <strong>${this._esc(request.reporter.name || 'visitante')}</strong>,</p>
                <p>Recebemos o seu alerta sobre o elevador${request.liftAddress ? ` em <strong>${this._esc(request.liftAddress)}</strong>` : ''}. A nossa equipa já foi notificada e irá tratar do assunto o mais rapidamente possível.</p>
                <div style="background:#e8f0fe;border-left:4px solid #1565c0;border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 6px 0;"><strong>Referência:</strong> ${this._esc(request.requestNumber || '')}</p>
                    <p style="margin:0;"><strong>Situação reportada:</strong> ${this._esc((request.title || '').replace('Alerta QR público — ', ''))}</p>
                </div>
                <p>Em caso de emergência (pessoa presa), ligue de imediato para o nosso número de emergência: ${this._emergencyPhonesHtml()}.</p>
                <p style="font-size:12px;color:#888;margin-top:24px;">Este e um email automatico — por favor nao responda diretamente.</p>`;
            await this._sendEmail(to, `✅ Alerta recebido ${request.requestNumber || ''} — FestLift`, this._tpl('#1565c0', 'Alerta Recebido', body));
        } catch (error) {
            console.error('❌ Erro ao enviar confirmação ao visitante QR:', error);
        }
    }

    // Alerta QR público — atualização ao visitante (técnico atribuído / concluído)
    async sendPublicQrReporterUpdate(request, kind, technician = null) {
        const to = request.reporter?.email;
        if (!to) return;
        try {
            const ref = this._esc(request.requestNumber || '');
            let intro, subject, label, color;
            if (kind === 'assigned') {
                const techName = this._esc(`${technician?.firstName || ''} ${technician?.lastName || ''}`.trim());
                intro = `<p>Um técnico foi atribuído ao problema que reportou${techName ? `: <strong>${techName}</strong>` : ''}${technician?.phone ? ` (${this._esc(technician.phone)})` : ''}. Será contactado(a) brevemente.</p>`;
                subject = `🔧 Técnico atribuído — ${request.requestNumber || ''} — FestLift`;
                label = 'Técnico Atribuído'; color = '#1565c0';
            } else {
                intro = `<p>O problema que reportou no elevador foi <strong>resolvido</strong> pela nossa equipa técnica. Obrigado por nos ter avisado.</p>
                ${request.resolution ? `<div style="background:#e8f5e9;border-left:4px solid #2e7d32;border-radius:6px;padding:14px 18px;margin:16px 0;"><p style="margin:0 0 6px 0;font-weight:bold;color:#2e7d32;">O que aconteceu e o que foi feito:</p><p style="margin:0;white-space:pre-line;">${this._esc(request.resolution)}</p></div>` : ''}
                <p>Se o problema voltar a ocorrer, contacte-nos: <strong>+351 214 190 863</strong> · <a href="mailto:info@festlift.pt">info@festlift.pt</a>. Em caso de pessoa presa, ligue de imediato: ${this._emergencyPhonesHtml()}.</p>`;
                subject = `✅ Problema resolvido — ${request.requestNumber || ''} — FestLift`;
                label = 'Problema Resolvido'; color = '#2e7d32';
            }
            const body = `
                <p>Caro(a) <strong>${this._esc(request.reporter.name || 'visitante')}</strong>,</p>
                ${intro}
                <div style="background:#f8f9fa;border-radius:6px;padding:14px 18px;margin:16px 0;">
                    <p style="margin:0;"><strong>Referência:</strong> ${ref}${request.liftAddress ? ` — ${this._esc(request.liftAddress)}` : ''}</p>
                </div>
                <p style="font-size:12px;color:#888;margin-top:24px;">Este e um email automatico — para falar connosco use o telefone ou email acima.</p>`;
            await this._sendEmail(to, subject, this._tpl(color, label, body));
        } catch (error) {
            console.error('❌ Erro ao enviar atualização ao visitante QR:', error);
        }
    }

    // Tecnico atribuido ao pedido — notificacao ao cliente
    async sendTechnicianAssignedNotification(request, technician, client) {
        try {
            const name = this._esc(`${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Cliente');
            const techName = this._esc(`${technician.firstName || ''} ${technician.lastName || ''}`.trim());
            const techEmail = this._esc(technician.email || '');
            const techPhone = this._esc(technician.phone || '');
            const isQr = request.source === 'public_qr';
            const addrObj = request.lift?.address;
            const liftAddr = addrObj ? [addrObj.street, addrObj.city].filter(Boolean).join(', ') : request.liftAddress;
            const munNum = request.lift?.municipalNumber || request.liftMunicipalNumber;
            const liftInfo = [liftAddr, munNum ? `Nº ${munNum}` : null].filter(Boolean).join(' — ') || '—';
            const desc = request.description || '';
            const situation = (desc.match(/Situação: (.*)/) || [])[1] || (request.title || '').replace('Alerta QR público — ', '');
            const details = (desc.match(/Detalhes: (.*)/) || [])[1] || '';
            const body = `
                <p>Caro(a) <strong>${name}</strong>,</p>
                <p>${isQr ? 'Foi reportado por um visitante (QR do elevador) um problema num elevador do seu edifício. Um técnico foi atribuído e entrará em contacto brevemente.' : 'Um tecnico foi atribuido ao seu pedido de servico e entrara em contacto brevemente.'}</p>
                <div style="background:#fff8e1;border-left:4px solid #f9a825;border-radius:6px;padding:14px 18px;margin:16px 0;">
                    <p style="margin:0 0 6px 0;"><strong>Elevador:</strong> ${this._esc(liftInfo)}</p>
                    ${isQr ? `<p style="margin:0 0 6px 0;"><strong>Situação reportada:</strong> ${this._esc(situation)}</p>` : ''}
                    ${isQr && details ? `<p style="margin:0;"><strong>Detalhes do visitante:</strong> ${this._esc(details)}</p>` : ''}
                </div>
                <div style="background:#e8f0fe;border-left:4px solid #1565c0;border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#1565c0;">Tecnico responsavel:</p>
                    <p style="margin:0 0 6px 0;"><strong>Nome:</strong> ${techName}</p>
                    ${techPhone ? `<p style="margin:0 0 6px 0;"><strong>Telefone:</strong> ${techPhone}</p>` : ''}
                    <p style="margin:0;"><strong>Email:</strong> ${techEmail}</p>
                </div>
                <div style="background:#f8f9fa;border-radius:6px;padding:14px 18px;margin:16px 0;">
                    <p style="margin:0 0 6px 0;"><strong>Pedido:</strong> ${this._esc(request.requestNumber || '#' + request._id)} — ${this._esc(request.title)}</p>
                    <p style="margin:0;"><strong>Estado:</strong> ${this.getStatusText(request.status)}</p>
                </div>
                <p style="font-size:12px;color:#888;margin-top:24px;">Este e um email automatico — por favor nao responda diretamente.</p>`;
            if (client?.email) {
                try {
                    await this._sendEmail(client.email, `🔧 Tecnico atribuido ao pedido #${request._id} — FestLift`, this._tpl('#1565c0', 'Tecnico Atribuido', body));
                    console.log(`✅ Email sent to ${client.email} about technician assignment`);
                } catch (error) {
                    console.error('❌ Error sending client email:', error);
                }
            }
        } catch (error) {
            console.error('❌ Error building client email:', error);
        }
        // Notificação ao técnico é independente da do cliente — uma falha
        // no envio ao cliente (email invalido, SMTP, etc.) não pode impedir
        // o técnico de saber que lhe foi atribuída uma tarefa.
        await this.sendTechnicianTaskNotification(request, technician);
    }

    // Nova tarefa — notificacao ao tecnico
    async sendTechnicianTaskNotification(request, technician) {
        try {
            const siteUrl = process.env.SITE_URL || 'https://crm.festlift.pt';
            const techName = this._esc(`${technician.firstName || ''} ${technician.lastName || ''}`.trim() || 'Tecnico');
            const body = `
                <p>Caro(a) <strong>${techName}</strong>,</p>
                <p>Foi-lhe atribuida uma nova tarefa de servico. Por favor, entre em contacto com o cliente e execute o trabalho o mais brevemente possivel.</p>
                <div style="background:#fff8e1;border-left:4px solid #f9a825;border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#e65100;">Detalhes da tarefa:</p>
                    <p style="margin:0 0 6px 0;"><strong>Número:</strong> #${request._id}</p>
                    <p style="margin:0 0 6px 0;"><strong>Descrição:</strong> ${this._esc(request.title)}</p>
                    ${request.description ? `<p style="margin:0 0 6px 0;"><strong>Detalhes:</strong> ${this._esc(request.description)}</p>` : ''}
                    <p style="margin:0 0 6px 0;"><strong>Tipo:</strong> ${this.getRequestTypeText(request.type)}</p>
                    <p style="margin:0 0 6px 0;"><strong>Prioridade:</strong> ${this.getPriorityText(request.priority)}</p>
                    <p style="margin:0;"><strong>Elevador:</strong> ${(() => {
                        const addrObj = request.lift?.address;
                        const addr = addrObj ? [addrObj.street, addrObj.city].filter(Boolean).join(', ') : request.liftAddress;
                        const munNum = request.lift?.municipalNumber || request.liftMunicipalNumber;
                        const parts = [addr, munNum ? `Nº ${munNum}` : null].filter(Boolean);
                        return this._esc(parts.join(' — ') || request.liftId || '—');
                    })()}</p>
                </div>
                <a href="${siteUrl}/pages/tech/tasks.html" style="display:inline-block;background:#1565c0;color:#fff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:bold;margin-top:8px;">Ver tarefa →</a>
                <p style="font-size:12px;color:#888;margin-top:24px;">Este e um email automatico — por favor nao responda diretamente.</p>`;
            await this._sendEmail(technician.email, `📋 Nova tarefa atribuida — Pedido #${request._id} — FestLift`, this._tpl('#f9a825', 'Nova Tarefa', body));
            console.log(`✅ Email sent to ${technician.email} about new task`);
        } catch (error) {
            console.error('❌ Error sending email:', error);
        }
    }

    // Alteracao de estado do pedido — notificacao ao cliente
    async sendStatusChangeNotification(request, client, oldStatus, newStatus) {
        try {
            const name = this._esc(`${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Cliente');
            const body = `
                <p>Caro(a) <strong>${name}</strong>,</p>
                <p>O estado do seu pedido de servico foi atualizado.</p>
                <div style="background:#e8f0fe;border-left:4px solid #1565c0;border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;"><strong>Pedido:</strong> #${request._id} — ${this._esc(request.title)}</p>
                    <p style="margin:0 0 6px 0;"><strong>Estado anterior:</strong> ${this.getStatusText(oldStatus)}</p>
                    <p style="margin:0;"><strong>Novo estado:</strong> <span style="color:#1b5e20;font-weight:bold;">${this.getStatusText(newStatus)}</span></p>
                </div>
                <p>Obrigado por confiar nos servicos da FestLift.</p>
                <p style="font-size:12px;color:#888;margin-top:24px;">Este e um email automatico — por favor nao responda diretamente.</p>`;
            await this._sendEmail(client.email, `🔄 Estado do pedido #${request._id} atualizado — FestLift`, this._tpl('#1565c0', 'Atualizacao de Estado', body));
            console.log(`✅ Email sent to ${client.email} about status change`);
        } catch (error) {
            console.error('❌ Error sending email:', error);
        }
    }

    // Pedido concluido — notificacao ao cliente
    async sendRequestCompletedNotification(request, client) {
        try {
            const siteUrl = process.env.SITE_URL || 'https://crm.festlift.pt';
            const name = this._esc(`${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Cliente');
            const body = `
                <p>Caro(a) <strong>${name}</strong>,</p>
                <p>${request.source === 'public_qr' ? 'A ocorrência reportada através do QR público do elevador foi <strong>resolvida</strong> pela nossa equipa técnica.' : 'O seu pedido de manutencao do elevador foi concluido com sucesso pela nossa equipa tecnica.'}</p>
                <div style="background:#e8f5e9;border-left:4px solid #2e7d32;border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#2e7d32;">Trabalho realizado:</p>
                    <p style="margin:0 0 6px 0;"><strong>Pedido:</strong> ${this._esc(request.requestNumber || '#' + request._id)} — ${this._esc(request.title)}</p>
                    ${request.liftAddress ? `<p style="margin:0 0 6px 0;"><strong>Elevador:</strong> ${this._esc(request.liftAddress)}</p>` : ''}
                    <p style="margin:0 0 6px 0;"><strong>Data de conclusao:</strong> ${new Date(request.completedAt || Date.now()).toLocaleString('pt-PT')}</p>
                    ${(request.resolution || request.workDetails) ? `<p style="margin:0;white-space:pre-line;"><strong>O que aconteceu e o que foi feito:</strong> ${this._esc(request.resolution || request.workDetails)}</p>` : ''}
                </div>
                <p>Agradecemos a sua confianca nos servicos FestLift. Para quaisquer questoes, nao hesite em contactar-nos.</p>
                <a href="${siteUrl}/pages/client/requests.html" style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:bold;margin-top:8px;">Ver historico →</a>
                <p style="font-size:12px;color:#888;margin-top:24px;">Este e um email automatico — por favor nao responda diretamente.</p>`;
            await this._sendEmail(client.email, `✅ Pedido ${request.requestNumber || '#' + request._id} concluido — FestLift`, this._tpl('#2e7d32', 'Pedido Concluido', body));
            console.log(`✅ Email sent to ${client.email} about completed request`);
        } catch (error) {
            console.error('❌ Error sending email:', error);
        }
    }

    // Redefinicao de palavra-passe
    async sendPasswordResetEmail(email, resetUrl, firstName) {
        try {
            const name = this._esc(firstName || 'utilizador');
            const body = `
                <p>Caro(a) <strong>${name}</strong>,</p>
                <p>Recebemos um pedido de redefinicao de palavra-passe para a sua conta FestLift.</p>
                <div style="background:#fce4ec;border-left:4px solid #c62828;border-radius:6px;padding:16px 20px;margin:20px 0;">
                    <p style="margin:0;"><strong>⚠️ Este link e valido por apenas 10 minutos.</strong></p>
                </div>
                <p>Clique no botao abaixo para criar uma nova palavra-passe:</p>
                <a href="${resetUrl}" style="display:inline-block;background:#c62828;color:#fff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:bold;margin:16px 0;">Redefinir palavra-passe →</a>
                <p style="font-size:13px;color:#666;margin-top:16px;">Se o botao nao funcionar, copie e cole este link no browser:<br>
                    <span style="word-break:break-all;color:#1565c0;">${resetUrl}</span></p>
                <div style="background:#fff8e1;border-left:4px solid #f9a825;border-radius:6px;padding:14px 18px;margin:24px 0;">
                    <p style="margin:0;">🛡️ Se nao solicitou esta alteracao, ignore este email — a sua palavra-passe permanece inalterada.</p>
                </div>
                <p style="font-size:12px;color:#888;margin-top:24px;">Este e um email automatico — por favor nao responda diretamente.</p>`;
            await this._sendEmail(email, '🔐 Redefinicao de palavra-passe — FestLift', this._tpl('#c62828', 'Redefinicao de Palavra-passe', body));
            console.log(`✅ Password reset email sent to ${email}`);
        } catch (error) {
            console.error('❌ Error sending password reset email:', error);
            throw error;
        }
    }

    getRequestTypeText(type) {
        const types = {
            maintenance: 'Manutencao preventiva',
            repair: 'Reparacao',
            emergency: 'Emergencia',
            inspection: 'Inspecao',
            consultation: 'Consulta'
        };
        return types[type] || type;
    }

    getPriorityText(priority) {
        const priorities = {
            low: 'Baixa',
            medium: 'Media',
            high: 'Alta',
            urgent: 'Urgente'
        };
        return priorities[priority] || priority;
    }

    getStatusText(status) {
        const statuses = {
            new: 'Novo',
            assigned: 'Atribuido',
            in_progress: 'Em curso',
            completed: 'Concluido',
            cancelled: 'Cancelado'
        };
        return statuses[status] || status;
    }

    // Email de boas-vindas para novo cliente com palavra-passe temporaria
    async sendWelcomeClientEmail(user, temporaryPassword) {
        const frontendUrl = process.env.SITE_URL || process.env.FRONTEND_URL || 'https://crm.festlift.pt';
        const loginUrl = `${frontendUrl}/pages/auth/login.html`;
        const firstName = user.firstName || 'Cliente';
        const lastName = user.lastName || '';

        const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
                <div style="background-color:#1a237e;background-image:linear-gradient(135deg,#1a237e,#1565c0);padding:24px 32px;border-radius:8px 8px 0 0;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">🛗 FestLift — Plataforma de Gestao de Elevadores</h1>
                </div>
                <div style="background:#fff;padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
                    <p style="font-size:16px;">Bem-vindo(a), <strong>${firstName} ${lastName}</strong>!</p>
                    <p>A sua empresa foi registada na plataforma <strong>FestLift</strong> como cliente de manutencao de elevadores.</p>
                    <p>Pode acompanhar o estado dos seus elevadores, consultar relatorios e criar pedidos de servico.</p>

                    <div style="background:#e8f0fe;border-left:4px solid #1565c0;padding:20px;border-radius:6px;margin:24px 0;">
                        <h3 style="margin-top:0;color:#1565c0;">🔐 Os seus dados de acesso:</h3>
                        <p style="margin:6px 0;"><strong>Email:</strong> ${user.email}</p>
                        <p style="margin:6px 0;"><strong>Palavra-passe temporaria:</strong> <code style="background:#fff;padding:2px 8px;border-radius:4px;font-size:15px;border:1px solid #c5cae9;">${temporaryPassword}</code></p>
                    </div>

                    <div style="background:#fff8e1;border-left:4px solid #f9a825;padding:16px;border-radius:6px;margin:16px 0;">
                        <p style="margin:0;">⚠️ <strong>Por razoes de seguranca, altere a sua palavra-passe apos o primeiro login.</strong></p>
                    </div>

                    <a href="${loginUrl}" style="display:inline-block;background:#1565c0;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;margin-top:16px;">
                        Entrar na plataforma →
                    </a>

                    <p style="color:#888;font-size:13px;margin-top:32px;">
                        Se tiver alguma questao, contacte-nos em <a href="mailto:info@festlift.pt" style="color:#1565c0;">info@festlift.pt</a>
                    </p>
                </div>
            </div>`;

        try {
            await this._sendEmail(user.email, 'Bem-vindo(a) a FestLift — Os seus dados de acesso', html);
        } catch (error) {
            console.error('❌ sendWelcomeClientEmail error:', error.message);
            throw error;
        }
    }

    // Email de teste
    async sendTestEmail(to) {
        try {
            const body = `
                <p>Este e um email de teste enviado pela plataforma <strong>FestLift</strong>.</p>
                <p>Se recebeu este email, a configuracao SMTP esta a funcionar corretamente.</p>
                <div style="background:#e8f0fe;border-left:4px solid #1565c0;border-radius:6px;padding:16px 20px;margin:20px 0;">
                    <p style="margin:0;">✅ Servidor SMTP: <strong>${process.env.SMTP_HOST || 'configurado'}</strong></p>
                </div>`;
            const info = await this._sendEmail(to, '✅ Teste de email — FestLift', this._tpl('#1565c0', 'Email de Teste', body));
            console.log('✅ Test email sent:', info && info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Error sending test email:', error);
            return false;
        }
    }

    // Envio de formulario ao municipio (Inicio / Fim de Servico)
    async sendMunicipalityForm(templateType, liftData, municipalityEmail) {
        try {
            const fs = require('fs');
            const path = require('path');

            const templatePath = path.join(__dirname, '../../templates/emails', `municipality-${templateType}.html`);
            let htmlContent = fs.readFileSync(templatePath, 'utf8');

            const serviceDate = liftData.serviceStartDate
                ? new Date(liftData.serviceStartDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
                : (liftData.serviceEndDate ? new Date(liftData.serviceEndDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A');
            htmlContent = htmlContent
                .replace(/{{municipalNumber}}/g, liftData.municipalNumber || 'N/A')
                .replace(/{{address}}/g, liftData.address || 'N/A')
                .replace(/{{postalCode}}/g, liftData.postalCode || 'N/A')
                .replace(/{{brand}}/g, liftData.brand || 'N/A')
                .replace(/{{model}}/g, liftData.model || 'N/A')
                .replace(/{{year}}/g, liftData.installationYear || 'N/A')
                .replace(/{{capacity}}/g, liftData.capacity || 'N/A')
                .replace(/{{municipalityName}}/g, liftData.municipalityName || 'Senhor(a) Presidente')
                .replace(/{{serviceStartDate}}/g, serviceDate)
                .replace(/{{clientName}}/g, liftData.clientName || 'N/A')
                .replace(/{{clientPhone}}/g, liftData.clientPhone || 'N/A')
                .replace(/{{clientEmail}}/g, liftData.clientEmail || 'N/A')
                .replace(/{{notes}}/g, liftData.notes || 'Nao especificado')
                .replace(/{{notesBlock}}/g, () => {
                    const n = String(liftData.notes || '').trim();
                    if (!n) return '';
                    const esc = n.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\r?\n/g, '<br>');
                    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:25px;border-left:4px solid #1a3a5c;background-color:#f4f7fa;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#1a3a5c;font-family:Arial,Helvetica,sans-serif;">Notas Adicionais</p><p style="margin:0;font-size:13px;line-height:1.7;color:#333333;font-family:Arial,Helvetica,sans-serif;">${esc}</p></td></tr></table>`;
                })
                .replace(/{{date}}/g, new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }));

            const subject = templateType === 'inicio-servico'
                ? `📝 FestLift - Elevadores e Servicos - Comunicacao de Inicio de Servico - Elevador ${liftData.municipalNumber}`
                : `📝 FestLift - Elevadores e Servicos - Comunicacao de Fim de Servico - Elevador ${liftData.municipalNumber}`;

            await this._sendEmail(municipalityEmail, subject, htmlContent);

            console.log(`✅ Municipality form (${templateType}) sent to ${municipalityEmail} for lift ${liftData.municipalNumber}`);
            return { success: true, message: 'Email enviado com sucesso' };
        } catch (error) {
            console.error('❌ Error sending municipality form:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();
