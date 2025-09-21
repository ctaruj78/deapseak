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
        }
    ]));
}

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.loginAttempts = 0;
        this.init();
    }

    init() {
        this.loadSession();
        this.setupEventListeners();
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
        const users = JSON.parse(localStorage.getItem('lm_users') || '[]');
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
        // Зберігаємо тестовий токен для API
        localStorage.setItem('auth_token', 'test-token');
        CommonUtils.showNotification(`Вітаємо, ${user.firstName}!`, 'success');
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
document.addEventListener('DOMContentLoaded', function() {
    window.authManager = new AuthManager();
});