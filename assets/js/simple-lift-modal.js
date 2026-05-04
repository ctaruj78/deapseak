// Simple Lift Modal without Map - максимально спрощена версія
class SimpleLiftModal {
    constructor() {
        this.currentLiftId = null;
        this.init();
    }

    init() {
        console.log('🚀 Initializing Simple Lift Modal (no map)...');
        this.initEventListeners();
        console.log('✅ Simple Lift Modal initialized');
    }

    initEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Основний обробник форми
        $(document).off('submit', '#liftForm').on('submit', '#liftForm', (e) => {
            console.log('🔥 Form submit triggered!');
            e.preventDefault();
            this.handleFormSubmit();
        });
        
        // Додатковий обробник для кнопки
        $(document).off('click', 'button[type="submit"]').on('click', 'button[type="submit"]', (e) => {
            if ($(e.target).closest('#liftForm').length > 0) {
                console.log('🔥 Submit button clicked!');
                e.preventDefault();
                this.handleFormSubmit();
            }
        });
        
        // Скидання форми при відкритті модалки
        $('#liftModal').on('show.bs.modal', () => {
            console.log('📝 Modal opening, resetting form...');
            this.resetForm();
        });
        
        // Обробники дій для кнопок у таблиці
        $(document).off('click', '.edit-lift').on('click', '.edit-lift', (e) => {
            const liftId = $(e.target).closest('button').data('lift-id');
            this.editLift(liftId);
        });
        
        $(document).off('click', '.view-lift').on('click', '.view-lift', (e) => {
            const liftId = $(e.target).closest('button').data('lift-id');
            this.viewLift(liftId);
        });
        
        $(document).off('click', '.delete-lift').on('click', '.delete-lift', (e) => {
            const liftId = $(e.target).closest('button').data('lift-id');
            this.deleteLift(liftId);
        });
        
        $(document).off('click', '.create-ticket').on('click', '.create-ticket', (e) => {
            const liftId = $(e.target).closest('button').data('lift-id');
            this.createTicket(liftId);
        });
        
        console.log('✅ Event listeners set up');
    }

    handleFormSubmit() {
        console.log('📋 Processing form submission...');
        
        try {
            // Збираємо дані з форми
            const formData = this.collectFormData();
            console.log('📄 Form data collected:', formData);
            
            // Простий валідація
            if (!this.validateBasicFields(formData)) {
                return;
            }
            console.log('✅ Validation passed');
            
            // Зберігаємо ліфт
            this.saveLift(formData);
            
        } catch (error) {
            console.error('❌ Error in form submission:', error);
            this.showMessage('Erro ao processar formulário: ' + error.message, 'error');
        }
    }
    
    collectFormData() {
        const data = {
            id: $('#liftId').val() || 'lift_' + Date.now(),
            municipalNumber: $('#municipalNumber').val() || '',
            serialNumber: $('#serialNumber').val() || '',
            brand: $('#liftBrand').val() || '',
            model: $('#liftModel').val() || '',
            type: $('#liftType').val() || 'passenger',
            capacity: parseInt($('#liftCapacity').val()) || 8,
            speed: parseFloat($('#liftSpeed').val()) || 1.0,
            floorsCount: parseInt($('#floorsCount').val()) || 5,
            doorsCount: parseInt($('#doorsCount').val()) || 2,
            installationYear: parseInt($('#installationYear').val()) || new Date().getFullYear(),
            address: $('#liftAddress').val() || '',
            postcode: $('#liftPostcode').val() || '',
            buildingName: $('#buildingName').val() || '',
            floorLocation: $('#floorLocation').val() || 'ground',
            liftsCountAtAddress: parseInt($('#liftsCountAtAddress').val()) || 1,
            accessCode: $('#accessCode').val() || '',
            lat: parseFloat($('#liftLat').val()) || null,
            lng: parseFloat($('#liftLng').val()) || null,
            clientName: $('#clientName').val() || 'Não especificado',
            clientEmail: $('#clientEmail').val() || '',
            clientPhone: $('#clientPhone').val() || '',
            contactPerson: $('#contactPerson').val() || '',
            clientNotes: $('#clientNotes').val() || '',
            tech: $('#assignedTechnician').val() || 'auto',
            status: $('#liftStatus').val() || 'operational',
            lastInspection: $('#lastMaintenance').val() || null,
            nextInspection: $('#nextMaintenance').val() || null,
            inspectionFrequency: parseInt($('#inspectionFrequency').val()) || 6,
            maintenanceNotes: $('#maintenanceNotes').val() || '',
            qrAccessLevel: $('#qrAccessLevel').val() || 'public',
            enableQrTracking: $('#enableQrTracking').is(':checked'),
            interventionHistory: [],
            photos: [],
            inspectionHistory: [],
            chat: [],
            createdAt: $('#liftId').val() ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return data;
    }
    
    validateBasicFields(data) {
        const required = ['municipalNumber', 'serialNumber', 'brand', 'model', 'address'];
        const missing = [];
        
        for (let field of required) {
            if (!data[field] || data[field].trim() === '') {
                missing.push(field);
                $(`#${field}`).addClass('is-invalid');
            } else {
                $(`#${field}`).removeClass('is-invalid');
            }
        }
        
        if (missing.length > 0) {
            console.log('❌ Missing required fields:', missing);
            this.showMessage('Заповніть обов\'язкові поля: ' + missing.join(', '), 'warning');
            return false;
        }
        
        return true;
    }
    
    saveLift(liftData) {
        console.log('💾 Saving lift data...');
        
        try {
            // Ініціалізуємо масив якщо потрібно
            if (typeof window.allLifts === 'undefined') {
                console.log('⚠️ window.allLifts not found, creating new array');
                window.allLifts = [];
            }
            
            // Перевіряємо чи це оновлення існуючого ліфта
            const existingIndex = window.allLifts.findIndex(l => l.id === liftData.id);
            console.log('📊 Current lifts count:', window.allLifts.length);
            console.log('🔍 Checking for existing lift with ID:', liftData.id, 'Found at index:', existingIndex);
            
            if (existingIndex !== -1) {
                // Оновлюємо існуючий ліфт
                window.allLifts[existingIndex] = { ...window.allLifts[existingIndex], ...liftData };
                console.log('✏️ Updated existing lift at index:', existingIndex);
            } else {
                // Додаємо новий ліфт ТІЛЬКИ один раз
                window.allLifts.push(liftData);
                console.log('➕ Added new lift. Total count now:', window.allLifts.length);
            }
            
            // Синхронізуємо з глобальною змінною ТІЛЬКИ ОДИН РАЗ
            if (typeof allLifts !== 'undefined') {
                allLifts = [...window.allLifts]; // Повністю копіюємо масив
                console.log('🔄 Synchronized global allLifts variable, count:', allLifts.length);
            }
            
            // Зберігаємо в localStorage
            this.saveToStorage();
            
            // Sucesso
            this.showMessage('Elevador com sucesso збережено!', 'success');
            $('#liftModal').modal('hide');
            
            // Оновлюємо таблицю якщо є
            console.log('🔄 Attempting to refresh lift table...');
            if (typeof window.liftManager !== 'undefined') {
                if (window.liftManager.loadLifts) {
                    console.log('✅ Found liftManager.loadLifts, calling it...');
                    setTimeout(() => {
                        window.liftManager.loadLifts();
                        console.log('✅ liftManager.loadLifts() called');
                    }, 200);
                } else {
                    console.log('❌ liftManager.loadLifts not found');
                }
            } else {
                console.log('❌ window.liftManager not found');
                // Спробуємо оновити через API
                if (typeof window.loadLiftsFromAPI === 'function') {
                    window.loadLiftsFromAPI();
                }
            }
            
        } catch (error) {
            console.error('❌ Error saving lift:', error);
            this.showMessage('Erro ao guardar: ' + error.message, 'error');
        }
    }
    
    saveToStorage() {
        try {
            // Спробуємо CommonUtils спочатку
            if (typeof CommonUtils !== 'undefined' && CommonUtils.saveLifts) {
                const saved = CommonUtils.saveLifts(window.allLifts);
                console.log('💾 CommonUtils.saveLifts result:', saved);
                if (!saved) {
                    throw new Error('CommonUtils.saveLifts failed');
                }
            } else {
                // Fallback до прямого збереження
                localStorage.setItem('lifts', JSON.stringify(window.allLifts));
                console.log('💾 Direct localStorage save completed');
            }
            
            // Перевіряємо збереження
            const stored = localStorage.getItem('lifts');
            if (stored) {
                const parsed = JSON.parse(stored);
                console.log('✅ Verification: localStorage contains', parsed.length, 'lifts');
            }
            
        } catch (error) {
            console.error('❌ Storage save error:', error);
            throw error;
        }
    }
    
    resetForm() {
        console.log('🔄 Resetting form...');
        $('#liftForm')[0].reset();
        $('#liftId').val('');
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').remove();
        $('#modalTitle').text('Adicionar ліфт');
    }
    
    loadLiftForEdit(liftData) {
        console.log('📝 Loading lift for edit:', liftData);
        
        // Заповнюємо форму даними ліфта
        $('#liftId').val(liftData.id);
        $('#municipalNumber').val(liftData.municipalNumber || '');
        $('#serialNumber').val(liftData.serial || liftData.serialNumber || '');
        $('#liftBrand').val(liftData.brand || '');
        $('#liftModel').val(liftData.model || '');
        $('#liftType').val(liftData.type || 'passenger');
        $('#liftCapacity').val(liftData.capacity || '');
        $('#liftSpeed').val(liftData.speed || '');
        $('#floorsCount').val(liftData.floorsCount || '');
        $('#doorsCount').val(liftData.doorsCount || '');
        $('#installationYear').val(liftData.installationYear || '');
        $('#liftAddress').val(liftData.address || '');
        $('#liftPostcode').val(liftData.postcode || '');
        $('#buildingName').val(liftData.buildingName || '');
        $('#floorLocation').val(liftData.floorLocation || '');
        $('#liftsCountAtAddress').val(liftData.liftsCountAtAddress || 1);
        $('#accessCode').val(liftData.accessCode || '');
        $('#liftLat').val(liftData.lat || '');
        $('#liftLng').val(liftData.lng || '');
        $('#clientName').val(liftData.clientName || '');
        $('#clientEmail').val(liftData.clientEmail || '');
        $('#clientPhone').val(liftData.clientPhone || '');
        $('#contactPerson').val(liftData.contactPerson || '');
        $('#clientNotes').val(liftData.clientNotes || '');
        $('#assignedTechnician').val(liftData.tech || '');
        $('#liftStatus').val(liftData.status || '');
        $('#lastMaintenance').val(liftData.lastInspection || '');
        $('#nextMaintenance').val(liftData.nextInspection || '');
        $('#inspectionFrequency').val(liftData.inspectionFrequency || '');
        $('#maintenanceNotes').val(liftData.maintenanceNotes || '');
        $('#qrAccessLevel').val(liftData.qrAccessLevel || '');
        
        if (liftData.enableQrTracking !== undefined) {
            $('#enableQrTracking').prop('checked', liftData.enableQrTracking);
        }
        
        this.currentLiftId = liftData.id;
        console.log('✅ Lift data loaded for editing');
    }
    
    showMessage(message, type = 'info') {
        const alertClass = type === 'error' ? 'danger' : type;
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
        
        // Видаляємо попередні повідомлення
        $('.simple-modal-alert').remove();
        
        // Додаємо нове повідомлення
        const alertHtml = `
            <div class="alert alert-${alertClass} alert-dismissible fade show simple-modal-alert" role="alert">
                <i class="fas fa-${icon}"></i> ${message}
                <button type="button" class="close" data-dismiss="alert">
                    <span>&times;</span>
                </button>
            </div>
        `;
        
        $('#liftForm').prepend(alertHtml);
        
        // Автоматично приховати через 5 секунд
        setTimeout(() => {
            $('.simple-modal-alert').fadeOut();
        }, 5000);
        
        console.log(`📢 Message shown: ${message}`);
    }
    
    getStatusColor(status) {
        switch (status) {
            case 'operational': return 'success';
            case 'maintenance': return 'warning';
            case 'broken': return 'danger';
            case 'inactive': return 'secondary';
            default: return 'primary';
        }
    }
    
    getStatusText(status) {
        switch (status) {
            case 'operational': return 'Em funcionamento';
            case 'maintenance': return 'Manutenção';
            case 'broken': return 'Avariado';
            case 'inactive': return 'Inativo';
            default: return 'Невизначено';
        }
    }
    
    // Функції дій для кнопок таблиці
    editLift(liftId) {
        console.log('✏️ Edit lift:', liftId);
        const lift = this.findLiftById(liftId);
        if (lift) {
            // Використовуємо enhanced модальне вікно для редагування
            if (typeof window.enhancedLiftModal !== 'undefined') {
                // Встановлюємо режим редагування перед відкриттям модального вікна
                window.enhancedLiftModal.currentLiftId = lift.id;
                window.enhancedLiftModal.loadLiftForEdit(lift);
                $('#enhancedLiftModal').modal('show');
            } else {
                // Fallback на старе модальне вікно
                this.loadLiftForEdit(lift);
                $('#liftModal').modal('show');
            }
        } else {
            this.showMessage('Elevador não encontrado', 'error');
        }
    }
    
    viewLift(liftId) {
        console.log('👁️ View lift:', liftId);
        const lift = this.findLiftById(liftId);
        if (lift) {
            this.showLiftDetails(lift);
        } else {
            this.showMessage('Elevador não encontrado', 'error');
        }
    }
    
    deleteLift(liftId) {
        console.log('🗑️ Delete lift:', liftId);
        const lift = this.findLiftById(liftId);
        if (lift) {
            if (confirm(`Tem a certeza que pretende eliminar o elevador ${lift.municipalNumber}?`)) {
                this.performDelete(liftId);
            }
        } else {
            this.showMessage('Elevador não encontrado', 'error');
        }
    }
    
    createTicket(liftId) {
        console.log('🎫 Create ticket for lift:', liftId);
        const lift = this.findLiftById(liftId);
        if (lift) {
            this.openTicketModal(lift);
        } else {
            this.showMessage('Elevador não encontrado', 'error');
        }
    }
    
    findLiftById(liftId) {
        if (typeof window.allLifts !== 'undefined' && window.allLifts) {
            return window.allLifts.find(lift => lift.id === liftId);
        }
        return null;
    }
    
    loadLiftForEdit(lift) {
        console.log('📝 Loading lift for edit:', lift);
        // Заповнюємо поля форми
        $('#liftId').val(lift.id);
        $('#municipalNumber').val(lift.municipalNumber || '');
        $('#serialNumber').val(lift.serialNumber || '');
        $('#liftBrand').val(lift.brand || '');
        $('#liftModel').val(lift.model || '');
        $('#liftType').val(lift.type || '');
        $('#liftCapacity').val(lift.capacity || '');
        $('#liftSpeed').val(lift.speed || '');
        $('#liftAddress').val(lift.address || '');
        $('#liftPostcode').val(lift.postcode || '');
        $('#clientName').val(lift.clientName || '');
        $('#clientEmail').val(lift.clientEmail || '');
        $('#clientPhone').val(lift.clientPhone || '');
        $('#assignedTechnician').val(lift.tech || '');
        $('#liftStatus').val(lift.status || '');
        
        this.currentLiftId = lift.id;
        $('#modalTitle').text('Editar ліфт');
    }
    
    showLiftDetails(lift) {
        console.log('📋 Showing lift details:', lift);
        const modalHtml = `
            <div class="modal fade" id="liftDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Detalhes ліфта ${lift.municipalNumber}</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Основна інформація</h6>
                                    <p><strong>N.º Municipal:</strong> ${lift.municipalNumber || 'Não especificado'}</p>
                                    <p><strong>Agoійний №:</strong> ${lift.serialNumber || 'Não especificado'}</p>
                                    <p><strong>Marca:</strong> ${lift.brand || 'Não especificado'}</p>
                                    <p><strong>Modelo:</strong> ${lift.model || 'Não especificado'}</p>
                                    <p><strong>Endereço:</strong> ${lift.address || 'Não especificado'}</p>
                                    <p><strong>Código do intercomunicador:</strong> ${lift.accessCode || 'Não especificado'}</p>
                                    <p><strong>Estado:</strong> <span class="badge badge-${this.getStatusColor(lift.status)}">${this.getStatusText(lift.status)}</span></p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Технічна інформація</h6>
                                    <p><strong>Tipo:</strong> ${lift.type || 'Não especificado'}</p>
                                    <p><strong>Capacidade:</strong> ${lift.capacity || 'Não especificado'} pessoas</p>
                                    <p><strong>Velocidade:</strong> ${lift.speed || 'Não especificado'} m/s</p>
                                    <p><strong>Остання інспекція:</strong> ${lift.lastInspection || 'Não especificado'}</p>
                                    <p><strong>Наступна інспекція:</strong> ${lift.nextInspection || 'Não especificado'}</p>
                                    <p><strong>Técnico:</strong> ${lift.tech || 'Автопризначення'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Видаляємо попередні модалки
        $('#liftDetailsModal').remove();
        $('body').append(modalHtml);
        $('#liftDetailsModal').modal('show');
    }
    
    performDelete(liftId) {
        try {
            if (typeof window.allLifts !== 'undefined') {
                window.allLifts = window.allLifts.filter(lift => lift.id !== liftId);
                
                // Синхронізуємо з глобальною змінною
                if (typeof allLifts !== 'undefined') {
                    allLifts = [...window.allLifts];
                }
                
                // Зберігаємо в localStorage
                localStorage.setItem('lifts', JSON.stringify(window.allLifts));
                
                // Оновлюємо таблицю через API
                if (typeof window.loadLiftsFromAPI === 'function') {
                    window.loadLiftsFromAPI();
                }
                this.showMessage('Elevador com sucesso видалено', 'success');
            }
        } catch (error) {
            console.error('❌ Error deleting lift:', error);
            this.showMessage('Erro видалення: ' + error.message, 'error');
        }
    }
    
    openTicketModal(lift) {
        console.log('🎫 Opening ticket modal for lift:', lift);
        
        // Convert MongoDB ObjectId to string
        const liftId = window.safeId ? window.safeId(lift) : ((lift._id && lift._id.toString) ? lift._id.toString() : (lift._id || lift.id || ''));
        if (!liftId) {
            console.error('❌ Elevador без ID:', lift);
            this.showMessage('Erro: ID ліфта не знайдено', 'error');
            return;
        }
        
        const modalHtml = `
            <div class="modal fade" id="ticketModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Створити заявку для ліфта ${lift.municipalNumber}</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="ticketForm">
                                <div class="form-group">
                                    <label for="ticketType">Tipo заявки</label>
                                    <select id="ticketType" class="form-control" required>
                                        <option value="">Оберіть тип...</option>
                                        <option value="maintenance">Планове обслуговування</option>
                                        <option value="repair">Reparação</option>
                                        <option value="inspection">Inspeção</option>
                                        <option value="emergency">Аварійна заявка</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="ticketDescription">Descrição проблеми</label>
                                    <textarea id="ticketDescription" class="form-control" rows="4" required placeholder="Детальний опис проблеми або робіт..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="ticketPriority">Prioridade</label>
                                    <select id="ticketPriority" class="form-control" required>
                                        <option value="low">Низький</option>
                                        <option value="medium" selected>Agoедній</option>
                                        <option value="high">Altий</option>
                                        <option value="critical">Crítico</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="window.simpleLiftModal.createTicketForLift('${liftId}')">Створити заявку</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Видаляємо попередні модалки
        $('#ticketModal').remove();
        $('body').append(modalHtml);
        $('#ticketModal').modal('show');
    }
    
    createTicketForLift(liftId) {
        const ticketType = $('#ticketType').val();
        const ticketDescription = $('#ticketDescription').val();
        const ticketPriority = $('#ticketPriority').val();
        
        if (!ticketType || !ticketDescription) {
            this.showMessage('Preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        const lift = this.findLiftById(liftId);
        const ticket = {
            id: 'ticket_' + Date.now(),
            liftId: liftId,
            liftMunicipalNumber: lift.municipalNumber,
            type: ticketType,
            description: ticketDescription,
            priority: ticketPriority,
            status: 'open',
            createdAt: new Date().toISOString(),
            createdBy: 'admin' // Тут буде з системи авторизації
        };
        
        // Зберігаємо заявку (поки в localStorage)
        let tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
        tickets.push(ticket);
        localStorage.setItem('tickets', JSON.stringify(tickets));
        
        $('#ticketModal').modal('hide');
        this.showMessage('Заявку створено com sucesso!', 'success');
        
        console.log('✅ Ticket created:', ticket);
    }
}

// Глобальна ініціалізація
$(document).ready(function() {
    console.log('📱 Initializing Simple Lift Modal...');
    window.simpleLiftModal = new SimpleLiftModal();
    
    console.log('✅ Simple Lift Modal ready');
});