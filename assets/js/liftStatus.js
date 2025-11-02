class LiftStatusManager {
    static STATUS_COLORS = {
        working: 'green',
        repairing: 'orange',
        needs_inspection: 'red',
        out_of_service: 'gray'
    };

    static STATUS_LABELS = {
        working: 'Працює',
        repairing: 'На ремонті',
        needs_inspection: 'Потрібна перевірка',
        out_of_service: 'Не працює'
    };

    static getStatusBadge(status) {
        const label = this.STATUS_LABELS[status] || status;
        const color = this.STATUS_COLORS[status] || 'gray';
        return `<span class="status-badge ${color}">${label}</span>`;
    }

    static async updateStatus(liftId, newStatus) {
        try {
            await LiftAPI.updateLiftStatus(liftId, newStatus);
            DOMHelper.showNotification(`Статус ліфта оновлено на: ${this.STATUS_LABELS[newStatus]}`);
            Renderer.updateDynamicContent();
        } catch (error) {
            // logger.error('Помилка оновлення статусу:', error);
            DOMHelper.showNotification('Помилка оновлення статусу', 'error');
        }
    }
}