const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

// MongoDB Schema
const notificationSchema = new mongoose.Schema({
  notificationId: String,
  type: String,
  message: String,
  recipientId: String,
  createdAt: Date,
  read: Boolean
});

const NotificationMongo = mongoose.model('Notification', notificationSchema);

// PostgreSQL Model
const NotificationSQL = sequelize.define('Notification', {
  notificationId: DataTypes.STRING,
  type: DataTypes.STRING,
  message: DataTypes.TEXT,
  recipientId: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  read: DataTypes.BOOLEAN
});

module.exports = { NotificationMongo, NotificationSQL };
