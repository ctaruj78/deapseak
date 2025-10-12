/**
 * QRCode Wrapper
 * Додає window.QRCode як псевдонім для qrcode бібліотеки
 * qrcode-generator експортує "qrcode" (малими літерами)
 * але багато коду очікує "QRCode" (великими)
 */
(function() {
    'use strict';
    
    console.log('🔧 QRCode Wrapper: Починаю...');
    
    // Чекаємо поки завантажиться qrcode
    let attempts = 0;
    const maxAttempts = 100;
    
    function setupWrapper() {
        attempts++;
        
        if (typeof qrcode !== 'undefined') {
            // Знайшли qrcode! Створюємо QRCode як псевдонім
            window.QRCode = qrcode;
            console.log('✅ QRCode Wrapper: Створено window.QRCode');
            console.log('  - qrcode доступний:', typeof qrcode);
            console.log('  - QRCode доступний:', typeof QRCode);
            return;
        }
        
        if (attempts >= maxAttempts) {
            console.error('❌ QRCode Wrapper: qrcode не завантажився після', maxAttempts, 'спроб');
            return;
        }
        
        // Повторити
        setTimeout(setupWrapper, 50);
    }
    
    // Почати через 10мс
    setTimeout(setupWrapper, 10);
})();
