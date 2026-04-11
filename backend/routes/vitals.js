const express = require('express');
const jwt = require('jsonwebtoken');
const VitalSign = require('../models/VitalSign');
const Appointment = require('../models/Appointment');
const { vitalsToChartSeries } = require('../services/cloud/vitalAnalytics');

const router = express.Router();

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).send({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(token, 'your_jwt_secret');
    next();
  } catch {
    res.status(401).send({ error: 'Invalid token' });
  }
};

router.get('/me', auth, async (req, res) => {
  try {
    const readings = await VitalSign.find({ patientId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ readings, series: vitalsToChartSeries(readings.reverse()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    if ((req.user.role || '') !== 'doctor') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { patientId } = req.params;
    const link = await Appointment.findOne({
      doctorId: req.user.id,
      patientId
    });
    if (!link) {
      return res.status(403).json({ error: 'No care relationship with this patient' });
    }
    const readings = await VitalSign.find({ patientId })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ readings, series: vitalsToChartSeries(readings.reverse()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
