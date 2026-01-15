/**
 * 🔒 Перевірка доступу для диспетчерських панелей
 * Підключайте цей файл на всіх сторінках pages/dispatcher/*.html
 * 
 * Usage:
 * <script src="/assets/js/dispatcher-access-check.js"></script>
 */

(function() {
    'use strict';
    
    // Перевірка при завантаженні сторінки
    document.addEventListener('DOMContentLoaded', function() {
        checkDispatcherAccess();
    });
    
    // Також перевіряємо відразу (якщо DOMContentLoaded вже спрацював)
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        checkDispatcherAccess();
    }
    
    function checkDispatcherAccess() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userRole = userData.role;
            
            console.log('🔒 Перевірка доступу до диспетчерської панелі...');
            console.log('👤 Роль користувача:', userRole);
            
            // Дозволені ролі: dispatcher та admin
            const allowedRoles = ['dispatcher', 'admin'];
            
            if (!userRole || !allowedRoles.includes(userRole)) {
                console.error('❌ Доступ заборонено! Роль:', userRole);
                
                alert(
                    '❌ Доступ заборонено!\n\n' +
                    'Ця сторінка доступна тільки для:\n' +
                    '• Диспетчерів\n' +
                    '• Адміністраторів\n\n' +
                    `Ваша роль: ${userRole || 'не визначена'}\n\n` +
                    'Ви будете перенаправлені на сторінку входу.'
                );
                
                // Перенаправлення на логін
                window.location.href = '/pages/auth/login.html';
                return false;
            }
            
            console.log('✅ Доступ дозволено для ролі:', userRole);
            return true;
            
        } catch (error) {
            console.error('❌ Помилка перевірки доступу:', error);
            alert('Помилка авторизації. Увійдіть в систему заново.');
            window.location.href = '/pages/auth/login.html';
            return false;
        }
    }
    
    // Експортуємо функцію для використання в інших скриптах
    window.checkDispatcherAccess = checkDispatcherAccess;
    
})();
