const API_BASE_URL = 'https://api.liftmanager.com/v1';
let IS_DEVELOPMENT = false;
if (typeof window !== 'undefined' && window.location) {
    IS_DEVELOPMENT = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '' ||
                     window.location.hostname.includes('github.dev') ||
                     window.location.hostname.includes('app.github.dev');
} else {
    IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || false;
}

const isNode = typeof window === 'undefined';
let mongoCollections = {};
if (isNode) {
    const { connectDB, getDB } = require('./db');
    (async () => {
        await connectDB();
        const db = getDB();
        mongoCollections.lifts = db.collection('lifts');
        mongoCollections.technicians = db.collection('technicians');
        mongoCollections.repairs = db.collection('repairs');
        mongoCollections.activities = db.collection('activities');
        mongoCollections.notifications = db.collection('notifications');
    })();
}

class LiftAPI {
    static async request(endpoint, method = 'GET', data = null, useCache = false) {
        if (isNode) {
            // Реальні CRUD через MongoDB
            const colMap = {
                '/lifts': 'lifts',
                '/technicians': 'technicians',
                '/repairs': 'repairs',
                '/activities': 'activities',
                '/notifications': 'notifications'
            };
            const col = colMap[endpoint];
            if (col && mongoCollections[col]) {
                switch (method) {
                    case 'GET':
                        return await mongoCollections[col].find({}).toArray();
                    case 'POST':
                        const result = await mongoCollections[col].insertOne(data);
                        return { success: true, id: result.insertedId };
                    case 'PUT':
                        if (!data._id) throw new Error('PUT requires _id');
                        await mongoCollections[col].updateOne({ _id: data._id }, { $set: data });
                        return { success: true };
                    case 'DELETE':
                        if (!data._id) throw new Error('DELETE requires _id');
                        await mongoCollections[col].deleteOne({ _id: data._id });
                        return { success: true };
                    default:
                        return { success: false, message: 'Unknown method' };
                }
            }
            // Якщо endpoint не знайдено, повертаємо заглушку
            return { success: false, message: 'Unknown endpoint' };
        }
        // ...existing code...
    }

    static useRealAPI() {
        return StorageManager.load('use_real_api') || false;
    }

    static async mockRequest(endpoint, method, data) {
        console.log('Mock API:', method, endpoint, data);
        
        // Штучна затримка для імітації мережевого запиту
        await this.delay(300 + Math.random() * 700);

        try {
            let response;

            switch (endpoint) {
                case '/users':
                    response = await this.mockUsers(method, data);
                    break;
                case '/lifts':
                    response = await this.mockLifts(method, data);
                    break;
                case '/repairs':
                    response = await this.mockRepairs(method, data);
                    break;
                case '/dashboard/stats':
                    response = await this.mockDashboardStats(method, data);
                    break;
                case '/reports':
                    response = await this.mockReports(method, data);
                    break;
                case '/settings':
                    response = await this.mockSettings(method, data);
                    break;
                case '/inventory':
                    response = await this.mockInventory(method, data);
                    break;
                case '/payments':
                    response = await this.mockPayments(method, data);
                    break;
                case '/assignments':
                    response = await this.mockAssignments(method, data);
                    break;
                case '/analytics':
                    response = await this.mockAnalytics(method, data);
                    break;
                case '/analytics/heatmap':
                    response = await this.mockHeatmapData(method, data);
                    break;
                default:
                    // Автоматична обробка динамічних endpoint'ів
                    if (endpoint.startsWith('/users/')) {
                        response = await this.mockUserDetail(endpoint, method, data);
                    } else if (endpoint.startsWith('/lifts/')) {
                        response = await this.mockLiftDetail(endpoint, method, data);
                    } else if (endpoint.startsWith('/repairs/')) {
                        response = await this.mockRepairDetail(endpoint, method, data);
                    } else if (endpoint.startsWith('/assignments/')) {
                        response = await this.mockAssignmentDetail(endpoint, method, data);
                    } else if (endpoint.startsWith('/inventory/')) {
                        response = await this.mockInventoryDetail(endpoint, method, data);
                    } else {
                        response = { success: true, message: 'Mock request successful' };
                    }
            }

            // Збереження для офлайн роботи
            if (method === 'GET') {
                StorageManager.save(`fallback_${endpoint}`, response);
            }

            return response;
        } catch (error) {
            console.error('Mock API Error:', error);
            throw error;
        }
    }

    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Mock методи для користувачів
    static async mockUsers(method, data) {
        const users = StorageManager.load('mock_users') || [
            { id: 1, name: 'Іван Петренко', email: 'ivan@example.com', role: 'dispatcher', status: 'active' },
            { id: 2, name: 'Марія Іваненко', email: 'maria@example.com', role: 'technician', status: 'active' },
            { id: 3, name: 'Олексій Шевченко', email: 'olexii@example.com', role: 'admin', status: 'active' }
        ];

        switch (method) {
            case 'GET':
                return users;
            case 'POST':
                const newUser = { id: Date.now(), ...data, status: 'active' };
                users.push(newUser);
                StorageManager.save('mock_users', users);
                return newUser;
            default:
                return users;
        }
    }

    // Mock методи для ліфтів
    static async mockLifts(method, data) {
        const lifts = StorageManager.load('mock_lifts') || [
            { id: 1, name: 'Ліфт №1', location: 'вул. Центральна, 12', status: 'active', lastMaintenance: '2024-05-01' },
            { id: 2, name: 'Ліфт №2', location: 'вул. Головна, 25', status: 'maintenance', lastMaintenance: '2024-04-15' },
            { id: 3, name: 'Ліфт №3', location: 'вул. Шевченка, 8', status: 'active', lastMaintenance: '2024-05-10' }
        ];

        switch (method) {
            case 'GET':
                return lifts;
            case 'POST':
                const newLift = { id: Date.now(), ...data, status: 'active' };
                lifts.push(newLift);
                StorageManager.save('mock_lifts', lifts);
                return newLift;
            default:
                return lifts;
        }
    }

    // Mock методи для заявок
    static async mockRepairs(method, data) {
        const repairs = StorageManager.load('mock_repairs') || [
            { id: 1, liftId: 2, description: 'Несправність дверей', priority: 'high', status: 'in-progress', createdAt: '2024-05-15' },
            { id: 2, liftId: 1, description: 'Заміна лампочки', priority: 'low', status: 'completed', createdAt: '2024-05-14' },
            { id: 3, liftId: 3, description: 'Перевірка тросів', priority: 'medium', status: 'pending', createdAt: '2024-05-16' }
        ];

        switch (method) {
            case 'GET':
                return repairs;
            case 'POST':
                const newRepair = { 
                    id: Date.now(), 
                    ...data, 
                    status: 'pending',
                    createdAt: new Date().toISOString().split('T')[0]
                };
                repairs.push(newRepair);
                StorageManager.save('mock_repairs', repairs);
                return newRepair;
            default:
                return repairs;
        }
    }

    static async mockUserDetail(endpoint, method, data) {
        const users = StorageManager.load('mock_users') || [];
        const userId = parseInt(endpoint.split('/')[2]);
        const user = users.find(u => u.id === userId);

        if (!user) {
            throw new Error('User not found');
        }

        switch (method) {
            case 'GET':
                return user;
            case 'PUT':
                Object.assign(user, data);
                StorageManager.save('mock_users', users);
                return user;
            case 'DELETE':
                const index = users.findIndex(u => u.id === userId);
                users.splice(index, 1);
                StorageManager.save('mock_users', users);
                return { success: true };
            default:
                return user;
        }
    }

    static async mockLiftDetail(endpoint, method, data) {
        const lifts = StorageManager.load('mock_lifts') || [];
        const liftId = parseInt(endpoint.split('/')[2]);
        const lift = lifts.find(l => l.id === liftId);

        if (!lift) {
            throw new Error('Lift not found');
        }

        switch (method) {
            case 'GET':
                return lift;
            case 'PUT':
                Object.assign(lift, data);
                StorageManager.save('mock_lifts', lifts);
                return lift;
            case 'DELETE':
                const index = lifts.findIndex(l => l.id === liftId);
                lifts.splice(index, 1);
                StorageManager.save('mock_lifts', lifts);
                return { success: true };
            default:
                return lift;
        }
    }

    // Mock методи для нових API
    static async mockDashboardStats(method, data) {
        return {
            totalLifts: 156,
            activeLifts: 142,
            maintenanceLifts: 12,
            offlineLifts: 2,
            todayScans: 45,
            todayRepairs: 23,
            pendingAssignments: 8,
            totalTechnicians: 15,
            activeTechnicians: 12,
            totalRevenue: 12500,
            monthlyRevenue: 8500
        };
    }

    static async mockReports(method, data) {
        const reports = StorageManager.load('mock_reports') || [
            {
                id: 1,
                type: 'daily',
                title: 'Щоденний звіт',
                date: '2024-09-25',
                data: { scans: 45, repairs: 23, revenue: 1250 }
            },
            {
                id: 2,
                type: 'weekly',
                title: 'Тижневий звіт',
                date: '2024-09-23',
                data: { scans: 312, repairs: 156, revenue: 8750 }
            }
        ];

        if (method === 'GET') {
            return reports;
        }

        return { success: true, message: 'Report generated' };
    }

    static async mockSettings(method, data) {
        const settings = StorageManager.load('mock_settings') || {
            companyName: 'LiftMaster Pro',
            logo: '/assets/img/logo.png',
            theme: 'light',
            language: 'uk',
            notifications: {
                email: true,
                push: true,
                sms: false
            },
            maintenance: {
                autoSchedule: true,
                reminderDays: 7
            }
        };

        if (method === 'GET') {
            return settings;
        }

        if (method === 'PUT') {
            const updated = { ...settings, ...data };
            StorageManager.save('mock_settings', updated);
            return updated;
        }

        return settings;
    }

    static async mockInventory(method, data) {
        const inventory = StorageManager.load('mock_inventory') || [
            { id: 1, name: 'Ліфтовий трос', quantity: 25, minQuantity: 10, unit: 'м' },
            { id: 2, name: 'Реле керування', quantity: 50, minQuantity: 15, unit: 'шт' },
            { id: 3, name: 'Датчик ваги', quantity: 8, minQuantity: 20, unit: 'шт' }
        ];

        if (method === 'GET') {
            return inventory;
        }

        return inventory;
    }

    static async mockPayments(method, data) {
        const payments = StorageManager.load('mock_payments') || [
            { id: 1, amount: 500, description: 'Ремонт ліфта №15', date: '2024-09-25', status: 'completed' },
            { id: 2, amount: 750, description: 'Обслуговування ліфта №8', date: '2024-09-24', status: 'pending' }
        ];

        if (method === 'GET') {
            return payments;
        }

        if (method === 'POST') {
            const newPayment = { id: Date.now(), ...data, status: 'pending' };
            payments.push(newPayment);
            StorageManager.save('mock_payments', payments);
            return newPayment;
        }

        return payments;
    }

    static async mockAssignments(method, data) {
        const assignments = StorageManager.load('mock_assignments') || [
            { id: 1, technicianId: 2, liftId: 3, description: 'Перевірка тросів', priority: 'high', status: 'in_progress', dueDate: '2024-09-26' },
            { id: 2, technicianId: 1, liftId: 5, description: 'Заміна реле', priority: 'medium', status: 'pending', dueDate: '2024-09-27' }
        ];

        if (method === 'GET') {
            return assignments;
        }

        if (method === 'POST') {
            const newAssignment = { id: Date.now(), ...data, status: 'pending' };
            assignments.push(newAssignment);
            StorageManager.save('mock_assignments', assignments);
            return newAssignment;
        }

        return assignments;
    }

    static async mockAnalytics(method, data) {
        return {
            period: 'month',
            totalScans: 1250,
            totalRepairs: 89,
            averageRepairTime: 45, // хвилин
            technicianEfficiency: 85, // %
            liftUptime: 96.5, // %
            revenue: 45200,
            trends: {
                scans: [120, 135, 142, 158, 145, 167, 189, 201, 195, 210, 225, 240],
                repairs: [8, 9, 7, 12, 10, 11, 13, 15, 12, 14, 16, 18]
            }
        };
    }

    static async mockAssignmentDetail(endpoint, method, data) {
        const assignments = StorageManager.load('mock_assignments') || [];
        const assignmentId = parseInt(endpoint.split('/')[2]);
        const assignment = assignments.find(a => a.id === assignmentId);

        if (!assignment) {
            throw new Error('Assignment not found');
        }

        switch (method) {
            case 'GET':
                return assignment;
            case 'PUT':
                Object.assign(assignment, data);
                StorageManager.save('mock_assignments', assignments);
                return assignment;
            case 'DELETE':
                const index = assignments.findIndex(a => a.id === assignmentId);
                assignments.splice(index, 1);
                StorageManager.save('mock_assignments', assignments);
                return { success: true };
            default:
                return assignment;
        }
    }

    static async mockInventoryDetail(endpoint, method, data) {
        const inventory = StorageManager.load('mock_inventory') || [];
        const itemId = parseInt(endpoint.split('/')[2]);
        const item = inventory.find(i => i.id === itemId);

        if (!item) {
            throw new Error('Inventory item not found');
        }

        switch (method) {
            case 'GET':
                return item;
            case 'PUT':
                Object.assign(item, data);
                StorageManager.save('mock_inventory', inventory);
                return item;
            case 'DELETE':
                const index = inventory.findIndex(i => i.id === itemId);
                inventory.splice(index, 1);
                StorageManager.save('mock_inventory', inventory);
                return { success: true };
            default:
                return item;
        }
    }

    // Додаткові методи API
    static async updateLiftStatus(liftId, status) {
        return this.request(`/lifts/${liftId}/status`, 'PATCH', { status });
    }

    static async assignTechnician(repairId, technicianId) {
        return this.request(`/repairs/${repairId}/assign`, 'PATCH', { technicianId });
    }

    static async getStatistics() {
        return this.request('/statistics', 'GET', null, true); // Використовує кеш
    }

    static async getNotifications() {
        return this.request('/notifications', 'GET', null, true);
    }

    static async markNotificationRead(notificationId) {
        return this.request(`/notifications/${notificationId}/read`, 'PATCH');
    }

    // Нові API методи для покращених функцій
    static async getDashboardStats() {
        return this.request('/dashboard/stats', 'GET', null, true);
    }

    static async getReports(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return this.request(`/reports?${queryString}`, 'GET', null, true);
    }

    static async generateReport(type, filters = {}) {
        return this.request('/reports/generate', 'POST', { type, filters });
    }

    static async exportData(format, data) {
        return this.request('/export', 'POST', { format, data });
    }

    static async getSettings() {
        return this.request('/settings', 'GET', null, true);
    }

    static async updateSettings(settings) {
        return this.request('/settings', 'PUT', settings);
    }

    static async getInventory() {
        return this.request('/inventory', 'GET', null, true);
    }

    static async updateInventoryItem(itemId, data) {
        return this.request(`/inventory/${itemId}`, 'PUT', data);
    }

    static async getPayments(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return this.request(`/payments?${queryString}`, 'GET', null, true);
    }

    static async processPayment(paymentData) {
        return this.request('/payments', 'POST', paymentData);
    }

    static async getAssignments(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return this.request(`/assignments?${queryString}`, 'GET', null, true);
    }

    static async createAssignment(assignmentData) {
        return this.request('/assignments', 'POST', assignmentData);
    }

    static async updateAssignment(assignmentId, data) {
        return this.request(`/assignments/${assignmentId}`, 'PUT', data);
    }

    static async getMaintenanceSchedule() {
        return this.request('/maintenance/schedule', 'GET', null, true);
    }

    static async scheduleMaintenance(scheduleData) {
        return this.request('/maintenance/schedule', 'POST', scheduleData);
    }

    static async getAnalytics(period = 'month') {
        return this.request(`/analytics?period=${period}`, 'GET', null, true);
    }

    static async getHeatmapData() {
        return this.request('/analytics/heatmap', 'GET', null, true);
    }

    static async getUserActivity(userId, period = 'month') {
        return this.request(`/users/${userId}/activity?period=${period}`, 'GET', null, true);
    }

    static async sendMessage(recipientId, message) {
        return this.request('/messages', 'POST', { recipientId, message });
    }

    static async getMessages(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return this.request(`/messages?${queryString}`, 'GET', null, true);
    }

    static async uploadFile(file, type = 'general') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        if (IS_DEVELOPMENT && !this.useRealAPI()) {
            await this.delay(1000);
            return {
                success: true,
                filename: file.name,
                size: file.size,
                url: URL.createObjectURL(file),
                type: type
            };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AuthManager.getAuthToken()}`
                },
                body: formData
            });

            return await response.json();
        } catch (error) {
            console.error('Помилка завантаження файлу:', error);
            throw error;
        }
    }

    static async getLogs(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return this.request(`/logs?${queryString}`, 'GET', null, true);
    }

    static async createBackup() {
        return this.request('/backup', 'POST');
    }

    static async getBackups() {
        return this.request('/backups', 'GET', null, true);
    }

    static async restoreBackup(backupId) {
        return this.request(`/backups/${backupId}/restore`, 'POST');
    }

    static async getSystemHealth() {
        return this.request('/health', 'GET', null, true);
    }

    static async clearCache() {
        return this.request('/cache/clear', 'POST');
    }

    static async getRoles() {
        return this.request('/roles', 'GET', null, true);
    }

    static async assignRole(userId, roleId) {
        return this.request(`/users/${userId}/role`, 'PUT', { roleId });
    }

    static async getPermissions() {
        return this.request('/permissions', 'GET', null, true);
    }

    static async updatePermissions(roleId, permissions) {
        return this.request(`/roles/${roleId}/permissions`, 'PUT', { permissions });
    }

    // Офлайн функціонал
    static async syncOfflineData() {
        const pendingActions = StorageManager.load('pending_actions') || [];
        
        for (const action of pendingActions) {
            try {
                await this.request(action.endpoint, action.method, action.data);
                successfulActions.push(action);
                console.log('Синхронізовано:', action);
            } catch (error) {
                console.error('Помилка синхронізації:', action, error);
            }
        }

        // Видаляємо успішно синхронізовані дії
        const remainingActions = pendingActions.filter(action => 
            !successfulActions.includes(action)
        );
        StorageManager.save('pending_actions', remainingActions);

        return {
            total: pendingActions.length,
            successful: successfulActions.length,
            failed: remainingActions.length
        };
    }

    static addOfflineAction(endpoint, method, data) {
        const actions = StorageManager.load('pending_actions') || [];
        const action = {
            endpoint,
            method,
            data,
            timestamp: Date.now(),
            id: Date.now() + Math.random().toString(36).substr(2, 9)
        };
        actions.push(action);
        StorageManager.save('pending_actions', actions);
        return action;
    }

    static getPendingActions() {
        return StorageManager.load('pending_actions') || [];
    }

    static clearPendingActions() {
        StorageManager.remove('pending_actions');
    }

    // Real-time функціонал (WebSocket)
    static connectWebSocket() {
        if (this.socket) return this.socket;

        const wsUrl = IS_DEVELOPMENT ? 
            'ws://localhost:3001' : 
            'wss://api.liftmanager.com/ws';

        try {
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.emit('connected');
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.emit('message', data);
                } catch (error) {
                    console.error('Помилка парсингу WebSocket повідомлення:', error);
                }
            };

            this.socket.onclose = () => {
                console.log('WebSocket disconnected');
                this.emit('disconnected');
                this.socket = null;
                
                // Спроба перепідключення
                setTimeout(() => this.connectWebSocket(), 5000);
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };

            return this.socket;
        } catch (error) {
            console.error('Помилка створення WebSocket:', error);
            return null;
        }
    }

    static disconnectWebSocket() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    static sendWebSocketMessage(type, data) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket не підключено');
            return false;
        }

        try {
            const message = JSON.stringify({ type, data });
            this.socket.send(message);
            return true;
        } catch (error) {
            console.error('Помилка відправки WebSocket повідомлення:', error);
            return false;
        }
    }

    // Event emitter для WebSocket
    static events = {};
    static on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    static off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    static emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }

    // Метрики та моніторинг
    static async trackRequest(endpoint, method, success, responseTime) {
        const metrics = StorageManager.load('api_metrics') || {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            endpoints: {}
        };

        metrics.totalRequests++;
        if (success) {
            metrics.successfulRequests++;
        } else {
            metrics.failedRequests++;
        }

        // Оновлення середнього часу відповіді
        metrics.averageResponseTime = 
            (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / 
            metrics.totalRequests;

        // Статистика по endpoint'ам
        if (!metrics.endpoints[endpoint]) {
            metrics.endpoints[endpoint] = {
                count: 0,
                success: 0,
                fail: 0,
                totalTime: 0
            };
        }

        metrics.endpoints[endpoint].count++;
        metrics.endpoints[endpoint].totalTime += responseTime;
        if (success) {
            metrics.endpoints[endpoint].success++;
        } else {
            metrics.endpoints[endpoint].fail++;
        }

        StorageManager.save('api_metrics', metrics);

        // Відправка метрик на сервер (якщо не в режимі розробки)
        if (!IS_DEVELOPMENT && metrics.totalRequests % 10 === 0) {
            this.sendMetricsToServer(metrics);
        }
    }

    static async sendMetricsToServer(metrics) {
        try {
            await fetch(`${API_BASE_URL}/metrics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metrics)
            });
        } catch (error) {
            console.error('Помилка відправки метрик:', error);
        }
    }

    static getMetrics() {
        return StorageManager.load('api_metrics') || {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            endpoints: {}
        };
    }

    // Retry механізм
    static async requestWithRetry(endpoint, method = 'GET', data = null, retries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const startTime = Date.now();
                const response = await this.request(endpoint, method, data);
                const responseTime = Date.now() - startTime;
                
                await this.trackRequest(endpoint, method, true, responseTime);
                return response;
            } catch (error) {
                const responseTime = Date.now() - startTime;
                await this.trackRequest(endpoint, method, false, responseTime);
                
                if (attempt === retries) {
                    throw error;
                }
                
                console.warn(`Спроба ${attempt} невдала, повтор через ${delay}ms...`);
                await this.delay(delay * attempt); // Exponential backoff
            }
        }
    }

    // Batch requests
    static async batchRequests(requests) {
        if (IS_DEVELOPMENT && !this.useRealAPI()) {
            const results = [];
            for (const request of requests) {
                try {
                    const result = await this.mockRequest(request.endpoint, request.method, request.data);
                    results.push({ success: true, data: result });
                } catch (error) {
                    results.push({ success: false, error: error.message });
                }
            }
            return results;
        }

        try {
            const response = await this.request('/batch', 'POST', { requests });
            return response.results;
        } catch (error) {
            console.error('Помилка batch запиту:', error);
            throw error;
        }
    }

    // Upload файлів
    static async uploadFile(file, endpoint = '/upload') {
        if (IS_DEVELOPMENT && !this.useRealAPI()) {
            await this.delay(1000);
            return {
                success: true,
                filename: file.name,
                size: file.size,
                url: URL.createObjectURL(file)
            };
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AuthManager.getAuthToken()}`
                },
                body: formData
            });

            return await response.json();
        } catch (error) {
            console.error('Помилка завантаження файлу:', error);
            throw error;
        }
    }

    // Health check
    static async healthCheck() {
        try {
            const startTime = Date.now();
            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            const responseTime = Date.now() - startTime;

            return {
                status: response.status,
                online: response.ok,
                responseTime: responseTime,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 0,
                online: false,
                responseTime: 0,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    // Кеш management
    static clearApiCache() {
        const keys = StorageManager.getAllKeys();
        keys.forEach(key => {
            if (key.startsWith('cache_api_') || key.startsWith('fallback_')) {
                StorageManager.remove(key);
            }
        });
    }

    static preloadCriticalData() {
        const criticalEndpoints = [
            '/users',
            '/lifts',
            '/repairs',
            '/notifications'
        ];

        criticalEndpoints.forEach(endpoint => {
            this.request(endpoint, 'GET', null, true).catch(() => {
                // Ignore errors in preload
            });
        });
    }
}

// Auth Manager (додаємо якщо немає)
// Для Node.js тестів імпортуємо StorageManager
if (typeof window === 'undefined' && typeof require === 'function') {
    global.StorageManager = require('./storage').StorageManager;
}

class AuthManager {
    static getAuthToken() {
        return StorageManager.load('auth_token') || null;
    }

    static setAuthToken(token) {
        StorageManager.save('auth_token', token);
    }

    static clearAuthToken() {
        StorageManager.remove('auth_token');
    }

    static isAuthenticated() {
        return !!this.getAuthToken();
    }

    static async refreshToken() {
        try {
            const response = await LiftAPI.request('/auth/refresh', 'POST');
            this.setAuthToken(response.token);
            return response.token;
        } catch (error) {
            this.clearAuthToken();
            throw error;
        }
    }
}

// Ініціалізація при завантаженні
if (typeof window !== 'undefined') {
    window.LiftAPI = LiftAPI;
    window.AuthManager = AuthManager;

    // Автоматичне відновлення WebSocket при втраті зв'язку
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !LiftAPI.socket) {
            LiftAPI.connectWebSocket();
        }
    });

    // Синхронізація при поверненні онлайн
    window.addEventListener('online', () => {
        console.log('Мережа доступна, синхронізація даних...');
        LiftAPI.syncOfflineData().then(result => {
            console.log(`Синхронізовано ${result.successful} з ${result.total} дій`);
        });
    });

    // Периодична синхронізація
    setInterval(() => {
        if (navigator.onLine) {
            LiftAPI.syncOfflineData();
        }
    }, 30000); // Кожні 30 секунд

    // Preload критичних даних при завантаженні
    if (document.readyState === 'complete') {
        LiftAPI.preloadCriticalData();
    } else {
        window.addEventListener('load', () => {
            LiftAPI.preloadCriticalData();
        });
    }
}


// Додаємо експорти для Node.js (тести)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LiftAPI, AuthManager };
}