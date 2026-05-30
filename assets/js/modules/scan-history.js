/**
 * Scan History Module for LiftMaster Pro
 * Handles scan history functionality with real data from API
 */

const scanHistory = (function() {
    let scansData = [];
    let filteredScans = [];
    let scansTable;

    // Load scans from API
    async function loadScans() {
        try {
            console.log('📊 A carregar histórico de leituras...');

            const token = sessionStorage.getItem('liftmanager_jwt') ||
                          localStorage.getItem('liftmanager_jwt') ||
                          localStorage.getItem('authToken') ||
                          localStorage.getItem('token');

            if (!token) {
                scansData = [];
                filteredScans = [];
                updateStatistics();
                renderScans();
                initializeMap();
                return;
            }

            const response = await fetch('/api/qr/history?limit=500', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`API error ${response.status}`);
            }

            const data = await response.json();
            scansData = data.data || data.scans || [];
            console.log(`✅ Carregado da API: ${scansData.length} leituras`);

            filteredScans = [...scansData];
            updateStatistics();
            renderScans();
            initializeMap();

        } catch (error) {
            console.error('❌ Erro ao carregar histórico:', error);
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

        const todayScans = scansData.filter(s => new Date(s.scannedAt || s.timestamp || s.createdAt) >= today).length;
        const weekScans = scansData.filter(s => new Date(s.scannedAt || s.timestamp || s.createdAt) >= weekAgo).length;
        const monthScans = scansData.filter(s => new Date(s.scannedAt || s.timestamp || s.createdAt) >= monthAgo).length;

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
            // API returns scannedAt, localStorage may use timestamp
            const date = new Date(scan.scannedAt || scan.timestamp || scan.createdAt);
            const dateStr = isNaN(date) ? '—' : date.toLocaleDateString('pt-PT') + ' ' + date.toLocaleTimeString('pt-PT');
            const scanId = scan._id || scan.id || index;

            // Tipo: action field
            const tipoLabel = scan.action === 'maintenance' ? 'Manutenção' :
                              scan.action === 'repair' ? 'Reparação' :
                              scan.action === 'emergency' ? 'Emergência' :
                              scan.action === 'scan' ? 'Leitura' : (scan.action || 'Leitura');

            const row = `
                <tr>
                    <td>${scan.liftId || scan.qrCode || '—'}</td>
                    <td>${tipoLabel}</td>
                    <td>${scan.username || scan.user || 'Sistema'}</td>
                    <td>${dateStr}</td>
                    <td><span class="badge badge-success"><i class="fas fa-check-circle"></i> OK</span></td>
                    <td>${scan.device || '—'}</td>
                    <td>${scan.location || '—'}</td>
                    <td>
                        <button class="btn btn-sm btn-info mr-1" onclick="scanHistory.viewDetails('${scanId}')" title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="scanHistory.deleteScan('${scanId}')" title="Apagar">
                            <i class="fas fa-trash"></i>
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
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt_PT.json'
            },
            order: [[3, 'desc']],
            columnDefs: [{ orderable: false, targets: 7 }]
        });
    }

    // Initialize map with scan locations
    function initializeMap() {
        // If map exists on page
        if ($('#scanMap').length === 0) return;

        // Filter scans with coordinates
        const scansWithCoords = scansData.filter(s => s.latitude && s.longitude);
        
        if (scansWithCoords.length === 0) {
            $('#scanMap').html('<div class="text-center p-4"><i class="fas fa-map-marker-alt fa-3x text-muted mb-3"></i><p>Sem dados de localização de leituras</p></div>');
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
                <strong>${scan.liftId || 'Elevador'}</strong><br>
                ${scan.location || ''}<br>
                <small>${new Date(scan.timestamp).toLocaleString('pt-PT')}</small>
            `);
        });

        // Fit bounds to show all markers
        const bounds = L.latLngBounds(scansWithCoords.map(s => [s.latitude, s.longitude]));
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Delete single scan
    async function deleteScan(scanId) {
        const confirm = await Swal.fire({
            icon: 'warning',
            title: 'Apagar leitura?',
            text: 'Esta ação não pode ser revertida.',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Apagar',
            cancelButtonText: 'Cancelar'
        });
        if (!confirm.isConfirmed) return;

        try {
            const token = sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt');
            const res = await fetch(`/api/qr/history/${scanId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                // Remove from local array
                scansData = scansData.filter(s => (s._id || s.id) != scanId);
                filteredScans = filteredScans.filter(s => (s._id || s.id) != scanId);
                updateStatistics();
                renderScans();
                Swal.fire({ icon: 'success', title: 'Apagado', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Erro', text: data.message || 'Não foi possível apagar.' });
            }
        } catch (err) {
            console.error('Erro ao apagar leitura:', err);
            Swal.fire({ icon: 'error', title: 'Erro', text: 'Falha de ligação ao servidor.' });
        }
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
            'Data': new Date(scan.timestamp).toLocaleString('pt-PT'),
            'Elevador': scan.liftId || 'N/A',
            'Localização': scan.location || 'Desconhecido',
            'Utilizador': scan.user || 'Sistema',
            'Estado': scan.status
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico de leituras');
        XLSX.writeFile(workbook, `scan-history-${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    // Clear history
    async function clearHistory() {
        if (!confirm('Tem a certeza que pretende limpar todo o histórico de digitalizações?')) return;

        try {
            const token = localStorage.getItem('liftmanager_jwt') ||
                          sessionStorage.getItem('liftmanager_jwt') ||
                          localStorage.getItem('token');

            const res = await fetch('/api/qr/history', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Não foi possível limpar o histórico no servidor.');
            }

            scansData = [];
            filteredScans = [];
            updateStatistics();
            renderScans();
            initializeMap();

            showNotification('Histórico de leituras limpo', 'success');
        } catch (err) {
            console.error('Erro ao limpar histórico:', err);
            showNotification(err.message || 'Falha ao limpar histórico', 'error');
        }
    }

    // View scan details
    function viewDetails(scanId) {
        const scan = scansData.find(s => s.id === scanId) || scansData[scanId];
        if (!scan) return;

        const html = `
            <div class="scan-details">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Data e hora:</strong> ${new Date(scan.timestamp).toLocaleString('pt-PT')}</p>
                        <p><strong>Elevador ID:</strong> ${scan.liftId || 'N/A'}</p>
                        <p><strong>Código QR:</strong> ${scan.qrCode || 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Localização:</strong> ${scan.location || 'Desconhecido'}</p>
                        <p><strong>Utilizador:</strong> ${scan.user || 'Sistema'}</p>
                        <p><strong>Estado:</strong> <span class="badge badge-${scan.status === 'success' ? 'success' : 'danger'}">${scan.status}</span></p>
                    </div>
                </div>
                ${scan.notes ? `<hr><p><strong>Notas:</strong> ${scan.notes}</p>` : ''}
                ${scan.latitude && scan.longitude ? `<hr><p><strong>Coordenadas:</strong> ${scan.latitude}, ${scan.longitude}</p>` : ''}
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
        console.log('🚀 Inicialização do módulo de histórico de leituras...');
        loadScans();

        // Setup event listeners
        $('#searchBtn').on('click', searchScans);
        $('#searchInput').on('input', debounce(searchScans, 300)); // Pesquisa automática ao digitar
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
                    applyLabel: 'Aplicar',
                    cancelLabel: 'Cancelar'
                }
            });
        }
    }

    // Função debounce para atrasar a pesquisa
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
        viewDetails: viewDetails,
        deleteScan: deleteScan
    };
})();

// Initialize when document is ready
$(document).ready(function() {
    if ($('#scansTable').length) {
        scanHistory.init();
    }
});