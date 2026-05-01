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

    // ─── Build HTML ───────────────────────────────────────────────────────────
    function buildWidget() {
        const widget = document.createElement('div');
        widget.id = 'agent-widget';
        widget.innerHTML = `
<button id="agent-trigger" title="${s.title}" data-count="0">🤖</button>

<div id="agent-panel" class="hidden">
  <div id="agent-header">
    <span class="agent-avatar">🤖</span>
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
        return localStorage.getItem('token') || localStorage.getItem('authToken') ||
               sessionStorage.getItem('token') || '';
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
        return res.json();
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
        div.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
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
    function renderNotifications() {
        const view = document.getElementById('agent-notif-view');
        if (notifications.length === 0) {
            view.innerHTML = `<div class="agent-empty"><div class="agent-empty-icon">✅</div>Sem notificações pendentes.</div>`;
            return;
        }

        view.innerHTML = '';
        notifications.forEach(n => {
            const card = document.createElement('div');
            const isExpiry = n.type === 'expiry_reminder';
            const statusClass = isExpiry ? 'expiry' : (n.status || 'pending');
            card.className = `agent-notif-card ${statusClass}`;

            const dateStr = n.createdAt ? new Date(n.createdAt).toLocaleDateString('pt-PT') : '';

            let actionHtml = '';
            if ((n.status === 'pending' || n.status === 'postponed') && (role === 'admin' || role === 'dispatcher')) {
                const cumHtml = n.type === 'quote_request'
                    ? `<button class="agent-btn cumulative" data-id="${n._id}" data-action="cumulative">📋 Tudo pendente</button>`
                    : '';
                actionHtml = `
<div class="agent-actions">
  <button class="agent-btn yes"     data-id="${n._id}" data-action="yes">✅ Sim</button>
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
<div class="notif-location">📍 ${n.liftLocation || '—'} ${n.clientName ? '— ' + n.clientName : ''}</div>
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
        const res = await apiFetch('/api/agent/decide', {
            method: 'POST',
            body: JSON.stringify({ notificationId: notifId, action, reason })
        });

        if (res.success) {
            // Show reply in chat
            showTab('chat');
            openPanel();
            appendMessage(res.response, 'agent');
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
    async function sendChat() {
        const input = document.getElementById('agent-input');
        const msg = (input.value || '').trim();
        if (!msg) return;

        input.value = '';
        appendMessage(msg, 'user');
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
                appendMessage('⚠️ ' + (res.error || 'Erro ao contactar agente.'), 'agent');
            }
        } catch (e) {
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

        socket.on('agent_update', (data) => {
            loadNotifications();
        });

        socket.on('agent_reminder', (data) => {
            showToast(data.message || 'Lembrete do agente.');
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

        trigger.addEventListener('click', () => {
            if (panel.classList.contains('hidden')) { openPanel(); } else { closePanel(); }
        });

        closeBtn.addEventListener('click', closePanel);

        document.querySelectorAll('.agent-tab').forEach(tab => {
            tab.addEventListener('click', () => showTab(tab.dataset.tab));
        });

        sendBtn.addEventListener('click', sendChat);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

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
