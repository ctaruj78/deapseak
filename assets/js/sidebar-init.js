/**
 * 🔧 Sidebar Treeview Initialization
 * Ініціалізує випадаючі меню sidebar після завантаження
 * 
 * КРИТИЧНО: Цей файл повинен завантажуватися ПІСЛЯ sidebar.html
 */

function initSidebarTreeview() {
    console.log('🔧 Initializing sidebar treeview...');
    
    // Ensure jQuery and AdminLTE are loaded
    if (typeof $ === 'undefined') {
        console.error('❌ jQuery not loaded!');
        return;
    }
    
    // Initialize AdminLTE Treeview if available
    if (typeof $.fn.Treeview !== 'undefined') {
        try {
            $('[data-widget="treeview"]').Treeview('init');
            console.log('✅ AdminLTE Treeview initialized');
        } catch (e) {
            console.warn('⚠️ AdminLTE Treeview init failed:', e);
        }
    }
    
    // Manual click handlers for dropdown menus (always works as fallback)
    $('.nav-sidebar .nav-item > a.nav-link').off('click.sidebar').on('click.sidebar', function(e) {
        const $link = $(this);
        const $parent = $link.parent('.nav-item');
        const $submenu = $parent.find('> .nav-treeview');
        
        // Only handle items with submenus
        if ($submenu.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            
            // Close other open submenus
            $('.nav-sidebar .nav-item.menu-open').not($parent).each(function() {
                $(this).removeClass('menu-open');
                $(this).find('> .nav-treeview').slideUp(200);
            });
            
            // Toggle current submenu
            if ($parent.hasClass('menu-open')) {
                $parent.removeClass('menu-open');
                $submenu.slideUp(200);
            } else {
                $parent.addClass('menu-open');
                $submenu.slideDown(200);
            }
        }
    });
    
    // Set active menu item based on current page
    const currentPath = window.location.pathname;
    $('.nav-sidebar a[href]').each(function() {
        const $link = $(this);
        const href = $link.attr('href');
        
        if (href && currentPath.includes(href)) {
            $link.addClass('active');
            
            // Open parent menu if this is a submenu item
            const $submenu = $link.closest('.nav-treeview');
            if ($submenu.length > 0) {
                const $parentItem = $submenu.parent('.nav-item');
                $parentItem.addClass('menu-open');
                $submenu.show();
            }
        }
    });
    
    console.log('✅ Sidebar menu initialized successfully');
}

/**
 * Завантажити sidebar і ініціалізувати після завантаження
 */
function loadSidebarWithInit(sidebarPath = 'includes/sidebar.html') {
    console.log('📂 Loading sidebar from:', sidebarPath);
    
    // Шукаємо контейнер для сайдбару (або #sidebar-placeholder, або .main-sidebar)
    const $container = $("#sidebar-placeholder").length ? $("#sidebar-placeholder") : $(".main-sidebar");
    
    if ($container.length === 0) {
        console.error('❌ Sidebar container not found! Need either #sidebar-placeholder or .main-sidebar');
        return Promise.resolve(); // Завершуємо без помилки
    }
    
    console.log('✅ Found sidebar container:', $container.attr('id') || $container.attr('class'));
    
    return new Promise((resolve, reject) => {
        // Timeout для запобігання зависанню
        const timeoutId = setTimeout(() => {
            console.warn('⚠️ Sidebar load timeout after 5s, continuing anyway...');
            resolve(); // Продовжуємо навіть при timeout
        }, 5000);
        
        $container.load(sidebarPath, function(response, status, xhr) {
            clearTimeout(timeoutId);
            
            if (status === "error") {
                console.error('❌ Sidebar load failed:', xhr.status, xhr.statusText);
                // Не блокуємо завантаження сторінки через помилку sidebar
                resolve();
                return;
            }
            
            console.log('✅ Sidebar HTML loaded');
            
            // Initialize treeview after sidebar is loaded
            setTimeout(function() {
                initSidebarTreeview();
                resolve();
            }, 100);
        });
    });
}

/**
 * Оновлює ім'я користувача в sidebar з localStorage (уникає flash hardcoded імені)
 */
function updateSidebarUserName() {
    try {
        // Пробуємо різні ключі localStorage
        let userData = null;
        const keys = ['liftmanager_user', 'lm_session', 'userData', 'user'];
        for (const key of keys) {
            const raw = localStorage.getItem(key);
            if (raw) {
                try { userData = JSON.parse(raw); } catch (e) { /* skip */ }
                if (userData && (userData.firstName || userData.username || userData.name)) break;
            }
        }

        if (!userData) return;

        const firstName = userData.firstName || '';
        const lastName  = userData.lastName  || '';
        const fullName  = (firstName + ' ' + lastName).trim()
                       || userData.username
                       || userData.name
                       || '';

        if (fullName) {
            const el = document.querySelector('.user-panel .info a');
            if (el) el.textContent = fullName;
        }
    } catch (e) {
        // Мовчазно ігноруємо помилки
    }
}

// Виконуємо відразу + після DOMContentLoaded (на випадок динамічного sidebar)
updateSidebarUserName();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateSidebarUserName);
}

// Export for use in pages
window.initSidebarTreeview = initSidebarTreeview;
window.loadSidebarWithInit = loadSidebarWithInit;
window.updateSidebarUserName = updateSidebarUserName;

// Global logout fallback — used by pages that don't define their own logout()
// Pages with their own logout() function override this automatically
if (typeof window.logout !== 'function') {
    window.logout = function() {
        if (!confirm('Ви впевнені, що хочете вийти з системи?')) return;
        if (typeof AuthManager !== 'undefined') {
            AuthManager.logout();
        } else {
            ['token','liftmanager_jwt','authToken','liftmanager_user','userData','user'].forEach(function(k) {
                localStorage.removeItem(k);
                sessionStorage.removeItem(k);
            });
            document.cookie = 'auth_token=; path=/; max-age=0';
            window.location.replace('/pages/auth/login.html');
        }
    };
}
