const express = require('express');
const router = express.Router();
const liftController = require('../controllers/liftController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');

/**
 * Маршрути для роботи з ліфтами
 * Всі маршрути захищені автентифікацією
 */

// GET /api/lifts - Отримання всіх ліфтів з фільтрацією
router.get('/', authenticate, liftController.getAllLifts);

// GET /api/lifts/stats - Статистика по ліфтах (для admin та dispatcher)
router.get('/stats', 
    authenticate, 
    authorizeRoles('admin', 'dispatcher'), 
    liftController.getLiftsStats
);

// GET /api/lifts/export/excel - Експорт ліфтів в Excel
router.get('/export/excel',
    authenticate,
    authorizeRoles('admin', 'dispatcher'),
    liftController.exportLiftsToExcel
);

// GET /api/lifts/nearby - Пошук ліфтів поблизу (геопросторовий пошук)
router.get('/nearby', authenticate, liftController.getLiftsNearby);

// GET /api/lifts/municipal/:municipalNumber - Отримання ліфта по муніципальному номеру
router.get('/municipal/:municipalNumber', authenticate, liftController.getLiftByMunicipalNumber);

// GET /api/lifts/:id - Отримання ліфта по ID
router.get('/:id', authenticate, liftController.getLiftById);

// GET /api/lifts/:id/qr - Генерація QR коду для ліфта
router.get('/:id/qr', authenticate, liftController.generateLiftQR);

// POST /api/lifts - Створення нового ліфта (admin, dispatcher)
router.post('/', 
    authenticate, 
    authorizeRoles('admin', 'dispatcher'), 
    liftController.createLift
);

// PUT /api/lifts/:id - Оновлення ліфта (admin, dispatcher)
router.put('/:id', 
    authenticate, 
    authorizeRoles('admin', 'dispatcher'), 
    liftController.updateLift
);

// PATCH /api/lifts/:id/status - Зміна статусу ліфта (admin, dispatcher, technician)
router.patch('/:id/status', 
    authenticate, 
    authorizeRoles('admin', 'dispatcher', 'technician'), 
    liftController.updateLiftStatus
);

// POST /api/lifts/:id/inspection - Додавання інспекції (technician, admin)
router.post('/:id/inspection', 
    authenticate, 
    authorizeRoles('admin', 'technician'), 
    liftController.addInspection
);

// POST /api/lifts/:id/photo - Додавання фото до ліфта
router.post('/:id/photo', authenticate, liftController.addPhoto);

// POST /api/lifts/:id/assign-technician - Призначення техніка (admin, dispatcher)
router.post('/:id/assign-technician', 
    authenticate, 
    authorizeRoles('admin', 'dispatcher'), 
    liftController.assignTechnician
);

// DELETE /api/lifts/:id - Видалення ліфта (тільки admin)
router.delete('/:id', 
    authenticate, 
    authorizeRoles('admin'), 
    liftController.deleteLift
);

module.exports = router;
