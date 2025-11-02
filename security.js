class AuthManager {
    static TOKEN_KEY = 'liftmanager_jwt';
    static USER_KEY = 'liftmanager_user';

    static login(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        
        // Також встановлюємо cookie для кросс-доменних запитів
        document.cookie = `auth_token=${token}; path=/; max-age=86400`; // 24 години
        
        // logger.log('✅ Користувач увійшов в систему:', user);
        return true;
    }

    static logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        
        // Також видаляємо старі ключі (для сумісності)
        localStorage.removeItem('lm_session');
        localStorage.removeItem('lm_user');
        
        // Видаляємо cookie
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        // logger.log('👋 Користувач вийшов з системи');
        
        // Абсолютний шлях до login.html (працює з будь-якої сторінки)
        window.location.href = '/login.html';
    }

    static isAuthenticated() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        if (!token) return false;
        
        try {
            // Перевіряємо чи токен не застарілий
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < now) {
                // logger.warn('⚠️ Токен застарілий, виходимо з системи');
                this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            // logger.error('❌ Помилка перевірки токена:', error);
            this.logout();
            return false;
        }
    }

    static getCurrentUser() {
        if (!this.isAuthenticated()) return null;
        
        const user = localStorage.getItem(this.USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    static getAuthToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    static getAuthHeaders() {
        const token = this.getAuthToken();
        return token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : {
            'Content-Type': 'application/json'
        };
    }

    static checkRole(requiredRole) {
        const user = this.getCurrentUser();
        return user && user.role === requiredRole;
    }

    // Метод для формування правильного API URL
    static getApiUrl(endpoint) {
        const hostname = window.location.hostname;
        
        // GitHub Codespaces
        if (hostname.includes('.app.github.dev')) {
            const apiHost = hostname.replace('-8080.', '-3001.');
            return `${window.location.protocol}//${apiHost}${endpoint}`;
        }
        // Локальна розробка
        else if (window.location.port === '8080') {
            return `http://localhost:3001${endpoint}`;
        }
        // Відносний шлях
        return endpoint;
    }

    // Метод для відправки авторизованих запитів
    static async fetchWithAuth(url, options = {}) {
        const headers = this.getAuthHeaders();
        
        // Використовуємо правильний URL
        const apiUrl = this.getApiUrl(url);
        
        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(apiUrl, config);
            
            // Якщо отримали 401, токен недійсний
            if (response.status === 401) {
                // logger.warn('⚠️ Отримано 401, перенаправляємо на login');
                this.logout();
                return null;
            }
            
            return response;
        } catch (error) {
            // logger.error('❌ Помилка авторизованого запиту:', error);
            throw error;
        }
    }

    // Перевірка авторизації при завантаженні сторінки
    static checkAuthOnPageLoad() {
        const pathname = window.location.pathname;
        
        // Список публічних сторінок (не потребують авторизації)
        const publicPages = [
            'login.html',
            'register.html', 
            'forgot-password.html',
            'index.html',
            'demo.html',
            'test-',  // Всі тестові сторінки
            'debug-'  // Всі діагностичні сторінки
        ];
        
        // Перевіряємо чи це публічна сторінка
        const isPublicPage = publicPages.some(page => pathname.includes(page));
        if (isPublicPage) {
            // logger.log('📄 Публічна сторінка, перевірка авторизації пропущена');
            return;
        }
        
        // Якщо це корінь сайту, також не перевіряємо
        if (pathname === '/' || pathname === '') {
            return;
        }
        
        if (!this.isAuthenticated()) {
            // logger.log('🔒 Користувач не авторизований, перенаправляємо на login');
            // Зберігаємо URL куди хотів потрапити користувач
            sessionStorage.setItem('redirect_after_login', window.location.href);
            // Абсолютний шлях до login.html (працює з будь-якої сторінки)
            window.location.href = '/login.html';
            return;
        }
        
        const user = this.getCurrentUser();
        // logger.log('👤 Поточний користувач:', user);
    }
}

// Ініціалізація при завантаженні
// logger.log('🔒 AuthManager завантажено');
// logger.log('📊 Поточний статус авторизації:', AuthManager.isAuthenticated());

// Перевірка авторизації при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.checkAuthOnPageLoad();
});