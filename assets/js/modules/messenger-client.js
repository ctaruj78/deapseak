// messenger-client.js
// Простий чат для клієнта з техніком/диспетчером

class MessengerClient {
  constructor() {
    this.messages = [];
    this.container = null;
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
  }

  sendMessage() {
    const input = document.getElementById('clientChatInput');
    const text = input.value.trim();
    if (!text) return;
    this.addMessage('Клієнт', text);
    input.value = '';
    // Тут можна додати інтеграцію з сервером/техніком/диспетчером
    setTimeout(() => this.addMessage('Диспетчер', 'Ваше повідомлення отримано!'), 1000);
  }

  addMessage(sender, text) {
    this.messages.push({ sender, text });
    this.updateChat();
  }

  updateChat() {
    const chatWindow = document.getElementById('clientChatWindow');
    if (!chatWindow) return;
    chatWindow.innerHTML = this.messages.map(m => `<b>${m.sender}:</b> ${m.text}<br>`).join('');
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

window.messengerClient = new MessengerClient();
