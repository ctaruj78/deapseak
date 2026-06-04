/**
 * ═══════════════════════════════════════════════════════════
 * AUTH MANAGER - СИСТЕМА АВManutençãoРИЗАЦІЇ
 * ═══════════════════════════════════════════════════════════
 * ⚠️ ВАЖЛИВО: ВСІ API ЗАПИТИ ЙДУТЬ ЧЕРЕЗ UNIFIED SERVER НА ПОРТ 5000
 * ⚠️ НІКОЛИ НЕ ЗМІНЮЙТЕ ПОРТ БЕЗ ЯВНОГО ЗАПИТУ КОРИСТУВАЧА!
 * ═══════════════════════════════════════════════════════════
 */

class AuthManager {
    static TOKEN_KEY = 'liftmanager_jwt';
    static USER_KEY = 'liftmanager_user';
    static REFRESH_KEY = 'liftmanager_refresh';

    // ═══════════════════════════════════════════════════════════
    // ⚡ MULTI-TAB FIX: sessionStorage is per-tab, so each browser
    // tab (admin / dispatcher / client) has its own isolated token.
    // localStorage is used only as fallback for existing sessions.
    // ═══════════════════════════════════════════════════════════
    static _getStore() { return sessionStorage; }

    static login(token, user, refreshToken = null, rememberMe = false) {
        // Write to sessionStorage (this tab) + localStorage (fallback / cookie-less)
        sessionStorage.setItem(this.TOKEN_KEY, token);
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        localStorage.setItem('userData', JSON.stringify(user)); // Для dispatcher/admin панелей
        
        // Зберігаємо refresh token для автоматичного оновлення
        if (refreshToken) {
            localStorage.setItem(this.REFRESH_KEY, refreshToken);
        }
        if (rememberMe) {
            localStorage.setItem('liftmanager_remember', '1');
        }
        
        // cookie: 7 днів звичайно, 365 днів якщо remember me
        const cookieAge = rememberMe ? 31536000 : 604800;
        document.cookie = `auth_token=${token}; path=/; max-age=${cookieAge}`;
        
        console.log('✅ Utilizador увійшов в систему:', user);
        console.log('✅ userData збережено для перевірки доступу');
        if (rememberMe) console.log('✅ Режим "Запам\'ятати" активовано - сесія 365 днів');
        return true;
    }

    // Atualização access token через refresh token (без виходу з системи)
    static async refreshAccessToken() {
        const refreshToken = localStorage.getItem(this.REFRESH_KEY);
        if (!refreshToken) return false;
        try {
            const resp = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
            if (!resp.ok) {
                console.warn('⚠️ Refresh token недійсний ou expirado — não é possível renovar');
                return false;
            }
            const data = await resp.json();
            if (data.success && data.data && data.data.token) {
                // Зберігаємо нові токени
                sessionStorage.setItem(this.TOKEN_KEY, data.data.token);
                localStorage.setItem(this.TOKEN_KEY, data.data.token);
                if (data.data.refreshToken) {
                    localStorage.setItem(this.REFRESH_KEY, data.data.refreshToken);
                }
                document.cookie = `auth_token=${data.data.token}; path=/; max-age=604800`;
                console.log('✅ Access token автоматично оновлено');
                return true;
            }
            return false;
        } catch (e) {
            console.error('❌ Erro оновлення токену:', e);
            return false;
        }
    }

    static logout() {
        // Очищаємо ВСІ ключі авторизації з обох сховищ
        const keys = [
            this.TOKEN_KEY,       // liftmanager_jwt
            this.USER_KEY,        // liftmanager_user
            this.REFRESH_KEY,     // liftmanager_refresh
            'userData',
            'lm_session',
            'lm_user',
            'token',              // Головний токен (login.html)
            'authToken',          // Для lifts-manager.js
            'lm_token',           // Старий формат
            'deapseak_token',     // V2 формат
            'user',               // Головний user (login.html)
            'currentUser'         // Dashboard/profile cache
        ];
        keys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        console.log('👋 Utilizador вийшов з системи');
        
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
                // Просто очищуємо дані (не logout щоб не зациклити редирект)
                sessionStorage.removeItem(this.TOKEN_KEY);
                sessionStorage.removeItem(this.USER_KEY);
                localStorage.removeItem(this.TOKEN_KEY);
                localStorage.removeItem(this.USER_KEY);
                return false;
            }
            
            // Якщо токен закінчується менш ніж через 24 horasи — оновлюємо заздалегідь
            if (payload.exp && (payload.exp - now) < 86400) {
                console.log('🔄 Токен закінчується < 24h, оновлюємо у фоні...');
                this.refreshAccessToken().catch(() => {});
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
            console.error('❌ Erro перевірки токена:', error);
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
            console.error('❌ Erro читання даних користувача:', error);
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
            
            if (response.status === 401 || response.status === 403) {
                // Спробуємо оновити токен перш ніж виходити
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Повторюємо запит з новим токеном
                    const retryConfig = {
                        ...config,
                        headers: { ...config.headers, 'Authorization': `Bearer ${this.getAuthToken()}` }
                    };
                    const retryResp = await fetch(apiUrl, retryConfig);
                    if (retryResp.status === 401 || retryResp.status === 403) {
                        console.warn('⚠️ Після refresh все одно 401/403 — виходимо');
                        this.logout();
                        return null;
                    }
                    return retryResp;
                }
                // Refresh не вдався — logout тільки на 401
                if (response.status === 401) {
                    this.logout();
                    return null;
                }
            }
            
            return response;
        } catch (error) {
            console.error('❌ Erro запиту:', error);
            throw error;
        }
    }

    static async checkAuthOnPageLoad() {
        const pathname = window.location.pathname;
        
        const publicPages = [
            'login.html',
            'register.html', 
            'forgot-password.html',
            'index.html',
            'demo.html',
            'crm-demo.html',
            'ai-demo.html',
            'ai-guest.html',
            'qr-scanner.html',
            'qr-generator.html',
            'pages/public/',
            'test-',
            'debug-'
        ];
        
        const isPublicPage = publicPages.some(page => pathname.includes(page));
        if (isPublicPage || pathname === '/' || pathname === '') {
            return;
        }
        
        if (!this.isAuthenticated()) {
            // 🔄 Спробуємо оновити токен через refresh token перед редіректом
            const refreshToken = localStorage.getItem(this.REFRESH_KEY);
            if (refreshToken) {
                console.log('🔄 Access token відсутній/прострочений, спроба оновлення...');
                try {
                    const refreshed = await this.refreshAccessToken();
                    if (refreshed) {
                        console.log('✅ Token auto-refreshed on page load, продовжуємо...');
                        // Продовжуємо нижче до перевірки ролі
                    } else {
                        // Clear invalid tokens before redirecting
                        [this.TOKEN_KEY, this.USER_KEY, this.REFRESH_KEY, 'token', 'authToken'].forEach(k => {
                            localStorage.removeItem(k); sessionStorage.removeItem(k);
                        });
                        this._doLoginRedirect(pathname);
                        return;
                    }
                } catch (e) {
                    console.error('❌ Erro refresh на старті:', e);
                    this._doLoginRedirect(pathname);
                    return;
                }
            } else {
                console.log('❌ Utilizador не авторизований (no refresh token), редірект на логін');
                this._doLoginRedirect(pathname);
                return;
            }
        }

        // 🔐 Перевірка ролі: якщо сторінка вимагає конкретну роль — перевіряємо
        const bodyRequiredRole = document.body
            ? document.body.getAttribute('data-required-role')
            : null;
        if (bodyRequiredRole) {
            const user = this.getCurrentUser();
            const userRole = user ? user.role : null;
            const normalize = (r) => {
                const raw = String(r || '').trim().toLowerCase();
                if (raw === 'technician') return 'tech';
                if (raw === 'tecnico' || raw === 'técnico') return 'tech';
                if (raw === 'administrador') return 'admin';
                return raw;
            };

            if (!userRole) {
                console.warn(`⚠️ Página requer role "${bodyRequiredRole}", але роль користувача не визначена. Редірект на логін.`);
                this._doLoginRedirect(pathname);
                return;
            }

            if (normalize(userRole) !== normalize(bodyRequiredRole)) {
                console.warn(`⚠️ Função "${userRole}" не має доступу до сторінки для "${bodyRequiredRole}". Редірект...`);
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

    // Внутрішній хелпер для редіректу на логін
    static _doLoginRedirect(pathname) {
        // Зберігаємо поточний URL для редиректу після логіну
        sessionStorage.setItem('redirect_after_login', window.location.href);
        
        const loginPath = '/pages/auth/login.html';
        
        if (pathname !== loginPath && !pathname.includes('login.html')) {
            window.history.replaceState(null, '', loginPath);
            window.location.replace(loginPath);
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

// Auto-populate sidebar name elements on every page
if (typeof window !== 'undefined') {
    const _populateSidebarName = () => {
        try {
            const stored = sessionStorage.getItem('liftmanager_user') || localStorage.getItem('liftmanager_user');
            if (!stored) return;
            const u = JSON.parse(stored);

            // Security: verify stored user matches the current JWT — avoid showing stale data
            try {
                const token = sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt');
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    // Clear if JWT email doesn't match stored user email
                    if (payload.email && u.email && payload.email.toLowerCase() !== u.email.toLowerCase()) {
                        sessionStorage.removeItem('liftmanager_user');
                        localStorage.removeItem('liftmanager_user');
                        localStorage.removeItem('currentUser');
                        return;
                    }
                    // Clear if page requires a specific role and stored user's role doesn't match
                    // Normalize: 'tech' and 'technician' are the same
                    const normalizeRole = r => (r === 'technician' ? 'tech' : r);
                    const requiredRole = document.body && document.body.dataset && document.body.dataset.requiredRole;
                    if (requiredRole && u.role && normalizeRole(requiredRole) !== normalizeRole(u.role)) {
                        sessionStorage.removeItem('liftmanager_user');
                        localStorage.removeItem('liftmanager_user');
                        localStorage.removeItem('currentUser');
                        return;
                    }
                }
            } catch(e) {}

            // Support both {firstName, lastName} (admin/dispatcher) and {name} (client)
            const fullName = u.name ||
                ((u.firstName || '') + ' ' + (u.lastName || '')).trim() ||
                u.username || u.email || '—';

            // All known sidebar name element IDs across panels
            // sidebarFullName = admin user-panel link; sidebarName = brand area (admin/dispatcher)
            const placeholders = ['—', 'Cliente', 'Técnico', 'Dispatcher', 'Administrador', 'Administrador Системи', 'Administrador системи', ''];
            ['sidebarFullName', 'sidebarName', 'sidebarUserName', 'clientName', 'techName', 'adminName'].forEach(function(id) {
                const el = document.getElementById(id);
                // Only set if still showing placeholder (don't override runtime-set values)
                if (el && placeholders.includes(el.textContent.trim())) {
                    el.textContent = fullName;
                }
            });
        } catch (e) {}
    };

    // Load orcamentos count badge for client sidebar (runs only when element exists)
    const _loadOrcamentosCount = () => {
        const badge = document.getElementById('orcamentosCount');
        if (!badge) return;
        const token = sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt');
        if (!token) return;
        fetch('/api/orcamentos/my', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
            if (data && data.data && Array.isArray(data.data)) {
                badge.textContent = data.data.length;
            }
        })
        .catch(function() {});
    };

    const _initSidebar = () => {
        _populateSidebarName();
        _loadOrcamentosCount();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initSidebar);
    } else {
        _initSidebar();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}

// Створюємо глобальний об'єкт auth для зручного використання в HTML
if (typeof window !== 'undefined') {
    window.auth = AuthManager;
}

// ═══════════════════════════════════════════════════════════
// FIX: Override window.logout after all inline scripts run.
// Many pages define their own logout() that only removes 3 keys,
// leaving liftmanager_jwt in storage → login page shows "already
// logged in" on next visit (the "blink" / double-attempt bug).
// DOMContentLoaded fires AFTER all synchronous inline <script> tags,
// so this reliably replaces any broken page-level logout() with the
// proper AuthManager.logout() that clears all 12+ auth keys.
// ═══════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
    const _overrideLogout = function () {
        window.logout = function () {
            if (!confirm('Tem a certeza que quer sair do sistema?')) return;
            AuthManager.logout();
        };
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _overrideLogout, { once: true });
    } else {
        // DOM already ready (script loaded late) — override immediately
        _overrideLogout();
    }
}
