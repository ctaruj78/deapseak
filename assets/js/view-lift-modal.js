// view-lift-modal.js - Функції для перегляду інформації про ліфт (тільки читання)

let currentViewLiftId = null;
let viewModalMap = null;

/**
 * Показати інформацію про ліфт у режимі тільки для читання
 */
async function viewLift(liftId) {
    console.log('👁️ Перегляд ліфта:', liftId);
    currentViewLiftId = liftId;
    
    try {
        // Завантажити дані ліфта
        const lift = await loadLiftData(liftId);
        if (!lift) {
            showAlert('Ліфт не знайдено', 'danger');
            return;
        }
        
        // Заповнити дані в модальному вікні
        populateViewModal(lift);
        
        // Показати модальне вікно
        if (typeof $.fn.modal !== 'undefined') {
            $('#viewLiftModal').modal('show');
            
            // Ініціалізувати карту після показу модального вікна
            $('#viewLiftModal').on('shown.bs.modal', function() {
                initViewModalMap(lift);
            });
        } else {
            // Fallback
            document.getElementById('viewLiftModal').style.display = 'block';
            document.getElementById('viewLiftModal').classList.add('show');
            document.body.classList.add('modal-open');
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            backdrop.id = 'viewModalBackdrop';
            document.body.appendChild(backdrop);
            
            // Ініціалізувати карту
            setTimeout(() => initViewModalMap(lift), 500);
        }
        
    } catch (error) {
        console.error('❌ Помилка завантаження ліфта:', error);
        showAlert('Помилка завантаження даних ліфта', 'danger');
    }
}

/**
 * Завантажити дані ліфта з API або localStorage
 */
async function loadLiftData(liftId) {
    try {
        // Спочатку спробувати з API
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/api/lifts/${liftId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            return result.data;
        }
    } catch (error) {
        console.warn('⚠️ Помилка завантаження з API:', error);
    }
    
    // Fallback до localStorage або allLifts
    const lift = allLifts.find(l => l._id === liftId || l.id === liftId);
    return lift;
}

/**
 * Заповнити модальне вікно даними ліфта
 */
function populateViewModal(lift) {
    // Загальна інформація
    document.getElementById('viewMunicipalNumber').textContent = lift.municipalNumber || '-';
    
    const statusBadge = getStatusBadge(lift.status);
    document.getElementById('viewStatus').innerHTML = statusBadge;
    
    const address = typeof lift.address === 'object' 
        ? (lift.address.full || lift.address.street || '-') 
        : (lift.address || '-');
    document.getElementById('viewAddress').textContent = address;
    
    document.getElementById('viewCity').textContent = lift.city || '-';
    document.getElementById('viewPostalCode').textContent = lift.postalCode || '-';
    document.getElementById('viewMunicipality').textContent = lift.municipality || '-';
    
    // Інформація про клієнта
    const clientName = lift.client 
        ? `${lift.client.firstName || ''} ${lift.client.lastName || ''}`.trim()
        : (lift.clientName || '-');
    document.getElementById('viewClientName').textContent = clientName;
    
    const clientEmail = lift.client?.email || lift.clientEmail || '-';
    if (clientEmail !== '-') {
        document.getElementById('viewClientEmailLink').textContent = clientEmail;
        document.getElementById('viewClientEmailLink').href = `mailto:${clientEmail}`;
        document.getElementById('viewClientEmail').innerHTML = `
            <a href="mailto:${clientEmail}" class="text-primary">
                <i class="fas fa-envelope"></i> ${clientEmail}
            </a>
        `;
    } else {
        document.getElementById('viewClientEmail').textContent = '-';
    }
    
    const clientPhone = lift.client?.phone || lift.clientPhone || '-';
    if (clientPhone !== '-') {
        document.getElementById('viewClientPhoneLink').textContent = clientPhone;
        document.getElementById('viewClientPhoneLink').href = `tel:${clientPhone}`;
        document.getElementById('viewClientPhone').innerHTML = `
            <a href="tel:${clientPhone}" class="text-primary">
                <i class="fas fa-phone"></i> ${clientPhone}
            </a>
        `;
    } else {
        document.getElementById('viewClientPhone').textContent = '-';
    }
    
    document.getElementById('viewContactPerson').textContent = lift.contactPerson || '-';
    
    const accessCode = lift.intercomCode || lift.accessCode || '-';
    document.getElementById('viewAccessCode').textContent = accessCode;
    if (accessCode !== '-') {
        document.getElementById('viewAccessCode').classList.add('text-success');
    }
    
    // Технічні дані
    document.getElementById('viewCapacity').textContent = lift.capacity 
        ? `${lift.capacity} кг` 
        : '-';
    document.getElementById('viewSpeed').textContent = lift.speed 
        ? `${lift.speed} м/с` 
        : '-';
    
    const lastInspection = lift.lastInspectionDate 
        ? new Date(lift.lastInspectionDate).toLocaleDateString('uk-UA')
        : '-';
    document.getElementById('viewLastInspection').textContent = lastInspection;
    
    const nextInspection = lift.nextInspectionDate 
        ? new Date(lift.nextInspectionDate).toLocaleDateString('uk-UA')
        : '-';
    document.getElementById('viewNextInspection').textContent = nextInspection;
    
    document.getElementById('viewNotes').textContent = lift.notes || 'Немає приміток';
    
    // Завантажити документи
    loadViewModalDocuments(lift._id || lift.id);
}

/**
 * Отримати HTML badge для статусу
 */
function getStatusBadge(status) {
    const statusMap = {
        'active': '<span class="badge badge-success">Активний</span>',
        'inactive': '<span class="badge badge-danger">Неактивний</span>',
        'maintenance': '<span class="badge badge-warning">На обслуговуванні</span>',
        'operational': '<span class="badge badge-success">Працює</span>'
    };
    return statusMap[status] || `<span class="badge badge-secondary">${status}</span>`;
}

/**
 * Ініціалізувати карту в модальному вікні
 */
function initViewModalMap(lift) {
    // Отримати координати
    let lat, lng;
    if (lift.location && lift.location.coordinates) {
        lng = lift.location.coordinates[0];
        lat = lift.location.coordinates[1];
    } else if (lift.latitude && lift.longitude) {
        lat = lift.latitude;
        lng = lift.longitude;
    } else if (lift.coordinates) {
        lng = lift.coordinates[0];
        lat = lift.coordinates[1];
    } else {
        // За замовчуванням - Лісабон
        lat = 38.7223;
        lng = -9.1393;
    }
    
    // Видалити стару карту якщо є
    if (viewModalMap) {
        viewModalMap.remove();
        viewModalMap = null;
    }
    
    // Створити нову карту
    try {
        viewModalMap = L.map('viewMap').setView([lat, lng], 15);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(viewModalMap);
        
        // Додати маркер
        L.marker([lat, lng])
            .addTo(viewModalMap)
            .bindPopup(`<b>${lift.municipalNumber || 'Ліфт'}</b><br>${lift.address || ''}`)
            .openPopup();
            
        // Оновити розмір карти
        setTimeout(() => {
            viewModalMap.invalidateSize();
        }, 300);
    } catch (error) {
        console.error('❌ Помилка ініціалізації карти:', error);
    }
}

/**
 * Завантажити документи для перегляду
 */
async function loadViewModalDocuments(liftId) {
    const container = document.getElementById('viewDocumentsList');
    container.innerHTML = '<p class="text-center"><i class="fas fa-spinner fa-spin"></i> Завантаження...</p>';
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/api/lifts/${liftId}/documents`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Помилка завантаження документів');
        }
        
        const result = await response.json();
        const documents = result.data || [];
        
        if (documents.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Документи відсутні</p>';
            return;
        }
        
        // Розділити по типах
        const contracts = documents.filter(d => d.type === 'contract');
        const inspections = documents.filter(d => d.type === 'inspection');
        
        let html = '';
        
        if (contracts.length > 0) {
            html += '<h6><i class="fas fa-file-contract"></i> Контракти</h6>';
            html += '<ul class="list-group mb-3">';
            contracts.forEach(doc => {
                html += `
                    <li class="list-group-item">
                        <i class="fas fa-file-pdf text-danger"></i> 
                        <a href="${API_URL}${doc.url}" target="_blank">${doc.filename}</a>
                        <small class="text-muted float-right">
                            ${new Date(doc.uploadedAt).toLocaleDateString('uk-UA')}
                        </small>
                    </li>
                `;
            });
            html += '</ul>';
        }
        
        if (inspections.length > 0) {
            html += '<h6><i class="fas fa-clipboard-check"></i> Звіти інспекції</h6>';
            html += '<ul class="list-group">';
            inspections.forEach(doc => {
                html += `
                    <li class="list-group-item">
                        <i class="fas fa-file-pdf text-danger"></i> 
                        <a href="${API_URL}${doc.url}" target="_blank">${doc.filename}</a>
                        <small class="text-muted float-right">
                            ${new Date(doc.uploadedAt).toLocaleDateString('uk-UA')}
                        </small>
                    </li>
                `;
            });
            html += '</ul>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Помилка завантаження документів:', error);
        container.innerHTML = '<p class="text-center text-danger">Помилка завантаження документів</p>';
    }
}

/**
 * Переключитися на режим редагування
 */
function switchToEdit() {
    closeViewModal();
    
    // Затримка для анімації закриття
    setTimeout(() => {
        if (currentViewLiftId) {
            editLift(currentViewLiftId);
        }
    }, 300);
}

/**
 * Закрити модальне вікно перегляду
 */
function closeViewModal() {
    // Видалити карту
    if (viewModalMap) {
        viewModalMap.remove();
        viewModalMap = null;
    }
    
    // Закрити модальне вікно
    if (typeof $.fn.modal !== 'undefined') {
        $('#viewLiftModal').modal('hide');
    } else {
        // Fallback
        document.getElementById('viewLiftModal').style.display = 'none';
        document.getElementById('viewLiftModal').classList.remove('show');
        document.body.classList.remove('modal-open');
        const backdrop = document.getElementById('viewModalBackdrop');
        if (backdrop) backdrop.remove();
    }
    
    currentViewLiftId = null;
}

/**
 * Універсальна функція для показу повідомлень
 */
function showAlert(message, type = 'info') {
    const alertIcons = {
        'success': 'fa-check-circle',
        'danger': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    
    const icon = alertIcons[type] || alertIcons['info'];
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas ${icon} mr-2"></i>${message}
            <button type="button" class="close" data-dismiss="alert">
                <span>&times;</span>
            </button>
        </div>
    `;
    
    // Додати alert в контейнер
    const container = document.querySelector('.content-wrapper') || document.body;
    const alertDiv = document.createElement('div');
    alertDiv.innerHTML = alertHtml;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    container.appendChild(alertDiv);
    
    // Автоматично видалити через 5 секунд
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}
