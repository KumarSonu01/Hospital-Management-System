const express = require('express');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Inventory = require('../models/Inventory');
const Bed = require('../models/Bed');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        results: { patients: [], doctors: [], appointments: [], medications: [], beds: [] }
      });
    }

    const reg = new RegExp(q.trim(), 'i');

    const [patients, doctors, medications, beds] = await Promise.all([
      User.find({
        role: 'patient',
        $or: [{ firstName: reg }, { lastName: reg }, { email: reg }, { phoneNumber: reg }]
      }).select('firstName lastName email phoneNumber bloodGroup').limit(5),

      Doctor.find({
        $or: [{ firstName: reg }, { lastName: reg }, { specialty: reg }, { department: reg }]
      }).select('firstName lastName specialty department licenseNumber').limit(5),

      Inventory.find({
        $or: [{ itemName: reg }, { sku: reg }, { category: reg }]
      }).select('itemName sku stockQuantity unitPrice status').limit(5),

      Bed.find({
        $or: [{ bedNumber: reg }, { wardNumber: reg }, { wardType: reg }]
      }).select('bedNumber wardNumber wardType status').limit(5)
    ]);

    res.json({
      success: true,
      query: q,
      results: {
        patients: patients.map((p) => ({
          id: p._id,
          title: `${p.firstName} ${p.lastName}`,
          subtitle: `Patient · Blood: ${p.bloodGroup || 'N/A'} · ${p.email}`,
          type: 'patient'
        })),
        doctors: doctors.map((d) => ({
          id: d._id,
          title: `Dr. ${d.firstName} ${d.lastName}`,
          subtitle: `${d.specialty} · ${d.department || 'Hospital'}`,
          type: 'doctor'
        })),
        medications: medications.map((m) => ({
          id: m._id,
          title: m.itemName,
          subtitle: `SKU: ${m.sku} · Stock: ${m.stockQuantity} · Status: ${m.status}`,
          type: 'medication'
        })),
        beds: beds.map((b) => ({
          id: b._id,
          title: `Bed ${b.bedNumber}`,
          subtitle: `${b.wardType.toUpperCase()} Ward · Status: ${b.status}`,
          type: 'bed'
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
