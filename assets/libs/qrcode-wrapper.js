/**
 * QRCode Wrapper
 * Додає window.QRCode як псевдонім для qrcode бібліотеки
 * qrcode-generator експортує "qrcode" (малими літерами)
 * але багато коду очікує "QRCode" (великими)
 */
(function() {
    'use strict';
    
    // logger.log('🔧 QRCode Wrapper: Починаю...');
    
    // Чекаємо поки завантажиться qrcode
    let attempts = 0;
    const maxAttempts = 100;
    
    function setupWrapper() {
        attempts++;
        
        if (typeof qrcode !== 'undefined') {
            // Знайшли qrcode! Створюємо QRCode як псевдонім
            window.QRCode = qrcode;
            // logger.log('✅ QRCode Wrapper: Створено window.QRCode');
            // logger.log('  - qrcode доступний:', typeof qrcode);
            // logger.log('  - QRCode доступний:', typeof QRCode);
            return;
        }
        
        if (attempts >= maxAttempts) {
            // logger.error('❌ QRCode Wrapper: qrcode не завантажився після', maxAttempts, 'спроб');
            return;
        }
        
        // Повторити
        setTimeout(setupWrapper, 50);
    }
    
    // Почати через 10мс
    setTimeout(setupWrapper, 10);
})();
