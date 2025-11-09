const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

// MongoDB Schema
const liftSchema = new mongoose.Schema({
  liftId: String,
  status: String,
  location: {
    lat: Number,
    lng: Number
  },
  lastInspection: Date,
  assignedTechnician: String,
  notes: String
});

const LiftMongo = mongoose.model('Lift', liftSchema);

// PostgreSQL Model
const LiftSQL = sequelize.define('Lift', {
  liftId: DataTypes.STRING,
  status: DataTypes.STRING,
  lat: DataTypes.FLOAT,
  lng: DataTypes.FLOAT,
  lastInspection: DataTypes.DATE,
  assignedTechnician: DataTypes.STRING,
  notes: DataTypes.TEXT
});

module.exports = { LiftMongo, LiftSQL };
