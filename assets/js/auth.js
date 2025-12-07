/**
 * ═══════════════════════════════════════════════════════════
 * AUTH MANAGER - СИСТЕМА АВТОРИЗАЦІЇ
 * ═══════════════════════════════════════════════════════════
 * ⚠️ ВАЖЛИВО: ВСІ API ЗАПИТИ ЙДУТЬ ЧЕРЕЗ UNIFIED SERVER НА ПОРТ 5000
 * ⚠️ НІКОЛИ НЕ ЗМІНЮЙТЕ ПОРТ БЕЗ ЯВНОГО ЗАПИТУ КОРИСТУВАЧА!
 * ═══════════════════════════════════════════════════════════
 */

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
        
        // Очищуємо історію браузера перед редиректом
        window.history.replaceState(null, '', '/pages/auth/login.html');
        window.location.replace('/pages/auth/login.html');
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
                // НЕ викликаємо logout() тут - це створює цикл редиректів!
                // Просто очищуємо дані
                localStorage.removeItem(this.TOKEN_KEY);
                localStorage.removeItem(this.USER_KEY);
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
        // ═══════════════════════════════════════════════════════════
        // ⚠️ UNIFIED SERVER - ВСЕ НА ПОРТУ 5000
        // ⚠️ НЕ ЗМІНЮЙТЕ ЦЕЙ ПОРТ БЕЗ ЯВНОГО ЗАПИТУ!
        // ═══════════════════════════════════════════════════════════
        return `${window.location.origin}${endpoint}`;
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
            'crm-demo.html',
            'ai-demo.html',
            'qr-scanner.html',
            'qr-generator.html',
            'test-',
            'debug-'
        ];
        
        const isPublicPage = publicPages.some(page => pathname.includes(page));
        if (isPublicPage || pathname === '/' || pathname === '') {
            return;
        }
        
        if (!this.isAuthenticated()) {
            console.log('❌ Користувач не авторизований, редірект на логін');
            
            // Зберігаємо поточний URL для редиректу після логіну
            sessionStorage.setItem('redirect_after_login', window.location.href);
            
            // ЗАВЖДИ використовуємо АБСОЛЮТНИЙ шлях з кореня
            const loginPath = '/pages/auth/login.html';
            
            // Перевіряємо, щоб не створювати нескінченний цикл
            if (pathname !== loginPath && !pathname.includes('login.html')) {
                // Очищуємо історію і робимо редірект
                window.history.replaceState(null, '', loginPath);
                window.location.replace(loginPath);
            }
            return;
        }
    }
}

// Автоматична перевірка при завантаженні сторінки
if (typeof window !== 'undefined') {
    // ОДИН раз при завантаженні DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            AuthManager.checkAuthOnPageLoad();
        });
    } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
        // Якщо DOM вже завантажений, виконуємо перевірку
        // Але тільки якщо не було виконано раніше
        if (!window.__authCheckExecuted) {
            window.__authCheckExecuted = true;
            AuthManager.checkAuthOnPageLoad();
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}

// Створюємо глобальний об'єкт auth для зручного використання в HTML
if (typeof window !== 'undefined') {
    window.auth = AuthManager;
}
