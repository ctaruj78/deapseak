const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');

/**
 * Маршрути для роботи з запитами/заявками
 * Всі маршрути захищені автентифікацією
 */

// GET /api/requests - Отримання всіх запитів з фільтрацією
router.get('/', authenticate, requestController.getAllRequests);

// GET /api/requests/stats - Статистика по запитах (для admin та dispatcher)
router.get('/stats', 
    authenticate, 
    authorizeRoles('admin', 'dispatcher'), 
    requestController.getRequestsStats
);

// GET /api/requests/export/excel - Експорт заявок в Excel
router.get('/export/excel', 
    authenticate, 
    authorizeRoles('admin', 'dispatcher'), 
    requestController.exportRequestsExcel
);

// GET /api/requests/:id - Отримання запиту по ID
router.get('/:id', authenticate, requestController.getRequestById);

// GET /api/requests/:id/export/pdf - Експорт заявки в PDF
router.get('/:id/export/pdf', 
    authenticate, 
    requestController.exportRequestPDF
);

// POST /api/requests - Створення нового запиту (всі авторизовані користувачі)
router.post('/', authenticate, requestController.createRequest);

// PUT /api/requests/:id - Оновлення запиту
router.put('/:id', authenticate, requestController.updateRequest);

// POST /api/requests/:id/assign - Призначення запиту техніку (admin, dispatcher)
router.post('/:id/assign', 
    authenticate, 
    authorizeRoles('admin', 'dispatcher'), 
    requestController.assignRequest
);

// PATCH /api/requests/:id/status - Зміна статусу запиту
router.patch('/:id/status', 
    authenticate, 
    requestController.updateRequestStatus
);

// POST /api/requests/:id/comment - Додавання коментаря до запиту
router.post('/:id/comment', authenticate, requestController.addComment);

// POST /api/requests/:id/photos - Додавання фото до запиту
router.post('/:id/photos', authenticate, requestController.addPhotos);

// PUT /api/requests/:id/work - Оновлення деталей роботи (technician)
router.put('/:id/work', 
    authenticate, 
    authorizeRoles('technician', 'admin'), 
    requestController.updateWorkDetails
);

// POST /api/requests/:id/complete - Завершення запиту (technician)
router.post('/:id/complete', 
    authenticate, 
    authorizeRoles('technician', 'admin'), 
    requestController.completeRequest
);

// POST /api/requests/:id/cancel - Скасування запиту
router.post('/:id/cancel', authenticate, requestController.cancelRequest);

// DELETE /api/requests/:id - Видалення запиту (тільки admin)
router.delete('/:id', 
    authenticate, 
    authorizeRoles('admin'), 
    requestController.deleteRequest
);

module.exports = router;
