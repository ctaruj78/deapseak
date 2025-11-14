/**
 * QRCode Wrapper
 * Перевіряє чи QRCode вже завантажений
 * qrcodejs експортує window.QRCode напряму
 */
(function() {
    'use strict';
    
    console.log('🔧 QRCode Wrapper: Починаю...');
    
    // Чекаємо поки завантажиться QRCode
    let attempts = 0;
    const maxAttempts = 50; // Зменшено до 50 (2.5 секунди)
    
    function setupWrapper() {
        attempts++;
        
        if (typeof QRCode !== 'undefined') {
            // QRCode вже є!
            console.log('✅ QRCode Wrapper: QRCode доступний');
            console.log('  - QRCode type:', typeof QRCode);
            console.log('  - QRCode constructor:', QRCode.name || 'unnamed');
            return;
        }
        
        if (attempts >= maxAttempts) {
            console.error('❌ QRCode Wrapper: QRCode не завантажився після', maxAttempts, 'спроб (2.5 сек)');
            console.warn('⚠️ QR код функції будуть недоступні');
            return;
        }
        
        // Повторити
        setTimeout(setupWrapper, 50);
    }
    
    // Почати через 10мс
    setTimeout(setupWrapper, 10);
})();
