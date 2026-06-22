/**
 * FestLift AI Agent Widget
 *
 * Drop-in widget for all panels (admin, dispatcher, tech, client).
 * Usage in HTML:
 *
 *   <link rel="stylesheet" href="/assets/css/agent-widget.css">
 *   <script>
 *     window.AGENT_CONFIG = { role: 'admin' }; // or dispatcher / technician / client
 *   </script>
 *   <script src="/assets/js/agent-widget.js" defer></script>
 */

(function () {
    'use strict';

    // ─── Config ───────────────────────────────────────────────────────────────
    const CFG = Object.assign({
        role: 'admin',
        baseUrl: '',
        avatarStyle: 'wizard',
        strings: {
            admin:      { title: 'Agente FestLift', subtitle: 'Assistente Administrativo' },
            dispatcher: { title: 'Agente FestLift', subtitle: 'Assistente de Despacho' },
            technician: { title: 'Agente FestLift', subtitle: 'Assistente Técnico' },
            client:     { title: 'Assistente FestLift', subtitle: 'O seu assistente de elevadores' }
        }
    }, window.AGENT_CONFIG || {});

    const role = CFG.role;
    const s = CFG.strings[role] || CFG.strings.admin;

    let pendingCount = 0;
    let notifications = [];
    let socket = null;
    let activeNotifId = null;  // notification being decided
    let pdfQuoteFlow = null;

    // ─── Build HTML ───────────────────────────────────────────────────────────
    function buildWidget() {
        const widget = document.createElement('div');
        widget.id = 'agent-widget';
        const attachTitle = role === 'client'
            ? 'Analisar PDF'
            : 'Analisar PDF para orçamento';
        const isMinimalAvatar = CFG.avatarStyle === 'minimal';
        const isWizardAvatar = CFG.avatarStyle === 'wizard';
        const triggerClass = isMinimalAvatar ? 'avatar-minimal' : (isWizardAvatar ? 'avatar-wizard' : '');
        const triggerChar = isMinimalAvatar ? '' : (isWizardAvatar ? '🧙' : '🤖');
        const headerAvatarClass = isMinimalAvatar
            ? 'agent-avatar avatar-minimal'
            : (isWizardAvatar ? 'agent-avatar avatar-wizard' : 'agent-avatar');
        const headerAvatarChar = isMinimalAvatar ? '' : (isWizardAvatar ? '🧙' : '🤖');
        widget.innerHTML = `
<button id="agent-trigger" class="${triggerClass}" title="${s.title}" data-count="0">${triggerChar}</button>

<div id="agent-panel" class="hidden">
  <div id="agent-header">
        <span class="${headerAvatarClass}">${headerAvatarChar}</span>
    <div class="agent-title">
      <strong>${s.title}</strong>
      <small>${s.subtitle}</small>
    </div>
    <button class="agent-close" id="agent-close">✕</button>
  </div>

  <div id="agent-tabs">
    <button class="agent-tab active" data-tab="chat">💬 Chat</button>
    <button class="agent-tab" data-tab="notifications" id="agent-notif-tab">
      🔔 Notificações <span id="agent-badge" style="display:none"></span>
    </button>
  </div>

  <div id="agent-body">
    <!-- Chat view -->
    <div id="agent-chat-view">
      <div id="agent-messages"></div>
      <div id="agent-input-area">
                <input id="agent-pdf-input" type="file" accept="application/pdf" style="display:none;" />
                                <button id="agent-attach" title="${attachTitle}">📎</button>
        <input id="agent-input" type="text" placeholder="Escreva aqui…" />
        <button id="agent-send">➤</button>
      </div>
    </div>

    <!-- Notifications view -->
    <div id="agent-notif-view" style="display:none;"></div>
  </div>
</div>
`;
        document.body.appendChild(widget);
    }

    // ─── Auth helpers ─────────────────────────────────────────────────────────
    function getToken() {
        if (window.AuthManager && typeof window.AuthManager.getAuthToken === 'function') {
            const t = window.AuthManager.getAuthToken();
            if (t) return t;
        }

        return sessionStorage.getItem('liftmanager_jwt') ||
               localStorage.getItem('liftmanager_jwt') ||
               localStorage.getItem('token') ||
               localStorage.getItem('authToken') ||
               sessionStorage.getItem('token') ||
               localStorage.getItem('lm_token') ||
               localStorage.getItem('deapseak_token') ||
               '';
    }

    async function apiFetch(path, opts = {}) {
        const token = getToken();
        const res = await fetch(CFG.baseUrl + path, {
            ...opts,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...(opts.headers || {})
            }
        });
        const payload = await readResponsePayload(res);
        if (!res.ok) {
            return {
                success: false,
                status: res.status,
                error: payload?.error || payload?.message || `HTTP ${res.status}`
            };
        }

        return payload || { success: false, error: 'Resposta vazia do servidor.' };
    }

    async function readResponsePayload(res) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                return await res.json();
            } catch (error) {
                return null;
            }
        }

        try {
            const text = await res.text();
            if (!text) return null;
            try {
                return JSON.parse(text);
            } catch (error) {
                return { message: text };
            }
        } catch (error) {
            return null;
        }
    }

    async function apiUploadFetch(path, formData) {
        const token = getToken();
        const res = await fetch(CFG.baseUrl + path, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        const payload = await readResponsePayload(res);

        if (payload && typeof payload === 'object' && res.ok) {
            return payload;
        }

        return {
            success: false,
            status: res.status,
            error: payload?.error || payload?.message || `Resposta inválida do servidor (HTTP ${res.status}).`
        };
    }

    // ─── UI helpers ───────────────────────────────────────────────────────────
    function openPanel() {
        document.getElementById('agent-panel').classList.remove('hidden');
    }

    function closePanel() {
        document.getElementById('agent-panel').classList.add('hidden');
    }

    function showTab(name) {
        document.querySelectorAll('.agent-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
        document.getElementById('agent-chat-view').style.display = name === 'chat' ? 'flex' : 'none';
        document.getElementById('agent-notif-view').style.display = name === 'notifications' ? 'block' : 'none';
    }

    function updateBadge(count) {
        pendingCount = count;
        const trigger = document.getElementById('agent-trigger');
        const badge   = document.getElementById('agent-badge');
        const tab     = document.getElementById('agent-notif-tab');

        if (count > 0) {
            trigger.classList.add('has-pending');
            trigger.setAttribute('data-count', count);
            if (badge) { badge.textContent = count; badge.style.display = 'inline'; }
            if (tab) tab.style.fontWeight = '700';
        } else {
            trigger.classList.remove('has-pending');
            trigger.removeAttribute('data-count');
            if (badge) badge.style.display = 'none';
            if (tab) tab.style.fontWeight = '';
        }
    }

    function appendMessage(content, from = 'agent', extra = '') {
        const wrap = document.getElementById('agent-messages');
        const div = document.createElement('div');
        div.className = `agent-msg from-${from}${extra ? ' ' + extra : ''}`;
        // Safe rendering: escape content first, then apply only trusted markdown transforms
        const escaped = String(content)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        div.innerHTML = escaped
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        wrap.appendChild(div);
        wrap.scrollTop = wrap.scrollHeight;
        return div;
    }

    function showTyping() {
        const wrap = document.getElementById('agent-messages');
        const div = document.createElement('div');
        div.className = 'agent-typing';
        div.id = 'agent-typing-indicator';
        div.innerHTML = '<span></span><span></span><span></span>';
        wrap.appendChild(div);
        wrap.scrollTop = wrap.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('agent-typing-indicator');
        if (el) el.remove();
    }

    // ─── Notifications rendering ───────────────────────────────────────────────
    function safeAddr(loc) {
        if (!loc) return '—';
        if (typeof loc === 'string') return loc;
        if (typeof loc === 'object') {
            return `${loc.street || ''}, ${loc.city || loc.concelho || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || JSON.stringify(loc);
        }
        return String(loc);
    }

    async function dismissAllNotifications() {
        if (!await swalConfirm('Descartar todas as notificações pendentes?')) return;
        const res = await apiFetch('/api/agent/dismiss-all', { method: 'POST' });
        if (res.success) {
            notifications = [];
            renderNotifications();
            updateBadge(0);
        }
    }

    function renderNotifications() {
        const view = document.getElementById('agent-notif-view');
        if (notifications.length === 0) {
            view.innerHTML = `<div class="agent-empty"><div class="agent-empty-icon">✅</div>Sem notificações pendentes.</div>`;
            return;
        }

        // Dismiss-all toolbar
        const toolbar = document.createElement('div');
        toolbar.style.cssText = 'display:flex;justify-content:flex-end;padding:6px 8px 2px;';
        const dismissBtn = document.createElement('button');
        dismissBtn.textContent = '🗑️ Limpar tudo';
        dismissBtn.style.cssText = 'background:none;border:1px solid #dc3545;color:#dc3545;border-radius:4px;padding:3px 10px;font-size:12px;cursor:pointer;';
        dismissBtn.onclick = dismissAllNotifications;
        toolbar.appendChild(dismissBtn);

        view.innerHTML = '';
        view.appendChild(toolbar);
        notifications.forEach(n => {
            const card = document.createElement('div');
            const isExpiry = n.type === 'expiry_reminder';
            const isClientRequest = n.type === 'client_quote_request';
            const statusClass = isExpiry ? 'expiry' : isClientRequest ? 'client-request' : (n.status || 'pending');
            card.className = `agent-notif-card ${statusClass}`;
            if (isClientRequest) card.style.cssText = 'border-left:4px solid #28a745;background:#f0fff4;';

            const dateStr = n.createdAt ? new Date(n.createdAt).toLocaleDateString('pt-PT') : '';

            // Special header for client-initiated requests
            const clientRequestBadge = isClientRequest
                ? `<div style="background:#28a745;color:#fff;padding:4px 10px;border-radius:4px;font-size:12px;margin-bottom:8px;display:inline-block;">
                       🙋 PEDIDO PELO CLIENTE ${n.clientMessage ? `— "${n.clientMessage}"` : ''}
                   </div><br>`
                : '';

            let actionHtml = '';
            if ((n.status === 'pending' || n.status === 'postponed') && (role === 'admin' || role === 'dispatcher')) {
                const cumHtml = n.type === 'quote_request'
                    ? `<button class="agent-btn cumulative" data-id="${n._id}" data-action="cumulative">📋 Tudo pendente</button>`
                    : '';
                const yesLabel = isClientRequest ? '✅ Criar orçamento (cliente pediu!)' : '✅ Sim';
                actionHtml = `
<div class="agent-actions">
  <button class="agent-btn yes"     data-id="${n._id}" data-action="yes">${yesLabel}</button>
  <button class="agent-btn no"      data-id="${n._id}" data-action="no">❌ Não</button>
  <button class="agent-btn postpone" data-id="${n._id}" data-action="postpone">⏳ Adiar</button>
  ${cumHtml}
</div>
<input class="agent-reason-input" style="display:none" data-for="${n._id}" placeholder="Motivo / quando lembrar…" />`;
            } else if ((n.status === 'pending') && role === 'client') {
                actionHtml = `
<div class="agent-actions">
  <button class="agent-btn yes" data-id="${n._id}" data-action="yes">📋 Quero orçamento</button>
  <button class="agent-btn no"  data-id="${n._id}" data-action="no">Não, obrigado</button>
</div>`;
            }

            card.innerHTML = `
${clientRequestBadge}
<div class="notif-location">📍 ${safeAddr(n.liftLocation)} ${n.clientName ? '— ' + n.clientName : ''}</div>
<div class="notif-msg">${(n.agentMessage || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>
<div class="notif-date">${dateStr}${n.status === 'postponed' ? ' · Adiado' : ''}</div>
${actionHtml}`;
            view.appendChild(card);
        });

        // Action button listeners
        view.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => handleNotifAction(btn, view));
        });
    }

    async function handleNotifAction(btn, view) {
        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === 'postpone' || action === 'no') {
            // Show reason input
            const input = view.querySelector(`input[data-for="${id}"]`);
            if (input && input.style.display === 'none') {
                input.style.display = 'block';
                input.focus();

                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'agent-btn postpone';
                confirmBtn.style.marginTop = '4px';
                confirmBtn.textContent = 'Confirmar';
                confirmBtn.onclick = () => sendDecision(id, action, input.value);
                input.parentNode.insertBefore(confirmBtn, input.nextSibling);
                return;
            }
        }

        if (action === 'cumulative') {
            await loadCumulativeFindings(id);
            return;
        }

        await sendDecision(id, action, '');
    }

    async function sendDecision(notifId, action, reason) {
        // Route to client-specific endpoint if user is client
        const endpoint = role === 'client' ? '/api/agent/client-decide' : '/api/agent/decide';
        const body = role === 'client'
            ? { notificationId: notifId, action, message: reason }
            : { notificationId: notifId, action, reason };

        const res = await apiFetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });

        if (res.success) {
            showTab('chat');
            openPanel();

            // Replace **bold** markdown in response
            let replyHtml = (res.response || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

            // If a draft orçamento was created, add a direct "Definir preços" button
            if (res.orcamento && res.orcamento.numero) {
                const link = `/pages/admin/orcamentos-list.html?highlight=${res.orcamento.numero}`;
                const servicosList = (res.orcamento.servicos || [])
                    .map((s, i) => `${i + 1}. ${s.descricao} (x${s.quantidade})`)
                    .join('<br>');
                replyHtml += `<br><br><small><strong>Serviços pré-preenchidos:</strong><br>${servicosList}</small>` +
                    `<br><a href="${link}" style="display:inline-block;margin-top:8px;padding:6px 16px;background:#2563eb;color:#fff;border-radius:20px;text-decoration:none;font-size:12px;font-weight:600">💰 Definir preços e enviar</a>`;
            }

            const el = document.createElement('div');
            el.className = 'agent-msg from-agent';
            el.innerHTML = replyHtml;
            document.getElementById('agent-messages').appendChild(el);
            document.getElementById('agent-messages').scrollTop = 99999;

            // Refresh
            await loadNotifications();
        }
    }

    async function loadCumulativeFindings(notifId) {
        const notif = notifications.find(n => String(n._id) === String(notifId));
        if (!notif) return;

        showTab('chat');
        openPanel();
        showTyping();
        const res = await apiFetch(`/api/agent/lift-history?liftLocation=${encodeURIComponent(notif.liftLocation)}`);
        hideTyping();

        if (res.success && res.data) {
            const d = res.data;
            const msg = `📋 **Histórico completo — ${d.liftLocation}**\n\n` +
                `${d.totalReports} relatório(s) com problemas por resolver:\n\n${d.combinedFindings}\n\n` +
                `Criar orçamento conjunto para todos estes problemas?`;
            const el = appendMessage(msg, 'agent', 'proactive');
            el.innerHTML += `<div class="agent-actions">
  <button class="agent-btn yes" data-id="${notifId}" data-action="yes">✅ Criar orçamento conjunto</button>
  <button class="agent-btn no"  data-id="${notifId}" data-action="no">❌ Não</button>
</div>`;
            el.querySelectorAll('[data-action]').forEach(b => {
                b.addEventListener('click', () => sendDecision(b.dataset.id, b.dataset.action, ''));
            });
        }
    }

    // ─── Load from API ─────────────────────────────────────────────────────────
    async function loadNotifications() {
        try {
            const res = await apiFetch('/api/agent/notifications');
            if (res.success) {
                notifications = res.data || [];
                const pending = notifications.filter(n => n.status === 'pending' || n.status === 'postponed');
                updateBadge(pending.length);
                renderNotifications();
            }
        } catch (_) {}
    }

    // ─── Chat ──────────────────────────────────────────────────────────────────
    function parseMoneyValue(raw) {
        const cleaned = String(raw || '')
            .trim()
            .replace(/€/g, '')
            .replace(/\s+/g, '')
            .replace(/,/g, '.');
        if (!cleaned) return null;
        const n = Number(cleaned);
        if (!Number.isFinite(n) || n < 0) return null;
        return Math.round(n * 100) / 100;
    }

    function toEuro(v) {
        const n = Number(v || 0);
        return `${n.toFixed(2)}€`;
    }

    function askNextPriceQuestion() {
        if (!pdfQuoteFlow) return;
        const idx = pdfQuoteFlow.index;
        const items = pdfQuoteFlow.estimate?.servicos || [];
        if (idx >= items.length) return;
        const item = items[idx];
        const suggested = Number(item.precoSugerido || 0);
        appendMessage(
            `💰 Item ${idx + 1}/${items.length}: **${item.descricao}** (qtd ${item.quantidade || 1})\n` +
            (suggested > 0 ? `Sugestão histórica: ${toEuro(suggested)}\n` : '') +
            `Indique o preço unitário (ex.: 120 ou 120,50).`,
            'agent'
        );
    }

    function renderSaveDraftButton() {
        if (!pdfQuoteFlow) return;
        if (!(role === 'admin' || role === 'dispatcher')) {
            appendMessage('ℹ️ Pré-visualização concluída. Apenas admin/dispatcher podem guardar orçamento em rascunho.', 'agent');
            return;
        }

        const btnId = `agent-save-draft-${Date.now()}`;
        appendMessage(
            `✅ Preços preenchidos.\n` +
            `<button id="${btnId}" class="agent-btn yes" style="margin-top:8px;">💾 Guardar como rascunho de orçamento</button>`,
            'agent'
        );

        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', async () => {
                if (!pdfQuoteFlow) return;
                btn.disabled = true;
                btn.textContent = 'A guardar...';
                try {
                    const res = await apiFetch('/api/agent/pdf-estimate/save-draft', {
                        method: 'POST',
                        body: JSON.stringify({
                            analysis: pdfQuoteFlow.analysis,
                            estimate: pdfQuoteFlow.estimate,
                            task: pdfQuoteFlow.task || '',
                            fileName: pdfQuoteFlow.fileName || ''
                        })
                    });

                    if (!res.success || !res.orcamento) {
                        throw new Error(res.error || 'Falha ao guardar rascunho');
                    }

                    const numero = res.orcamento.numero;
                    const link = `/pages/admin/orcamentos-list.html?highlight=${encodeURIComponent(numero)}`;
                    const m = res.matching || {};
                    appendMessage(
                        `📄 Rascunho **${numero}** guardado com sucesso.\n` +
                        `Autodeteção: cliente ${m.clientMatched ? '✅' : '⚠️'}, elevador ${m.liftMatched ? '✅' : '⚠️'}\n` +
                        `<a href="${link}" style="display:inline-block;margin-top:8px;padding:6px 14px;background:#2563eb;color:#fff;border-radius:20px;text-decoration:none;font-size:12px;font-weight:600">Abrir rascunho</a>`,
                        'agent'
                    );
                    pdfQuoteFlow = null;
                } catch (error) {
                    appendMessage(`⚠️ ${error.message || 'Erro ao guardar rascunho.'}`, 'agent');
                    btn.disabled = false;
                    btn.textContent = '💾 Guardar como rascunho de orçamento';
                }
            });
        }
    }

    function startPdfPricingWizard(pdfResult, fileName, task) {
        const baseItems = Array.isArray(pdfResult?.estimate?.servicos) ? pdfResult.estimate.servicos : [];
        if (baseItems.length === 0) return;

        const clonedItems = baseItems.map(item => ({
            ...item,
            quantidade: Number(item.quantidade || 1),
            precoUnitario: Number(item.precoUnitario || 0),
            total: Number(item.total || 0)
        }));

        pdfQuoteFlow = {
            fileName,
            task,
            analysis: pdfResult.analysis || {},
            estimate: {
                ...(pdfResult.estimate || {}),
                servicos: clonedItems
            },
            index: 0,
            finished: false
        };

        appendMessage('🧮 Vamos preencher os preços ponto a ponto no chat. Escreva "cancelar" para sair.', 'agent');
        askNextPriceQuestion();
    }

    async function handlePdfPricingStep(userMessage) {
        if (!pdfQuoteFlow || pdfQuoteFlow.finished) return false;

        const txt = String(userMessage || '').trim().toLowerCase();
        if (txt === 'cancelar' || txt === 'stop' || txt === 'parar') {
            pdfQuoteFlow = null;
            appendMessage('✅ Modo de preços cancelado.', 'agent');
            return true;
        }

        const value = parseMoneyValue(userMessage);
        if (value === null) {
            appendMessage('⚠️ Valor inválido. Exemplo: 120 ou 120,50.', 'agent');
            return true;
        }

        const idx = pdfQuoteFlow.index;
        const items = pdfQuoteFlow.estimate.servicos || [];
        if (idx >= items.length) return true;

        const item = items[idx];
        item.precoUnitario = value;
        item.total = Math.round((Number(item.quantidade || 1) * value) * 100) / 100;

        pdfQuoteFlow.index += 1;

        if (pdfQuoteFlow.index < items.length) {
            askNextPriceQuestion();
            return true;
        }

        pdfQuoteFlow.finished = true;
        const subtotal = Math.round(items.reduce((sum, s) => sum + Number(s.total || 0), 0) * 100) / 100;
        const iva = Math.round(subtotal * 0.23 * 100) / 100;
        const total = Math.round((subtotal + iva) * 100) / 100;
        pdfQuoteFlow.estimate.subtotal = subtotal;
        pdfQuoteFlow.estimate.iva = iva;
        pdfQuoteFlow.estimate.total = total;

        appendMessage(`📊 Totais: Subtotal ${toEuro(subtotal)} | IVA ${toEuro(iva)} | Total ${toEuro(total)}`, 'agent');
        renderSaveDraftButton();
        return true;
    }

    function summarizeClientPdfAnalysis(res, fileName) {
        const a = res.analysis || {};
        const st = a.stats || {};
        const passed = Boolean(a.passed);
        const status = passed ? '✅ Aprovado' : '⚠️ Requer atenção';
        return `📄 PDF analisado: ${fileName}\n` +
            `Resultado: ${status}\n` +
            `Cláusulas: total ${st.total || 0} (C1: ${st.critical || 0}, C2: ${st.medium || 0}, C3: ${st.low || 0})\n` +
            `Posso explicar qualquer cláusula específica se quiser.`;
    }

    async function sendChat() {
        const input = document.getElementById('agent-input');
        const msg = (input.value || '').trim();
        if (!msg) return;

        input.value = '';
        appendMessage(msg, 'user');

        if (await handlePdfPricingStep(msg)) {
            return;
        }

        showTyping();

        try {
            const res = await apiFetch('/api/agent/chat', {
                method: 'POST',
                body: JSON.stringify({ message: msg })
            });
            hideTyping();
            if (res.success) {
                appendMessage(res.reply, 'agent');
            } else {
                const hint = res.status === 503
                    ? ' O servidor de IA pode estar sem provedor configurado neste momento.'
                    : '';
                appendMessage('⚠️ ' + (res.error || 'Erro ao contactar agente.') + hint, 'agent');
            }
        } catch (e) {
            hideTyping();
            appendMessage('⚠️ Não foi possível comunicar com o servidor.', 'agent');
        }
    }

    async function sendPdfEstimate(file) {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            appendMessage('⚠️ Só ficheiros PDF são suportados para este tipo de análise.', 'agent');
            return;
        }

        const input = document.getElementById('agent-input');
        const task = (input.value || '').trim();
        input.value = '';

        appendMessage(`📄 ${file.name}${task ? `\nTarefa: ${task}` : ''}`, 'user');
        showTyping();

        try {
            const formData = new FormData();
            formData.append('pdfReport', file);

            let res;
            if (role === 'client') {
                res = await apiUploadFetch('/api/pdf/upload', formData);
            } else {
                formData.append('withoutPrices', 'true');
                if (task) formData.append('task', task);
                res = await apiUploadFetch('/api/agent/pdf-estimate', formData);
            }

            hideTyping();

            if (res.success) {
                if (role === 'client') {
                    appendMessage(summarizeClientPdfAnalysis(res, file.name), 'agent');
                } else {
                    appendMessage(res.reply || '✅ PDF analisado e rascunho preparado.', 'agent');
                    if (role === 'admin' || role === 'dispatcher') {
                        startPdfPricingWizard(res, file.name, task);
                    } else {
                        appendMessage('ℹ️ Pré-análise concluída. A criação de orçamento é feita por admin/dispatcher.', 'agent');
                    }
                }
            } else {
                const reason = res?.error || res?.message || 'Erro ao analisar PDF.';
                const hint = role === 'client'
                    ? 'Tente outro PDF de relatório técnico (legível) ou peça validação ao suporte.'
                    : 'Verifique se o PDF é um relatório técnico válido e tente novamente.';
                appendMessage(`⚠️ ${reason}\n${hint}`, 'agent');
            }
        } catch (_) {
            hideTyping();
            appendMessage('⚠️ Sem ligação ao servidor.', 'agent');
        }
    }

    // ─── WebSocket integration ─────────────────────────────────────────────────
    function connectSocket() {
        // Reuse existing socket if available (from websocket-client.js)
        if (window.socket) {
            socket = window.socket;
        } else if (window.io) {
            socket = window.io();
            const token = getToken();
            if (token) socket.emit('authenticate', token);
        } else {
            return;
        }

        socket.on('agent_new_notification', (data) => {
            // Flash the trigger
            const trigger = document.getElementById('agent-trigger');
            trigger.style.animation = 'none';
            setTimeout(() => { trigger.style.animation = ''; }, 50);

            // Reload notifications
            loadNotifications();

            // Show proactive message in chat (if panel open) or toast
            const msg = data.message || 'Nova notificação do agente.';
            if (!document.getElementById('agent-panel').classList.contains('hidden')) {
                appendMessage(`🔔 ${msg}`, 'agent', 'proactive');
            } else {
                showToast(msg);
            }
        });

        socket.on('agent_orcamento_ready', (data) => {
            // Admin/dispatcher: draft orçamento was created, show rich notification
            const link = data.link || `/pages/admin/orcamentos-list.html`;
            const servicosList = (data.servicos || [])
                .map((s, i) => `${i + 1}. ${s.descricao} (x${s.quantidade}) — preço: <strong style="color:#ef4444">€ a definir</strong>`)
                .join('<br>');

            const html = `📋 <strong>Rascunho ${data.numero}</strong> criado para <strong>${data.clientName || ''}</strong><br>` +
                `📍 ${safeAddr(data.liftLocation)}<br><br>` +
                `<small>${servicosList}</small><br><br>` +
                `<a href="${link}" style="display:inline-block;margin-top:6px;padding:6px 14px;background:#2563eb;color:#fff;border-radius:20px;text-decoration:none;font-size:12px;font-weight:600">💰 Definir preços e enviar</a>`;

            openPanel();
            showTab('chat');
            const el = appendMessage(html, 'agent', 'proactive');
            el.style.maxWidth = '100%';

            showToast(`Rascunho ${data.numero} criado — defina os preços e envie ao cliente.`);
        });

        socket.on('agent_update', (data) => {
            loadNotifications();
        });

        socket.on('agent_reminder', (data) => {
            showToast(data.message || 'Lembrete do agente.');
            loadNotifications();
        });

        // Client receives feedback when admin confirms/rejects their quote request
        socket.on('agent_quote_confirmed', (data) => {
            const msg = data.message || (data.rejected ? 'A equipa analisou o seu pedido.' : 'A equipa confirmou o seu pedido!');
            showToast(`🤖 ${msg}`);
            loadNotifications();
        });
    }

    function showToast(message) {
        // Try toastr if available
        if (window.toastr) {
            window.toastr.info(message, '🤖 Agente FestLift', {
                timeOut: 8000,
                onclick: () => { openPanel(); showTab('notifications'); }
            });
            return;
        }
        // Basic fallback
        const toast = document.createElement('div');
        toast.style.cssText = `
            position:fixed; bottom:90px; right:24px; z-index:10000;
            background:#1e3a8a; color:#fff; padding:12px 16px; border-radius:10px;
            max-width:300px; font-size:13px; box-shadow:0 4px 20px rgba(0,0,0,0.2);
            cursor:pointer; line-height:1.4;
        `;
        toast.textContent = '🤖 ' + message;
        toast.onclick = () => { openPanel(); showTab('notifications'); toast.remove(); };
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 8000);
    }

    // ─── Welcome message ───────────────────────────────────────────────────────
    function showWelcome() {
        const welcomes = {
            admin:      'Olá! Sou o seu assistente de gestão. Monitoro relatórios, inspecções e orçamentos. Posso ajudar?',
            dispatcher: 'Olá! Acompanho relatórios dos técnicos e notifico quando há orçamentos a preparar. Como posso ajudar?',
            technician: 'Olá! Estou ciente dos elevadores que vai visitar hoje. Posso ajudá-lo com informação técnica ou normas aplicáveis.',
            client:     'Olá! Acompanho o estado dos seus elevadores e aviso-o sobre inspecções e reparações necessárias. Como posso ajudar?'
        };
        appendMessage(welcomes[role] || welcomes.admin, 'agent');
    }

    // ─── Init ──────────────────────────────────────────────────────────────────
    function init() {
        buildWidget();

        const trigger = document.getElementById('agent-trigger');
        const panel   = document.getElementById('agent-panel');
        const closeBtn = document.getElementById('agent-close');
        const sendBtn  = document.getElementById('agent-send');
        const input    = document.getElementById('agent-input');
        const attachBtn = document.getElementById('agent-attach');
        const pdfInput = document.getElementById('agent-pdf-input');

        trigger.addEventListener('click', () => {
            if (panel.classList.contains('hidden')) { openPanel(); } else { closePanel(); }
        });

        closeBtn.addEventListener('click', closePanel);

        document.querySelectorAll('.agent-tab').forEach(tab => {
            tab.addEventListener('click', () => showTab(tab.dataset.tab));
        });

        sendBtn.addEventListener('click', sendChat);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
        attachBtn.addEventListener('click', () => pdfInput.click());
        pdfInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) await sendPdfEstimate(file);
            e.target.value = '';
        });

        // Show welcome
        showWelcome();

        // Load pending
        loadNotifications();

        // Connect socket (try after a small delay to let websocket-client.js init)
        setTimeout(connectSocket, 1500);

        // Refresh every 2 min
        setInterval(loadNotifications, 120000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
