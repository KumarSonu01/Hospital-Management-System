const express = require('express');
const VitalSign = require('../models/VitalSign');
const User = require('../models/User');
const { notifyAndPush } = require('../services/cloud/notificationService');

const router = express.Router();

function verifyFogSecret(req, res, next) {
  const secret = process.env.FOG_INGEST_SECRET;
  if (!secret) {
    return next();
  }
  const sent = req.header('X-Fog-Secret');
  if (sent !== secret) {
    return res.status(401).json({ error: 'Invalid fog ingest secret' });
  }
  next();
}

/**
 * Fog layer forwards processed vitals + emergency flag to cloud (MongoDB + Socket.io).
 */
router.post('/vitals/forward', verifyFogSecret, async (req, res) => {
  try {
    const io = req.app.get('io');
    const {
      patientId,
      heartRate,
      temperature,
      emergency,
      anomalyReason,
      processedByFog,
      metadata
    } = req.body;

    if (!patientId || heartRate == null || temperature == null) {
      return res.status(400).json({ error: 'patientId, heartRate, and temperature are required' });
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const doc = await VitalSign.create({
      patientId,
      heartRate,
      temperature,
      source: 'fog-forward',
      computingLayer: 'cloud',
      processedByFog: !!processedByFog,
      emergency: !!emergency,
      anomalyReason,
      metadata
    });

    if (emergency) {
      await notifyAndPush(io, {
        userId: patientId,
        role: 'patient',
        title: 'Emergency vitals alert',
        message: anomalyReason || 'Abnormal vitals detected. Seek immediate care.',
        type: 'emergency',
        relatedId: doc._id
      });
    }

    io?.emit('vitals:update', {
      patientId: patientId.toString(),
      reading: doc.toObject()
    });

    res.status(201).json({ vital: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
