const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');

router.post('/alerts', authenticateToken, async (req, res) => {
  try {
    const { title, description, severity } = req.body;
    res.json({ success: true, message: 'Alert створений' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/alerts/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    res.json({ success: true, message: 'Alert підтверджений' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/alerts/:id/resolve', authenticateToken, async (req, res) => {
  try {
    res.json({ success: true, message: 'Alert розв\'язаний' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/lifts/stats', authenticateToken, async (req, res) => {
  try {
    res.json({ stats: { total: 0, active: 0, maintenance: 0 } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
