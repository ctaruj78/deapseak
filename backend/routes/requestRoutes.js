const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleAuth');

/**
 * Маршрути для роботи з запитами/заявками
 *
 * ⚠️ unified-server.js реєструє inline-хендлери на /api/requests (GET /, GET /stats,
 * GET /:id, GET /:id/export/pdf, POST /, PUT /:id, POST /:id/assign, PATCH /:id/status,
 * POST /:id/comment, POST /:id/complete, POST /:id/cancel, DELETE /:id) РАНІШЕ, ніж цей
 * router монтується (`app.use('/api/requests', requestRoutes)` в кінці файлу) — за
 * правилами Express перший зареєстрований маршрут, що збігається за методом+шляхом,
 * завжди виграє. Ці шляхи тут були б мертвим кодом (той самий патерн вже задокументований
 * в roadmap-нотатках аудиту #3: "inline-версія в unified-server.js завжди виграє"), тож
 * прибрані — залишені тільки 4 маршрути, які unified-server.js НЕ дублює і які реально
 * обробляються цим router'ом.
 */

// GET /api/requests/export/excel - Експорт заявок в Excel
router.get('/export/excel',
    authenticate,
    authorizeRoles('admin', 'dispatcher'),
    requestController.exportRequestsExcel
);

// POST /api/requests/:id/photos - Додавання фото до запиту
router.post('/:id/photos', authenticate, requestController.addPhotos);

// PUT /api/requests/:id/work - Оновлення деталей роботи (technician)
router.put('/:id/work',
    authenticate,
    authorizeRoles('technician', 'admin'),
    requestController.updateWorkDetails
);

// POST /api/requests/:id/feedback - Оцінка виконаної роботи техніка (client)
router.post('/:id/feedback', authenticate, requestController.submitFeedback);

module.exports = router;
