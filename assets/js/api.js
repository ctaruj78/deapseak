// Функція для отримання базового URL API
function getApiBaseUrl() {
    // ВАЖЛИВО: Завжди використовуємо localhost навіть в Codespaces
    // GitHub Codespaces має проблеми з CORS та multipart/form-data через tunnel
    return 'http://localhost:3001';
}

const IS_DEVELOPMENT = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname === '';

class LiftAPI {
    static async request(endpoint, method = 'GET', data = null, useCache = false) {
        // Перевірка локального режиму
        if (IS_DEVELOPMENT && !this.useRealAPI()) {
            return this.mockRequest(endpoint, method, data);
        }

        const url = `${getApiBaseUrl()}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AuthManager.getAuthToken()}`
        };

        // Перевірка кешу для GET запитів
        if (method === 'GET' && useCache) {
            const cached = StorageManager.getCache(`api_${endpoint}`);
            if (cached) {
                console.log('Використано кеш для:', endpoint);
                return cached;
            }
        }

        const config = {
            method,
            headers,
            credentials: 'include'
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Збереження в кеш для GET запитів
            if (method === 'GET' && useCache) {
                StorageManager.setCache(`api_${endpoint}`, result, 2 * 60 * 1000); // 2 хвилини
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            
            // Спроба отримати дані з локального сховища при помилці
            if (method === 'GET') {
                const fallback = StorageManager.load(`fallback_${endpoint}`);
                if (fallback) {
                    console.warn('Використано резервні дані для:', endpoint);
                    return fallback;
                }
            }
            
            throw error;
        }
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
                default:
                    // Автоматична обробка динамічних endpoint'ів
                    if (endpoint.startsWith('/users/')) {
                        response = await this.mockUserDetail(endpoint, method, data);
                    } else if (endpoint.startsWith('/lifts/')) {
                        response = await this.mockLiftDetail(endpoint, method, data);
                    } else if (endpoint.startsWith('/repairs/')) {
                        response = await this.mockRepairDetail(endpoint, method, data);
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

    static async mockRepairDetail(endpoint, method, data) {
        const repairs = StorageManager.load('mock_repairs') || [];
        const repairId = parseInt(endpoint.split('/')[2]);
        const repair = repairs.find(r => r.id === repairId);

        if (!repair) {
            throw new Error('Repair not found');
        }

        switch (method) {
            case 'GET':
                return repair;
            case 'PUT':
                Object.assign(repair, data);
                StorageManager.save('mock_repairs', repairs);
                return repair;
            case 'DELETE':
                const index = repairs.findIndex(r => r.id === repairId);
                repairs.splice(index, 1);
                StorageManager.save('mock_repairs', repairs);
                return { success: true };
            default:
                return repair;
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

    // Офлайн функціонал
    static async syncOfflineData() {
        const pendingActions = StorageManager.load('pending_actions') || [];
        const successfulActions = [];
        
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

        // WebSocket завжди на localhost:3002 (навіть в Codespaces)
        const wsUrl = 'ws://localhost:3002';

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
            await fetch(`${getApiBaseUrl()}/metrics`, {
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
            const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
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
            const response = await fetch(`${getApiBaseUrl()}/health`, {
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

export { LiftAPI, AuthManager };