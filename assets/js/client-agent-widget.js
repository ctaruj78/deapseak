/**
 * client-agent-widget.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Proactive AI Agent Widget for CLIENT panel.
 * - On load: calls /api/agent/my-problems → shows lift issues + action buttons
 * - Client clicks "Sim" → sends decision → admin gets notification
 * - WebSocket: listens for agent_quote_confirmed → shows status update
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
    'use strict';

    // ── Config ──────────────────────────────────────────────────────────────
    const API = '';
    const WIDGET_ID = 'agent-client-widget';

    // ── Markdown renderer (simple) ───────────────────────────────────────────
    function md(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    // ── Token helper ─────────────────────────────────────────────────────────
    function getToken() {
        return localStorage.getItem('token') ||
               localStorage.getItem('lm_token') ||
               localStorage.getItem('deapseak_token') ||
               sessionStorage.getItem('token') || '';
    }

    function authHeaders() {
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
    }

    // ── Create/find widget container ─────────────────────────────────────────
    function getOrCreateWidget() {
        let w = document.getElementById(WIDGET_ID);
        if (w) return w;

        // Insert before the first .row.mt-4 (notifications row) or at top of content
        const card = document.createElement('div');
        card.id = WIDGET_ID;
        card.style.cssText = 'margin-bottom:20px;';
        card.innerHTML = `
            <div class="card border-warning" style="border-left:4px solid #ffc107;">
                <div class="card-header bg-warning" style="background:linear-gradient(135deg,#fff3cd,#ffeaa7)!important;">
                    <h3 class="card-title text-dark">
                        <i class="fas fa-robot mr-2"></i>Assistente de IA — Alertas dos seus elevadores
                    </h3>
                    <div class="card-tools">
                        <span class="badge badge-warning" id="agent-badge">A verificar...</span>
                    </div>
                </div>
                <div class="card-body" id="agent-body">
                    <div class="text-center text-muted py-3">
                        <i class="fas fa-spinner fa-spin mr-2"></i>A analisar os seus elevadores...
                    </div>
                </div>
            </div>
        `;

        // Find a good insertion point
        const mainSection = document.querySelector('.content-wrapper .content .container-fluid') ||
                            document.querySelector('.content-wrapper section.content');
        if (mainSection) {
            mainSection.insertBefore(card, mainSection.firstChild);
        } else {
            document.body.appendChild(card);
        }

        return card;
    }

    // ── Build clauses detail block ───────────────────────────────────────────
    function renderClausesBlock(problemsList) {
        if (!problemsList || !Array.isArray(problemsList)) return '';

        const violations = problemsList.filter(p => p.type === 'violations' && p.nokItems && p.nokItems.length > 0);
        const overdue = problemsList.filter(p => p.type === 'inspection_overdue');
        const expiring = problemsList.filter(p => p.type === 'inspection_expiring');

        let html = '';

        if (violations.length > 0) {
            html += `<div class="mt-3 p-2" style="background:#fff8e1;border-left:3px solid #f39c12;border-radius:4px;">
                <strong><i class="fas fa-clipboard-list mr-1"></i>Cláusulas com problemas detectados:</strong>
                <ul class="mb-0 mt-1" style="font-size:13px;">`;
            violations.forEach(v => {
                html += `<li class="text-muted mb-1"><em>${v.address}</em> (Rel. ${v.inspectionNum || '—'})</li>`;
                (v.nokItems || []).forEach(item => {
                    html += `<li style="list-style:disc;margin-left:16px;"><span class="badge badge-warning mr-1">NOK</span> <code>${item.item}</code>${item.comment ? ' — ' + item.comment : ''}</li>`;
                });
            });
            html += `</ul></div>`;
        }

        if (overdue.length > 0 || expiring.length > 0) {
            const items = [...overdue, ...expiring];
            html += `<div class="mt-2 p-2" style="background:#fdecea;border-left:3px solid #e74c3c;border-radius:4px;font-size:13px;">
                <strong><i class="fas fa-exclamation-triangle mr-1 text-danger"></i>Inspeções em atraso / a vencer:</strong>
                <ul class="mb-0 mt-1">`;
            items.forEach(p => {
                const days = p.daysLeft;
                const label = p.type === 'inspection_overdue'
                    ? `Vencida há <strong>${days} dias</strong>`
                    : `Vence em <strong>${days} dias</strong>`;
                html += `<li>${label} — ${p.address}</li>`;
            });
            html += `</ul><p class="mb-0 mt-1 text-muted" style="font-size:12px;">O orçamento incluirá a realização da inspeção periódica obrigatória.</p></div>`;
        }

        return html;
    }

    // ── Render alert content ─────────────────────────────────────────────────
    function renderAlert(scan) {
        const body = document.getElementById('agent-body');
        const badge = document.getElementById('agent-badge');
        if (!body) return;

        if (!scan || !scan.notifId) {
            body.innerHTML = `<div class="text-success"><i class="fas fa-check-circle mr-2"></i>Todos os seus elevadores estão em ordem. Nenhuma ação necessária.</div>`;
            if (badge) { badge.textContent = '✓ Ok'; badge.className = 'badge badge-success'; }
            return;
        }

        const notifId = scan.notifId;
        if (badge) { badge.textContent = `${scan.problems} alerta(s)`; badge.className = 'badge badge-danger'; }

        const clausesHtml = renderClausesBlock(scan.problemsList);

        body.innerHTML = `
            <div id="agent-alert-content">
                <div class="mb-3" style="line-height:1.7">${md(scan.summary)}</div>
                ${clausesHtml}
                <div id="agent-action-buttons" class="d-flex gap-2 flex-wrap" style="gap:8px;margin-top:12px;">
                    <button class="btn btn-success btn-sm" onclick="clientAgentDecide('${notifId}','yes')">
                        <i class="fas fa-thumbs-up mr-1"></i>Sim, quero orçamento
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="clientAgentDecide('${notifId}','no')">
                        <i class="fas fa-times mr-1"></i>Não, por agora não
                    </button>
                    <button class="btn btn-outline-info btn-sm ml-auto" onclick="document.getElementById('agent-msg-form').style.display='block'">
                        <i class="fas fa-comment mr-1"></i>Adicionar mensagem
                    </button>
                </div>
                <div id="agent-msg-form" style="display:none;margin-top:12px;">
                    <div class="input-group">
                        <input type="text" id="agent-msg-input" class="form-control form-control-sm" placeholder="Mensagem opcional para a equipa...">
                        <div class="input-group-append">
                            <button class="btn btn-sm btn-success" onclick="clientAgentDecide('${notifId}','yes',document.getElementById('agent-msg-input').value)">
                                <i class="fas fa-paper-plane"></i> Enviar pedido com mensagem
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ── Send decision ────────────────────────────────────────────────────────
    window.clientAgentDecide = async function (notifId, action, message) {
        const body = document.getElementById('agent-body');
        const actionDiv = document.getElementById('agent-action-buttons');
        const msgForm = document.getElementById('agent-msg-form');

        // Disable buttons
        if (actionDiv) actionDiv.innerHTML = '<span class="text-muted"><i class="fas fa-spinner fa-spin mr-2"></i>A processar...</span>';
        if (msgForm) msgForm.style.display = 'none';

        try {
            const res = await fetch(`${API}/api/agent/client-decide`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ notificationId: notifId, action, message: message || '' })
            });
            const data = await res.json();

            if (data.success) {
                if (body) {
                    body.innerHTML = `
                        <div class="alert alert-${action === 'yes' ? 'success' : 'info'} mb-0">
                            <i class="fas fa-${action === 'yes' ? 'check-circle' : 'info-circle'} mr-2"></i>
                            ${md(data.response)}
                        </div>
                    `;
                }
                const badge = document.getElementById('agent-badge');
                if (badge) { badge.textContent = action === 'yes' ? 'Pedido enviado' : 'Ignorado'; badge.className = `badge badge-${action === 'yes' ? 'success' : 'secondary'}`; }
            } else {
                if (body) body.innerHTML = `<div class="alert alert-danger">❌ Erro: ${data.error || 'Tente novamente'}</div>`;
            }
        } catch (err) {
            console.error('[ClientAgent] decision error:', err);
            if (body) body.innerHTML = `<div class="alert alert-danger">❌ Erro de ligação. Tente novamente.</div>`;
        }
    };

    // ── Load & mount ─────────────────────────────────────────────────────────
    async function init() {
        // Only for client role
        try {
            const profileRes = await fetch(`${API}/api/users/profile`, { headers: authHeaders() });
            if (!profileRes.ok) return;
            const profile = await profileRes.json();
            if ((profile.data?.role || profile.role) !== 'client') return;
        } catch (_) { return; }

        getOrCreateWidget();

        try {
            const res = await fetch(`${API}/api/agent/my-problems`, { headers: authHeaders() });
            const data = await res.json();
            renderAlert(data.data);
        } catch (err) {
            console.warn('[ClientAgent] failed to load problems:', err.message);
            const body = document.getElementById('agent-body');
            if (body) body.innerHTML = '<div class="text-muted small">Não foi possível carregar alertas. Tente mais tarde.</div>';
        }

        // ── WebSocket: listen for admin confirmation ──────────────────────────
        if (window.io) {
            const token = getToken();
            const socket = window.io({ auth: { token } });
            socket.on('agent_quote_confirmed', (data) => {
                // Show a toast or update the widget
                if (window.showToast) {
                    window.showToast(data.message, data.rejected ? 'warning' : 'success', 8000);
                } else {
                    const body = document.getElementById('agent-body');
                    if (body) {
                        const alertDiv = document.createElement('div');
                        alertDiv.className = `alert alert-${data.rejected ? 'info' : 'success'} mt-2`;
                        alertDiv.innerHTML = `<i class="fas fa-robot mr-2"></i>${md(data.message)}`;
                        body.appendChild(alertDiv);
                    }
                }
                console.log('[ClientAgent] Agent confirmation received:', data);
            });
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500); // Small delay to let auth complete
    }
})();
