/**
 * Service Requests Integration System
 * Система інтеграції заявок між всіма ролями (адмін, диспетчер, технік, клієнт)
 */

class ServiceRequestsIntegration {
    constructor() {
        this.storageKey = 'serviceRequests';
        this.init();
    }

    init() {
        console.log('🔗 Ініціалізація інтеграції заявок...');
        this.ensureStorageStructure();
    }

    ensureStorageStructure() {
        // Забезпечуємо існування структури даних
        const existing = localStorage.getItem(this.storageKey);
        if (!existing) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    // Методи для роботи з заявками (CRUD)
    getAllRequests() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        } catch (error) {
            console.error('Помилка читання заявок:', error);
            return [];
        }
    }

    getRequestById(id) {
        return this.getAllRequests().find(request => request.id === id);
    }

    getRequestsByRole(role, userId = null) {
        const requests = this.getAllRequests();
        
        switch (role) {
            case 'admin':
                return requests; // Адмін бачить всі заявки
                
            case 'dispatcher':
                return requests.filter(r => 
                    r.status !== 'completed' && 
                    r.type !== 'client-complaint'
                );
                
            case 'technician':
                return requests.filter(r => 
                    r.technician === userId || 
                    (r.status === 'new' && !r.technician) ||
                    r.status === 'assigned'
                );
                
            case 'client':
                return requests.filter(r => 
                    r.createdBy === userId || 
                    r.clientId === userId
                );
                
            default:
                return [];
        }
    }

    createRequest(requestData) {
        const requests = this.getAllRequests();
        const newId = 'REQ-' + String(requests.length + 1).padStart(3, '0');
        
        const newRequest = {
            id: newId,
            ...requestData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeline: [{
                timestamp: new Date().toISOString(),
                action: 'created',
                message: 'Заявку створено',
                user: requestData.createdBy || 'Система'
            }]
        };

        requests.push(newRequest);
        localStorage.setItem(this.storageKey, JSON.stringify(requests));
        
        // Відправляємо подію для оновлення UI
        this.dispatchEvent('requestCreated', newRequest);
        
        return newRequest;
    }

    updateRequest(id, updates) {
        const requests = this.getAllRequests();
        const index = requests.findIndex(r => r.id === id);
        
        if (index === -1) return null;

        requests[index] = {
            ...requests[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Додаємо в таймлайн
        if (updates.status && updates.status !== requests[index].status) {
            requests[index].timeline.push({
                timestamp: new Date().toISOString(),
                action: 'status_changed',
                message: `Статус змінено на "${this.getStatusText(updates.status)}"`,
                user: updates.updatedBy || 'Система'
            });
        }

        localStorage.setItem(this.storageKey, JSON.stringify(requests));
        
        // Відправляємо подію
        this.dispatchEvent('requestUpdated', requests[index]);
        
        return requests[index];
    }

    deleteRequest(id) {
        const requests = this.getAllRequests();
        const filteredRequests = requests.filter(r => r.id !== id);
        
        localStorage.setItem(this.storageKey, JSON.stringify(filteredRequests));
        
        // Відправляємо подію
        this.dispatchEvent('requestDeleted', { id });
        
        return true;
    }

    // Статистика
    getStatistics(role = 'admin', userId = null) {
        const requests = this.getRequestsByRole(role, userId);
        
        return {
            total: requests.length,
            new: requests.filter(r => r.status === 'new').length,
            assigned: requests.filter(r => r.status === 'assigned').length,
            inProgress: requests.filter(r => r.status === 'in-progress').length,
            completed: requests.filter(r => r.status === 'completed').length,
            emergency: requests.filter(r => r.type === 'emergency').length,
            maintenance: requests.filter(r => r.type === 'maintenance').length,
            repair: requests.filter(r => r.type === 'repair').length,
            inspection: requests.filter(r => r.type === 'inspection').length,
            critical: requests.filter(r => r.priority === 'critical').length,
            high: requests.filter(r => r.priority === 'high').length,
            medium: requests.filter(r => r.priority === 'medium').length,
            low: requests.filter(r => r.priority === 'low').length
        };
    }

    // Події для real-time оновлень
    dispatchEvent(eventType, data) {
        const event = new CustomEvent('serviceRequest', {
            detail: { type: eventType, data: data }
        });
        document.dispatchEvent(event);
    }

    // Слухач подій
    addEventListener(callback) {
        document.addEventListener('serviceRequest', callback);
    }

    // Допоміжні методи
    getStatusText(status) {
        const texts = {
            new: 'Нова',
            assigned: 'Призначена',
            'in-progress': 'В роботі',
            completed: 'Завершена',
            cancelled: 'Скасована'
        };
        return texts[status] || status;
    }

    getTypeText(type) {
        const texts = {
            emergency: 'Аварія',
            maintenance: 'ТО',
            repair: 'Ремонт',
            inspection: 'Інспекція'
        };
        return texts[type] || type;
    }

    getPriorityText(priority) {
        const texts = {
            critical: 'Критичний',
            high: 'Високий', 
            medium: 'Середній',
            low: 'Низький'
        };
        return texts[priority] || priority;
    }

    // Експорт/імпорт даних
    exportData() {
        const data = {
            requests: this.getAllRequests(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `service-requests-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        return data;
    }

    importData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (data.requests && Array.isArray(data.requests)) {
                localStorage.setItem(this.storageKey, JSON.stringify(data.requests));
                this.dispatchEvent('dataImported', data);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Помилка імпорту:', error);
            return false;
        }
    }

    // Синхронізація з сервером (заготовка для майбутньої API інтеграції)
    async syncWithServer() {
        // TODO: Реалізувати синхронізацію з API сервером
        console.log('🔄 Синхронізація з сервером...');
        
        try {
            // Тут буде логіка відправки на сервер
            // const response = await fetch('/api/service-requests', { ... });
            
            console.log('✅ Синхронізація завершена');
            return true;
        } catch (error) {
            console.error('❌ Помилка синхронізації:', error);
            return false;
        }
    }

    // Сповіщення
    sendNotification(message, type = 'info') {
        // Інтеграція з toastr або іншою системою сповіщень
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Автоматичне призначення техніків (AI логіка)
    autoAssignTechnician(request) {
        // Проста логіка автопризначення (можна розширити)
        const availableTechnicians = ['tech1', 'tech2', 'tech3'];
        const technicianWorkload = {};
        
        // Рахуємо навантаження кожного техніка
        const activeRequests = this.getAllRequests().filter(r => 
            r.status === 'assigned' || r.status === 'in-progress'
        );
        
        availableTechnicians.forEach(techId => {
            technicianWorkload[techId] = activeRequests.filter(r => r.technician === techId).length;
        });
        
        // Призначаємо техніка з найменшим навантаженням
        const bestTechnician = availableTechnicians.reduce((best, current) => 
            technicianWorkload[current] < technicianWorkload[best] ? current : best
        );
        
        return bestTechnician;
    }
}

// Глобальна ініціалізація
window.ServiceRequestsIntegration = ServiceRequestsIntegration;

// Автоматична ініціалізація при завантаженні
document.addEventListener('DOMContentLoaded', function() {
    if (!window.serviceIntegration) {
        window.serviceIntegration = new ServiceRequestsIntegration();
        console.log('✅ Система інтеграції заявок ініціалізована');
    }
});