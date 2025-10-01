// Test Lift Saving Functionality
function testLiftSaving() {
    console.log('=== TESTING LIFT SAVING ===');
    
    // Перевіряємо наявність необхідних компонентів
    console.log('1. Checking dependencies...');
    console.log('allLifts available:', typeof allLifts !== 'undefined');
    console.log('CommonUtils available:', typeof CommonUtils !== 'undefined');
    console.log('enhancedLiftModal available:', typeof window.enhancedLiftModal !== 'undefined');
    
    if (typeof allLifts !== 'undefined') {
        console.log('Current lifts count:', allLifts.length);
        console.log('Current lifts:', allLifts);
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
    
    console.log('2. Test lift data:', testLiftData);
    
    // Спробуємо зберегти ліфт
    try {
        if (window.enhancedLiftModal) {
            console.log('3. Converting to lift format...');
            const convertedData = window.enhancedLiftModal.convertToLiftFormat(testLiftData);
            console.log('Converted data:', convertedData);
            
            console.log('4. Attempting to save...');
            window.enhancedLiftModal.saveLiftData(convertedData).then(() => {
                console.log('✅ SAVE SUCCESSFUL!');
                console.log('New lifts count:', allLifts.length);
                console.log('Last lift:', allLifts[allLifts.length - 1]);
                
                // Оновлюємо інтерфейс
                if (window.liftManager && window.liftManager.loadLifts) {
                    window.liftManager.loadLifts();
                    console.log('✅ Interface updated');
                }
            }).catch(error => {
                console.error('❌ SAVE FAILED:', error);
            });
        } else {
            console.error('❌ Enhanced Lift Modal not available');
        }
    } catch (error) {
        console.error('❌ TEST FAILED:', error);
    }
    
    console.log('=== TEST COMPLETED ===');
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
        
        console.log(`Cleared ${originalCount - allLifts.length} test lifts`);
        
        // Оновлюємо інтерфейс
        if (window.liftManager && window.liftManager.loadLifts) {
            window.liftManager.loadLifts();
        }
    }
}

// Функція для показу поточного стану localStorage
function showStorageState() {
    console.log('=== STORAGE STATE ===');
    
    try {
        const stored = localStorage.getItem('lifts');
        if (stored) {
            const parsed = JSON.parse(stored);
            console.log('Lifts in localStorage:', parsed.length);
            parsed.forEach((lift, index) => {
                console.log(`${index + 1}. ${lift.municipalNumber || lift.id} - ${lift.address || 'No address'}`);
            });
        } else {
            console.log('No lifts in localStorage');
        }
    } catch (error) {
        console.error('Error reading localStorage:', error);
    }
    
    if (typeof allLifts !== 'undefined') {
        console.log('Lifts in memory:', allLifts.length);
    }
    
    console.log('===================');
}

// Автоматично викликаємо при завантаженні сторінки (тільки в режимі розробки)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Development mode detected. Test functions available:');
    console.log('- testLiftSaving() - Test saving functionality');
    console.log('- clearTestLifts() - Remove test lifts');
    console.log('- showStorageState() - Show current storage state');
    
    // Показуємо стан при завантаженні
    setTimeout(showStorageState, 1000);
}