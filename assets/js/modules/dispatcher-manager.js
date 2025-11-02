/**
 * Dispatcher Manager - управління завданнями та технікам для диспетчера
 */
class DispatcherManager {
  constructor() {
    this.assignments = [];
    this.technicians = [];
    this.clients = [];
    this.init();
  }

  async init() {
    try {
      await this.loadAssignments();
      await this.loadTechnicians();
      await this.loadClients();
      this.bindEvents();
      Notifier.success('Диспетчер панель завантажена');
    } catch (error) {
      Notifier.error('Помилка ініціалізації: ' + error.message);
    }
  }

  async loadAssignments() {
    try {
      const data = await api.get('/assignments');
      this.assignments = data.assignments || [];
      this.renderAssignments();
    } catch (error) {
      // logger.error('Error loading assignments:', error);
    }
  }

  async loadTechnicians() {
    try {
      const data = await api.get('/technicians');
      this.technicians = data.technicians || [];
    } catch (error) {
      // logger.error('Error loading technicians:', error);
    }
  }

  async loadClients() {
    try {
      const data = await api.get('/clients');
      this.clients = data.clients || [];
    } catch (error) {
      // logger.error('Error loading clients:', error);
    }
  }

  renderAssignments() {
    const container = document.getElementById('assignmentsContainer');
    if (!container) return;

    container.innerHTML = this.assignments.map(assignment => `
      <div class="card assignment-card">
        <div class="card-body">
          <h5>${assignment.title}</h5>
          <p>Технік: ${this.getTechnicianName(assignment.technicianId)}</p>
          <p>Клієнт: ${this.getClientName(assignment.clientId)}</p>
          <span class="badge bg-${this.getStatusColor(assignment.status)}">
            ${assignment.status}
          </span>
          <button class="btn btn-sm btn-primary" onclick="dispatcherManager.editAssignment('${assignment._id}')">
            Редагувати
          </button>
          <button class="btn btn-sm btn-danger" onclick="dispatcherManager.deleteAssignment('${assignment._id}')">
            Видалити
          </button>
        </div>
      </div>
    `).join('');
  }

  getTechnicianName(id) {
    const tech = this.technicians.find(t => t._id === id);
    return tech ? tech.name : 'Невідомо';
  }

  getClientName(id) {
    const client = this.clients.find(c => c._id === id);
    return client ? client.name : 'Невідомо';
  }

  getStatusColor(status) {
    const colors = {
      'pending': 'warning',
      'in-progress': 'info',
      'completed': 'success',
      'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
  }

  async createAssignment(data) {
    try {
      await api.post('/assignments', data);
      Notifier.success('Завдання створено');
      await this.loadAssignments();
    } catch (error) {
      Notifier.error('Помилка: ' + error.message);
    }
  }

  async updateAssignment(id, data) {
    try {
      await api.put(`/assignments/${id}`, data);
      Notifier.success('Завдання оновлено');
      await this.loadAssignments();
    } catch (error) {
      Notifier.error('Помилка: ' + error.message);
    }
  }

  async deleteAssignment(id) {
    if (!confirm('Видалити завдання?')) return;
    try {
      await api.delete(`/assignments/${id}`);
      Notifier.success('Завдання видалено');
      await this.loadAssignments();
    } catch (error) {
      Notifier.error('Помилка: ' + error.message);
    }
  }

  editAssignment(id) {
    const assignment = this.assignments.find(a => a._id === id);
    if (assignment) {
      // logger.log('Редагування:', assignment);
      // Заповнити форму редагування
    }
  }

  bindEvents() {
    const createBtn = document.getElementById('createAssignmentBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.handleCreateAssignment());
    }
  }

  async handleCreateAssignment() {
    const data = {
      title: document.getElementById('assignmentTitle').value,
      technicianId: document.getElementById('assignmentTechnician').value,
      clientId: document.getElementById('assignmentClient').value,
      status: 'pending'
    };
    await this.createAssignment(data);
  }
}

let dispatcherManager;
document.addEventListener('DOMContentLoaded', () => {
  dispatcherManager = new DispatcherManager();
});
