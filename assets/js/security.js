class AuthManager {
    static TOKEN_KEY = 'liftmanager_jwt';
    static USER_KEY = 'liftmanager_user';

    static login(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        return true;
    }

    static logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        window.location.href = '/login.html';
    }

    static isAuthenticated() {
        return !!localStorage.getItem(this.TOKEN_KEY);
    }

    static getCurrentUser() {
        const user = localStorage.getItem(this.USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    static getAuthToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    static checkRole(requiredRole) {
        const user = this.getCurrentUser();
        return user && user.role === requiredRole;
    }
}