// Test Lift Saving Functionality
function testLiftSaving() {
    // logger.log('=== TESTING LIFT SAVING ===');
    
    // Перевіряємо наявність необхідних компонентів
    // logger.log('1. Checking dependencies...');
    // logger.log('allLifts available:', typeof allLifts !== 'undefined');
    // logger.log('CommonUtils available:', typeof CommonUtils !== 'undefined');
    // logger.log('enhancedLiftModal available:', typeof window.enhancedLiftModal !== 'undefined');
    
    if (typeof allLifts !== 'undefined') {
        // logger.log('Current lifts count:', allLifts.length);
        // logger.log('Current lifts:', allLifts);
    }
    
    // Тестові дані ліфта
    const testLiftData = {
        municipalNumber: 'TEST-001',
        serialNumber: 'SN-TEST-123',
        brand: 'otis',
        model: 'Test Model',
        type: 'passenger',
        capacity: 8,
        speed: 1.0,
        address: 'Тестова адреса, 1, Київ',
        postcode: '01001',
        lat: 50.4501,
        lng: 30.5234,
        clientName: 'Тестовий клієнт',
        clientEmail: 'test@example.com',
        status: 'active'
    };
    
    // logger.log('2. Test lift data:', testLiftData);
    
    // Спробуємо зберегти ліфт
    try {
        if (window.enhancedLiftModal) {
            // logger.log('3. Converting to lift format...');
            const convertedData = window.enhancedLiftModal.convertToLiftFormat(testLiftData);
            // logger.log('Converted data:', convertedData);
            
            // logger.log('4. Attempting to save...');
            window.enhancedLiftModal.saveLiftData(convertedData).then(() => {
                // logger.log('✅ SAVE SUCCESSFUL!');
                // logger.log('New lifts count:', allLifts.length);
                // logger.log('Last lift:', allLifts[allLifts.length - 1]);
                
                // Оновлюємо інтерфейс
                if (window.liftManager && window.liftManager.loadLifts) {
                    window.liftManager.loadLifts();
                    // logger.log('✅ Interface updated');
                }
            }).catch(error => {
                // logger.error('❌ SAVE FAILED:', error);
            });
        } else {
            // logger.error('❌ Enhanced Lift Modal not available');
        }
    } catch (error) {
        // logger.error('❌ TEST FAILED:', error);
    }
    
    // logger.log('=== TEST COMPLETED ===');
}

// Функція для очищення тестових даних
function clearTestLifts() {
    if (typeof allLifts !== 'undefined') {
        const originalCount = allLifts.length;
        
        // Видаляємо всі ліфти з TEST- префіксом
        allLifts = allLifts.filter(lift => !lift.municipalNumber?.startsWith('TEST-'));
        
        // Зберігаємо оновлений список
        if (typeof CommonUtils !== 'undefined' && CommonUtils.saveLifts) {
            CommonUtils.saveLifts(allLifts);
        } else {
            localStorage.setItem('lifts', JSON.stringify(allLifts));
        }
        
        // logger.log(`Cleared ${originalCount - allLifts.length} test lifts`);
        
        // Оновлюємо інтерфейс
        if (window.liftManager && window.liftManager.loadLifts) {
            window.liftManager.loadLifts();
        }
    }
}

// Функція для показу поточного стану localStorage
function showStorageState() {
    // logger.log('=== STORAGE STATE ===');
    
    try {
        const stored = localStorage.getItem('lifts');
        if (stored) {
            const parsed = JSON.parse(stored);
            // logger.log('Lifts in localStorage:', parsed.length);
            parsed.forEach((lift, index) => {
                // logger.log(`${index + 1}. ${lift.municipalNumber || lift.id} - ${lift.address || 'No address'}`);
            });
        } else {
            // logger.log('No lifts in localStorage');
        }
    } catch (error) {
        // logger.error('Error reading localStorage:', error);
    }
    
    if (typeof allLifts !== 'undefined') {
        // logger.log('Lifts in memory:', allLifts.length);
    }
    
    // logger.log('===================');
}

// Автоматично викликаємо при завантаженні сторінки (тільки в режимі розробки)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // logger.log('🔧 Development mode detected. Test functions available:');
    // logger.log('- testLiftSaving() - Test saving functionality');
    // logger.log('- clearTestLifts() - Remove test lifts');
    // logger.log('- showStorageState() - Show current storage state');
    
    // Показуємо стан при завантаженні
    setTimeout(showStorageState, 1000);
}