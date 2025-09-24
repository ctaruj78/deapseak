/**
 * QR Manager Module for LiftMaster Pro
 * Handles all QR code management functionality
 */

const qrManager = (function() {
    // Audit log (заглушка)
    let auditLog = [];

    function addAuditLogEntry(action, details) {
        const entry = {
            time: new Date(),
            action,
            details
        };
        auditLog.unshift(entry);
        renderAuditLog();
    }

    function renderAuditLog() {
        const list = $('#auditLogList');
        if (!auditLog.length) {
            list.html('<li class="text-muted">Журнал дій порожній (заглушка)</li>');
            return;
        }
        list.empty();
        auditLog.forEach(entry => {
            list.append(`<li><span class="text-secondary small">${formatDate(entry.time, 'YYYY-MM-DD HH:mm')}</span> — <b>${entry.action}</b>: ${entry.details}</li>`);
        });
    }
    // Current state
    let currentQRs = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentFilters = {
        status: 'all',
        type: 'all',
        group: 'all',
        location: 'all',
        dateRange: null,
        search: ''
    };
});
    let selectedQRs = [];
    let currentViewingQR = null;

    // DOM Elements
    const elements = {
        tableBody: '#qrCodesTable tbody',
        pagination: '#pagination',
        totalCount: '#totalCount',
        showingCount: '#showingCount',
    statusFilter: '#statusFilter',
    typeFilter: '#typeFilter',
    groupFilter: '#groupFilter',
    locationFilter: '#locationFilter',
    dateRangeFilter: '#dateRangeFilter',
    searchInput: '#searchInput'
    };

    // Initialize the module
    function init() {
        console.log("QR Manager initialized");
        loadInitialData();
        setupEventListeners();
        setupFormHandlers();
        renderQRTable();
        updateStatistics();
        
        // Set default expiry date to 30 days from now
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 30);
        document.getElementById('qrExpiry').value = formatDate(defaultExpiry, 'YYYY-MM-DD');
    }

    // Load initial mock data
    function loadInitialData() {
        // Generate mock data
        currentQRs = generateMockData(48);
    }

    // Generate mock data
    function generateMockData(count) {
        const types = ['lift', 'technician', 'location', 'equipment', 'maintenance'];
        const statuses = ['active', 'inactive', 'expired'];
        const data = [];
        
        for (let i = 1; i <= count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const created = new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));
            const expiry = new Date(created.getTime() + Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));
            
            data.push({
                id: `QR${String(i).padStart(4, '0')}`,
                type: type,
                target: `${getTypeText(type)} #${Math.floor(Math.random() * 100) + 1}`,
                status: status,
                created: created,
                expiry: expiry,
                scans: Math.floor(Math.random() * 100),
                metadata: {
                    note: `Додаткова інформація для QR${String(i).padStart(4, '0')}`,
                    location: `Локація ${Math.floor(Math.random() * 10) + 1}`
                }
            });
        }
        
        return data;
    }

    // Set up all event listeners
    function setupEventListeners() {
        // Заглушки для експорту PDF/XLSX/JSON
        $('#exportPDFBtn').on('click', function() {
            showNotification('Експорт у PDF (заглушка)', 'info');
        });
        $('#exportXLSXBtn').on('click', function() {
            showNotification('Експорт у XLSX (заглушка)', 'info');
        });
        $('#exportJSONBtn').on('click', function() {
            showNotification('Експорт у JSON (заглушка)', 'info');
        });
        // Filter changes
        $(elements.statusFilter).on('change', applyFilters);
        $(elements.typeFilter).on('change', applyFilters);
        $(elements.groupFilter).on('change', applyFilters);
        $(elements.locationFilter).on('change', applyFilters);
        $(elements.searchInput).on('keyup', debounce(applyFilters, 300));
        // Заглушка для кнопки "Зберегти фільтр"
        $('#saveFilterBtn').on('click', function() {
            showNotification('Збереження фільтра (заглушка)', 'info');
        });
        
        // Date range filter
        $(elements.dateRangeFilter).daterangepicker({
            autoUpdateInput: false,
            locale: {
                cancelLabel: 'Очистити',
                applyLabel: 'Застосувати',
                format: 'YYYY-MM-DD',
                daysOfWeek: ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
                monthNames: [
                    'Січень', 'Лютий', 'Березень', 'Квітень',
                    'Травень', 'Червень', 'Липень', 'Серпень',
                    'Вересень', 'Жовтень', 'Листопад', 'Грудень'
                ]
            }
        }).on('apply.daterangepicker', function(ev, picker) {
            $(this).val(picker.startDate.format('YYYY-MM-DD') + ' - ' + 
                        picker.endDate.format('YYYY-MM-DD'));
            currentFilters.dateRange = {
                start: picker.startDate,
                end: picker.endDate
            };
            applyFilters();
        }).on('cancel.daterangepicker', function() {
            $(this).val('');
            currentFilters.dateRange = null;
            applyFilters();
        });

        // Select all checkbox
        $('#selectAll').on('change', function() {
            const isChecked = $(this).prop('checked');
            $('.qr-checkbox').prop('checked', isChecked);
            updateSelectedQRs();
        });

        // Експорт CSV
        $('#exportCSVBtn').on('click', exportToCSV);
        
        // Відкриття модального вікна створення
        $('[data-target="#generateQRModal"]').on('click', function() {
            // Set default expiry date
            const defaultExpiry = new Date();
            defaultExpiry.setDate(defaultExpiry.getDate() + 30);
            document.getElementById('qrExpiry').value = formatDate(defaultExpiry, 'YYYY-MM-DD');
        });

        // Initialize Select2
        $('.select2').select2({
            theme: 'bootstrap4'
        });
    }

    // Setup form handlers
    function setupFormHandlers() {
        // Edit form submission
        $('#editQRForm').on('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            if (saveEditedQR(formData)) {
                $('#editQRModal').modal('hide');
                renderQRTable();
                updateStatistics();
                showNotification('QR-код успішно оновлено', 'success');
            }
        });
        
        // Create form submission
        $('#generateQRForm').on('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            createNewQR(formData);
            $('#generateQRModal').modal('hide');
            renderQRTable();
            updateStatistics();
            showNotification('Новий QR-код успішно створено', 'success');
            
            // Reset form
            this.reset();
            
            // Set default expiry date again
            const defaultExpiry = new Date();
            defaultExpiry.setDate(defaultExpiry.getDate() + 30);
            document.getElementById('qrExpiry').value = formatDate(defaultExpiry, 'YYYY-MM-DD');
        });
    }

    // Apply all current filters
    function applyFilters() {
    currentFilters.status = $(elements.statusFilter).val();
    currentFilters.type = $(elements.typeFilter).val();
    currentFilters.group = $(elements.groupFilter).val();
    currentFilters.location = $(elements.locationFilter).val();
    currentFilters.search = $(elements.searchInput).val();
    currentPage = 1; // Reset to first page when filters change
    renderQRTable();
    updateStatistics();
    }

    // Filter by status
    function filterByStatus(status) {
        $(elements.statusFilter).val(status).trigger('change');
    }

    // Reset all filters
    function resetFilters() {
        $(elements.statusFilter).val('all').trigger('change');
        $(elements.typeFilter).val('all').trigger('change');
        $(elements.groupFilter).val('all').trigger('change');
        $(elements.locationFilter).val('all').trigger('change');
        $(elements.dateRangeFilter).val('');
        $(elements.searchInput).val('');
        currentFilters = {
            status: 'all',
            type: 'all',
            group: 'all',
            location: 'all',
            dateRange: null,
            search: ''
        };
        applyFilters();
    }

    // Search QR codes
    function searchQR() {
        applyFilters();
    }

    // Render the QR table with current filters and pagination
    function renderQRTable() {
        const filteredData = filterQRData();
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        
        // Update pagination
        renderPagination(totalPages);
        
        // Get current page data
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
        const pageData = filteredData.slice(startIndex, endIndex);
        
        // Update counters
        $(elements.showingCount).text(`${startIndex + 1}-${endIndex}`);
        $(elements.totalCount).text(filteredData.length);
        
        // Render table rows
    const tbody = $(elements.tableBody);
    // Додаємо a11y-атрибути для таблиці та tbody
    $(elements.tableBody).closest('table').attr({'role':'table','aria-label':'Список QR-кодів'});
    $(elements.tableBody).attr('aria-live','polite');
    tbody.empty();
        
        if (pageData.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="10" class="text-center text-muted py-4">
                        <i class="fas fa-search fa-2x mb-2"></i>
                        <p>QR-кодів не знайдено</p>
                        <small>Спробуйте змінити параметри фільтрації</small>
                    </td>
                </tr>
            `);
            return;
        }
        
        pageData.forEach(qr => {
            const typeClass = `type-${qr.type}`;
            const statusClass = `badge-${getStatusClass(qr.status)}`;
            const statusText = getStatusText(qr.status);
            const typeText = getTypeText(qr.type);
            tbody.append('<tr data-qr-id="' + qr.id + '">' +
                '<td>' +
                    '<input type="checkbox" class="qr-checkbox" value="' + qr.id + '" onchange="qrManager.updateSelectedQRs()" aria-label="Вибрати QR-код ' + qr.id + '" tabindex="0">' +
                '</td>' +
                '<td>' +
                    '<div class="qr-image">' +
                        '<img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=' + qr.id + '" alt="QR Code" class="img-fluid">' +
                    '</div>' +
                '</td>' +
                '<td>' + qr.id + '</td>' +
                '<td><span class="badge qr-type-badge ' + typeClass + '">' + typeText + '</span></td>' +
                '<td>' + qr.target + '</td>' +
                '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
                '<td>' + formatDate(qr.created) + '</td>' +
                '<td>' + formatDate(qr.expiry) + '</td>' +
                '<td>' + qr.scans + '</td>' +
                '<td>' +
                    '<div class="action-buttons">' +
                        '<button class="btn btn-info btn-xs" onclick="qrManager.viewQR(\'' + qr.id + '\')" title="Перегляд" data-toggle="tooltip" data-placement="top" aria-label="Перегляд QR-коду" tabindex="0"><i class="fas fa-eye"></i></button>' +
                        '<button class="btn btn-primary btn-xs" onclick="qrManager.editQR(\'' + qr.id + '\')" title="Редагувати" data-toggle="tooltip" data-placement="top" aria-label="Редагувати QR-код" tabindex="0"><i class="fas fa-edit"></i></button>' +
                        '<button class="btn btn-secondary btn-xs" onclick="qrManager.showScanHistory(\'' + qr.id + '\')" title="Історія сканувань" data-toggle="tooltip" data-placement="top" aria-label="Історія сканувань QR-коду" tabindex="0"><i class="fas fa-history"></i></button>' +
                        '<button class="btn btn-warning btn-xs" onclick="qrManager.showTemplate(\'' + qr.id + '\')" title="Шаблон QR" data-toggle="tooltip" data-placement="top" aria-label="Шаблон QR-коду" tabindex="0"><i class="fas fa-file-alt"></i></button>' +
                        '<button class="btn btn-danger btn-xs" onclick="qrManager.deleteQR(\'' + qr.id + '\')" title="Видалити" data-toggle="tooltip" data-placement="top" aria-label="Видалити QR-код" tabindex="0"><i class="fas fa-trash"></i></button>' +
                    '</div>' +
                '</td>' +
            '</tr>');
        });
        // ініціалізація tooltips після рендеру
        $('[data-toggle="tooltip"]').tooltip();
        
        updateSelectedQRs();
    }

    // Filter data based on current filters
    function filterQRData() {
        return currentQRs.filter(qr => {
            // Status filter
            if (currentFilters.status !== 'all' && qr.status !== currentFilters.status) {
                return false;
            }
            // Type filter
            if (currentFilters.type !== 'all' && qr.type !== currentFilters.type) {
                return false;
            }
            // Group filter (заглушка: по metadata.group)
            if (currentFilters.group !== 'all') {
                if (!qr.metadata || qr.metadata.group !== currentFilters.group) {
                    return false;
                }
            }
            // Location filter (по metadata.location)
            if (currentFilters.location !== 'all') {
                if (!qr.metadata || qr.metadata.location !== currentFilters.location) {
                    return false;
                }
            }
            // Date range filter
            if (currentFilters.dateRange) {
                const created = new Date(qr.created);
                if (created < currentFilters.dateRange.start || 
                    created > currentFilters.dateRange.end) {
                    return false;
                }
            }
            // Search filter
            if (currentFilters.search) {
                const searchTerm = currentFilters.search.toLowerCase();
                const searchableText = [
                    qr.id,
                    qr.type,
                    qr.target,
                    qr.status,
                    formatDate(qr.created),
                    formatDate(qr.expiry)
                ].join(' ').toLowerCase();
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }
            return true;
        });
    }

    // Render pagination controls
    function renderPagination(totalPages) {
        const pagination = $(elements.pagination);
        pagination.empty();
        
        if (totalPages <= 1) return;
        
        // Previous button
        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        pageData.forEach(qr => {
            const typeClass = `type-${qr.type}`;
            const statusClass = `badge-${getStatusClass(qr.status)}`;
            const statusText = getStatusText(qr.status);
            const typeText = getTypeText(qr.type);
            tbody.append(`
                <tr data-qr-id="${qr.id}">
                    <td>
                        <input type="checkbox" class="qr-checkbox" value="${qr.id}" 
                               onchange="qrManager.updateSelectedQRs()" aria-label="Вибрати QR-код ${qr.id}" tabindex="0">
                    </td>
                    <td>
                        <div class="qr-image">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qr.id}" 
                                 alt="QR Code" class="img-fluid">
                        </div>
                    </td>
                    <td>${qr.id}</td>
                    <td><span class="badge qr-type-badge ${typeClass}">${typeText}</span></td>
                    <td>${qr.target}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>${formatDate(qr.created)}</td>
                    <td>${formatDate(qr.expiry)}</td>
                    <td>${qr.scans}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-info btn-xs" onclick="qrManager.viewQR('${qr.id}')" 
                                    title="Перегляд" data-toggle="tooltip" data-placement="top" aria-label="Перегляд QR-коду" tabindex="0">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-primary btn-xs" onclick="qrManager.editQR('${qr.id}')" 
                                    title="Редагувати" data-toggle="tooltip" data-placement="top" aria-label="Редагувати QR-код" tabindex="0">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-secondary btn-xs" onclick="qrManager.showScanHistory('${qr.id}')" 
                                    title="Історія сканувань" data-toggle="tooltip" data-placement="top" aria-label="Історія сканувань QR-коду" tabindex="0">
                                <i class="fas fa-history"></i>
                            </button>
                            <button class="btn btn-warning btn-xs" onclick="qrManager.showTemplate('${qr.id}')" 
                                    title="Шаблон QR" data-toggle="tooltip" data-placement="top" aria-label="Шаблон QR-коду" tabindex="0">
                                <i class="fas fa-file-alt"></i>
                            </button>
                            <button class="btn btn-danger btn-xs" onclick="qrManager.deleteQR('${qr.id}')" 
                                    title="Видалити" data-toggle="tooltip" data-placement="top" aria-label="Видалити QR-код" tabindex="0">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        });
    function updateStatistics() {
        const filteredData = filterQRData();
        
        $('#totalQRCodes').text(filteredData.length);
        $('#activeQRCodes').text(filteredData.filter(q => q.status === 'active').length);
        $('#inactiveQRCodes').text(filteredData.filter(q => q.status === 'inactive').length);
        $('#expiredQRCodes').text(filteredData.filter(q => q.status === 'expired').length);
    }

    // View QR details
    // View QR details (modal)
    function viewQR(id) {
        const qr = currentQRs.find(q => q.id === id);
        if (!qr) return;

        // Формуємо HTML для модального вікна (деталі)
        const html = `
            <div class=\"row\">
                <div class=\"col-md-6\">
                    <div class=\"mb-3 text-center\">
                        <img src=\"https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qr.id}\" alt=\"QR Code\" class=\"img-fluid mb-2\">
                        <div><span class=\"badge badge-info\">${qr.id}</span></div>
                    </div>
                </div>
                <div class=\"col-md-6\">
                    <ul class=\"list-group list-group-flush\">
                        <li class=\"list-group-item\"><b>Тип:</b> ${getTypeText(qr.type)}</li>
                        <li class=\"list-group-item\"><b>Призначення:</b> ${qr.target}</li>
                        <li class=\"list-group-item\"><b>Статус:</b> ${getStatusText(qr.status)}</li>
                        <li class=\"list-group-item\"><b>Створено:</b> ${formatDate(qr.created)}</li>
                        <li class=\"list-group-item\"><b>Дійсний до:</b> ${formatDate(qr.expiry)}</li>
                        <li class=\"list-group-item\"><b>Сканувань:</b> ${qr.scans}</li>
                        <li class=\"list-group-item\"><b>Додатково:</b> <pre style=\"white-space:pre-wrap;word-break:break-all;\">${qr.metadata ? JSON.stringify(qr.metadata, null, 2) : '-'}</pre></li>
                    </ul>
                </div>
            </div>
        `;
        $('#viewQRContent').html(html);
        // Активувати таб "Деталі" при відкритті
        $('#qrViewTabs a[href=\"#qrDetailsTab\"]').tab('show');
        $('#viewQRModal').modal('show');
        // Друк по кнопці
        setTimeout(() => {
            $('#printQRBtn').off('click').on('click', function() {
                window.print();
            });
        }, 200);
    }

    // Edit QR code - populate form
    function editQR(id) {
        const qr = currentQRs.find(q => q.id === id);
        if (!qr) return;
        
        // Populate edit form
        $('#editQrId').val(qr.id);
        $('#editQrType').val(qr.type);
        $('#editQrTarget').val(qr.target);
        $('#editQrStatus').val(qr.status);
        $('#editQrExpiry').val(formatDate(qr.expiry, 'YYYY-MM-DD'));
        $('#editQrMetadata').val(JSON.stringify(qr.metadata, null, 2));
        
        // Show edit modal
        $('#editQRModal').modal('show');
    }

    // Save edited QR code
    function saveEditedQR(formData) {
        const id = formData.get('id');
        const index = currentQRs.findIndex(q => q.id === id);
        
        if (index === -1) return false;
        
        // Update QR code data
        currentQRs[index] = {
            ...currentQRs[index],
            type: formData.get('type'),
            target: formData.get('target'),
            status: formData.get('status'),
            expiry: new Date(formData.get('expiry')),
            metadata: formData.get('metadata') ? JSON.parse(formData.get('metadata')) : {}
        };
        
        return true;
    }

    // Create new QR code
    function createNewQR(formData) {
        const newId = 'QR' + String(currentQRs.length + 1).padStart(4, '0');
        
        const newQR = {
            id: newId,
            type: formData.get('type'),
            target: formData.get('target'),
            status: formData.get('status'),
            created: new Date(),
            expiry: new Date(formData.get('expiry')),
            scans: 0,
            metadata: formData.get('metadata') ? JSON.parse(formData.get('metadata')) : {}
        };
        
        currentQRs.unshift(newQR);
        return newQR;
    }

    // Delete QR code with confirmation
    function deleteQR(id) {
        const qr = currentQRs.find(q => q.id === id);
        if (!qr) return;
        
        // Show confirmation dialog
        if (confirm(`Ви впевнені, що хочете видалити QR-код ${id}? Цю дію не можна скасувати.`)) {
            // Remove from array
            currentQRs = currentQRs.filter(q => q.id !== id);
            
            // Update UI
            renderQRTable();
            updateStatistics();
            
            // Show success message
            showNotification(`QR-код ${id} успішно видалено`, 'success');
        }
    }

    // Update selected QR codes
    function updateSelectedQRs() {
        selectedQRs = [];
        $('.qr-checkbox:checked').each(function() {
            selectedQRs.push($(this).val());
        });
        // Update select all checkbox
        const totalCheckboxes = $('.qr-checkbox').length;
        const checkedCheckboxes = $('.qr-checkbox:checked').length;
        $('#selectAll').prop('checked', totalCheckboxes > 0 && totalCheckboxes === checkedCheckboxes);
        // Масова панель
        if (selectedQRs.length > 0) {
            $('#bulkActionsPanel').show();
            $('#bulkSelectedCount').text(selectedQRs.length);
        } else {
            $('#bulkActionsPanel').hide();
        }
    }

    // Масові дії (заглушки)
    $(document).on('click', '#bulkDeleteBtn', function() {
        if (selectedQRs.length === 0) return;
        $('#bulkDeleteCount').text(selectedQRs.length);
        $('#bulkDeleteModal').modal('show');
    });

    // Підтвердження масового видалення
    $(document).on('click', '#confirmBulkDeleteBtn', function() {
        if (selectedQRs.length === 0) return;
        // Видаляємо вибрані QR-коди
        currentQRs = currentQRs.filter(qr => !selectedQRs.includes(qr.id));
        selectedQRs = [];
        renderQRTable();
        updateStatistics();
        $('#bulkDeleteModal').modal('hide');
        showNotification('Вибрані QR-коди видалено', 'success');
        addAuditLogEntry('Масове видалення', 'Видалено QR-кодів: ' + selectedQRs.length);
    });
    $(document).on('click', '#bulkStatusBtn', function() {
        if (selectedQRs.length === 0) return;
        $('#bulkStatusCount').text(selectedQRs.length);
        $('#bulkStatusModal').modal('show');
    });

    // Підтвердження масової зміни статусу
    $(document).on('click', '#confirmBulkStatusBtn', function() {
        if (selectedQRs.length === 0) return;
        const newStatus = $('#bulkStatusSelect').val();
        currentQRs.forEach(qr => {
            if (selectedQRs.includes(qr.id)) {
                qr.status = newStatus;
            }
        });
        renderQRTable();
        updateStatistics();
        $('#bulkStatusModal').modal('hide');
        showNotification('Статус вибраних QR-кодів змінено', 'success');
        addAuditLogEntry('Масова зміна статусу', `QR-кодів: ${selectedQRs.length}, новий статус: ${newStatus}`);
    });
    $(document).on('click', '#bulkExportBtn', function() {
        if (selectedQRs.length === 0) {
            showNotification('Виберіть QR-коди для експорту', 'warning');
            return;
        }
        exportToCSV(true);
    });

    // Export to CSV
    function exportToCSV(onlySelected = false) {
        let data = onlySelected ? currentQRs.filter(qr => selectedQRs.includes(qr.id)) : filterQRData();
        if (data.length === 0) {
            showNotification('Немає даних для експорту', 'warning');
            return;
        }
        // CSV header
        let csv = 'ID,Тип,Призначення,Статус,Створено,Дійсний до,Сканувань\n';
        // CSV data
        data.forEach(qr => {
            csv += `"${qr.id}","${getTypeText(qr.type)}","${qr.target}","${getStatusText(qr.status)}",`
                 + `"${formatDate(qr.created)}","${formatDate(qr.expiry)}","${qr.scans}"\n`;
        });
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `qr_codes_export_${formatDate(new Date(), 'YYYY-MM-DD')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Дані експортовано в CSV', 'success');
    }

    // Show notification
    function showNotification(message, type = 'info') {
        // Remove any existing notifications
        $('.alert-notification').remove();
        
        // Create notification element
        const notification = $(`
            <div class="alert alert-${type} alert-dismissible fade show alert-notification" role="alert">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : type === 'danger' ? 'fa-times-circle' : 'fa-info-circle'} mr-2"></i>
                ${message}
                <button type="button" class="close" data-dismiss="alert">
                    <span>&times;</span>
                </button>
            </div>
        `);
        
        // Add to page
        $('body').append(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.alert('close');
        }, 5000);
    }

    // Helper function to format dates
    function formatDate(date, format = 'YYYY-MM-DD') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const pad = (n) => n < 10 ? '0' + n : n;
        
        return format
            .replace('YYYY', date.getFullYear())
            .replace('MM', pad(date.getMonth() + 1))
            .replace('DD', pad(date.getDate()))
            .replace('HH', pad(date.getHours()))
            .replace('mm', pad(date.getMinutes()));
    }

    // Helper function for status display
    function getStatusClass(status) {
        const statusClasses = {
            'active': 'success',
            'inactive': 'secondary',
            'expired': 'danger'
        };
        return statusClasses[status] || 'secondary';
    }

    function getStatusText(status) {
        const statusTexts = {
            'active': 'Активний',
            'inactive': 'Неактивний',
            'expired': 'Протермінований'
        };
        return statusTexts[status] || status;
    }

    function getTypeText(type) {
        const typeTexts = {
            'lift': 'Ліфт',
            'technician': 'Технік',
            'location': 'Локація',
            'equipment': 'Обладнання',
            'maintenance': 'ТО'
        };
        return typeTexts[type] || type;
    }

    // Utility function for debouncing
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Public methods
    return {
        init: init,
        viewQR: viewQR,
        editQR: editQR,
        deleteQR: deleteQR,
        changePage: changePage,
        filterByStatus: filterByStatus,
        resetFilters: resetFilters,
        searchQR: searchQR,
        updateSelectedQRs: updateSelectedQRs,
        showScanHistory: showScanHistory,
        showTemplate: showTemplate
    };
}
// Initialize when document is ready
$(document).ready(function() {
    qrManager.init();
});