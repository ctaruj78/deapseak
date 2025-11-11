const QRCode = require('qrcode');

class QRService {
    /**
     * Генерація QR коду для ліфта
     */
    async generateLiftQR(liftId, format = 'dataURL') {
        try {
            const url = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/lift-info.html?id=${liftId}`;
            
            const options = {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                width: 300,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            };

            if (format === 'dataURL') {
                return await QRCode.toDataURL(url, options);
            } else if (format === 'buffer') {
                return await QRCode.toBuffer(url, options);
            } else {
                throw new Error('Invalid format. Use "dataURL" or "buffer"');
            }
        } catch (error) {
            console.error('QR generation error:', error);
            throw error;
        }
    }

    /**
     * Генерація QR коду для заявки
     */
    async generateRequestQR(requestId, format = 'dataURL') {
        try {
            const url = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/request-info.html?id=${requestId}`;
            
            const options = {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                quality: 0.95,
                margin: 2,
                width: 256
            };

            if (format === 'dataURL') {
                return await QRCode.toDataURL(url, options);
            } else if (format === 'buffer') {
                return await QRCode.toBuffer(url, options);
            }
        } catch (error) {
            console.error('QR generation error:', error);
            throw error;
        }
    }

    /**
     * Генерація QR коду з довільним текстом
     */
    async generateCustomQR(text, options = {}) {
        try {
            const defaultOptions = {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                width: 300,
                ...options
            };

            return await QRCode.toDataURL(text, defaultOptions);
        } catch (error) {
            console.error('QR generation error:', error);
            throw error;
        }
    }
}

module.exports = new QRService();
