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

    // ═══════════════════════════════════════════════════════════
    // ⚡ MULTI-TAB FIX: sessionStorage is per-tab, so each browser
    // tab (admin / dispatcher / client) has its own isolated token.
    // localStorage is used only as fallback for existing sessions.
    // ═══════════════════════════════════════════════════════════
    static _getStore() { return sessionStorage; }

    static login(token, user) {
        // Write to sessionStorage (this tab) + localStorage (fallback / cookie-less)
        sessionStorage.setItem(this.TOKEN_KEY, token);
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        localStorage.setItem('userData', JSON.stringify(user)); // Для dispatcher/admin панелей
        
        document.cookie = `auth_token=${token}; path=/; max-age=86400`;
        
        console.log('✅ Користувач увійшов в систему:', user);
        console.log('✅ userData збережено для перевірки доступу');
        return true;
    }

    static logout() {
        // Очищаємо ВСІ ключі авторизації з обох сховищ
        const keys = [
            this.TOKEN_KEY,       // liftmanager_jwt
            this.USER_KEY,        // liftmanager_user
            'userData',
            'lm_session',
            'lm_user',
            'token',              // Головний токен (login.html)
            'authToken',          // Для lifts-manager.js
            'lm_token',           // Старий формат
            'deapseak_token',     // V2 формат
            'user'                // Головний user (login.html)
        ];
        keys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        console.log('👋 Користувач вийшов з системи');
        
        // Очищуємо історію браузера перед редиректом
        window.history.replaceState(null, '', '/pages/auth/login.html');
        window.location.replace('/pages/auth/login.html');
    }

    static isAuthenticated() {
        // Prefer sessionStorage (tab-specific) over localStorage
        const token = sessionStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.TOKEN_KEY);
        
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
                sessionStorage.removeItem(this.TOKEN_KEY);
                sessionStorage.removeItem(this.USER_KEY);
                localStorage.removeItem(this.TOKEN_KEY);
                localStorage.removeItem(this.USER_KEY);
                return false;
            }
            
            // Якщо токен є тільки в localStorage (стара сесія) — скопіюємо в sessionStorage
            if (!sessionStorage.getItem(this.TOKEN_KEY)) {
                sessionStorage.setItem(this.TOKEN_KEY, token);
                const lsUser = localStorage.getItem(this.USER_KEY);
                if (lsUser) sessionStorage.setItem(this.USER_KEY, lsUser);
            }
            
            console.log('✅ isAuthenticated: Токен валідний');
            return true;
        } catch (error) {
            console.error('❌ Помилка перевірки токена:', error);
            return false;
        }
    }

    static getCurrentUser() {
        // Prefer sessionStorage (tab-specific)
        const token = sessionStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.TOKEN_KEY);
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) return null;
            
            // JWT payload is authoritative for role/id/email (signed, can't be tampered)
            // Merge with stored user data for additional fields (name, phone, etc.)
            const storedUser = sessionStorage.getItem(this.USER_KEY) || localStorage.getItem(this.USER_KEY);
            const userData = storedUser ? JSON.parse(storedUser) : {};
            
            return {
                ...userData,
                id:    payload.id    || userData.id,
                role:  payload.role  || userData.role,
                email: payload.email || userData.email
            };
        } catch (error) {
            console.error('❌ Помилка читання даних користувача:', error);
            return null;
        }
    }

    static getAuthToken() {
        // Prefer sessionStorage (tab-specific) to avoid cross-tab token conflicts
        return sessionStorage.getItem(this.TOKEN_KEY)
            || localStorage.getItem(this.TOKEN_KEY)
            || sessionStorage.getItem('authToken')
            || localStorage.getItem('authToken')
            || sessionStorage.getItem('token')
            || localStorage.getItem('token')
            || localStorage.getItem('lm_token')
            || localStorage.getItem('deapseak_token')
            || null;
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
                console.warn('⚠️ Отримано 401 - перенаправлення на логін');
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

        // 🔐 Перевірка ролі: якщо сторінка вимагає конкретну роль — перевіряємо
        const bodyRequiredRole = document.body
            ? document.body.getAttribute('data-required-role')
            : null;
        if (bodyRequiredRole) {
            const user = this.getCurrentUser();
            const userRole = user ? user.role : null;
            if (userRole && userRole !== bodyRequiredRole) {
                console.warn(`⚠️ Роль "${userRole}" не має доступу до сторінки для "${bodyRequiredRole}". Редірект...`);
                // Редіректимо на відповідну панель за роллю
                const roleRedirects = {
                    'admin':      '/pages/admin/admin-dashboard.html',
                    'dispatcher': '/pages/dispatcher/dashboard.html',
                    'technician': '/pages/tech/dashboard.html',
                    'tech':       '/pages/tech/dashboard.html',
                    'client':     '/pages/client/dashboard.html'
                };
                const target = roleRedirects[userRole] || '/pages/auth/login.html';
                window.location.replace(target);
                return;
            }
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
