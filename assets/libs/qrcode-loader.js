/**
 * QRCode Loader - Локальна обгортка для завантаження QRCode бібліотеки
 * Якщо CDN недоступні, використовує локальну копію
 */

(function() {
    'use strict';
    
    // logger.log('🔄 QRCode Loader: Starting...');
    
    // Список джерел для завантаження qrcodejs (та сама що в common.js!)
    const cdnSources = [
        '/assets/libs/qrcodejs.min.js',  // Локальна копія (20KB) - ПРАВИЛЬНА бібліотека!
        'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
        'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
    ];
    
    let loadAttempt = 0;
    const maxAttempts = cdnSources.length;
    
    function tryLoadQRCode() {
        if (loadAttempt >= maxAttempts) {
            // logger.error('❌ QRCode Loader: All sources (local + CDN) failed');
            showErrorMessage();
            return;
        }

        const currentSource = cdnSources[loadAttempt];
        const sourceType = currentSource.startsWith('/') ? 'локальна' : 'CDN';
        // logger.log(`🔄 QRCode Loader: Trying ${sourceType} source ${loadAttempt + 1}/${maxAttempts}: ${currentSource}`);
        
        const script = document.createElement('script');
        script.src = currentSource;
        
        script.onload = function() {
            // logger.log('✅ QRCode Loader: Successfully loaded from ' + currentSource);
            // Завантажуємо wrapper який створить window.QRCode
            loadWrapper();
        };
        
        script.onerror = function() {
            // logger.warn(`⚠️ QRCode Loader: Failed to load from ${currentSource}`);
            loadAttempt++;
            setTimeout(tryLoadQRCode, 500); // Спробувати наступне джерело через 0.5 сек
        };
        
        document.head.appendChild(script);
    }
    
    function loadWrapper() {
        // logger.log('🔧 Loading QRCode wrapper...');
        const wrapperScript = document.createElement('script');
        wrapperScript.src = '/assets/libs/qrcode-wrapper.js';
        
        wrapperScript.onload = function() {
            // logger.log('✅ Wrapper loaded');
            checkQRCodeAvailability();
        };
        
        wrapperScript.onerror = function() {
            // logger.warn('⚠️ Wrapper failed to load, trying direct setup...');
            // Якщо wrapper не завантажився, спробуємо встановити напряму
            setTimeout(function() {
                if (typeof qrcode !== 'undefined' && typeof QRCode === 'undefined') {
                    window.QRCode = qrcode;
                    // logger.log('✅ QRCode створено напряму з qrcode');
                }
                checkQRCodeAvailability();
            }, 100);
        };
        
        document.head.appendChild(wrapperScript);
    }
    
    function checkQRCodeAvailability() {
        setTimeout(function() {
            if (typeof QRCode !== 'undefined') {
                // logger.log('✅ QRCode is available:', typeof QRCode);
                
                // Перевірка наявності методу toCanvas
                if (typeof QRCode.toCanvas === 'function') {
                    // logger.log('✅ QRCode.toCanvas method available');
                } else {
                    // logger.warn('⚠️ QRCode.toCanvas method not found, may need alternative library');
                }
                
                // Викликаємо подію що бібліотека завантажена
                if (typeof window.CustomEvent === 'function') {
                    const event = new CustomEvent('qrcodeLoaded', { 
                        detail: { 
                            source: cdnSources[loadAttempt - 1],
                            hasToCanvas: typeof QRCode.toCanvas === 'function'
                        } 
                    });
                    window.dispatchEvent(event);
                }
            } else {
                // logger.error('❌ QRCode still not available after loading script');
                loadAttempt++;
                tryLoadQRCode();
            }
        }, 100);
    }
    
    function showErrorMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            max-width: 350px;
        `;
        message.innerHTML = `
            <strong>⚠️ Помилка завантаження QR-бібліотеки</strong><br>
            <small>Перевірте інтернет-з'єднання або спробуйте оновити сторінку (Ctrl+Shift+R)</small>
            <br><br>
            <button onclick="window.location.reload(true)" style="background: white; color: #f44336; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px;">
                🔄 Оновити сторінку
            </button>
        `;
        document.body.appendChild(message);
        
        // Автоматично сховати через 10 секунд
        setTimeout(() => {
            if (message.parentNode) {
                message.style.transition = 'opacity 0.5s';
                message.style.opacity = '0';
                setTimeout(() => message.remove(), 500);
            }
        }, 10000);
    }
    
    // Початок завантаження
    if (typeof QRCode === 'undefined') {
        // logger.log('🚀 QRCode Loader: QRCode not found, starting load sequence...');
        tryLoadQRCode();
    } else {
        // logger.log('✅ QRCode Loader: QRCode already loaded');
    }
    
})();
