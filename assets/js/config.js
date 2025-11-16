/**
 * ═══════════════════════════════════════════════════════════
 * ЦЕНТРАЛІЗОВАНА КОНФІГУРАЦІЯ ПОРТІВ - DeapSeaK v2
 * ═══════════════════════════════════════════════════════════
 * ⚠️  ВАЖЛИВО: Це ЄДИНЕ місце де визначаються порти!
 * ⚠️  НЕ ЗМІНЮЙТЕ порти без необхідності!
 * ═══════════════════════════════════════════════════════════
 */

const CONFIG = {
    APP: {
        NAME: 'DeapSeaK',
        VERSION: '2.0.0',
        SUPPORT_EMAIL: 'support@deapseak.com',
        SUPPORT_PHONE: '+380 44 123 4567'
    },

    // 🔌 ПОРТИ СИСТЕМИ (ФІКСОВАНІ!)
    PORTS: {
        FRONTEND: 5000,      // Frontend сервер
        API: 3001,           // REST API Backend (ФІКСОВАНО!)
        WEBSOCKET: 3002,     // WebSocket сервер
        MONGODB: 27017       // MongoDB
    },

    API: {
        BASE_URL: null, // Обчислюється автоматично через getApiBaseUrl()
        TIMEOUT: 30000,
        ENDPOINTS: {
            AUTH: '/auth',
            USERS: '/users',
            LIFTS: '/lifts',
            REQUESTS: '/requests',
            REPORTS: '/reports'
        },
        
        // 🎯 Автоматичне визначення базового URL для API
        getApiBaseUrl() {
            const hostname = window.location.hostname;
            
            // GitHub Codespaces
            if (hostname.includes('.app.github.dev')) {
                const apiHost = hostname.replace(/(-\d+)(\.app\.github\.dev)/, `-${CONFIG.PORTS.API}$2`);
                return `${window.location.protocol}//${apiHost}`;
            }
            
            // Локальна розробка
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return `http://localhost:${CONFIG.PORTS.API}`;
            }
            
            // Production
            return window.location.origin;
        },

        // 🎯 Отримати повний URL для endpoint
        getUrl(endpoint) {
            const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            return `${this.getApiBaseUrl()}${path}`;
        }
    },

    // 💬 WebSocket конфігурація
    WEBSOCKET: {
        getUrl() {
            const hostname = window.location.hostname;
            
            // GitHub Codespaces
            if (hostname.includes('.app.github.dev')) {
                const wsHost = hostname.replace(/(-\d+)(\.app\.github\.dev)/, `-${CONFIG.PORTS.WEBSOCKET}$2`);
                return `${window.location.protocol}//${wsHost}`;
            }
            
            // Локальна розробка
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return `http://localhost:${CONFIG.PORTS.WEBSOCKET}`;
            }
            
            // Production
            return window.location.origin;
        }
    },

    STORAGE: {
        KEYS: {
            USERS: 'lm_users',
            LIFTS: 'lm_lifts',
            REQUESTS: 'lm_requests',
            SETTINGS: 'lm_settings',
            SESSION: 'lm_session'
        },
        BACKUP_INTERVAL: 3600000
    },

    FEATURES: {
        AI_ASSISTANT: true,
        VOICE_CONTROL: true,
        AR_SUPPORT: true,
        OFFLINE_MODE: true,
        PUSH_NOTIFICATIONS: true
    },

    UI: {
        THEMES: ['light', 'dark', 'auto'],
        DEFAULT_THEME: 'light',
        LANGUAGE: 'uk',
        ANIMATIONS: true
    },

    SECURITY: {
        SESSION_TIMEOUT: 3600000,
        MAX_LOGIN_ATTEMPTS: 5,
        PASSWORD_MIN_LENGTH: 8
    },

    // 🔍 Діагностика конфігурації
    debug() {
        console.group('🔧 CONFIG - Конфігурація системи');
        console.log('📍 Hostname:', window.location.hostname);
        console.log('🌐 API Base URL:', this.API.getApiBaseUrl());
        console.log('💬 WebSocket URL:', this.WEBSOCKET.getUrl());
        console.log('🔌 Порти:', this.PORTS);
        console.groupEnd();
    }
};

// Initialize default settings
function initializeSettings() {
    if (!localStorage.getItem(CONFIG.STORAGE.KEYS.SETTINGS)) {
        const defaultSettings = {
            theme: CONFIG.UI.DEFAULT_THEME,
            language: CONFIG.UI.LANGUAGE,
            notifications: true,
            sounds: true
        };
        localStorage.setItem(CONFIG.STORAGE.KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }
}

// Initialize test data
function initializeTestData() {
    if (!localStorage.getItem(CONFIG.STORAGE.KEYS.USERS)) {
        const testUsers = [
            {
                id: 1,
                username: 'admin',
                password: 'admin123',
                email: 'admin@deapseak.com',
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
                email: 'tech1@deapseak.com',
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
                email: 'client1@deapseak.com',
                role: 'client',
                firstName: 'Петро',
                lastName: 'Клієнт',
                phone: '+380441234569',
                avatar: null,
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(CONFIG.STORAGE.KEYS.USERS, JSON.stringify(testUsers));
    }

    if (!localStorage.getItem(CONFIG.STORAGE.KEYS.LIFTS)) {
        const testLifts = [
            {
                id: 1,
                address: 'вул. Шевченка, 10, Київ',
                serialNumber: 'LFT-001',
                manufacturer: 'Otis',
                model: 'Gen2',
                installationDate: '2020-01-15',
                lastInspection: '2023-10-01',
                nextInspection: '2024-01-15',
                status: 'active',
                client: 'client1',
                technician: 'tech1',
                photos: [],
                documents: []
            }
        ];
        localStorage.setItem(CONFIG.STORAGE.KEYS.LIFTS, JSON.stringify(testLifts));
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
    initializeTestData();
    console.log(`${CONFIG.APP.NAME} v${CONFIG.APP.VERSION} initialized`);
});