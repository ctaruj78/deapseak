const { NotificationMongo, NotificationSQL } = require('../models/Notification');

// GET /api/notifications — останні сповіщення для поточного користувача
exports.getRecentNotifications = async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const role = req.user.role;

    // Dispatcher/admin бачить усі сповіщення; технік — лише свої ou загальні
    const query = (role === 'admin' || role === 'dispatcher')
      ? {}
      : { $or: [{ recipientId: userId }, { recipientId: null }, { recipientId: '' }] };

    const notifications = await NotificationMongo.find(query)
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/notifications/read-all — позначити всі як прочитані
exports.markAllRead = async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const role = req.user.role;
    const filter = (role === 'admin' || role === 'dispatcher')
      ? {}
      : { recipientId: userId };

    await NotificationMongo.updateMany(filter, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// MongoDB CRUD
exports.getAllNotificationsMongo = async (req, res) => {
  try {
    const notifications = await NotificationMongo.find();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createNotificationMongo = async (req, res) => {
  try {
    const notification = new NotificationMongo(req.body);
    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateNotificationMongo = async (req, res) => {
  try {
    const notification = await NotificationMongo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteNotificationMongo = async (req, res) => {
  try {
    await NotificationMongo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PostgreSQL CRUD
exports.getAllNotificationsSQL = async (req, res) => {
  try {
    const notifications = await NotificationSQL.findAll();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createNotificationSQL = async (req, res) => {
  try {
    const notification = await NotificationSQL.create(req.body);
    res.status(201).json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateNotificationSQL = async (req, res) => {
  try {
    const notification = await NotificationSQL.update(req.body, { where: { id: req.params.id } });
    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteNotificationSQL = async (req, res) => {
  try {
    await NotificationSQL.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
