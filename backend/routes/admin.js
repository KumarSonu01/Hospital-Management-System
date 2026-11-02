const express = require('express');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Bed = require('../models/Bed');
const Invoice = require('../models/Invoice');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateEmail } = require('../utils/validator');
const { logActivity } = require('../utils/auditLogger');
const { startOfUtcDay, endOfUtcDay } = require('../utils/dateHelpers');

const router = express.Router();

// Enforce admin role across all routes in this file
router.use(authenticateToken, authorizeRoles('admin'));

// ================= ADMIN PROFILE =================

router.get('/profile', async (req, res, next) => {
  try {
    let admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) {
      admin = await User.findOne({ _id: req.user.id, role: 'admin' }).select('-password');
    }
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin profile not found.' });
    }
    res.json({ success: true, admin });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', async (req, res, next) => {
  try {
    const { firstName, lastName, email } = req.body;
    let admin = await Admin.findById(req.user.id);
    if (!admin) {
      admin = await User.findOne({ _id: req.user.id, role: 'admin' });
    }
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found.' });
    }

    if (email && email !== admin.email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email address.' });
      }
      const existing = await Admin.findOne({ email: email.trim().toLowerCase(), _id: { $ne: admin._id } });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Email already in use.' });
      }
      admin.email = email.trim().toLowerCase();
    }

    if (firstName) admin.firstName = firstName.trim();
    if (lastName) admin.lastName = lastName.trim();

    await admin.save();
    const adminData = admin.toObject();
    delete adminData.password;

    res.json({ success: true, message: 'Profile updated successfully', admin: adminData });
  } catch (error) {
    next(error);
  }
});

// ================= COMPREHENSIVE HOSPITAL STATS =================

router.get('/stats', async (req, res, next) => {
  try {
    const todayStart = startOfUtcDay(new Date());
    const todayEnd = endOfUtcDay(new Date());

    const [
      totalDoctors,
      totalPatients,
      todayAppointments,
      totalAppointments,
      availableBeds,
      occupiedBeds,
      totalBeds,
      lowStockItems,
      pendingInvoices
    ] = await Promise.all([
      Doctor.countDocuments({ active: { $ne: false } }),
      User.countDocuments({ role: 'patient', active: { $ne: false } }),
      Appointment.countDocuments({ date: { $gte: todayStart, $lt: todayEnd }, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments(),
      Bed.countDocuments({ status: 'available' }),
      Bed.countDocuments({ status: 'occupied' }),
      Bed.countDocuments(),
      Inventory.countDocuments({ status: { $in: ['low_stock', 'out_of_stock'] } }),
      Invoice.countDocuments({ status: 'pending' })
    ]);

    // Financial revenue summary
    const revenueAgg = await Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    res.json({
      success: true,
      stats: {
        totalDoctors,
        totalPatients,
        todayAppointments,
        totalAppointments,
        availableBeds,
        occupiedBeds,
        totalBeds: totalBeds || 50,
        lowStockItems,
        pendingInvoices,
        totalRevenue
      }
    });
  } catch (error) {
    next(error);
  }
});

// Legacy backward-compatible endpoints
router.get('/total-doctors', async (req, res, next) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    res.json({ success: true, totalDoctors });
  } catch (error) {
    next(error);
  }
});

router.get('/total-patients', async (req, res, next) => {
  try {
    const totalPatients = await User.countDocuments({ role: 'patient' });
    res.json({ success: true, totalPatients });
  } catch (error) {
    next(error);
  }
});

// ================= OPTIMIZED AGGREGATIONS (FIXING N+1 QUERIES) =================

router.get('/doctor-overview', async (req, res, next) => {
  try {
    const overview = await Doctor.aggregate([
      {
        $lookup: {
          from: 'appointments',
          localField: '_id',
          foreignField: 'doctorId',
          as: 'appDocs'
        }
      },
      {
        $project: {
          name: { $concat: ['$firstName', ' ', '$lastName'] },
          specialty: 1,
          patients: {
            $size: {
              $setUnion: '$appDocs.patientId'
            }
          },
          totalAppointments: { $size: '$appDocs' }
        }
      },
      { $sort: { patients: -1 } }
    ]);

    res.json({ success: true, doctorOverview: overview });
  } catch (error) {
    next(error);
  }
});

router.get('/patient-overview', async (req, res, next) => {
  try {
    const overview = await User.aggregate([
      { $match: { role: 'patient' } },
      {
        $lookup: {
          from: 'appointments',
          localField: '_id',
          foreignField: 'patientId',
          as: 'appointments'
        }
      },
      {
        $project: {
          name: { $concat: ['$firstName', ' ', '$lastName'] },
          email: 1,
          phoneNumber: 1,
          bloodGroup: 1,
          appointments: { $size: '$appointments' }
        }
      },
      { $sort: { appointments: -1 } },
      { $limit: 100 }
    ]);

    res.json({ success: true, patientOverview: overview });
  } catch (error) {
    next(error);
  }
});

// ================= DOCTOR & STAFF MANAGEMENT =================

router.get('/doctors', async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = {};
    if (search) {
      const reg = new RegExp(search, 'i');
      query.$or = [{ firstName: reg }, { lastName: reg }, { specialty: reg }, { email: reg }];
    }
    const doctors = await Doctor.find(query).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, doctors });
  } catch (error) {
    next(error);
  }
});

router.post('/add-doctor', async (req, res, next) => {
  try {
    const { firstName, lastName, email, specialty, licenseNumber, phoneNumber, password, department } = req.body;

    if (!firstName || !lastName || !email || !specialty || !licenseNumber || !password) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, email, specialty, license number, and password are required.'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address format.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await Doctor.findOne({
      $or: [{ email: normalizedEmail }, { licenseNumber: licenseNumber.trim() }]
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A doctor with that email or license number already exists.'
      });
    }

    const doctor = new Doctor({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      specialty: specialty.trim(),
      department: department || 'General Medicine',
      licenseNumber: licenseNumber.trim(),
      phoneNumber: phoneNumber ? phoneNumber.trim() : 'N/A',
      password
    });

    await doctor.save();

    // Also sync to User collection
    await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password,
      role: 'doctor',
      specialty: specialty.trim(),
      licenseNumber: licenseNumber.trim(),
      phoneNumber: phoneNumber ? phoneNumber.trim() : 'N/A',
      department: department || 'General Medicine'
    }).catch((e) => console.warn('User doctor sync notice:', e.message));

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Admin',
      userRole: 'admin',
      action: 'SYSTEM_SEED',
      resourceType: 'Doctor',
      resourceId: doctor._id,
      details: `Added new doctor Dr. ${doctor.firstName} ${doctor.lastName} (${doctor.specialty})`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Doctor added successfully',
      doctor: {
        id: doctor._id,
        name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        specialty: doctor.specialty,
        email: doctor.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// ================= CREATE NEW ADMIN (WITH ORG SECURITY CODE) =================

router.post('/create-admin', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, securityCode } = req.body;

    const orgCode = process.env.ORGANIZATION_SECURITY_CODE || 'HOSPITAL-SECURE-2026';
    if (!securityCode || securityCode.trim() !== orgCode) {
      return res.status(403).json({
        success: false,
        error: 'Invalid Organization Security Code. Clearance authorization denied.'
      });
    }

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, email, and password are required.'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address format.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with that email already exists.' });
    }

    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password,
      role: 'admin',
      phoneNumber: phoneNumber ? phoneNumber.trim() : ''
    });
    await user.save();

    await Admin.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password,
      phoneNumber: phoneNumber ? phoneNumber.trim() : ''
    }).catch(() => null);

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Admin',
      userRole: 'admin',
      action: 'ADMIN_CREATED',
      resourceType: 'User',
      resourceId: user._id,
      details: `Provisioned new administrator account: ${user.email} (Verified with Security Code)`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, message: 'Administrator account provisioned successfully.' });
  } catch (error) {
    next(error);
  }
});

// Alias for backwards compatibility
router.post('/add-admin', async (req, res, next) => {
  return router.handle(Object.assign(req, { url: '/create-admin' }), res, next);
});

// ================= UPDATE ADMIN PROFILE & CREDENTIALS (WITH ORG SECURITY CODE) =================

router.put('/update-profile', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phoneNumber, newPassword, securityCode } = req.body;

    const orgCode = process.env.ORGANIZATION_SECURITY_CODE || 'HOSPITAL-SECURE-2026';
    if (!securityCode || securityCode.trim() !== orgCode) {
      return res.status(403).json({
        success: false,
        error: 'Invalid Organization Security Code. Administrator profile modification rejected.'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Admin user account not found.' });
    }

    if (firstName && firstName.trim()) user.firstName = firstName.trim();
    if (lastName && lastName.trim()) user.lastName = lastName.trim();
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber.trim();

    if (email && email.trim().toLowerCase() !== user.email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!validateEmail(normalizedEmail)) {
        return res.status(400).json({ success: false, error: 'Invalid email address format.' });
      }
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Email already in use by another user.' });
      }
      user.email = normalizedEmail;
    }

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
      }
      user.password = newPassword.trim();
    }

    await user.save();

    // Also sync to Admin collection if exists
    const adminDoc = await Admin.findOne({ email: req.user.email });
    if (adminDoc) {
      adminDoc.firstName = user.firstName;
      adminDoc.lastName = user.lastName;
      adminDoc.email = user.email;
      if (user.phoneNumber) adminDoc.phoneNumber = user.phoneNumber;
      if (newPassword && newPassword.trim()) adminDoc.password = newPassword.trim();
      await adminDoc.save().catch(() => null);
    }

    logActivity({
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: 'admin',
      action: 'ADMIN_PROFILE_UPDATE',
      resourceType: 'User',
      resourceId: user._id,
      details: `Administrator ${user.email} updated credentials with verified security code.`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Administrator credentials updated successfully.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// ================= AUDIT LOGS =================

router.get('/audit-logs', async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
