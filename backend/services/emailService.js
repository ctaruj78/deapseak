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

        const effectiveBcc = bcc || (this.adminBcc && toField !== this.adminBcc ? this.adminBcc : null);
        if (effectiveBcc) mailOptions.bcc = effectiveBcc;

        if (attachments && attachments.length > 0) {
            mailOptions.attachments = attachments.map(a => ({
                filename: a.name,
                content: Buffer.from(a.content, 'base64'),
                cid: a.contentId || undefined,
                encoding: 'base64'
            }));
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
    _tpl(headerColor, headerLabel, bodyHtml) {
        const logoUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAScAAABhCAMAAACj8pe2AAABBVBMVEUAAAD////yphPyphPyphPyphPyphPyphPyphPyphP////yphPyphPyphPyphP////yphP////yphP////////51Zj////yphP////////////////////////yphP////yphPyphPyphP////////yphPyphP////////////yphPyphP////////////////yphP////yphPyphP////yphPyphPyphP////////////////////////yphP////yphPyphPyphP////yphPyphP////////yphPyphPyphPyphP////yphP////////////////////yphPyphP////yphMllZjmAAAAVXRSTlMARJlE7xFmzFXdu4h3M6p2uxEizAcD6QfeqvzumFUtIvrq5oluOhsM1J6AbWY5GuPSwsK0paKQSj8zMC0mFgz3yXxBHvXhfWJhWxbZsq+RW0sgt3ODe+6y2gAABTpJREFUeNrs10+LgmAQBvCh1c0oIwR5b6KCHvQihnqLFIP+0Knl+f4fZWsdS3etrgvO7/QSdHB4Z9556P+xFYn39NXUIvGOuQO0DxKv7V3ABUoSL6gJoBXmDljrJJ4Jt8BtOB1XwMwhMezDAzJFV/YcqA8khiwANyZmaEAuC8JfmzPgB3RnJUAakuhzTkB67BVu+VM40WXUwNzmNy+mxsW9NaK4s3OgNrjfpssk2zTnygeuZ9E4psDJad+8mFSWWI9FIZEU0wh84My3pmwmUuwVvHjmgFaQIIpdYMEReJ2Gbe0iuzkdauDLprFTGeBV/ObNcvXoxbXe/gqsxp5irATYhnxzvENvts/M9pYBO5PGrNCAieJJ9DvRGd6eSxYB7p5Gq/v9IfdZf/ecqE49x5piuv0U+OVgltmGnf4cZ4q5z2feAwYt/Ko378fHKaOo4qRifOr0hHUJ+GRe/yBxTwjxzW4do0wMAmEYHlubYbBRNKRImwvkIN/9r/LHDYuYf2QXtlnWebqIhsxbSIwxxhgz4tDzRIQbeljZZwAh7UIVKv2so+a5pB3RX/KV3u0kpT1ntk6DThK6lSDWSe3k0QsyZSdq1FkXVHlzznHEiUfnX3dyw4/4Zu912lAd9MBAIeukjeO7XXsg66SOk1CllS5inar/9yrjEgs7Os3a6YkHnSSjScsHnRr/g53oyN3aap0G40gBmijWaXSNyJ5i2zhnJ9IGU8iyRVRxznv8ZScJ0v8jWCd1nIRw0GWzTsNZGafihGhlVMk6EeGGBXdu2Knnp+r0x84ZpcwNw0B4sGTZrhNj8tQfWnqBnmfuf5SuE22ztKF9KC3kr7+X1aw1ggzYhECCrz/9M3O6yglf3l70x8+YOV3nNA6mt/35+IdPj5T+v5wmk8lkMplMfolEXLNlTE5ouMaIPyCq4V3xl3JCezffFjFlj6B5UQLQuyQWAbJqJ5DLsaLVm4IyvJgHUh4O1zk15T4HzBiz8lhPgsN5R1YukhpoXlRFZO5BWsHGKomIWveWIuvRJMy5bKd5oEFqd20McswBLbJKTfGxHjTuzlu+IbswhFRA82KjmAKydCIzwvxHQXt2r0x1fTEPkjaLro14zqFlAthnRObhvOc7euPSQgXNC/TQA6q2dpWTN0koXE/zIC5Nk2sjfA5oe0Kr57Q7bxnU2CqtgtULmHIdsjH+sO/Mux9KMvNpHiSToK6N8DmgRW2PFd93u/OedxpWmDYELkcBaAIW1Voasmr4fo4zP7tjo4bTfFTKIq4z4XOGSQr1eY4P5z3P8X/AJgWT39NveiswmUwm39o5mxYFoSgM37ZuRLxdSosWCSmkErjow2gRjJuoDN7//1fm0j1m2UiznbnnWcjZuHl5z8PBhf8Bb7fd7s0oy3oo+shK2b6QCfvYjYDTwgSVxLOeNJ2bZ6Yv4DAVNuI5QFyaOVKDn7Ocm6YtTsBoJ+xkOAfCq5nXyhVvTBU1qIwBxxPWcjkgoHyOfiG7MY62ZrqGwNzqf0BtcmBMkir848ta3pwnNV2E3exXQFyb2c3Xz2o6k5rGgC6W7cgzEJLEBypq1UQNmsXAai8YUWlJRU0oiTSrlm8ouhA4W62mljQHCklL5mf6eWoa5AY4VIJpJaUlTk1Ky3hCqRWALhbTICeAIolflaqaU4HV1GUZPCRVps3pCehiMS+kCjASJyKd3FIwXTIf0BInZAKoVDDvUDRtaDZ+RfkMrVr1WEJWUx+kbpI600/tA6vkfiQwvdBpeT86mQ+4AQpW0y8YsJr+Lt9Y8G9bbqBHhQAAAABJRU5ErkJggg==';
        return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);">
  <tr><td style="background:${headerColor};padding:22px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle">
        <img src="${logoUrl}" alt="FestLift" width="180" height="59" style="display:block;border:0;max-width:180px;" />
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
            const liftInfo = liftMunNum
                ? `Elevador <strong>${this._esc(liftMunNum)}</strong>`
                : 'Elevador não especificado';
            const priorityColor = request.priority === 'high' || request.priority === 'urgent' ? '#c62828' : '#f9a825';
            const clientEmailEsc = this._esc(client?.email || '');
            const body = `
                <p>Foi submetido um novo pedido de servico por um cliente.</p>
                <div style="background:#fff3e0;border-left:4px solid ${priorityColor};border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;"><strong>Pedido:</strong> #${request._id}</p>
                    <p style="margin:0 0 8px 0;"><strong>Descrição:</strong> ${this._esc(request.title)}</p>
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

    // Tecnico atribuido ao pedido — notificacao ao cliente
    async sendTechnicianAssignedNotification(request, technician, client) {
        try {
            const name = this._esc(`${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Cliente');
            const techName = this._esc(`${technician.firstName || ''} ${technician.lastName || ''}`.trim());
            const techEmail = this._esc(technician.email || '');
            const techPhone = this._esc(technician.phone || '');
            const body = `
                <p>Caro(a) <strong>${name}</strong>,</p>
                <p>Um tecnico foi atribuido ao seu pedido de servico e entrara em contacto brevemente.</p>
                <div style="background:#e8f0fe;border-left:4px solid #1565c0;border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#1565c0;">Tecnico responsavel:</p>
                    <p style="margin:0 0 6px 0;"><strong>Nome:</strong> ${techName}</p>
                    ${techPhone ? `<p style="margin:0 0 6px 0;"><strong>Telefone:</strong> ${techPhone}</p>` : ''}
                    <p style="margin:0;"><strong>Email:</strong> ${techEmail}</p>
                </div>
                <div style="background:#f8f9fa;border-radius:6px;padding:14px 18px;margin:16px 0;">
                    <p style="margin:0 0 6px 0;"><strong>Pedido:</strong> #${request._id} — ${this._esc(request.title)}</p>
                    <p style="margin:0;"><strong>Estado:</strong> ${this.getStatusText(request.status)}</p>
                </div>
                <p style="font-size:12px;color:#888;margin-top:24px;">Este e um email automatico — por favor nao responda diretamente.</p>`;
            await this._sendEmail(client.email, `🔧 Tecnico atribuido ao pedido #${request._id} — FestLift`, this._tpl('#1565c0', 'Tecnico Atribuido', body));
            console.log(`✅ Email sent to ${client.email} about technician assignment`);
            await this.sendTechnicianTaskNotification(request, technician);
        } catch (error) {
            console.error('❌ Error sending email:', error);
        }
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
                    <p style="margin:0;"><strong>Elevador:</strong> ${this._esc(request.liftMunicipalNumber || request.liftId || '—')}</p>
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
                <p>O seu pedido de manutencao do elevador foi concluido com sucesso pela nossa equipa tecnica.</p>
                <div style="background:#e8f5e9;border-left:4px solid #2e7d32;border-radius:6px;padding:18px 22px;margin:20px 0;">
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#2e7d32;">Trabalho realizado:</p>
                    <p style="margin:0 0 6px 0;"><strong>Pedido:</strong> #${request._id} — ${this._esc(request.title)}</p>
                    <p style="margin:0 0 6px 0;"><strong>Data de conclusao:</strong> ${new Date(request.completedAt || Date.now()).toLocaleString('pt-PT')}</p>
                    ${request.workDetails ? `<p style="margin:0;"><strong>Detalhes:</strong> ${this._esc(request.workDetails)}</p>` : ''}
                </div>
                <p>Agradecemos a sua confianca nos servicos FestLift. Para quaisquer questoes, nao hesite em contactar-nos.</p>
                <a href="${siteUrl}/pages/client/requests.html" style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:bold;margin-top:8px;">Ver historico →</a>
                <p style="font-size:12px;color:#888;margin-top:24px;">Este e um email automatico — por favor nao responda diretamente.</p>`;
            await this._sendEmail(client.email, `✅ Pedido #${request._id} concluido — FestLift`, this._tpl('#2e7d32', 'Pedido Concluido', body));
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
                <div style="background:linear-gradient(135deg,#1a237e,#1565c0);padding:24px 32px;border-radius:8px 8px 0 0;">
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
