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
const fs = require('fs');
const path = require('path');
const { parseReport } = require('./pdf-parser-unified');

class AgentService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        this.db = null;
        this.io = null;
        this.model = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash';
        this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
        this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma4:12b-it-qat';
        this.ollamaModelCandidates = String(process.env.OLLAMA_MODEL_CANDIDATES || `${this.ollamaModel},qwen2.5:7b,qwen2.5:3b`)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        this.ollamaFastModelCandidates = String(process.env.OLLAMA_CHAT_FAST_MODEL_CANDIDATES || 'qwen2.5:3b,qwen2.5:7b,gemma4:12b-it-qat')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        this.ollamaOptions = {
            temperature: Number(process.env.OLLAMA_TEMPERATURE || 0.2),
            top_p: Number(process.env.OLLAMA_TOP_P || 0.9),
            repeat_penalty: Number(process.env.OLLAMA_REPEAT_PENALTY || 1.05),
            num_ctx: Number(process.env.OLLAMA_NUM_CTX || 8192),
            num_predict: Number(process.env.OLLAMA_NUM_PREDICT || 512)
        };
        this.ollamaModelCache = { value: this.ollamaModel, expiresAt: 0 };
        this.ollamaFastModelCache = { value: this.ollamaFastModelCandidates[0] || this.ollamaModel, expiresAt: 0 };
        this.chatMemoryLimit = Math.max(2, Number(process.env.ASSISTANT_CHAT_MEMORY_TURNS || 6));
        this.chatMemoryMap = new Map();
        this.ragMaxSnippets = Math.max(1, Number(process.env.ASSISTANT_RAG_MAX_SNIPPETS || 3));
        this.ragCacheTtlMs = Math.max(60_000, Number(process.env.ASSISTANT_RAG_CACHE_MS || 10 * 60 * 1000));
        this.ragSourcePaths = String(process.env.ASSISTANT_RAG_PATHS || 'docs/ai,docs/ops,NEXT_PRIORITY.md')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        this.ragCache = { snippets: [], expiresAt: 0 };
        this.clientFocusByUser = new Map();
        this.aiProvider = (process.env.AI_PROVIDER || 'auto').toLowerCase();
    }

    _toObjectIdMaybe(value) {
        try {
            if (!value) return null;
            const { ObjectId } = require('mongodb');
            if (value instanceof ObjectId) return value;
            return new ObjectId(String(value));
        } catch (_) {
            return null;
        }
    }

    _buildLiftRoleQuery(role, userEmail, userId) {
        const notDeleted = { deletedAt: { $exists: false } };
        const email = String(userEmail || '').toLowerCase();
        const objId = this._toObjectIdMaybe(userId);
        const idVariants = [String(userId || '')].filter(Boolean);
        if (objId) idVariants.push(objId);

        if (role === 'client') {
            const orConds = [
                ...(email ? [{ clientEmail: email }, { 'client.email': email }] : []),
                ...idVariants.map(v => ({ client: v })),
                ...idVariants.map(v => ({ clientId: v }))
            ];
            return orConds.length > 0 ? { $and: [notDeleted, { $or: orConds }] } : notDeleted;
        }

        if (role === 'technician') {
            const orConds = [
                ...idVariants.map(v => ({ assignedTechnician: v })),
                ...idVariants.map(v => ({ assignedTo: v })),
                ...idVariants.map(v => ({ technicianId: v })),
                ...idVariants.map(v => ({ technician: v })),
                ...(email ? [{ technicianEmail: email }, { assignedTechnicianEmail: email }] : [])
            ];
            return orConds.length > 0 ? { $and: [notDeleted, { $or: orConds }] } : notDeleted;
        }

        return notDeleted;
    }

    _setClientFocus(userId, client) {
        if (!userId || !client) return;
        this.clientFocusByUser.set(String(userId), {
            id: String(client._id),
            email: String(client.email || '').toLowerCase(),
            name: [client.firstName, client.lastName].filter(Boolean).join(' ') || client.companyName || client.name || client.username || client.email
        });
    }

    _getClientFocus(userId) {
        if (!userId) return null;
        return this.clientFocusByUser.get(String(userId)) || null;
    }

    _getAssistantRoleProfile(role = 'user') {
        const profiles = {
            client: {
                label: 'Assistente do Cliente',
                purpose: 'explicar estado, próximos passos e ações simples',
                capabilities: [
                    'resumo dos seus elevadores, pedidos e inspeções',
                    'alertas de inspeção vencida ou a vencer',
                    'explicação simples de orçamentos e notificações',
                    'respostas curtas para mensagens e confirmações'
                ],
                limits: [
                    'não expõe dados de outros clientes',
                    'não executa ações sem confirmação'
                ],
                quickActions: [
                    'meus elevadores',
                    'meus pedidos',
                    'próximas inspeções',
                    'o que tenho pendente',
                    'resumo da minha conta'
                ]
            },
            dispatcher: {
                label: 'Assistente do Despacho',
                purpose: 'priorizar trabalho, coordenar técnicos e preparar comunicação',
                capabilities: [
                    'priorização de pedidos e inspeções',
                    'resumos de orçamentos, alertas e carga operacional',
                    'mensagens para cliente e equipa interna',
                    'apoio à distribuição de tarefas'
                ],
                limits: [
                    'não confirma ações finais sem validação humana',
                    'não altera dados sensíveis diretamente'
                ],
                quickActions: [
                    'pedidos em aberto',
                    'inspeções recentes',
                    'alertas pendentes',
                    'resumo operacional',
                    'priorizar por risco'
                ]
            },
            technician: {
                label: 'Assistente do Técnico',
                purpose: 'ajudar no diagnóstico, checklist e fecho seguro da intervenção',
                capabilities: [
                    'checklists de visita técnica',
                    'perguntas de diagnóstico por tipo de falha',
                    'histórico do elevador e inspeções ligadas',
                    'respostas rápidas para anomalias e segurança'
                ],
                limits: [
                    'não substitui inspeção física',
                    'não autoriza desmontagens ou imobilizações sem validação'
                ],
                quickActions: [
                    'checklist de visita',
                    'perguntas de diagnóstico',
                    'últimas inspeções',
                    'alertas do meu trabalho',
                    'resumo técnico'
                ]
            },
            admin: {
                label: 'Assistente de Administração',
                purpose: 'dar visão global, controlo e decisões com risco/impacto',
                capabilities: [
                    'visão geral do sistema e métricas',
                    'incidentes, tendências e alertas críticos',
                    'orçamentos, aprovações e catálogo de serviços',
                    'controlo de permissões e operação'
                ],
                limits: [
                    'mantém confirmação para ações sensíveis',
                    'não mascara problemas operacionais'
                ],
                quickActions: [
                    'visão geral',
                    'incidentes críticos',
                    'orçamentos por estado',
                    'catálogo de serviços',
                    'saúde do assistente'
                ]
            }
        };

        return profiles[role] || {
            label: 'Assistente Base',
            purpose: 'orientar o utilizador no sistema',
            capabilities: ['responder perguntas gerais com contexto disponível'],
            limits: ['respeita as permissões do utilizador'],
            quickActions: ['ajuda', 'resumo', 'o que posso fazer']
        };
    }

    _buildRoleAssistantHelp(role = 'user') {
        const profile = this._getAssistantRoleProfile(role);
        const actions = profile.quickActions.map(a => `• ${a}`).join('\n');
        const capabilities = profile.capabilities.map(a => `• ${a}`).join('\n');
        return [
            `🤖 **${profile.label}**`,
            `Objetivo: ${profile.purpose}.`,
            '',
            '**Posso ajudar com:**',
            capabilities,
            '',
            '**Comandos rápidos:**',
            actions,
            '',
            '**Limites:**',
            ...profile.limits.map(a => `• ${a}`)
        ].join('\n');
    }

    _toDate(raw) {
        if (!raw) return null;
        const date = raw instanceof Date ? new Date(raw.getTime()) : new Date(raw);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    _getLatestInspectionRecord(lift) {
        const records = Array.isArray(lift?.inspectionHistory) ? lift.inspectionHistory : [];
        if (!records.length) return null;

        let latest = null;
        let latestTs = -Infinity;

        for (const record of records) {
            const date = this._toDate(record?.date || record?.inspectionDate);
            if (!date) continue;
            const ts = date.getTime();
            if (!latest || ts > latestTs) {
                latest = record;
                latestTs = ts;
            }
        }

        return latest;
    }

    _getEffectiveNextInspectionDate(lift) {
        const latest = this._getLatestInspectionRecord(lift);

        const explicitCandidates = [
            lift?.nextInspectionDate,
            lift?.licenseExpiry,
            lift?.certExpiry,
            latest?.validUntil,
            latest?.nextInspectionDate
        ];

        for (const candidate of explicitCandidates) {
            const date = this._toDate(candidate);
            if (date) return date;
        }

        const baseDate =
            this._toDate(latest?.date || latest?.inspectionDate) ||
            this._toDate(lift?.lastInspectionDate) ||
            this._toDate(lift?.licenseDate) ||
            this._toDate(lift?.certDate) ||
            this._toDate(lift?.lastMaintenance) ||
            null;

        if (!baseDate) return null;

        const result = new Date(baseDate.getTime());
        const certType = String(latest?.certType || '').toLowerCase();
        const status = String(lift?.inspectionStatus || latest?.status || '').toLowerCase();
        const c1 = Number(latest?.c1Count || 0);
        const c2 = Number(latest?.c2Count || 0);

        if (certType === 'cert_2_years' || status === 'passed' || (!lift?.inspectionStatus && !latest?.status)) {
            result.setFullYear(result.getFullYear() + 2);
        } else if (
            certType === 'reinspection' ||
            certType === 'immobilization' ||
            status === 'failed' ||
            status === 'conditional' ||
            c1 > 0 ||
            c2 > 0
        ) {
            result.setDate(result.getDate() + 30);
        } else {
            result.setDate(result.getDate() + 180);
        }

        return result;
    }

    _getClientLiftAddress(lift) {
        if (typeof lift?.address === 'object' && lift.address) {
            return `${lift.address?.street || ''}, ${lift.address?.city || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || lift.location || lift.municipalNumber || String(lift._id || '');
        }
        return lift?.address || lift?.location || lift?.municipalNumber || String(lift?._id || '');
    }

    _looksLikeClientNameQuery(normalizedMsg = '') {
        const tokens = String(normalizedMsg || '').split(/\s+/).filter(Boolean);
        if (tokens.length < 2 || tokens.length > 4) return false;
        // Conversational / question words that are NOT client names
        const stop = new Set([
            'lista', 'listar', 'mostra', 'mostrar', 'dados', 'cliente', 'sobre',
            'tudo', 'info', 'informacoes', 'elevadores', 'lifts', 'pedidos', 'resumo',
            // Portuguese question / pronoun words
            'como', 'qual', 'quais', 'quem', 'onde', 'quando', 'porque', 'podes',
            'podes', 'pode', 'tens', 'tem', 'tens', 'voce', 'tu', 'eu', 'nos',
            'eles', 'elas', 'este', 'essa', 'isso', 'aqui', 'ali',
            'se', 'me', 'te', 'lhe', 'nos', 'vos', 'lhes',
            'chamas', 'chama', 'chamo', 'nome', 'chamar', 'dizer', 'diz',
            'fazer', 'faz', 'fazer', 'ajudar', 'ajuda', 'preciso', 'quero',
            'sou', 'sao', 'esta', 'estao', 'ser', 'ter', 'haver',
        ]);
        const technical = new Set([
            'motor', 'geared', 'gearless', 'mrl', 'hydraulic', 'hidraulico',
            'tracao', 'traction', 'porta', 'portas', 'guilhotina', 'patim',
            'cabina', 'semi', 'automatica', 'en81', 'norma',
            'inspecao', 'manutencao', 'maintenance', 'elevador', 'lift'
        ]);
        if (tokens.some(t => stop.has(t) || technical.has(t))) return false;
        const alpha = tokens.filter(t => /^[a-z][a-z.-]{1,}$/.test(t));
        return alpha.length >= 2;
    }

    _isTechnicalTermQuery(normalizedMsg = '') {
        const m = this._normText(normalizedMsg || '');
        return /(motor|geared|gearless|mrl|hydraulic|hidraulico|tracao|traction|porta|portas|guilhotina|patim|cabina|semi ?automat|automatica|automatica|en\s*81|norma|manutencao|maintenance|inspecao|inspection|elevador|lift)/.test(m);
    }

    _isGenerativeDraftRequest(normalizedMsg = '') {
        const m = this._normText(normalizedMsg || '');
        return /(cria|escreve|gera|redige|resume|resumo|propoe|template|plano de acao|checklist|perguntas de diagnostico|mensagem para|email curto|obrigacoes|priorizar|diagnostico)/.test(m);
    }

    _quickChatFallback(userMessage = '', userRole = 'user') {
        const m = this._normText(userMessage || '');
        const roleHint = userRole === 'client'
            ? 'Abra Pedidos/Orcamentos no seu painel para confirmar dados reais antes de enviar.'
            : 'Valide no painel os dados reais (cliente/elevador/prazos) antes de executar.';

        if (/(email|mensagem|template|resposta)/.test(m)) {
            return [
                'Assunto: Inspecao pendente do elevador',
                '',
                'Exmo.(a) Cliente,',
                'Identificamos que a inspecao do elevador se encontra pendente. Solicitamos confirmacao para agendar regularizacao com prioridade.',
                'Assim que confirmar, enviamos data e janela de intervencao.',
                '',
                `Nota: ${roleHint}`
            ].join('\n');
        }

        if (/(plano de acao|porta|anomalia|priorizar|prioridade|checklist)/.test(m)) {
            return [
                'Plano curto (prioridade):',
                '1) Isolar risco de seguranca e confirmar estado operacional.',
                '2) Recolher sintomas, historico e frequencia da falha.',
                '3) Validar componentes criticos (porta/travao/limitador conforme o caso).',
                '4) Definir acao imediata e acao definitiva com prazo.',
                '5) Comunicar impacto e ETA ao cliente.',
                '6) Revalidar apos intervencao e fechar com evidencias.',
                '',
                `Nota: ${roleHint}`
            ].join('\n');
        }

        return `Resposta rapida indisponivel no momento. ${roleHint}`;
    }

    _quickDraftReply(userMessage = '', userRole = 'user') {
        const m = this._normText(userMessage || '');
        const roleHint = userRole === 'client'
            ? 'Adapte com os dados reais do seu pedido.'
            : 'Adapte com os dados reais do elevador e do cliente.';

        if (/(email|mensagem|template|resposta)/.test(m)) {
            return [
                'Assunto: Inspecao pendente do elevador',
                '',
                'Exmo.(a) Cliente,',
                'Identificamos que a inspecao do elevador se encontra pendente. Solicitamos confirmacao para agendar a regularizacao com prioridade.',
                'Assim que confirmar, enviamos data e janela de intervencao.',
                '',
                `Nota: ${roleHint}`
            ].join('\n');
        }

        if (/(plano de acao|priorizar|prioridade|checklist|falha recorrente|anomalia|risco|porta|travao|travão)/.test(m)) {
            return [
                'Plano curto (prioridade):',
                '1) Confirmar risco imediato e, se necessario, isolar o equipamento.',
                '2) Registar sintomas, frequencia e impacto operacional.',
                '3) Verificar os componentes criticos associados ao problema.',
                '4) Definir acao provisoria e correcao definitiva.',
                '5) Informar o cliente sobre impacto, prioridade e ETA.',
                '6) Testar e validar a solucao antes de fechar a intervencao.',
                '',
                `Nota: ${roleHint}`
            ].join('\n');
        }

        if (/(obrigacoes|obrigação|obrigacoes principais|manutencao mensal|manutenção mensal|ascensores|ascensor)/.test(m)) {
            return [
                'Obrigações principais (5 pontos):',
                '1) Fazer inspeção visual e funcional dos componentes principais.',
                '2) Registar anomalias e ações corretivas em relatório.',
                '3) Confirmar funcionamento dos dispositivos de segurança.',
                '4) Executar manutenção preventiva e substituir consumíveis críticos quando necessário.',
                '5) Comunicar ao cliente o que foi verificado, o que falta e o próximo passo.',
                '',
                `Nota: ${roleHint}`
            ].join('\n');
        }

        if (/(perguntas|diagnostico|diagnóstico|ordem de intervencao|ordem de intervenção)/.test(m)) {
            return [
                'Perguntas de diagnóstico (7):',
                '1) Quando começou a falha e com que frequência acontece?',
                '2) O equipamento fica parado ou continua a operar com limitações?',
                '3) Houve alarmes, ruídos ou mensagens no quadro?',
                '4) A falha acontece em alguma porta, piso ou horário específico?',
                '5) Já houve intervenção recente no mesmo componente?',
                '6) O que o cliente observou antes da avaria?',
                '7) Existe risco de segurança ou necessidade de imobilização imediata?',
                '',
                `Nota: ${roleHint}`
            ].join('\n');
        }

        return null;
    }

    async _respondFromFocusedClient(userId, normalizedMsg) {
        const focus = this._getClientFocus(userId);
        if (!focus) return null;

        if (/(dados|detalhes|info|informacoes|інфо|дані|data)/.test(normalizedMsg)) {
            const c = await this.db.collection('users').findOne({ _id: this._toObjectIdMaybe(focus.id) }, { projection: { password: 0, passwordHash: 0 } });
            if (!c) return '⚠️ Contexto de cliente expirou. Indique novamente o nome do cliente.';
            const liftsCount = await this.db.collection('lifts').countDocuments({ $or: [{ clientEmail: focus.email }, { client: c._id }, { client: String(c._id) }] });
            const openReq = await this.db.collection('requests').countDocuments({
                $or: [{ clientEmail: focus.email }, { clientId: c._id }, { clientId: String(c._id) }],
                status: { $in: ['open', 'pending', 'assigned', 'in-progress', 'in_progress'] }
            });
            return `👤 **${focus.name}**\n📧 ${c.email || '—'}\n📞 ${c.phone || '—'}\n🏢 Elevadores: **${liftsCount}**\n📩 Pedidos ativos: **${openReq}**`;
        }

        if (/(lifts|elevadores|elevador|ліфти|лифты)/.test(normalizedMsg)) {
            const lifts = await this.db.collection('lifts')
                .find({ $or: [{ clientEmail: focus.email }, { client: focus.id }, { client: this._toObjectIdMaybe(focus.id) }] })
                .sort({ createdAt: -1 })
                .limit(25)
                .toArray();

            if (!lifts.length) return `🏢 Não encontrei elevadores para **${focus.name}**.`;

            const rows = lifts.map(l => {
                const next = l.nextInspectionDate ? new Date(l.nextInspectionDate).toLocaleDateString('pt-PT') : '—';
                return `- ${l.municipalNumber || l.location || l.name || l._id} | Próx. insp: ${next}`;
            }).join('\n');
            return `🏢 **Elevadores de ${focus.name}** (${lifts.length}):\n\n${rows}`;
        }

        if (/(pedidos|pedido|requests|request|запити|заявки)/.test(normalizedMsg)) {
            const reqs = await this.db.collection('requests')
                .find({
                    $or: [
                        { clientEmail: focus.email },
                        { clientId: focus.id },
                        { clientId: this._toObjectIdMaybe(focus.id) }
                    ]
                })
                .sort({ createdAt: -1 })
                .limit(20)
                .toArray();

            if (!reqs.length) return `📩 Não encontrei pedidos para **${focus.name}**.`;

            const rows = reqs.map(r => {
                const data = r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-PT') : '?';
                const st = r.status || 'n/d';
                const title = r.title || r.description || r.type || 'Pedido';
                return `- ${r.requestNumber || r._id} | ${st} | ${String(title).slice(0, 60)} | ${data}`;
            }).join('\n');

            return `📩 **Pedidos de ${focus.name}** (${reqs.length}):\n\n${rows}`;
        }

        if (/(dele|dela|його|її)/.test(normalizedMsg)) {
            return `Tenho o contexto de **${focus.name}**. O que quer ver?\n` +
                `1) dados\n` +
                `2) elevadores\n` +
                `3) pedidos`;
        }

        return null;
    }

    _isHelpRequest(normalizedMsg = '') {
        return /(ajuda|help|o que podes fazer|o que pode fazer|comandos|menu|opcoes|opções|capacidades|ferramentas)/.test(String(normalizedMsg || ''));
    }

    async _findClientByName(role, rawMessage, userId = null) {
        if (role !== 'admin' && role !== 'dispatcher') {
            return '⛔ Pesquisa de clientes por nome está disponível apenas para admin/dispatcher.';
        }

        const text = String(rawMessage || '').trim();
        const cleaned = text
            .replace(/tudo sobre|informacoes?|informações?|dados de|detalhes de|sobre|cliente/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleaned || cleaned.length < 3) {
            return 'ℹ️ Indique o nome do cliente. Ex.: "tudo sobre Maria Estrela".';
        }

        const tokens = cleaned
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .split(/\s+/)
            .filter(t => t.length >= 2)
            .slice(0, 4);

        const fieldForToken = (token) => {
            const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            return {
                $or: [
                    { firstName: re },
                    { lastName: re },
                    { companyName: re },
                    { name: re },
                    { username: re },
                    { email: re }
                ]
            };
        };

        const query = {
            role: 'client',
            ...(tokens.length > 0 ? { $and: tokens.map(fieldForToken) } : {})
        };

        const clients = await this.db.collection('users').find(query, {
            projection: { password: 0, passwordHash: 0 }
        }).limit(5).toArray();

        if (!clients.length) {
            return `❓ Não encontrei cliente com "${cleaned}".`;
        }

        if (clients.length > 1) {
            const options = clients.map(c => {
                const full = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || c.name || c.username || c.email;
                return `- ${full} | ${c.email || 'sem email'}`;
            }).join('\n');
            return `Encontrei vários clientes parecidos. Especifique um deles:\n${options}`;
        }

        const target = clients[0];
        this._setClientFocus(userId, target);
        const fullName = [target.firstName, target.lastName].filter(Boolean).join(' ') || target.companyName || target.name || target.username || target.email;
        const idStr = String(target._id);

        const liftQuery = {
            $or: [
                { clientEmail: String(target.email || '').toLowerCase() },
                { client: idStr },
                { client: target._id }
            ]
        };

        const [liftCount, activeReqCount, totalReqCount] = await Promise.all([
            this.db.collection('lifts').countDocuments(liftQuery),
            this.db.collection('requests').countDocuments({
                $or: [{ clientEmail: String(target.email || '').toLowerCase() }, { clientId: idStr }, { clientId: target._id }],
                status: { $in: ['open', 'pending', 'assigned', 'in-progress', 'in_progress'] }
            }),
            this.db.collection('requests').countDocuments({
                $or: [{ clientEmail: String(target.email || '').toLowerCase() }, { clientId: idStr }, { clientId: target._id }]
            })
        ]);

        return `👤 **Cliente encontrado**\n\n` +
            `Nome: **${fullName}**\n` +
            `Email: ${target.email || '—'}\n` +
            `Telefone: ${target.phone || '—'}\n` +
            `ID: ${idStr}\n` +
            `🏢 Elevadores: **${liftCount}**\n` +
            `📩 Pedidos ativos: **${activeReqCount}** (total ${totalReqCount})\n\n` +
            `Quer ver agora:\n` +
            `1) dados completos\n` +
            `2) lista de elevadores\n` +
            `3) pedidos deste cliente`;
    }

    _normText(text = '') {
        return String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    _tokenize(text = '') {
        return this._normText(text)
            .split(' ')
            .filter(w => w.length >= 4)
            .slice(0, 64);
    }

    _rememberChatTurn(userId, userRole, userMessage, assistantReply) {
        if (!userId) return;
        const key = String(userId);
        const current = this.chatMemoryMap.get(key) || [];
        current.push({
            at: new Date().toISOString(),
            role: userRole,
            user: String(userMessage || '').slice(0, 500),
            assistant: String(assistantReply || '').slice(0, 900)
        });
        if (current.length > this.chatMemoryLimit) {
            current.splice(0, current.length - this.chatMemoryLimit);
        }
        this.chatMemoryMap.set(key, current);
    }

    _getRecentChatMemory(userId) {
        if (!userId) return [];
        return this.chatMemoryMap.get(String(userId)) || [];
    }

    _collectRagFiles(absPath, out) {
        try {
            const stat = fs.statSync(absPath);
            if (stat.isDirectory()) {
                const children = fs.readdirSync(absPath);
                for (const child of children) {
                    this._collectRagFiles(path.join(absPath, child), out);
                }
                return;
            }

            if (!stat.isFile()) return;
            const ext = path.extname(absPath).toLowerCase();
            if (!['.md', '.txt', '.json'].includes(ext)) return;
            out.push(absPath);
        } catch (_) {
            // ignore invalid paths
        }
    }

    _loadRagSnippets() {
        const now = Date.now();
        if (this.ragCache.expiresAt > now && this.ragCache.snippets.length > 0) {
            return this.ragCache.snippets;
        }

        const files = [];
        for (const rel of this.ragSourcePaths) {
            this._collectRagFiles(path.resolve(process.cwd(), rel), files);
        }

        const snippets = [];
        for (const filePath of files) {
            try {
                const raw = fs.readFileSync(filePath, 'utf8');
                const chunks = raw
                    .split(/\n\s*\n/g)
                    .map(s => s.trim())
                    .filter(s => s.length >= 60);

                for (const chunk of chunks.slice(0, 30)) {
                    snippets.push({
                        source: path.relative(process.cwd(), filePath),
                        text: chunk.slice(0, 1600)
                    });
                }
            } catch (_) {
                // ignore unreadable files
            }
        }

        this.ragCache = {
            snippets,
            expiresAt: now + this.ragCacheTtlMs
        };

        return snippets;
    }

    async _retrieveKnowledgeSnippets(query, routeHint = 'generic') {
        try {
            const qTokens = this._tokenize(query);
            if (qTokens.length === 0) return [];

            const opsBoost = ['pedido', 'inspecao', 'inspecoes', 'orcamento', 'elevador', 'cliente', 'tecnico', 'dashboard'];
            const legalBoost = ['decreto', 'lei', 'norma', 'artigo', 'clausula', 'en81', 'conformidade'];
            const snippets = this._loadRagSnippets();

            const ranked = snippets
                .map(s => {
                    const textNorm = this._normText(s.text);
                    let score = 0;
                    for (const t of qTokens) {
                        if (textNorm.includes(t)) score += 2;
                    }
                    if (routeHint === 'operations' && opsBoost.some(k => textNorm.includes(k))) score += 3;
                    if (routeHint === 'legal' && legalBoost.some(k => textNorm.includes(k))) score += 3;
                    return { ...s, score };
                })
                .filter(s => s.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, this.ragMaxSnippets);

            return ranked;
        } catch (_) {
            return [];
        }
    }

    _scoreAssistantReply(userPrompt, replyText) {
        const reply = String(replyText || '');
        if (!reply) return 0;

        let score = 50;
        if (reply.length >= 120 && reply.length <= 2000) score += 12;
        if (/\n\d+\.|\b1\.\s/.test(reply)) score += 12;
        if (/dashboard|pedidos|orcamentos|inspecoes|elevadores|clientes|utilizadores|analytics/i.test(reply)) score += 10;
        if (/nao tenho esse dado no contexto atual|não tenho esse dado no contexto atual|faltam dados/i.test(reply)) score += 8;
        if (/talvez|provavelmente|acho que/i.test(reply)) score -= 8;
        if (/demo|simulado|invent/i.test(reply)) score -= 18;
        if (this._tokenize(userPrompt).some(t => reply.toLowerCase().includes(t))) score += 8;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    async _logGenerationQuality(entry) {
        try {
            const payload = {
                ...entry,
                createdAt: new Date()
            };
            if (this.db) {
                await this.db.collection('agent_quality_logs').insertOne(payload);
            } else {
                console.log('🤖 quality-log:', JSON.stringify(payload));
            }
        } catch (err) {
            console.warn('🤖 quality log failed:', err.message);
        }
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

    async _isOllamaAvailable() {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 2000);
            const res = await fetch(`${this.ollamaBaseUrl}/api/tags`, { signal: ctrl.signal });
            clearTimeout(timer);
            return res.ok;
        } catch (_) {
            return false;
        }
    }

    async _selectOllamaModel() {
        const now = Date.now();
        if (this.ollamaModelCache.expiresAt > now) {
            return this.ollamaModelCache.value;
        }

        try {
            const res = await fetch(`${this.ollamaBaseUrl}/api/tags`);
            if (!res.ok) throw new Error(`tags HTTP ${res.status}`);
            const payload = await res.json();
            const available = new Set((payload.models || []).map(m => m.name));
            const selected = this.ollamaModelCandidates.find(m => available.has(m)) || this.ollamaModel;
            this.ollamaModelCache = { value: selected, expiresAt: now + 10 * 60 * 1000 };
            return selected;
        } catch (_) {
            return this.ollamaModel;
        }
    }

    async _selectFastOllamaModel() {
        const now = Date.now();
        if (this.ollamaFastModelCache.expiresAt > now) {
            return this.ollamaFastModelCache.value;
        }

        try {
            const res = await fetch(`${this.ollamaBaseUrl}/api/tags`);
            if (!res.ok) throw new Error(`tags HTTP ${res.status}`);
            const payload = await res.json();
            const available = new Set((payload.models || []).map(m => m.name));
            const selected = this.ollamaFastModelCandidates.find(m => available.has(m)) || await this._selectOllamaModel();
            this.ollamaFastModelCache = { value: selected, expiresAt: now + 5 * 60 * 1000 };
            return selected;
        } catch (_) {
            return this.ollamaFastModelCandidates[0] || this.ollamaModel;
        }
    }

    _buildOllamaSystemInstruction(routeHint = 'generic', meta = {}) {
        const role = meta.userRole || 'utilizador';
        const profile = this._getAssistantRoleProfile(meta.userRole);
        const navGuide = [
            'Navegação da app: Dashboard (KPIs), Pedidos, Orçamentos, Inspeções, Elevadores, Clientes, Utilizadores/Techs, Analytics.',
            'Regras de verdade: nunca inventar clientes, elevadores, inspeções, datas, ações ou IDs.',
            'Se faltar dado real, diz explicitamente o que falta e qual ecrã/ação o utilizador deve abrir.',
            'Quando possível, responder com passos curtos e executáveis dentro da app.'
        ].join('\n- ');

        const focus = routeHint === 'operations'
            ? 'Foco operacional: pedidos, inspeções, vencimentos, técnicos, clientes, orçamentos.'
            : routeHint === 'legal'
                ? 'Foco legal: enquadramento normativo, sem sair dos factos fornecidos.'
                : 'Foco geral: ajudar a orientar o utilizador na app com precisão.';

        return [
            'Tu és o assistente FestLift (pt-PT) para gestão de elevadores em Portugal.',
            `Perfil do utilizador atual: ${role}.`,
            `Perfil de assistente ativo: ${profile.label}.`,
            `Objetivo: ${profile.purpose}.`,
            `Capacidades: ${profile.capabilities.join('; ')}.`,
            focus,
            'Política de resposta:',
            '- Objetivo: responder curto, preciso e orientado a ação.',
            '- Nunca inventes dados.',
            `- ${navGuide}`
        ].join('\n');
    }

    _composeChatPromptForOllama(prompt, routeHint = 'generic', meta = {}) {
        const systemBlock = this._buildOllamaSystemInstruction(routeHint, meta);
        const contextBlock = meta.contextSummary ? `\n\nContexto real atual:\n${meta.contextSummary}` : '';
        // When channel=chat, `prompt` is the full Gemini-style system prompt (~2000–4000 tokens).
        // Ollama has a small context window — use only the raw user message to avoid token overflow
        // and double system-instruction confusion.
        const userQuery = (meta.channel === 'chat' || meta.channel === 'chat-fast') && meta.userMessage
            ? meta.userMessage
            : prompt;
        return `${systemBlock}${contextBlock}\n\nPedido do utilizador:\n${userQuery}\n\nResposta:`;
    }

    async _generateViaOllama(prompt, routeHint = 'generic', meta = {}) {
        const isChatLike = meta.channel === 'chat' || meta.channel === 'chat-fast';
        const timeoutMs = Number(meta.timeoutMs || (isChatLike
            ? Number(process.env.OLLAMA_CHAT_TIMEOUT_MS || process.env.OLLAMA_TIMEOUT_MS || 15000)
            : Number(process.env.OLLAMA_TIMEOUT_MS || 15000)));
        const retries = Math.max(0, Number(process.env.OLLAMA_MAX_RETRIES || 1));
        const model = meta.forceModel || await this._selectOllamaModel();
        const finalPrompt = isChatLike
            ? this._composeChatPromptForOllama(prompt, routeHint, meta)
            : prompt;
        const options = { ...this.ollamaOptions };
        if (isChatLike) {
            const chatCtx = Number(process.env.OLLAMA_CHAT_NUM_CTX || 3072);
            const chatPredict = Number(process.env.OLLAMA_CHAT_NUM_PREDICT || 128);
            const maxCtx = Number(meta.maxNumCtx || chatCtx);
            const maxPredict = Number(meta.maxNumPredict || chatPredict);
            options.num_ctx = Math.max(1024, Math.min(Number(options.num_ctx || maxCtx), maxCtx));
            options.num_predict = Math.max(64, Math.min(Number(options.num_predict || maxPredict), maxPredict));
        }

        let lastErr = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeoutMs);
            try {
                const res = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        prompt: finalPrompt,
                        stream: false,
                        options
                    }),
                    signal: ctrl.signal
                });

                if (!res.ok) {
                    const body = await res.text();
                    throw new Error(`Ollama HTTP ${res.status}: ${body}`);
                }

                const json = await res.json();
                const text = (json && json.response) ? String(json.response).trim() : '';
                if (!text) throw new Error('Ollama returned empty response');
                return text;
            } catch (err) {
                lastErr = err;
                if (attempt >= retries) break;
            } finally {
                clearTimeout(timer);
            }
        }

        throw lastErr || new Error('Ollama generation failed');
    }

    _detectTaskType(text = '') {
        const t = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const legalHints = [
            'lei', 'decreto', 'decreto-lei', 'dl ', 'artigo', 'art.', 'clausula', 'norma', 'normativo',
            'en 81', 'en81', 'regulamento', 'conformidade legal', 'compliance legal', 'juridic', 'legal'
        ];

        const opsHints = [
            'overdue', 'manutencao', 'inspecao', 'inspecoes', 'pedido', 'tarefas', 'dashboard',
            'alerta', 'alertas', 'orcamento', 'orcamentos', 'cliente', 'tecnico', 'elevador', 'lifts'
        ];

        if (legalHints.some(k => t.includes(k))) return 'legal';
        if (opsHints.some(k => t.includes(k))) return 'operations';
        return 'generic';
    }

    async _generateViaGroq(prompt) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('GROQ_API_KEY not set');
        const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                max_tokens: 1024,
            }),
            signal: AbortSignal.timeout(30000)
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Groq HTTP ${response.status}: ${err.slice(0, 200)}`);
        }
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Groq: empty response');
        return text;
    }

    async _generateText(prompt, routeHint = 'generic', meta = {}) {
        const provider = this.aiProvider;
        const startedAt = Date.now();
        const detectedTaskType = routeHint === 'generic' ? this._detectTaskType(prompt) : routeHint;
        let selectedProvider = provider;
        let selectedModel = null;
        let fallbackUsed = false;
        let fallbackReason = null;
        let outputText = '';
        let errorMessage = null;

        const tryGemini = async () => {
            if (!process.env.GEMINI_API_KEY) {
                throw new Error('GEMINI_API_KEY is not configured');
            }
            const model = this.genAI.getGenerativeModel({ model: this.model });
            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        };

        const tryGeminiWithFallbackModel = async () => {
            try {
                return await tryGemini();
            } catch (err) {
                if (err.message && (err.message.includes('model') || err.message.includes('not found'))) {
                    this.model = 'gemini-2.5-flash';
                    return await tryGemini();
                }
                throw err;
            }
        };

        try {
            // Groq: fastest, free tier — always try first regardless of task type
            if (process.env.GROQ_API_KEY && provider !== 'gemini' && provider !== 'ollama') {
                try {
                    outputText = await this._generateViaGroq(prompt);
                    selectedProvider = 'groq';
                    selectedModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
                    return outputText;
                } catch (groqErr) {
                    fallbackUsed = true;
                    fallbackReason = groqErr.message;
                    console.warn(`🤖 AgentService Groq failed, falling back: ${groqErr.message}`);
                    // continue to ollama/gemini below
                }
            }

            if (provider === 'ollama') {
                selectedProvider = 'ollama';
                try {
                    const preferredModel = detectedTaskType === 'legal'
                        ? await this._selectOllamaModel()
                        : await this._selectFastOllamaModel();
                    selectedModel = preferredModel;
                    outputText = await this._generateViaOllama(prompt, routeHint, {
                        ...meta,
                        forceModel: preferredModel
                    });
                    return outputText;
                } catch (ollErr) {
                    // Keep local-first behavior, but avoid hard failure when local model times out.
                    if (!process.env.GEMINI_API_KEY) throw ollErr;
                    fallbackUsed = true;
                    fallbackReason = ollErr.message;
                    selectedProvider = 'gemini';
                    console.warn(`🤖 AgentService OLLAMA primary failed, fallback to Gemini: ${ollErr.message}`);
                    outputText = await tryGeminiWithFallbackModel();
                    selectedModel = this.model;
                    return outputText;
                }
            }

            if (provider === 'gemini') {
                selectedProvider = 'gemini';
                outputText = await tryGeminiWithFallbackModel();
                selectedModel = this.model;
                return outputText;
            }

            // auto: explicit hybrid routing by task type, then fallback.
            const taskType = detectedTaskType;

            if (taskType === 'legal') {
                selectedProvider = 'gemini';
                try {
                    outputText = await tryGeminiWithFallbackModel();
                    selectedModel = this.model;
                    return outputText;
                } catch (gemErr) {
                    const ollamaReady = await this._isOllamaAvailable();
                    if (!ollamaReady) throw gemErr;
                    fallbackUsed = true;
                    fallbackReason = gemErr.message;
                    selectedProvider = 'ollama';
                    console.warn(`🤖 AgentService legal route Gemini->Ollama fallback: ${gemErr.message}`);
                    const strongModel = await this._selectOllamaModel();
                    selectedModel = strongModel;
                    outputText = await this._generateViaOllama(prompt, routeHint, {
                        ...meta,
                        forceModel: strongModel
                    });
                    return outputText;
                }
            }

            if (taskType === 'operations') {
                selectedProvider = 'ollama';
                try {
                    const fastModel = await this._selectFastOllamaModel();
                    selectedModel = fastModel;
                    outputText = await this._generateViaOllama(prompt, routeHint, {
                        ...meta,
                        forceModel: fastModel
                    });
                    return outputText;
                } catch (ollErr) {
                    fallbackUsed = true;
                    fallbackReason = ollErr.message;
                    selectedProvider = 'gemini';
                    outputText = await tryGeminiWithFallbackModel();
                    selectedModel = this.model;
                    return outputText;
                }
            }

            // generic: Ollama first (local-first), then Gemini fallback.
            selectedProvider = 'ollama';
            try {
                const fastModel = await this._selectFastOllamaModel();
                selectedModel = fastModel;
                outputText = await this._generateViaOllama(prompt, routeHint, {
                    ...meta,
                    forceModel: fastModel
                });
                return outputText;
            } catch (ollErr) {
                fallbackUsed = true;
                fallbackReason = ollErr.message;
                selectedProvider = 'gemini';
                console.warn(`🤖 AgentService Ollama fallback to Gemini: ${ollErr.message}`);
                outputText = await tryGeminiWithFallbackModel();
                selectedModel = this.model;
                return outputText;
            }
        } catch (err) {
            errorMessage = err.message;
            throw err;
        } finally {
            if (meta.channel === 'chat') {
                const latencyMs = Date.now() - startedAt;
                console.info(`🤖 chat-route provider=${selectedProvider} model=${selectedModel || 'unknown'} task=${detectedTaskType} fallback=${fallbackUsed ? 'yes' : 'no'} latencyMs=${latencyMs}`);
                await this._logGenerationQuality({
                    userId: meta.userId || null,
                    role: meta.userRole || 'unknown',
                    provider: selectedProvider,
                    model: selectedModel || null,
                    routeHint,
                    detectedTaskType,
                    fallbackUsed,
                    fallbackReason,
                    latencyMs,
                    score: this._scoreAssistantReply(meta.userMessage || prompt, outputText),
                    promptPreview: String(meta.userMessage || prompt).slice(0, 240),
                    responsePreview: String(outputText || '').slice(0, 360),
                    error: errorMessage
                });
            }
        }
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
            // Also suppress if was rejected within last 30 days (avoid spam)
            const thirtyDaysAgo30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const existingOpen = await this.db.collection('agent_notifications').findOne({
                liftLocation: inspection.liftLocation,
                type: 'quote_request',
                $or: [
                    { status: { $in: ['pending', 'postponed'] } },
                    { status: 'rejected', createdAt: { $gte: thirtyDaysAgo30 } }
                ]
            });

            // Build AI summary of problems
            const summary = await this._buildProblemSummary(inspection, nokItems);

            if (existingOpen) {
                // If it was rejected recently — suppress silently, don't re-open
                if (existingOpen.status === 'rejected') {
                    console.log(`🤖 Agent: suppressing new notification for ${inspection.liftLocation} — rejected ${Math.ceil((Date.now() - new Date(existingOpen.createdAt)) / 86400000)} days ago`);
                    return;
                }
                // Update existing pending/postponed notification with new findings
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
        const inputId = typeof notificationId === 'string' ? new ObjId(notificationId) : notificationId;

        let notif = await this.db.collection('agent_notifications').findOne({ _id: inputId });
        let id = inputId;

        if (!notif) {
            // Live overdue notification: notificationId is the lift's _id, not a stored notification.
            // Materialize it so the decision is persisted and deduplication works.
            const lift = await this.db.collection('lifts').findOne({ _id: inputId });
            if (!lift) throw new Error('Notification not found');
            const a = lift.address || {};
            const addr = typeof a === 'object'
                ? `${a.street || ''}, ${a.city || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
                : String(a);
            const daysOverdue = lift.nextInspectionDate
                ? Math.ceil((Date.now() - new Date(lift.nextInspectionDate)) / 86400000)
                : 0;
            const newNotif = {
                type: 'expiry_reminder',
                status: 'pending',
                liftId: inputId,
                liftLocation: addr,
                municipalNumber: lift.municipalNumber || '',
                clientName: lift.clientName || lift.clientEmail || '',
                agentMessage: `⚠️ Inspeção vencida há ${daysOverdue} dias — ${addr}`,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const ins = await this.db.collection('agent_notifications').insertOne(newNotif);
            id = ins.insertedId;
            notif = { ...newNotif, _id: id };
        }

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
        const clientDisplayName = (notif.clientName || notif.clientEmail || 'cliente identificado').trim();
        const liftDisplayLocation = (notif.liftLocation || 'local não identificado').trim();

        if (action === 'yes') {
            // Generate draft orçamento immediately
            try {
                orcamentoData = await this._createDraftOrcamento(notif, userId);
                const link = `/pages/admin/orcamentos-list.html?highlight=${orcamentoData.numero}`;
                response = `✅ Rascunho **${orcamentoData.numero}** criado para **${clientDisplayName}**!\n\n` +
                    `Serviços pré-preenchidos pela IA (${orcamentoData.servicos.length} itens).\n` +
                    `Apenas defina os preços e clique "Enviar ao cliente".\n\n` +
                    `[🔗 Abrir rascunho](${link})`;

                // Push direct link to admins via WebSocket
                this._pushToAdmins('agent_orcamento_ready', {
                    orcamentoId: String(orcamentoData._id),
                    numero: orcamentoData.numero,
                    clientName: clientDisplayName,
                    liftLocation: liftDisplayLocation,
                    servicos: orcamentoData.servicos,
                    link
                });
                // If this was triggered by a client request → notify client that we are preparing their quote
                if (notif.type === 'client_quote_request' && notif.clientEmail) {
                    const clientUser = await this.db.collection('users').findOne({ email: notif.clientEmail.toLowerCase() });
                    if (clientUser && this.io) {
                        this.io.to(`user_${clientUser._id}`).emit('agent_quote_confirmed', {
                            message: `✅ A equipa FestLift confirmou o seu pedido! Estamos a preparar o orçamento **${orcamentoData.numero}** para o seu elevador em ${liftDisplayLocation}. Receberá a proposta em breve.`,
                            orcamentoNumero: orcamentoData.numero,
                            liftLocation: liftDisplayLocation
                        });
                        console.log(`🤖 Agent: notified client ${notif.clientEmail} about orcamento ${orcamentoData.numero}`);
                    }
                }
            } catch (err) {
                console.error('🤖 Agent: failed to create draft orcamento:', err.message);
                response = `✅ Confirmado! Vou preparar o orçamento para **${clientDisplayName}**.\n` +
                    `⚠️ Erro ao criar rascunho automático: ${err.message}\nCrie manualmente em Orçamentos.`;
            }
        } else if (action === 'no') {
            response = `❌ Entendido. Guardei na memória: sem orçamento para ${clientDisplayName}${reason ? ' — motivo: ' + reason : ''}.`;
            // Notify client if this was their request
            if (notif.type === 'client_quote_request' && notif.clientEmail) {
                const clientUser = await this.db.collection('users').findOne({ email: notif.clientEmail.toLowerCase() });
                if (clientUser && this.io) {
                    this.io.to(`user_${clientUser._id}`).emit('agent_quote_confirmed', {
                        message: `ℹ️ A equipa FestLift analisou o seu pedido para ${liftDisplayLocation}. ${reason ? `Nota: ${reason}` : 'Entraremos em contacto brevemente para mais informações.'}`,
                        liftLocation: liftDisplayLocation,
                        rejected: true
                    });
                }
            }
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
    // CLIENT DECISION — client responds to their alert (yes/no)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Client says "Sim" (yes) or "Não" (no) to a quote/action request.
     * action: 'yes' | 'no'
     * When 'yes' → creates a 'client_quote_request' notification for admins.
     */
    async handleClientDecision(notificationId, action, message, clientUser, ObjectId) {
        if (!this.db) throw new Error('DB not ready');
        const { ObjectId: ObjId } = require('mongodb');
        const id = typeof notificationId === 'string' ? new ObjId(notificationId) : notificationId;

        const notif = await this.db.collection('agent_notifications').findOne({ _id: id });
        if (!notif) throw new Error('Notification not found');

        // Verify the notification belongs to this client
        if (notif.clientEmail && notif.clientEmail !== clientUser.email) {
            throw new Error('Unauthorized');
        }

        const now = new Date();
        const status = action === 'yes' ? 'client_confirmed' : 'client_rejected';

        await this.db.collection('agent_notifications').updateOne(
            { _id: id },
            {
                $set: {
                    status,
                    clientDecision: action,
                    clientDecisionMessage: message || '',
                    clientDecidedAt: now,
                    updatedAt: now
                }
            }
        );

        if (action === 'yes') {
            // Create admin-facing notification: "client wants a quote"
            const adminNotifMsg = `🙋 **${notif.clientName || clientUser.email}** pediu orçamento para o elevador em **${notif.liftLocation}**.\n\n`
                + `📋 Problemas detectados:\n${notif.findings || notif.agentMessage}\n\n`
                + `${message ? `💬 Mensagem do cliente: "${message}"\n\n` : ''}`
                + `Criamos o orçamento?`;

            const adminNotif = {
                type: 'client_quote_request',
                status: 'pending',
                liftLocation: notif.liftLocation,
                liftMunicipal: notif.liftMunicipal || '',
                clientName: notif.clientName || '',
                clientEmail: notif.clientEmail || clientUser.email,
                clientUserId: clientUser.id || clientUser._id,
                clientMessage: message || '',
                findings: notif.findings || '',
                agentMessage: adminNotifMsg,
                relatedReports: notif.relatedReports || [],
                relatedClientNotifId: id,
                decision: null, decidedBy: null, decidedAt: null, remindAt: null,
                createdAt: now, updatedAt: now
            };

            const result = await this.db.collection('agent_notifications').insertOne(adminNotif);

            // Push to all admins/dispatchers via WebSocket
            this._pushToAdmins('agent_new_notification', {
                notificationId: result.insertedId,
                message: adminNotifMsg,
                liftLocation: notif.liftLocation,
                clientName: notif.clientName || clientUser.email,
                type: 'client_quote_request',
                urgent: true
            });

            console.log(`🤖 Agent: client ${clientUser.email} confirmed quote for ${notif.liftLocation} → admin notif ${result.insertedId}`);

            return {
                success: true,
                response: `✅ Perfeito! Enviei o seu pedido de orçamento para a equipa FestLift.\n\nSeremos contactados brevemente para confirmar os detalhes e enviar-lhe a proposta. 🎉`,
                adminNotifId: result.insertedId
            };
        } else {
            console.log(`🤖 Agent: client ${clientUser.email} declined quote for ${notif.liftLocation}`);
            return {
                success: true,
                response: `👍 Entendido! Guardei a sua resposta. Se mudar de ideia, pode sempre contactar-nos.`
            };
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROACTIVE SCAN — detect problems in client's lifts automatically
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Scan all lifts belonging to a client and return a proactive alert
     * if there are open violations, overdue inspections, or pending requests.
     * Called when client opens their assistant.
     */
    async scanClientLiftsForProblems(clientEmail, clientUserId) {
        if (!this.db) return null;
        try {
            const { ObjectId: ObjId } = require('mongodb');

            // 1. Find client's lifts
            let clientObjId = null;
            try { clientObjId = new ObjId(clientUserId.toString()); } catch (_) {}
            const liftOrConds = clientObjId
                ? [{ client: clientUserId.toString() }, { client: clientObjId }, { clientEmail: clientEmail.toLowerCase() }]
                : [{ clientEmail: clientEmail.toLowerCase() }];
            const lifts = await this.db.collection('lifts').find({ $or: liftOrConds }).toArray();

            if (lifts.length === 0) return null;

            const today = new Date();
            const problems = [];

            for (const lift of lifts) {
                const address = this._getClientLiftAddress(lift);

                // A) Overdue or expiring inspection
                const effectiveNextInspectionDate = this._getEffectiveNextInspectionDate(lift);
                if (effectiveNextInspectionDate) {
                    const daysLeft = Math.ceil((effectiveNextInspectionDate - today) / 86400000);
                    if (daysLeft < 0) {
                        problems.push({
                            liftId: lift._id,
                            address,
                            type: 'inspection_overdue',
                            severity: 'high',
                            daysLeft: Math.abs(daysLeft),
                            msg: `Inspeção **vencida há ${Math.abs(daysLeft)} dias** — ${address}`
                        });
                    } else if (daysLeft <= 30) {
                        problems.push({
                            liftId: lift._id,
                            address,
                            type: 'inspection_expiring',
                            severity: 'medium',
                            daysLeft,
                            msg: `Inspeção expira em **${daysLeft} dias** — ${address}`
                        });
                    }
                }

                // B) Recent inspection violations
                const recentInspection = await this.db.collection('inspections')
                    .find({ liftId: lift._id.toString() })
                    .sort({ createdAt: -1 }).limit(1).toArray();

                if (recentInspection.length > 0) {
                    const insp = recentInspection[0];
                    const nokItems = this._extractNokItems(insp.checklist || {});
                    if (nokItems.length > 0) {
                        problems.push({ liftId: lift._id, address, type: 'violations', severity: nokItems.length >= 3 ? 'high' : 'medium', count: nokItems.length, nokItems, inspectionNum: insp.numero, msg: `**${nokItems.length} problema(s)** detectado(s) na última inspeção — ${address} (Rel. ${insp.numero})` });
                    }
                }

                // C) Open service requests
                const openRequests = await this.db.collection('requests').countDocuments({ liftId: lift._id.toString(), status: { $in: ['pending', 'in_progress', 'assigned'] } });
                if (openRequests > 0) {
                    problems.push({ liftId: lift._id, address, type: 'open_requests', severity: 'low', count: openRequests, msg: `**${openRequests} pedido(s) em aberto** — ${address}` });
                }
            }

            if (problems.length === 0) return null;

            // Build or find existing client notification for these problems
            // Check if we already have a pending client_reminder for any of these lifts
            const liftIds = lifts.map(l => l._id.toString());
            const existing = await this.db.collection('agent_notifications').findOne({
                clientEmail: clientEmail.toLowerCase(),
                type: { $in: ['client_reminder', 'client_proactive'] },
                status: { $in: ['pending', 'client_confirmed'] },
                createdAt: { $gte: new Date(today.getTime() - 7 * 86400000) } // within last 7 days
            });

            // Sort by severity
            const sorted = problems.sort((a, b) => (a.severity === 'high' ? 0 : a.severity === 'medium' ? 1 : 2) - (b.severity === 'high' ? 0 : b.severity === 'medium' ? 1 : 2));
            const highCount = sorted.filter(p => p.severity === 'high').length;

            const summary = `🔍 **Detetei ${problems.length} situação(ões) nos seus elevadores:**\n\n`
                + sorted.map((p, i) => `${i + 1}. ${p.msg}`).join('\n')
                + `\n\n${highCount > 0 ? '⚠️ Existem situações **urgentes** que requerem atenção.' : 'ℹ️ Reveja os pontos acima e acompanhe os próximos passos no menu de Pedidos.'}`;

            // Create a proactive notification if none exists yet
            let notifId = existing?._id;
            if (!existing) {
                const liftProblemText = sorted.map(p => p.msg.replace(/\*\*/g, '')).join('; ');
                const inserted = await this.db.collection('agent_notifications').insertOne({
                    type: 'client_proactive',
                    status: 'pending',
                    liftLocation: sorted[0].address,
                    clientEmail: clientEmail.toLowerCase(),
                    findings: liftProblemText,
                    agentMessage: summary,
                    relatedLifts: liftIds,
                    problems: sorted,
                    decision: null, clientDecision: null, decidedBy: null, decidedAt: null,
                    createdAt: today, updatedAt: today
                });
                notifId = inserted.insertedId;
            } else {
                const liftProblemText = sorted.map(p => p.msg.replace(/\*\*/g, '')).join('; ');
                await this.db.collection('agent_notifications').updateOne(
                    { _id: existing._id },
                    {
                        $set: {
                            liftLocation: sorted[0].address,
                            clientEmail: clientEmail.toLowerCase(),
                            findings: liftProblemText,
                            agentMessage: summary,
                            relatedLifts: liftIds,
                            problems: sorted,
                            updatedAt: today
                        }
                    }
                );
            }

            return { summary, notifId: notifId?.toString(), problems: sorted.length, problemsList: sorted, hasExisting: !!existing };
        } catch (err) {
            console.error('🤖 scanClientLiftsForProblems error:', err.message);
            return null;
        }
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
        const memory = this._getRecentChatMemory(userId);

        if (this._isGenerativeDraftRequest(userMessage || '')) {
            try {
                const routeHint = this._detectTaskType(userMessage || '');
                const routeTimeoutMs = Number(process.env.ASSISTANT_CHAT_ROUTE_TIMEOUT_MS || 18000);
                const reply = await Promise.race([
                    this._generateViaOllama(this._buildQuickDraftPrompt(userMessage, userRole), routeHint, {
                        channel: 'chat',
                        userRole,
                        userId,
                        userMessage,
                        timeoutMs: Number(process.env.OLLAMA_CHAT_TIMEOUT_MS || 16000),
                        maxNumCtx: Number(process.env.OLLAMA_CHAT_FAST_NUM_CTX || 1536),
                        maxNumPredict: Number(process.env.OLLAMA_CHAT_FAST_NUM_PREDICT || 64)
                    }),
                    new Promise((_, reject) => {
                        setTimeout(() => reject(new Error(`CHAT_ROUTE_TIMEOUT_${routeTimeoutMs}`)), routeTimeoutMs);
                    })
                ]);
                this._rememberChatTurn(userId, userRole, userMessage, reply);
                return reply;
            } catch (err) {
                const quick = this._quickChatFallback(userMessage, userRole);
                this._rememberChatTurn(userId, userRole, userMessage, quick);
                return quick;
            }
        }

        // ── 1. Try to answer locally (no Gemini needed) ──────────────────────
        const localAnswer = await this._resolveLocally(userMessage, userRole, clientEmail, userId);
        if (localAnswer) {
            this._rememberChatTurn(userId, userRole, userMessage, localAnswer);
            await this._logGenerationQuality({
                userId,
                role: userRole,
                provider: 'local-router',
                routeHint: 'local',
                fallbackUsed: false,
                latencyMs: 0,
                score: this._scoreAssistantReply(userMessage, localAnswer),
                promptPreview: String(userMessage || '').slice(0, 240),
                responsePreview: String(localAnswer || '').slice(0, 360),
                error: null
            });
            return localAnswer;
        }

        // ── 2. Gemini for complex / conversational queries ────────────────────
        try {
            const context = await this._buildContext(userRole, clientEmail, userId);
            const routeHint = this._detectTaskType(userMessage || '');
            const needsRag = /(norma|decreto|lei|artigo|compliance|procedimento|runbook|policy|seguranca|segurança|processo)/i.test(userMessage || '');
            const ragSnippets = needsRag ? await this._retrieveKnowledgeSnippets(userMessage, routeHint) : [];
            context.chatMemory = memory;
            const systemPrompt = this._buildSystemPrompt(userRole, context, ragSnippets);
            const prompt = `${systemPrompt}\n\nMENSAGEM DO UTILIZADOR: ${userMessage}`;
            const contextSummary = this._buildCompactContextSummary(userRole, context);
            const routeTimeoutMs = Number(process.env.ASSISTANT_CHAT_ROUTE_TIMEOUT_MS || 30000);
            const reply = await Promise.race([
                this._generateText(prompt, routeHint, {
                    channel: 'chat',
                    userRole,
                    contextSummary,
                    userId,
                    userMessage
                }),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`CHAT_ROUTE_TIMEOUT_${routeTimeoutMs}`)), routeTimeoutMs);
                })
            ]);
            this._rememberChatTurn(userId, userRole, userMessage, reply);
            return reply;
        } catch (err) {
            const msg = String(err?.message || '');
            if (/CHAT_ROUTE_TIMEOUT_|aborted|timeout|fetch failed|ECONN|socket hang up/i.test(msg)) {
                const routeHint = this._detectTaskType(userMessage || '');
                const fastTimeoutMs = Number(process.env.OLLAMA_CHAT_FAST_TIMEOUT_MS || 9000);
                const fastPredict = Number(process.env.OLLAMA_CHAT_FAST_NUM_PREDICT || 96);
                const fastCtx = Number(process.env.OLLAMA_CHAT_FAST_NUM_CTX || 2048);
                try {
                    const fastModel = await this._selectFastOllamaModel();
                    const fastReply = await this._generateViaOllama(userMessage, routeHint, {
                        channel: 'chat-fast',
                        userRole,
                        userId,
                        userMessage,
                        forceModel: fastModel,
                        timeoutMs: fastTimeoutMs,
                        maxNumCtx: fastCtx,
                        maxNumPredict: fastPredict
                    });
                    this._rememberChatTurn(userId, userRole, userMessage, fastReply);
                    return fastReply;
                } catch (_) {
                    const quick = this._quickChatFallback(userMessage, userRole);
                    this._rememberChatTurn(userId, userRole, userMessage, quick);
                    return quick;
                }
            }

            // Rate limit / quota — return helpful local fallback
            if (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('fetch'))) {
                return this._rateLimitFallback(userMessage, userRole, clientEmail, userId);
            }
            throw err;
        }
    }

    /**
     * Analyze uploaded PDF and build a quote draft from detected clauses.
     * Returns a structured estimate and a ready-to-show assistant reply.
     */
    async analyzePdfAndBuildEstimate({ filePath, userRole, task = '', withoutPrices = true }) {
        if (!this.db) throw new Error('DB not ready');
        if (!filePath) throw new Error('Missing PDF file path');
        if (!['admin', 'dispatcher', 'technician'].includes(String(userRole || ''))) {
            throw new Error('Apenas admin/dispatcher/technician podem gerar orçamento por PDF.');
        }

        const parsed = await parseReport(filePath);
        if (!parsed || !parsed.success) {
            throw new Error(parsed?.error || 'Falha ao analisar PDF');
        }

        const violations = Array.isArray(parsed.violations) ? parsed.violations : [];
        const stats = parsed.stats || {
            total: violations.length,
            critical: violations.filter(v => v.classification === 'C1').length,
            medium: violations.filter(v => v.classification === 'C2').length,
            low: violations.filter(v => v.classification === 'C3').length
        };

        const location = parsed?.metadata?.address || parsed?.metadata?.liftLocation || parsed?.metadata?.morada || 'Local não identificado';

        const findingsLines = violations.map((v, idx) => {
            const cls = v.classification || 'C?';
            const art = v.article ? ` art. ${v.article}` : '';
            const desc = String(v.description || '').trim() || `Cláusula ${idx + 1}`;
            return `• ${cls}${art}: ${desc}`;
        });

        const findingsText = findingsLines.length > 0
            ? findingsLines.join('\n')
            : String(parsed.rawText || '').slice(0, 3000) || 'Sem cláusulas identificadas automaticamente';

        let servicos = await this._generateServicos(findingsText, location);
        if (withoutPrices) {
            servicos = servicos.map((s) => ({
                ...s,
                precoSugerido: Number(s.precoSugerido || s.precoUnitario || 0),
                precoUnitario: 0,
                total: 0
            }));
        }

        const subtotal = servicos.reduce((sum, s) => sum + Number(s.total || 0), 0);
        const iva = Math.round(subtotal * 0.23 * 100) / 100;
        const total = Math.round((subtotal + iva) * 100) / 100;

        const priceQuestions = servicos.map((s, i) => ({
            index: i + 1,
            descricao: s.descricao,
            suggestedPrice: Number(s.precoSugerido || 0),
            question: `Que preço unitário deseja para o item ${i + 1}: "${s.descricao}"?`
        }));

        const taskLine = String(task || '').trim();
        const intro = taskLine
            ? `📎 Tarefa recebida: ${taskLine}`
            : '📎 PDF analisado. Preparei um rascunho de orçamento com base nas cláusulas.';

        const estimateLines = servicos.map((s, i) => {
            const suggested = Number(s.precoSugerido || 0);
            const suggestedText = suggested > 0 ? ` | sugestão histórica: ${suggested.toFixed(2)}€` : '';
            return `${i + 1}. ${s.descricao} (qtd ${s.quantidade || 1})${suggestedText}`;
        }).join('\n');

        const reply = `${intro}\n\n` +
            `📍 Local: ${location}\n` +
            `📋 Cláusulas detectadas: ${stats.total} (C1: ${stats.critical}, C2: ${stats.medium}, C3: ${stats.low})\n\n` +
            `🧾 Rascunho de orçamento (${servicos.length} itens):\n${estimateLines}\n\n` +
            (withoutPrices
                ? '💡 Os preços foram deixados em aberto (0€) para preencher manualmente. Se quiser, posso perguntar item a item agora.'
                : '💡 Usei preços sugeridos onde havia histórico. Pode ajustar cada item antes de enviar.');

        return {
            success: true,
            analysis: {
                detectedFormat: parsed.detectedFormat || 'generic',
                stats,
                metadata: parsed.metadata || {},
                reportType: parsed.reportType || null,
                validUntil: parsed.validUntil || null
            },
            estimate: {
                servicos,
                subtotal,
                iva,
                total,
                withoutPrices: Boolean(withoutPrices)
            },
            priceQuestions,
            reply
        };
    }

    _normalizeLooseText(value = '') {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    _collectEmailCandidates(metadata = {}) {
        const directKeys = [
            'email', 'clientEmail', 'clienteEmail', 'ownerEmail', 'proprietarioEmail'
        ];
        const values = [];
        for (const k of directKeys) {
            if (metadata[k]) values.push(String(metadata[k]));
        }

        const blob = JSON.stringify(metadata || {});
        const found = blob.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
        values.push(...found);

        const unique = [...new Set(values.map(v => String(v || '').toLowerCase().trim()).filter(Boolean))];
        return unique;
    }

    _collectAddressCandidates(metadata = {}) {
        const keys = [
            'address', 'morada', 'liftLocation', 'location', 'local', 'instalacao', 'instalacaoMorada'
        ];
        const out = [];
        for (const k of keys) {
            if (metadata[k]) out.push(String(metadata[k]));
        }
        return [...new Set(out.map(v => v.trim()).filter(v => v.length >= 6))];
    }

    _collectNameCandidates(metadata = {}) {
        const keys = [
            'clientName', 'cliente', 'owner', 'proprietario', 'company', 'companyName', 'name'
        ];
        const out = [];
        for (const k of keys) {
            if (metadata[k] && typeof metadata[k] !== 'object') out.push(String(metadata[k]));
        }
        return [...new Set(out.map(v => v.trim()).filter(v => v.length >= 3))];
    }

    async _resolveClientAndLiftFromPdfMetadata(metadata = {}) {
        if (!this.db) return { client: null, lift: null, matchReason: 'db_not_ready' };

        const emails = this._collectEmailCandidates(metadata);
        const addresses = this._collectAddressCandidates(metadata);
        const names = this._collectNameCandidates(metadata);

        let client = null;
        let lift = null;
        let matchReason = 'none';

        for (const email of emails) {
            const found = await this.db.collection('users').findOne({ role: 'client', email: email.toLowerCase() });
            if (found) {
                client = found;
                matchReason = 'client_email';
                break;
            }
        }

        if (addresses.length > 0) {
            const address = addresses[0];
            const needle = this._normalizeLooseText(address);
            const token = needle.split(/\s+/).find(t => t.length >= 4) || needle;
            const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

            const candidates = await this.db.collection('lifts').find({
                deletedAt: { $exists: false },
                $or: [
                    { location: re },
                    { address: re },
                    { clientAddress: re },
                    { municipalNumber: re }
                ]
            }).limit(15).toArray();

            if (candidates.length > 0) {
                candidates.sort((a, b) => {
                    const ax = this._normalizeLooseText(a.location || a.address || a.clientAddress || '');
                    const bx = this._normalizeLooseText(b.location || b.address || b.clientAddress || '');
                    const aScore = ax.includes(needle) ? 2 : (needle.includes(ax) ? 1 : 0);
                    const bScore = bx.includes(needle) ? 2 : (needle.includes(bx) ? 1 : 0);
                    return bScore - aScore;
                });
                lift = candidates[0];
                if (matchReason === 'none') matchReason = 'lift_address';
            }
        }

        if (!lift && client) {
            const userId = String(client._id);
            lift = await this.db.collection('lifts').findOne({
                deletedAt: { $exists: false },
                $or: [
                    { clientEmail: String(client.email || '').toLowerCase() },
                    { client: userId },
                    { client: this._toObjectIdMaybe(userId) },
                    { clientId: userId },
                    { clientId: this._toObjectIdMaybe(userId) }
                ]
            }, { sort: { updatedAt: -1, createdAt: -1 } });
            if (lift && matchReason === 'client_email') matchReason = 'client_email+lift';
        }

        if (!client && lift) {
            const liftEmail = String(lift.clientEmail || '').toLowerCase().trim();
            const liftClientId = lift.client || lift.clientId || null;
            if (liftEmail) {
                client = await this.db.collection('users').findOne({ role: 'client', email: liftEmail });
                if (client) matchReason = matchReason === 'none' ? 'lift_client_email' : `${matchReason}+lift_client_email`;
            }
            if (!client && liftClientId) {
                client = await this.db.collection('users').findOne({ _id: this._toObjectIdMaybe(liftClientId), role: 'client' });
                if (client) matchReason = matchReason === 'none' ? 'lift_client_id' : `${matchReason}+lift_client_id`;
            }
        }

        if (!client && names.length > 0) {
            const raw = names[0].trim();
            const tokens = this._normalizeLooseText(raw).split(/\s+/).filter(t => t.length >= 2).slice(0, 3);
            if (tokens.length > 0) {
                const andParts = tokens.map(token => {
                    const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                    return {
                        $or: [
                            { firstName: re },
                            { lastName: re },
                            { companyName: re },
                            { name: re },
                            { email: re }
                        ]
                    };
                });
                client = await this.db.collection('users').findOne({ role: 'client', $and: andParts });
                if (client) matchReason = matchReason === 'none' ? 'client_name' : `${matchReason}+client_name`;
            }
        }

        return { client: client || null, lift: lift || null, matchReason };
    }

    async savePdfEstimateAsDraft({ estimate, analysis, task = '', user }) {
        if (!this.db) throw new Error('DB not ready');
        if (!user || !['admin', 'dispatcher'].includes(String(user.role || ''))) {
            throw new Error('Apenas admin/dispatcher podem guardar orçamento.');
        }

        const incoming = Array.isArray(estimate?.servicos) ? estimate.servicos : [];
        if (incoming.length === 0) throw new Error('Sem serviços para guardar.');

        const servicos = incoming.map((s) => {
            const quantidade = Math.max(1, parseInt(s.quantidade, 10) || 1);
            const precoUnitario = Math.max(0, Number(s.precoUnitario || 0));
            const total = Math.round(quantidade * precoUnitario * 100) / 100;
            return {
                descricao: String(s.descricao || 'Serviço por definir').trim(),
                quantidade,
                precoUnitario,
                total
            };
        });

        const now = new Date();
        const validadeAte = new Date(now);
        validadeAte.setDate(validadeAte.getDate() + 30);

        const ano = now.getFullYear();
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `ORC-${ano}-${mes}-`;
        const last = await this.db.collection('orcamentos')
            .find({ numero: new RegExp(`^${prefix}`) })
            .sort({ numero: -1 })
            .limit(1)
            .toArray();
        let seq = 1;
        if (last.length > 0) {
            const m = String(last[0].numero || '').match(/ORC-\d{4}-\d{2}-(\d{3})/);
            if (m) seq = parseInt(m[1], 10) + 1;
        }
        const numero = `${prefix}${String(seq).padStart(3, '0')}`;

        const meta = analysis?.metadata || {};
        const detected = await this._resolveClientAndLiftFromPdfMetadata(meta);
        const detectedClient = detected.client;
        const detectedLift = detected.lift;

        const fallbackName = this._collectNameCandidates(meta)[0] || 'Cliente por confirmar';
        const fallbackAddress = this._collectAddressCandidates(meta)[0] || 'Morada por confirmar';
        const fallbackEmail = this._collectEmailCandidates(meta)[0] || '';

        const subtotal = Math.round(servicos.reduce((sum, s) => sum + Number(s.total || 0), 0) * 100) / 100;
        const iva = Math.round(subtotal * 0.23 * 100) / 100;
        const total = Math.round((subtotal + iva) * 100) / 100;

        const clienteNome = detectedClient
            ? ([detectedClient.firstName, detectedClient.lastName].filter(Boolean).join(' ') || detectedClient.companyName || detectedClient.name || detectedClient.username || detectedClient.email)
            : fallbackName;

        const orcamento = {
            numero,
            data: now.toISOString(),
            validadeAte: validadeAte.toISOString(),
            cliente: {
                nome: clienteNome,
                email: detectedClient ? String(detectedClient.email || '') : fallbackEmail,
                morada: detectedLift?.location || detectedLift?.address || fallbackAddress
            },
            servicos,
            subtotal,
            iva,
            total,
            notas: `Rascunho criado pelo Assistente IA com base em PDF (${now.toLocaleDateString('pt-PT')}).\nTarefa: ${String(task || 'sem descrição')}`,
            status: 'rascunho',
            geradoPorAI: true,
            source: 'assistant_pdf',
            pdfAnalysis: {
                stats: analysis?.stats || null,
                reportType: analysis?.reportType || null,
                detectedFormat: analysis?.detectedFormat || null,
                metadata: meta
            },
            autoDetection: {
                clientMatched: Boolean(detectedClient),
                liftMatched: Boolean(detectedLift),
                matchReason: detected.matchReason || 'none'
            },
            liftId: detectedLift?._id || null,
            liftAddress: detectedLift?.location || detectedLift?.address || null,
            lifts: detectedLift?._id ? [detectedLift._id] : [],
            criadoPor: user.id || null,
            criadoPorRole: user.role || null,
            criadoPorName: user.email || 'assistente',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };

        const insert = await this.db.collection('orcamentos').insertOne(orcamento);
        return {
            ...orcamento,
            _id: insert.insertedId
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOCAL INTENT ROUTER — answers without consuming Gemini quota
    // ─────────────────────────────────────────────────────────────────────────

    async _resolveLocally(msg, role, userEmail, userId) {
        const m = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Drafting/authoring prompts should go through AI generation path.
        if (this._isGenerativeDraftRequest(m)) {
            return null;
        }

        // ── Follow-up for previously selected client ────────────────────────
        if (/(dele|dela|його|її|dados|detalhes|lifts|elevadores|ліфти|дані|info|pedidos|запити|requests)/.test(m)) {
            const follow = await this._respondFromFocusedClient(userId, m);
            if (follow) return follow;
        }

        if (this._isHelpRequest(m)) {
            return this._buildRoleAssistantHelp(role);
        }

        if (role === 'client') {
            if (/(resumo da minha conta|minha conta|visao geral da minha conta|visão geral da minha conta)/.test(m)) {
                return await this._buildSummary(role, userEmail, userId);
            }
            if (/(meus alertas|alertas pendentes|o que tenho pendente|pendencias pendências|pendencias|pendências)/.test(m)) {
                return await this._listNotifications(role, userEmail, userId);
            }
            if (/(meus elevadores|proximas inspecoes|pr[oó]ximas inspec|inspecoes a vencer|inspeções a vencer)/.test(m)) {
                return await this._listLifts(role, userEmail, userId);
            }
            if (/(meus pedidos|pedidos pendentes|pedido aberto|chamadas abertas)/.test(m)) {
                return await this._listRequests(role, userEmail, userId);
            }
        }

        if (role === 'dispatcher') {
            if (/(resumo operativo|visao geral operacional|visão geral operacional|triagem|priorizar|o que precisa de atenção|o que precisa de atencao)/.test(m)) {
                return await this._buildSummary(role, userEmail, userId);
            }
        }

        if (role === 'technician') {
            if (/(resumo tecnico|minhas tarefas|o que tenho pendente|turno de hoje|checklist rapido|checklist rápido)/.test(m)) {
                return await this._buildSummary(role, userEmail, userId);
            }
        }

        // ── Lift edit/delete is intentionally blocked in assistant ──────────
        if (/(eliminar|remover|apagar|delete|editar|alterar|edit)/.test(m) && /(elevador|lift|ліфт)/.test(m)) {
            if (role === 'admin') {
                return '⛔ O assistente não pode editar/remover elevadores. Faça apenas no Painel Admin.';
            }
            return '⛔ Edição/remoção de elevadores é apenas no Painel Admin (não disponível para dispatcher/assistente).';
        }

        // ── Fast client lookup by name (admin/dispatcher) ───────────────────
        if (/(tudo sobre|sobre|dados de|detalhes de|informacoes|informações)/.test(m) && /(cliente|client)/.test(m)) {
            const direct = await this._findClientByName(role, msg, userId);
            if (direct && !direct.startsWith('ℹ️')) return direct;
            if (/cliente|maria|estrela/.test(m) && direct) return direct;
        }

        // ── Bare client name query (e.g., "Luis Vieira") ──────────────────
        if ((role === 'admin' || role === 'dispatcher') && !this._isTechnicalTermQuery(m) && this._looksLikeClientNameQuery(m)) {
            const byName = await this._findClientByName(role, msg, userId);
            if (byName) return byName;
        }

        // ── Greetings ────────────────────────────────────────────────────────
        if (/^(ola|oi|bom dia|boa tarde|boa noite|hello|hi|hei|привіт)[\s!?.]*$/.test(m.trim())) {
            const greet = { admin: 'Olá! Sou o assistente FestLift. Posso listar orçamentos, inspeções, ativações por técnico, alertas por lift ou responder a questões técnicas. O que precisa?', dispatcher: 'Olá! Posso ajudar com orçamentos pendentes, inspeções recentes, pedidos abertos ou atribuições de técnicos.', technician: 'Olá! Posso mostrar as suas inspeções recentes, alertas de lifts com problemas, ou responder a questões técnicas.', client: 'Olá! Posso consultar os seus orçamentos, inspeções ou pedidos de serviço. Em que posso ajudar?' };
            return greet[role] || 'Olá! Como posso ajudar?';
        }

        // ── Orçamentos — list ────────────────────────────────────────────────
        if (/(orcamento|orcamentos|orc|quote|kosztor)/.test(m) && /(lista|listar|encontra|mostra|todos|ver|quais|existem|find|show)/.test(m)) {
            return await this._listOrcamentos(role, userEmail, m);
        }

        // ── Orçamentos — count ───────────────────────────────────────────────
        if (/(orcamento|orcamentos)/.test(m) && /(quantos|numero|total de|count|soma)/.test(m)) {
            return await this._countOrcamentos(role, userEmail);
        }

        // ── Orçamentos — status filter ───────────────────────────────────────
        const statusMap = { rascunho: ['rascunho', 'draft', 'rascunhos'], enviado: ['enviado', 'enviados', 'sent'], aprovado: ['aprovado', 'aprovados', 'approved', 'aceite'], rejeitado: ['rejeitado', 'rejected', 'recusado'], expirado: ['expirado', 'expired', 'vencido', 'vencidos'] };
        for (const [status, keywords] of Object.entries(statusMap)) {
            if (keywords.some(k => m.includes(k)) && /(orcamento|orcamentos|orc)/.test(m)) {
                return await this._listOrcamentos(role, userEmail, m, status);
            }
        }

        // ── Inspections — list ───────────────────────────────────────────────
        if (/(inspecao|inspecoes|inspecção|inspection|relatorio|relatorios|report)/.test(m) && /(lista|listar|ver|mostra|ultim|recent|todos)/.test(m)) {
            return await this._listInspections(role, userEmail, userId, m);
        }

        // ── Notifications / alerts ───────────────────────────────────────────
        if (/(notificacao|notificacoes|alerta|alertas|pendente|pendentes|notification)/.test(m)) {
            return await this._listNotifications(role, userEmail, userId);
        }

        // ── Lifts / elevators ────────────────────────────────────────────────
        if (/(elevador|lift|elevadores|lifts)/.test(m) && /(lista|listar|ver|mostra|quantos|todos)/.test(m)) {
            return await this._listLifts(role, userEmail, userId);
        }

        // ── Users / technicians ──────────────────────────────────────────────
        if (/(tecnico|tecnicos|utilizador|utilizadores|user|users|funcionario)/.test(m) && /(lista|listar|ver|mostra|quantos)/.test(m)) {
            return await this._listUsers(role);
        }

        // ── Stats / summary ──────────────────────────────────────────────────
        if (/(resumo|estatistica|estatisticas|dashboard|summary|visao geral|estado geral|overview)/.test(m)) {
            return await this._buildSummary(role, userEmail, userId);
        }

        // ── Service catalog ──────────────────────────────────────────────────
        if (/(catalogo|catalogo de servicos|servicos disponiveis|servicos que usamos|lista de servicos|precos de referencia|tabela de precos)/.test(m)) {
            return await this._showServiceCatalog(role);
        }

        // ── Requests / pedidos ───────────────────────────────────────────────
        if (/(pedido|pedidos|solicitacao|request|requests|chamada)/.test(m) && /(lista|listar|ver|todos|aberto|pendente)/.test(m)) {
            return await this._listRequests(role, userEmail, userId);
        }

        // ── Inspection violations / clauses ──────────────────────────────────
        if (/(clausula|clausulas|violacao|violacoes|deficiencia|deficiencias|nao conformidade|nao conformidades|c1|c2|c3|artigo|nao conformidade)/.test(m) &&
            /(lista|listar|ver|mostra|quais|existem|encontrou|detectou|relatorio|inspecao|inspecoes)/.test(m)) {
            return await this._listInspectionViolations(role, userEmail, userId, m);
        }

        return null; // not handled locally → use Gemini
    }

    // ── Local resolvers ──────────────────────────────────────────────────────

    async _listOrcamentos(role, clientEmail, msg = '', filterStatus = null) {
        const query = {};
        if (role === 'client' && clientEmail) query['cliente.email'] = clientEmail;
        if (filterStatus) query.status = filterStatus;

        const list = await this.db.collection('orcamentos').find(query).sort({ createdAt: -1 }).limit(25).toArray();
        if (list.length === 0) return `📋 Nenhum orçamento encontrado${filterStatus ? ` com estado **${filterStatus}**` : ''}.`;

        const grouped = {};
        list.forEach(o => { grouped[o.status] = (grouped[o.status] || 0) + 1; });
        const summary = Object.entries(grouped).map(([s, n]) => `${n} ${s}`).join(' · ');

        const rows = list.map(o => {
            const data = o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-PT') : '?';
            const total = (o.total || 0).toFixed(2).replace('.', ',');
            const badge = { rascunho: '📝', enviado: '📨', aprovado: '✅', rejeitado: '❌', expirado: '⏰' }[o.status] || '•';
            return `${badge} **${o.numero || '—'}** | ${o.cliente?.nome || '?'} | ${o.status} | **${total}€** | ${data}`;
        }).join('\n');

        return `📋 **Orçamentos** (${list.length} resultado(s) — ${summary}):\n\n${rows}`;
    }

    async _countOrcamentos(role, clientEmail) {
        const baseQuery = role === 'client' && clientEmail ? { 'cliente.email': clientEmail } : {};
        const statuses = ['rascunho', 'enviado', 'aprovado', 'rejeitado', 'expirado'];
        const counts = await Promise.all(statuses.map(s => this.db.collection('orcamentos').countDocuments({ ...baseQuery, status: s })));
        const total = counts.reduce((a, b) => a + b, 0);
        const lines = statuses.map((s, i) => counts[i] > 0 ? `  • ${s}: **${counts[i]}**` : null).filter(Boolean).join('\n');
        const totalValue = await this.db.collection('orcamentos').aggregate([{ $match: baseQuery }, { $group: { _id: null, sum: { $sum: '$total' } } }]).toArray();
        const valorTotal = totalValue[0]?.sum?.toFixed(2).replace('.', ',') || '0,00';
        return `📊 **Resumo de Orçamentos**\n\nTotal: **${total}** orçamentos | Valor acumulado: **${valorTotal}€**\n\n${lines}`;
    }

    async _listInspections(role, userEmail, userId, msg = '') {
        const query = {};
        const email = String(userEmail || '').toLowerCase();
        if (role === 'client' && email) query.clientEmail = email;
        if (role === 'technician') {
            const objId = this._toObjectIdMaybe(userId);
            const orConds = [
                ...(email ? [{ inspectorEmail: email }, { technicianEmail: email }] : []),
                ...(objId ? [{ inspectorId: objId }, { technicianId: objId }] : []),
                ...(userId ? [{ inspectorId: String(userId) }, { technicianId: String(userId) }] : [])
            ];
            if (orConds.length > 0) query.$or = orConds;
        }
        const list = await this.db.collection('inspections').find(query).sort({ createdAt: -1 }).limit(15).toArray();
        if (list.length === 0) return '🔍 Nenhuma inspeção encontrada.';

        const rows = list.map(i => {
            const data = i.createdAt ? new Date(i.createdAt).toLocaleDateString('pt-PT') : '?';
            const nok = Object.values(i.checklist || {}).filter(v => v?.status === 'NOK' || v === 'NOK').length;
            const badge = nok > 0 ? `⚠️ ${nok} NOK` : '✅ OK';
            return `${badge} | **${i.numero || i._id?.toString().slice(-6)}** | ${i.liftLocation || '?'} | ${i.inspector || '?'} | ${data}`;
        }).join('\n');

        return `🔍 **Inspeções recentes** (${list.length}):\n\n${rows}`;
    }

    async _listInspectionViolations(role, userEmail, userId, msg = '') {
        const query = { 'violations.0': { $exists: true } };
        const email = String(userEmail || '').toLowerCase();
        if (role === 'client' && email) query.clientEmail = email;
        if (role === 'technician') {
            const objId = this._toObjectIdMaybe(userId);
            const orConds = [
                ...(email ? [{ inspectorEmail: email }, { technicianEmail: email }] : []),
                ...(objId ? [{ inspectorId: objId }, { technicianId: objId }] : []),
                ...(userId ? [{ inspectorId: String(userId) }, { technicianId: String(userId) }] : [])
            ];
            if (orConds.length > 0) query.$or = orConds;
        }

        // Filter by classification if mentioned
        let filterClass = null;
        if (/\bc1\b/.test(msg)) filterClass = 'C1';
        else if (/\bc2\b/.test(msg)) filterClass = 'C2';
        else if (/\bc3\b/.test(msg)) filterClass = 'C3';

        const list = await this.db.collection('inspections')
            .find(query).sort({ createdAt: -1 }).limit(10).toArray();

        if (list.length === 0) return '🔍 Nenhuma inspeção com cláusulas encontrada.';

        const lines = list.map(i => {
            const data = i.createdAt ? new Date(i.createdAt).toLocaleDateString('pt-PT') : '?';
            const viols = (i.violations || []).filter(v => !filterClass || v.classification === filterClass);
            if (viols.length === 0) return null;
            const c1 = viols.filter(v => v.classification === 'C1').length;
            const c2 = viols.filter(v => v.classification === 'C2').length;
            const c3 = viols.filter(v => v.classification === 'C3').length;
            const header = `📋 **${i.liftLocation || i.clientEmail || 'Elevador'}** (${data}) — C1:${c1} C2:${c2} C3:${c3}`;
            const detail = viols.slice(0, 5).map(v =>
                `  ${v.classification === 'C1' ? '🔴' : v.classification === 'C2' ? '🟡' : '🟢'} **${v.classification}** Art.${v.article || '?'}: ${(v.description || '').substring(0, 120)}`
            ).join('\n');
            const more = viols.length > 5 ? `\n  _(+${viols.length - 5} mais)_` : '';
            return `${header}\n${detail}${more}`;
        }).filter(Boolean).join('\n\n');

        const title = filterClass
            ? `📌 **Cláusulas ${filterClass}** nas inspeções recentes`
            : `📌 **Cláusulas detectadas** nas inspeções recentes`;
        return `${title}:\n\n${lines || 'Nenhuma cláusula encontrada com esse filtro.'}`;
    }

    async _listNotifications(role, userEmail, userId) {
        const email = String(userEmail || '').toLowerCase();
        const objId = this._toObjectIdMaybe(userId);
        let query = { status: { $in: ['pending', 'postponed'] } };
        if (role === 'client' && email) {
            query = { clientEmail: email, status: { $in: ['pending', 'postponed'] } };
        } else if (role === 'technician') {
            const orConds = [
                ...(email ? [{ technicianEmail: email }] : []),
                ...(objId ? [{ technicianId: objId }, { targetUserId: objId }] : []),
                ...(userId ? [{ technicianId: String(userId) }, { targetUserId: String(userId) }] : [])
            ];
            if (orConds.length > 0) {
                query = { status: { $in: ['pending', 'postponed'] }, $or: orConds };
            }
        }
        const list = await this.db.collection('agent_notifications').find(query).sort({ createdAt: -1 }).limit(10).toArray();
        if (list.length === 0) return '🔔 Não há alertas ou notificações pendentes.';
        const rows = list.map(n => {
            const data = n.createdAt ? new Date(n.createdAt).toLocaleDateString('pt-PT') : '?';
            const badge = n.status === 'postponed' ? '⏰' : '🔔';
            return `${badge} **${n.liftLocation || '?'}** | ${n.type} | ${n.status} | ${data}`;
        }).join('\n');
        return `🔔 **Notificações pendentes** (${list.length}):\n\n${rows}`;
    }

    async _listLifts(role, userEmail, userId) {
        const query = this._buildLiftRoleQuery(role, userEmail, userId);
        const list = await this.db.collection('lifts').find(query).sort({ createdAt: -1 }).limit(20).toArray();
        if (list.length === 0) return '🏢 Nenhum elevador registado.';
        const rows = list.map(l => {
            const next = l.nextInspectionDate ? new Date(l.nextInspectionDate).toLocaleDateString('pt-PT') : '—';
            const status = l.status || 'ativo';
            const badge = status === 'ativo' ? '✅' : '⚠️';
            return `${badge} **${l.location || l.name || l._id?.toString().slice(-6)}** | Municipal: ${l.municipalNumber || '?'} | Próx. insp: ${next}`;
        }).join('\n');
        return `🏢 **Elevadores registados** (${list.length}):\n\n${rows}`;
    }

    async _listUsers(role) {
        if (role !== 'admin' && role !== 'dispatcher') return '⛔ Sem permissão para listar utilizadores.';
        const list = await this.db.collection('users').find({}, { projection: { password: 0, passwordHash: 0 } }).sort({ createdAt: -1 }).limit(20).toArray();
        if (list.length === 0) return '👥 Nenhum utilizador encontrado.';
        const rows = list.map(u => {
            const badge = { admin: '👨‍💼', dispatcher: '📞', technician: '🔧', client: '👤' }[u.role] || '👤';
            const status = u.banned ? '🚫' : '✅';
            return `${badge}${status} **${u.name || u.email}** | ${u.role} | ${u.email}`;
        }).join('\n');
        return `👥 **Utilizadores** (${list.length}):\n\n${rows}`;
    }

    async _listRequests(role, userEmail, userId) {
        const query = {};
        const email = String(userEmail || '').toLowerCase();
        if (role === 'client' && email) query.clientEmail = email;
        if (role === 'technician') {
            const objId = this._toObjectIdMaybe(userId);
            const orConds = [
                ...(email ? [{ technicianEmail: email }] : []),
                ...(objId ? [{ assignedTo: objId }, { technicianId: objId }] : []),
                ...(userId ? [{ assignedTo: String(userId) }, { technicianId: String(userId) }] : [])
            ];
            if (orConds.length > 0) query.$or = orConds;
        }
        const list = await this.db.collection('requests').find(query).sort({ createdAt: -1 }).limit(15).toArray();
        if (list.length === 0) return '📩 Nenhum pedido encontrado.';
        const rows = list.map(r => {
            const data = r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-PT') : '?';
            const badge = { open: '🟡', assigned: '🔵', 'in-progress': '🔶', completed: '✅', cancelled: '❌' }[r.status] || '•';
            return `${badge} **${r._id?.toString().slice(-6)}** | ${r.description?.slice(0, 40) || '?'} | ${r.status} | ${data}`;
        }).join('\n');
        return `📩 **Pedidos** (${list.length}):\n\n${rows}`;
    }

    async _buildSummary(role, userEmail, userId) {
        const email = String(userEmail || '').toLowerCase();
        const objId = this._toObjectIdMaybe(userId);
        const liftQuery = this._buildLiftRoleQuery(role, userEmail, userId);

        const orcQuery = role === 'client' && email ? { 'cliente.email': email } : {};
        const inspQuery = role === 'client' && email ? { clientEmail: email } :
            (role === 'technician'
                ? { $or: [
                    ...(email ? [{ inspectorEmail: email }, { technicianEmail: email }] : []),
                    ...(objId ? [{ inspectorId: objId }, { technicianId: objId }] : []),
                    ...(userId ? [{ inspectorId: String(userId) }, { technicianId: String(userId) }] : [])
                ] }
                : {});
        const notifQuery = role === 'client' && email
            ? { status: 'pending', clientEmail: email }
            : (role === 'technician'
                ? {
                    status: 'pending',
                    $or: [
                        ...(email ? [{ technicianEmail: email }] : []),
                        ...(objId ? [{ technicianId: objId }, { targetUserId: objId }] : []),
                        ...(userId ? [{ technicianId: String(userId) }, { targetUserId: String(userId) }] : [])
                    ]
                }
                : { status: 'pending' });
        const reqScope = role === 'client' && email
            ? { clientEmail: email }
            : (role === 'technician'
                ? {
                    $or: [
                        ...(email ? [{ technicianEmail: email }] : []),
                        ...(objId ? [{ assignedTo: objId }, { technicianId: objId }] : []),
                        ...(userId ? [{ assignedTo: String(userId) }, { technicianId: String(userId) }] : [])
                    ]
                }
                : {});

        const [orc, insp, notifs, lifts, requests] = await Promise.all([
            this.db.collection('orcamentos').countDocuments(orcQuery),
            this.db.collection('inspections').countDocuments(inspQuery),
            this.db.collection('agent_notifications').countDocuments(notifQuery),
            this.db.collection('lifts').countDocuments(liftQuery),
            this.db.collection('requests').countDocuments({ ...reqScope, status: { $in: ['open', 'assigned', 'in-progress', 'pending', 'in_progress'] } }),
        ]);
        const [orcRascunho, orcEnviado] = await Promise.all([
            this.db.collection('orcamentos').countDocuments({ status: 'rascunho' }),
            this.db.collection('orcamentos').countDocuments({ status: 'enviado' }),
        ]);
        const valor = await this.db.collection('orcamentos').aggregate([{ $match: { status: 'aprovado' } }, { $group: { _id: null, sum: { $sum: '$total' } } }]).toArray();
        const valorAprovado = valor[0]?.sum?.toFixed(2).replace('.', ',') || '0,00';

        return `📊 **Visão Geral do Sistema — FestLift**\n\n` +
            `🏢 Elevadores: **${lifts}**\n` +
            `📩 Pedidos ativos: **${requests}**\n` +
            `🔔 Alertas do agente pendentes: **${notifs}**\n\n` +
            `📋 **Orçamentos:**\n` +
            `  • Total: **${orc}** | 📝 Rascunho: ${orcRascunho} | 📨 Enviados: ${orcEnviado}\n` +
            `  • Valor aprovado acumulado: **${valorAprovado}€**\n\n` +
            `🔍 Inspeções registadas: **${insp}**\n\n` +
            `_Quer detalhe em alguma área? Pergunte-me!_`;
    }

    async _showServiceCatalog(role) {
        if (role !== 'admin' && role !== 'dispatcher') {
            return '⛔ O catálogo de serviços está disponível apenas para administradores e despachantes.';
        }
        const catalog = await this._buildServiceCatalog();
        if (catalog.length === 0) return '📂 Catálogo vazio — nenhum serviço encontrado nos orçamentos aprovados.';

        const withPrice = catalog.filter(e => e.precoSugerido > 0);
        const noPrice   = catalog.filter(e => e.precoSugerido === 0);

        const rows = withPrice.map(e =>
            `💰 **${e.descricao}** | qty ref: ${e.quantidade} | **${e.precoSugerido}€** | usado ${e.occurrences}×`
        ).join('\n');

        const rowsNp = noPrice.slice(0, 8).map(e =>
            `📝 ${e.descricao} | qty ref: ${e.quantidade} | preço: _a definir_`
        ).join('\n');

        return `📂 **Catálogo de Serviços** (${catalog.length} tipos)\n\n` +
            `**Com preço histórico (${withPrice.length}):**\n${rows || '_Nenhum_'}\n\n` +
            (noPrice.length > 0 ? `**Sem preço histórico (${noPrice.length}):**\n${rowsNp}\n\n` : '') +
            `_Estes preços vêm dos orçamentos aprovados/enviados — são referências, o admin define o preço final._`;
    }

    async _rateLimitFallback(msg, role, userEmail, userId = null) {
        // First attempt: still answer via local Ollama if available.
        try {
            const ollamaReady = await this._isOllamaAvailable();
            if (ollamaReady) {
                const context = await this._buildContext(role, userEmail, userId);
                const routeHint = this._detectTaskType(msg || '');
                const prompt = `${this._buildSystemPrompt(role, context, [])}\n\nMENSAGEM DO UTILIZADOR: ${msg}`;
                const localAiReply = await this._generateViaOllama(prompt, routeHint, {
                    channel: 'chat',
                    userRole: role,
                    contextSummary: this._buildCompactContextSummary(role, context),
                    userId,
                    userMessage: msg
                });
                if (localAiReply && localAiReply.trim().length > 0) {
                    return localAiReply;
                }
            }
        } catch (err) {
            console.warn('🤖 rateLimitFallback: Ollama unavailable:', err.message);
        }

        // When Gemini is rate limited, try to answer locally anyway
        const local = await this._resolveLocally(msg, role, userEmail, userId);
        if (local) return local;
        return `⚡ **Limite de pedidos Gemini atingido** (plano gratuito: ~15/min).\n\nPosso responder diretamente a:\n• _"lista orçamentos"_ / _"conta orçamentos"_\n• _"lista inspeções"_\n• _"lista elevadores"_\n• _"lista pedidos"_\n• _"resumo geral"_\n• _"catálogo de serviços"_ ← novo!\n• _"notificações pendentes"_\n\nPara questões técnicas complexas, tente novamente em 1 minuto.`;
    }

    /**
     * Get pending notifications for a user role.
     */
    async getPendingNotifications(userRole, clientEmail = null) {
        if (!this.db) return [];

        if (userRole === 'client') {
            // Clients see their own pending alerts (all types addressed to them)
            const email = (clientEmail || '').toLowerCase();
            return await this.db.collection('agent_notifications')
                .find({
                    clientEmail: email,
                    status: { $in: ['pending', 'postponed'] },
                    type: { $in: ['quote_request', 'client_reminder', 'client_proactive', 'expiry_reminder'] }
                })
                .sort({ createdAt: -1 })
                .limit(10)
                .toArray();
        }

        // Admins / dispatchers: merge live overdue-lift scan with stored notifications.
        // Stored notifications first (quote requests, client decisions), then live scan.
        const stored = await this.db.collection('agent_notifications')
            .find({ status: { $in: ['pending', 'postponed'] } })
            .sort({ type: -1, createdAt: -1 })
            .limit(10)
            .toArray();

        // Also load recently rejected so they are excluded from the live scan (suppress for 30 days).
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentlyRejected = await this.db.collection('agent_notifications')
            .find({ status: 'rejected', decidedAt: { $gte: thirtyDaysAgo } })
            .project({ liftId: 1, liftLocation: 1 })
            .toArray();

        // Live scan: all lifts whose nextInspectionDate is overdue
        const liveOverdue = await this._scanOverdueLiftsForAdmin();

        // Merge: avoid duplicates (stored already has the same liftId/location)
        const handledIds = new Set([
            ...stored.map(n => String(n.liftId || n.liftLocation || '')),
            ...recentlyRejected.map(n => String(n.liftId || n.liftLocation || ''))
        ]);
        const fresh = liveOverdue.filter(n => !handledIds.has(String(n.liftId || n.liftLocation || '')));

        return [...stored, ...fresh].slice(0, 20);
    }

    async _scanOverdueLiftsForAdmin() {
        if (!this.db) return [];
        try {
            const today = new Date();
            const todayISO = today.toISOString();

            const [overdueLifts, noInspectionLifts] = await Promise.all([
                // Lifts with a known past inspection date that has expired
                this.db.collection('lifts').find({
                    nextInspectionDate: { $lt: todayISO, $ne: null, $exists: true },
                    active: { $ne: false }
                }).sort({ nextInspectionDate: 1 }).limit(50).toArray(),

                // Lifts that have never had an inspection recorded
                this.db.collection('lifts').find({
                    $or: [
                        { nextInspectionDate: null },
                        { nextInspectionDate: { $exists: false } }
                    ],
                    active: { $ne: false }
                }).limit(50).toArray()
            ]);

            const buildAddr = lift => {
                const a = lift.address || lift.location;
                if (!a) return lift.municipalNumber || String(lift._id);
                if (typeof a === 'object') return `${a.street || ''}, ${a.city || a.concelho || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || lift.municipalNumber || String(lift._id);
                return String(a);
            };

            const overdueItems = overdueLifts.map(lift => {
                const addr = buildAddr(lift);
                const daysOverdue = Math.ceil((today - new Date(lift.nextInspectionDate)) / 86400000);
                return {
                    _id: lift._id,
                    liftId: lift._id,
                    type: 'expiry_reminder',
                    status: 'pending',
                    liftLocation: addr,
                    municipalNumber: lift.municipalNumber,
                    clientName: lift.clientName || lift.clientEmail || '',
                    agentMessage: `⚠️ Inspeção **vencida há ${daysOverdue} dias** — ${addr}${lift.clientName ? ` (${lift.clientName})` : ''}`,
                    daysOverdue,
                    createdAt: lift.nextInspectionDate,
                    _live: true,
                };
            });

            const noInspItems = noInspectionLifts.map(lift => {
                const addr = buildAddr(lift);
                return {
                    _id: lift._id,
                    liftId: lift._id,
                    type: 'no_inspection',
                    status: 'pending',
                    liftLocation: addr,
                    municipalNumber: lift.municipalNumber,
                    clientName: lift.clientName || lift.clientEmail || '',
                    agentMessage: `🔴 Sem inspeção registada — **requerer inspeção inicial** — ${addr}${lift.clientName ? ` (${lift.clientName})` : ''}`,
                    daysOverdue: null,
                    createdAt: lift.createdAt || new Date(0),
                    _live: true,
                };
            });

            // Overdue lifts first (sorted by most overdue), then no-inspection lifts
            return [...overdueItems, ...noInspItems];
        } catch (e) {
            console.error('_scanOverdueLiftsForAdmin error:', e.message);
            return [];
        }
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
            // nextInspectionDate stored as ISO string — compare as string
            const in15daysISO = in15days.toISOString();

            // Find lifts whose nextInspectionDate is within 15 days or already past
            const lifts = await this.db.collection('lifts').find({
                nextInspectionDate: { $lte: in15daysISO, $ne: null, $exists: true },
                active: { $ne: false }
            }).limit(50).toArray();

            for (const lift of lifts) {
                if (!lift.nextInspectionDate) continue;
                const daysLeft = Math.ceil((new Date(lift.nextInspectionDate) - today) / (1000 * 60 * 60 * 24));
                const isOverdue = daysLeft < 0;

                // Resolve address safely (may be object or string)
                const liftAddressStr = (() => {
                    const a = lift.address || lift.location;
                    if (!a) return lift.municipalNumber || String(lift._id);
                    if (typeof a === 'object') {
                        return `${a.street || ''}, ${a.city || a.concelho || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || lift.municipalNumber || String(lift._id);
                    }
                    return String(a);
                })();

                // Check if already notified (pending) OR rejected within last 30 days
                // — prevents re-showing the same lift every day after rejection
                const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                const already = await this.db.collection('agent_notifications').findOne({
                    type: 'expiry_reminder',
                    $or: [
                        { liftId: lift._id },
                        { liftLocation: liftAddressStr },
                    ],
                    $and: [{ $or: [
                        { status: 'pending' },
                        { status: 'rejected',   createdAt: { $gte: thirtyDaysAgo } },
                        { status: 'confirmed',  createdAt: { $gte: thirtyDaysAgo } },
                        { status: 'postponed' },
                        { createdAt: { $gte: new Date(today.toDateString()) } },
                    ]}]
                });
                if (already) continue;

                const msg = isOverdue
                    ? `⚠️ INSPEÇÃO VENCIDA há ${Math.abs(daysLeft)} dias — ${liftAddressStr} (${lift.municipalNumber || ''}). Cliente: ${lift.clientName || lift.clientEmail || 'desconhecido'}.`
                    : `🔔 Inspeção expira em ${daysLeft} dias — ${liftAddressStr}. Cliente: ${lift.clientName || lift.clientEmail || 'desconhecido'}.`;

                const notif = {
                    type: 'expiry_reminder',
                    status: 'pending',
                    liftId: lift._id,
                    liftLocation: liftAddressStr,
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
                            ? `A inspeção do seu elevador em ${liftAddressStr} está VENCIDA há ${Math.abs(daysLeft)} dias. Por favor contacte-nos.`
                            : `A inspeção do seu elevador em ${liftAddressStr} expira em ${daysLeft} dias.`,
                        liftLocation: liftAddressStr,
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
            servicos,
            subtotal: servicos.reduce((s, i) => s + (i.total || 0), 0),
            iva: Math.round(servicos.reduce((s, i) => s + (i.total || 0), 0) * 0.23 * 100) / 100,
            total: Math.round(servicos.reduce((s, i) => s + (i.total || 0), 0) * 1.23 * 100) / 100,
            notas: `Rascunho gerado automaticamente pela IA em ${now.toLocaleDateString('pt-PT')} com base no relatório ${(notif.relatedReports || []).join(', ')}.\nServiços com preço histórico da empresa — reveja e ajuste antes de enviar.`,
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
     * Build a service catalog from all approved/sent orcamentos in the DB.
     * Returns array of { descricao, quantidade, precoUnitario, occurrences, keywords }
     */
    async _buildServiceCatalog() {
        try {
            const docs = await this.db.collection('orcamentos')
                .find({ status: { $in: ['aprovado', 'enviado', 'rascunho'] } }, { projection: { servicos: 1, numero: 1 } })
                .toArray();

            const map = new Map(); // key = normalized descricao
            for (const d of docs) {
                for (const s of (d.servicos || [])) {
                    if (!s || !s.descricao) continue;
                    const norm = s.descricao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 60);
                    if (!map.has(norm)) {
                        map.set(norm, {
                            descricao: s.descricao,
                            precos: [],
                            quantidades: [],
                            occurrences: 0,
                            keywords: this._extractKeywords(s.descricao)
                        });
                    }
                    const entry = map.get(norm);
                    entry.occurrences++;
                    if (s.precoUnitario > 0) entry.precos.push(s.precoUnitario);
                    if (s.quantidade > 0) entry.quantidades.push(s.quantidade);
                }
            }

            return Array.from(map.values()).map(e => {
                const avgPrice = e.precos.length > 0 ? Math.round(e.precos.reduce((a, b) => a + b, 0) / e.precos.length * 100) / 100 : 0;
                const avgQty = e.quantidades.length > 0 ? Math.round(e.quantidades.reduce((a, b) => a + b, 0) / e.quantidades.length) : 1;
                return { descricao: e.descricao, precoSugerido: avgPrice, quantidade: avgQty, occurrences: e.occurrences, keywords: e.keywords };
            }).sort((a, b) => b.occurrences - a.occurrences);
        } catch (err) {
            console.warn('🤖 _buildServiceCatalog error:', err.message);
            return [];
        }
    }

    _extractKeywords(text) {
        // Extract meaningful words for matching (ignore common stopwords)
        const stopwords = new Set(['de', 'do', 'da', 'e', 'o', 'a', 'em', 'para', 'com', 'se', 'no', 'na', 'um', 'uma', 'por', 'ao', 'ou']);
        return text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3 && !stopwords.has(w));
    }

    _matchServiceFromCatalog(findingText, catalog) {
        // Score each catalog entry by keyword overlap with the finding text
        const findingWords = this._extractKeywords(findingText);
        if (findingWords.length === 0 || catalog.length === 0) return null;

        let best = null;
        let bestScore = 0;
        for (const entry of catalog) {
            const overlap = entry.keywords.filter(k => findingWords.some(fw => fw.includes(k) || k.includes(fw))).length;
            const score = overlap / Math.max(entry.keywords.length, 1);
            if (score > bestScore && score >= 0.3) { // at least 30% keyword match
                bestScore = score;
                best = entry;
            }
        }
        return best;
    }

    /**
     * Generate servicos list for a new draft orçamento.
     *
     * Strategy:
     *  1. Load service catalog from DB (real past services with real prices)
     *  2. For each finding/problem, try to match a catalog entry (local, no Gemini)
     *  3. Only call Gemini for findings with no catalog match — and give it the catalog as context
     *  4. precoUnitario = historical average from DB (or 0 if new service)
     *  5. Admin can override any price before sending
     */
    async _generateServicos(findings, liftLocation) {
        const catalog = await this._buildServiceCatalog();

        // Split findings into individual problems and strip bullet prefixes
        // Merge continuation lines (lines without ':') into their parent item
        const rawLines = (findings || '')
            .split(/[\n;]+/)
            .map(l => l.replace(/^[•\-\*]\s*/, '').trim())
            .filter(l => l.length > 3);

        const lines = [];
        for (const l of rawLines) {
            if (l.includes(':') || lines.length === 0) {
                lines.push(l);                          // top-level item (has category: comment)
            } else {
                lines[lines.length - 1] += ' — ' + l; // continuation: append to previous
            }
        }
        const filtered = lines.filter(l => l.length > 5);
        if (filtered.length === 0) filtered.push(findings || 'Serviços de manutenção geral');
        const finalLines = filtered;

        const result = [];
        const unmatched = [];

        for (const line of finalLines) {
            const match = this._matchServiceFromCatalog(line, catalog);
            if (match) {
                // Use real service from DB with historical price
                result.push({
                    descricao: match.descricao,
                    quantidade: match.quantidade || 1,
                    precoUnitario: match.precoSugerido,  // real price from DB
                    precoSugerido: match.precoSugerido,   // shown as suggestion in UI
                    fontePreco: 'historico',               // flag: came from DB history
                    total: match.precoSugerido * (match.quantidade || 1)
                });
            } else {
                unmatched.push(line);
            }
        }

        // For unmatched problems, call Gemini with catalog context
        if (unmatched.length > 0) {
            const geminiServicos = await this._generateServicosViaGemini(unmatched.join('\n'), liftLocation, catalog);
            result.push(...geminiServicos);
        }

        // If nothing was matched at all — add a generic labor line from catalog or default
        if (result.length === 0) {
            const labor = catalog.find(e => e.keywords.includes('manutencao') || e.keywords.includes('inspecao') || e.keywords.includes('mao'));
            result.push(labor ? {
                descricao: labor.descricao,
                quantidade: 1,
                precoUnitario: labor.precoSugerido,
                precoSugerido: labor.precoSugerido,
                fontePreco: 'historico',
                total: labor.precoSugerido
            } : {
                descricao: 'Mão de obra — reparação e manutenção (ver relatório técnico)',
                quantidade: 1,
                precoUnitario: 0,
                total: 0
            });
        }

        return result;
    }

    async _generateServicosViaGemini(findings, liftLocation, catalog) {
        if (!process.env.GEMINI_API_KEY && this.aiProvider === 'gemini') {
            return [{ descricao: `Reparação: ${findings.slice(0, 120)}`, quantidade: 1, precoUnitario: 0, total: 0 }];
        }

        // Build catalog context for Gemini (top 10 most used real services)
        const catalogContext = catalog.slice(0, 10).map(e =>
            `- "${e.descricao}" | preço histórico: ${e.precoSugerido > 0 ? e.precoSugerido + '€' : 'sem histórico'}`
        ).join('\n');

        try {
            const prompt = `És um especialista em orçamentos de manutenção de elevadores em Portugal.

PROBLEMAS A RESOLVER:
${findings}

CATÁLOGO DE SERVIÇOS DESTA EMPRESA (serviços reais já usados):
${catalogContext || 'Sem catálogo disponível.'}

INSTRUÇÕES:
- Cria 2 a 6 linhas de serviço para estes problemas
- USA nomes do catálogo acima quando forem adequados
- Para serviços novos, usa terminologia técnica portuguesa de elevadores (normas EN 81-20)
- Separa mão-de-obra de materiais quando possível
- precoUnitario: usa o preço histórico do catálogo se existir, senão usa 0
- Responde APENAS com JSON válido:

[
  {"descricao": "nome do serviço", "quantidade": 1, "precoUnitario": 0, "total": 0}
]`;

                        const text = await this._generateText(prompt, 'operations');
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(clean);

            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map(s => ({
                    descricao: s.descricao || 'Serviço de manutenção',
                    quantidade: parseInt(s.quantidade) || 1,
                    precoUnitario: parseFloat(s.precoUnitario) || 0,
                    precoSugerido: parseFloat(s.precoUnitario) || 0,
                    fontePreco: parseFloat(s.precoUnitario) > 0 ? 'historico-gemini' : 'novo',
                    total: (parseInt(s.quantidade) || 1) * (parseFloat(s.precoUnitario) || 0)
                }));
            }
        } catch (err) {
            console.warn('🤖 _generateServicosViaGemini fallback:', err.message);
        }

        // Fallback: one service row per finding line (no concatenation)
        const fallbackLines = findings
            .split('\n')
            .map(l => l.replace(/^[•\-\*]\s*/, '').trim())
            .filter(l => l.length > 5);

        // Default prices for common elevator components (when neither catalog nor Gemini available)
        const defaultPrices = [
            { keywords: ['cabo', 'cabel'],                    descricao: 'Substituição de cabo',                         preco: 320 },
            { keywords: ['motor'],                            descricao: 'Reparação/substituição de motor',              preco: 580 },
            { keywords: ['iluminac', 'lampada', 'luz'],       descricao: 'Substituição de iluminação',                   preco: 65  },
            { keywords: ['porta', 'door'],                    descricao: 'Reparação de porta',                           preco: 180 },
            { keywords: ['freio', 'frei'],                    descricao: 'Ajuste/substituição de freio',                 preco: 240 },
            { keywords: ['amortec'],                          descricao: 'Substituição de amortecedor',                  preco: 240 },
            { keywords: ['parachoque', 'para-choque'],        descricao: 'Substituição de para-choque',                  preco: 150 },
            { keywords: ['boton', 'butao', 'botao', 'painel'], descricao: 'Reparação de botoneira/painel',               preco: 120 },
            { keywords: ['sensor', 'celula', 'fotoc'],        descricao: 'Substituição de sensor/célula fotoeléctrica',  preco: 95  },
            { keywords: ['lubrif', 'oleo', 'manutencao'],     descricao: 'Lubrificação e manutenção',                    preco: 85  },
        ];

        const normalize = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        return fallbackLines.length > 0
            ? fallbackLines.map(line => {
                const norm = normalize(line);
                const found = defaultPrices.find(dp => dp.keywords.some(k => norm.includes(k)));
                return {
                    descricao: found ? found.descricao + ` (${line.slice(0, 60)})` : line.slice(0, 100),
                    quantidade: 1,
                    precoUnitario: found ? found.preco : 0,
                    precoSugerido: found ? found.preco : 0,
                    fontePreco: found ? 'estimativa-componente' : 'novo',
                    total: found ? found.preco : 0
                };
            })
            : [{ descricao: `Reparação: ${findings.slice(0, 100)}`, quantidade: 1, precoUnitario: 0, precoSugerido: 0, fontePreco: 'novo', total: 0 }];
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

        try {
            const prompt = `Analisa este relatório técnico de elevador e resume os problemas encontrados em 2-4 frases concisas em Português de Portugal. Menciona apenas factos do relatório. Não inventes dados.

${fullText}

Responde APENAS com o resumo dos problemas, sem introdução.`;
            findings = await this._generateText(prompt, 'operations');
        } catch (_) { /* use raw text */ }

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

    async _buildContext(userRole, clientEmail, userId = null) {
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
                ctx.recentInspections = await this.db.collection('inspections')
                    .find({ clientEmail, 'violations.0': { $exists: true } })
                    .sort({ createdAt: -1 }).limit(5).toArray();
            } else if (userRole === 'technician') {
                const email = String(clientEmail || '').toLowerCase();
                const objId = this._toObjectIdMaybe(userId);
                const techReqQuery = {
                    $or: [
                        ...(email ? [{ technicianEmail: email }] : []),
                        ...(objId ? [{ assignedTo: objId }, { technicianId: objId }] : []),
                        ...(userId ? [{ assignedTo: String(userId) }, { technicianId: String(userId) }] : [])
                    ]
                };

                const techInspQuery = {
                    $or: [
                        ...(email ? [{ inspectorEmail: email }, { technicianEmail: email }] : []),
                        ...(objId ? [{ inspectorId: objId }, { technicianId: objId }] : []),
                        ...(userId ? [{ inspectorId: String(userId) }, { technicianId: String(userId) }] : [])
                    ]
                };

                ctx.pendingNotifications = await this.db.collection('agent_notifications')
                    .find({ status: { $in: ['pending', 'postponed'] }, $or: [...techReqQuery.$or, ...techInspQuery.$or] })
                    .sort({ createdAt: -1 }).limit(8).toArray();
                ctx.recentDecisions = await this.db.collection('agent_decisions')
                    .find({ decidedBy: userId }).sort({ decidedAt: -1 }).limit(5).toArray();
                ctx.orcamentos = [];
                ctx.recentInspections = await this.db.collection('inspections')
                    .find({ ...techInspQuery, 'violations.0': { $exists: true } })
                    .sort({ createdAt: -1 }).limit(6).toArray();
            } else {
                ctx.pendingNotifications = await this.db.collection('agent_notifications')
                    .find({ status: 'pending' }).sort({ createdAt: -1 }).limit(6).toArray();
                ctx.recentDecisions = await this.db.collection('agent_decisions')
                    .find({}).sort({ decidedAt: -1 }).limit(6).toArray();
                ctx.orcamentos = await this.db.collection('orcamentos')
                    .find({}).sort({ createdAt: -1 }).limit(8).toArray();
                ctx.recentInspections = await this.db.collection('inspections')
                    .find({ 'violations.0': { $exists: true } })
                    .sort({ createdAt: -1 }).limit(6).toArray();
            }
        } catch (_) {}
        return ctx;
    }

    _buildSystemPrompt(userRole, context, ragSnippets = []) {
        const profile = this._getAssistantRoleProfile(userRole);
        const pending = (context.pendingNotifications || []).length;
        const recentDecisions = (context.recentDecisions || []).length;
        const decisions = (context.recentDecisions || []).slice(0, 5)
            .map(d => `- ${d.liftLocation || '?'}: ${d.action || 'n/a'} (${d.reason || 'sem motivo'})`)
            .join('\n') || 'Nenhuma.';
        const recentOrcamentos = (context.orcamentos || []).slice(0, 5)
            .map(o => `- ${o.numero || o._id}: ${o.status} | ${o.total || 0}€`)
            .join('\n') || 'Nenhum.';
        const inspections = (context.recentInspections || []).slice(0, 4)
            .map(i => {
                const viols = i.violations || [];
                const c1 = viols.filter(v => v.classification === 'C1').length;
                const c2 = viols.filter(v => v.classification === 'C2').length;
                const c3 = viols.filter(v => v.classification === 'C3').length;
                return `- ${i.liftLocation || i.clientEmail || '?'} | C1=${c1} C2=${c2} C3=${c3}`;
            })
            .join('\n') || 'Nenhuma.';

        const memory = (context.chatMemory || []).slice(-3)
            .map((m, idx) => `${idx + 1}) Utilizador: ${m.user}\n   Assistente: ${m.assistant}`)
            .join('\n') || 'Sem histórico recente.';

        const rag = (ragSnippets || [])
            .map((s, idx) => `(${idx + 1}) [${s.source}] ${String(s.text || '').replace(/\s+/g, ' ').slice(0, 320)}...`)
            .join('\n') || 'Nenhum trecho relevante encontrado.';

        const roleDesc = {
            admin: 'administrador do sistema com acesso total',
            dispatcher: 'despachante que gere orçamentos e técnicos',
            technician: 'técnico de manutenção de elevadores',
            client: 'cliente proprietário de elevadores'
        }[userRole] || 'utilizador';

        return `És o assistente de IA do FestLift, sistema de gestão de elevadores em Portugal.
    Falas em Português de Portugal (pt-PT). Nunca uses Português do Brasil.
    O utilizador é ${roleDesc}.
    Perfil ativo: ${profile.label}.
    Objetivo do perfil: ${profile.purpose}.
    Capacidades do perfil:
    - ${profile.capabilities.join('\n- ')}
    Limites do perfil:
    - ${profile.limits.join('\n- ')}

NOTIFICAÇÕES PENDENTES:
${pending}

DECISÕES RECENTES:
${decisions}

ORÇAMENTOS (dados reais da base de dados):
${recentOrcamentos}

INSPEÇÕES COM CLÁUSULAS (dados reais — Decreto-Lei 320/2002):
${inspections}

CONTEXTO RESUMIDO:
- Notificações pendentes: ${pending}
- Decisões recentes: ${recentDecisions}
- Módulos principais da app: Dashboard, Pedidos, Orçamentos, Inspeções, Elevadores, Clientes, Utilizadores, Analytics

MEMÓRIA CURTA DA CONVERSA:
${memory}

RAG (trechos de documentação interna):
${rag}

REGRAS:
- Nunca crias orçamentos ou tomas ações sem confirmação explícita
- Se o utilizador diz "sim" a um orçamento, confirma e informa que será preparado
- Se o utilizador adia, pergunta quando quer ser lembrado
- Podes responder a perguntas técnicas sobre elevadores, normas EN 81-20, ISO 10816-3, DL 320/2002
- Quando o utilizador pergunta sobre cláusulas (C1/C2/C3), refere os artigos do DL 320/2002 e explica o nível de risco
- Para perguntas de navegação: explica em que módulo da app está a informação (Pedidos/Orçamentos/Inspeções/etc.)
- Se os dados não estiverem no contexto, diz explicitamente "não tenho esse dado no contexto atual" e pede filtro mínimo
- Sê conciso e profissional
- Para clientes: usa linguagem simples, não técnica
- Se o utilizador pedir ajuda, mostra os comandos rápidos do perfil ativo
- Quando listares orçamentos, apresenta-os em formato legível com número, cliente, estado e valor`;
    }

    _buildCompactContextSummary(userRole, context) {
        const profile = this._getAssistantRoleProfile(userRole);
        const pending = (context.pendingNotifications || []).slice(0, 4)
            .map(n => `${n.type || 'notif'} | ${n.liftLocation || '?'} | ${n.status || 'pending'}`)
            .join('\n');
        const orc = (context.orcamentos || []).slice(0, 4)
            .map(o => `${o.numero || o._id} | ${o.status || 'sem estado'} | ${o.total || 0}€`)
            .join('\n');
        const insp = (context.recentInspections || []).slice(0, 3)
            .map(i => `${i.numero || i._id} | ${i.liftLocation || i.clientEmail || '?'} | ${i.createdAt ? new Date(i.createdAt).toLocaleDateString('pt-PT') : '?'}`)
            .join('\n');
        const mem = (context.chatMemory || []).slice(-2)
            .map(m => `U: ${m.user}\nA: ${m.assistant}`)
            .join('\n');

        return [
            `Role: ${userRole}`,
            `Profile: ${profile.label}`,
            `Goal: ${profile.purpose}`,
            `Notificações pendentes (${(context.pendingNotifications || []).length}):`,
            pending || 'nenhuma',
            `Orçamentos recentes (${(context.orcamentos || []).length}):`,
            orc || 'nenhum',
            `Inspeções recentes (${(context.recentInspections || []).length}):`,
            insp || 'nenhuma',
            'Memória curta:',
            mem || 'vazia'
        ].join('\n');
    }

    _buildQuickDraftPrompt(userMessage, userRole = 'user') {
        const roleHint = userRole === 'client'
            ? 'Escreve em linguagem simples, curta e clara.'
            : 'Escreve de forma profissional, curta e acionavel.';
        return [
            'És o assistente FestLift em pt-PT.',
            'Responde curto, útil e sem inventar dados reais.',
            'Se faltarem dados, usa placeholders genéricos e indica isso de forma breve.',
            roleHint,
            '',
            `Pedido: ${userMessage}`,
            '',
            'Resposta:'
        ].join('\n');
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
