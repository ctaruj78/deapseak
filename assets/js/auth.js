class AuthManager {
    static TOKEN_KEY = 'liftmanager_jwt';
    static USER_KEY = 'liftmanager_user';

    static login(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        
        document.cookie = `auth_token=${token}; path=/; max-age=86400`;
        
        console.log('✅ Користувач увійшов в систему:', user);
        return true;
    }

    static logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem('lm_session');
        localStorage.removeItem('lm_user');
        
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        console.log('👋 Користувач вийшов з системи');
        window.location.href = '/login.html';
    }

    static isAuthenticated() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        
        if (!token) {
            console.log('❌ isAuthenticated: Токен не знайдено');
            return false;
        }
        
        console.log('✅ isAuthenticated: Токен знайдено');
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            
            console.log('🕐 Token exp:', payload.exp, 'Now:', now, 'Diff:', payload.exp - now);
            
            if (payload.exp && payload.exp < now) {
                console.warn('⚠️ Токен застарілий');
                this.logout();
                return false;
            }
            
            console.log('✅ isAuthenticated: Токен валідний');
            return true;
        } catch (error) {
            console.error('❌ Помилка перевірки токена:', error);
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

    static getApiUrl(endpoint) {
        const hostname = window.location.hostname;
        
        if (hostname.includes('.app.github.dev')) {
            const apiHost = hostname.replace(/(-\d+)(\.app\.github\.dev)/, '-3002$2');
            return `${window.location.protocol}//${apiHost}${endpoint}`;
        }
        else if (window.location.port === '8080' || window.location.port === '5000' || window.location.port === '3000' || window.location.hostname === 'localhost') {
            return `http://localhost:3002${endpoint}`;
        }
        return endpoint;
    }

    static async fetchWithAuth(url, options = {}) {
        const headers = this.getAuthHeaders();
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
            
            if (response.status === 401) {
                console.warn('⚠️ Отримано 401');
                this.logout();
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('❌ Помилка запиту:', error);
            throw error;
        }
    }

    static checkAuthOnPageLoad() {
        const pathname = window.location.pathname;
        
        const publicPages = [
            'login.html',
            'register.html', 
            'forgot-password.html',
            'index.html',
            'demo.html',
            'test-',
            'debug-'
        ];
        
        const isPublicPage = publicPages.some(page => pathname.includes(page));
        if (isPublicPage || pathname === '/' || pathname === '') {
            return;
        }
        
        if (!this.isAuthenticated()) {
            sessionStorage.setItem('redirect_after_login', window.location.href);
            window.location.href = '/login.html';
            return;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
