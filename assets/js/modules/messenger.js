// messenger.js
// Mensagens em tempo real entre o técnico e o despachante (REST + Socket.IO)

class Messenger {
  constructor() {
    this.messages = [];
    this.container = null;
    this.socket = null;
  }

  getToken() {
    return (window.AuthManager && AuthManager.getToken && AuthManager.getToken())
      || localStorage.getItem('liftmanager_jwt')
      || localStorage.getItem('authToken')
      || '';
  }

  headers() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` };
  }

  render(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) return;
    this.container.innerHTML = `
      <h4>Mensagens com o despachante</h4>
      <div id="chatWindow" style="height:150px;overflow-y:auto;border:1px solid #ccc;padding:5px;margin-bottom:10px;"></div>
      <input type="text" id="chatInput" class="form-control mb-2" placeholder="Escreva uma mensagem..." maxlength="1000">
      <button class="btn btn-primary btn-sm" id="sendMsgBtn">Enviar</button>
    `;
    document.getElementById('sendMsgBtn').onclick = () => this.sendMessage();
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
    this.loadHistory();
    this.connect();
  }

  async loadHistory() {
    try {
      const res = await fetch('/api/dispatch-messages', { headers: this.headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.messages = data.messages || [];
      this.updateChat();
      fetch('/api/dispatch-messages/read', { method: 'POST', headers: this.headers(), body: '{}' }).catch(() => {});
    } catch (err) {
      console.warn('Mensagens: não foi possível carregar o histórico:', err.message);
    }
  }

  async connect() {
    if (this.socket) return;
    try {
      if (typeof io === 'undefined') {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = '/socket.io/socket.io.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      this.socket = io({ transports: ['websocket', 'polling'] });
      this.socket.on('connect', () => this.socket.emit('authenticate', this.getToken()));
      this.socket.on('dispatch_message', (msg) => {
        // a mensagem própria já foi adicionada no envio
        if (msg.from === 'technician') return;
        this.messages.push(msg);
        this.updateChat();
        fetch('/api/dispatch-messages/read', { method: 'POST', headers: this.headers(), body: '{}' }).catch(() => {});
        if (window.toastr) toastr.info('Nova mensagem do despachante');
      });
    } catch (err) {
      console.warn('Mensagens: sem ligação em tempo real:', err);
    }
  }

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    input.disabled = true;
    try {
      const res = await fetch('/api/dispatch-messages', {
        method: 'POST', headers: this.headers(), body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      this.messages.push(data.message);
      this.updateChat();
      input.value = '';
    } catch (err) {
      if (window.toastr) toastr.error('Não foi possível enviar a mensagem: ' + err.message);
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  updateChat() {
    const chatWindow = document.getElementById('chatWindow');
    if (!chatWindow) return;
    chatWindow.textContent = '';
    this.messages.forEach(m => {
      const line = document.createElement('div');
      const who = document.createElement('b');
      who.textContent = (m.from === 'technician' ? 'Eu' : (m.senderName || 'Despachante')) + ': ';
      const time = document.createElement('small');
      time.className = 'text-muted ml-1';
      time.textContent = new Date(m.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      line.appendChild(who);
      line.appendChild(document.createTextNode(m.text));
      line.appendChild(time);
      chatWindow.appendChild(line);
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

window.messenger = new Messenger();
