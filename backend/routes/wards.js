const express = require('express');
const Bed = require('../models/Bed');
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../utils/auditLogger');

const router = express.Router();

// ================= LIST BEDS =================

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { wardType, status, floor } = req.query;
    const query = {};

    if (wardType && wardType !== 'all') query.wardType = wardType;
    if (status && status !== 'all') query.status = status;
    if (floor) query.floor = Number(floor);

    const beds = await Bed.find(query)
      .populate('currentPatientId', 'firstName lastName email phoneNumber dateOfBirth bloodGroup')
      .sort({ wardType: 1, bedNumber: 1 });

    res.json({ success: true, count: beds.length, beds });
  } catch (error) {
    next(error);
  }
});

// ================= WARD OCCUPANCY STATS =================

router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    const stats = await Bed.aggregate([
      {
        $group: {
          _id: '$wardType',
          total: { $sum: 1 },
          occupied: {
            $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] }
          },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          },
          cleaning: {
            $sum: { $cond: [{ $eq: ['$status', 'cleaning'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalBeds = stats.reduce((acc, curr) => acc + curr.total, 0);
    const totalOccupied = stats.reduce((acc, curr) => acc + curr.occupied, 0);
    const totalAvailable = stats.reduce((acc, curr) => acc + curr.available, 0);

    res.json({
      success: true,
      summary: {
        totalBeds,
        totalOccupied,
        totalAvailable,
        occupancyRate: totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0
      },
      wardBreakdown: stats
    });
  } catch (error) {
    next(error);
  }
});

// ================= ADMIT PATIENT TO BED =================

router.patch('/:id/admit', authenticateToken, authorizeRoles('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'staff'), async (req, res, next) => {
  try {
    const { patientId, notes } = req.body;
    const bed = await Bed.findById(req.params.id);

    if (!bed) {
      return res.status(404).json({ success: false, error: 'Bed not found.' });
    }

    if (bed.status === 'occupied') {
      return res.status(409).json({ success: false, error: 'This bed is currently occupied.' });
    }

    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found.' });
    }

    bed.status = 'occupied';
    bed.currentPatientId = patientId;
    bed.admittedAt = new Date();
    if (notes) bed.notes = notes;
    await bed.save();

    const populated = await bed.populate('currentPatientId', 'firstName lastName email phoneNumber bloodGroup');

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Staff',
      userRole: req.user.role,
      action: 'BED_ASSIGN',
      resourceType: 'Bed',
      resourceId: bed._id,
      details: `Assigned bed ${bed.bedNumber} (${bed.wardType}) to patient ${patient.firstName} ${patient.lastName}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Patient admitted to bed', bed: populated });
  } catch (error) {
    next(error);
  }
});

// ================= DISCHARGE PATIENT FROM BED =================

router.patch('/:id/discharge', authenticateToken, authorizeRoles('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'staff'), async (req, res, next) => {
  try {
    const bed = await Bed.findById(req.params.id);

    if (!bed) {
      return res.status(404).json({ success: false, error: 'Bed not found.' });
    }

    const previousPatient = bed.currentPatientId;
    const targetStatus = req.body?.toStatus === 'available' ? 'available' : 'cleaning';
    bed.status = targetStatus;
    bed.currentPatientId = null;
    bed.admittedAt = null;
    await bed.save();

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Staff',
      userRole: req.user.role,
      action: 'BED_DISCHARGE',
      resourceType: 'Bed',
      resourceId: bed._id,
      details: `Discharged patient from bed ${bed.bedNumber}. Status set to ${targetStatus}.`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: `Patient discharged. Bed marked as ${targetStatus}.`, bed });
  } catch (error) {
    next(error);
  }
});

// ================= UPDATE BED STATUS =================

router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'staff'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['available', 'occupied', 'cleaning', 'maintenance'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid bed status.' });
    }

    const bed = await Bed.findById(req.params.id);
    if (!bed) {
      return res.status(404).json({ success: false, error: 'Bed not found.' });
    }

    bed.status = status;
    if (status === 'available') {
      bed.currentPatientId = null;
      bed.admittedAt = null;
    }
    await bed.save();

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Staff',
      userRole: req.user.role,
      action: 'BED_STATUS_UPDATE',
      resourceType: 'Bed',
      resourceId: bed._id,
      details: `Updated bed ${bed.bedNumber} status to ${status}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: `Bed status updated to ${status}`, bed });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
