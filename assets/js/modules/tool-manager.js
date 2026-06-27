// tool-manager.js — Gestor de ferramentas para técnicos
class ToolManager {
    constructor() {
        this.tools = this.loadTools();
        this.filters = { status: 'all', category: 'all', location: 'all' };
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.applyFilters();
        this.updateStatistics();
        this.checkLowStock();
    }

    loadTools() {
        const saved = localStorage.getItem('tools');
        if (saved) return JSON.parse(saved);
        return [
            {
                id: 'TOOL-004',
                name: 'Detector de tensão',
                category: 'safety',
                status: 'available',
                location: 'van',
                image: 'voltage_detector.jpg',
                manufacturer: 'Klein Tools',
                model: 'NCVT-3',
                serialNumber: 'SN2024-004',
                purchaseDate: '2024-04-05',
                lastInspection: '2024-05-25',
                nextInspection: '2024-11-25',
                quantity: 2,
                minQuantity: 2,
                condition: 'excellent',
                notes: 'Novo, com desligamento automático'
            },
            {
                id: 'TOOL-005',
                name: 'Medidor laser de distância',
                category: 'measuring',
                status: 'broken',
                location: 'warehouse',
                image: 'laser_measure.jpg',
                manufacturer: 'Bosch',
                model: 'GLM 50 C',
                serialNumber: 'SN2024-005',
                purchaseDate: '2024-01-30',
                lastInspection: '2024-05-10',
                nextInspection: '2024-11-10',
                quantity: 1,
                minQuantity: 1,
                condition: 'broken',
                notes: 'Não apresenta resultados de medição',
                maintenanceHistory: [
                    {
                        date: '2024-06-05',
                        type: 'diagnostic',
                        technician: 'Técnico',
                        notes: 'Diagnóstico do ecrã — necessita substituição'
                    }
                ]
            }
        ];
    }

    saveTools() {
        localStorage.setItem('tools', JSON.stringify(this.tools));
    }

    setupEventListeners() {
        $('#statusFilter').on('change', () => { this.filters.status = $('#statusFilter').val(); this.applyFilters(); });
        $('#categoryFilter').on('change', () => { this.filters.category = $('#categoryFilter').val(); this.applyFilters(); });
        $('#locationFilter').on('change', () => { this.filters.location = $('#locationFilter').val(); this.applyFilters(); });
        $('#searchInput').on('input', () => this.applyFilters());
    }

    applyFilters() {
        const searchTerm = $('#searchInput').val().toLowerCase();
        const filtered = this.tools.filter(tool => {
            const matchesStatus = this.filters.status === 'all' || tool.status === this.filters.status;
            const matchesCategory = this.filters.category === 'all' || tool.category === this.filters.category;
            const matchesLocation = this.filters.location === 'all' || tool.location === this.filters.location;
            const matchesSearch = !searchTerm ||
                tool.name.toLowerCase().includes(searchTerm) ||
                tool.id.toLowerCase().includes(searchTerm) ||
                (tool.manufacturer && tool.manufacturer.toLowerCase().includes(searchTerm));
            return matchesStatus && matchesCategory && matchesLocation && matchesSearch;
        });
        this.renderTools(filtered);
        this.updateStats(filtered);
        this.updatePagination(filtered.length);
    }

    resetFilters() {
        this.filters = { status: 'all', category: 'all', location: 'all' };
        $('#statusFilter').val('all');
        $('#categoryFilter').val('all');
        $('#locationFilter').val('all');
        $('#searchInput').val('');
        this.currentPage = 1;
        this.applyFilters();
    }

    renderTools(tools) {
        const tbody = $('#toolsTableBody');
        tbody.empty();

        if (tools.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>Nenhuma ferramenta encontrada</h4>
                        <p>Tente alterar os parâmetros dos filtros</p>
                    </td>
                </tr>
            `);
            $('#itemsShown').text(0);
            $('#totalItems').text(0);
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = tools.slice(startIndex, startIndex + this.itemsPerPage);

        paginated.forEach(tool => {
            const row = `
                <tr>
                    <td>
                        <img src="../../assets/img/tools/${tool.image || 'default-tool.png'}"
                             alt="${tool.name}" class="tool-image"
                             onerror="this.src='../../assets/img/tools/default-tool.png'">
                    </td>
                    <td>
                        <strong>${tool.name}</strong><br>
                        <small class="text-muted">${tool.id}</small>
                    </td>
                    <td>${this.getCategoryText(tool.category)}</td>
                    <td><span class="tool-status status-${tool.status}">${this.getStatusText(tool.status)}</span></td>
                    <td>${this.getLocationText(tool.location)}</td>
                    <td>${this.formatDate(tool.lastInspection)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info btn-action" onclick="toolManager.viewTool('${tool.id}')" title="Ver">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary btn-action" onclick="toolManager.printToolLabel('${tool.id}')" title="Imprimir etiqueta">
                                <i class="fas fa-print"></i>
                            </button>
                            ${tool.status === 'available' ?
                                `<button class="btn btn-sm btn-success btn-action" onclick="toolManager.checkoutTool('${tool.id}')" title="Entregar">
                                    <i class="fas fa-sign-out-alt"></i>
                                </button>` : ''}
                            ${tool.status === 'in-use' ?
                                `<button class="btn btn-sm btn-warning btn-action" onclick="toolManager.returnTool('${tool.id}')" title="Devolver">
                                    <i class="fas fa-sign-in-alt"></i>
                                </button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        $('#itemsShown').text(paginated.length);
        $('#totalItems').text(tools.length);
    }

    getStatusText(status) {
        const statuses = {
            'available': 'Disponível',
            'in-use': 'Em uso',
            'maintenance': 'Manutenção',
            'broken': 'Avariado'
        };
        return statuses[status] || status;
    }

    getCategoryText(category) {
        const categories = {
            'mechanical': 'Mecânica',
            'electrical': 'Elétrica',
            'safety': 'Segurança',
            'measuring': 'Medição'
        };
        return categories[category] || category;
    }

    getLocationText(location) {
        const locations = {
            'van': 'Viatura',
            'warehouse': 'Armazém',
            'site': 'Em obra'
        };
        return locations[location] || location;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-PT');
    }

    updateStats(tools = this.tools) {
        $('#totalTools').text(tools.length);
        $('#toolsBadge').text(tools.filter(t => t.status === 'in-use' || t.status === 'maintenance').length);
        $('#availableTools').text(tools.filter(t => t.status === 'available').length);
        $('#inUseTools').text(tools.filter(t => t.status === 'in-use').length);
        $('#maintenanceTools').text(tools.filter(t => t.status === 'maintenance' || t.status === 'broken').length);
    }

    updateStatistics() {
        this.updateStats();
    }

    updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        $('#totalPages').text(totalPages);
        $('#currentPage').text(this.currentPage);
        $('.page-item').removeClass('disabled');
        if (this.currentPage === 1) $('.page-item:first-child').addClass('disabled');
        if (this.currentPage === totalPages) $('.page-item:last-child').addClass('disabled');
    }

    previousPage() {
        if (this.currentPage > 1) { this.currentPage--; this.applyFilters(); }
    }

    nextPage() {
        const totalPages = Math.ceil(this.tools.length / this.itemsPerPage);
        if (this.currentPage < totalPages) { this.currentPage++; this.applyFilters(); }
    }

    checkLowStock() {
        const lowStock = this.tools.filter(tool => tool.quantity <= tool.minQuantity);
        const container = $('#lowStockTools');
        container.empty();

        if (lowStock.length === 0) {
            container.html('<p class="text-muted text-center">Todas as ferramentas em quantidade suficiente</p>');
            return;
        }

        lowStock.forEach(tool => {
            container.append(`
                <div class="col-md-6">
                    <div class="low-stock-alert">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="tool-name">${tool.name}</div>
                                <div class="stock-info">
                                    Em stock: ${tool.quantity} un. | Mínimo: ${tool.minQuantity} un.
                                </div>
                            </div>
                            <button class="btn btn-sm btn-primary" onclick="toolManager.orderTool('${tool.id}')">
                                <i class="fas fa-plus"></i> Encomendar
                            </button>
                        </div>
                    </div>
                </div>
            `);
        });
    }

    viewTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;
        window.currentToolId = toolId;

        const html = `
            <div class="tool-details-grid">
                <div class="detail-section">
                    <h5><i class="fas fa-info-circle"></i> Informação geral</h5>
                    <div class="detail-item"><span class="detail-label">ID:</span><span class="detail-value">${tool.id}</span></div>
                    <div class="detail-item"><span class="detail-label">Nome:</span><span class="detail-value">${tool.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Categoria:</span><span class="detail-value">${this.getCategoryText(tool.category)}</span></div>
                    <div class="detail-item"><span class="detail-label">Fabricante:</span><span class="detail-value">${tool.manufacturer || 'Desconhecido'}</span></div>
                    <div class="detail-item"><span class="detail-label">Modelo:</span><span class="detail-value">${tool.model || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Número de série:</span><span class="detail-value">${tool.serialNumber || '-'}</span></div>
                </div>
                <div class="detail-section">
                    <h5><i class="fas fa-cogs"></i> Estado e localização</h5>
                    <div class="detail-item"><span class="detail-label">Estado:</span><span class="detail-value"><span class="tool-status status-${tool.status}">${this.getStatusText(tool.status)}</span></span></div>
                    <div class="detail-item"><span class="detail-label">Localização:</span><span class="detail-value">${this.getLocationText(tool.location)}</span></div>
                    <div class="detail-item"><span class="detail-label">Quantidade:</span><span class="detail-value">${tool.quantity} un.</span></div>
                    <div class="detail-item"><span class="detail-label">Mínimo:</span><span class="detail-value">${tool.minQuantity} un.</span></div>
                    <div class="detail-item"><span class="detail-label">Última verificação:</span><span class="detail-value">${this.formatDate(tool.lastInspection)}</span></div>
                    <div class="detail-item"><span class="detail-label">Próxima verificação:</span><span class="detail-value">${this.formatDate(tool.nextInspection)}</span></div>
                </div>
                ${tool.notes ? `
                    <div class="detail-section" style="grid-column: 1/-1">
                        <h5><i class="fas fa-sticky-note"></i> Notas</h5>
                        <p>${tool.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;

        $('#toolDetailsContent').html(html);
        $('#viewToolModal').modal('show');
    }

    checkoutTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;
        if (tool.status !== 'available') {
            this.showNotification('Ferramenta não disponível para entrega', 'warning');
            return;
        }
        tool.status = 'in-use';
        this.saveTools();
        this.applyFilters();
        this.checkLowStock();
        this.showNotification(`Ferramenta "${tool.name}" entregue`, 'success');
    }

    returnTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;
        tool.status = 'available';
        this.saveTools();
        this.applyFilters();
        this.checkLowStock();
        this.showNotification(`Ferramenta "${tool.name}" devolvida`, 'success');
    }

    orderTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;
        this.showNotification(`Encomenda de "${tool.name}" registada`, 'info');
    }

    scanTool() {
        this.showNotification('Função de leitura QR em desenvolvimento', 'info');
    }

    printToolLabel(toolId) {
        this.showNotification('A preparar etiqueta para impressão...', 'info');
    }

    prepareCheckoutForm(toolId) {
        window.currentToolId = toolId;
    }

    exportTools() {
        const headers = ['ID', 'Nome', 'Categoria', 'Estado', 'Localização', 'Fabricante', 'Modelo', 'Última verificação'];
        const rows = this.tools.map(t => [
            t.id, t.name, this.getCategoryText(t.category), this.getStatusText(t.status),
            this.getLocationText(t.location), t.manufacturer || '', t.model || '',
            this.formatDate(t.lastInspection)
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ferramentas_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        this.showNotification('Exportação concluída', 'success');
    }

    showNotification(message, type = 'info') {
        if (typeof Swal !== 'undefined') {
            Swal.mixin({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000, timerProgressBar: true })
                .fire({ icon: type, title: message });
        } else if (typeof toastr !== 'undefined') {
            toastr[type] ? toastr[type](message) : toastr.info(message);
        }
    }
}

$(document).ready(function() {
    window.toolManager = new ToolManager();
});
