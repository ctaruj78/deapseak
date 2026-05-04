// voice-ar.js
// Голосове керування AR-помічником для техніка

class VoiceAR {
  constructor(arHelper) {
    this.arHelper = arHelper;
    this.recognition = null;
    this.isActive = false;
    this.commands = {
      'запусти вимірювання': () => arHelper.activateTool('measureTool'),
      'анотація': () => arHelper.activateTool('annotationTool'),
      'зроби знімок': () => arHelper.takeScreenshot(),
      'показати хот-споти': () => arHelper.showHotspots(),
      'пошук компонент': (comp) => arHelper.showComponentInfo(comp),
      'запусти ar': () => arHelper.startAR(),
      'зупини ar': () => arHelper.stopAR()
    };
  }

  init() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Controlo por voz não é suportado pelo seu browser');
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
    if (text.startsWith('пошук компонент')) {
      const comp = text.replace('пошук компонент', '').trim();
      this.commands['пошук компонент'](comp);
      return;
    }
    alert('Comando não reconhecido: ' + text);
  }
}

window.VoiceAR = VoiceAR;
