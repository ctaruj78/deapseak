const CONFIG = {
    APP: {
        NAME: 'LiftMaster Pro',
        VERSION: '2.0.0',
        SUPPORT_EMAIL: 'support@liftmaster.com',
        SUPPORT_PHONE: '+380 44 123 4567'
    },

    API: {
        BASE_URL: 'https://api.liftmaster.com',
        TIMEOUT: 30000,
        ENDPOINTS: {
            AUTH: '/auth',
            USERS: '/users',
            LIFTS: '/lifts',
            REQUESTS: '/requests',
            REPORTS: '/reports'
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