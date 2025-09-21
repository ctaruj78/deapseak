document.addEventListener('DOMContentLoaded', () => {
    // Перевірка авторизації
    if (!AuthManager.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Встановлення поточного користувача
    const currentUser = AuthManager.getCurrentUser();
    document.getElementById('current-user').textContent = currentUser.name;
    
    // Обробник виходу
    document.getElementById('logout-btn').addEventListener('click', () => {
        AuthManager.logout();
    });
    
    // Обробка навігації
    const navLinks = document.querySelectorAll('.main-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            Router.navigateTo(page);
        });
    });
    
    // Ініціалізація головної сторінки
    Renderer.renderDashboard(currentUser);
    
    // Завантаження даних
    DataLoader.loadInitialData();
});

class Router {
    static navigateTo(page) {
        let content = '';
        
        switch(page) {
            case 'dashboard':
                content = Renderer.renderDashboard();
                break;
            case 'lifts':
                content = Renderer.renderLiftsPage();
                break;
            case 'requests':
                content = Renderer.renderRequestsPage();
                break;
            case 'qrcodes':
                content = Renderer.renderQRCodesPage();
                break;
            case 'users':
                content = Renderer.renderUsersPage();
                break;
            case 'logs':
                content = Renderer.renderLogsPage();
                break;
        }
        
        document.getElementById('main-content').innerHTML = content;
    }
}

class DataLoader {
    static async loadInitialData() {
        try {
            // Завантаження ліфтів
            const lifts = await LiftAPI.getLifts();
            StorageManager.save('lifts', lifts);
            
            // Завантаження заявок
            const requests = await LiftAPI.getRepairRequests();
            StorageManager.save('repair_requests', requests);
            
            // Завантаження користувачів
            if (AuthManager.checkRole('admin')) {
                const users = await LiftAPI.getUsers();
                StorageManager.save('users', users);
            }
            
            // Оновлення інтерфейсу
            Renderer.updateDynamicContent();
        } catch (error) {
            console.error('Помилка завантаження даних:', error);
            DOMHelper.showNotification('Помилка завантаження даних', 'error');
        }
    }
}