const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');

// MongoDB routes
router.get('/mongo', controller.getAllNotificationsMongo);
router.post('/mongo', controller.createNotificationMongo);
router.put('/mongo/:id', controller.updateNotificationMongo);
router.delete('/mongo/:id', controller.deleteNotificationMongo);

// PostgreSQL routes
router.get('/sql', controller.getAllNotificationsSQL);
router.post('/sql', controller.createNotificationSQL);
router.put('/sql/:id', controller.updateNotificationSQL);
router.delete('/sql/:id', controller.deleteNotificationSQL);

module.exports = router;
