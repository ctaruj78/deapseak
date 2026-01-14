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
    
    $(".main-sidebar").load(sidebarPath, function(response, status, xhr) {
        if (status === "error") {
            console.error('❌ Sidebar load failed:', xhr.status, xhr.statusText);
            return;
        }
        
        console.log('✅ Sidebar HTML loaded');
        
        // Initialize treeview after sidebar is loaded
        setTimeout(function() {
            initSidebarTreeview();
        }, 100);
    });
}

// Export for use in pages
window.initSidebarTreeview = initSidebarTreeview;
window.loadSidebarWithInit = loadSidebarWithInit;
