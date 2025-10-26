class AppConfig {
    // Версія програми
    static VERSION = '1.0.0';
    static APP_NAME = 'DeapSeaK';
    static APP_DESCRIPTION = 'Elevator Management System';
    
    static config = {
        // Базові налаштування API
        api: {
            baseUrl: 'https://api.liftmanager.com/v1',
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
            useMockData: true,
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

        console.log('Конфігурація застосована:', this.config);
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