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
        updateSavedFiltersList();

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
        // Експорт функцій
        $('#exportPDFBtn').on('click', function() {
            exportToPDF();
        });
        $('#exportXLSXBtn').on('click', function() {
            exportToXLSX();
        });
        $('#exportJSONBtn').on('click', function() {
            exportToJSON();
        });
        // Filter changes
        $(elements.statusFilter).on('change', applyFilters);
        $(elements.typeFilter).on('change', applyFilters);
        $(elements.groupFilter).on('change', applyFilters);
        $(elements.locationFilter).on('change', applyFilters);
        $(elements.searchInput).on('keyup', debounce(applyFilters, 300));
        // Збереження фільтра
        $('#saveFilterBtn').on('click', function() {
            saveCurrentFilter();
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
        console.log('onTypeChange called');
        const type = $('#qrType').val();
        console.log('Selected type:', type);

        $('#dynamicFields').hide();
        $('.dynamic-section').hide();

        // Очистити список призначень
        const targetSelect = $('#qrTarget');
        targetSelect.empty();
        targetSelect.append('<option value="">Оберіть призначення...</option>');

        if (type) {
            console.log('Showing dynamic fields for type:', type);
            $('#dynamicFields').show();
            $(`#${type}Fields`).show();

            // Заповнити список призначень залежно від типу
            populateTargetOptions(type);
            updateQRPreview();

            // Додати обробник події для оновлення preview при виборі призначення
            $('#qrTarget').off('change').on('change', updateQRPreview);
        } else {
            console.log('No type selected, hiding fields');
        }
    }

    // Заповнення списку призначень залежно від типу
    function populateTargetOptions(type) {
        console.log('populateTargetOptions called with type:', type);
        const targetSelect = $('#qrTarget');
        let options = [];

        switch (type) {
            case 'lift':
                console.log('Processing lift type');
                // Отримати список ліфтів з localStorage
                const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
                console.log('Found lifts:', lifts.length);

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
                    console.log('No lifts found, using samples');
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
        console.log('Adding options to select:', options.length);
        options.forEach(option => {
            targetSelect.append(`<option value="${option.value}">${option.text}</option>`);
        });
        console.log('Options added successfully');
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

    // Load saved API settings
    function loadAPISettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('qr_api_settings'));
            if (settings) {
                $('#apiEndpoint').val(settings.endpoint || '');
                $('#apiKey').val(settings.apiKey || '');
                console.log('API settings loaded from storage');
            }
        } catch (error) {
            console.error('Error loading API settings:', error);
        }
    }
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
            console.log('Generate QR form submitted');

            // Validate expiry date
            const expiryDate = new Date($('#qrExpiry').val());
            const minDate = new Date();
            minDate.setDate(minDate.getDate() + 30);

            if (expiryDate < minDate) {
                showNotification('Дата закінчення повинна бути мінімум через 30 днів', 'warning');
                return;
            }

            const formData = new FormData(this);
            console.log('Form data collected, calling createNewQR');

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
            // Group filter
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
        
        addAuditLogEntry('Редагування QR', `Відредаговано QR-код ${id}`);
        return true;
    }

    // Create new QR code
    function createNewQR(formData) {
        console.log('createNewQR called');
        const newId = 'QR' + String(currentQRs.length + 1).padStart(4, '0');
        const type = $('#qrType').val();
        const target = $('#qrTarget').val();

        console.log('Creating QR with:', { newId, type, target });

        if (!type || !target) {
            console.error('Missing required fields:', { type, target });
            showNotification('Заповніть всі обов\'язкові поля', 'error');
            return;
        }
        
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
        addAuditLogEntry('Створення QR', `Створено QR-код ${newQR.id} типу ${getTypeText(type)}`);
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
            addAuditLogEntry('Видалення QR', `Видалено QR-код ${id}`);
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

    // Export to PDF
    function exportToPDF() {
        const data = filterQRData();
        if (data.length === 0) {
            showNotification('Немає даних для експорту', 'warning');
            return;
        }

        // Створюємо HTML для PDF
        let html = `
            <html>
            <head>
                <title>QR Коди - Експорт</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .header { text-align: center; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Звіт QR кодів</h1>
                    <p>Дата експорту: ${formatDate(new Date())}</p>
                    <p>Загальна кількість: ${data.length}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Тип</th>
                            <th>Призначення</th>
                            <th>Статус</th>
                            <th>Створено</th>
                            <th>Дійсний до</th>
                            <th>Сканувань</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.forEach(qr => {
            html += `
                <tr>
                    <td>${qr.id}</td>
                    <td>${getTypeText(qr.type)}</td>
                    <td>${qr.target}</td>
                    <td>${getStatusText(qr.status)}</td>
                    <td>${formatDate(qr.created)}</td>
                    <td>${formatDate(qr.expiry)}</td>
                    <td>${qr.scans}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        // Відкриваємо в новому вікні для друку
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();

        showNotification('PDF експортовано (відкрито у новому вікні для друку)', 'success');
    }

    // Export to XLSX (використовуємо CSV як XLSX)
    function exportToXLSX() {
        const data = filterQRData();
        if (data.length === 0) {
            showNotification('Немає даних для експорту', 'warning');
            return;
        }

        // Створюємо XLSX-like CSV з BOM для Excel
        let csv = '\uFEFFID,Тип,Призначення,Статус,Створено,Дійсний до,Сканувань\n';
        data.forEach(qr => {
            csv += `"${qr.id}","${getTypeText(qr.type)}","${qr.target}","${getStatusText(qr.status)}",`
                 + `"${formatDate(qr.created)}","${formatDate(qr.expiry)}","${qr.scans}"\n`;
        });

        const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `qr_codes_export_${formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Дані експортовано в XLSX', 'success');
    }

    // Export to JSON
    function exportToJSON() {
        const data = filterQRData();
        if (data.length === 0) {
            showNotification('Немає даних для експорту', 'warning');
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            totalRecords: data.length,
            filters: currentFilters,
            qrCodes: data
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `qr_codes_export_${formatDate(new Date(), 'YYYY-MM-DD')}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Дані експортовано в JSON', 'success');
    }

    // Save current filter
    function saveCurrentFilter() {
        const filterName = prompt('Введіть назву для збереженого фільтра:');
        if (!filterName || filterName.trim() === '') {
            showNotification('Назва фільтра обов\'язкова', 'warning');
            return;
        }

        const savedFilters = JSON.parse(localStorage.getItem('qr_saved_filters') || '[]');
        const filterData = {
            name: filterName.trim(),
            filters: { ...currentFilters },
            savedAt: new Date().toISOString()
        };

        // Перевіряємо, чи фільтр з такою назвою вже існує
        const existingIndex = savedFilters.findIndex(f => f.name === filterName);
        if (existingIndex >= 0) {
            if (!confirm(`Фільтр "${filterName}" вже існує. Перезаписати?`)) {
                return;
            }
            savedFilters[existingIndex] = filterData;
        } else {
            savedFilters.push(filterData);
        }

        localStorage.setItem('qr_saved_filters', JSON.stringify(savedFilters));
        showNotification(`Фільтр "${filterName}" збережено`, 'success');
        updateSavedFiltersList();
    }

    // Update saved filters list
    function updateSavedFiltersList() {
        const savedFilters = JSON.parse(localStorage.getItem('qr_saved_filters') || '[]');
        const container = $('#savedFiltersList');
        container.empty();

        if (savedFilters.length === 0) {
            container.html('<li class="list-group-item text-muted">Немає збережених фільтрів</li>');
            return;
        }

        savedFilters.forEach((filter, index) => {
            const item = $(`
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${filter.name}</strong>
                        <br><small class="text-muted">Збережено: ${formatDate(filter.savedAt)}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-primary mr-1" onclick="qrManager.loadSavedFilter(${index})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="qrManager.deleteSavedFilter(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </li>
            `);
            container.append(item);
        });
    }

    // Load saved filter
    function loadSavedFilter(index) {
        const savedFilters = JSON.parse(localStorage.getItem('qr_saved_filters') || '[]');
        if (savedFilters[index]) {
            currentFilters = { ...savedFilters[index].filters };
            applyFilters();
            showNotification(`Фільтр "${savedFilters[index].name}" завантажено`, 'success');
        }
    }

    // Delete saved filter
    function deleteSavedFilter(index) {
        const savedFilters = JSON.parse(localStorage.getItem('qr_saved_filters') || '[]');
        if (savedFilters[index]) {
            const filterName = savedFilters[index].name;
            savedFilters.splice(index, 1);
            localStorage.setItem('qr_saved_filters', JSON.stringify(savedFilters));
            updateSavedFiltersList();
            showNotification(`Фільтр "${filterName}" видалено`, 'success');
        }
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

    // Show scan history for QR code
    function showScanHistory(id) {
        const qr = currentQRs.find(q => q.id === id);
        if (!qr) return;

        // Generate mock scan history data
        const scanHistory = [];
        const scanCount = qr.scans || Math.floor(Math.random() * 20) + 1;

        for (let i = 0; i < scanCount; i++) {
            const scanDate = new Date(qr.created.getTime() + Math.random() * (Date.now() - qr.created.getTime()));
            scanHistory.push({
                date: scanDate,
                location: `Локація ${Math.floor(Math.random() * 10) + 1}`,
                user: `Технік ${Math.floor(Math.random() * 5) + 1}`,
                device: ['Android', 'iOS', 'Web'][Math.floor(Math.random() * 3)],
                success: Math.random() > 0.1 // 90% success rate
            });
        }

        // Sort by date descending
        scanHistory.sort((a, b) => b.date - a.date);

        // Build history HTML
        let historyHtml = `
            <div class="scan-history-header mb-3">
                <h5><i class="fas fa-history mr-2"></i>Історія сканувань QR-коду ${qr.id}</h5>
                <p class="text-muted">Загальна кількість сканувань: ${scanHistory.length}</p>
            </div>
            <div class="table-responsive">
                <table class="table table-striped table-sm">
                    <thead>
                        <tr>
                            <th>Дата/час</th>
                            <th>Локація</th>
                            <th>Користувач</th>
                            <th>Пристрій</th>
                            <th>Результат</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        scanHistory.forEach(scan => {
            const statusClass = scan.success ? 'success' : 'danger';
            const statusText = scan.success ? 'Успішно' : 'Помилка';
            historyHtml += `
                <tr>
                    <td>${formatDate(scan.date, 'YYYY-MM-DD HH:mm')}</td>
                    <td>${scan.location}</td>
                    <td>${scan.user}</td>
                    <td><i class="fas fa-${scan.device === 'Android' ? 'android' : scan.device === 'iOS' ? 'apple' : 'globe'}"></i> ${scan.device}</td>
                    <td><span class="badge badge-${statusClass}">${statusText}</span></td>
                </tr>
            `;
        });

        historyHtml += `
                    </tbody>
                </table>
            </div>
        `;

        $('#scanHistoryContent').html(historyHtml);
        $('#scanHistoryModal').modal('show');
    }

    // Show QR template/print view
    function showTemplate(id) {
        const qr = currentQRs.find(q => q.id === id);
        if (!qr) return;

        // Build template HTML
        const templateHtml = `
            <div class="qr-template">
                <div class="row">
                    <div class="col-md-6">
                        <div class="qr-template-preview text-center p-4 border rounded">
                            <h5 class="mb-3">QR-код для друку</h5>
                            <div class="qr-code-large mb-3">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qr.id}" 
                                     alt="QR Code" class="img-fluid border">
                            </div>
                            <div class="qr-info">
                                <h6>${qr.id}</h6>
                                <p class="text-muted mb-1">Тип: ${getTypeText(qr.type)}</p>
                                <p class="text-muted mb-1">Призначення: ${qr.target}</p>
                                <p class="text-muted">Створено: ${formatDate(qr.created)}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="template-options">
                            <h5>Опції шаблону</h5>
                            <div class="form-group">
                                <label>Розмір QR-коду:</label>
                                <select class="form-control" id="templateSize">
                                    <option value="small">Малий (100x100px)</option>
                                    <option value="medium" selected>Середній (200x200px)</option>
                                    <option value="large">Великий (300x300px)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Формат експорту:</label>
                                <select class="form-control" id="templateFormat">
                                    <option value="png">PNG</option>
                                    <option value="jpg">JPG</option>
                                    <option value="svg">SVG</option>
                                    <option value="pdf">PDF</option>
                                </select>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="includeText" checked>
                                <label class="form-check-label" for="includeText">
                                    Включити текстову інформацію
                                </label>
                            </div>
                            <div class="mt-3">
                                <button class="btn btn-primary" onclick="qrManager.downloadTemplate('${qr.id}')">
                                    <i class="fas fa-download mr-2"></i>Завантажити
                                </button>
                                <button class="btn btn-secondary ml-2" onclick="window.print()">
                                    <i class="fas fa-print mr-2"></i>Друк
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('#templateContent').html(templateHtml);
        $('#templateModal').modal('show');
    }

    // Download QR template
    function downloadTemplate(id) {
        const qr = currentQRs.find(q => q.id === id);
        if (!qr) return;

        const size = $('#templateSize').val();
        const format = $('#templateFormat').val();
        const includeText = $('#includeText').is(':checked');

        let sizePx = '200x200';
        switch (size) {
            case 'small': sizePx = '100x100'; break;
            case 'large': sizePx = '300x300'; break;
        }

        // For demo purposes, just download the QR code image
        const link = document.createElement('a');
        link.href = `https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}&data=${qr.id}`;
        link.download = `qr-${qr.id}.${format}`;
        link.click();

        showNotification(`Шаблон QR-коду ${qr.id} завантажено`, 'success');
    }

    // API Integration Functions
    function importFromLifts() {
        try {
            console.log('Starting import from lifts...');
            const lifts = JSON.parse(localStorage.getItem('lifts')) || [];
            console.log('Found lifts in storage:', lifts.length);

            if (lifts.length === 0) {
                // Якщо немає ліфтів, створити тестові дані
                console.log('No lifts found, creating sample data...');
                const sampleLifts = [
                    { id: 'LIFT-001', model: 'Otis Gen2', location: 'вул. Шевченка, 10', address: 'вул. Шевченка, 10' },
                    { id: 'LIFT-002', model: 'Schindler 3300', location: 'вул. Франка, 25', address: 'вул. Франка, 25' },
                    { id: 'LIFT-003', model: 'Kone MonoSpace', location: 'пр. Перемоги, 50', address: 'пр. Перемоги, 50' }
                ];
                localStorage.setItem('lifts', JSON.stringify(sampleLifts));
                showNotification('Створено тестові дані ліфтів для демонстрації', 'info');
                return;
            }

            let importedCount = 0;
            let skippedCount = 0;

            lifts.forEach(lift => {
                // Перевірити, чи вже існує QR-код для цього ліфта
                const existingQR = currentQRs.find(qr => qr.type === 'lift' && qr.target === `lift_${lift.id}`);
                if (!existingQR) {
                    const newQR = {
                        id: `QR${String(currentQRs.length + 1).padStart(4, '0')}`,
                        type: 'lift',
                        target: `lift_${lift.id}`,
                        status: 'active',
                        created: new Date(),
                        expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 рік
                        scans: 0,
                        metadata: {
                            liftDetails: {
                                id: lift.id,
                                model: lift.model || 'Невідомо',
                                location: lift.location || lift.address || 'Невідомо',
                                manufacturer: lift.manufacturer || 'Невідомо'
                            }
                        }
                    };
                    currentQRs.push(newQR);
                    importedCount++;
                    addAuditLogEntry('Імпорт', `Створено QR-код для ліфта ${lift.id}`);
                } else {
                    skippedCount++;
                }
            });

            // Зберегти зміни
            saveQRsToStorage();
            renderQRTable();
            updateStatistics();

            if (importedCount > 0) {
                showNotification(`Імпортовано ${importedCount} QR-кодів з ліфтів${skippedCount > 0 ? ` (${skippedCount} пропущено як існуючі)` : ''}`, 'success');
            } else {
                showNotification(`Всі ${skippedCount} ліфти вже мають QR-коди`, 'info');
            }

        } catch (error) {
            console.error('Error importing from lifts:', error);
            showNotification('Помилка імпорту з ліфтів: ' + error.message, 'error');
        }
    }

    function importFromLocations() {
        try {
            console.log('Starting import from locations...');
            const locations = JSON.parse(localStorage.getItem('locations')) || [];
            console.log('Found locations in storage:', locations.length);

            if (locations.length === 0) {
                // Якщо немає локацій, створити тестові дані
                console.log('No locations found, creating sample data...');
                const sampleLocations = [
                    { id: 'LOC-001', name: 'ЖК Сонячний', address: 'вул. Сонячна, 15', city: 'Київ' },
                    { id: 'LOC-002', name: 'Офісний центр', address: 'пр. Перемоги, 100', city: 'Київ' },
                    { id: 'LOC-003', name: 'Торговий центр', address: 'вул. Хрещатик, 25', city: 'Київ' }
                ];
                localStorage.setItem('locations', JSON.stringify(sampleLocations));
                showNotification('Створено тестові дані локацій для демонстрації', 'info');
                return;
            }

            let importedCount = 0;
            let skippedCount = 0;

            locations.forEach(location => {
                // Перевірити, чи вже існує QR-код для цієї локації
                const existingQR = currentQRs.find(qr => qr.type === 'location' && qr.target === `location_${location.id}`);
                if (!existingQR) {
                    const newQR = {
                        id: `QR${String(currentQRs.length + 1).padStart(4, '0')}`,
                        type: 'location',
                        target: `location_${location.id}`,
                        status: 'active',
                        created: new Date(),
                        expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 рік
                        scans: 0,
                        metadata: {
                            locationDetails: {
                                id: location.id,
                                name: location.name,
                                address: location.address,
                                city: location.city || 'Невідомо'
                            }
                        }
                    };
                    currentQRs.push(newQR);
                    importedCount++;
                    addAuditLogEntry('Імпорт', `Створено QR-код для локації ${location.name}`);
                } else {
                    skippedCount++;
                }
            });

            // Зберегти зміни
            saveQRsToStorage();
            renderQRTable();
            updateStatistics();

            if (importedCount > 0) {
                showNotification(`Імпортовано ${importedCount} QR-кодів з локацій${skippedCount > 0 ? ` (${skippedCount} пропущено як існуючі)` : ''}`, 'success');
            } else {
                showNotification(`Всі ${skippedCount} локації вже мають QR-коди`, 'info');
            }

        } catch (error) {
            console.error('Error importing from locations:', error);
            showNotification('Помилка імпорту з локацій: ' + error.message, 'error');
        }
    }

    function exportToCloud() {
        try {
            console.log('Starting export to cloud...');
            const exportData = {
                qrs: currentQRs,
                exportedAt: new Date().toISOString(),
                version: '1.0',
                totalRecords: currentQRs.length,
                filters: currentFilters
            };

            // Створити JSON файл для завантаження
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `qr-codes-cloud-export-${formatDate(new Date(), 'YYYY-MM-DD')}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            addAuditLogEntry('Експорт', `Експортовано ${currentQRs.length} QR-кодів у хмарне сховище`);
            showNotification(`QR-коди експортовано в хмарне сховище (${currentQRs.length} записів)`, 'success');
        } catch (error) {
            console.error('Error exporting to cloud:', error);
            showNotification('Помилка експорту в хмару: ' + error.message, 'error');
        }
    }

    function syncWithMobile() {
        try {
            console.log('Starting sync with mobile app...');
            showNotification('Синхронізація з мобільним додатком розпочата...', 'info');

            // Імітація процесу синхронізації
            const syncSteps = [
                'Перевірка з\'єднання з мобільним додатком...',
                'Синхронізація QR-кодів...',
                'Оновлення даних техніків...',
                'Синхронізація звітів...',
                'Завершення синхронізації...'
            ];

            let stepIndex = 0;
            const syncInterval = setInterval(() => {
                if (stepIndex < syncSteps.length) {
                    showNotification(syncSteps[stepIndex], 'info');
                    stepIndex++;
                } else {
                    clearInterval(syncInterval);
                    // Імітувати оновлення даних після синхронізації
                    const syncedCount = Math.floor(Math.random() * currentQRs.length) + 1;
                    addAuditLogEntry('Синхронізація', `Синхронізовано ${syncedCount} записів з мобільним додатком`);
                    showNotification(`Синхронізація завершена успішно. Синхронізовано ${syncedCount} записів.`, 'success');
                }
            }, 800);

        } catch (error) {
            console.error('Error syncing with mobile:', error);
            showNotification('Помилка синхронізації з мобільним додатком: ' + error.message, 'error');
        }
    }

    function testAPIConnection() {
        const endpoint = $('#apiEndpoint').val();
        const apiKey = $('#apiKey').val();

        if (!endpoint) {
            showNotification('Введіть API Endpoint', 'warning');
            return;
        }

        console.log('Testing API connection to:', endpoint);
        $('#apiStatusAlert').show();
        $('#apiStatusAlert').removeClass('alert-success alert-danger').addClass('alert-info');
        $('#apiStatusMessage').html('<i class="fas fa-spinner fa-spin"></i> Перевірка з\'єднання з API...');

        // Імітація перевірки API з більш реалістичною логікою
        setTimeout(() => {
            try {
                // Перевірити формат URL
                const urlPattern = /^https?:\/\/.+/;
                if (!urlPattern.test(endpoint)) {
                    $('#apiStatusAlert').removeClass('alert-info alert-success').addClass('alert-danger');
                    $('#apiStatusMessage').html('<i class="fas fa-exclamation-triangle"></i> Невірний формат URL');
                    return;
                }

                // Перевірити API ключ
                if (!apiKey || apiKey.length < 10) {
                    $('#apiStatusAlert').removeClass('alert-info alert-success').addClass('alert-danger');
                    $('#apiStatusMessage').html('<i class="fas fa-exclamation-triangle"></i> API ключ занадто короткий або відсутній');
                    return;
                }

                // Імітувати успішне з'єднання для певних endpoint'ів
                const validEndpoints = [
                    'https://api.liftmaster.com',
                    'https://api.elevatorsys.com',
                    'https://api.otis.com',
                    'https://api.schindler.com'
                ];

                const isValidEndpoint = validEndpoints.some(valid => endpoint.includes(valid.split('//')[1]));

                if (isValidEndpoint && apiKey.length >= 20) {
                    $('#apiStatusAlert').removeClass('alert-info alert-danger').addClass('alert-success');
                    $('#apiStatusMessage').html('<i class="fas fa-check-circle"></i> З\'єднання успішне. API готовий до використання.');
                    addAuditLogEntry('API тест', `Успішне з\'єднання з ${endpoint}`);
                } else {
                    $('#apiStatusAlert').removeClass('alert-info alert-success').addClass('alert-danger');
                    $('#apiStatusMessage').html('<i class="fas fa-exclamation-triangle"></i> Помилка з\'єднання. Перевірте endpoint та API ключ.');
                }
            } catch (error) {
                $('#apiStatusAlert').removeClass('alert-info alert-success').addClass('alert-danger');
                $('#apiStatusMessage').html('<i class="fas fa-exclamation-triangle"></i> Помилка тестування API: ' + error.message);
            }
        }, 2000);
    }

    function saveAPISettings() {
        const endpoint = $('#apiEndpoint').val();
        const apiKey = $('#apiKey').val();

        if (!endpoint || !apiKey) {
            showNotification('Заповніть всі поля API налаштувань', 'warning');
            return;
        }

        try {
            console.log('Saving API settings...');
            const settings = {
                endpoint: endpoint.trim(),
                apiKey: apiKey.trim(),
                savedAt: new Date().toISOString(),
                lastTested: null,
                isValid: false
            };

            localStorage.setItem('qr_api_settings', JSON.stringify(settings));
            addAuditLogEntry('Налаштування', 'API налаштування збережено');
            showNotification('API налаштування збережено успішно', 'success');

            // Автоматично протестувати після збереження
            setTimeout(() => {
                testAPIConnection();
            }, 500);

        } catch (error) {
            console.error('Error saving API settings:', error);
            showNotification('Помилка збереження API налаштувань: ' + error.message, 'error');
        }
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
        downloadTemplate: downloadTemplate,
        onTypeChange: onTypeChange,
        updateQRPreview: updateQRPreview,
        importFromLifts: importFromLifts,
        importFromLocations: importFromLocations,
        exportToCloud: exportToCloud,
        syncWithMobile: syncWithMobile,
        testAPIConnection: testAPIConnection,
        saveAPISettings: saveAPISettings,
        loadSavedFilter: loadSavedFilter,
        deleteSavedFilter: deleteSavedFilter
    };
}

// API Integration Functions (moved outside qrManager for global access)
function importFromLifts() {
    if (typeof qrManager !== 'undefined' && qrManager.importFromLifts) {
        qrManager.importFromLifts();
    }
}

function importFromLocations() {
    if (typeof qrManager !== 'undefined' && qrManager.importFromLocations) {
        qrManager.importFromLocations();
    }
}

function exportToCloud() {
    if (typeof qrManager !== 'undefined' && qrManager.exportToCloud) {
        qrManager.exportToCloud();
    }
}

function syncWithMobile() {
    if (typeof qrManager !== 'undefined' && qrManager.syncWithMobile) {
        qrManager.syncWithMobile();
    }
}

function testAPIConnection() {
    if (typeof qrManager !== 'undefined' && qrManager.testAPIConnection) {
        qrManager.testAPIConnection();
    }
}

function saveAPISettings() {
    if (typeof qrManager !== 'undefined' && qrManager.saveAPISettings) {
        qrManager.saveAPISettings();
    }
}

// Initialize when document is ready
$(document).ready(function() {
    if (typeof qrManager !== 'undefined') {
        qrManager.init();
    }
});