// messenger.js
// Простий месенджер для зв’язку техніка з диспетчером

class Messenger {
  constructor() {
    this.messages = [];
    this.container = null;
  }

  render(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) return;
    this.container.innerHTML = `
      <h4>Месенджер з диспетчером</h4>
      <div id="chatWindow" style="height:150px;overflow-y:auto;border:1px solid #ccc;padding:5px;margin-bottom:10px;"></div>
      <input type="text" id="chatInput" class="form-control mb-2" placeholder="Введіть повідомлення...">
      <button class="btn btn-primary btn-sm" id="sendMsgBtn">Enviar</button>
    `;
    document.getElementById('sendMsgBtn').onclick = () => this.sendMessage();
  }

  sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    this.addMessage('Técnico', text);
    input.value = '';
    // Тут можна додати інтеграцію з сервером/диспетчером
    setTimeout(() => this.addMessage('Dispatcher', 'Прийнято!'), 1000);
  }

  addMessage(sender, text) {
    this.messages.push({ sender, text });
    this.updateChat();
  }

  updateChat() {
    const chatWindow = document.getElementById('chatWindow');
    if (!chatWindow) return;
    chatWindow.innerHTML = this.messages.map(m => `<b>${m.sender}:</b> ${m.text}<br>`).join('');
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

window.messenger = new Messenger();
