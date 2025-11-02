/**
 * Inspection Manager - управління інспекціями
 */
class InspectionManager {
  constructor() {
    this.inspections = [];
    this.init();
  }

  async init() {
    try {
      await this.loadInspections();
      this.bindEvents();
    } catch (error) {
      Notifier.error('Помилка: ' + error.message);
    }
  }

  async loadInspections() {
    try {
      const data = await api.get('/inspections');
      this.inspections = data.inspections || [];
      this.render();
    } catch (error) {
      // logger.error('Error:', error);
    }
  }

  render() {
    const container = document.getElementById('inspectionsList');
    if (!container) return;
    
    container.innerHTML = this.inspections.map(insp => `
      <div class="card">
        <div class="card-body">
          <h5>${insp.liftAddress}</h5>
          <p>Тип: ${insp.type}</p>
          <p>Статус: <span class="badge bg-info">${insp.status}</span></p>
          <button class="btn btn-sm btn-primary" onclick="inspectionManager.editInspection('${insp._id}')">
            Редагувати
          </button>
        </div>
      </div>
    `).join('');
  }

  async createInspection(data) {
    try {
      await api.post('/inspections', data);
      Notifier.success('Інспекція створена');
      await this.loadInspections();
    } catch (error) {
      Notifier.error('Помилка: ' + error.message);
    }
  }

  editInspection(id) {
    const insp = this.inspections.find(i => i._id === id);
    if (insp) {
      // logger.log('Редагування інспекції:', insp);
    }
  }

  bindEvents() {
    const createBtn = document.getElementById('createInspectionBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.handleCreateInspection());
    }
  }

  async handleCreateInspection() {
    const data = {
      liftAddress: document.getElementById('liftAddress').value,
      type: document.getElementById('inspectionType').value,
      status: 'pending'
    };
    await this.createInspection(data);
  }
}

let inspectionManager;
document.addEventListener('DOMContentLoaded', () => {
  inspectionManager = new InspectionManager();
});
