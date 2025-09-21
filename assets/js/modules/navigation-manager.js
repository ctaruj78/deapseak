(function(window, $){
    window.NavigationManager = {
        openModal: function(modalId) {
            if ($(modalId).length) {
                $(modalId).modal('show');
                $(modalId).attr('aria-modal', 'true').attr('role', 'dialog');
                $(modalId).find('input, button, a, select, textarea').first().focus();
            }
        },
        closeModal: function(modalId) {
            if ($(modalId).length) {
                $(modalId).modal('hide');
            }
        },
        navigate: function(href) {
            if (href && href !== '#') {
                window.location.href = href;
            }
        },
        // Доступність: фокусування на перший елемент
        focusFirst: function(modalId) {
            if ($(modalId).length) {
                $(modalId).find('input, button, a, select, textarea').first().focus();
            }
        }
    };
    // Глобальні обробники для всіх модальних
    $(document).on('click', '[data-toggle="modal"]', function(e){
        e.preventDefault();
        var target = $(this).data('target');
        window.NavigationManager.openModal(target);
    });
    $(document).on('click', '[data-dismiss="modal"]', function(e){
        e.preventDefault();
        var modal = $(this).closest('.modal');
        window.NavigationManager.closeModal('#'+modal.attr('id'));
    });
    // Глобальні переходи по посиланнях
    $(document).on('click', 'a[href]:not([href="#"]):not([data-toggle="modal"])', function(e){
        e.preventDefault();
        window.NavigationManager.navigate($(this).attr('href'));
    });
})(window, jQuery);
(function(window, $){
    window.NavigationManager = {
        openModal: function(modalId) {
            if ($(modalId).length) {
                $(modalId).modal('show');
                $(modalId).attr('aria-modal', 'true').attr('role', 'dialog');
                $(modalId).find('input, button, a, select, textarea').first().focus();
            }
        },
        closeModal: function(modalId) {
            if ($(modalId).length) {
                $(modalId).modal('hide');
            }
        },
        navigate: function(href) {
            if (href && href !== '#') {
                window.location.href = href;
            }
        },
        // Доступність: фокусування на перший елемент
        focusFirst: function(modalId) {
            if ($(modalId).length) {
                $(modalId).find('input, button, a, select, textarea').first().focus();
            }
        }
    };
    // Глобальні обробники для всіх модальних
    $(document).on('click', '[data-toggle="modal"]', function(e){
        e.preventDefault();
        var target = $(this).data('target');
        window.NavigationManager.openModal(target);
    });
    $(document).on('click', '[data-dismiss="modal"]', function(e){
        e.preventDefault();
        var modal = $(this).closest('.modal');
        window.NavigationManager.closeModal('#'+modal.attr('id'));
    });
    // Глобальні переходи по посиланнях
    $(document).on('click', 'a[href]:not([href="#"]):not([data-toggle="modal"])', function(e){
        e.preventDefault();
        window.NavigationManager.navigate($(this).attr('href'));
    });
})(window, jQuery);