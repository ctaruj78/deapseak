/**
 * Dashboard Data Loader
 * Автоматичне завантаження статистики для всіх дашбордів
 */

class DashboardLoader {
    constructor() {
        this.refreshInterval = 30000; // 30 секунд
        this.intervalId = null;
        this.init();
    }

    init() {
        console.log('📊 DashboardLoader ініціалізовано');
        
        // Перевірка авторизації
        if (!this.checkAuth()) {
            console.warn('⚠️ Немає авторизації, перенаправлення на логін');
            window.location.href = '/login.html';
            return;
        }

        // Завантаження даних при ініціалізації
        this.loadDashboardData();

        // Автооновлення кожні 30 секунд
        this.intervalId = setInterval(() => {
            this.loadDashboardData();
        }, this.refreshInterval);

        console.log(`✅ Автооновлення налаштовано: кожні ${this.refreshInterval/1000}с`);
    }

    checkAuth() {
        // Підтримка різних систем зберігання токенів
        const token = localStorage.getItem('liftmanager_jwt') || 
                      localStorage.getItem('token') ||
                      localStorage.getItem('lm_token');
        
        const session = localStorage.getItem('lm_session');
        
        if (!token && !session) {
            console.warn('⚠️ Немає токена авторизації');
            return false;
        }

        // Якщо є сесія (старий формат), перевіряємо її
        if (session && !token) {
            try {
                const userData = JSON.parse(session);
                if (userData && userData.username) {
                    console.log('✅ Використовується стара сесія:', userData.username);
                    return true;
                }
            } catch (e) {
                console.error('❌ Невалідна сесія');
                localStorage.removeItem('lm_session');
                return false;
            }
        }

        // Перевірка JWT токена
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const isExpired = payload.exp * 1000 < Date.now();
                
                if (isExpired) {
                    console.warn('⚠️ JWT токен застарів');
                    localStorage.removeItem('liftmanager_jwt');
                    localStorage.removeItem('token');
                    return false;
                }

                console.log('✅ JWT токен валідний:', payload.username || payload.id);
                return true;
            } catch (error) {
                console.error('❌ Невалідний JWT токен:', error);
                return false;
            }
        }

        return false;
    }

    async loadDashboardData() {
        try {
            console.log('📊 Завантаження статистики дашборду...');
            const startTime = performance.now();
            
            // Показуємо індикатори завантаження
            this.setLoading();
            
            // Паралельно завантажуємо всі дані
            const [usersData, liftsData, requestsData] = await Promise.all([
                this.fetchAPI('/api/users'),
                this.fetchAPI('/api/lifts'),
                this.fetchAPI('/api/requests')
            ]);
            
            console.log('📦 Отримані дані:', {
                users: usersData?.length || 0,
                lifts: liftsData?.length || 0,
                requests: requestsData?.length || 0
            });

            // Підрахунок статистики
            const stats = {
                totalUsers: usersData?.length || 0,
                totalLifts: liftsData?.length || 0,
                activeRequests: this.countActiveRequests(requestsData),
                activeLifts: this.countActiveLifts(liftsData),
                totalRevenue: 0 // TODO: додати підрахунок з бази
            };

            // Оновлення UI
            this.updateUI(stats);
            
            const loadTime = (performance.now() - startTime).toFixed(0);
            console.log(`✅ Статистика завантажена за ${loadTime}ms:`, stats);
            
            // Оновлюємо час останнього оновлення
            this.updateLastRefreshTime();

        } catch (error) {
            console.error('❌ Помилка завантаження статистики:', error);
            this.setError();
        }
    }

    async fetchAPI(endpoint) {
        // Підтримка різних систем токенів
        const token = localStorage.getItem('liftmanager_jwt') || 
                      localStorage.getItem('token') ||
                      localStorage.getItem('lm_token');
        
        const headers = {
            'Content-Type': 'application/json'
        };

        // Додаємо токен якщо є
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: headers
        });

        if (response.status === 401 || response.status === 403) {
            console.error('❌ Токен недійсний, перенаправлення на логін');
            localStorage.removeItem('liftmanager_jwt');
            localStorage.removeItem('token');
            localStorage.removeItem('lm_session');
            window.location.href = '/login.html';
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        
        // Підтримка різних форматів відповіді
        if (json.success && json.data) {
            return json.data; // { success: true, data: [...] }
        }
        
        if (Array.isArray(json)) {
            return json; // [...] напряму масив
        }

        if (json.lifts) {
            return json.lifts; // { lifts: [...] }
        }

        return [];
    }

    countActiveRequests(requests) {
        if (!requests || !Array.isArray(requests)) return 0;
        
        const activeStatuses = ['new', 'assigned', 'in_progress', 'pending', 'in-progress'];
        return requests.filter(r => activeStatuses.includes(r.status)).length;
    }

    countActiveLifts(lifts) {
        if (!lifts || !Array.isArray(lifts)) return 0;
        
        return lifts.filter(l => l.status === 'active' || l.status === 'operational').length;
    }

    setLoading() {
        const elements = [
            // admin-dashboard.html
            'totalUsers', 'totalLifts', 'activeRequests', 'totalRevenue', 'activeLifts',
            // profile.html
            'qrCodes', 'systemUptime',
            // unified-analytics.html
            'total-lifts', 'active-lifts', 'qr-scans', 'maintenance-needed'
        ];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
        });
    }

    setError() {
        const elements = [
            // admin-dashboard.html
            'totalUsers', 'totalLifts', 'activeRequests', 'totalRevenue', 'activeLifts',
            // profile.html
            'qrCodes', 'systemUptime',
            // unified-analytics.html
            'total-lifts', 'active-lifts', 'qr-scans', 'maintenance-needed'
        ];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = '?';
            }
        });
    }

    updateUI(stats) {
        // Оновлюємо основні метрики (admin-dashboard.html)
        this.updateElement('totalUsers', stats.totalUsers);
        this.updateElement('totalLifts', stats.totalLifts);
        this.updateElement('activeRequests', stats.activeRequests);
        this.updateElement('activeLifts', stats.activeLifts);
        this.updateElement('totalRevenue', stats.totalRevenue === 0 ? 'N/A' : stats.totalRevenue);
        
        // Елементи для profile.html
        this.updateElement('qrCodes', stats.totalLifts);
        this.updateElement('systemUptime', 'N/A');
        
        // Елементи для unified-analytics.html
        this.updateElement('total-lifts', stats.totalLifts);
        this.updateElement('active-lifts', stats.activeLifts);
        this.updateElement('qr-scans', stats.totalLifts); // TODO: окремий лічильник QR сканувань
        this.updateElement('maintenance-needed', 0); // TODO: лічильник ліфтів що потребують ТО
    }

    updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    updateLastRefreshTime() {
        const el = document.getElementById('lastUpdate');
        if (el) {
            const now = new Date();
            el.textContent = now.toLocaleTimeString('uk-UA', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🛑 DashboardLoader зупинено');
        }
    }
}

// Глобальний екземпляр
let dashboardLoader = null;

// Автоініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    dashboardLoader = new DashboardLoader();
});

// Очищення при виході
window.addEventListener('beforeunload', () => {
    if (dashboardLoader) {
        dashboardLoader.destroy();
    }
});
