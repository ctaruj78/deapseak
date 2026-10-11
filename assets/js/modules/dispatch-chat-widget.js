// dispatch-chat-widget.js
// Widget flutuante para despachante/admin: conversas em tempo real com os técnicos.
(function () {
  if (window.__dispatchChatWidget) return;
  window.__dispatchChatWidget = true;

  const token = () => (window.AuthManager && AuthManager.getToken && AuthManager.getToken())
    || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || '';
  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

  let threads = [];
  let current = null;       // { technicianId, technicianName }
  let messages = [];
  let socket = null;

  const el = (tag, props = {}, style = '') => {
    const e = document.createElement(tag);
    Object.assign(e, props);
    if (style) e.style.cssText = style;
    return e;
  };

  // ─── UI ────────────────────────────────────────────────────────────────
  const fab = el('button', { type: 'button', title: 'Mensagens dos técnicos' },
    'position:fixed;right:96px;bottom:24px;z-index:1050;width:52px;height:52px;border-radius:50%;border:none;background:#007bff;color:#fff;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer;');
  fab.innerHTML = '<i class="fas fa-comments"></i>';
  const badge = el('span', {}, 'position:absolute;top:-4px;right:-4px;background:#dc3545;color:#fff;border-radius:10px;font-size:11px;padding:1px 6px;display:none;');
  fab.appendChild(badge);

  const panel = el('div', {}, 'position:fixed;right:24px;bottom:90px;z-index:1050;width:340px;max-width:calc(100vw - 32px);height:440px;max-height:70vh;background:#fff;color:#212529;border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;font-size:14px;');
  const head = el('div', {}, 'background:#007bff;color:#fff;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;');
  const title = el('b', { textContent: 'Mensagens dos técnicos' });
  const back = el('button', { type: 'button', textContent: '←', title: 'Voltar' }, 'background:none;border:none;color:#fff;font-size:16px;cursor:pointer;display:none;margin-right:6px;');
  const closeBtn = el('button', { type: 'button', textContent: '×', title: 'Fechar' }, 'background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;');
  const left = el('div', {}, 'display:flex;align-items:center;');
  left.append(back, title);
  head.append(left, closeBtn);

  const body = el('div', {}, 'flex:1;overflow-y:auto;padding:8px;background:#f8f9fa;');
  const form = el('div', {}, 'display:none;border-top:1px solid #ddd;padding:6px;gap:6px;background:#fff;');
  const input = el('input', { type: 'text', placeholder: 'Escreva uma mensagem...', maxLength: 1000 }, 'flex:1;padding:6px 8px;border:1px solid #ced4da;border-radius:4px;');
  const send = el('button', { type: 'button', textContent: 'Enviar' }, 'background:#007bff;color:#fff;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;');
  form.append(input, send);
  panel.append(head, body, form);

  // ─── Render ────────────────────────────────────────────────────────────
  const fmt = (d) => new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  function updateBadge() {
    const n = threads.reduce((a, t) => a + (t.unread || 0), 0);
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.style.display = n ? 'block' : 'none';
  }

  function renderThreads() {
    title.textContent = 'Mensagens dos técnicos';
    back.style.display = 'none';
    form.style.display = 'none';
    body.textContent = '';
    if (!threads.length) {
      body.appendChild(el('p', { textContent: 'Ainda não há conversas. Quando um técnico escrever, aparece aqui.' }, 'color:#6c757d;text-align:center;margin-top:30px;'));
      return;
    }
    threads.forEach(t => {
      const row = el('div', {}, 'background:#fff;border:1px solid #e1e5e9;border-radius:6px;padding:8px 10px;margin-bottom:6px;cursor:pointer;');
      const top = el('div', {}, 'display:flex;justify-content:space-between;');
      top.append(el('b', { textContent: t.technicianName || 'Técnico' }), el('small', { textContent: fmt(t.lastAt) }, 'color:#6c757d;'));
      const last = el('div', {}, 'display:flex;justify-content:space-between;color:#495057;');
      last.append(el('span', { textContent: (t.lastFrom === 'dispatcher' ? 'Eu: ' : '') + t.lastText }, 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px;'));
      if (t.unread) last.append(el('span', { textContent: t.unread }, 'background:#dc3545;color:#fff;border-radius:10px;font-size:11px;padding:1px 6px;'));
      row.append(top, last);
      row.onclick = () => openThread(t.technicianId, t.technicianName);
      body.appendChild(row);
    });
  }

  function renderMessages() {
    title.textContent = current?.technicianName || 'Técnico';
    back.style.display = '';
    form.style.display = 'flex';
    body.textContent = '';
    messages.forEach(m => {
      const mine = m.from === 'dispatcher';
      const wrap = el('div', {}, `display:flex;justify-content:${mine ? 'flex-end' : 'flex-start'};margin-bottom:6px;`);
      const bubble = el('div', {}, `max-width:80%;padding:6px 10px;border-radius:10px;background:${mine ? '#007bff' : '#fff'};color:${mine ? '#fff' : '#212529'};border:1px solid ${mine ? '#007bff' : '#e1e5e9'};word-break:break-word;`);
      bubble.append(document.createTextNode(m.text), el('div', { textContent: fmt(m.createdAt) }, 'font-size:10px;opacity:.7;text-align:right;'));
      wrap.appendChild(bubble);
      body.appendChild(wrap);
    });
    body.scrollTop = body.scrollHeight;
  }

  // ─── Dados ─────────────────────────────────────────────────────────────
  async function loadThreads() {
    try {
      const r = await fetch('/api/dispatch-messages/threads', { headers: headers() });
      if (!r.ok) return;
      threads = (await r.json()).threads || [];
      updateBadge();
      if (!current && panel.style.display !== 'none') renderThreads();
    } catch (e) { /* sem rede — ignora */ }
  }

  async function openThread(technicianId, technicianName) {
    current = { technicianId, technicianName };
    messages = [];
    renderMessages();
    try {
      const r = await fetch(`/api/dispatch-messages?technicianId=${encodeURIComponent(technicianId)}`, { headers: headers() });
      messages = (await r.json()).messages || [];
      renderMessages();
      await fetch('/api/dispatch-messages/read', { method: 'POST', headers: headers(), body: JSON.stringify({ technicianId }) });
      loadThreads();
    } catch (e) { /* ignora */ }
    input.focus();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || !current) return;
    input.disabled = true;
    try {
      const r = await fetch('/api/dispatch-messages', { method: 'POST', headers: headers(), body: JSON.stringify({ text, technicianId: current.technicianId }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || `HTTP ${r.status}`);
      input.value = '';
      // a mensagem chega também por socket; evita duplicar
      if (!messages.some(m => m.createdAt === d.message.createdAt && m.text === d.message.text)) {
        messages.push(d.message);
        renderMessages();
      }
      loadThreads();
    } catch (e) {
      if (window.toastr) toastr.error('Não foi possível enviar: ' + e.message);
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  function onSocketMessage(msg) {
    if (current && msg.technicianId === current.technicianId) {
      if (!messages.some(m => m.createdAt === msg.createdAt && m.text === msg.text)) {
        messages.push(msg);
        renderMessages();
      }
      if (msg.from === 'technician') {
        fetch('/api/dispatch-messages/read', { method: 'POST', headers: headers(), body: JSON.stringify({ technicianId: msg.technicianId }) }).catch(() => {});
      }
    } else if (msg.from === 'technician' && window.toastr) {
      toastr.info(`${msg.technicianName || 'Técnico'}: ${msg.text.slice(0, 60)}`, 'Nova mensagem');
    }
    loadThreads();
  }

  async function connect() {
    try {
      if (typeof io === 'undefined') {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = '/socket.io/socket.io.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      socket = io({ transports: ['websocket', 'polling'] });
      socket.on('connect', () => socket.emit('authenticate', token()));
      socket.on('dispatch_message', onSocketMessage);
    } catch (e) {
      console.warn('Mensagens: sem ligação em tempo real');
    }
  }

  // ─── Eventos ───────────────────────────────────────────────────────────
  fab.onclick = () => {
    const open = panel.style.display === 'none';
    panel.style.display = open ? 'flex' : 'none';
    if (open) { current ? renderMessages() : renderThreads(); loadThreads(); }
  };
  closeBtn.onclick = () => { panel.style.display = 'none'; };
  back.onclick = () => { current = null; renderThreads(); loadThreads(); };
  send.onclick = sendMessage;
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

  function init() {
    if (!token()) return;
    document.body.append(fab, panel);
    loadThreads();
    connect();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
