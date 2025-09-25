/**
 * QR Scanner Module for LiftMaster Pro
 * Handles QR code scanning functionality
 */

const qrScanner = (function() {
    // Initialize the module
    function init() {
        console.log("QR Scanner initialized");
        // Implementation here
    }

    // Public methods
    return {
        init: init,
        clearHistory: function() { /* implementation */ },
        showQuickAction: function(actionType) { /* implementation */ },
        toggleOfflineMode: function() { /* implementation */ }
    };
})();

// Initialize when document is ready
$(document).ready(function() {
    qrScanner.init();
    
    // Ініціалізація AdminLTE
    $('[data-widget="pushmenu"]').PushMenu();
    $('[data-widget="treeview"]').Treeview('init');
    
    // Проста навігація як резервний варіант
    $('.nav-link:not([href="#"])').on('click', function(e) {
        e.preventDefault();
        const href = $(this).attr('href');
        if (href && href !== '#') {
            window.location.href = href;
        }
    });

    // Обробка деревовидного меню
    $('.nav-treeview .nav-link').on('click', function(e) {
        e.preventDefault();
        const href = $(this).attr('href');
        if (href && href !== '#') {
            window.location.href = href;
        }
    });
});