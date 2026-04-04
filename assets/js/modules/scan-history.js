/**
 * Scan History Module for LiftMaster Pro
 * Handles scan history functionality with real data from localStorage/API
 */

const scanHistory = (function() {
    let scansData = [];
    let filteredScans = [];
    let scansTable;

    // Load scans from localStorage/API
    async function loadScans() {
        try {
            console.log('📊 Завантаження історії сканувань...');

            // Try localStorage first
            const localScans = JSON.parse(localStorage.getItem('qr_scan_history') || '[]');
            
            if (localScans.length > 0) {
                console.log(`✅ Завантажено з localStorage: ${localScans.length} сканувань`);
                scansData = localScans;
            } else {
                // Try API
                const token = localStorage.getItem('liftmanager_jwt') ||
                              sessionStorage.getItem('liftmanager_jwt') ||
                              localStorage.getItem('token');
                if (token) {
                    const response = await fetch('/api/qr/history', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        scansData = data.data || data.scans || [];
                        console.log(`✅ Завантажено з API: ${scansData.length} сканувань`);
                    }
                }
            }

            filteredScans = [...scansData];
            updateStatistics();
            renderScans();
            initializeMap();

        } catch (error) {
            console.error('❌ Помилка завантаження історії:', error);
            scansData = [];
            filteredScans = [];
        }
    }

    // Update statistics
    function updateStatistics() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const todayScans = scansData.filter(s => new Date(s.timestamp) >= today).length;
        const weekScans = scansData.filter(s => new Date(s.timestamp) >= weekAgo).length;
        const monthScans = scansData.filter(s => new Date(s.timestamp) >= monthAgo).length;

        $('#totalScans').text(scansData.length.toLocaleString());
        $('#todayScans').text(todayScans);
        $('#weekScans').text(weekScans);
        $('#monthScans').text(monthScans);
    }

    // Render scans table
    function renderScans() {
        if (scansTable) {
            scansTable.destroy();
        }

        const tbody = $('#scansTable tbody');
        tbody.empty();

        filteredScans.forEach((scan, index) => {
            const date = new Date(scan.timestamp);
            const statusClass = scan.status === 'success' ? 'success' : 
                              scan.status === 'warning' ? 'warning' : 'danger';
            const statusIcon = scan.status === 'success' ? 'check-circle' : 
                             scan.status === 'warning' ? 'exclamation-triangle' : 'times-circle';

            const row = `
                <tr>
                    <td>${index + 1}</td>
                    <td>${date.toLocaleDateString('uk-UA')} ${date.toLocaleTimeString('uk-UA')}</td>
                    <td>${scan.liftId || scan.qrCode || 'N/A'}</td>
                    <td>${scan.location || 'Невідомо'}</td>
                    <td>${scan.user || 'Система'}</td>
                    <td><span class="badge badge-${statusClass}"><i class="fas fa-${statusIcon}"></i> ${scan.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="scanHistory.viewDetails('${scan.id || index}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // Initialize DataTable
        scansTable = $('#scansTable').DataTable({
            responsive: true,
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/uk.json'
            },
            order: [[1, 'desc']]
        });
    }

    // Initialize map with scan locations
    function initializeMap() {
        // If map exists on page
        if ($('#scanMap').length === 0) return;

        // Filter scans with coordinates
        const scansWithCoords = scansData.filter(s => s.latitude && s.longitude);
        
        if (scansWithCoords.length === 0) {
            $('#scanMap').html('<div class="text-center p-4"><i class="fas fa-map-marker-alt fa-3x text-muted mb-3"></i><p>Немає даних про локацію сканувань</p></div>');
            return;
        }

        // Initialize Leaflet map
        const map = L.map('scanMap').setView([38.7167, -9.1395], 11); // Lisboa center

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add markers
        scansWithCoords.forEach(scan => {
            const marker = L.marker([scan.latitude, scan.longitude]).addTo(map);
            marker.bindPopup(`
                <strong>${scan.liftId || 'Ліфт'}</strong><br>
                ${scan.location || ''}<br>
                <small>${new Date(scan.timestamp).toLocaleString('uk-UA')}</small>
            `);
        });

        // Fit bounds to show all markers
        const bounds = L.latLngBounds(scansWithCoords.map(s => [s.latitude, s.longitude]));
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Search and filter
    function searchScans() {
        const dateRange = $('#dateRange').val();
        const status = $('#statusFilter').val();
        const liftId = $('#liftFilter').val();
        const searchText = $('#searchInput').val().toLowerCase();

        filteredScans = scansData.filter(scan => {
            // Date filter
            if (dateRange) {
                const [start, end] = dateRange.split(' - ');
                const scanDate = new Date(scan.timestamp);
                if (scanDate < new Date(start) || scanDate > new Date(end)) return false;
            }

            // Status filter
            if (status && scan.status !== status) return false;

            // Lift filter
            if (liftId && scan.liftId !== liftId) return false;

            // Text search
            if (searchText) {
                const searchableText = (
                    (scan.liftId || '') + 
                    (scan.location || '') + 
                    (scan.user || '')
                ).toLowerCase();
                if (!searchableText.includes(searchText)) return false;
            }

            return true;
        });

        updateStatistics();
        renderScans();
    }

    // Reset filters
    function resetFilters() {
        $('#dateRange').val('');
        $('#statusFilter').val('');
        $('#liftFilter').val('');
        $('#searchInput').val('');
        filteredScans = [...scansData];
        updateStatistics();
        renderScans();
    }

    // Export to Excel
    function exportToExcel() {
        const data = filteredScans.map((scan, i) => ({
            '№': i + 1,
            'Дата': new Date(scan.timestamp).toLocaleString('uk-UA'),
            'Ліфт': scan.liftId || 'N/A',
            'Локація': scan.location || 'Невідомо',
            'Користувач': scan.user || 'Система',
            'Статус': scan.status
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Історія сканувань');
        XLSX.writeFile(workbook, `scan-history-${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    // Clear history
    function clearHistory() {
        if (!confirm('Ви впевнені що хочете очистити всю історію сканувань?')) return;

        localStorage.removeItem('qr_scan_history');
        scansData = [];
        filteredScans = [];
        updateStatistics();
        renderScans();
        
        showNotification('Історію сканувань очищено', 'success');
    }

    // View scan details
    function viewDetails(scanId) {
        const scan = scansData.find(s => s.id === scanId) || scansData[scanId];
        if (!scan) return;

        const html = `
            <div class="scan-details">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Дата і час:</strong> ${new Date(scan.timestamp).toLocaleString('uk-UA')}</p>
                        <p><strong>Ліфт ID:</strong> ${scan.liftId || 'N/A'}</p>
                        <p><strong>QR-код:</strong> ${scan.qrCode || 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Локація:</strong> ${scan.location || 'Невідомо'}</p>
                        <p><strong>Користувач:</strong> ${scan.user || 'Система'}</p>
                        <p><strong>Статус:</strong> <span class="badge badge-${scan.status === 'success' ? 'success' : 'danger'}">${scan.status}</span></p>
                    </div>
                </div>
                ${scan.notes ? `<hr><p><strong>Примітки:</strong> ${scan.notes}</p>` : ''}
                ${scan.latitude && scan.longitude ? `<hr><p><strong>Координати:</strong> ${scan.latitude}, ${scan.longitude}</p>` : ''}
            </div>
        `;

        $('#scanDetailsContent').html(html);
        $('#scanDetailsModal').modal('show');
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        Toast.fire({
            icon: type,
            title: message
        });
    }

    // Initialize the module
    function init() {
        console.log('🚀 Ініціалізація модуля історії сканувань...');
        loadScans();

        // Setup event listeners
        $('#searchBtn').on('click', searchScans);
        $('#searchInput').on('input', debounce(searchScans, 300)); // Автопошук при введенні
        $('#searchInput').on('keypress', function(e) {
            if (e.which === 13) { // Enter
                e.preventDefault();
                searchScans();
            }
        });
        $('#resetBtn').on('click', resetFilters);
        $('#exportBtn').on('click', exportToExcel);
        $('#clearHistoryBtn').on('click', clearHistory);

        // Date range picker
        if ($('#dateRange').length) {
            $('#dateRange').daterangepicker({
                locale: {
                    format: 'DD.MM.YYYY',
                    applyLabel: 'Застосувати',
                    cancelLabel: 'Скасувати'
                }
            });
        }
    }

    // Debounce функція для затримки пошуку
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Public methods
    return {
        init: init,
        searchScans: searchScans,
        resetFilters: resetFilters,
        exportToExcel: exportToExcel,
        clearHistory: clearHistory,
        viewDetails: viewDetails
    };
})();

// Initialize when document is ready
$(document).ready(function() {
    if ($('#scansTable').length) {
        scanHistory.init();
    }
});