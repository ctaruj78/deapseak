class AppConfig {
    // Автоматичне визначення базового URL для Codespaces
    static getBaseUrl() {
        // Перевіряємо чи це GitHub Codespaces
        if (window.location.hostname.includes('github.dev')) {
            // Замінюємо порт 5000 (frontend) на 3002 (backend)
            const backendUrl = window.location.origin.replace('-5000.', '-3002.');
            console.log('🌐 Codespaces detected - Backend URL:', backendUrl);
            return backendUrl;
        }
        // Локальна розробка
        console.log('💻 Local development - Backend URL: http://localhost:3002');
        return 'http://localhost:3002';
    }

    static config = {
        // Базові налаштування API - ВИКОРИСТОВУЄМО V2 з MongoDB!
        api: {
            get baseUrl() {
                return AppConfig.getBaseUrl();
            },
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            useCache: true,
            cacheTTL: 120000 // 2 хвилини
        },

        // WebSocket налаштування
        websocket: {
            enabled: true,
            reconnectDelay: 5000,
            heartbeatInterval: 30000
        },

        // Налаштування офлайн роботи
        offline: {
            enabled: true,
            syncInterval: 30000,
            maxPendingActions: 100
        },

        // Налаштування безпеки
        security: {
            encryptData: false,
            encryptionKey: 'lift-manager-secret-key',
            tokenRefreshInterval: 3600000 // 1 година
        },

        // Налаштування розробника
        development: {
            useMockData: false, // ВИМКНУЛИ mock data - використовуємо реальний API!
            mockDelay: { min: 300, max: 1000 },
            logLevel: 'debug' // debug, info, warn, error
        }
    };

    static init(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        this.applyConfig();
    }

    static applyConfig() {
        // Застосування налаштувань до API
        if (this.config.api) {
            LiftAPI.config = { ...LiftAPI.config, ...this.config.api };
        }

        // Застосування налаштувань безпеки
        if (this.config.security.encryptData) {
            StorageManager.encryptionKey = this.config.security.encryptionKey;
        }

        console.log('✅ Конфігурація застосована:', {
            baseUrl: this.config.api.baseUrl,
            useMockData: this.config.development.useMockData
        });
    }

    static get(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.config);
    }

    static set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const obj = keys.reduce((obj, k) => obj[k] = obj[k] || {}, this.config);
        obj[lastKey] = value;
        
        this.saveToStorage();
        this.applyConfig();
    }

    static saveToStorage() {
        StorageManager.save('app_config', this.config);
    }

    static loadFromStorage() {
        const saved = StorageManager.load('app_config');
        if (saved) {
            this.config = { ...this.config, ...saved };
            this.applyConfig();
        }
    }

    static reset() {
        this.config = {
            api: {
                baseUrl: 'https://api.liftmanager.com/v1',
                timeout: 30000,
                retryAttempts: 3,
                retryDelay: 1000,
                useCache: true,
                cacheTTL: 120000
            },
            websocket: { enabled: true, reconnectDelay: 5000, heartbeatInterval: 30000 },
            offline: { enabled: true, syncInterval: 30000, maxPendingActions: 100 },
            security: { encryptData: false, encryptionKey: 'lift-manager-secret-key', tokenRefreshInterval: 3600000 },
            development: { useMockData: true, mockDelay: { min: 300, max: 1000 }, logLevel: 'debug' }
        };
        
        StorageManager.remove('app_config');
        this.applyConfig();
    }
}

// Ініціалізація конфігурації при завантаженні
if (typeof window !== 'undefined') {
    AppConfig.loadFromStorage();
    window.AppConfig = AppConfig;
}

export default AppConfig;