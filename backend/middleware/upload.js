const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Створити директорію uploads якщо не існує
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Extensão derivada do mimetype VALIDADO pelo fileFilter, nunca do nome de
// ficheiro original — este é atribuído livremente pelo cliente no pedido, e
// usar path.extname(originalname) permitia guardar um "foto.png" que era na
// realidade um .html/.svg, servido depois a partir da própria origem da app.
const MIME_TO_EXT = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif'
};

// Налаштування зберігання файлів
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = MIME_TO_EXT[file.mimetype] || '.bin';
        cb(null, `upload-${uniqueSuffix}${ext}`);
    }
});

// Фільтр файлів - дозволяти тільки PDF для контрактів
const contractFileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Apenas ficheiros PDF são permitidos para contratos'), false);
    }
};

// Фільтр для звітів - PDF та зображення
const reportFileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Apenas PDF e imagens são permitidos'), false);
    }
};

// Фільтр для зображень
const imageFileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Apenas imagens são permitidas'), false);
    }
};

// Middleware для завантаження контрактів
const uploadContract = multer({
    storage: storage,
    fileFilter: contractFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
}).single('contract');

// Middleware для завантаження звітів
const uploadReport = multer({
    storage: storage,
    fileFilter: reportFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
}).single('report');

// Middleware для завантаження зображень
const uploadImage = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
}).single('image');

// Middleware для завантаження кількох зображень
const uploadImages = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB на файл
    }
}).array('images', 10); // максимум 10 зображень

module.exports = {
    uploadContract,
    uploadReport,
    uploadImage,
    uploadImages
};
