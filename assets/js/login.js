document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Динамічне визначення API URL
        const apiUrl = window.location.origin.includes('github.dev')
            ? window.location.origin.replace('-5000.', '-3002.')
            : 'http://localhost:3002';
        
        try {
            const response = await fetch(`${apiUrl}/api/auth/login`, {
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
            console.error('Помилка входу:', error);
            alert('Сталася помилка під час входу');
        }
    });
});