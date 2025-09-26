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
        loadAPISettings();

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

    // Load API settings
    function loadAPISettings() {
        const settings = JSON.parse(localStorage.getItem('qr_api_settings'));
        if (settings) {
            $('#apiEndpoint').val(settings.endpoint || '');
            $('#apiKey').val(settings.apiKey || '');
        }
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
            // Reset dynamic fields
            $('#dynamicFields').hide();
            $('.dynamic-section').hide();
            $('#qrPreview').html(`
                <div class="text-muted">
                    <i class="fas fa-qrcode fa-3x mb-2"></i>
                    <p>QR-код з'явиться після заповнення полів</p>
                </div>
            `);
        });

        // Update preview on input change
        $('#qrType, #qrTarget').on('change input', updateQRPreview);

        // Initialize Select2
        $('.select2').select2({
            theme: 'bootstrap4'
        });
    }

    // Handle type change in generate modal
    function onTypeChange() {
        const type = $('#qrType').val();
        $('#dynamicFields').hide();
        $('.dynamic-section').hide();

        // Очистити список призначень
        const targetSelect = $('#qrTarget');
        targetSelect.empty();
        targetSelect.append('<option value="">Оберіть призначення...</option>');

        if (type) {
            $('#dynamicFields').show();
            $(`#${type}Fields`).show();

            // Заповнити список призначень залежно від типу
            populateTargetOptions(type);
            updateQRPreview();

            // Додати обробник події для оновлення preview при виборі призначення
            $('#qrTarget').off('change').on('change', updateQRPreview);
        }
    }

    // Заповнення списку призначень залежно від типу
    function populateTargetOptions(type) {
        const targetSelect = $('#qrTarget');
        let options = [];

        switch (type) {
            case 'lift':
                // Отримати список ліфтів з localStorage
                const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
                if (lifts.length > 0) {
                    lifts.forEach(lift => {
                        const displayName = lift.model || lift.name || `Ліфт ${lift.id}`;
                        const displayAddress = lift.location || lift.address || '';
                        options.push({
                            value: `lift_${lift.id}`,
                            text: `${displayName} - ${displayAddress}`
                        });
                    });
                } else {
                    // Додати приклад, якщо немає ліфтів
                    options.push({ value: 'lift_sample_1', text: 'Ліфт №101 - вул. Шевченка, 10' });
                    options.push({ value: 'lift_sample_2', text: 'Ліфт №102 - вул. Франка, 25' });
                }
                break;

            case 'technician':
                options = [
                    { value: 'tech_ivanov', text: 'Іванов Іван - Електрик' },
                    { value: 'tech_petrov', text: 'Петров Петро - Механік' },
                    { value: 'tech_sidorov', text: 'Сидоров Олександр - Інженер' }
                ];
                break;

            case 'location':
                options = [
                    { value: 'loc_entrance', text: 'Вхід в будівлю' },
                    { value: 'loc_parking', text: 'Парковка' },
                    { value: 'loc_storage', text: 'Склад обладнання' },
                    { value: 'loc_office', text: 'Офіс адміністрації' }
                ];
                break;

            case 'equipment':
                options = [
                    { value: 'equip_generator', text: 'Генератор резервного живлення' },
                    { value: 'equip_pump', text: 'Насосна станція' },
                    { value: 'equip_ventilation', text: 'Система вентиляції' },
                    { value: 'equip_electrical', text: 'Електрощитова' }
                ];
                break;

            case 'maintenance':
                options = [
                    { value: 'maint_monthly', text: 'Щомісячне ТО' },
                    { value: 'maint_quarterly', text: 'Щоквартальне ТО' },
                    { value: 'maint_yearly', text: 'Щорічне ТО' },
                    { value: 'maint_emergency', text: 'Аварійне обслуговування' }
                ];
                break;
        }

        // Додати опції до селекта
        options.forEach(option => {
            targetSelect.append(`<option value="${option.value}">${option.text}</option>`);
        });
    }

    // Update QR preview
    function updateQRPreview() {
        const type = $('#qrType').val();
        const target = $('#qrTarget').val();
        
        if (type && target) {
            // Generate preview QR (using placeholder for now)
            const previewHtml = `
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Type:${type},Target:${encodeURIComponent(target)}" 
                     alt="QR Preview" class="img-fluid">
                <p class="mt-2 text-muted small">Попередній перегляд</p>
            `;
            $('#qrPreview').html(previewHtml);
        } else {
            $('#qrPreview').html(`
                <div class="text-muted">
                    <i class="fas fa-qrcode fa-3x mb-2"></i>
                    <p>QR-код з'явиться після заповнення полів</p>
                </div>
            `);
        }
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
            
            // Validate expiry date
            const expiryDate = new Date($('#qrExpiry').val());
            const minDate = new Date();
            minDate.setDate(minDate.getDate() + 30);
            
            if (expiryDate < minDate) {
                showNotification('Дата закінчення повинна бути мінімум через 30 днів', 'warning');
                return;
            }
            
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
        const type = $('#qrType').val();
        
        // Gather metadata from dynamic fields
        let metadata = {};
        if (formData.get('metadata')) {
            try {
                metadata = JSON.parse(formData.get('metadata'));
            } catch (e) {
                metadata = { note: formData.get('metadata') };
            }
        }
        
        // Add type-specific data
        if (type === 'lift') {
            metadata.liftDetails = {
                number: $('#liftNumber').val(),
                manufacturer: $('#liftManufacturer').val(),
                model: $('#liftModel').val(),
                address: $('#liftAddress').val(),
                floors: $('#liftFloors').val(),
                capacity: $('#liftCapacity').val()
            };
        } else if (type === 'technician') {
            metadata.techDetails = {
                name: $('#techName').val(),
                specialization: $('#techSpecialization').val()
            };
        } else if (type === 'location') {
            metadata.locationDetails = {
                address: $('#locationAddress').val(),
                lat: $('#locationLat').val(),
                lng: $('#locationLng').val()
            };
        }
        
        const newQR = {
            id: newId,
            type: type,
            target: $('#qrTarget').val(),
            status: $('#qrStatus').val(),
            created: new Date(),
            expiry: new Date($('#qrExpiry').val()),
            scans: 0,
            metadata: metadata
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
        showTemplate: showTemplate,
        onTypeChange: onTypeChange,
        updateQRPreview: updateQRPreview,
        importFromLifts: importFromLifts,
        importFromLocations: importFromLocations,
        exportToCloud: exportToCloud,
        syncWithMobile: syncWithMobile,
        testAPIConnection: testAPIConnection,
        saveAPISettings: saveAPISettings
    };
}

// API Integration Functions
function importFromLifts() {
    try {
        const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
        if (lifts.length === 0) {
            showNotification('Немає ліфтів для імпорту. Спочатку додайте ліфти в систему.', 'warning');
            return;
        }

        let importedCount = 0;
        lifts.forEach(lift => {
            // Перевірити, чи вже існує QR-код для цього ліфта
            const existingQR = currentQRs.find(qr => qr.target === `lift_${lift.id}`);
            if (!existingQR) {
                const newQR = {
                    id: `QR${String(currentQRs.length + 1).padStart(4, '0')}`,
                    type: 'lift',
                    target: `lift_${lift.id}`,
                    status: 'active',
                    created: new Date(),
                    expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 рік
                    liftData: lift
                };
                currentQRs.push(newQR);
                importedCount++;
            }
        });

        if (importedCount > 0) {
            saveQRsToStorage();
            renderQRTable();
            updateStatistics();
            showNotification(`Імпортовано ${importedCount} QR-кодів з ліфтів`, 'success');
        } else {
            showNotification('Всі ліфти вже мають QR-коди', 'info');
        }
    } catch (error) {
        console.error('Error importing from lifts:', error);
        showNotification('Помилка імпорту з ліфтів', 'error');
    }
}

function importFromLocations() {
    try {
        const locations = [
            { id: 'entrance_main', name: 'Головний вхід', address: 'вул. Центральна, 1' },
            { id: 'parking', name: 'Парковка', address: 'вул. Центральна, 1 (двір)' },
            { id: 'storage', name: 'Склад обладнання', address: 'вул. Центральна, 1 (підвал)' },
            { id: 'office', name: 'Адміністративний офіс', address: 'вул. Центральна, 1, офіс 101' }
        ];

        let importedCount = 0;
        locations.forEach(location => {
            const existingQR = currentQRs.find(qr => qr.target === `loc_${location.id}`);
            if (!existingQR) {
                const newQR = {
                    id: `QR${String(currentQRs.length + 1).padStart(4, '0')}`,
                    type: 'location',
                    target: `loc_${location.id}`,
                    status: 'active',
                    created: new Date(),
                    expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    locationData: location
                };
                currentQRs.push(newQR);
                importedCount++;
            }
        });

        if (importedCount > 0) {
            saveQRsToStorage();
            renderQRTable();
            updateStatistics();
            showNotification(`Імпортовано ${importedCount} QR-кодів локацій`, 'success');
        } else {
            showNotification('Всі локації вже мають QR-коди', 'info');
        }
    } catch (error) {
        console.error('Error importing locations:', error);
        showNotification('Помилка імпорту локацій', 'error');
    }
}

function exportToCloud() {
    try {
        const exportData = {
            qrs: currentQRs,
            exportedAt: new Date(),
            version: '1.0'
        };

        // Імітація експорту в хмару
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-codes-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('QR-коди експортовано в хмарне сховище', 'success');
    } catch (error) {
        console.error('Error exporting to cloud:', error);
        showNotification('Помилка експорту в хмару', 'error');
    }
}

function syncWithMobile() {
    try {
        // Імітація синхронізації з мобільним додатком
        showNotification('Синхронізація з мобільним додатком розпочата...', 'info');

        setTimeout(() => {
            showNotification('Синхронізація завершена успішно', 'success');
        }, 2000);
    } catch (error) {
        console.error('Error syncing with mobile:', error);
        showNotification('Помилка синхронізації з мобільним додатком', 'error');
    }
}

function testAPIConnection() {
    const endpoint = $('#apiEndpoint').val();
    const apiKey = $('#apiKey').val();

    if (!endpoint) {
        showNotification('Введіть API Endpoint', 'warning');
        return;
    }

    $('#apiStatusAlert').show();
    $('#apiStatusMessage').text('Перевірка з\'єднання з API...');

    // Імітація перевірки API
    setTimeout(() => {
        if (endpoint.includes('liftmaster.com') && apiKey) {
            $('#apiStatusAlert').removeClass('alert-info alert-danger').addClass('alert-success');
            $('#apiStatusMessage').html('<i class="fas fa-check-circle"></i> З\'єднання успішне');
        } else {
            $('#apiStatusAlert').removeClass('alert-info alert-success').addClass('alert-danger');
            $('#apiStatusMessage').html('<i class="fas fa-exclamation-triangle"></i> Помилка з\'єднання або невірний API ключ');
        }
    }, 1500);
}

function saveAPISettings() {
    const endpoint = $('#apiEndpoint').val();
    const apiKey = $('#apiKey').val();

    if (!endpoint || !apiKey) {
        showNotification('Заповніть всі поля API налаштувань', 'warning');
        return;
    }

    const settings = {
        endpoint: endpoint,
        apiKey: apiKey,
        savedAt: new Date()
    };

    localStorage.setItem('qr_api_settings', JSON.stringify(settings));
    showNotification('API налаштування збережено', 'success');
}

// Initialize when document is ready
$(document).ready(function() {
    if (typeof qrManager !== 'undefined') {
        qrManager.init();
    }
});
$(document).ready(function() {
    qrManager.init();
});