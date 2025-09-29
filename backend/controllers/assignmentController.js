const { AssignmentMongo, AssignmentSQL } = require('../models/Assignment');

// MongoDB CRUD
exports.getAllAssignmentsMongo = async (req, res) => {
  try {
    const assignments = await AssignmentMongo.find();
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAssignmentMongo = async (req, res) => {
  try {
    const assignment = new AssignmentMongo(req.body);
    await assignment.save();
    res.status(201).json(assignment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateAssignmentMongo = async (req, res) => {
  try {
    const assignment = await AssignmentMongo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(assignment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteAssignmentMongo = async (req, res) => {
  try {
    await AssignmentMongo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PostgreSQL CRUD
exports.getAllAssignmentsSQL = async (req, res) => {
  try {
    const assignments = await AssignmentSQL.findAll();
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAssignmentSQL = async (req, res) => {
  try {
    const assignment = await AssignmentSQL.create(req.body);
    res.status(201).json(assignment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateAssignmentSQL = async (req, res) => {
  try {
    const assignment = await AssignmentSQL.update(req.body, { where: { id: req.params.id } });
    res.json(assignment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteAssignmentSQL = async (req, res) => {
  try {
    await AssignmentSQL.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
