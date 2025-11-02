// Перевірка авторизації та редирект на правильний дашборд
(function() {
    // logger.log('🔐 Завантаження auth-check.js');
    
    // Перевіряємо чи користувач авторизований
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        // logger.log('❌ Користувач не авторизований');
        // Перенаправляємо на login якщо це не login.html
        if (!window.location.pathname.includes('login')) {
            // logger.log('📍 Перенаправляємо на login');
            window.location.href = '/login.html';
        }
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        // logger.log('✅ Користувач авторизований:', user.username, 'Роль:', user.role);
        
        // Якщо це сторінка входу, перенаправляємо на дашборд
        if (window.location.pathname === '/login.html') {
            // logger.log('📍 Користувач вже авторизований, перенаправляємо на дашборд');
            let dashboardPath = '/pages/admin/admin-dashboard.html';
            
            switch(user.role) {
                case 'admin': dashboardPath = '/pages/admin/admin-dashboard.html'; break;
                case 'dispatcher': dashboardPath = '/pages/dispatcher/dashboard.html'; break;
                case 'technician':
                case 'tech': dashboardPath = '/pages/tech/dashboard.html'; break;
                case 'client': dashboardPath = '/pages/client/dashboard.html'; break;
            }
            
            setTimeout(() => {
                window.location.href = dashboardPath;
            }, 500);
        }
    } catch (e) {
        // logger.error('❌ Помилка при розборі user:', e);
    }
})();
