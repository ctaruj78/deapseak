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
    
    // Simож перевіряємо відразу (якщо DOMContentLoaded вже спрацював)
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        checkDispatcherAccess();
    }
    
    function checkDispatcherAccess() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userRole = userData.role;
            
            console.log('🔒 Перевірка доступу до диспетчерської панелі...');
            console.log('👤 Função користувача:', userRole);
            
            // Дозволені ролі: dispatcher та admin
            const allowedRoles = ['dispatcher', 'admin'];
            
            if (!userRole || !allowedRoles.includes(userRole)) {
                console.error('❌ Acesso negado! Função:', userRole);
                
                alert(
                    '❌ Acesso negado!\n\n' +
                    'Ця сторінка доступна тільки для:\n' +
                    '• Dispatcherів\n' +
                    '• Administradorів\n\n' +
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
            console.error('❌ Erro перевірки доступу:', error);
            alert('Erro авторизації. Увійдіть в систему заново.');
            window.location.href = '/pages/auth/login.html';
            return false;
        }
    }
    
    // Exportarуємо функцію для використання в інших скриптах
    window.checkDispatcherAccess = checkDispatcherAccess;
    
})();
