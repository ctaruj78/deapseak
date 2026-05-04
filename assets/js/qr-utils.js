/**
 * Утилітні функції для роботи з QR-кодами
 */

const qrUtils = (function() {
    // URL для API
    const apiBaseUrl = '/api/qr';

    /**
     * Отримання списку всіх QR-кодів з можливістю фільтрації
     * @param {Object} filters - Параметри фільтрації
     * @param {Number} page - Номер сторінки для пагінації
     * @param {Number} limit - Кількість елементів на сторінці
     * @returns {Promise} Promise з результатами запиту
     */
    async function getQRCodes(filters = {}, page = 1, limit = 20) {
        try {
            let url = `${apiBaseUrl}/codes?page=${page}&limit=${limit}`;
            
            // Додавання фільтрів до URL
            if (filters.type) url += `&type=${filters.type}`;
            if (filters.status) url += `&status=${filters.status}`;
            if (filters.createdFrom) url += `&createdFrom=${filters.createdFrom}`;
            if (filters.createdTo) url += `&createdTo=${filters.createdTo}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Erro отримання QR-кодів:', error);
            throw error;
        }
    }

    /**
     * Отримання конкретного QR-коду за ID
     * @param {String} id - ID QR-коду
     * @returns {Promise} Promise з QR-кодом
     */
    async function getQRCodeById(id) {
        try {
            const response = await fetch(`${apiBaseUrl}/codes/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error(`Erro отримання QR-коду з ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Створення нового QR-коду або оновлення існуючого
     * @param {Object} qrCodeData - Дані QR-коду
     * @returns {Promise} Promise з результатом операції
     */
    async function saveQRCode(qrCodeData) {
        try {
            const response = await fetch(`${apiBaseUrl}/codes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(qrCodeData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Erro ao guardar QR-коду:', error);
            throw error;
        }
    }

    /**
     * Видалення QR-коду
     * @param {String} id - ID QR-коду
     * @returns {Promise} Promise з результатом операції
     */
    async function deleteQRCode(id) {
        try {
            const response = await fetch(`${apiBaseUrl}/codes/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error(`Erro видалення QR-коду з ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Масове створення QR-кодів для ліфтів
     * @param {Object} options - Опції для створення QR-кодів
     * @returns {Promise} Promise з результатом операції
     */
    async function bulkCreateLiftQRCodes(options = {}) {
        try {
            const response = await fetch(`${apiBaseUrl}/bulk-create-lift-codes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(options)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Erro масового створення QR-кодів для ліфтів:', error);
            throw error;
        }
    }

    /**
     * Реєстрація сканування QR-коду
     * @param {String|Object} qrData - Дані QR-коду
     * @param {String} scannedBy - Utilizador, який відсканував QR-код
     * @param {Object} deviceInfo - Інформація про пристрій
     * @returns {Promise} Promise з результатом операції
     */
    async function scanQRCode(qrData, scannedBy = null, deviceInfo = null) {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            
            const response = await fetch(`${apiBaseUrl}/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    qrData,
                    scannedBy: scannedBy || userData.username || 'anonymous',
                    deviceInfo: deviceInfo || {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform
                    }
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Erro сканування QR-коду:', error);
            throw error;
        }
    }

    /**
     * Отримання статистики по QR-кодам
     * @returns {Promise} Promise зі статистикою
     */
    async function getQRStats() {
        try {
            const response = await fetch(`${apiBaseUrl}/stats`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Erro отримання статистики QR-кодів:', error);
            throw error;
        }
    }

    /**
     * Отримання історії сканувань QR-кодів
     * @param {Object} filters - Параметри фільтрації
     * @param {Number} page - Номер сторінки для пагінації
     * @param {Number} limit - Кількість елементів на сторінці
     * @returns {Promise} Promise з результатами запиту
     */
    async function getQRScans(filters = {}, page = 1, limit = 20) {
        try {
            let url = `${apiBaseUrl}/scans?page=${page}&limit=${limit}`;
            
            // Додавання фільтрів до URL
            if (filters.qrCodeId) url += `&qrCodeId=${filters.qrCodeId}`;
            if (filters.referenceType) url += `&referenceType=${filters.referenceType}`;
            if (filters.referenceId) url += `&referenceId=${filters.referenceId}`;
            if (filters.scannedBy) url += `&scannedBy=${filters.scannedBy}`;
            if (filters.fromDate) url += `&fromDate=${filters.fromDate}`;
            if (filters.toDate) url += `&toDate=${filters.toDate}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Erro отримання історії сканувань:', error);
            throw error;
        }
    }

    /**
     * Генерація QR-коду з текстом або JSON даними
     * @param {String|Object} data - Дані для QR-коду
     * @param {Object} options - Опції для QR-коду (розмір, колір, тощо)
     * @returns {Promise} Promise з URL зображення QR-коду
     */
    function generateQRCodeImage(data, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
                
                // Параметри за замовчуванням
                const defaultOptions = {
                    width: options.width || 200,
                    height: options.height || 200,
                    colorDark: options.colorDark || "#000000",
                    colorLight: options.colorLight || "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                };
                
                // Створення елементу canvas для генерації QR-коду
                const canvas = document.createElement('canvas');
                const qrCode = new QRCode(canvas, {
                    ...defaultOptions,
                    text: dataString
                });
                
                // Конвертація в зображення
                setTimeout(() => {
                    resolve(canvas.toDataURL('image/png'));
                }, 100);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Сканування QR-коду з відео потоку камери
     * @param {HTMLVideoElement} videoElement - Елемент відео для сканування
     * @param {Function} onScanSuccess - Функція, яка викликається при com sucessoму скануванні
     * @param {Function} onScanError - Функція, яка викликається при помилці сканування
     * @returns {Object} Об'єкт для керування скануванням
     */
    function initQRScanner(videoElement, onScanSuccess, onScanError) {
        let scanner = null;
        let isScanning = false;
        
        // Функція для запуску сканування
        async function startScanning() {
            if (isScanning) return;
            
            try {
                isScanning = true;
                
                // Створюємо сканер, якщо його ще немає
                if (!scanner) {
                    scanner = new Html5Qrcode(videoElement.id);
                }
                
                // Запускаємо сканування
                await scanner.start(
                    { facingMode: "environment" }, // Definições для задньої камери
                    {
                        fps: 10,
                        qrbox: 250
                    },
                    async (decodedText, decodedResult) => {
                        // Успішне сканування
                        if (onScanSuccess) {
                            onScanSuccess(decodedText, decodedResult);
                        }
                    },
                    (errorMessage) => {
                        // Erro сканування
                        if (onScanError) {
                            onScanError(errorMessage);
                        }
                    }
                );
            } catch (error) {
                isScanning = false;
                if (onScanError) {
                    onScanError(error);
                }
            }
        }
        
        // Функція для зупинки сканування
        async function stopScanning() {
            if (!isScanning || !scanner) return;
            
            try {
                await scanner.stop();
                isScanning = false;
            } catch (error) {
                console.error('Erro зупинки сканера QR-кодів:', error);
            }
        }
        
        return {
            start: startScanning,
            stop: stopScanning,
            isScanning: () => isScanning
        };
    }

    return {
        getQRCodes,
        getQRCodeById,
        saveQRCode,
        deleteQRCode,
        bulkCreateLiftQRCodes,
        scanQRCode,
        getQRStats,
        getQRScans,
        generateQRCodeImage,
        initQRScanner
    };
})();