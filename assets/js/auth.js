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
        
        // Також видаляємо старі ключі (для сумісності)
        localStorage.removeItem('lm_session');
        localStorage.removeItem('lm_user');
        
        // Видаляємо cookie
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        console.log('👋 Користувач вийшов з системи');
        
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
        const hostname = window.location.hostname;
        
        // GitHub Codespaces
        if (hostname.includes('.app.github.dev')) {
            const apiHost = hostname.replace(/(-\d+)(\.app\.github\.dev)/, '-3001$2');
            return `${window.location.protocol}//${apiHost}${endpoint}`;
        }
        // Локальна розробка
        else if (window.location.port === '8080' || window.location.port === '3000' || window.location.hostname === 'localhost') {
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
            console.log('📄 Публічна сторінка, перевірка авторизації пропущена');
            return;
        }
        
        // Якщо це корінь сайту, також не перевіряємо
        if (pathname === '/' || pathname === '') {
            return;
        }
        
        if (!this.isAuthenticated()) {
            console.log('🔒 Користувач не авторизований, перенаправляємо на login');
            // Зберігаємо URL куди хотів потрапити користувач
            sessionStorage.setItem('redirect_after_login', window.location.href);
            // Абсолютний шлях до login.html (працює з будь-якої сторінки)
            window.location.href = '/login.html';
            return;
        }
        
        const user = this.getCurrentUser();
        console.log('👤 Поточний користувач:', user);
    }
}

// Функція для визначення правильного API URL (зворотна сумісність)
function getApiUrl() {
    const hostname = window.location.hostname;
    if (hostname.includes('app.github.dev')) {
        // GitHub Codespaces
        return window.location.origin.replace('-8080.app.github.dev', '-3001.app.github.dev');
    } else {
        // Local development
        return 'http://localhost:3001';
    }
}

// ВСЯ АУТЕНТИФІКАЦІЯ ТЕПЕР ЧЕРЕЗ API - localStorage тестові дані видалено

class AuthManager {
    constructor(options = {}) {
        this.currentUser = null;
        this.loginAttempts = 0;
        this.isTest = options.isTest || false;
        this.init();
    }

    init() {
        this.loadSession();
        if (!this.isTest && typeof document !== 'undefined') {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        const remember = formData.get('remember');

        try {
            const user = await this.authenticate(username, password);
            if (user) {
                await this.createSession(user, remember);
                this.redirectToDashboard(user.role);
            } else {
                this.handleFailedLogin();
            }
        } catch (error) {
            CommonUtils.showNotification('Помилка авторизації', 'error');
            console.error('Login error:', error);
        }
    }

    async authenticate(username, password) {
        // ВСЯ АУТЕНТИФІКАЦІЯ ТЕПЕР ЧЕРЕЗ API
        try {
            const response = await fetch(`${getApiUrl()}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: username,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                return data.user;
            } else {
                return null;
            }
        } catch (error) {
            console.error('API authentication error:', error);
            return null;
        }
    }

    async createSession(user, remember) {
        this.currentUser = user;
        const session = {
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                email: user.email
            },
            createdAt: new Date().toISOString(),
            expiresAt: remember ? 
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : // 30 days
                new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours
        };

        localStorage.setItem('lm_session', JSON.stringify(session));
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('auth_token', 'test-token');
        if (!this.isTest && typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification(`Вітаємо, ${user.firstName}!`, 'success');
        }
    }

    redirectToDashboard(role) {
        const dashboards = {
            admin: 'pages/admin/admin-dashboard.html',
            tech: 'pages/tech/dashboard.html', 
            technician: 'pages/tech/dashboard.html',
            client: 'pages/client/dashboard.html',
            dispatcher: 'pages/dispatcher/dashboard.html'
        };

        const targetUrl = dashboards[role] || 'pages/client/dashboard.html';
        console.log(`Redirecting user with role '${role}' to: ${targetUrl}`);
        window.location.href = targetUrl;
    }

    handleFailedLogin() {
        this.loginAttempts++;
        
        if (this.loginAttempts >= 5) {
            CommonUtils.showNotification('Забагато невдалих спроб. Спробуйте пізніше.', 'error');
            document.getElementById('login-form').style.display = 'none';
        } else {
            CommonUtils.showNotification('Невірний логін або пароль', 'error');
        }
    }

    loadSession() {
        try {
            const sessionData = localStorage.getItem('lm_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                const now = new Date();
                
                if (new Date(session.expiresAt) > now) {
                    this.currentUser = session.user;
                    return true;
                } else {
                    this.logout();
                }
            }
        } catch (error) {
            console.error('Error loading session:', error);
            this.logout();
        }
        return false;
    }

    logout() {
        localStorage.removeItem('lm_session');
        this.currentUser = null;
        window.location.href = 'login.html';
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    hasRole(role) {
        return this.isAuthenticated() && this.currentUser.role === role;
    }

    hasAnyRole(roles) {
        return this.isAuthenticated() && roles.includes(this.currentUser.role);
    }

    /**
     * Проверка авторизации пользователя с API
     * @param {string|array} requiredRole - требуемая роль или массив ролей
     * @returns {Promise<boolean>} - результат проверки
     */
    async checkAuth(requiredRole = null) {
        try {
            // Получаем токен из разных источников
            const token = this.getAuthToken();
            
            if (!token) {
                this.redirectToLogin();
                return false;
            }

            // Проверяем токен на сервере
            const response = await fetch(`${getApiUrl()}/api/verify-token`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                this.clearAuth();
                this.redirectToLogin();
                return false;
            }

            const userData = await response.json();
            
            // Проверяем роль если требуется
            if (requiredRole) {
                const userRole = userData.role || userData.user?.role;
                const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
                
                if (!roles.includes(userRole)) {
                    this.showError('У вас нет прав доступа к этой странице');
                    this.redirectToDashboard(userRole);
                    return false;
                }
            }

            // Сохраняем данные пользователя
            this.currentUser = userData.user || userData;
            return true;

        } catch (error) {
            console.error('Ошибка проверки авторизации:', error);
            this.clearAuth();
            this.redirectToLogin();
            return false;
        }
    }

    /**
     * Получение токена из localStorage
     * @returns {string|null}
     */
    getAuthToken() {
        // Проверяем разные возможные ключи токена
        return localStorage.getItem('liftmanager_jwt') || 
               localStorage.getItem('authToken') || 
               localStorage.getItem('token') ||
               this.getTokenFromSession();
    }

    /**
     * Извлечение токена из сессии (совместимость с старой системой)
     * @returns {string|null}
     */
    getTokenFromSession() {
        try {
            const sessionData = localStorage.getItem('lm_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                return session.token || session.jwt;
            }
        } catch (error) {
            console.warn('Ошибка чтения сессии:', error);
        }
        return null;
    }

    /**
     * Очистка данных авторизации
     */
    clearAuth() {
        this.currentUser = null;
        localStorage.removeItem('liftmanager_jwt');
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        localStorage.removeItem('lm_session');
    }

    /**
     * Перенаправление на страницу входа
     */
    redirectToLogin() {
        const currentPath = window.location.pathname;
        
        // Определяем относительный путь к login.html
        let redirectPath;
        if (currentPath.includes('/pages/')) {
            // Если мы в подпапке pages, идем на два уровня вверх
            redirectPath = '../../login.html';
        } else if (currentPath.includes('/assets/')) {
            redirectPath = '../login.html';
        } else {
            redirectPath = './login.html';
        }
        
        // Сохраняем текущую страницу для возврата после авторизации
        localStorage.setItem('returnUrl', window.location.href);
        
        window.location.href = redirectPath;
    }

    /**
     * Перенаправление на дашборд в зависимости от роли
     * @param {string} userRole
     */
    redirectToDashboard(userRole) {
        let dashboardPath;
        
        switch (userRole) {
            case 'admin':
                dashboardPath = '../admin/lifts.html';
                break;
            case 'dispatcher':
                dashboardPath = '../dispatcher/assignments.html';
                break;
            case 'tech':
            case 'technician':
                dashboardPath = '../tech/dashboard.html';
                break;
            case 'client':
                dashboardPath = '../client/dashboard.html';
                break;
            default:
                dashboardPath = '../../index.html';
        }
        
        window.location.href = dashboardPath;
    }

    /**
     * Показать сообщение об ошибке
     * @param {string} message
     */
    showError(message) {
        // Проверяем наличие Bootstrap для показа alert
        if (typeof bootstrap !== 'undefined') {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible fade show';
            alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(alertDiv);
            
            // Автоматически скрыть через 5 секунд
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        } else {
            // Fallback для старых браузеров
            alert(message);
        }
    }

    /**
     * Выполнение API запроса с автоматическим добавлением токена
     * @param {string} endpoint
     * @param {object} options
     * @returns {Promise<Response>}
     */
    async apiRequest(endpoint, options = {}) {
        const token = this.getAuthToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(`${getApiUrl()}/api${endpoint}`, finalOptions);
            
            if (response.status === 401) {
                // Токен истек или недействителен
                this.clearAuth();
                this.redirectToLogin();
                throw new Error('Требуется авторизация');
            }
            
            return response;
        } catch (error) {
            console.error('Ошибка API запроса:', error);
            throw error;
        }
    }

    /**
     * Инициализация защиты страницы
     * Вызывается автоматически при загрузке страницы
     * @param {string|array} requiredRole
     */
    async initPageProtection(requiredRole = null) {
        try {
            const isAuthorized = await this.checkAuth(requiredRole);
            
            if (isAuthorized && this.currentUser) {
                // Авторизация успешна, обновляем интерфейс
                this.updateUserInterface();
            }
        } catch (error) {
            console.error('Ошибка инициализации защиты страницы:', error);
            this.redirectToLogin();
        }
    }

    /**
     * Обновление пользовательского интерфейса
     */
    updateUserInterface() {
        if (!this.currentUser) return;

        // Обновляем имя пользователя
        const nameElements = document.querySelectorAll('[data-user="name"], .user-name');
        nameElements.forEach(el => {
            el.textContent = `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim() || 
                           this.currentUser.username || 'Пользователь';
        });

        // Обновляем роль пользователя
        const roleElements = document.querySelectorAll('[data-user="role"], .user-role');
        roleElements.forEach(el => {
            const roleNames = {
                'admin': 'Администратор',
                'dispatcher': 'Диспетчер',
                'tech': 'Техник',
                'technician': 'Техник',
                'client': 'Клиент'
            };
            el.textContent = roleNames[this.currentUser.role] || this.currentUser.role || 'Пользователь';
        });

        // Обновляем email
        const emailElements = document.querySelectorAll('[data-user="email"], .user-email');
        emailElements.forEach(el => {
            el.textContent = this.currentUser.email || '';
        });
    }
}

// Initialize auth manager
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        window.authManager = new AuthManager();
        window.AuthManager = AuthManager; // Для зворотної сумісності
        
        // Получаем требуемую роль из атрибута body
        const body = document.body;
        const requiredRole = body.getAttribute('data-required-role');
        
        // Если страница требует авторизации, инициализируем защиту
        if (requiredRole !== null) {
            window.authManager.initPageProtection(requiredRole === '' ? null : requiredRole);
        }
    });
}

// Функция быстрой проверки авторизации (для обратной совместимости)
window.checkAuth = (requiredRole) => {
    if (window.authManager) {
        return window.authManager.checkAuth(requiredRole);
    }
    return false;
};

// Експорт для автотестів (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}