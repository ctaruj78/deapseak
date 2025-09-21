// Автоматична ініціалізація тестових користувачів
if (!localStorage.getItem('lm_users')) {
    localStorage.setItem('lm_users', JSON.stringify([
        {
            id: 1,
            username: 'admin',
            password: 'admin123',
            email: 'admin@liftmaster.com',
            role: 'admin',
            firstName: 'Адміністратор',
            lastName: 'Системи',
            phone: '+380441234567',
            avatar: null,
            isActive: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            username: 'tech1',
            password: 'tech123',
            email: 'tech1@liftmaster.com',
            role: 'tech',
            firstName: 'Іван',
            lastName: 'Технік',
            phone: '+380441234568',
            avatar: null,
            isActive: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            username: 'client1',
            password: 'client123',
            email: 'client1@liftmaster.com',
            role: 'client',
            firstName: 'Петро',
            lastName: 'Клієнт',
            phone: '+380441234569',
            avatar: null,
            isActive: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 4,
            username: 'dispatcher1',
            password: 'dispatcher123',
            email: 'dispatcher1@liftmaster.com',
            role: 'dispatcher',
            firstName: 'Олег',
            lastName: 'Диспетчер',
            phone: '+380441234570',
            avatar: null,
            isActive: true,
            createdAt: new Date().toISOString()
        }
    ]));
}

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
        // Підтримка різних ключів для користувачів
        let users = [];
        if (localStorage.getItem('lm_users')) {
            users = JSON.parse(localStorage.getItem('lm_users'));
        } else if (localStorage.getItem('users')) {
            users = JSON.parse(localStorage.getItem('users'));
        } else if (localStorage.getItem('userData')) {
            users = [JSON.parse(localStorage.getItem('userData'))];
        }
        return users.find(user => 
            user.username === username && 
            user.password === password &&
            user.isActive
        );
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
            client: 'pages/client/dashboard.html',
            dispatcher: 'pages/dispatcher/dashboard.html'
        };

        window.location.href = dashboards[role] || 'pages/admin/admin-dashboard.html';
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
}

// Initialize auth manager
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        window.authManager = new AuthManager();
    });
}

// Експорт для автотестів (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}