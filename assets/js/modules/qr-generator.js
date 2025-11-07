/**
 * QR Generator Module for LiftMaster Pro
 * Handles QR code generation functionality
 */

const qrGenerator = (function() {
    let currentQRCode = null;
    let qrCanvas = null;
    
    // Опції для різних типів QR
    const targetOptions = {
        lift: [
            { value: 'access', text: 'Доступ до ліфта' },
            { value: 'info', text: 'Інформація про ліфт' },
            { value: 'emergency', text: 'Екстрена інформація' },
            { value: 'maintenance_history', text: 'Історія обслуговування' }
        ],
        technician: [
            { value: 'profile', text: 'Профіль техніка' },
            { value: 'contact', text: 'Контактна інформація' },
            { value: 'schedule', text: 'Графік робіт' }
        ],
        location: [
            { value: 'building', text: 'Будівля' },
            { value: 'address', text: 'Адреса' },
            { value: 'map', text: 'На карті' }
        ],
        equipment: [
            { value: 'specs', text: 'Технічні характеристики' },
            { value: 'manual', text: 'Інструкція' },
            { value: 'warranty', text: 'Гарантія' }
        ],
        maintenance: [
            { value: 'schedule', text: 'Графік ТО' },
            { value: 'checklist', text: 'Чек-лист' },
            { value: 'report', text: 'Звіт ТО' }
        ],
        custom: [
            { value: 'url', text: 'URL посилання' },
            { value: 'text', text: 'Довільний текст' },
            { value: 'contact', text: 'Контакт (vCard)' }
        ]
    };
    
    // Завантаження списку ліфтів
    async function loadLifts() {
        try {
            const lifts = JSON.parse(localStorage.getItem('lifts') || '[]');
            return lifts;
        } catch (error) {
            console.error('Помилка завантаження ліфтів:', error);
            return [];
        }
    }
    
    // Оновлення списку призначень
    function updateTargetOptions(type) {
        const targetSelect = $('#qrTarget');
        targetSelect.empty();
        
        if (!type) {
            targetSelect.append('<option value="">Спочатку оберіть тип</option>');
            targetSelect.prop('disabled', true);
            return;
        }
        
        targetSelect.prop('disabled', false);
        targetSelect.append('<option value="">Оберіть призначення...</option>');
        
        const options = targetOptions[type] || [];
        options.forEach(option => {
            targetSelect.append(`<option value="${option.value}">${option.text}</option>`);
        });
        
        // Якщо тип "lift", додаємо ліфти
        if (type === 'lift') {
            loadLifts().then(lifts => {
                if (lifts.length > 0) {
                    targetSelect.append('<optgroup label="Конкретні ліфти">');
                    lifts.forEach(lift => {
                        const liftName = lift.municipalNumber || lift.address || lift.id;
                        targetSelect.append(`<option value="lift_${lift.id}">${liftName}</option>`);
                    });
                    targetSelect.append('</optgroup>');
                }
            });
        }
        
        targetSelect.trigger('change');
    }
    
    // Генерація QR коду
    function generateQR(data) {
        const size = parseInt($('#qrSize').val()) || 300;
        const color = $('#qrColorPicker input').val() || '#000000';
        
        const previewDiv = document.getElementById('qrPreview');
        previewDiv.innerHTML = '';
        
        // Створюємо canvas для QR
        qrCanvas = document.createElement('canvas');
        previewDiv.appendChild(qrCanvas);
        
        // Генеруємо QR код
        QRCode.toCanvas(qrCanvas, data, {
            width: size,
            height: size,
            color: {
                dark: color,
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        }, function(error) {
            if (error) {
                console.error('Помилка генерації QR:', error);
                previewDiv.innerHTML = '<p class="text-danger">Помилка генерації QR-коду</p>';
                return;
            }
            
            // Показуємо текст що закодовано
            $('#qrText').html(`<small class="text-muted">Закодовано: ${data.substring(0, 50)}${data.length > 50 ? '...' : ''}</small>`);
            
            // Показуємо інформацію
            const info = `
                <table class="table table-sm">
                    <tr><td><strong>Розмір:</strong></td><td>${size}x${size} px</td></tr>
                    <tr><td><strong>Колір:</strong></td><td><span style="display:inline-block;width:20px;height:20px;background:${color};border:1px solid #ddd;"></span> ${color}</td></tr>
                    <tr><td><strong>Довжина:</strong></td><td>${data.length} символів</td></tr>
                    <tr><td><strong>Формат:</strong></td><td>Canvas</td></tr>
                </table>
            `;
            $('#qrInfo').html(info);
            
            // Активуємо кнопки завантаження
            $('#downloadPNG, #downloadSVG, #downloadPDF, #copyClipboard').prop('disabled', false);
            
            currentQRCode = data;
        });
    }
    
    // Завантаження PNG
    function downloadPNG() {
        if (!qrCanvas) return;
        
        const link = document.createElement('a');
        link.download = `qr-code-${Date.now()}.png`;
        link.href = qrCanvas.toDataURL();
        link.click();
    }
    
    // Завантаження SVG (використовуємо canvas як fallback)
    function downloadSVG() {
        if (!currentQRCode) return;
        alert('SVG експорт буде додано в наступній версії. Використовуйте PNG.');
    }
    
    // Завантаження PDF
    function downloadPDF() {
        if (!qrCanvas) return;
        alert('PDF експорт буде додано в наступній версії. Використовуйте PNG.');
    }
    
    // Копіювання в буфер обміну
    function copyToClipboard() {
        if (!qrCanvas) return;
        
        qrCanvas.toBlob(function(blob) {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(function() {
                alert('QR-код скопійовано в буфер обміну!');
            }, function(error) {
                console.error('Помилка копіювання:', error);
                alert('Не вдалося скопіювати QR-код');
            });
        });
    }
    
    // Скидання форми
    function resetForm() {
        $('#qrGeneratorForm')[0].reset();
        $('#qrPreview').html('<p class="text-muted">QR-код з\'явиться тут після введення параметрів</p>');
        $('#qrText').html('');
        $('#qrInfo').html('<p class="text-muted">Інформація з\'явиться тут після генерації QR-коду</p>');
        $('#downloadPNG, #downloadSVG, #downloadPDF, #copyClipboard').prop('disabled', true);
        $('#qrTarget').empty().append('<option value="">Спочатку оберіть тип</option>').prop('disabled', true);
        currentQRCode = null;
        qrCanvas = null;
    }
    
    // Initialize the module
    function init() {
        console.log("🔧 QR Generator initialized");
        
        // Ініціалізація Select2 (тільки якщо потрібно)
        // Закоментовано для кращої видимості стандартних select
        // $('.select2').select2({
        //     theme: 'bootstrap4',
        //     width: '100%'
        // });
        
        // Обробник зміни типу QR
        $('#qrType').on('change', function() {
            const type = $(this).val();
            console.log('🔧 QR Type changed:', type);
            updateTargetOptions(type);
        });
        
        // Обробник форми
        $('#qrGeneratorForm').on('submit', function(e) {
            e.preventDefault();
            
            const type = $('#qrType').val();
            const target = $('#qrTarget').val();
            const customData = $('#customData').val();
            
            console.log('📋 Form submitted:', { type, target, customData });
            
            if (!type || !target) {
                alert('Будь ласка, заповніть всі обов\'язкові поля');
                return;
            }
            
            // Формуємо дані для QR
            let qrData;
            if (type === 'custom' && target === 'text') {
                qrData = customData || 'DeapSeaK LiftMaster';
            } else if (target.startsWith('lift_')) {
                const liftId = target.replace('lift_', '');
                qrData = JSON.stringify({
                    type: 'lift',
                    id: liftId,
                    timestamp: new Date().toISOString()
                });
            } else {
                qrData = JSON.stringify({
                    type: type,
                    target: target,
                    data: customData,
                    timestamp: new Date().toISOString()
                });
            }
            
            generateQR(qrData);
        });
        
        // Обробники шаблонів
        $('.template-item').on('click', function() {
            $('.template-item').removeClass('active');
            $(this).addClass('active');
            
            const template = $(this).data('template');
            applyTemplate(template);
        });
    }
    
    // Застосування шаблону
    function applyTemplate(template) {
        switch(template) {
            case 'lift-standard':
                $('#qrType').val('lift').trigger('change');
                $('#qrSize').val(300);
                $('#qrColorPicker input').val('#000000');
                break;
            case 'technician':
                $('#qrType').val('technician').trigger('change');
                $('#qrSize').val(250);
                $('#qrColorPicker input').val('#007bff');
                break;
            case 'maintenance':
                $('#qrType').val('maintenance').trigger('change');
                $('#qrSize').val(350);
                $('#qrColorPicker input').val('#28a745');
                break;
        }
    }
    
    // Public methods
    return {
        init: init,
        downloadPNG: downloadPNG,
        downloadSVG: downloadSVG,
        downloadPDF: downloadPDF,
        copyToClipboard: copyToClipboard,
        resetForm: resetForm
    };
})();

// Initialize when document is ready
$(document).ready(function() {
    qrGenerator.init();
});