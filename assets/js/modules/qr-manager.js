/**
 * QR Manager Module for LiftMaster Pro
 * Handles all QR code management functionality
 */

const qrManager = (function() {
    'use strict';

    // State
    let currentQRs = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentFilters = {
        status: 'all',
        city: '',
        search: ''
    };
    // View mode: 'list' | 'grid'
    let currentView = localStorage.getItem('qrManagerView') || 'list';
    let currentGridCols = parseInt(localStorage.getItem('qrManagerGridCols') || '3', 10);

    // Initialize
    function init() {
        console.log('✅ QR Manager initialized');
        loadInitialData();
        setupEventListeners();
        applyViewToggleState();
        renderQRTable();
        updateStatistics();
    }

    // Apply active state to view toggle buttons
    function applyViewToggleState() {
        $('#listViewBtn').toggleClass('active btn-secondary', currentView === 'list').toggleClass('btn-outline-secondary', currentView !== 'list');
        $('#gridViewBtn').toggleClass('active btn-secondary', currentView === 'grid').toggleClass('btn-outline-secondary', currentView !== 'grid');
        if ($('#gridColsSelector').length) {
            $('#gridColsSelector').val(String(currentGridCols));
        }
        if (currentView === 'grid') {
            $('#gridColsSelectorWrapper').show();
            $('#qrListTitle').text('Сітка QR-кодів');
        } else {
            $('#gridColsSelectorWrapper').hide();
            $('#qrListTitle').text('Список QR-кодів');
        }
    }

    // Load data from API
    async function loadInitialData() {
        console.log('🔄 A carregar даних з API...');
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('⚠️ No auth token found');
                currentQRs = [];
                renderQRTable();
                updateStatistics();
                return;
            }

            // Fetch з timeout (15 секунд max)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch('/api/lifts', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const lifts = data.data || data;

            // Convert lifts to QR codes
            currentQRs = lifts.map(lift => {
                // Handle address - can be string or object
                let addressText = 'Без адреси';
                if (typeof lift.address === 'string') {
                    addressText = lift.address;
                } else if (lift.address && typeof lift.address === 'object') {
                    // Якщо address - об'єкт, з'єднуємо поля
                    addressText = [
                        lift.address.street,
                        lift.address.building,
                        lift.address.city,
                        lift.address.postalCode
                    ].filter(Boolean).join(', ') || 'Без адреси';
                }

                return {
                    id: lift._id,
                    code: lift.qrCode
                        ? (typeof lift.qrCode === 'object' ? lift.qrCode.code : lift.qrCode)
                        : `LIFT-${lift.municipalNumber || lift._id.slice(-6).toUpperCase()}`,
                    name: addressText,
                    type: 'lift',
                    liftType: lift.type || 'passenger',
                    status: lift.status === 'operational' ? 'active' : 'inactive',
                    location: (lift.address?.city && lift.address.city !== lift.address?.street)
                        ? lift.address.city
                        : (lift.municipality?.name || lift.address?.zipCode || 'Невідоме місто'),
                    created: lift.installationDate || lift.createdAt,
                    scans: 0,
                    liftData: lift
                };
            });

            console.log(`✅ Завантажено ліфтів: ${currentQRs.length}`);
            console.log(`✅ Згенеровано QR-кодів: ${currentQRs.length}`);
            
            renderQRTable();
            updateStatistics();

        } catch (error) {
            console.error('❌ Error loading lifts:', error);
            
            // Показуємо помилку користувачу
            if (error.name === 'AbortError') {
                console.error('⏱️ Timeout: завантаження триває понад 15 секунд');
                alert('A carregar даних займає занадто багато часу.\nПеревірте з\'єднання з інтернетом та спробуйте оновити сторінку (F5).');
            } else {
                console.error('🔥 Erro:', error.message);
            }
            
            currentQRs = [];
            // ВАЖЛИВО: завжди викликаємо render навіть при помилці
            renderQRTable();
            updateStatistics();
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        console.log('🔗 Definições event listeners...');
        
        // Перевірка чи елементи існують
        if (!$('#searchInput').length) {
            console.warn('⚠️ searchInput not found in DOM');
        }
        
        // Export button (тільки Excel залишився)
        $('#exportCSVBtn').on('click', () => exportToCSV());
        
        // Print selected button
        $('#printSelectedBtn').on('click', () => printSelected());

        // Search - підтримка input, Enter та кнопки
        $('#searchInput').on('input', debounce(function() {
            console.log('📝 Input event triggered');
            searchQR();
        }, 300));
        
        $('#searchInput').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                console.log('⌨️ Enter pressed');
                e.preventDefault();
                searchQR();
            }
        });

        // Filters
        $('#statusFilter').on('change', applyFilters);
        $('#cityFilter').on('input', debounce(applyFilters, 300));

        // Grid columns selector
        $(document).on('change', '#gridColsSelector', function() {
            currentGridCols = parseInt($(this).val(), 10);
            localStorage.setItem('qrManagerGridCols', currentGridCols);
            if (currentView === 'grid') renderQRTable();
        });
        
        console.log('✅ Event listeners встановлено');
    }

    // Render dispatcher - routes to list or grid
    function renderQRTable() {
        if (currentView === 'grid') {
            renderGridView();
        } else {
            renderListView();
        }
        // Update count display
        const filtered = filterQRData();
        const start = (currentPage - 1) * itemsPerPage;
        const end = Math.min(start + itemsPerPage, filtered.length);
        $('#showingCount').text(filtered.length > 0 ? `${start + 1}–${Math.min(end, filtered.length)}` : '0');
        $('#totalCount').text(filtered.length);
    }

    // Render LIST view (original table)
    function renderListView() {
        $('#qrGridContainer').hide();
        $('#qrCodesTable').closest('.table-responsive').show();
        
        const tbody = $('#qrCodesTable tbody');
        tbody.empty();

        const filtered = filterQRData();
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const page = filtered.slice(start, end);

        if (page.length === 0) {
            tbody.html('<tr><td colspan="10" class="text-center text-muted py-4"><i class="fas fa-search fa-2x d-block mb-2"></i>Sem dados для відображення</td></tr>');
            renderPagination(0);
            return;
        }

        page.forEach(qr => {
            const createdDate = qr.created ? new Date(qr.created).toLocaleDateString('pt-PT') : '-';
            const expiryDate = qr.liftData?.nextInspectionDate ? new Date(qr.liftData.nextInspectionDate).toLocaleDateString('pt-PT') : '-';
            const liftType = qr.liftType === 'cargo' ? 'Carga' : 'Passageiro';
            
            tbody.append(`
                <tr>
                    <td><input type="checkbox" class="qr-checkbox" data-id="${qr.id}"></td>
                    <td style="text-align:center;vertical-align:middle;">
                        <div id="qr-list-${qr.id}" style="display:inline-block;background:#fff;padding:3px;border:1px solid #ddd;border-radius:3px;"></div>
                    </td>
                    <td><strong>${qr.code}</strong></td>
                    <td><small class="text-muted">${qr.id.slice(-8)}</small></td>
                    <td><span class="badge badge-info">${liftType}</span></td>
                    <td>${qr.name}</td>
                    <td><span class="badge badge-${qr.status === 'active' ? 'success' : 'secondary'}">${qr.status === 'active' ? 'Ativo' : 'Inativo'}</span></td>
                    <td>${createdDate}</td>
                    <td>${expiryDate}</td>
                    <td><span class="badge badge-light">${qr.scans}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="qrManager.viewQR('${qr.id}')" title="Ver">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary ml-1" onclick="qrManager.printSingleById('${qr.id}')" title="Imprimir">
                            <i class="fas fa-print"></i>
                        </button>
                    </td>
                </tr>
            `);
        });

        renderPagination(Math.ceil(filtered.length / itemsPerPage));

        // Генеруємо QR зображення для списку після рендерингу DOM
        setTimeout(() => {
            page.forEach(qr => {
                const el = document.getElementById(`qr-list-${qr.id}`);
                if (el && typeof QRCode !== 'undefined') {
                    el.innerHTML = '';
                    new QRCode(el, {
                        text: qr.code,
                        width: 64,
                        height: 64,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.M
                    });
                }
            });
        }, 50);
    }

    // Render GRID view
    function renderGridView() {
        $('#qrCodesTable').closest('.table-responsive').hide();
        let container = $('#qrGridContainer');
        if (!container.length) {
            $('#qrCodesTable').closest('.table-responsive').after('<div id="qrGridContainer"></div>');
            container = $('#qrGridContainer');
        }
        container.show().empty();

        const filtered = filterQRData();
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const page = filtered.slice(start, end);

        if (page.length === 0) {
            container.html('<div class="col-12 text-center text-muted py-5"><i class="fas fa-search fa-2x d-block mb-2"></i>Sem dados для відображення</div>');
            renderPagination(0);
            return;
        }

        // Determine Bootstrap col class
        const colMap = { 2: 'col-md-6', 3: 'col-md-4', 4: 'col-md-3' };
        const colClass = colMap[currentGridCols] || 'col-md-4';

        const row = $('<div class="row" id="qrGridRow"></div>');
        container.append(row);

        page.forEach(qr => {
            const statusColor = qr.status === 'active' ? 'success' : 'secondary';
            const statusLabel = qr.status === 'active' ? 'Ativo' : 'Inativo';
            const liftType = qr.liftType === 'cargo' ? '<i class="fas fa-dolly"></i> Carga' : '<i class="fas fa-user"></i> Passageiro';

            row.append(`
                <div class="${colClass} col-sm-6 mb-3">
                    <div class="card qr-card h-100 shadow-sm">
                        <div class="card-header d-flex align-items-center py-2 px-3" style="background:#f8f9fa;">
                            <input type="checkbox" class="qr-checkbox mr-2" data-id="${qr.id}" style="cursor:pointer;">
                            <span class="font-weight-bold text-primary flex-grow-1 text-truncate" title="${qr.code}">${qr.code}</span>
                            <span class="badge badge-${statusColor} ml-1">${statusLabel}</span>
                        </div>
                        <div class="card-body text-center py-2 px-2">
                            <div id="qr-canvas-${qr.id}" class="d-inline-block mb-2" style="background:#fff;padding:6px;border-radius:4px;"></div>
                            <div class="text-muted small text-truncate mb-1" title="${qr.name}"><i class="fas fa-map-marker-alt"></i> ${qr.name}</div>
                            <div class="text-muted small">${liftType} &bull; ${qr.location}</div>
                        </div>
                        <div class="card-footer d-flex justify-content-center gap-1 py-2 px-2" style="gap:4px;">
                            <button class="btn btn-sm btn-primary flex-grow-1" onclick="qrManager.viewQR('${qr.id}')" title="Ver detalhes">
                                <i class="fas fa-eye"></i> Detalhes
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="qrManager.printSingleById('${qr.id}')" title="Imprimir QR">
                                <i class="fas fa-print"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="qrManager.downloadById('${qr.id}')" title="Descarregar QR">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `);
        });

        renderPagination(Math.ceil(filtered.length / itemsPerPage));

        // Generate QR codes after DOM is ready
        setTimeout(() => {
            page.forEach(qr => {
                const el = document.getElementById(`qr-canvas-${qr.id}`);
                if (el && typeof QRCode !== 'undefined') {
                    el.innerHTML = '';
                    new QRCode(el, {
                        text: qr.code,
                        width: 110,
                        height: 110,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.M
                    });
                }
            });
        }, 50);
    }

    // Toggle view mode
    function toggleView(mode) {
        currentView = mode;
        localStorage.setItem('qrManagerView', mode);
        currentPage = 1;
        applyViewToggleState();
        renderQRTable();
    }

    // Filter data
    function filterQRData() {
        return currentQRs.filter(qr => {
            // Status filter
            if (currentFilters.status !== 'all' && qr.status !== currentFilters.status) {
                return false;
            }
            
            // City filter
            if (currentFilters.city && !qr.location.toLowerCase().includes(currentFilters.city)) {
                return false;
            }
            
            // Search filter - шукаємо по коду, адресі, локації
            if (currentFilters.search) {
                const search = currentFilters.search.toLowerCase();
                const matchCode = qr.code.toLowerCase().includes(search);
                const matchName = qr.name.toLowerCase().includes(search);
                const matchLocation = qr.location.toLowerCase().includes(search);
                const matchId = qr.id.toLowerCase().includes(search);
                
                console.log(`🔍 Перевірка QR ${qr.code}:`, {
                    search,
                    code: qr.code,
                    name: qr.name,
                    location: qr.location,
                    matchCode,
                    matchName,
                    matchLocation,
                    matchId
                });
                
                if (!matchCode && !matchName && !matchLocation && !matchId) {
                    return false;
                }
            }
            
            return true;
        });
    }

    // Render pagination
    function renderPagination(totalPages) {
        const pagination = $('#pagination');
        pagination.empty();

        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            pagination.append(`
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="qrManager.changePage(${i}); return false;">${i}</a>
                </li>
            `);
        }
    }

    // Update statistics
    function updateStatistics() {
        const total = currentQRs.length;
        const filtered = filterQRData().length;
        
        // Count by status (тільки для ліфтів: active/inactive)
        const active = currentQRs.filter(qr => qr.status === 'active').length;
        const inactive = currentQRs.filter(qr => qr.status === 'inactive').length;
        
        // Update statistics cards
        $('#totalQRCodes').text(total);
        $('#activeQRCodes').text(active);
        $('#inactiveQRCodes').text(inactive);
        
        console.log(`📊 Статистика: Всього ${total}, Активних ${active}, Неактивних ${inactive}`);
    }

    // Apply filters
    function applyFilters() {
        currentFilters.status = $('#statusFilter').val();
        currentFilters.city = $('#cityFilter').val().toLowerCase();
        currentPage = 1;
        renderQRTable();
        updateStatistics();
    }

    // Filter by status (quick filter)
    function filterByStatus(status) {
        currentFilters.status = status;
        $('#statusFilter').val(status);
        currentPage = 1;
        renderQRTable();
        updateStatistics();
        showNotification(`Filtro: ${status === 'all' ? 'Todos' : status}`, 'info');
    }

    // Search
    function searchQR() {
        const searchValue = $('#searchInput').val();
        console.log('🔍 Pesquisa:', searchValue);
        currentFilters.search = searchValue;
        currentPage = 1;
        renderQRTable();
        updateStatistics();
    }

    // View QR details
    // View QR details
    function viewQR(id) {
        const qr = currentQRs.find(q => q.id === id);
        if (!qr) return;

        // Update modal title
        $('#viewQRModalTitle').text(`QR Код: ${qr.code}`);
        $('#qrCodeText').text(qr.code);

        // Перевірка наявності QRCode бібліотеки
        if (typeof QRCode === 'undefined') {
            console.error('❌ QRCode library not loaded');
            $('#qrCodeCanvas').html('<div class="alert alert-warning">QR код бібліотека завантажується...</div>');
            return;
        }

        // Generate QR Code - qrcodejs@1.0.0 API
        $('#qrCodeCanvas').empty();
        new QRCode(document.getElementById('qrCodeCanvas'), {
            text: qr.code,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        // Display details
        const statusBadge = qr.status === 'active' ? 
            '<span class="badge badge-success">Ativo</span>' : 
            '<span class="badge badge-secondary">Inativo</span>';
        
        const liftType = qr.liftType === 'cargo' ? 'Carga' : 'Passageiro';
        const createdDate = qr.created ? new Date(qr.created).toLocaleDateString('pt-PT') : '-';
        
        $('#viewQRContent').html(`
            <dl class="row">
                <dt class="col-sm-4">Код:</dt>
                <dd class="col-sm-8"><strong>${qr.code}</strong></dd>
                
                <dt class="col-sm-4">ID:</dt>
                <dd class="col-sm-8"><code>${qr.id}</code></dd>
                
                <dt class="col-sm-4">Estado:</dt>
                <dd class="col-sm-8">${statusBadge}</dd>
                
                <dt class="col-sm-4">Tipo:</dt>
                <dd class="col-sm-8">${liftType}</dd>
                
                <dt class="col-sm-4">Endereço:</dt>
                <dd class="col-sm-8">${qr.name}</dd>
                
                <dt class="col-sm-4">Місто:</dt>
                <dd class="col-sm-8">${qr.location}</dd>
                
                <dt class="col-sm-4">Створено:</dt>
                <dd class="col-sm-8">${createdDate}</dd>
                
                <dt class="col-sm-4">Сканувань:</dt>
                <dd class="col-sm-8"><span class="badge badge-primary">${qr.scans}</span></dd>
            </dl>
        `);

        // Print button handler
        $('#printQRBtn').off('click').on('click', function() {
            printQRCode(qr);
        });

        // Download button handler
        $('#downloadQRBtn').off('click').on('click', function() {
            downloadQRCode(qr);
        });

        // Show modal
        $('#viewQRModal').modal('show');
    }

    // Print QR Code
    function printQRCode(qr) {
        const canvas = document.querySelector('#qrCodeCanvas canvas');
        if (!canvas) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Друк QR Коду - ${qr.code}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center;
                        padding: 20px;
                    }
                    img { 
                        max-width: 300px; 
                        margin: 20px auto;
                        display: block;
                    }
                    h2 { margin: 10px 0; }
                    .details { 
                        margin-top: 20px;
                        text-align: left;
                        max-width: 400px;
                        margin-left: auto;
                        margin-right: auto;
                    }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <h2>${qr.code}</h2>
                <img src="${canvas.toDataURL()}" alt="QR Code"/>
                <div class="details">
                    <p><strong>Endereço:</strong> ${qr.name}</p>
                    <p><strong>Tipo:</strong> ${qr.liftType === 'cargo' ? 'Carga' : 'Passageiro'}</p>
                    <p><strong>Місто:</strong> ${qr.location}</p>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() { window.close(); };
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // Download QR Code as PNG
    function downloadQRCode(qr) {
        const canvas = document.querySelector('#qrCodeCanvas canvas');
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = `QR_${qr.code}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Change page
    function changePage(page) {
        currentPage = page;
        renderQRTable();
    }

    // Reset filters
    function resetFilters() {
        currentFilters = {
            status: 'all',
            type: 'all',
            search: ''
        };
        $('#statusFilter').val('all');
        $('#typeFilter').val('all');
        $('#searchInput').val('');
        currentPage = 1;
        renderQRTable();
        updateStatistics();
        showNotification('Filtroи скинуто', 'success');
    }

    // Export functions
    function exportToCSV() {
        const data = filterQRData();
        if (data.length === 0) {
            showNotification('Sem dados для експорту', 'warning');
            return;
        }
        const headers = ['Код QR', 'ID', 'Tipo', 'Endereço', 'Місто', 'Estado', 'Data створення'];
        const rows = data.map(qr => [
            qr.code,
            qr.id,
            qr.liftType === 'cargo' ? 'Carga' : 'Passageiro',
            `"${qr.name.replace(/"/g, '""')}"`,
            qr.location,
            qr.status === 'active' ? 'Ativo' : 'Inativo',
            qr.created ? new Date(qr.created).toLocaleDateString('pt-PT') : '-'
        ]);
        const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR-codes-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification(`Exportarовано ${data.length} записів у CSV`, 'success');
    }

    function exportToPDF() {
        showNotification('Для PDF використовуйте "Imprimir всі" → PrintPDF', 'info');
    }

    function exportToXLSX() {
        showNotification('Exportar XLSX - використовуйте CSV з відкриттям у Excel', 'info');
    }

    function exportToJSON() {
        const data = filterQRData();
        if (data.length === 0) {
            showNotification('Sem dados для експорту', 'warning');
            return;
        }
        const json = JSON.stringify(data.map(qr => ({
            code: qr.code,
            id: qr.id,
            type: qr.liftType,
            address: qr.name,
            city: qr.location,
            status: qr.status,
            created: qr.created
        })), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR-codes-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification(`Exportarовано ${data.length} записів у JSON`, 'success');
    }

    // Build print HTML for an array of QR objects
    function buildPrintHtml(qrs, title) {
        const qrScriptSrc = document.querySelector('script[src*="qrcode"]')?.src || '/plugins/qrcode/js/qrcode.min.js';
        const items = qrs.map(qr => `
            <div class="qr-item">
                <div class="qr-canvas" id="p-${qr.id}"></div>
                <div class="qr-code-text">${qr.code}</div>
                <div class="qr-address">${qr.name}</div>
                <div class="qr-city">${qr.location}</div>
                <div class="qr-status ${qr.status === 'active' ? 'status-active' : 'status-inactive'}">${qr.status === 'active' ? '● Ativo' : '○ Inativo'}</div>
            </div>
        `).join('');

        const qrInits = qrs.map(qr => `
            try { new QRCode(document.getElementById('p-${qr.id}'), { text: '${qr.code.replace(/'/g, "\\'")}', width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M }); } catch(e) {}
        `).join('\n');

        return `<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 15px; }
            h2 { text-align: center; margin-bottom: 15px; font-size: 16px; }
            .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
            .qr-item { border: 1px solid #ccc; border-radius: 6px; padding: 12px; text-align: center; page-break-inside: avoid; }
            .qr-canvas { margin: 0 auto 6px auto; display: inline-block; }
            .qr-code-text { font-weight: bold; font-size: 11px; color: #0057b8; margin-bottom: 3px; }
            .qr-address { font-size: 10px; color: #333; margin-bottom: 2px; word-break: break-word; }
            .qr-city { font-size: 10px; color: #666; margin-bottom: 3px; }
            .qr-status { font-size: 10px; }
            .status-active { color: #28a745; }
            .status-inactive { color: #6c757d; }
            .print-meta { text-align: center; font-size: 10px; color: #aaa; margin-top: 10px; }
            .no-print { text-align: center; margin-bottom: 12px; }
            .no-print button { padding: 8px 20px; font-size: 14px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; }
            @media print { .no-print { display: none; } h2 small { display: none; } }
            @page { margin: 15mm; }
        </style>
        </head><body>
        <div class="no-print">
            <button onclick="window.print()"><i>🖨</i> Imprimir (${qrs.length} QR кодів)</button>
        </div>
        <h2>QR Коди ліфтів &mdash; FestLift <small style="font-weight:normal;font-size:12px;">${new Date().toLocaleDateString('pt-PT')}</small></h2>
        <div class="qr-grid">${items}</div>
        <div class="print-meta">Роздруковано: ${new Date().toLocaleString('pt-PT')} | FestLift Sistema de Gestão</div>
        <script src="${qrScriptSrc}"><\/script>
        <script>
        window.onload = function() {
            ${qrInits}
            setTimeout(() => { window.print(); window.onafterprint = () => window.close(); }, 800);
        };
        <\/script>
        </body></html>`;
    }

    // Print ALL currently filtered QR codes
    function printAll() {
        const data = filterQRData();
        if (data.length === 0) {
            showNotification('Немає QR кодів для друку', 'warning');
            return;
        }
        showNotification(`Підготовка ${data.length} QR кодів для друку...`, 'info');
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(buildPrintHtml(data, 'Todos Códigos QR - FestLift'));
        win.document.close();
    }

    // Print selected QR codes
    function printSelected() {
        const selected = $('.qr-checkbox:checked').map(function() {
            return $(this).data('id');
        }).get();

        if (selected.length === 0) {
            showNotification('Виберіть Códigos QR для друку', 'warning');
            return;
        }

        const qrs = currentQRs.filter(qr => selected.includes(qr.id));
        showNotification(`Підготовка ${qrs.length} QR кодів для друку...`, 'info');
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(buildPrintHtml(qrs, 'Вибрані Códigos QR - FestLift'));
        win.document.close();
    }

    // Print single QR by id (without opening view modal)
    function printSingleById(id) {
        const qr = currentQRs.find(q => q.id === id);
        if (!qr) return;

        // Use existing open modal canvas if available, otherwise build new print window
        const canvas = document.querySelector('#qrCodeCanvas canvas');
        if (canvas && $('#viewQRModal').hasClass('show') && $('#qrCodeText').text() === qr.code) {
            printQRCode(qr);
            return;
        }

        const win = window.open('', '_blank', 'width=500,height=500');
        win.document.write(buildPrintHtml([qr], `QR ${qr.code} - FestLift`));
        win.document.close();
    }

    // Download single QR by id (without opening modal)
    function downloadById(id) {
        const qr = currentQRs.find(q => q.id === id);
        if (!qr) return;

        // Create off-screen canvas
        const div = document.createElement('div');
        div.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
        document.body.appendChild(div);

        if (typeof QRCode === 'undefined') {
            showNotification('QR бібліотека не завантажена', 'error');
            document.body.removeChild(div);
            return;
        }

        const qrObj = new QRCode(div, {
            text: qr.code,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        setTimeout(() => {
            const c = div.querySelector('canvas');
            if (c) {
                const a = document.createElement('a');
                a.download = `QR_${qr.code}.png`;
                a.href = c.toDataURL('image/png');
                a.click();
            }
            document.body.removeChild(div);
        }, 200);
    }

    // Utilities
    function showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Use toastr if available
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Public API
    return {
        init: init,
        viewQR: viewQR,
        changePage: changePage,
        searchQR: searchQR,
        resetFilters: resetFilters,
        filterByStatus: filterByStatus,
        printSelected: printSelected,
        printAll: printAll,
        printSingleById: printSingleById,
        downloadById: downloadById,
        toggleView: toggleView,
        exportJSON: exportToJSON,
        exportCSV: exportToCSV
    };

})();

// Примітка: Ініціалізація викликається вручну на сторінці
// після завантаження DOM через $(document).ready() або $(window).on('load')
