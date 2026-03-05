/**
 * 🌍 i18n Initializer
 * Ініціалізує систему багатомовності та застосовує переклади до сторінки
 */

(function () {
    'use strict';

    function applyTranslations() {
        if (window.i18n && typeof window.i18n.updatePageContent === 'function') {
            window.i18n.updatePageContent();
        }
    }

    // Застосовуємо переклади після завантаження DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyTranslations);
    } else {
        applyTranslations();
    }

    // Реагуємо на зміну мови
    window.addEventListener('languageChanged', applyTranslations);
})();
