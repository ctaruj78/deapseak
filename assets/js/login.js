document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('https://api.liftmanager.com/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                AuthManager.login(data.token, data.user);
                window.location.href = 'index.html';
            } else {
                alert(data.message || 'Помилка входу');
            }
        } catch (error) {
            // logger.error('Помилка входу:', error);
            alert('Сталася помилка під час входу');
        }
    });
});