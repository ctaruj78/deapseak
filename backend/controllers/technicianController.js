const { TechnicianMongo, TechnicianSQL } = require('../models/Technician');

// MongoDB CRUD
exports.getAllTechniciansMongo = async (req, res) => {
  try {
    const technicians = await TechnicianMongo.find();
    res.json(technicians);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const { validationResult } = require('express-validator');

exports.createTechnicianMongo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const technician = new TechnicianMongo(req.body);
    await technician.save();
    res.status(201).json(technician);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateTechnicianMongo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const technician = await TechnicianMongo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(technician);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteTechnicianMongo = async (req, res) => {
  try {
    await TechnicianMongo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PostgreSQL CRUD
exports.getAllTechniciansSQL = async (req, res) => {
  try {
    const technicians = await TechnicianSQL.findAll();
    res.json(technicians);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTechnicianSQL = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const technician = await TechnicianSQL.create(req.body);
    res.status(201).json(technician);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateTechnicianSQL = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const technician = await TechnicianSQL.update(req.body, { where: { id: req.params.id } });
    res.json(technician);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteTechnicianSQL = async (req, res) => {
  try {
    await TechnicianSQL.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
