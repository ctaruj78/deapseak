class AuthManager {
    static TOKEN_KEY = 'liftmanager_jwt';
    static USER_KEY = 'liftmanager_user';

    static login(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        
        // Також встановлюємо cookie для кросс-доменних запитів
        document.cookie = `auth_token=${token}; path=/; max-age=86400`; // 24 години
        
        console.log('✅ Користувач увійшов в систему:', user);
        return true;
    }

    static logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        
        // Видаляємо cookie
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        console.log('👋 Користувач вийшов з системи');
        window.location.href = 'login.html';
    }

    static isAuthenticated() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        if (!token) return false;
        
        try {
            // Перевіряємо чи токен не застарілий
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < now) {
                console.warn('⚠️ Токен застарілий, виходимо з системи');
                this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('❌ Помилка перевірки токена:', error);
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
        // Якщо сайт працює на порту 8080, то API на 3001
        if (window.location.port === '8080') {
            return `http://localhost:3001${endpoint}`;
        }
        // Інакше використовуємо відносний шлях
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
                console.warn('⚠️ Отримано 401, перенаправляємо на login');
                this.logout();
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('❌ Помилка авторизованого запиту:', error);
            throw error;
        }
    }

    // Перевірка авторизації при завантаженні сторінки
    static checkAuthOnPageLoad() {
        // Якщо це сторінка входу, не перевіряємо
        if (window.location.pathname.includes('login.html')) {
            return;
        }
        
        if (!this.isAuthenticated()) {
            console.log('🔒 Користувач не авторизований, перенаправляємо на login');
            window.location.href = 'login.html';
            return;
        }
        
        const user = this.getCurrentUser();
        console.log('👤 Поточний користувач:', user);
    }
}

// Ініціалізація при завантаженні
console.log('🔒 AuthManager завантажено');
console.log('📊 Поточний статус авторизації:', AuthManager.isAuthenticated());

// Перевірка авторизації при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.checkAuthOnPageLoad();
});