/**
 * 🌍 Global Settings Loader
 * Автоматично застосовує збережені налаштування (тема, мова) на всіх сторінках
 */

(function() {
    'use strict';
    
    console.log('🌍 Global Settings Loader initialized');

    // ─── Anti-FOUC ──────────────────────────────────────────────────────────
    // Ховаємо сторінку до завантаження sidebar, щоб уникнути миготіння.
    // Тільки для захищених сторінок (не login/register/index тощо).
    (function injectNoFouc() {
        var pathname = window.location.pathname;
        var publicPages = ['login.html', 'register.html', 'forgot-password.html',
                           'index.html', 'demo.html', '404.html', 'offline.html'];
        var isPublic = publicPages.some(function(p) { return pathname.includes(p); })
                    || pathname === '/' || pathname === '';
        if (isPublic) return;

        var s = document.createElement('style');
        s.id = '__no_fouc';
        s.textContent = 'body{opacity:0!important;transition:opacity .18s ease!important}';
        document.head.appendChild(s);
    }());
    // ────────────────────────────────────────────────────────────────────────
    
    // Отримати збережені налаштування з localStorage
    function getStoredSettings() {
        try {
            const stored = localStorage.getItem('user_settings');
            if (!stored || stored === 'undefined' || stored === 'null') {
                return null;
            }
            return JSON.parse(stored);
        } catch (error) {
            console.warn('Failed to parse stored settings:', error);
            return null;
        }
    }
    
    // Застосувати тему
    function applyTheme(theme) {
        const body = document.body;
        
        // Якщо body ще не існує - чекаємо
        if (!body) {
            // Тихо відкладаємо без попередження
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => applyTheme(theme), { once: true });
            }
            return;
        }
        
        // Видаляємо всі класи тем
        body.classList.remove('theme-light', 'theme-dark');
        
        // Додаємо нову тему
        if (theme === 'dark') {
            body.classList.add('theme-dark');
            console.log('✅ Dark theme applied');
        } else {
            body.classList.add('theme-light');
            console.log('✅ Light theme applied');
        }
        
        // Зберігаємо в data-атрибут для CSS
        body.setAttribute('data-theme', theme);
    }
    
    // Застосувати мову
    function applyLanguage(language) {
        // Встановлюємо lang атрибут
        document.documentElement.lang = language;
        
        console.log(`✅ Language applied: ${language}`);
        
        // Якщо є i18n - застосовуємо через нього
        if (typeof i18n !== 'undefined' && i18n.setLanguage) {
            i18n.setLanguage(language);
        }
    }
    
    // Застосувати всі налаштування
    function applyGlobalSettings() {
        const settings = getStoredSettings();
        
        if (!settings) {
            console.log('📦 No stored settings found, using defaults (LIGHT theme)');
            applyTheme('light');
            applyLanguage('uk');
            return;
        }
        
        console.log('📦 Applying stored settings:', settings);
        
        // Застосовуємо тему (за замовчуванням СВІТЛА)
        if (settings.theme) {
            applyTheme(settings.theme);
        } else {
            // Якщо в налаштуваннях немає теми - застосовуємо світлу
            applyTheme('light');
        }
        
        // Застосовуємо мову
        if (settings.language) {
            applyLanguage(settings.language);
        }
    }
    
    // Застосовуємо налаштування одразу (ще до завантаження DOM)
    applyGlobalSettings();
    
    // Також застосовуємо після завантаження DOM (на всяк випадок)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyGlobalSettings);
    }
    
    // Слухаємо зміни в localStorage (синхронізація між вкладками)
    window.addEventListener('storage', function(e) {
        if (e.key === 'user_settings') {
            console.log('🔄 Settings changed in another tab, reapplying...');
            applyGlobalSettings();
        }
    });
    
    // Експортуємо функції глобально
    window.GlobalSettings = {
        apply: applyGlobalSettings,
        applyTheme: applyTheme,
        applyLanguage: applyLanguage,
        getSettings: getStoredSettings
    };
    
    // 🔍 Завантажуємо діагностичний модуль (тільки в dev режимі)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('codespaces')) {
        const debugScript = document.createElement('script');
        debugScript.src = '/assets/js/debug-user-role.js';
        debugScript.async = true;
        document.head.appendChild(debugScript);
        console.log('🔍 Debug user role module loaded. Use: debugUserRole()');
    }
    
})();
