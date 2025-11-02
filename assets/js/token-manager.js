/**
 * Token Manager
 * Управління токеном на клієнті
 */

class TokenManager {
    constructor() {
        this.tokenKey = 'auth_token';
        this.userKey = 'auth_user';
        this.expiryKey = 'token_expiry';
        this.init();
    }

    init() {
        // logger.log('🔐 Initializing Token Manager...');
        
        try {
            const token = this.getToken();
            
            if (!token) {
                // logger.warn('⚠️ No token found in localStorage');
                this.redirectToLogin();
                return;
            }
            
            if (this.isTokenExpired()) {
                // logger.warn('⚠️ Token expired');
                this.clearToken();
                this.redirectToLogin();
                return;
            }
            
            // logger.log('✅ Token initialized successfully');
            this.attachAuthHeader();
            
        } catch (error) {
            // logger.error('❌ Token initialization error:', error);
            this.clearToken();
            this.redirectToLogin();
        }
    }

    getToken() {
        try {
            const token = localStorage.getItem(this.tokenKey);
            
            if (!token) {
                // logger.warn('No token in localStorage');
                return null;
            }
            
            return token;
        } catch (error) {
            // logger.error('Error getting token:', error);
            return null;
        }
    }

    setToken(token, expiryTime = 24 * 60 * 60 * 1000) {
        try {
            localStorage.setItem(this.tokenKey, token);
            localStorage.setItem(this.expiryKey, Date.now() + expiryTime);
            // logger.log('✅ Token saved');
            this.attachAuthHeader();
            return true;
        } catch (error) {
            // logger.error('Error setting token:', error);
            return false;
        }
    }

    isTokenExpired() {
        try {
            const expiry = localStorage.getItem(this.expiryKey);
            
            if (!expiry) {
                return true;
            }
            
            return Date.now() > parseInt(expiry);
        } catch (error) {
            // logger.error('Error checking token expiry:', error);
            return true;
        }
    }

    getUser() {
        try {
            const userStr = localStorage.getItem(this.userKey);
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            // logger.error('Error getting user:', error);
            return null;
        }
    }

    setUser(user) {
        try {
            localStorage.setItem(this.userKey, JSON.stringify(user));
            // logger.log('✅ User saved');
            return true;
        } catch (error) {
            // logger.error('Error setting user:', error);
            return false;
        }
    }

    clearToken() {
        try {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.userKey);
            localStorage.removeItem(this.expiryKey);
            // logger.log('✅ Token cleared');
            return true;
        } catch (error) {
            // logger.error('Error clearing token:', error);
            return false;
        }
    }

    attachAuthHeader() {
        const token = this.getToken();
        
        if (!token) {
            // logger.warn('No token to attach');
            return;
        }

        // Overwrite fetch to add auth header
        const originalFetch = window.fetch;
        
        window.fetch = function(...args) {
            let [resource, config] = args;
            
            if (!config) {
                config = {};
            }
            
            if (!config.headers) {
                config.headers = {};
            }
            
            config.headers['Authorization'] = `Bearer ${token}`;
            
            return originalFetch.apply(this, [resource, config]);
        };
        
        // logger.log('✅ Auth header attached to all requests');
    }

    redirectToLogin() {
        // logger.warn('🔄 Redirecting to login...');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
    }

    refreshToken(newToken) {
        // logger.log('🔄 Refreshing token...');
        this.setToken(newToken);
    }
}

// Initialize globally
const tokenManager = new TokenManager();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokenManager;
}

// logger.log('✅ Token Manager loaded');
