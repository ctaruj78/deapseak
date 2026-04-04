// invoice-manager.js - РОЗШИРЕНА ВЕРСІЯ ДЛЯ ADMINLTE
class InvoiceManager {
    constructor() {
        this.invoices = [];
        this.filters = {
            status: 'all',
            period: 'current',
            sort: 'date-desc'
        };
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.init();
    }

    init() {
        this.loadInvoices();
        this.setupEventListeners();
        this.updateSummary();
    }

    async loadInvoices() {
        try {
            // Спроба отримати дані з API
            const response = await fetch('/api/invoices', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                const json = await response.json();
                const raw = json.data ?? json.invoices ?? json;
                this.invoices = Array.isArray(raw) ? raw : [];
                localStorage.setItem('invoices', JSON.stringify(this.invoices));
            } else {
                throw new Error('API недоступне');
            }
        } catch (error) {
            console.warn('Використання локальних даних:', error);
            this.invoices = JSON.parse(localStorage.getItem('invoices')) || [];
            
            if (this.invoices.length === 0) {
                this.invoices = this.createSampleInvoices();
                localStorage.setItem('invoices', JSON.stringify(this.invoices));
            }
        }

        this.applyFilters();
    }

    createSampleInvoices() {
        return [
            {
                id: 'INV-2024-001',
                number: 'INV-2024-001',
                date: '2024-01-15',
                dueDate: '2024-01-31',
                clientId: 'client-1',
                amount: 12500.00,
                status: 'paid',
                items: [
                    { 
                        description: 'Технічне обслуговування - січень 2024', 
                        quantity: 1, 
                        price: 12500.00,
                        lift: 'Otis Gen2 - вул. Центральна, 12'
                    }
                ],
                tax: 0.00,
                total: 12500.00,
                paidDate: '2024-01-20',
                paymentMethod: 'bank_transfer'
            },
            {
                id: 'INV-2024-002',
                number: 'INV-2024-002',
                date: '2024-02-01',
                dueDate: '2024-02-15',
                clientId: 'client-1',
                amount: 8300.00,
                status: 'pending',
                items: [
                    { 
                        description: 'Аварійний ремонт дверей ліфта', 
                        quantity: 1, 
                        price: 8300.00,
                        lift: 'Schindler 3300 - пр. Перемоги, 45'
                    }
                ],
                tax: 0.00,
                total: 8300.00
            },
            {
                id: 'INV-2024-003',
                number: 'INV-2024-003',
                date: '2024-02-10',
                dueDate: '2024-02-25',
                clientId: 'client-1',
                amount: 15600.00,
                status: 'overdue',
                items: [
                    { 
                        description: 'Планове ТО та заміна деталей', 
                        quantity: 1, 
                        price: 15600.00,
                        lift: 'KONE MonoSpace - вул. Шевченка, 78'
                    }
                ],
                tax: 0.00,
                total: 15600.00
            },
            {
                id: 'INV-2024-004',
                number: 'INV-2024-004',
                date: '2024-03-01',
                dueDate: '2024-03-15',
                clientId: 'client-1',
                amount: 9200.00,
                status: 'pending',
                items: [
                    { 
                        description: 'Регулярне технічне обслуговування', 
                        quantity: 1, 
                        price: 9200.00,
                        lift: 'Otis Gen2 - вул. Центральна, 12'
                    }
                ],
                tax: 0.00,
                total: 9200.00
            }
        ];
    }

    setupEventListeners() {
        $('#statusFilter').on('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        $('#periodFilter').on('change', (e) => {
            this.filters.period = e.target.value;
            this.applyFilters();
        });

        $('#sortFilter').on('change', (e) => {
            this.filters.sort = e.target.value;
            this.applyFilters();
        });
    }

    applyFilters() {
        let filteredInvoices = [...this.invoices];

        // Фільтрація за статусом
        if (this.filters.status !== 'all') {
            filteredInvoices = filteredInvoices.filter(invoice => 
                invoice.status === this.filters.status
            );
        }

        // Фільтрація за періодом
        filteredInvoices = this.filterByPeriod(filteredInvoices);

        // Сортування
        filteredInvoices = this.sortInvoices(filteredInvoices);

        this.renderInvoices(filteredInvoices);
        this.updateSummary(filteredInvoices);
        this.updatePagination(filteredInvoices);
    }

    resetFilters() {
        $('#statusFilter').val('all');
        $('#periodFilter').val('current');
        $('#sortFilter').val('date-desc');
        this.filters = { status: 'all', period: 'current', sort: 'date-desc' };
        this.currentPage = 1;
        this.applyFilters();
    }

    filterByPeriod(invoices) {
        const now = new Date();
        let startDate, endDate;

        switch (this.filters.period) {
            case 'current':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                return invoices;
        }

        return invoices.filter(invoice => {
            const invoiceDate = new Date(invoice.date);
            return invoiceDate >= startDate && invoiceDate <= endDate;
        });
    }

    sortInvoices(invoices) {
        return invoices.sort((a, b) => {
            switch (this.filters.sort) {
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'amount-asc':
                    return a.amount - b.amount;
                case 'amount-desc':
                    return b.amount - a.amount;
                default:
                    return new Date(b.date) - new Date(a.date);
            }
        });
    }

    renderInvoices(invoices) {
        const tbody = $('#invoicesTableBody');
        tbody.empty();

        if (invoices.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>Рахунків не знайдено</h4>
                        <p>Спробуйте змінити параметри фільтрів</p>
                    </td>
                </tr>
            `);
            return;
        }

        // Пагінація
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedInvoices = invoices.slice(startIndex, startIndex + this.itemsPerPage);

        paginatedInvoices.forEach(invoice => {
            const row = this.createInvoiceRow(invoice);
            tbody.append(row);
        });
    }

    createInvoiceRow(invoice) {
        const statusClass = this.getStatusClass(invoice.status);
        const statusText = this.getStatusText(invoice.status);
        const isOverdue = invoice.status === 'overdue';
        
        return $(`
            <tr class="${isOverdue ? 'table-danger' : ''}">
                <td><strong>${invoice.number}</strong></td>
                <td>${this.formatDate(invoice.date)}</td>
                <td>
                    <div>${invoice.items[0]?.description || 'Немає опису'}</div>
                    <small class="text-muted">${invoice.items[0]?.lift || ''}</small>
                </td>
                <td><strong>€${invoice.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    ${this.formatDate(invoice.dueDate)}
                    ${isOverdue ? '<br><small class="text-danger">Прострочено</small>' : ''}
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info btn-icon" onclick="invoiceManager.viewInvoice('${invoice.id}')" title="Перегляд">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="invoiceManager.downloadInvoice('${invoice.id}')" title="Завантажити">
                            <i class="fas fa-download"></i>
                        </button>
                        ${invoice.status === 'pending' || invoice.status === 'overdue' ? 
                            `<button class="btn btn-sm btn-success btn-icon" onclick="invoiceManager.payInvoice('${invoice.id}')" title="Оплатити">
                                <i class="fas fa-credit-card"></i>
                            </button>` : ''}
                    </div>
                </td>
            </tr>
        `);
    }

    getStatusClass(status) {
        const classes = {
            'paid': 'status-paid',
            'pending': 'status-pending',
            'overdue': 'status-overdue'
        };
        return classes[status] || 'status-pending';
    }

    getStatusText(status) {
        const statuses = {
            'paid': 'Оплачено',
            'pending': 'В очікуванні',
            'overdue': 'Прострочено'
        };
        return statuses[status] || status;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-PT');
    }

    updateSummary(invoices = this.invoices) {
        const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
        const pendingAmount = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
        const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);

        $('#totalAmount').text(`€${totalAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`);
        $('#paidAmount').text(`€${paidAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`);
        $('#pendingAmount').text(`€${pendingAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`);
        $('#overdueAmount').text(`€${overdueAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`);
        
        // Оновлення лічильника в сайдбарі
        $('#invoicesCount').text(invoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue').length);
    }

    updatePagination(invoices) {
        const totalPages = Math.ceil(invoices.length / this.itemsPerPage);
        $('#currentPage').text(this.currentPage);
        $('#totalPages').text(totalPages || 1);
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.applyFilters();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.getFilteredInvoices().length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.applyFilters();
        }
    }

    getFilteredInvoices() {
        let filteredInvoices = [...this.invoices];

        if (this.filters.status !== 'all') {
            filteredInvoices = filteredInvoices.filter(invoice => 
                invoice.status === this.filters.status
            );
        }

        return this.filterByPeriod(filteredInvoices);
    }

    viewInvoice(invoiceId) {
        const invoice = this.invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return;

        currentInvoiceId = invoiceId;
        const modalContent = this.createInvoiceDetails(invoice);
        $('#invoiceModalContent').html(modalContent);
        
        // Оновлення видимості кнопки оплати
        if (invoice.status === 'paid') {
            $('#payInvoiceBtn').hide();
        } else {
            $('#payInvoiceBtn').show();
        }
        
        $('#invoiceModal').modal('show');
    }

    createInvoiceDetails(invoice) {
        const statusClass = this.getStatusClass(invoice.status);
        const statusText = this.getStatusText(invoice.status);
        const isOverdue = invoice.status === 'overdue';
        
        return `
            <div class="invoice-details">
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h4>Рахунок-фактура ${invoice.number}</h4>
                        <p><strong>Дата створення:</strong> ${this.formatDate(invoice.date)}</p>
                        <p><strong>Термін оплати:</strong> ${this.formatDate(invoice.dueDate)}</p>
                        ${isOverdue ? '<p class="text-danger"><strong>❗ Прострочено</strong></p>' : ''}
                    </div>
                    <div class="col-md-6 text-right">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        ${invoice.paidDate ? `<p><strong>Дата оплати:</strong> ${this.formatDate(invoice.paidDate)}</p>` : ''}
                        ${invoice.paymentMethod ? `<p><strong>Спосіб оплати:</strong> ${this.getPaymentMethodText(invoice.paymentMethod)}</p>` : ''}
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table table-bordered">
                        <thead class="thead-light">
                            <tr>
                                <th>Опис</th>
                                <th>Ліфт</th>
                                <th class="text-right">Кількість</th>
                                <th class="text-right">Ціна</th>
                                <th class="text-right">Сума</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoice.items.map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td>${item.lift || 'Н/Д'}</td>
                                    <td class="text-right">${item.quantity}</td>
                                    <td class="text-right">€${item.price.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                                    <td class="text-right">€${(item.quantity * item.price).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="bg-light p-3 rounded">
                            <h5>Dados Bancários</h5>
                            <p class="mb-1"><i class="fas fa-university text-success"></i> <strong>Banco BPI</strong></p>
                            <p class="mb-1">IBAN: <strong>PT50 0010 0000 5854 8320 0015 4</strong></p>
                            <p class="mb-1">BIC/SWIFT: <strong>BBPIPTPL</strong></p>
                            <p class="mb-0">Titular: <strong>FestLift - Elevadores e Serviços, Lda.</strong></p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="totals-section">
                            <div class="d-flex justify-content-between">
                                <span>Subtotal:</span>
                                <span>€${invoice.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                            </div>
                            ${invoice.tax > 0 ? `
                                <div class="d-flex justify-content-between">
                                    <span>IVA:</span>
                                    <span>€${invoice.tax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                                </div>
                            ` : ''}
                            <hr>
                            <div class="d-flex justify-content-between total-amount">
                                <strong>Total a pagar:</strong>
                                <strong>€${invoice.total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getPaymentMethodText(method) {
        const methods = {
            'card': 'Cartão de Crédito/Débito',
            'bank_transfer': 'Transferência Bancária',
            'multibanco': 'Transferência Bancária',
            'mbway': 'MB Way',
            'credit_card': 'Cartão de Crédito/Débito',
            'mobile_payment': 'MB Way'
        };
        return methods[method] || method;
    }

    downloadInvoice(invoiceId) {
        const invoice = this.invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return;

        this.showNotification(`A preparar fatura ${invoice.number}...`, 'info');

        setTimeout(() => {
            const printWindow = window.open('', '_blank', 'width=860,height=700');
            if (!printWindow) {
                this.showNotification('Active os pop-ups para descarregar a fatura.', 'warning');
                return;
            }
            printWindow.document.write(this.generatePrintHTML(invoice));
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 600);
            this.showNotification('Fatura aberta — utilize Imprimir / Guardar como PDF.', 'success');
        }, 400);
    }

    generatePrintHTML(invoice) {
        const clientName = $('#clientName').text() || 'Cliente';
        const rows = invoice.items.map(item => `
            <tr>
                <td>${item.description || ''}</td>
                <td>${item.lift || '—'}</td>
                <td style="text-align:center">${item.quantity}</td>
                <td style="text-align:right">€${(item.price ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                <td style="text-align:right">€${((item.quantity ?? 0) * (item.price ?? 0)).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
            </tr>`).join('');
        return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8">
            <title>Fatura ${invoice.number}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
                h2 { color: #1a73e8; } table { width:100%; border-collapse:collapse; margin-top:16px; }
                th { background:#f0f4ff; padding:8px; text-align:left; border:1px solid #ccc; }
                td { padding:8px; border:1px solid #ccc; }
                .totals { margin-top:16px; text-align:right; }
                .label { color:#777; font-size:13px; } .info { margin-bottom:6px; }
                @media print { button { display:none; } }
            </style></head><body>
            <h2>FestLift — Elevadores e Serviços, Lda.</h2>
            <p class="info"><strong>Fatura N.º:</strong> ${invoice.number}</p>
            <p class="info"><strong>Data:</strong> ${this.formatDate(invoice.date)}</p>
            <p class="info"><strong>Prazo de pagamento:</strong> ${this.formatDate(invoice.dueDate)}</p>
            <p class="info"><strong>Cliente:</strong> ${clientName}</p>
            <p class="info"><strong>Estado:</strong> ${this.getStatusText(invoice.status)}</p>
            <table><thead><tr><th>Descrição</th><th>Elevador</th><th>Qtd</th><th>Preço</th><th>Total</th></tr></thead>
            <tbody>${rows}</tbody></table>
            <div class="totals">
                <p><span class="label">Subtotal: </span>€${(invoice.amount ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                ${(invoice.tax ?? 0) > 0 ? `<p><span class="label">IVA: </span>€${invoice.tax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>` : ''}
                <p><strong>Total: €${(invoice.total ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</strong></p>
            </div>
            <hr style="margin-top:30px">
            <p style="font-size:12px;color:#555">Dados bancários: Banco BPI · IBAN PT50 0010 0000 5854 8320 0015 4 · BIC BBPIPTPL<br>
            Titular: FestLift - Elevadores e Serviços, Lda. · info@festlift.pt</p>
            </body></html>`;
    }

    payInvoice(invoiceId) {
        const invoice = this.invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return;

        // Close the invoice detail modal first to avoid stacked modals
        const delay = $('#invoiceModal').hasClass('show') ? 350 : 0;
        $('#invoiceModal').modal('hide');
        setTimeout(() => { this.showPaymentOptions(invoice); }, delay);
    }

    showPaymentOptions(invoice) {
        const modalContent = `
            <div class="payment-options">
                <h4>Pagamento da fatura ${invoice.number}</h4>
                <p class="text-center mb-4">Total a pagar: <strong>€${invoice.total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</strong></p>
                
                <div class="payment-option" onclick="invoiceManager.selectPaymentOption('multibanco')">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="paymentMethod" id="multibancoPayment" value="multibanco">
                        <label class="form-check-label" for="multibancoPayment">
                            <i class="fas fa-university fa-2x text-success"></i>
                            <h5>Transferência Bancária</h5>
                            <p>Banco BPI — IBAN PT50...</p>
                        </label>
                    </div>
                </div>
                
                <div class="payment-option" onclick="invoiceManager.selectPaymentOption('mbway')">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="paymentMethod" id="mbwayPayment" value="mbway">
                        <label class="form-check-label" for="mbwayPayment">
                            <i class="fas fa-mobile-alt fa-2x text-info"></i>
                            <h5>MB Way</h5>
                            <p>Pagamento pelo telemóvel</p>
                        </label>
                    </div>
                </div>
                
                <div class="payment-option" onclick="invoiceManager.selectPaymentOption('card')">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="paymentMethod" id="cardPayment" value="card">
                        <label class="form-check-label" for="cardPayment">
                            <i class="fas fa-credit-card fa-2x text-primary"></i>
                            <h5>Cartão de Crédito/Débito</h5>
                            <p>Em breve disponível</p>
                        </label>
                    </div>
                </div>
                
                <div class="mt-4" id="paymentDetails" style="display: none;">
                    <!-- Transferência Bancária -->
                    <div id="multibancoFields" style="display:none;">
                        <div class="bg-light p-3 rounded">
                            <p class="mb-1"><strong>Banco:</strong> Banco BPI</p>
                            <p class="mb-1"><strong>IBAN:</strong> PT50 0010 0000 5854 8320 0015 4</p>
                            <p class="mb-1"><strong>BIC/SWIFT:</strong> BBPIPTPL</p>
                            <p class="mb-1"><strong>Titular:</strong> FestLift - Elevadores e Serviços, Lda.</p>
                            <p class="mb-0"><strong>Referência:</strong> Fatura ${invoice.number}</p>
                        </div>
                        <small class="text-muted d-block mt-2">Após efectuar a transferência, envie o comprovativo para <strong>info@festlift.pt</strong>.</small>
                    </div>
                    <!-- MB Way -->
                    <div id="mbwayFields" style="display:none;">
                        <div class="bg-light p-3 rounded">
                            <p class="mb-1">Para pagar por <strong>MB Way</strong>, contacte-nos para recepcionar o pedido de pagamento:</p>
                            <p class="mb-1"><i class="fas fa-phone"></i> <strong>+351 XXX XXX XXX</strong></p>
                            <p class="mb-0"><i class="fas fa-envelope"></i> <strong>info@festlift.pt</strong></p>
                        </div>
                        <small class="text-muted d-block mt-2">Indique o número da fatura: <strong>${invoice.number}</strong></small>
                    </div>
                    <!-- Cartão -->
                    <div id="cardFields" style="display:none;">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i> O pagamento por cartão estará disponível em breve. Para já, utilize transferência bancária ou MB Way.
                        </div>
                    </div>
                    <button class="btn btn-success btn-block mt-3" id="confirmPaymentBtn" onclick="invoiceManager.processPayment('${invoice.id}')">
                        <i class="fas fa-check"></i> Confirmar pagamento
                    </button>
                </div>
            </div>
        `;

        $('#paymentModalContent').html(modalContent);
        $('#paymentModal').modal('show');
    }

    selectPaymentOption(option) {
        $(`input[name="paymentMethod"][value="${option}"]`).prop('checked', true);
        $('.payment-option').removeClass('selected');
        $(`input[name="paymentMethod"][value="${option}"]`).closest('.payment-option').addClass('selected');
        
        $('#cardFields, #mbwayFields, #multibancoFields').hide();
        if (option === 'card') {
            $('#paymentDetails').slideDown();
            $('#cardFields').show();
        } else if (option === 'mbway') {
            $('#paymentDetails').slideDown();
            $('#mbwayFields').show();
        } else if (option === 'multibanco') {
            $('#paymentDetails').slideDown();
            $('#multibancoFields').show();
        } else {
            $('#paymentDetails').slideUp();
        }
    }

    processPayment(invoiceId) {
        const invoice = this.invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return;

        const paymentMethod = $('input[name="paymentMethod"]:checked').val();
        
        if (!paymentMethod) {
            this.showNotification('Будь ласка, виберіть спосіб оплати', 'error');
            return;
        }

        // Імітація процесу оплати
        this.showNotification('Обробка платежу...', 'info');
        
        setTimeout(() => {
            invoice.status = 'paid';
            invoice.paidDate = new Date().toISOString().split('T')[0];
            invoice.paymentMethod = paymentMethod;
            
            localStorage.setItem('invoices', JSON.stringify(this.invoices));
            
            $('#paymentModal').modal('hide');
            $('#invoiceModal').modal('hide');
            
            this.applyFilters();
            this.updateSummary();
            
            this.showNotification('Рахунок успішно оплачено!', 'success');
        }, 2000);
    }

    exportInvoices() {
        const filteredInvoices = this.getFilteredInvoices();
        
        if (filteredInvoices.length === 0) {
            this.showNotification('Немає рахунків для експорту', 'warning');
            return;
        }

        this.showNotification('Підготовка експорту...', 'info');
        
        // Створення CSV
        const csvContent = this.convertToCSV(filteredInvoices);
        this.downloadCSV(csvContent, `рахунки_${new Date().toISOString().split('T')[0]}.csv`);
    }

    convertToCSV(invoices) {
        const headers = ['Номер', 'Дата', 'Опис', 'Сума', 'Статус', 'Термін оплати'];
        const rows = invoices.map(invoice => [
            invoice.number,
            invoice.date,
            invoice.items[0]?.description || '',
            invoice.amount,
            this.getStatusText(invoice.status),
            invoice.dueDate
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        this.showNotification('Експорт успішно завершено', 'success');
    }

    printInvoices() {
        window.print();
    }

    setupCardPayment() {
        this.showNotification('A configurar pagamento por cartão...', 'info');
    }

    showMultibancoDetails() {
        const details = `Banco: Banco BPI\nIBAN: PT50 0010 0000 5854 8320 0015 4\nBIC/SWIFT: BBPIPTPL\nTitular: FestLift - Elevadores e Serviços, Lda.`;
        
        $('#invoiceModalContent').html(`
            <div class="bank-details">
                <h4>Dados Bancários para Transferência</h4>
                <div class="bg-light p-4 rounded">
                    <p class="mb-1"><strong>Banco:</strong> Banco BPI</p>
                    <p class="mb-1"><strong>IBAN:</strong> PT50 0010 0000 5854 8320 0015 4</p>
                    <p class="mb-1"><strong>BIC/SWIFT:</strong> BBPIPTPL</p>
                    <p class="mb-0"><strong>Titular:</strong> FestLift - Elevadores e Serviços, Lda.</p>
                </div>
                <p class="text-muted mt-2 small">Após efectuar a transferência, envie o comprovativo para <strong>info@festlift.pt</strong>.</p>
                <div class="mt-3">
                    <button class="btn btn-secondary" onclick="invoiceManager.copyMultibancoDetails()">
                        <i class="fas fa-copy"></i> Copiar dados
                    </button>
                </div>
            </div>
        `);
        $('#invoiceModal').modal('show');
    }

    copyMultibancoDetails() {
        const details = `Banco: Banco BPI\nIBAN: PT50 0010 0000 5854 8320 0015 4\nBIC/SWIFT: BBPIPTPL\nTitular: FestLift - Elevadores e Serviços, Lda.`;
        
        navigator.clipboard.writeText(details).then(() => {
            this.showNotification('Dados copiados para a área de transferência', 'success');
        });
    }

    setupMBWay() {
        this.showNotification('Para MB Way, contacte-nos em info@festlift.pt', 'info');
    }

    showNotification(message, type = 'success') {
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            const iconMap = { success: 'success', error: 'error', warning: 'warning', info: 'info' };
            Toast.fire({ icon: iconMap[type] || 'info', title: message });
        } else {
            alert(message);
        }
    }
}

// Ініціалізація відбувається в invoices.html