// ar-checklist.js
// Інтерактивний AR чек-лист для техніка

class ARChecklist {
  constructor(arHelper) {
    this.arHelper = arHelper;
    this.steps = [
      { id: 'inspect-cable', text: 'Перевірити кабель живлення', hint: 'Наведіть камеру на кабель' },
      { id: 'check-panel', text: 'Оглянути панель керування', hint: 'Наведіть камеру на панель' },
      { id: 'test-emergency', text: 'Перевірити аварійну систему', hint: 'Наведіть камеру на аварійний модуль' },
      { id: 'clean-area', text: 'Очистити робочу зону', hint: 'Переконайтесь, що зона чиста' }
    ];
    this.completed = new Set();
  }

  render(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    container.innerHTML = '<h4>AR Чек-лист</h4>';
    this.steps.forEach(step => {
      const stepDiv = document.createElement('div');
      stepDiv.className = 'ar-checklist-step mb-2';
      stepDiv.innerHTML = `<input type="checkbox" id="${step.id}" ${this.completed.has(step.id) ? 'checked' : ''}> <label for="${step.id}">${step.text}</label> <button class="btn btn-info btn-sm ml-2" onclick="window.arChecklist.showHint('${step.id}')">Підказка</button>`;
      container.appendChild(stepDiv);
      document.getElementById(step.id).onchange = (e) => this.toggleStep(step.id, e.target.checked);
    });
  }

  toggleStep(stepId, isChecked) {
    if (isChecked) this.completed.add(stepId);
    else this.completed.delete(stepId);
    // Можна додати логіку для збереження прогресу
  }

  showHint(stepId) {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      this.arHelper.showToolHint(step.hint);
      setTimeout(() => this.arHelper.hideToolHint(), 4000);
    }
  }
}

// Ініціалізація ARChecklist після завантаження ARHelper
function initARChecklist() {
    if (window.arHelper) {
        window.arChecklist = new ARChecklist(window.arHelper);
        console.log('✅ ARChecklist ініціалізовано');
    } else {
        console.warn('⚠️ ARHelper ще не завантажено, спроба через 500ms...');
        setTimeout(initARChecklist, 500);
    }
}

$(document).ready(function() {
    setTimeout(initARChecklist, 100); // Невелика затримка щоб ARHelper встиг завантажитися
});
