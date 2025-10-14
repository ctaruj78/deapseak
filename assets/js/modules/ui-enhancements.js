// UI Enhancements Module
// Toast notifications, loading states, dark mode, etc.

class UIEnhancements {
    constructor() {
        this.init();
    }

    init() {
        this.createToastContainer();
        this.initDarkMode();
        this.initLoadingStates();
        this.initResponsiveTables();
        this.initDashboardWidgets();
    }

    // Toast Notifications
    createToastContainer() {
        if (!document.querySelector('.toast-container')) {
            const container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }

    showToast(message, type = 'info', title = '', duration = 5000) {
        const container = document.querySelector('.toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconClass = this.getToastIcon(type);

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.classList.remove('show');
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }

        return toast;
    }

    getToastIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Loading States
    setLoadingState(button, loading = true) {
        if (loading) {
            button.classList.add('btn-loading');
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
            }
        }
    }

    // Dark Mode
    initDarkMode() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
        }

        // Add toggle to settings if exists
        this.addDarkModeToggle();
    }

    toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark);

        this.showToast(
            isDark ? 'Темна тема увімкнена' : 'Світла тема увімкнена',
            'info',
            'Зміна теми'
        );
    }

    addDarkModeToggle() {
        // Add to general settings if exists
        const generalTab = document.getElementById('general');
        if (generalTab) {
            const form = generalTab.querySelector('form');
            if (form) {
                const darkModeDiv = document.createElement('div');
                darkModeDiv.className = 'form-group';
                darkModeDiv.innerHTML = `
                    <div class="custom-control custom-switch">
                        <input type="checkbox" class="custom-control-input" id="darkModeToggle">
                        <label class="custom-control-label" for="darkModeToggle">
                            <i class="fas fa-moon mr-1"></i> Темна тема
                        </label>
                    </div>
                    <small class="form-text text-muted">Змінити колірну схему інтерфейсу</small>
                `;

                form.appendChild(darkModeDiv);

                const toggle = document.getElementById('darkModeToggle');
                toggle.checked = document.body.classList.contains('dark-mode');
                toggle.addEventListener('change', () => this.toggleDarkMode());
            }
        }
    }

    // Responsive Tables
    initResponsiveTables() {
        // Tables are already responsive with Bootstrap classes
        // This could be enhanced with mobile-specific features
        this.addTableControls();
    }

    addTableControls() {
        // Add export/print controls to tables
        const tables = document.querySelectorAll('.table-responsive .table');
        tables.forEach(table => {
            if (!table.dataset.controlsAdded) {
                const wrapper = table.closest('.table-responsive');
                const controls = document.createElement('div');
                controls.className = 'table-controls mb-2';
                controls.innerHTML = `
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" onclick="window.print()">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="exportTableToCSV(this)">
                            <i class="fas fa-download"></i> CSV
                        </button>
                    </div>
                `;
                wrapper.insertBefore(controls, wrapper.firstChild);
                table.dataset.controlsAdded = 'true';
            }
        });
    }

    // Dashboard Widgets
    initDashboardWidgets() {
        const widgets = document.querySelectorAll('.widget');
        if (widgets.length === 0) return;

        widgets.forEach(widget => {
            this.makeDraggable(widget);
            this.addResizeHandle(widget);
        });
    }

    makeDraggable(widget) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        widget.addEventListener('mousedown', startDrag);
        widget.addEventListener('touchstart', startDrag, { passive: false });

        function startDrag(e) {
            if (e.target.closest('.widget-controls') || e.target.classList.contains('widget-resize-handle')) {
                return;
            }

            isDragging = true;
            widget.classList.add('dragging');

            const rect = widget.getBoundingClientRect();
            startX = e.clientX || e.touches[0].clientX;
            startY = e.clientY || e.touches[0].clientY;
            startLeft = rect.left;
            startTop = rect.top;

            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchend', endDrag);

            e.preventDefault();
        }

        function drag(e) {
            if (!isDragging) return;

            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;

            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            widget.style.position = 'absolute';
            widget.style.left = (startLeft + deltaX) + 'px';
            widget.style.top = (startTop + deltaY) + 'px';
            widget.style.zIndex = '1000';
        }

        function endDrag() {
            if (!isDragging) return;

            isDragging = false;
            widget.classList.remove('dragging');
            widget.style.zIndex = '';

            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchend', endDrag);
        }
    }

    addResizeHandle(widget) {
        const handle = document.createElement('div');
        handle.className = 'widget-resize-handle';
        widget.style.position = 'relative';
        widget.appendChild(handle);

        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        handle.addEventListener('mousedown', startResize);
        handle.addEventListener('touchstart', startResize, { passive: false });

        function startResize(e) {
            isResizing = true;
            startX = e.clientX || e.touches[0].clientX;
            startY = e.clientY || e.touches[0].clientY;
            startWidth = widget.offsetWidth;
            startHeight = widget.offsetHeight;

            document.addEventListener('mousemove', resize);
            document.addEventListener('touchmove', resize, { passive: false });
            document.addEventListener('mouseup', endResize);
            document.addEventListener('touchend', endResize);

            e.preventDefault();
            e.stopPropagation();
        }

        function resize(e) {
            if (!isResizing) return;

            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;

            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            const newWidth = Math.max(200, startWidth + deltaX);
            const newHeight = Math.max(100, startHeight + deltaY);

            widget.style.width = newWidth + 'px';
            widget.style.height = newHeight + 'px';
        }

        function endResize() {
            isResizing = false;

            document.removeEventListener('mousemove', resize);
            document.removeEventListener('touchmove', resize);
            document.removeEventListener('mouseup', endResize);
            document.removeEventListener('touchend', endResize);
        }
    }
}

// Global functions for easy access
function showToast(message, type = 'info', title = '', duration = 5000) {
    if (window.uiEnhancements) {
        return window.uiEnhancements.showToast(message, type, title, duration);
    }
}

function setLoadingState(button, loading = true) {
    if (window.uiEnhancements) {
        window.uiEnhancements.setLoadingState(button, loading);
    }
}

function toggleDarkMode() {
    if (window.uiEnhancements) {
        window.uiEnhancements.toggleDarkMode();
    }
}

function exportTableToCSV(button) {
    const table = button.closest('.table-responsive').querySelector('table');
    if (!table) return;

    let csv = [];
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        cells.forEach(cell => {
            rowData.push('"' + cell.textContent.replace(/"/g, '""') + '"');
        });
        csv.push(rowData.join(','));
    });

    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'table-export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showToast('Таблиця експортована в CSV', 'success', 'Експорт');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.uiEnhancements = new UIEnhancements();
});