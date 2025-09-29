const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

// MongoDB Schema
const technicianSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  status: String,
  location: {
    lat: Number,
    lng: Number
  },
  battery: Number,
  signal: Number,
  lastUpdate: Date,
  currentAssignment: String
});

const TechnicianMongo = mongoose.model('Technician', technicianSchema);

// PostgreSQL Model
const TechnicianSQL = sequelize.define('Technician', {
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  status: DataTypes.STRING,
  lat: DataTypes.FLOAT,
  lng: DataTypes.FLOAT,
  battery: DataTypes.INTEGER,
  signal: DataTypes.INTEGER,
  lastUpdate: DataTypes.DATE,
  currentAssignment: DataTypes.STRING
});

module.exports = { TechnicianMongo, TechnicianSQL };
