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
    
    // A carregar даних
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
            // A carregar ліфтів
            const lifts = await LiftAPI.getLifts();
            StorageManager.save('lifts', lifts);
            
            // A carregar заявок
            const requests = await LiftAPI.getRepairRequests();
            StorageManager.save('repair_requests', requests);
            
            // A carregar користувачів
            if (AuthManager.checkRole('admin')) {
                const users = await LiftAPI.getUsers();
                StorageManager.save('users', users);
            }
            
            // Atualização інтерфейсу
            Renderer.updateDynamicContent();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            DOMHelper.showNotification('Erro ao carregar dados', 'error');
        }
    }
}