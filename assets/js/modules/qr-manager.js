/**
 * QR Manager Module for LiftMaster Pro
 * Handles all QR code management functionality
 */

const qrManager = (function() {
    'use strict';

    function buildPublicQrUrl(liftId) {
        return `${window.location.origin}/pages/public/qr-help.html?liftId=${encodeURIComponent(liftId)}`;
    }

    function getQrPayload(qr) {
        if (qr && qr.id) {
            return buildPublicQrUrl(qr.id);
        }
        if (qr && typeof qr.code === 'string' && /^https?:\/\//i.test(qr.code)) {
            return qr.code;
        }
        return '';
    }

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
            const token = (window.AuthManager && typeof window.AuthManager.getAuthToken === 'function')
                ? window.AuthManager.getAuthToken()
                : (sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('token'));
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
                    qrPayload: buildPublicQrUrl(lift._id),
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

        // Add calibration button next to print actions (once)
        if (!$('#printCalibrationBtn').length && $('#printSelectedBtn').length) {
            const btn = '<button id="printCalibrationBtn" class="btn btn-outline-secondary ml-2" type="button" title="Calibration 70x50mm"><i class="fas fa-ruler-combined"></i> Calibração 70×50</button>';
            $('#printSelectedBtn').after(btn);
            $('#printCalibrationBtn').on('click', () => printCalibration70x50());
        }

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
                        text: getQrPayload(qr),
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
                        text: getQrPayload(qr),
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
        $('#viewQRModalTitle').text(`Código QR: ${qr.code}`);
        $('#qrCodeText').text(qr.code);

        // Перевірка наявності QRCode бібліотеки
        if (typeof QRCode === 'undefined') {
            console.error('❌ QRCode library not loaded');
            $('#qrCodeCanvas').html('<div class="alert alert-warning">Biblioteca QR a carregar...</div>');
            return;
        }

        // Generate QR Code - qrcodejs@1.0.0 API
        $('#qrCodeCanvas').empty();
        new QRCode(document.getElementById('qrCodeCanvas'), {
            text: getQrPayload(qr),
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
                
                <dt class="col-sm-4">Cidade:</dt>
                <dd class="col-sm-8">${qr.location}</dd>
                
                <dt class="col-sm-4">Criado:</dt>
                <dd class="col-sm-8">${createdDate}</dd>
                
                <dt class="col-sm-4">Leituras:</dt>
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

        const lift = qr.liftData || {};
        const municipalNumber = lift.municipalNumber || qr.code || 'N/D';
        const manufacturer = lift.manufacturer || lift.brand || '';
        const model = lift.model ? (manufacturer ? manufacturer + ' ' + lift.model : lift.model) : (manufacturer || 'N/D');
        const liftTypePT = qr.liftType === 'cargo' ? 'Carga' : 'Passageiro';
        const liftTypeEN = qr.liftType === 'cargo' ? 'Freight' : 'Passenger';
        const address = qr.name || 'N/D';
        const city = qr.location || '';
        const whatsapp = '+351 926 380 243';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>QR Code - ${municipalNumber}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #fff; }
  .card { max-width: 420px; margin: 0 auto; border: 2px solid #222; border-radius: 8px; padding: 20px; text-align: center; }
  .brand { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
  .title { font-size: 18px; font-weight: bold; color: #111; margin-bottom: 2px; }
  .subtitle { font-size: 11px; color: #888; margin-bottom: 14px; }
  .qr-img { width: 220px; height: 220px; border: 1px solid #ddd; padding: 8px; margin: 0 auto 14px; display: block; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; text-align: left; }
  td { padding: 4px 6px; font-size: 12px; vertical-align: top; }
  td:first-child { font-weight: bold; color: #333; width: 38%; }
  .bilingual { background: #f5f5f5; border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; font-size: 11px; color: #444; line-height: 1.7; text-align: left; }
  .contact { background: #e8f5e9; border-radius: 6px; padding: 8px 12px; font-size: 12px; }
  .contact strong { color: #2e7d32; }
  .wa-icon { display: inline-block; width: 14px; height: 14px; vertical-align: middle; margin-right: 4px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="card">
  <div class="brand">FestLift — Gestão de Elevadores</div>
  <div class="title">Código QR do Elevador</div>
  <div class="subtitle">Lift QR Code</div>
  <img src="${canvas.toDataURL()}" class="qr-img" alt="QR Code">
  <table>
    <tr><td>Nº Municipal / Municipal No.:</td><td><strong>${municipalNumber}</strong></td></tr>
    <tr><td>Endereço / Address:</td><td>${address}${city ? ', ' + city : ''}</td></tr>
    <tr><td>Equipamento / Equipment:</td><td>${model}</td></tr>
    <tr><td>Tipo / Type:</td><td>${liftTypePT} / ${liftTypeEN}</td></tr>
  </table>
  <div class="bilingual">
    <strong>PT:</strong> Leia este código QR para obter apoio técnico, reportar uma avaria ou solicitar manutenção.<br>
    <strong>EN:</strong> Scan this QR code for technical support, fault reporting or maintenance request.
  </div>
  <div class="contact">
    <strong>&#128241; WhatsApp / Contato:</strong> ${whatsapp}
  </div>
</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}</script>
</body>
</html>`);
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
        const headers = ['Código QR', 'ID', 'Tipo', 'Endereço', 'Cidade', 'Estado', 'Data de criação'];
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
    function buildPrintHtml(qrs, title, options = {}) {
        const autoPrint = options.autoPrint === true;
        const autoClose = options.autoClose === true;
        const density = options.density === 'balanced' ? 'balanced' : 'max';
        const qrScriptSrc = document.querySelector('script[src*="qrcode"]')?.src || '/plugins/qrcode/js/qrcode.min.js';
        const items = qrs.map(qr => `
            <div class="qr-item">
                <div class="qr-safe-content">
                    <div class="qr-main">
                        <div class="qr-info">
                            <div class="qr-code-text">${qr.code}</div>
                            <div class="qr-address">${qr.name}</div>
                            <div class="qr-city">${qr.location}</div>
                            <div class="qr-microcopy">SUPORTE 24/7 • WHATSAPP / EMAIL</div>
                            <div class="qr-status ${qr.status === 'active' ? 'status-active' : 'status-inactive'}">${qr.status === 'active' ? '● Ativo' : '○ Inativo'}</div>
                        </div>
                        <div class="qr-canvas" id="p-${qr.id}"></div>
                    </div>
                    <div class="qr-sticker-legend">
                        <span>PT: Leia para apoio técnico ou reportar avaria.</span>
                        <span>EN: Scan for technical support or fault report.</span>
                        <div class="qr-channel-row">
                            <span class="qr-channel qr-channel-wa">WhatsApp</span>
                            <span class="qr-channel qr-channel-mail">Email</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        const qrInits = qrs.map(qr => `
            try { new QRCode(document.getElementById('p-${qr.id}'), { text: '${getQrPayload(qr).replace(/'/g, "\\'")}', width: 128, height: 128, correctLevel: QRCode.CorrectLevel.M }); } catch(e) {}
        `).join('\n');

        return `<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
        <style>
            :root {
                --ink: #102033;
                --muted: #667085;
                --line: #d5dde8;
                --accent: #0b66ff;
                --accent-2: #17b26a;
            }
            * { box-sizing: border-box; }
            body {
                margin: 0;
                padding: 14px;
                background: #eef3f9;
                color: var(--ink);
                font-family: 'Montserrat', sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            h2 {
                text-align: center;
                margin: 0 0 14px;
                font-size: 16px;
                font-weight: 800;
                letter-spacing: 0.02em;
                color: var(--ink);
            }
            h2 small {
                display: block;
                margin-top: 4px;
                font-size: 10px;
                font-weight: 600;
                color: var(--muted);
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }
            .qr-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(70mm, 70mm));
                justify-content: center;
                gap: 2.5mm;
            }
            .qr-item {
                position: relative;
                overflow: hidden;
                border: 1px solid rgba(16, 32, 51, 0.12);
                border-radius: 3.2mm;
                width: 70mm;
                min-height: 50mm;
                height: 50mm;
                padding: 1.2mm 1.2mm 0.9mm;
                text-align: center;
                page-break-inside: avoid;
                display: flex;
                flex-direction: column;
                background:
                    radial-gradient(circle at top right, rgba(11, 102, 255, 0.08), transparent 34%),
                    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
                box-shadow: 0 10px 24px rgba(16, 32, 51, 0.08);
            }
            .qr-item::before {
                content: '';
                position: absolute;
                inset: 0 0 auto 0;
                height: 1.4mm;
                background: linear-gradient(90deg, var(--accent), #4b8bff 55%, var(--accent-2));
            }
            .qr-safe-content {
                width: 69.6mm;
                height: 49.6mm;
                margin: 0.2mm auto;
                padding: 1.3mm 1.3mm 1.0mm;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border-radius: 2.8mm;
            }
            .qr-main {
                display: grid;
                grid-template-columns: 1fr 29.2mm;
                gap: 1.0mm;
                align-items: center;
                min-height: 0;
                flex: 1;
            }
            .qr-info {
                min-width: 0;
                text-align: left;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                gap: 0.55mm;
            }
            .qr-canvas {
                margin: 0;
                display: inline-block;
                padding: 0.8mm;
                border-radius: 2.0mm;
                background: #ffffff;
                border: 1px solid rgba(16, 32, 51, 0.08);
                justify-self: end;
            }
            .qr-canvas canvas,
            .qr-canvas img {
                width: 27.3mm !important;
                height: 27.3mm !important;
                display: block;
            }
            .qr-code-text {
                font-weight: 800;
                font-size: 9.4px;
                color: var(--accent);
                margin-bottom: 0;
                letter-spacing: 0.03em;
                text-transform: uppercase;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .qr-address {
                font-size: 6.7px;
                color: var(--ink);
                margin-bottom: 0;
                word-break: break-word;
                font-weight: 600;
                line-height: 1.15;
                min-height: 5.2mm;
                max-height: 5.2mm;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .qr-city {
                font-size: 6px;
                color: var(--muted);
                margin-bottom: 0;
                font-weight: 600;
                letter-spacing: 0.02em;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .qr-microcopy {
                font-size: 5.2px;
                line-height: 1.05;
                font-weight: 800;
                color: #3a4c64;
                letter-spacing: 0.02em;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .qr-status {
                display: inline-flex;
                align-items: center;
                justify-content: flex-start;
                gap: 3px;
                min-height: 3.1mm;
                padding: 0 1.2mm;
                border-radius: 999px;
                font-size: 5.5px;
                font-weight: 800;
                letter-spacing: 0.03em;
                text-transform: uppercase;
                background: rgba(16, 32, 51, 0.04);
                width: fit-content;
            }
            .qr-sticker-legend {
                margin-top: auto;
                width: 100%;
                height: 9.8mm;
                min-height: 9.8mm;
                padding: 0.75mm 0 0;
                border-top: 1px dashed rgba(16, 32, 51, 0.18);
                color: var(--ink);
                font-size: 5.85px;
                line-height: 1.06;
                font-weight: 700;
                text-align: left;
                display: grid;
                grid-template-rows: auto auto auto;
                row-gap: 0.22mm;
                align-content: start;
                flex-shrink: 0;
            }
            .qr-sticker-legend span {
                display: block;
                white-space: normal;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .qr-channel-row {
                display: flex;
                gap: 1.1mm;
                margin-top: 0.25mm;
            }
            .qr-channel {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                padding: 0.55mm 1.35mm;
                font-size: 5.2px;
                line-height: 1;
                font-weight: 800;
                letter-spacing: 0.02em;
                text-transform: uppercase;
            }
            .qr-channel-wa {
                color: #0a7d43;
                background: #e9f9ef;
                border: 1px solid #9be1b8;
            }
            .qr-channel-mail {
                color: #1e4fae;
                background: #edf4ff;
                border: 1px solid #a6c7ff;
            }
            .status-active { color: #28a745; }
            .status-inactive { color: #6c757d; }
            .print-meta { text-align: center; font-size: 9px; color: var(--muted); margin-top: 10px; letter-spacing: 0.02em; }
            .no-print { text-align: center; margin-bottom: 12px; }
            .print-toolbar {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                background: #fff;
                border: 1px solid #d5dde8;
                border-radius: 999px;
                padding: 6px 10px 6px 12px;
                box-shadow: 0 6px 14px rgba(16, 32, 51, 0.08);
            }
            .print-toolbar label {
                margin: 0;
                font-size: 12px;
                color: var(--muted);
                font-weight: 700;
            }
            .print-toolbar select {
                height: 30px;
                border-radius: 999px;
                border: 1px solid #c9d4e4;
                padding: 0 10px;
                font-size: 12px;
                font-weight: 700;
                color: var(--ink);
                background: #fff;
            }
            .no-print button {
                padding: 9px 18px;
                font-size: 13px;
                cursor: pointer;
                background: linear-gradient(135deg, var(--accent), #4b8bff);
                color: white;
                border: none;
                border-radius: 999px;
                font-family: 'Montserrat', sans-serif;
                font-weight: 700;
                box-shadow: 0 8px 18px rgba(11, 102, 255, 0.22);
            }

            body.density-balanced .qr-item {
                padding: 2.0mm 1.8mm 1.3mm;
            }
            body.density-balanced .qr-safe-content {
                width: 69mm;
                height: 49mm;
                margin: 0.5mm auto;
                padding: 1.8mm 1.8mm 1.4mm;
            }
            body.density-balanced .qr-main {
                grid-template-columns: 1fr 27.8mm;
                gap: 1.4mm;
            }
            body.density-balanced .qr-canvas canvas,
            body.density-balanced .qr-canvas img {
                width: 25.6mm !important;
                height: 25.6mm !important;
            }
            body.density-balanced .qr-sticker-legend {
                height: 10.6mm;
                min-height: 10.6mm;
                font-size: 6px;
                row-gap: 0.28mm;
            }

            body.density-max .qr-item {
                padding: 1.2mm 1.2mm 0.9mm;
            }
            body.density-max .qr-safe-content {
                width: 69.6mm;
                height: 49.6mm;
                margin: 0.2mm auto;
                padding: 1.3mm 1.3mm 1.0mm;
            }
            body.density-max .qr-main {
                grid-template-columns: 1fr 29.2mm;
                gap: 1.0mm;
            }
            body.density-max .qr-canvas canvas,
            body.density-max .qr-canvas img {
                width: 27.3mm !important;
                height: 27.3mm !important;
            }
            body.density-max .qr-sticker-legend {
                height: 9.8mm;
                min-height: 9.8mm;
                font-size: 5.85px;
                row-gap: 0.22mm;
            }
            @media print {
                body { background: #fff; padding: 1mm; }
                .no-print { display: none; }
                h2 small { display: none; }
                .qr-item { box-shadow: none; }
            }
            @page { margin: 8mm; }
        </style>
        </head><body class="density-${density}">
        <div class="no-print">
            <div class="print-toolbar">
                <label for="densitySelect">Densidade:</label>
                <select id="densitySelect" onchange="changeDensity(this.value)">
                    <option value="balanced">Balanced</option>
                    <option value="max">Max Fill</option>
                </select>
                <button onclick="window.print()"><i>🖨</i> Imprimir (${qrs.length} QR кодів)</button>
            </div>
        </div>
        <h2>QR Коди ліфтів &mdash; FestLift <small style="font-weight:normal;font-size:12px;">${new Date().toLocaleDateString('pt-PT')}</small></h2>
        <div class="qr-grid">${items}</div>
        <div class="print-meta">Роздруковано: ${new Date().toLocaleString('pt-PT')} | FestLift Sistema de Gestão</div>
        <script src="${qrScriptSrc}"><\/script>
        <script>
        const DENSITY_KEY = 'qrPrintDensityMode';
        function changeDensity(mode) {
            document.body.classList.remove('density-balanced', 'density-max');
            document.body.classList.add(mode === 'balanced' ? 'density-balanced' : 'density-max');
            try { localStorage.setItem(DENSITY_KEY, mode === 'balanced' ? 'balanced' : 'max'); } catch(e) {}
        }

        window.onload = function() {
            ${qrInits}
            const savedDensity = (() => {
                try { return localStorage.getItem(DENSITY_KEY); } catch(e) { return null; }
            })();
            const selectedDensity = savedDensity === 'balanced' || savedDensity === 'max' ? savedDensity : '${density}';
            const densitySelect = document.getElementById('densitySelect');
            if (densitySelect) densitySelect.value = selectedDensity;
            changeDensity(selectedDensity);
            if (${autoPrint ? 'true' : 'false'}) {
                setTimeout(() => {
                    window.print();
                    if (${autoClose ? 'true' : 'false'}) {
                        window.onafterprint = () => window.close();
                    }
                }, 800);
            }
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
        const density = (localStorage.getItem('qrPrintDensityMode') === 'balanced') ? 'balanced' : 'max';
        win.document.write(buildPrintHtml(data, 'Todos Códigos QR - FestLift', { density }));
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
        const density = (localStorage.getItem('qrPrintDensityMode') === 'balanced') ? 'balanced' : 'max';
        win.document.write(buildPrintHtml(qrs, 'Вибрані Códigos QR - FestLift', { density }));
        win.document.close();
    }

    // Build calibration sheet for 70x50mm sticker printing
    function buildCalibrationHtml() {
        return `<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>Calibration 70x50mm - FestLift</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
        <style>
            * { box-sizing: border-box; }
            body {
                margin: 0;
                padding: 12mm;
                font-family: 'Montserrat', sans-serif;
                color: #102033;
                background: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            h1 {
                margin: 0 0 8px;
                font-size: 16px;
                font-weight: 800;
                text-align: center;
            }
            .note {
                margin: 0 0 10mm;
                text-align: center;
                font-size: 11px;
                color: #475467;
            }
            .cal-grid {
                display: grid;
                grid-template-columns: repeat(2, 70mm);
                gap: 4mm;
                justify-content: center;
            }
            .sample {
                width: 70mm;
                height: 50mm;
                border: 0.35mm dashed #0b66ff;
                border-radius: 2mm;
                position: relative;
                padding: 3mm;
            }
            .sample .title {
                font-size: 9px;
                font-weight: 800;
                color: #0b66ff;
                margin-bottom: 2mm;
            }
            .sample .meta {
                font-size: 8px;
                color: #344054;
                line-height: 1.35;
            }
            .h70 {
                position: absolute;
                left: 3mm;
                right: 3mm;
                bottom: 3mm;
                border-top: 0.25mm solid #111827;
            }
            .h70::after {
                content: '70 mm';
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                top: -3.5mm;
                font-size: 7px;
                background: #fff;
                padding: 0 1mm;
            }
            .v50 {
                position: absolute;
                top: 3mm;
                bottom: 3mm;
                right: 3mm;
                border-left: 0.25mm solid #111827;
            }
            .v50::after {
                content: '50 mm';
                position: absolute;
                right: -7mm;
                top: 50%;
                transform: translateY(-50%) rotate(90deg);
                font-size: 7px;
                background: #fff;
                padding: 0 1mm;
            }
            .ruler {
                margin: 8mm auto 0;
                width: 100mm;
                height: 8mm;
                border-top: 0.3mm solid #111827;
                position: relative;
            }
            .ruler::before {
                content: 'Reference line: 100 mm';
                position: absolute;
                top: -5.5mm;
                left: 50%;
                transform: translateX(-50%);
                font-size: 8px;
                background: #fff;
                padding: 0 1mm;
                color: #111827;
            }
            @page { margin: 8mm; }
        </style>
        </head><body>
            <h1>Calibration Sheet 70×50 mm</h1>
            <p class="note">Print at 100% scale (Actual size). Measure the box edges and the 100 mm reference line.</p>
            <div class="cal-grid">
                <div class="sample">
                    <div class="title">Sticker Frame Test</div>
                    <div class="meta">Expected: 70.0 mm × 50.0 mm</div>
                    <div class="meta">Tolerance target: ±0.5 mm</div>
                    <div class="h70"></div>
                    <div class="v50"></div>
                </div>
                <div class="sample">
                    <div class="title">Cut Border Preview</div>
                    <div class="meta">Use this border as cut line.</div>
                    <div class="meta">If mismatch > 1 mm, adjust printer scale.</div>
                    <div class="h70"></div>
                    <div class="v50"></div>
                </div>
            </div>
            <div class="ruler"></div>
            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                        window.onafterprint = () => window.close();
                    }, 300);
                };
            <\/script>
        </body></html>`;
    }

    // Print calibration sheet for 70x50mm labels
    function printCalibration70x50() {
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(buildCalibrationHtml());
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
        win.document.write(buildPrintHtml([qr], `QR ${qr.code} - FestLift`, { autoPrint: true, autoClose: true }));
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
            text: getQrPayload(qr),
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
        printCalibration70x50: printCalibration70x50,
        printSingleById: printSingleById,
        downloadById: downloadById,
        toggleView: toggleView,
        exportJSON: exportToJSON,
        exportCSV: exportToCSV
    };

})();

// Примітка: Ініціалізація викликається вручну на сторінці
// після завантаження DOM через $(document).ready() або $(window).on('load')
