// language-switcher.js
// Перемикач мови інтерфейсу: ua/en/pt

class LanguageSwitcher {
  constructor() {
    this.languages = {
      ua: 'Українська',
      en: 'English',
      pt: 'Português'
    };
    this.current = localStorage.getItem('clientLang') || 'ua';
    this.translations = {
      ua: {
        lifts: 'Мої ліфти',
        requests: 'Мої заявки',
        documentation: 'Документація',
        feedback: 'Фідбек',
        chat: 'Чат',
        map: 'Карта ліфтів',
        assistant: 'Голосовий асистент'
      },
      en: {
        lifts: 'My Lifts',
        requests: 'My Requests',
        documentation: 'Documentation',
        feedback: 'Feedback',
        chat: 'Chat',
        map: 'Lifts Map',
        assistant: 'Voice Assistant'
      },
      pt: {
        lifts: 'Meus Elevadores',
        requests: 'Minhas Solicitações',
        documentation: 'Documentação',
        feedback: 'Feedback',
        chat: 'Chat',
        map: 'Mapa dos Elevadores',
        assistant: 'Assistente de Voz'
      }
    };
  }

  render(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    container.innerHTML = `<div class="mb-3"><label>Мова:</label> <select id="langSelect" class="form-control" style="width:auto;display:inline-block;">
      ${Object.entries(this.languages).map(([code, name]) => `<option value="${code}" ${code===this.current?'selected':''}>${name}</option>`).join('')}
    </select></div>`;
    document.getElementById('langSelect').onchange = (e) => this.switchLang(e.target.value);
    this.applyTranslations();
  }

  switchLang(lang) {
    this.current = lang;
    localStorage.setItem('clientLang', lang);
    this.applyTranslations();
  }

  applyTranslations() {
    const t = this.translations[this.current];
    if (!t) return;
    const h1 = document.querySelector('h1'); if (h1) h1.textContent = t.lifts;
    document.querySelector('.card-title')?.textContent = t.map;
    document.querySelectorAll('.overview-card')[0]?.querySelector('p')?.textContent = t.lifts;
    document.querySelectorAll('.card-title').forEach(card => {
      if (card.textContent.includes('Документація')) card.textContent = t.documentation;
      if (card.textContent.includes('Фідбек')) card.textContent = t.feedback;
      if (card.textContent.includes('Чат')) card.textContent = t.chat;
      if (card.textContent.includes('Голосовий')) card.textContent = t.assistant;
    });
  }
}

window.languageSwitcher = new LanguageSwitcher();
