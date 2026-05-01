/**
 * FestLift AI Agent Service
 * 
 * Proactive AI agent with persistent memory.
 * Monitors inspections, notifies admins/dispatchers/clients,
 * waits for confirmation before acting.
 * 
 * Collections used:
 *   agent_notifications  — proactive messages pushed to users
 *   agent_decisions      — memory of decisions (yes/no/postpone + reason)
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

class AgentService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        this.db = null;
        this.io = null;
        // Try gemini-2.5-flash first, fall back if not available
        this.model = 'gemini-2.5-flash';
    }

    /**
     * Must be called once after socket.io is ready.
     * db may be null initially and set later via setDb().
     */
    init(db, io) {
        this.db = db;
        this.io = io;
        if (db) this._ensureIndexes();
        this._scheduleDailyCheck();
        console.log('🤖 AgentService initialized');
    }

    /** Called when MongoDB is ready (async after init). */
    setDb(db) {
        this.db = db;
        this._ensureIndexes();
        console.log('🤖 AgentService: DB connected, indexes ensured.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CORE: Analyse inspection report, create notification for admin/dispatcher
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Called automatically after a new inspection is saved.
     * Analyses the report and, if problems found, sends a proactive
     * notification to admins/dispatchers asking whether to create a quote.
     */
    async analyseInspection(inspection) {
        if (!this.db) return;

        try {
            // Build a readable summary of the checklist NOK items
            const nokItems = this._extractNokItems(inspection.checklist || {});
            const hasProblems = nokItems.length > 0 ||
                (inspection.recommendations && inspection.recommendations.trim().length > 10) ||
                (inspection.generalComments && inspection.generalComments.toLowerCase().includes('anomal'));

            if (!hasProblems) {
                console.log(`🤖 Agent: inspection ${inspection.numero} — no significant problems.`);
                return;
            }

            // Check if there's already an open/postponed notification for this lift
            const existingOpen = await this.db.collection('agent_notifications').findOne({
                liftLocation: inspection.liftLocation,
                type: 'quote_request',
                status: { $in: ['pending', 'postponed'] }
            });

            // Build AI summary of problems
            const summary = await this._buildProblemSummary(inspection, nokItems);

            if (existingOpen) {
                // Update existing notification with new findings
                await this.db.collection('agent_notifications').updateOne(
                    { _id: existingOpen._id },
                    {
                        $push: { relatedReports: inspection.numero },
                        $set: {
                            latestFindings: summary.findings,
                            latestMessage: summary.agentMessage,
                            updatedAt: new Date(),
                            status: 'pending'  // re-activate if was postponed
                        }
                    }
                );
                this._pushToAdmins('agent_update', {
                    notificationId: existingOpen._id,
                    message: summary.agentMessage,
                    liftLocation: inspection.liftLocation,
                    clientName: inspection.clientName || 'desconhecido'
                });
                return;
            }

            // Create new notification
            const notif = {
                type: 'quote_request',
                status: 'pending',
                liftLocation: inspection.liftLocation,
                liftMunicipal: inspection.liftMunicipal || '',
                clientName: inspection.clientName || '',
                clientEmail: inspection.clientEmail || '',
                inspector: inspection.inspector || '',
                relatedReports: [inspection.numero],
                findings: summary.findings,
                agentMessage: summary.agentMessage,
                decision: null,
                decisionReason: null,
                decidedBy: null,
                decidedAt: null,
                remindAt: null,
                orcamentoId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await this.db.collection('agent_notifications').insertOne(notif);

            // Push real-time to all admins and dispatchers
            this._pushToAdmins('agent_new_notification', {
                notificationId: result.insertedId,
                message: summary.agentMessage,
                liftLocation: inspection.liftLocation,
                clientName: inspection.clientName || 'desconhecido',
                findings: summary.findings,
                reportNumber: inspection.numero
            });

            // Also push to client if we have their email/userId
            if (inspection.clientEmail) {
                await this._notifyClient(inspection, summary);
            }

            console.log(`🤖 Agent: created notification for ${inspection.liftLocation}`);
        } catch (err) {
            console.error('🤖 AgentService analyseInspection error:', err.message);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DECISION HANDLING
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin/dispatcher confirms or rejects a notification.
     * action: 'yes' | 'no' | 'postpone'
     */
    async handleDecision(notificationId, action, reason, userId, userRole, ObjectId) {
        if (!this.db) throw new Error('DB not ready');
        const { ObjectId: ObjId } = require('mongodb');
        const id = typeof notificationId === 'string' ? new ObjId(notificationId) : notificationId;

        const notif = await this.db.collection('agent_notifications').findOne({ _id: id });
        if (!notif) throw new Error('Notification not found');

        const now = new Date();
        let remindAt = null;

        if (action === 'postpone') {
            // Parse reason for date hints like "Q3", "setembro", "3 meses"
            remindAt = this._parseRemindDate(reason || '') || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        }

        await this.db.collection('agent_notifications').updateOne(
            { _id: id },
            {
                $set: {
                    status: action === 'yes' ? 'confirmed' : action === 'no' ? 'rejected' : 'postponed',
                    decision: action,
                    decisionReason: reason || '',
                    decidedBy: userId,
                    decidedByRole: userRole,
                    decidedAt: now,
                    remindAt,
                    updatedAt: now
                },
                $push: {
                    decisionHistory: { action, reason: reason || '', by: userId, role: userRole, at: now }
                }
            }
        );

        // Save to long-term memory
        await this.db.collection('agent_decisions').insertOne({
            notificationId: id,
            liftLocation: notif.liftLocation,
            liftMunicipal: notif.liftMunicipal,
            clientEmail: notif.clientEmail,
            clientName: notif.clientName,
            findings: notif.findings,
            action,
            reason: reason || '',
            decidedBy: userId,
            decidedByRole: userRole,
            decidedAt: now,
            remindAt
        });

        let response = '';
        let orcamentoData = null;

        if (action === 'yes') {
            // Generate draft orçamento immediately
            try {
                orcamentoData = await this._createDraftOrcamento(notif, userId);
                const link = `/pages/admin/orcamentos-list.html?highlight=${orcamentoData.numero}`;
                response = `✅ Rascunho **${orcamentoData.numero}** criado para **${notif.clientName}**!\n\n` +
                    `Serviços pré-preenchidos pela IA (${orcamentoData.servicos.length} itens).\n` +
                    `Apenas defina os preços e clique "Enviar ao cliente".\n\n` +
                    `[🔗 Abrir rascunho](${link})`;

                // Push direct link to admins via WebSocket
                this._pushToAdmins('agent_orcamento_ready', {
                    orcamentoId: String(orcamentoData._id),
                    numero: orcamentoData.numero,
                    clientName: notif.clientName,
                    liftLocation: notif.liftLocation,
                    servicos: orcamentoData.servicos,
                    link
                });
            } catch (err) {
                console.error('🤖 Agent: failed to create draft orcamento:', err.message);
                response = `✅ Confirmado! Vou preparar o orçamento para **${notif.clientName}**.\n` +
                    `⚠️ Erro ao criar rascunho automático: ${err.message}\nCrie manualmente em Orçamentos.`;
            }
        } else if (action === 'no') {
            response = `❌ Entendido. Guardei na memória: sem orçamento para ${notif.clientName}${reason ? ' — motivo: ' + reason : ''}.`;
        } else {
            const dateStr = remindAt ? remindAt.toLocaleDateString('pt-PT') : 'em 3 meses';
            response = `⏳ Adiado. Lembrarei em ${dateStr}${reason ? ' — ' + reason : ''}.`;
        }

        return {
            success: true,
            response,
            remindAt,
            status: action === 'yes' ? 'confirmed' : action === 'no' ? 'rejected' : 'postponed',
            orcamento: orcamentoData || null
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHAT: conversational agent for all panels
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Handle a free-text message from any user.
     * Loads context (decisions, inspections, lifts) and responds.
     */
    async chat(userMessage, userId, userRole, clientEmail = null) {
        if (!this.db) throw new Error('DB not ready');

        try {
            const context = await this._buildContext(userRole, clientEmail);
            const model = this.genAI.getGenerativeModel({ model: this.model });

            const systemPrompt = this._buildSystemPrompt(userRole, context);

            const result = await model.generateContent(`${systemPrompt}\n\nMENSAGEM DO UTILIZADOR: ${userMessage}`);
            return result.response.text();
        } catch (err) {
            if (err.message && err.message.includes('model')) {
                // Fallback to older model
                this.model = 'gemini-1.5-flash';
                const model = this.genAI.getGenerativeModel({ model: this.model });
                const context = await this._buildContext(userRole, clientEmail);
                const systemPrompt = this._buildSystemPrompt(userRole, context);
                const result = await model.generateContent(`${systemPrompt}\n\nMENSAGEM DO UTILIZADOR: ${userMessage}`);
                return result.response.text();
            }
            throw err;
        }
    }

    /**
     * Get pending notifications for a user role.
     */
    async getPendingNotifications(userRole, clientEmail = null) {
        if (!this.db) return [];

        if (userRole === 'client') {
            // Clients only see their own lift notifications
            return await this.db.collection('agent_notifications')
                .find({ clientEmail, status: { $in: ['pending', 'postponed'] }, type: { $in: ['quote_request', 'client_reminder'] } })
                .sort({ createdAt: -1 })
                .limit(5)
                .toArray();
        }

        // Admins and dispatchers see all pending
        return await this.db.collection('agent_notifications')
            .find({ status: { $in: ['pending', 'postponed'] } })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();
    }

    /**
     * Get full decision history for a lift/client (for "accumulated issues" feature).
     */
    async getDecisionHistory(liftLocation) {
        if (!this.db) return [];
        return await this.db.collection('agent_decisions')
            .find({ liftLocation })
            .sort({ decidedAt: -1 })
            .toArray();
    }

    /**
     * Build a cumulative quote description from ALL past unresolved findings
     * for a given lift.
     */
    async buildCumulativeQuoteContext(liftLocation) {
        if (!this.db) return null;

        const allFindings = await this.db.collection('agent_notifications').find({
            liftLocation,
            status: { $nin: ['confirmed'] }  // not yet turned into a quote
        }).sort({ createdAt: -1 }).toArray();

        if (allFindings.length === 0) return null;

        const combined = allFindings.map((n, i) =>
            `Relatório ${i + 1} (${n.relatedReports.join(', ')}):\n${n.findings}`
        ).join('\n\n');

        return {
            liftLocation,
            totalReports: allFindings.length,
            combinedFindings: combined,
            clientEmail: allFindings[0].clientEmail,
            clientName: allFindings[0].clientName
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIFT EXPIRY CHECKS (runs daily)
    // ─────────────────────────────────────────────────────────────────────────

    async checkInspectionExpiry() {
        if (!this.db) return;

        try {
            const today = new Date();
            const in15days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);

            // Find lifts whose nextInspectionDate is within 15 days or already past
            const lifts = await this.db.collection('lifts').find({
                nextInspectionDate: { $lte: in15days },
                active: { $ne: false }
            }).limit(50).toArray();

            for (const lift of lifts) {
                if (!lift.nextInspectionDate) continue;
                const daysLeft = Math.ceil((new Date(lift.nextInspectionDate) - today) / (1000 * 60 * 60 * 24));
                const isOverdue = daysLeft < 0;

                // Check if already notified today
                const already = await this.db.collection('agent_notifications').findOne({
                    type: 'expiry_reminder',
                    liftLocation: lift.address || lift.location,
                    createdAt: { $gte: new Date(today.toDateString()) }
                });
                if (already) continue;

                const msg = isOverdue
                    ? `⚠️ INSPEÇÃO VENCIDA há ${Math.abs(daysLeft)} dias — ${lift.address || lift.location} (${lift.municipalNumber || ''}). Cliente: ${lift.clientName || lift.clientEmail || 'desconhecido'}.`
                    : `🔔 Inspeção expira em ${daysLeft} dias — ${lift.address || lift.location}. Cliente: ${lift.clientName || lift.clientEmail || 'desconhecido'}.`;

                const notif = {
                    type: 'expiry_reminder',
                    status: 'pending',
                    liftLocation: lift.address || lift.location,
                    liftMunicipal: lift.municipalNumber || '',
                    clientName: lift.clientName || '',
                    clientEmail: lift.clientEmail || '',
                    daysLeft,
                    isOverdue,
                    agentMessage: msg,
                    findings: `Inspeção prevista para ${new Date(lift.nextInspectionDate).toLocaleDateString('pt-PT')}.`,
                    relatedReports: [],
                    decision: null, decidedBy: null, decidedAt: null,
                    createdAt: new Date(), updatedAt: new Date()
                };

                const result = await this.db.collection('agent_notifications').insertOne(notif);

                this._pushToAdmins('agent_new_notification', {
                    notificationId: result.insertedId,
                    message: msg,
                    liftLocation: notif.liftLocation,
                    clientName: notif.clientName,
                    type: 'expiry_reminder',
                    daysLeft
                });

                // Push to client directly if possible
                if (lift.clientEmail) {
                    this._pushToClient(lift.clientEmail, 'agent_reminder', {
                        message: isOverdue
                            ? `A inspeção do seu elevador em ${lift.address || lift.location} está VENCIDA há ${Math.abs(daysLeft)} dias. Por favor contacte-nos.`
                            : `A inspeção do seu elevador em ${lift.address || lift.location} expira em ${daysLeft} dias.`,
                        liftLocation: lift.address || lift.location,
                        daysLeft
                    });
                }
            }

            // Check postponed decisions that are due
            const duePostponed = await this.db.collection('agent_notifications').find({
                status: 'postponed',
                remindAt: { $lte: today }
            }).toArray();

            for (const n of duePostponed) {
                await this.db.collection('agent_notifications').updateOne(
                    { _id: n._id },
                    { $set: { status: 'pending', updatedAt: new Date() } }
                );
                this._pushToAdmins('agent_new_notification', {
                    notificationId: n._id,
                    message: `🔔 Lembrete (adiado anteriormente): ${n.agentMessage}`,
                    liftLocation: n.liftLocation,
                    clientName: n.clientName,
                    type: 'postpone_reminder'
                });
            }

            console.log(`🤖 Agent daily check: ${lifts.length} lifts checked, ${duePostponed.length} reminders reactivated.`);
        } catch (err) {
            console.error('🤖 AgentService expiry check error:', err.message);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DRAFT ORÇAMENTO CREATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Uses Gemini to generate servicos[] from findings, then inserts a draft
     * orçamento (all prices = 0) into the DB.
     * The admin only needs to fill in prices before sending.
     */
    async _createDraftOrcamento(notif, createdByUserId) {
        // 1. Generate servicos list via Gemini
        const servicos = await this._generateServicos(notif.findings, notif.liftLocation);

        // 2. Build orçamento document (mirrors the POST /api/orcamentos format)
        const now = new Date();
        const validadeAte = new Date(now);
        validadeAte.setDate(validadeAte.getDate() + 30);

        const ano = now.getFullYear();
        const mes = String(now.getMonth() + 1).padStart(2, '0');

        // Auto-generate number
        const prefix = `ORC-${ano}-${mes}-`;
        const last = await this.db.collection('orcamentos')
            .find({ numero: new RegExp(`^${prefix}`) })
            .sort({ numero: -1 })
            .limit(1)
            .toArray();
        let seq = 1;
        if (last.length > 0) {
            const m = last[0].numero.match(/ORC-\d{4}-\d{2}-(\d{3})/);
            if (m) seq = parseInt(m[1]) + 1;
        }
        const numero = `${prefix}${String(seq).padStart(3, '0')}`;

        const orcamento = {
            numero,
            data: now.toISOString(),
            validadeAte: validadeAte.toISOString(),
            cliente: {
                nome:   notif.clientName  || 'Desconhecido',
                email:  notif.clientEmail || '',
                morada: notif.liftLocation || ''
            },
            servicos,   // prices all 0 — admin fills later
            subtotal: 0,
            iva: 0,
            total: 0,
            notas: `Rascunho gerado automaticamente pela IA em ${now.toLocaleDateString('pt-PT')} com base no relatório ${(notif.relatedReports || []).join(', ')}.\nDefina os preços de cada item e envie ao cliente.`,
            status: 'rascunho',
            geradoPorAI: true,
            agentNotificationId: notif._id ? String(notif._id) : null,
            liftMunicipal: notif.liftMunicipal || '',
            criadoPor: 'Agente IA',
            criadoPorId: createdByUserId || null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };

        const result = await this.db.collection('orcamentos').insertOne(orcamento);
        console.log(`🤖 Agent: draft orçamento ${numero} created for ${notif.clientName}`);

        // Update notification with orcamentoId
        if (notif._id) {
            await this.db.collection('agent_notifications').updateOne(
                { _id: notif._id },
                { $set: { orcamentoId: result.insertedId, updatedAt: new Date() } }
            );
        }

        return { ...orcamento, _id: result.insertedId };
    }

    /**
     * Calls Gemini to convert findings text → structured servicos[] array.
     * All precoUnitario = 0 (admin fills later).
     */
    async _generateServicos(findings, liftLocation) {
        // Fallback if no API key
        if (!process.env.GEMINI_API_KEY) {
            return [{
                descricao: findings || 'Serviços de manutenção/reparação — ver relatório técnico',
                quantidade: 1,
                precoUnitario: 0,
                total: 0
            }];
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: this.model });
            const prompt = `Analisa estes problemas detetados num elevador e cria uma lista de serviços para orçamento.

PROBLEMAS DETETADOS:
${findings}

INSTRUÇÕES:
- Cria entre 2 e 8 linhas de serviço
- Cada linha: trabalho específico OU peça necessária
- NUNCA inventes preços — usa 0 para todos os preços
- Usa terminologia técnica portuguesa de elevadores
- Separa mão-de-obra de materiais/peças quando possível
- Formato EXATO (JSON, sem texto extra):

[
  {"descricao": "Substituição de rolamento do motor de tração SKF 6308-2RS1", "quantidade": 1, "precoUnitario": 0, "total": 0},
  {"descricao": "Mão de obra — desmontagem, montagem e alinhamento do motor", "quantidade": 4, "precoUnitario": 0, "total": 0}
]

Responde APENAS com o JSON, sem introdução nem explicação.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();

            // Parse JSON — handle markdown code blocks
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(clean);

            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map(s => ({
                    descricao: s.descricao || 'Serviço de manutenção',
                    quantidade: parseInt(s.quantidade) || 1,
                    precoUnitario: 0,  // ALWAYS 0 — admin fills
                    total: 0
                }));
            }
        } catch (err) {
            console.warn('🤖 Agent _generateServicos fallback:', err.message);
        }

        // Fallback
        return [{
            descricao: `Reparação — ${liftLocation}: ${(findings || '').substring(0, 120)}`,
            quantidade: 1,
            precoUnitario: 0,
            total: 0
        }];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    _extractNokItems(checklist) {
        const nok = [];
        const walkObj = (obj, prefix = '') => {
            if (!obj || typeof obj !== 'object') return;
            for (const [key, val] of Object.entries(obj)) {
                if (val && typeof val === 'object') {
                    if (val.status && (val.status === 'NOK' || val.status === 'nok' || val.status === 'fail')) {
                        nok.push({ item: prefix + key, comment: val.comment || val.note || '' });
                    } else {
                        walkObj(val, prefix + key + '.');
                    }
                } else if (typeof val === 'string' && (val === 'NOK' || val === 'nok' || val === 'fail')) {
                    nok.push({ item: prefix + key, comment: '' });
                }
            }
        };
        walkObj(checklist);
        return nok;
    }

    async _buildProblemSummary(inspection, nokItems) {
        const nokText = nokItems.map(i => `• ${i.item}${i.comment ? ': ' + i.comment : ''}`).join('\n') || 'Ver observações gerais';
        const fullText = `
Relatório: ${inspection.numero}
Local: ${inspection.liftLocation}
Cliente: ${inspection.clientName || inspection.clientEmail || 'desconhecido'}
Técnico: ${inspection.inspector}
Tipo: ${inspection.visitType}
Itens NOK: ${nokText}
Recomendações: ${inspection.recommendations || 'nenhuma'}
Observações: ${inspection.generalComments || 'nenhuma'}
`;
        let findings = nokText;
        let agentMessage = '';

        if (process.env.GEMINI_API_KEY) {
            try {
                const model = this.genAI.getGenerativeModel({ model: this.model });
                const prompt = `Analisa este relatório técnico de elevador e resume os problemas encontrados em 2-4 frases concisas em Português de Portugal. Menciona apenas factos do relatório. Não inventes dados.

${fullText}

Responde APENAS com o resumo dos problemas, sem introdução.`;
                const result = await model.generateContent(prompt);
                findings = result.response.text().trim();
            } catch (_) { /* use raw text */ }
        }

        agentMessage = `🤖 Detetei problemas no relatório **${inspection.numero}**:\n` +
            `📍 **${inspection.liftLocation}** — Cliente: **${inspection.clientName || inspection.clientEmail || 'desconhecido'}**\n\n` +
            `${findings}\n\nCriar orçamento para correção?`;

        return { findings, agentMessage };
    }

    async _notifyClient(inspection, summary) {
        // Find user by email to push via websocket room user_${id}
        const user = await this.db.collection('users').findOne({ email: inspection.clientEmail.toLowerCase() });
        if (!user) return;

        const clientMsg = `🤖 O técnico ${inspection.inspector} registou problemas no seu elevador em ${inspection.liftLocation}. `
            + `Pretende receber um orçamento de reparação?`;

        // Create client-facing notification
        await this.db.collection('agent_notifications').insertOne({
            type: 'client_reminder',
            status: 'pending',
            liftLocation: inspection.liftLocation,
            clientEmail: inspection.clientEmail,
            clientName: inspection.clientName || '',
            agentMessage: clientMsg,
            findings: summary.findings,
            relatedReports: [inspection.numero],
            targetUserId: user._id,
            decision: null, decidedBy: null, decidedAt: null,
            createdAt: new Date(), updatedAt: new Date()
        });

        if (this.io) {
            this.io.to(`user_${user._id}`).emit('agent_new_notification', {
                message: clientMsg,
                type: 'client_reminder',
                liftLocation: inspection.liftLocation
            });
        }
    }

    _pushToAdmins(event, data) {
        if (!this.io) return;
        this.io.to('role_admin').emit(event, data);
        this.io.to('role_dispatcher').emit(event, data);
    }

    _pushToClient(clientEmail, event, data) {
        if (!this.io || !this.db) return;
        this.db.collection('users').findOne({ email: clientEmail.toLowerCase() }).then(user => {
            if (user) this.io.to(`user_${user._id}`).emit(event, data);
        }).catch(() => {});
    }

    async _buildContext(userRole, clientEmail) {
        const ctx = { role: userRole };
        try {
            if (userRole === 'client' && clientEmail) {
                ctx.pendingNotifications = await this.db.collection('agent_notifications')
                    .find({ clientEmail, status: 'pending' }).sort({ createdAt: -1 }).limit(5).toArray();
                ctx.recentDecisions = await this.db.collection('agent_decisions')
                    .find({ clientEmail }).sort({ decidedAt: -1 }).limit(5).toArray();
                ctx.orcamentos = await this.db.collection('orcamentos')
                    .find({ 'cliente.email': clientEmail })
                    .sort({ createdAt: -1 }).limit(10).toArray();
            } else {
                ctx.pendingNotifications = await this.db.collection('agent_notifications')
                    .find({ status: 'pending' }).sort({ createdAt: -1 }).limit(10).toArray();
                ctx.recentDecisions = await this.db.collection('agent_decisions')
                    .find({}).sort({ decidedAt: -1 }).limit(10).toArray();
                ctx.orcamentos = await this.db.collection('orcamentos')
                    .find({}).sort({ createdAt: -1 }).limit(20).toArray();
            }
        } catch (_) {}
        return ctx;
    }

    _buildSystemPrompt(userRole, context) {
        const pending = (context.pendingNotifications || [])
            .map(n => `- ${n.liftLocation}: ${n.agentMessage}`)
            .join('\n') || 'Nenhuma pendente.';

        const decisions = (context.recentDecisions || [])
            .map(d => `- ${d.liftLocation}: ${d.action} (${d.reason || 'sem motivo'}) em ${d.decidedAt ? new Date(d.decidedAt).toLocaleDateString('pt-PT') : '?'}`)
            .join('\n') || 'Nenhuma.';

        const orcamentos = (context.orcamentos || [])
            .map(o => {
                const data = o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-PT') : '?';
                const servicos = (o.servicos || []).map(s => `${s.descricao} (${s.quantidade}x ${s.precoUnitario}€)`).join(', ');
                return `- ${o.numero || o._id}: ${o.cliente?.nome || '?'} | ${o.status} | ${o.total || 0}€ | ${data}${servicos ? ' | Serviços: ' + servicos : ''}`;
            })
            .join('\n') || 'Nenhum orçamento registado.';

        const roleDesc = {
            admin: 'administrador do sistema com acesso total',
            dispatcher: 'despachante que gere orçamentos e técnicos',
            technician: 'técnico de manutenção de elevadores',
            client: 'cliente proprietário de elevadores'
        }[userRole] || 'utilizador';

        return `És o assistente de IA do FestLift, sistema de gestão de elevadores em Portugal.
Falas em Português de Portugal (pt-PT). Nunca uses Português do Brasil.
O utilizador é ${roleDesc}.

NOTIFICAÇÕES PENDENTES:
${pending}

DECISÕES RECENTES:
${decisions}

ORÇAMENTOS (dados reais da base de dados):
${orcamentos}

REGRAS:
- Nunca crias orçamentos ou tomas ações sem confirmação explícita
- Se o utilizador diz "sim" a um orçamento, confirma e informa que será preparado
- Se o utilizador adia, pergunta quando quer ser lembrado
- Podes responder a perguntas técnicas sobre elevadores, normas EN 81-20, ISO 10816-3
- Sê conciso e profissional
- Para clientes: usa linguagem simples, não técnica
- Quando listares orçamentos, apresenta-os em formato legível com número, cliente, estado e valor`;
    }

    _parseRemindDate(reason) {
        const r = reason.toLowerCase();
        const now = new Date();

        if (r.includes('q1')) return new Date(now.getFullYear() + (now.getMonth() >= 3 ? 1 : 0), 0, 1);
        if (r.includes('q2')) return new Date(now.getFullYear() + (now.getMonth() >= 6 ? 1 : 0), 3, 1);
        if (r.includes('q3')) return new Date(now.getFullYear() + (now.getMonth() >= 9 ? 1 : 0), 6, 1);
        if (r.includes('q4')) return new Date(now.getFullYear() + (now.getMonth() >= 12 ? 1 : 0), 9, 1);
        if (r.includes('setem') || r.includes('sept')) return new Date(now.getFullYear() + (now.getMonth() >= 9 ? 1 : 0), 8, 1);
        if (r.includes('janei') || r.includes('jan')) return new Date(now.getFullYear() + 1, 0, 1);
        if (r.includes('março') || r.includes('march')) return new Date(now.getFullYear() + (now.getMonth() >= 3 ? 1 : 0), 2, 1);

        // "3 meses" / "2 semanas" etc.
        const monthMatch = r.match(/(\d+)\s*m[êe]s/);
        if (monthMatch) return new Date(now.getTime() + parseInt(monthMatch[1]) * 30 * 24 * 60 * 60 * 1000);

        const weekMatch = r.match(/(\d+)\s*semana/);
        if (weekMatch) return new Date(now.getTime() + parseInt(weekMatch[1]) * 7 * 24 * 60 * 60 * 1000);

        return null;
    }

    async _ensureIndexes() {
        try {
            await this.db.collection('agent_notifications').createIndex({ status: 1, createdAt: -1 });
            await this.db.collection('agent_notifications').createIndex({ clientEmail: 1, status: 1 });
            await this.db.collection('agent_notifications').createIndex({ liftLocation: 1, type: 1 });
            await this.db.collection('agent_notifications').createIndex({ remindAt: 1 }, { sparse: true });
            await this.db.collection('agent_decisions').createIndex({ liftLocation: 1 });
            await this.db.collection('agent_decisions').createIndex({ clientEmail: 1 });
        } catch (_) {}
    }

    _scheduleDailyCheck() {
        // Run immediately on startup, then every 24h
        setTimeout(() => this.checkInspectionExpiry(), 10000);
        setInterval(() => this.checkInspectionExpiry(), 24 * 60 * 60 * 1000);
    }
}

module.exports = new AgentService();
