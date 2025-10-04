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
            this.showMessage('Помилка обробки форми: ' + error.message, 'error');
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
            accessCode: $('#accessCode').val() || '',
            lat: parseFloat($('#liftLat').val()) || null,
            lng: parseFloat($('#liftLng').val()) || null,
            clientName: $('#clientName').val() || 'Невказано',
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
            // Перевіряємо allLifts
            if (typeof window.allLifts === 'undefined') {
                console.log('⚠️ allLifts not found, creating empty array');
                window.allLifts = [];
            }
            
            console.log('📊 Current lifts count:', window.allLifts.length);
            
            // Перевіряємо чи це оновлення
            const existingIndex = window.allLifts.findIndex(l => l.id === liftData.id);
            
            if (existingIndex !== -1) {
                // Оновлюємо існуючий
                window.allLifts[existingIndex] = { ...window.allLifts[existingIndex], ...liftData };
                console.log('✏️ Updated existing lift at index:', existingIndex);
            } else {
                // Додаємо новий
                window.allLifts.push(liftData);
                console.log('➕ Added new lift. Total count:', window.allLifts.length);
            }
            
            // Зберігаємо в localStorage
            this.saveToStorage();
            
            // Успіх
            this.showMessage('Ліфт успішно збережено!', 'success');
            $('#liftModal').modal('hide');
            
            // Оновлюємо таблицю якщо є
            if (typeof window.liftManager !== 'undefined' && window.liftManager.loadLifts) {
                setTimeout(() => window.liftManager.loadLifts(), 100);
            }
            
        } catch (error) {
            console.error('❌ Error saving lift:', error);
            this.showMessage('Помилка збереження: ' + error.message, 'error');
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
        $('#modalTitle').text('Додати ліфт');
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
    
    // Додамо можливість тестування
    testSave() {
        console.log('🧪 Running test save...');
        
        const testData = {
            municipalNumber: 'TEST-' + Date.now(),
            serialNumber: 'SER-TEST-' + Date.now(), 
            brand: 'TestBrand',
            model: 'TestModel',
            address: 'Тестова адреса ' + Date.now()
        };
        
        // Заповнюємо форму тестовими даними
        Object.keys(testData).forEach(key => {
            $(`#${key}`).val(testData[key]);
        });
        
        // Запускаємо збереження
        this.handleFormSubmit();
    }
}

// Глобальна ініціалізація
$(document).ready(function() {
    console.log('📱 Initializing Simple Lift Modal...');
    window.simpleLiftModal = new SimpleLiftModal();
    
    // Тестова кнопка
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(() => {
            if ($('#test-simple-save').length === 0) {
                $('body').append(`
                    <button id="test-simple-save" style="
                        position: fixed; 
                        bottom: 10px; 
                        right: 10px; 
                        z-index: 9999; 
                        background: #17a2b8; 
                        color: white; 
                        border: none; 
                        padding: 10px 15px; 
                        border-radius: 5px;
                        font-size: 12px;
                    " onclick="window.simpleLiftModal.testSave()">🧪 Простий тест</button>
                `);
            }
        }, 1000);
    }
    
    console.log('✅ Simple Lift Modal ready');
});