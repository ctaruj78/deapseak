/**
 * QRManager - Расширенный класс для управления QR-кодами
 * Обеспечивает функционал создания, сканирования и управления QR-кодами
 */
class QRManager {
    constructor() {
        this.qrLibLoaded = false;
        this.jsQRLibLoaded = false;
        this.lastGeneratedQR = null;
        this.isScanning = false;
        this.scanner = null;
        this.video = null;
    }
    
    /**
     * Загружает библиотеку QR-кодов, если она еще не загружена
     */
    async loadQRLib() {
        if (this.qrLibLoaded) return true;
        
        return new Promise((resolve, reject) => {
            if (typeof QRCode !== 'undefined') {
                this.qrLibLoaded = true;
                resolve(true);
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js';
            script.onload = () => {
                this.qrLibLoaded = true;
                resolve(true);
            };
            script.onerror = (error) => {
                // logger.error('Ошибка загрузки библиотеки QRCode:', error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Загружает библиотеку jsQR для сканирования QR-кодов
     */
    async loadJsQRLib() {
        if (this.jsQRLibLoaded) return true;
        
        return new Promise((resolve, reject) => {
            if (typeof jsQR !== 'undefined') {
                this.jsQRLibLoaded = true;
                resolve(true);
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
            script.onload = () => {
                this.jsQRLibLoaded = true;
                resolve(true);
            };
            script.onerror = (error) => {
                // logger.error('Ошибка загрузки библиотеки jsQR:', error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Генерирует QR-код в указанном контейнере
     * @param {string} containerId - ID элемента-контейнера
     * @param {string|object} data - Данные для QR-кода
     * @param {object} options - Дополнительные опции
     * @returns {QRCode|null} Объект QR-кода или null в случае ошибки
     */
    static generateQRCode(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            // logger.error(`Контейнер с ID ${containerId} не найден`);
            return null;
        }
        
        // Подготовка данных
        const qrText = typeof data === 'object' ? JSON.stringify(data) : data;
        
        // Настройки по умолчанию
        const defaultOptions = {
            text: qrText,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        };
        
        // Объединяем с пользовательскими опциями
        const finalOptions = {...defaultOptions, ...options};
        
        try {
            // Очистка контейнера перед генерацией
            container.innerHTML = '';
            
            // Создаем QR-код
            return new QRCode(container, finalOptions);
        } catch (error) {
            // logger.error('Ошибка при создании QR-кода:', error);
            return null;
        }
    }

    /**
     * Генерирует QR-коды для всех лифтов
     * @param {Array} lifts - Массив объектов лифтов (опционально)
     * @param {string} containerId - ID контейнера для QR-кодов
     */
    static generateAllQRCodes(lifts = null, containerId = 'qrcodes-container') {
        // Получаем лифты, если не переданы
        const liftsData = lifts || (typeof LiftAPI !== 'undefined' ? LiftAPI.getLifts() : []);
        
        const container = document.getElementById(containerId);
        if (!container) {
            // logger.error(`Контейнер с ID ${containerId} не найден`);
            return;
        }
        
        container.innerHTML = '';
        
        if (liftsData.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Нет данных о лифтах для генерации QR-кодов</div>';
            return;
        }
        
        liftsData.forEach(lift => {
            const liftCard = document.createElement('div');
            liftCard.className = 'qr-card card m-2';
            
            liftCard.innerHTML = `
                <div class="card-header">
                    <h5>Лифт ${lift.serialNumber || lift.id}</h5>
                </div>
                <div class="card-body text-center">
                    <div class="qr-code" id="qr-${lift.id}"></div>
                    <p class="mt-2">${lift.address || 'Адрес не указан'}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-outline-primary download-qr" data-id="${lift.id}">
                        <i class="fas fa-download"></i> Скачать
                    </button>
                    <button class="btn btn-sm btn-outline-info print-qr" data-id="${lift.id}">
                        <i class="fas fa-print"></i> Печать
                    </button>
                </div>
            `;
            
            container.appendChild(liftCard);
            
            this.generateQRCode(`qr-${lift.id}`, JSON.stringify({
                liftId: lift.id,
                serial: lift.serialNumber || '',
                type: 'lift',
                timestamp: new Date().toISOString()
            }));
        });
        
        // Добавляем обработчики для кнопок скачивания и печати
        const downloadButtons = container.querySelectorAll('.download-qr');
        downloadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const liftId = e.target.closest('button').getAttribute('data-id');
                this.downloadQRCode(`qr-${liftId}`);
            });
        });
        
        const printButtons = container.querySelectorAll('.print-qr');
        printButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const liftId = e.target.closest('button').getAttribute('data-id');
                this.printQRCode(`qr-${liftId}`);
            });
        });
    }
    
    /**
     * Скачивает QR-код как изображение
     * @param {string} containerId - ID контейнера с QR-кодом
     */
    static downloadQRCode(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            // logger.error(`Контейнер с ID ${containerId} не найден`);
            return;
        }
        
        const canvas = container.querySelector('canvas');
        if (!canvas) {
            // logger.error(`Canvas не найден в контейнере ${containerId}`);
            return;
        }
        
        try {
            // Создаем ссылку для скачивания
            const link = document.createElement('a');
            link.download = `qrcode-${containerId}-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // Показываем уведомление об успехе
            if (typeof toastr !== 'undefined') {
                toastr.success('QR-код успешно скачан');
            }
        } catch (error) {
            // logger.error('Ошибка при скачивании QR-кода:', error);
            if (typeof toastr !== 'undefined') {
                toastr.error('Ошибка при скачивании QR-кода');
            }
        }
    }
    
    /**
     * Печатает QR-код
     * @param {string} containerId - ID контейнера с QR-кодом
     */
    static printQRCode(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            // logger.error(`Контейнер с ID ${containerId} не найден`);
            return;
        }
        
        const canvas = container.querySelector('canvas');
        if (!canvas) {
            // logger.error(`Canvas не найден в контейнере ${containerId}`);
            return;
        }
        
        try {
            // Создаем окно печати
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Печать QR-кода</title>
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            padding: 20px;
                            box-sizing: border-box;
                            font-family: Arial, sans-serif;
                        }
                        .print-container {
                            text-align: center;
                        }
                        .print-info {
                            margin: 20px 0;
                            font-size: 14px;
                            color: #666;
                        }
                        .qr-image {
                            max-width: 300px;
                            max-height: 300px;
                        }
                        @media print {
                            .no-print {
                                display: none;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <h2>QR-код</h2>
                        <img src="${canvas.toDataURL('image/png')}" class="qr-image" alt="QR Code">
                        <div class="print-info">
                            <p>Создан: ${new Date().toLocaleString()}</p>
                            <p>DeapSeak LiftMaster - Система управления лифтами</p>
                        </div>
                        <button class="no-print" onclick="window.print()">Печать</button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            // logger.error('Ошибка при печати QR-кода:', error);
            if (typeof toastr !== 'undefined') {
                toastr.error('Ошибка при печати QR-кода');
            }
        }
    }

    /**
     * Создает QR-код с указанными данными (асинхронная версия)
     * @param {string|object} data - Данные для кодирования в QR
     * @param {object} options - Опции для генерации QR-кода
     * @param {string} elementId - ID элемента, куда будет добавлен QR-код
     */
    async generateQR(data, options = {}, elementId) {
        try {
            await this.loadQRLib();
            
            // Конвертация объекта в JSON-строку, если передан объект
            const qrData = typeof data === 'object' ? JSON.stringify(data) : data;
            
            // Настройки по умолчанию
            const defaultOptions = {
                text: qrData,
                width: 250,
                height: 250,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            };
            
            // Объединение настроек с пользовательскими
            const mergedOptions = { ...defaultOptions, ...options };
            
            // Очистка контейнера
            const container = document.getElementById(elementId);
            if (!container) {
                throw new Error(`Элемент с ID ${elementId} не найден`);
            }
            container.innerHTML = '';
            
            // Создание QR-кода
            this.lastGeneratedQR = new QRCode(container, mergedOptions);
            
            // Добавляем кнопки для скачивания и печати
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'qr-actions mt-3';
            actionsDiv.innerHTML = `
                <button class="btn btn-sm btn-outline-primary mr-2" id="downloadQR-${elementId}">
                    <i class="fas fa-download"></i> Скачать QR-код
                </button>
                <button class="btn btn-sm btn-outline-info" id="printQR-${elementId}">
                    <i class="fas fa-print"></i> Распечатать
                </button>
            `;
            container.parentNode.appendChild(actionsDiv);
            
            // Добавляем обработчики событий
            document.getElementById(`downloadQR-${elementId}`).addEventListener('click', () => this.downloadQR());
            document.getElementById(`printQR-${elementId}`).addEventListener('click', () => this.printQR());
            
            return true;
        } catch (error) {
            // logger.error('Ошибка генерации QR-кода:', error);
            return false;
        }
    }
    
    /**
     * Скачивание QR-кода (для экземпляра класса)
     */
    downloadQR() {
        if (!this.lastGeneratedQR) {
            if (typeof toastr !== 'undefined') {
                toastr.error('QR-код не был сгенерирован');
            } else {
                alert('QR-код не был сгенерирован');
            }
            return;
        }
        
        try {
            // Получаем canvas с QR-кодом
            const canvas = document.querySelector('#' + this.lastGeneratedQR._el.id + ' canvas');
            if (!canvas) {
                throw new Error('Canvas QR-кода не найден');
            }
            
            // Создаем ссылку для скачивания
            const link = document.createElement('a');
            link.download = 'qrcode-' + new Date().toISOString().split('T')[0] + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // Показываем уведомление
            if (typeof toastr !== 'undefined') {
                toastr.success('QR-код успешно скачан');
            }
        } catch (error) {
            // logger.error('Ошибка скачивания QR-кода:', error);
            if (typeof toastr !== 'undefined') {
                toastr.error('Ошибка скачивания QR-кода: ' + error.message);
            } else {
                alert('Ошибка скачивания QR-кода: ' + error.message);
            }
        }
    }
    
    /**
     * Печать QR-кода (для экземпляра класса)
     */
    printQR() {
        if (!this.lastGeneratedQR) {
            if (typeof toastr !== 'undefined') {
                toastr.error('QR-код не был сгенерирован');
            } else {
                alert('QR-код не был сгенерирован');
            }
            return;
        }
        
        try {
            // Получаем canvas с QR-кодом
            const canvas = document.querySelector('#' + this.lastGeneratedQR._el.id + ' canvas');
            if (!canvas) {
                throw new Error('Canvas QR-кода не найден');
            }
            
            // Создаем окно печати
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Печать QR-кода</title>
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            padding: 20px;
                            box-sizing: border-box;
                            font-family: Arial, sans-serif;
                        }
                        .print-container {
                            text-align: center;
                        }
                        .print-info {
                            margin: 20px 0;
                            font-size: 14px;
                            color: #666;
                        }
                        .qr-image {
                            max-width: 400px;
                            max-height: 400px;
                        }
                        @media print {
                            .no-print {
                                display: none;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <h2>QR-код</h2>
                        <img src="${canvas.toDataURL('image/png')}" class="qr-image" alt="QR Code">
                        <div class="print-info">
                            <p>Создан: ${new Date().toLocaleString()}</p>
                            <p>DeapSeak LiftMaster - Система управления лифтами</p>
                        </div>
                        <button class="no-print" onclick="window.print()">Печать</button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            // logger.error('Ошибка печати QR-кода:', error);
            if (typeof toastr !== 'undefined') {
                toastr.error('Ошибка печати QR-кода: ' + error.message);
            } else {
                alert('Ошибка печати QR-кода: ' + error.message);
            }
        }
    }
    
    /**
     * Начинает сканирование QR-кода с помощью камеры
     * @param {string} videoElementId - ID видеоэлемента для отображения потока камеры
     * @param {function} callback - Функция, которая будет вызвана после успешного сканирования
     */
    async startScanner(videoElementId, callback) {
        try {
            await this.loadJsQRLib();
            
            const videoElement = document.getElementById(videoElementId);
            if (!videoElement) {
                throw new Error(`Элемент с ID ${videoElementId} не найден`);
            }
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Ваш браузер не поддерживает доступ к камере');
            }
            
            // Запрос доступа к камере
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            
            videoElement.srcObject = stream;
            this.video = videoElement;
            
            // Начинаем сканирование после загрузки видео
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                
                // Создаем canvas для анализа видео
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                
                // Устанавливаем размеры canvas
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                
                this.isScanning = true;
                
                // Функция для обработки каждого кадра видео
                const scanFrame = () => {
                    if (!this.isScanning) return;
                    
                    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                        // Рисуем текущий кадр на canvas
                        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                        
                        // Получаем данные изображения
                        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                        
                        // Сканируем QR-код
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert"
                        });
                        
                        // Если QR-код обнаружен
                        if (code) {
                            // Останавливаем сканирование
                            this.stopScanner();
                            
                            // Вызываем callback с результатом
                            callback(code.data);
                        }
                    }
                    
                    // Продолжаем сканирование
                    requestAnimationFrame(scanFrame);
                };
                
                scanFrame();
            };
        } catch (error) {
            // logger.error('Ошибка сканирования QR-кода:', error);
            
            if (typeof toastr !== 'undefined') {
                toastr.error('Ошибка сканирования: ' + error.message);
            } else {
                alert('Ошибка сканирования: ' + error.message);
            }
        }
    }
    
    /**
     * Останавливает сканирование QR-кода
     */
    stopScanner() {
        this.isScanning = false;
        
        // Останавливаем видеопоток
        if (this.video && this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }
    }
    
    /**
     * Обрабатывает отсканированный QR-код
     * @param {string} data - Данные, полученные из QR-кода
     */
    static processQRData(data) {
        try {
            // Пытаемся распарсить данные как JSON
            let parsedData;
            try {
                parsedData = JSON.parse(data);
            } catch (e) {
                // Если не удалось распарсить как JSON, считаем данные строкой
                return { type: 'text', data: data };
            }
            
            // Проверяем, есть ли поле type
            if (parsedData.liftId) {
                // Редирект на страницу с информацией о лифте, если есть идентификатор лифта
                return { type: 'lift', data: parsedData };
            } else if (parsedData.type && parsedData.id) {
                switch (parsedData.type) {
                    case 'lift':
                        // Для совместимости с новым форматом QR-кодов
                        return { type: 'lift', data: parsedData };
                    
                    case 'request':
                        // Для заявок на обслуживание
                        return { type: 'request', data: parsedData };
                    
                    default:
                        return { type: 'unknown', data: parsedData };
                }
            }
            
            return { type: 'json', data: parsedData };
        } catch (error) {
            // logger.error('Ошибка обработки QR-кода:', error);
            return { type: 'error', error: error.message };
        }
    }
}

// Создаем глобальный экземпляр для использования в приложении
window.qrManager = new QRManager();