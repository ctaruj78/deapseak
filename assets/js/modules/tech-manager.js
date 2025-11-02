/**
 * Tech Manager - управління завданнями та інспекціями для технікам
 */
class TechManager {
  constructor() {
    this.tasks = [];
    this.inspections = [];
    this.init();
  }

  async init() {
    try {
      await this.loadTasks();
      await this.loadInspections();
      this.bindEvents();
      Notifier.success('Панель технікам завантажена');
    } catch (error) {
      Notifier.error('Помилка: ' + error.message);
    }
  }

  async loadTasks() {
    try {
      const data = await api.get('/tasks');
      this.tasks = data.tasks || [];
      this.renderTasks();
    } catch (error) {
      // logger.error('Error loading tasks:', error);
    }
  }

  async loadInspections() {
    try {
      const data = await api.get('/inspections');
      this.inspections = data.inspections || [];
    } catch (error) {
      // logger.error('Error loading inspections:', error);
    }
  }

  renderTasks() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;

    container.innerHTML = this.tasks.map(task => `
      <div class="card task-card">
        <div class="card-body">
          <h5>${task.title}</h5>
          <p>${task.description}</p>
          <p>Адреса: ${task.address}</p>
          <span class="badge bg-${this.getStatusColor(task.status)}">
            ${task.status}
          </span>
          <button class="btn btn-sm btn-primary" onclick="techManager.startTask('${task._id}')">
            Почати
          </button>
          <button class="btn btn-sm btn-info" onclick="techManager.viewQR('${task._id}')">
            QR код
          </button>
        </div>
      </div>
    `).join('');
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

  async startTask(id) {
    try {
      await api.put(`/tasks/${id}`, { status: 'in-progress' });
      Notifier.success('Завдання розпочато');
      await this.loadTasks();
    } catch (error) {
      Notifier.error('Помилка: ' + error.message);
    }
  }

  async completeTask(id, data) {
    try {
      await api.put(`/tasks/${id}`, { status: 'completed', ...data });
      Notifier.success('Завдання завершено');
      await this.loadTasks();
    } catch (error) {
      Notifier.error('Помилка: ' + error.message);
    }
  }

  viewQR(id) {
    const task = this.tasks.find(t => t._id === id);
    if (task && task.qrCode) {
      // logger.log('QR код:', task.qrCode);
      // Показати QR код
    }
  }

  bindEvents() {
    const completeBtn = document.getElementById('completeTaskBtn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => this.handleCompleteTask());
    }
  }

  async handleCompleteTask() {
    const taskId = document.getElementById('currentTaskId').value;
    const notes = document.getElementById('taskNotes').value;
    await this.completeTask(taskId, { notes });
  }
}

let techManager;
document.addEventListener('DOMContentLoaded', () => {
  techManager = new TechManager();
});
