/**
 * API Auth Interceptor
 * Перехоплює всі fetch запити і додає токен
 */

class AuthInterceptor {
    static init() {
        console.log('🔐 Initializing Auth Interceptor...');
        
        const originalFetch = window.fetch;
        
        window.fetch = async function(...args) {
            let [resource, config] = args;
            
            // Пропустити non-API requests
            if (typeof resource === 'string' && !resource.includes('/api/')) {
                return originalFetch.apply(this, args);
            }
            
            // Ініціалізувати config
            if (!config) config = {};
            if (!config.headers) config.headers = {};
            
            // Додати токен
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
            
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
                console.log('✅ Token added to request:', resource);
            } else {
                console.warn('⚠️ No token available for:', resource);
            }
            
            // Додати Content-Type якщо немає
            if (!config.headers['Content-Type'] && config.body) {
                config.headers['Content-Type'] = 'application/json';
            }
            
            try {
                const response = await originalFetch.apply(this, [resource, config]);
                
                // Перевірити 401 (Unauthorized)
                if (response.status === 401) {
                    console.error('❌ 401 Unauthorized - redirecting to login');
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('token');
                    window.location.href = '/login.html';
                    return;
                }
                
                // Перевірити 403 (Forbidden)
                if (response.status === 403) {
                    console.error('❌ 403 Forbidden');
                    if (typeof Notifier !== 'undefined') {
                        Notifier.error('Access denied');
                    }
                }
                
                return response;
                
            } catch (error) {
                console.error('❌ Fetch error:', error);
                if (typeof Notifier !== 'undefined') {
                    Notifier.error('Network error: ' + error.message);
                }
                throw error;
            }
        };
        
        console.log('✅ Auth Interceptor initialized');
    }
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AuthInterceptor.init();
    });
} else {
    AuthInterceptor.init();
}
