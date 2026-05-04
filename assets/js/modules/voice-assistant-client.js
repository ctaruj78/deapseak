// voice-assistant-client.js
// Голосовий асистент для клієнта: створення заявки, пошук інформації

class VoiceAssistantClient {
  constructor() {
    this.recognition = null;
    this.isActive = false;
    this.commands = {
      'створи заявку': () => window.location.href = 'requests.html',
      'документація': () => window.open('../../docs/user-manual.pdf', '_blank'),
      'статус ліфтів': () => window.location.href = 'my-lifts.html',
      'чат': () => window.location.href = 'my-lifts.html',
      'підтримка': () => window.location.href = 'support.html'
    };
  }

  init() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Assistente de voz não é suportado pelo seu browser');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'pt-PT';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      this.handleCommand(transcript);
    };
    this.recognition.onend = () => {
      this.isActive = false;
    };
  }

  start() {
    if (this.recognition && !this.isActive) {
      this.isActive = true;
      this.recognition.start();
    }
  }

  handleCommand(text) {
    for (const cmd in this.commands) {
      if (text.includes(cmd)) {
        this.commands[cmd]();
        return;
      }
    }
    alert('Comando não reconhecido: ' + text);
  }
}

window.voiceAssistantClient = new VoiceAssistantClient();
