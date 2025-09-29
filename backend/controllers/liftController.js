const { LiftMongo, LiftSQL } = require('../models/Lift');

// MongoDB CRUD
exports.getAllLiftsMongo = async (req, res) => {
  try {
    const lifts = await LiftMongo.find();
    res.json(lifts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createLiftMongo = async (req, res) => {
  try {
    const lift = new LiftMongo(req.body);
    await lift.save();
    res.status(201).json(lift);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateLiftMongo = async (req, res) => {
  try {
    const lift = await LiftMongo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(lift);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteLiftMongo = async (req, res) => {
  try {
    await LiftMongo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PostgreSQL CRUD
exports.getAllLiftsSQL = async (req, res) => {
  try {
    const lifts = await LiftSQL.findAll();
    res.json(lifts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createLiftSQL = async (req, res) => {
  try {
    const lift = await LiftSQL.create(req.body);
    res.status(201).json(lift);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateLiftSQL = async (req, res) => {
  try {
    const lift = await LiftSQL.update(req.body, { where: { id: req.params.id } });
    res.json(lift);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteLiftSQL = async (req, res) => {
  try {
    await LiftSQL.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
