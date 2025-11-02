// Unified Admin Menu Loader
// Завантажує уніфіковане меню для всіх admin сторінок

class AdminMenuLoader {
    static menuContainer = null;
    static menuData = null;

    // HTML шаблон меню (інлайн для уникнення проблем з fetch)
    static menuHTML = `
<!-- Sidebar Menu -->
<ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
    <li class="nav-item">
        <a href="admin-dashboard.html" class="nav-link" id="nav-dashboard">
            <i class="nav-icon fas fa-tachometer-alt"></i>
            <p>Дашборд</p>
        </a>
    </li>

    <!-- QR System Menu -->
    <li class="nav-item">
        <a href="#" class="nav-link" id="nav-qr-system">
            <i class="nav-icon fas fa-qrcode"></i>
            <p>
                QR Система
                <i class="right fas fa-angle-left"></i>
            </p>
        </a>
        <ul class="nav nav-treeview">
            <li class="nav-item">
                <a href="qr-generator.html" class="nav-link" id="nav-qr-generator">
                    <i class="fas fa-plus-circle nav-icon"></i>
                    <p>Генератор QR-кодів</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="qr-management.html" class="nav-link" id="nav-qr-management">
                    <i class="fas fa-cog nav-icon"></i>
                    <p>Керування QR-кодами</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="unified-analytics.html#qr-analytics" class="nav-link" id="nav-qr-analytics">
                    <i class="fas fa-chart-line nav-icon"></i>
                    <p>Аналітика QR-кодів</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="qr-history.html" class="nav-link" id="nav-qr-history">
                    <i class="fas fa-history nav-icon"></i>
                    <p>Історія сканувань</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="qr-batch.html" class="nav-link" id="nav-qr-batch">
                    <i class="fas fa-layer-group nav-icon"></i>
                    <p>Пакетне керування</p>
                </a>
            </li>
        </ul>
    </li>

    <!-- Lifts Menu -->
    <li class="nav-item">
        <a href="#" class="nav-link" id="nav-lifts">
            <i class="nav-icon fas fa-elevator"></i>
            <p>
                Ліфти
                <i class="right fas fa-angle-left"></i>
            </p>
        </a>
        <ul class="nav nav-treeview">
            <li class="nav-item">
                <a href="lifts.html" class="nav-link" id="nav-lifts-management">
                    <i class="fas fa-list nav-icon"></i>
                    <p>Управління ліфтами</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="maps.html" class="nav-link" id="nav-lifts-map">
                    <i class="fas fa-map-marked-alt nav-icon"></i>
                    <p>Мапа ліфтів</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="requests.html" class="nav-link" id="nav-lifts-requests">
                    <i class="fas fa-clipboard-list nav-icon"></i>
                    <p>Заявки на обслуговування</p>
                </a>
            </li>
        </ul>
    </li>

    <li class="nav-item">
        <a href="users.html" class="nav-link" id="nav-users">
            <i class="nav-icon fas fa-users"></i>
            <p>Користувачі</p>
        </a>
    </li>

    <!-- Reports & Analytics Menu -->
    <li class="nav-item">
        <a href="#" class="nav-link" id="nav-reports-analytics">
            <i class="nav-icon fas fa-chart-bar"></i>
            <p>
                Звіти та Аналітика
                <i class="right fas fa-angle-left"></i>
            </p>
        </a>
        <ul class="nav nav-treeview">
            <li class="nav-item">
                <a href="reports.html" class="nav-link" id="nav-reports">
                    <i class="fas fa-file-alt nav-icon"></i>
                    <p>Звіти</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="unified-analytics.html" class="nav-link" id="nav-analytics">
                    <i class="fas fa-chart-line nav-icon"></i>
                    <p>Аналітика</p>
                </a>
            </li>
        </ul>
    </li>

    <!-- Support Menu -->
    <li class="nav-item">
        <a href="#" class="nav-link" id="nav-support">
            <i class="nav-icon fas fa-headset"></i>
            <p>
                Підтримка
                <i class="right fas fa-angle-left"></i>
            </p>
        </a>
        <ul class="nav nav-treeview">
            <li class="nav-item">
                <a href="support.html" class="nav-link" id="nav-support-tickets">
                    <i class="fas fa-ticket-alt nav-icon"></i>
                    <p>Запити підтримки</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="notifications.html" class="nav-link" id="nav-notifications">
                    <i class="fas fa-bell nav-icon"></i>
                    <p>Сповіщення</p>
                </a>
            </li>
        </ul>
    </li>

    <li class="nav-item">
        <a href="settings.html" class="nav-link" id="nav-settings">
            <i class="nav-icon fas fa-cog"></i>
            <p>Налаштування</p>
        </a>
    </li>

    <li class="nav-item">
        <a href="../ai-assistant/ai-assistant.html" class="nav-link" id="nav-ai-assistant">
            <i class="nav-icon fas fa-robot"></i>
            <p>AI Асистент</p>
        </a>
    </li>

    <li class="nav-item">
        <a href="profile.html" class="nav-link" id="nav-profile">
            <i class="nav-icon fas fa-user"></i>
            <p>Профіль</p>
        </a>
    </li>

    <li class="nav-item">
        <a href="#" class="nav-link" id="nav-logout" onclick="logout()">
            <i class="nav-icon fas fa-sign-out-alt"></i>
            <p>Вийти</p>
        </a>
    </li>
</ul>
`;

    // Ініціалізація меню - статичний метод
    static init(pageName = null) {
        try {
            // logger.log('� Ініціалізація AdminMenuLoader для сторінки:', pageName);

            // Знаходимо контейнер для меню
            this.menuContainer = document.getElementById('sidebar-menu-container');
            if (!this.menuContainer) {
                // logger.error('❌ Menu container #sidebar-menu-container not found');
                return false;
            }

            // logger.log('✅ Знайдено контейнер меню');

            // Використовуємо інлайн HTML замість fetch
            this.menuData = this.menuHTML;

            // Вставляємо меню в DOM
            this.insertMenu();

            // Налаштовуємо активний пункт меню
            this.setActiveMenuItem(pageName);

            // logger.log('✅ Меню успішно завантажено та ініціалізовано');
            return true;

        } catch (error) {
            // logger.error('❌ Помилка ініціалізації admin menu:', error);
            return false;
        }
    }

    // Завантажуємо HTML меню (зарезервовано для майбутнього використання)
    static async loadMenu() {
        // Цей метод більше не використовується, але залишається для сумісності
        // logger.log('📝 Використовується інлайн HTML меню');
        return this.menuHTML;
    }

    // Вставляємо меню в DOM
    static insertMenu() {
        if (this.menuContainer && this.menuData) {
            this.menuContainer.innerHTML = this.menuData;
            // logger.log('✅ Меню вставлено в DOM');
            
            // Ініціалізуємо treeview після вставки меню
            setTimeout(() => {
                this.initTreeview();
            }, 50);
        } else {
            // logger.error('❌ Не вдалося вставити меню - контейнер або дані відсутні');
        }
    }

    // Ініціалізація AdminLTE treeview
    static initTreeview() {
        // Відключаємо AdminLTE treeview і використовуємо тільки наш fallback
        // logger.log('🔧 Використовуємо власну treeview ініціалізацію');
        this.initTreeviewFallback();
    }

    // Fallback ініціалізація treeview
    static initTreeviewFallback() {
        try {
            // Знаходимо всі елементи treeview
            const treeviewItems = document.querySelectorAll('[data-widget="treeview"] .nav-treeview');
            
            treeviewItems.forEach(item => {
                // Приховуємо підменю тільки якщо воно не має активних елементів
                const hasActiveItems = item.querySelector('.nav-link.active');
                if (!hasActiveItems) {
                    item.style.display = 'none';
                } else {
                    item.style.display = 'block';
                }
            });
            
            // Додаємо обробники кліків тільки для батьківських елементів меню (з href="#")
            const treeviewLinks = document.querySelectorAll('[data-widget="treeview"] > .nav-item > .nav-link[href="#"]');
            
            treeviewLinks.forEach(link => {
                // Перевіряємо, чи вже додано обробник
                if (!link.hasAttribute('data-treeview-handler')) {
                    link.setAttribute('data-treeview-handler', 'true');
                    
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        
                        const parentItem = this.parentElement;
                        const submenu = parentItem.querySelector('.nav-treeview');
                        
                        if (submenu) {
                            const isVisible = submenu.style.display === 'block';
                            submenu.style.display = isVisible ? 'none' : 'block';
                            
                            // Змінюємо іконку - вниз коли розкрито, вліво коли закрито
                            const icon = this.querySelector('.right i');
                            if (icon) {
                                icon.className = isVisible ? 'fas fa-angle-down right' : 'fas fa-angle-left right';
                                // Додаємо анімацію повороту
                                icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(0deg)';
                            }
                        }
                    });
                }
            });
            
            // logger.log('✅ Fallback Treeview ініціалізовано');
        } catch (error) {
            // logger.error('❌ Помилка fallback ініціалізації Treeview:', error);
        }
    }

    // Налаштовуємо активний пункт меню
    static setActiveMenuItem(pageName = null) {
        const currentPage = pageName ? pageName.replace('.html', '') : window.location.pathname.split('/').pop().replace('.html', '');
        // logger.log('🎯 Налаштування активного пункту для сторінки:', currentPage);

        // Мапінг сторінок до ID елементів меню
        const activeMappings = {
            'admin-dashboard': 'nav-dashboard',
            'maps': 'nav-lifts-map',
            'lifts': 'nav-lifts-management',
            'requests': 'nav-lifts-requests',
            'users': 'nav-users',
            'unified-analytics': 'nav-analytics',
            'reports': 'nav-reports',
            'notifications': 'nav-notifications',
            'support': 'nav-support-tickets',
            'profile': 'nav-profile',
            'settings': 'nav-settings',
            'qr-generator': 'nav-qr-generator',
            'qr-management': 'nav-qr-management',
            'qr-history': 'nav-qr-history',
            'qr-batch': 'nav-qr-batch',
            'predictive-maintenance': 'nav-predictive-maintenance'
        };

        const activeId = activeMappings[currentPage];
        if (activeId) {
            // Використовуємо setTimeout щоб дочекатися вставки меню в DOM
            setTimeout(() => {
                const activeElement = document.getElementById(activeId);
                if (activeElement) {
                    activeElement.classList.add('active');
                    // logger.log('✅ Активний пункт меню встановлено:', activeId);

                    // Розкриваємо батьківське меню якщо це підменю
                    const parentMenu = activeElement.closest('.nav-treeview');
                    if (parentMenu) {
                        parentMenu.style.display = 'block';
                        const parentLink = parentMenu.previousElementSibling;
                        if (parentLink) {
                            parentLink.classList.add('active');
                        }
                    }
                } else {
                    // logger.warn('⚠️ Елемент меню не знайдено:', activeId);
                }
            }, 100);
        } else {
            // logger.warn('⚠️ Немає мапінгу для сторінки:', currentPage);
        }
    }
}

// Функція logout
function logout() {
    if (confirm('Ви дійсно хочете вийти?')) {
        localStorage.removeItem('lm_session');
        window.location.href = '../../login.html';
    }
}