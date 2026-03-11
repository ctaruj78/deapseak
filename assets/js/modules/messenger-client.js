// messenger-client.js
// Простий чат для клієнта з техніком/диспетчером

class MessengerClient {
  constructor() {
    this.messages = [];
    this.container = null;
    this.sender = localStorage.getItem('userName') || 'Клієнт';
    this.role = localStorage.getItem('userRole') || 'client';
    this.apiUrl = window.location.origin + '/api/chat';
  }

  render(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) return;
    this.container.innerHTML = `
      <h4>Чат з диспетчером/техніком</h4>
      <div id="clientChatWindow" style="height:150px;overflow-y:auto;border:1px solid #ccc;padding:5px;margin-bottom:10px;"></div>
      <input type="text" id="clientChatInput" class="form-control mb-2" placeholder="Введіть повідомлення...">
      <button class="btn btn-primary btn-sm" id="clientSendMsgBtn">Відправити</button>
    `;
    document.getElementById('clientSendMsgBtn').onclick = () => this.sendMessage();
    this.fetchMessages();
    this.pollInterval = setInterval(() => this.fetchMessages(), 3000);
  }

  sendMessage() {
    const input = document.getElementById('clientChatInput');
    const text = input.value.trim();
    if (!text) return;
    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: this.sender, text, role: this.role })
    })
      .then(res => res.json())
      .then(() => {
        input.value = '';
        this.fetchMessages();
      });
  }

  addMessage(sender, text, role = 'client') {
    this.messages.push({ sender, text, role });
    this.updateChat();
  }

  updateChat() {
  const chatWindow = document.getElementById('clientChatWindow');
  if (!chatWindow) return;
  chatWindow.innerHTML = this.messages.map(m => `<b>${m.sender} (${m.role}):</b> ${m.text}<br>`).join('');
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
  fetchMessages() {
    fetch(this.apiUrl)
      .then(res => res.json())
      .then(msgs => {
        // Якщо роль не передана — визначаємо за поточним користувачем
        this.messages = msgs.map(m => {
          if (!m.role) {
            if (m.sender === this.sender) return { ...m, role: this.role };
            return { ...m, role: m.sender === 'Диспетчер' ? 'dispatcher' : 'technician' };
          }
          return m;
        });
        this.updateChat();
      });
  }
}

window.messengerClient = new MessengerClient();
