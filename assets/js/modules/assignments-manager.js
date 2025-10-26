/**
 * Assignments Manager - детальне управління завданнями
 */
class AssignmentsManager {
  constructor() {
    this.assignments = [];
    this.init();
  }

  async init() {
    try {
      await this.loadAssignments();
      this.setupFilters();
    } catch (error) {
      Notifier.error('Помилка: ' + error.message);
    }
  }

  async loadAssignments() {
    try {
      const data = await api.get('/assignments');
      this.assignments = data.assignments || [];
      this.render();
    } catch (error) {
      console.error('Error:', error);
    }
  }

  render() {
    const container = document.getElementById('assignmentsList');
    if (!container) return;
    container.innerHTML = this.getHTML();
  }

  getHTML() {
    return this.assignments.map(a => `
      <tr>
        <td>${a.title}</td>
        <td>${a.status}</td>
        <td>${new Date(a.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('');
  }

  setupFilters() {
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => this.applyFilters());
    }
  }

  applyFilters() {
    const status = document.getElementById('statusFilter').value;
    if (status) {
      this.assignments = this.assignments.filter(a => a.status === status);
      this.render();
    }
  }
}

let assignmentsManager;
document.addEventListener('DOMContentLoaded', () => {
  assignmentsManager = new AssignmentsManager();
});
