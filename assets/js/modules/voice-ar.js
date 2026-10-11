// voice-ar.js
// Controlo por voz do auxiliar AR para o técnico

class VoiceAR {
  constructor(arHelper) {
    this.arHelper = arHelper;
    this.recognition = null;
    this.isActive = false;
    this.commands = {
      'iniciar medição': () => arHelper.activateTool('measureTool'),
      'anotação': () => arHelper.activateTool('annotationTool'),
      'tirar fotografia': () => arHelper.takeScreenshot(),
      'mostrar hotspots': () => arHelper.showHotspots(),
      'procurar componente': (comp) => arHelper.showComponentInfo(comp),
      'iniciar ar': () => arHelper.startAR(),
      'parar ar': () => arHelper.stopAR()
    };
  }

  init() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toastr.info('Controlo por voz não é suportado pelo seu browser');
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
    if (text.startsWith('procurar componente')) {
      const comp = text.replace('procurar componente', '').trim();
      this.commands['procurar componente'](comp);
      return;
    }
    for (const cmd in this.commands) {
      if (text.includes(cmd)) {
        this.commands[cmd]();
        return;
      }
    }
    toastr.info('Comando não reconhecido: ' + text);
  }
}

window.VoiceAR = VoiceAR;
