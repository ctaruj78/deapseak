const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

// MongoDB Schema
const assignmentSchema = new mongoose.Schema({
  assignmentId: String,
  technicianId: String,
  liftId: String,
  status: String,
  createdAt: Date,
  updatedAt: Date,
  details: String
});

const AssignmentMongo = mongoose.model('Assignment', assignmentSchema);

// PostgreSQL Model
const AssignmentSQL = sequelize.define('Assignment', {
  assignmentId: DataTypes.STRING,
  technicianId: DataTypes.STRING,
  liftId: DataTypes.STRING,
  status: DataTypes.STRING,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  details: DataTypes.TEXT
});

module.exports = { AssignmentMongo, AssignmentSQL };
