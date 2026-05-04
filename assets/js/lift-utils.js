// Lift Utilities and Helper Functions
class LiftUtils {
    static formatStatus(status) {
        const statusMap = {
            'active': { text: 'Ativo', class: 'status-active', icon: 'fa-check-circle' },
            'maintenance': { text: 'Manutenção', class: 'status-maintenance', icon: 'fa-wrench' },
            'repair': { text: 'Reparação', class: 'status-repair', icon: 'fa-tools' },
            'emergency': { text: 'Emergência', class: 'status-emergency', icon: 'fa-exclamation-triangle' },
            'inactive': { text: 'Inativo', class: 'status-inactive', icon: 'fa-times-circle' }
        };
        
        const statusInfo = statusMap[status] || { text: status, class: 'status-unknown', icon: 'fa-question-circle' };
        return `<span class="lift-status ${statusInfo.class}">
                    <i class="fas ${statusInfo.icon} mr-1"></i>
                    ${statusInfo.text}
                </span>`;
    }

    static formatBrand(brand) {
        const brandMap = {
            'otis': 'Otis',
            'kone': 'KONE',
            'schindler': 'Schindler',
            'thyssen': 'ThyssenKrupp',
            'mitsubishi': 'Mitsubishi Electric',
            'fujitec': 'Fujitec',
            'other': 'Outro'
        };
        return brandMap[brand] || brand;
    }

    static formatType(type) {
        const typeMap = {
            'passenger': 'Passageiro',
            'cargo': 'Carga',
            'hospital': 'Hospitalar',
            'panoramic': 'Panorâmico',
            'machine-room-less': 'Sem casa de máquinas'
        };
        return typeMap[type] || type;
    }

    static formatDate(dateString) {
        if (!dateString) return 'Não especificado';
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA');
    }

    static formatCoordinates(lat, lng) {
        if (!lat || !lng) return 'Não especificado';
        return `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
    }

    static generateLiftCard(lift) {
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 lift-card" data-lift-id="${lift.id}">
                    <div class="card-header bg-light">
                        <h6 class="mb-0">
                            <i class="fas fa-elevator mr-2"></i>
                            ${lift.municipalNumber || 'МН-' + lift.id}
                        </h6>
                        <div class="card-tools">
                            ${this.formatStatus(lift.status)}
                        </div>
                    </div>
                    <div class="card-body">
                        <p class="card-text">
                            <strong>Endereço:</strong><br>
                            <small class="text-muted">
                                <i class="fas fa-map-marker-alt mr-1"></i>
                                ${lift.address || 'Não especificado'}
                            </small>
                        </p>
                        <p class="card-text">
                            <strong>Marca:</strong> ${this.formatBrand(lift.brand)}<br>
                            <strong>Modelo:</strong> ${lift.model || 'Não especificado'}
                        </p>
                        <p class="card-text">
                            <strong>Tipo:</strong> ${this.formatType(lift.type)}<br>
                            <strong>Capacidade:</strong> ${lift.capacity || 'Não especificado'} pessoas
                        </p>
                        <p class="card-text">
                            <strong>Cliente:</strong><br>
                            <small class="text-muted">${lift.clientName || 'Não especificado'}</small>
                        </p>
                    </div>
                    <div class="card-footer bg-light">
                        <div class="btn-group w-100" role="group">
                            <button type="button" class="btn btn-sm btn-outline-primary view-lift" data-lift-id="${lift.id}">
                                <i class="fas fa-eye"></i> Detalhes
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-success edit-lift" data-lift-id="${lift.id}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger delete-lift" data-lift-id="${lift.id}">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static generateLiftTableRow(lift) {
        return `
            <tr data-lift-id="${lift.id}">
                <td>
                    <strong>${lift.municipalNumber || 'МН-' + lift.id}</strong><br>
                    <small class="text-muted">${lift.serialNumber || 'Não especificado'}</small>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-map-marker-alt text-muted mr-2"></i>
                        <div>
                            <div>${lift.address || 'Não especificado'}</div>
                            <small class="text-muted">${lift.buildingName || ''}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div>${this.formatBrand(lift.brand)}</div>
                    <small class="text-muted">${lift.model || 'Não especificado'}</small>
                </td>
                <td>
                    <div>${this.formatType(lift.type)}</div>
                    <small class="text-muted">${lift.capacity || 'Não especificado'} pessoas</small>
                </td>
                <td>${this.formatStatus(lift.status)}</td>
                <td>
                    <div>${lift.clientName || 'Não especificado'}</div>
                    <small class="text-muted">${lift.clientEmail || ''}</small>
                </td>
                <td>${this.formatDate(lift.lastMaintenance)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm btn-outline-info view-lift" data-lift-id="${lift.id}" title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-primary edit-lift" data-lift-id="${lift.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-warning qr-lift" data-lift-id="${lift.id}" title="QR код">
                            <i class="fas fa-qrcode"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger delete-lift" data-lift-id="${lift.id}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    static validateLiftData(liftData) {
        const errors = [];
        
        // Required fields validation
        const requiredFields = [
            { field: 'municipalNumber', name: 'Número municipal' },
            { field: 'serialNumber', name: 'Número de série' },
            { field: 'brand', name: 'Marca' },
            { field: 'model', name: 'Modelo' },
            { field: 'type', name: 'Tipo de elevador' },
            { field: 'capacity', name: 'Capacidade' },
            { field: 'speed', name: 'Velocidade' },
            { field: 'address', name: 'Endereço' },
            { field: 'postcode', name: 'Código postal' },
            { field: 'lat', name: 'Latitude' },
            { field: 'lng', name: 'Longitude' },
            { field: 'clientName', name: 'Ім\'я клієнта' },
            { field: 'clientEmail', name: 'Email do cliente' },
            { field: 'status', name: 'Estado' }
        ];

        requiredFields.forEach(({ field, name }) => {
            if (!liftData[field] || liftData[field].toString().trim() === '') {
                errors.push(`Поле "${name}" é obrigatório`);
            }
        });

        // Email validation
        if (liftData.clientEmail && !this.isValidEmail(liftData.clientEmail)) {
            errors.push('Formato de email inválido');
        }

        // Phone validation
        if (liftData.clientPhone && !this.isValidPhone(liftData.clientPhone)) {
            errors.push('Formato de telefone inválido');
        }

        // Postal code validation
        if (liftData.postcode && !this.isValidPostalCode(liftData.postcode)) {
            errors.push('Formato de código postal inválido');
        }

        // Coordinates validation
        if (liftData.lat && (isNaN(liftData.lat) || liftData.lat < -90 || liftData.lat > 90)) {
            errors.push('Valor de latitude inválido (-90 a 90)');
        }

        if (liftData.lng && (isNaN(liftData.lng) || liftData.lng < -180 || liftData.lng > 180)) {
            errors.push('Valor de longitude inválido (-180 a 180)');
        }

        // Capacity validation
        if (liftData.capacity && (isNaN(liftData.capacity) || liftData.capacity < 1 || liftData.capacity > 50)) {
            errors.push('A capacidade deve estar entre 1 e 50 pessoas');
        }

        // Speed validation
        if (liftData.speed && (isNaN(liftData.speed) || liftData.speed < 0.1 || liftData.speed > 10)) {
            errors.push('Velocidade повинна бути від 0.1 до 10 m/s');
        }

        return errors;
    }

    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidPhone(phone) {
        const phoneRegex = /^\+?3?8?0\d{9}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    static isValidPostalCode(postcode) {
        const postcodeRegex = /^(\d{5}|\d{4}-\d{3})$/;
        return postcodeRegex.test(postcode);
    }

    static calculateMaintenanceStatus(lastMaintenance, inspectionFrequency) {
        if (!lastMaintenance || !inspectionFrequency) {
            return { status: 'unknown', daysLeft: null, isOverdue: false };
        }

        const lastDate = new Date(lastMaintenance);
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + parseInt(inspectionFrequency));
        
        const today = new Date();
        const diffTime = nextDate - today;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status;
        let isOverdue = false;

        if (daysLeft < 0) {
            status = 'overdue';
            isOverdue = true;
        } else if (daysLeft <= 7) {
            status = 'urgent';
        } else if (daysLeft <= 30) {
            status = 'soon';
        } else {
            status = 'ok';
        }

        return { status, daysLeft: Math.abs(daysLeft), isOverdue };
    }

    static exportToCSV(lifts) {
        const headers = [
            'Número municipal',
            'Número de série',
            'Marca',
            'Modelo',
            'Tipo',
            'Capacidade',
            'Velocidade',
            'Endereço',
            'Código postal',
            'Cliente',
            'Email do cliente',
            'Telefone do cliente',
            'Estado',
            'Última manutenção',
            'Próxima manutenção',
            'Frequência de manutenção (meses)',
            'Técnico atribuído',
            'Latitude',
            'Longitude'
        ];

        const csvContent = [
            headers.join(','),
            ...lifts.map(lift => [
                lift.municipalNumber || '',
                lift.serialNumber || '',
                this.formatBrand(lift.brand) || '',
                lift.model || '',
                this.formatType(lift.type) || '',
                lift.capacity || '',
                lift.speed || '',
                lift.address || '',
                lift.postcode || '',
                lift.clientName || '',
                lift.clientEmail || '',
                lift.clientPhone || '',
                lift.status || '',
                lift.lastMaintenance || '',
                lift.nextMaintenance || '',
                lift.inspectionFrequency || '',
                lift.assignedTechnician || '',
                lift.lat || '',
                lift.lng || ''
            ].map(field => `"${field}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `lifts_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    static generateStatistics(lifts) {
        const stats = {
            total: lifts.length,
            active: lifts.filter(l => l.status === 'active').length,
            maintenance: lifts.filter(l => l.status === 'maintenance').length,
            repair: lifts.filter(l => l.status === 'repair').length,
            emergency: lifts.filter(l => l.status === 'emergency').length,
            inactive: lifts.filter(l => l.status === 'inactive').length,
            brands: {},
            types: {},
            overdueMaintenances: 0
        };

        lifts.forEach(lift => {
            // Count brands
            const brand = this.formatBrand(lift.brand);
            stats.brands[brand] = (stats.brands[brand] || 0) + 1;

            // Count types
            const type = this.formatType(lift.type);
            stats.types[type] = (stats.types[type] || 0) + 1;

            // Check overdue maintenances
            const maintenanceStatus = this.calculateMaintenanceStatus(lift.lastMaintenance, lift.inspectionFrequency);
            if (maintenanceStatus.isOverdue) {
                stats.overdueMaintenances++;
            }
        });

        return stats;
    }
}

// Make utility class globally available
window.LiftUtils = LiftUtils;