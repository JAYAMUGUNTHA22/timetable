const express = require('express');
const router = express.Router();
const Department = require('../models/Department');

router.get('/departments', async (req, res) => {
  try {
    const list = await Department.find().select('_id departmentId name sectionsCount').lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public holidays list (no auth) so leave/holidays pages can always show data
const PUBLIC_HOLIDAYS = [
  { date: '2024-01-01', name: 'New Year\'s Day' },
  { date: '2024-01-15', name: 'Pongal' },
  { date: '2024-01-26', name: 'Republic Day' },
  { date: '2024-03-25', name: 'Holi' },
  { date: '2024-04-10', name: 'Eid al-Fitr' },
  { date: '2024-08-15', name: 'Independence Day' },
  { date: '2024-10-02', name: 'Gandhi Jayanti' },
  { date: '2024-11-01', name: 'Diwali' },
  { date: '2024-12-25', name: 'Christmas Day' },
];

router.get('/holidays', (req, res) => {
  res.json(PUBLIC_HOLIDAYS);
});

module.exports = router;
