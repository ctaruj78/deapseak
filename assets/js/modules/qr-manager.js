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

    // Initialize
    function init() {
        console.log('✅ QR Manager initialized');
        loadInitialData();
        setupEventListeners();
        renderQRTable();
        updateStatistics();
    }

    // Load data from API
    async function loadInitialData() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No auth token found');
                currentQRs = [];
                return;
            }

            const response = await fetch('/api/lifts', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load lifts');

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
                    code: `LIFT-${lift.municipalNumber || lift._id.slice(-6).toUpperCase()}`,
                    name: addressText,
                    type: 'lift',
                    liftType: lift.type || 'passenger',
                    status: lift.status === 'operational' ? 'active' : 'inactive',
                    location: lift.address?.city || 'Невідоме місто',
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
            console.error('Error loading lifts:', error);
            currentQRs = [];
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        console.log('🔗 Налаштування event listeners...');
        
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
        
        console.log('✅ Event listeners встановлено');
    }

    // Render table
    function renderQRTable() {
        const tbody = $('#qrCodesTable tbody');
        tbody.empty();

        const filtered = filterQRData();
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const page = filtered.slice(start, end);

        if (page.length === 0) {
            tbody.html('<tr><td colspan="10" class="text-center">Немає даних</td></tr>');
            return;
        }

        page.forEach(qr => {
            const createdDate = qr.created ? new Date(qr.created).toLocaleDateString('uk-UA') : '-';
            const expiryDate = qr.liftData?.nextInspectionDate ? new Date(qr.liftData.nextInspectionDate).toLocaleDateString('uk-UA') : '-';
            const liftType = qr.liftType === 'cargo' ? 'Вантажний' : 'Пасажирський';
            
            tbody.append(`
                <tr>
                    <td><input type="checkbox" class="qr-checkbox" data-id="${qr.id}"></td>
                    <td><strong>${qr.code}</strong></td>
                    <td><small class="text-muted">${qr.id.slice(-8)}</small></td>
                    <td><span class="badge badge-info">${liftType}</span></td>
                    <td>${qr.name}</td>
                    <td><span class="badge badge-${qr.status === 'active' ? 'success' : 'secondary'}">${qr.status === 'active' ? 'Активний' : 'Неактивний'}</span></td>
                    <td>${createdDate}</td>
                    <td>${expiryDate}</td>
                    <td><span class="badge badge-light">${qr.scans}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="qrManager.viewQR('${qr.id}')" title="Переглянути">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `);
        });

        renderPagination(Math.ceil(filtered.length / itemsPerPage));
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
        showNotification(`Фільтр: ${status === 'all' ? 'Всі' : status}`, 'info');
    }

    // Search
    function searchQR() {
        const searchValue = $('#searchInput').val();
        console.log('🔍 Пошук:', searchValue);
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

        // Generate QR Code
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
            '<span class="badge badge-success">Активний</span>' : 
            '<span class="badge badge-secondary">Неактивний</span>';
        
        const liftType = qr.liftType === 'cargo' ? 'Вантажний' : 'Пасажирський';
        const createdDate = qr.created ? new Date(qr.created).toLocaleDateString('uk-UA') : '-';
        
        $('#viewQRContent').html(`
            <dl class="row">
                <dt class="col-sm-4">Код:</dt>
                <dd class="col-sm-8"><strong>${qr.code}</strong></dd>
                
                <dt class="col-sm-4">ID:</dt>
                <dd class="col-sm-8"><code>${qr.id}</code></dd>
                
                <dt class="col-sm-4">Статус:</dt>
                <dd class="col-sm-8">${statusBadge}</dd>
                
                <dt class="col-sm-4">Тип:</dt>
                <dd class="col-sm-8">${liftType}</dd>
                
                <dt class="col-sm-4">Адреса:</dt>
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
                    <p><strong>Адреса:</strong> ${qr.name}</p>
                    <p><strong>Тип:</strong> ${qr.liftType === 'cargo' ? 'Вантажний' : 'Пасажирський'}</p>
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
        showNotification('Фільтри скинуто', 'success');
    }

    // Export functions (stubs)
    function exportToCSV() {
        showNotification('Експорт CSV...', 'info');
    }

    function exportToPDF() {
        showNotification('Експорт PDF...', 'info');
    }

    function exportToXLSX() {
        showNotification('Експорт XLSX...', 'info');
    }

    function exportToJSON() {
        showNotification('Експорт JSON...', 'info');
    }

    // Print selected QR codes
    function printSelected() {
        const selected = $('.qr-checkbox:checked').map(function() {
            return $(this).data('id');
        }).get();

        if (selected.length === 0) {
            showNotification('Виберіть QR коди для друку', 'warning');
            return;
        }

        const qrs = currentQRs.filter(qr => selected.includes(qr.id));
        
        // Open print window
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write('<html><head><title>Друк QR кодів</title>');
        printWindow.document.write('<style>');
        printWindow.document.write('body { font-family: Arial; padding: 20px; }');
        printWindow.document.write('.qr-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }');
        printWindow.document.write('.qr-item { text-align: center; border: 1px solid #ddd; padding: 15px; page-break-inside: avoid; }');
        printWindow.document.write('h3 { margin: 10px 0 5px 0; }');
        printWindow.document.write('p { margin: 5px 0; font-size: 12px; }');
        printWindow.document.write('@media print { .no-print { display: none; } }');
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<button class="no-print" onclick="window.print()">Друкувати</button>');
        printWindow.document.write('<div class="qr-grid">');
        
        qrs.forEach(qr => {
            printWindow.document.write(`
                <div class="qr-item">
                    <div class="qr-code" id="qr-${qr.id}"></div>
                    <h3>${qr.code}</h3>
                    <p><strong>${qr.name}</strong></p>
                    <p>${qr.location}</p>
                </div>
            `);
        });
        
        printWindow.document.write('</div>');
        printWindow.document.write('<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></' + 'script>');
        printWindow.document.write('<script>');
        printWindow.document.write('window.onload = function() {');
        qrs.forEach(qr => {
            printWindow.document.write(`
                new QRCode(document.getElementById('qr-${qr.id}'), {
                    text: '${qr.code}',
                    width: 150,
                    height: 150
                });
            `);
        });
        printWindow.document.write('setTimeout(() => window.print(), 500);');
        printWindow.document.write('};');
        printWindow.document.write('</' + 'script>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();

        showNotification(`Підготовлено ${qrs.length} QR кодів для друку`, 'success');
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
        printSelected: printSelected
    };

})();

// Примітка: Ініціалізація викликається вручну на сторінці
// після завантаження DOM через $(document).ready() або $(window).on('load')
