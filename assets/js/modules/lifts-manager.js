/**
 * Lifts Manager - управління ліфтами для адмін панелі
 */
class LiftsManager {
  constructor() {
    this.lifts = [];
    this.init();
  }

  async init() {
    try {
      await this.loadLifts();
      this.bindEvents();
    } catch (error) {
      Notifier.error('Помилка ініціалізації: ' + error.message);
    }
  }

  async loadLifts() {
    try {
      const data = await api.get('/lifts');
      this.lifts = data.lifts || [];
      this.renderLifts();
    } catch (error) {
      // logger.error('Error loading lifts:', error);
      throw error;
    }
  }

  renderLifts() {
    const container = document.getElementById('liftsContainer');
    if (!container) return;

    container.innerHTML = this.lifts.map(lift => `
      <div class="card lift-card">
        <div class="card-body">
          <h5>${lift.address}</h5>
          <p>Модель: ${lift.model}</p>
          <span class="badge bg-${this.getStatusColor(lift.status)}">
            ${lift.status}
          </span>
          <button class="btn btn-sm btn-primary" onclick="liftsManager.editLift('${lift._id}')">
            Редагувати
          </button>
        </div>
      </div>
    `).join('');
  }

  async addLift(data) {
    try {
      await api.post('/lifts', data);
      Notifier.success('Ліфт додано успішно');
      await this.loadLifts();
    } catch (error) {
      Notifier.error('Помилка додавання ліфту: ' + error.message);
    }
  }

  async updateLift(id, data) {
    try {
      await api.put(`/lifts/${id}`, data);
      Notifier.success('Ліфт оновлено успішно');
      await this.loadLifts();
    } catch (error) {
      Notifier.error('Помилка оновлення ліфту: ' + error.message);
    }
  }

  async deleteLift(id) {
    if (!confirm('Ви впевнені?')) return;
    try {
      await api.delete(`/lifts/${id}`);
      Notifier.success('Ліфт видалено успішно');
      await this.loadLifts();
    } catch (error) {
      Notifier.error('Помилка видалення ліфту: ' + error.message);
    }
  }

  editLift(id) {
    const lift = this.lifts.find(l => l._id === id);
    if (lift) {
      // Заповнити форму редагування
      document.getElementById('liftAddress').value = lift.address;
      document.getElementById('liftModel').value = lift.model;
      // Показати модальне вікно
      const modal = new bootstrap.Modal(document.getElementById('liftModal'));
      modal.show();
    }
  }

  getStatusColor(status) {
    const colors = {
      'active': 'success',
      'maintenance': 'warning',
      'inactive': 'danger'
    };
    return colors[status] || 'secondary';
  }

  bindEvents() {
    const addBtn = document.getElementById('addLiftBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.handleAddLift());
    }
  }

  async handleAddLift() {
    const data = {
      address: document.getElementById('liftAddress').value,
      model: document.getElementById('liftModel').value
    };
    await this.addLift(data);
  }
}

// Ініціалізація при завантаженні сторінки
let liftsManager;
document.addEventListener('DOMContentLoaded', () => {
  liftsManager = new LiftsManager();
});
