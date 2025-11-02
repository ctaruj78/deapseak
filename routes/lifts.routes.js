const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', authenticateToken, async (req, res) => {
  try {
    res.json({ lifts: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    res.json({ lift: {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { address, model } = req.body;
    res.json({ success: true, message: 'Ліфт створений' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    res.json({ success: true, message: 'Ліфт оновлений' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    res.json({ success: true, message: 'Ліфт видалений' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
