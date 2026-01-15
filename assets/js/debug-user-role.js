/**
 * 🔍 Діагностика ролі користувача
 * Відкрийте консоль браузера (F12) та введіть: debugUserRole()
 */

function debugUserRole() {
    console.log('\n%c🔍 ДІАГНОСТИКА РОЛІ КОРИСТУВАЧА', 'background: #4CAF50; color: white; padding: 10px; font-size: 16px; font-weight: bold;');
    console.log('');
    
    // 1. Перевірка localStorage
    console.log('%c📦 1. ДАНІ В LOCALSTORAGE:', 'color: #2196F3; font-weight: bold; font-size: 14px;');
    
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (!token) {
        console.log('%c❌ authToken відсутній!', 'color: red; font-weight: bold;');
        console.log('   → Ви не авторизовані. Перейдіть на /pages/auth/login.html');
        return;
    } else {
        console.log('%c✅ authToken знайдено:', 'color: green;');
        console.log(`   ${token.substring(0, 50)}...`);
    }
    
    if (!userData) {
        console.log('%c⚠️ userData відсутній!', 'color: orange; font-weight: bold;');
        console.log('   → Застарілі дані. Перелогіньтесь.');
        return;
    } else {
        console.log('%c✅ userData знайдено:', 'color: green;');
        try {
            const user = JSON.parse(userData);
            console.table({
                'Email': user.email,
                'Роль': user.role,
                'Ім\'я': `${user.firstName || ''} ${user.lastName || ''}`,
                'User ID': user.userId
            });
            
            // 2. Перевірка відповідності
            console.log('');
            console.log('%c👤 2. ПОТОЧНА РОЛЬ:', 'color: #2196F3; font-weight: bold; font-size: 14px;');
            
            if (user.role === 'dispatcher') {
                console.log('%c✅ ВИ ДИСПЕТЧЕР', 'background: #4CAF50; color: white; padding: 5px; font-weight: bold;');
                console.log('   → Доступ до dispatcher/* сторінок ДОЗВОЛЕНО');
            } else if (user.role === 'admin') {
                console.log('%c✅ ВИ АДМІНІСТРАТОР', 'background: #FF9800; color: white; padding: 5px; font-weight: bold;');
                console.log('   → Доступ до всіх сторінок ДОЗВОЛЕНО');
            } else if (user.role === 'client') {
                console.log('%c⚠️ ВИ КЛІЄНТ', 'background: #f44336; color: white; padding: 5px; font-weight: bold;');
                console.log('   → Доступ до dispatcher/* сторінок ЗАБОРОНЕНО');
                console.log('   → Ви будете перенаправлені на логін');
            } else if (user.role === 'tech' || user.role === 'technician') {
                console.log('%c⚠️ ВИ ТЕХНІК', 'background: #f44336; color: white; padding: 5px; font-weight: bold;');
                console.log('   → Доступ до dispatcher/* сторінок ЗАБОРОНЕНО');
                console.log('   → Ви будете перенаправлені на логін');
            } else {
                console.log(`%c❓ НЕВІДОМА РОЛЬ: ${user.role}`, 'background: #9E9E9E; color: white; padding: 5px; font-weight: bold;');
            }
            
            // 3. Перевірка поточної сторінки
            console.log('');
            console.log('%c🌐 3. ПОТОЧНА СТОРІНКА:', 'color: #2196F3; font-weight: bold; font-size: 14px;');
            console.log(`   URL: ${window.location.pathname}`);
            
            const isDispatcherPage = window.location.pathname.includes('/dispatcher/');
            const isAdminPage = window.location.pathname.includes('/admin/');
            const isClientPage = window.location.pathname.includes('/client/');
            const isTechPage = window.location.pathname.includes('/tech/');
            
            if (isDispatcherPage) {
                console.log('   📍 Тип: Диспетчерська сторінка');
                if (user.role === 'dispatcher' || user.role === 'admin') {
                    console.log('%c   ✅ Доступ дозволено для вашої ролі', 'color: green;');
                } else {
                    console.log('%c   ❌ ДОСТУП ЗАБОРОНЕНО ДЛЯ ВАШОЇ РОЛІ!', 'color: red; font-weight: bold;');
                }
            } else if (isAdminPage) {
                console.log('   📍 Тип: Адміністраторська сторінка');
                if (user.role === 'admin') {
                    console.log('%c   ✅ Доступ дозволено для вашої ролі', 'color: green;');
                } else {
                    console.log('%c   ❌ ДОСТУП ЗАБОРОНЕНО ДЛЯ ВАШОЇ РОЛІ!', 'color: red; font-weight: bold;');
                }
            } else if (isClientPage) {
                console.log('   📍 Тип: Клієнтська сторінка');
            } else if (isTechPage) {
                console.log('   📍 Тип: Сторінка техніка');
            }
            
            // 4. Рекомендації
            console.log('');
            console.log('%c💡 4. РЕКОМЕНДАЦІЇ:', 'color: #2196F3; font-weight: bold; font-size: 14px;');
            
            if (isDispatcherPage && user.role !== 'dispatcher' && user.role !== 'admin') {
                console.log('%c⚠️ ВИ НА НЕПРАВИЛЬНІЙ СТОРІНЦІ!', 'color: red; font-weight: bold;');
                console.log('');
                console.log('Варіанти дій:');
                console.log('1️⃣ Вийдіть (Logout) та увійдіть як диспетчер:');
                console.log('   Email: dispatcher@festlift.pt');
                console.log('   Пароль: dispatcher123');
                console.log('');
                console.log('2️⃣ Перейдіть на вашу панель:');
                if (user.role === 'client') {
                    console.log('   → /pages/client/client.html');
                } else if (user.role === 'tech' || user.role === 'technician') {
                    console.log('   → /pages/tech/technician.html');
                }
            } else {
                console.log('%c✅ Все гаразд! Ви на правильній сторінці.', 'color: green; font-weight: bold;');
            }
            
            // 5. Швидкі дії
            console.log('');
            console.log('%c⚡ 5. ШВИДКІ ДІЇ:', 'color: #2196F3; font-weight: bold; font-size: 14px;');
            console.log('');
            console.log('Вийти з системи:');
            console.log('%clogout()', 'background: #f44336; color: white; padding: 5px; font-family: monospace;');
            console.log('');
            console.log('Очистити localStorage:');
            console.log('%clocalStorage.clear(); location.reload();', 'background: #FF9800; color: white; padding: 5px; font-family: monospace;');
            console.log('');
            
        } catch (error) {
            console.error('%c❌ Помилка парсингу userData:', 'color: red; font-weight: bold;', error);
            console.log('   → Дані пошкоджені. Очистіть localStorage та перелогіньтесь.');
        }
    }
    
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #9E9E9E;');
    console.log('');
}

// Функція для швидкого виходу
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    console.log('%c✅ Ви вийшли з системи', 'color: green; font-weight: bold;');
    console.log('Перенаправлення на логін...');
    setTimeout(() => {
        window.location.href = '/pages/auth/login.html';
    }, 1000);
}

// Автоматичний запуск при завантаженні (тільки якщо увімкнено debug)
if (window.location.search.includes('debug=true')) {
    window.addEventListener('DOMContentLoaded', debugUserRole);
}

console.log('%c💡 Доступні команди:', 'color: #2196F3; font-weight: bold;');
console.log('  debugUserRole() - діагностика ролі');
console.log('  logout()        - вийти з системи');
console.log('');
