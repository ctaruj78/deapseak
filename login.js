document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: email,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Збереження токена та користувача
                AuthManager.login(data.token, data.user);
                
                // Перевірка ролі та перенаправлення
                const user = data.user;
                console.log('Успішний вхід:', user);
                
                // Перенаправлення згідно ролі
                if (user.role === 'admin') {
                    window.location.href = '/pages/admin/admin-dashboard.html';
                } else if (user.role === 'dispatcher') {
                    window.location.href = '/pages/dispatcher/dashboard.html';
                } else if (user.role === 'technician') {
                    window.location.href = '/pages/tech/dashboard.html';
                } else if (user.role === 'client') {
                    window.location.href = '/pages/client/dashboard.html';
                } else {
                    window.location.href = '/';
                }
            } else {
                alert(data.message || 'Помилка входу');
            }
        } catch (error) {
            console.error('Помилка входу:', error);
            alert('Сталася помилка під час входу');
        }
    });
});