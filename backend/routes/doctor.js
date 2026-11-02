const express = require('express');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Prescription = require('../models/Prescription');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { calendarDateToUtcMidnight, startOfUtcDay, endOfUtcDay } = require('../utils/dateHelpers');
const { logActivity } = require('../utils/auditLogger');
const { validateEmail } = require('../utils/validator');

const router = express.Router();

// ================= PROFILE =================

router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    let doctor = await Doctor.findById(req.user.id).select('-password');
    if (!doctor) {
      doctor = await User.findOne({ _id: req.user.id, role: 'doctor' }).select('-password');
    }
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor profile not found.' });
    }
    res.json({ success: true, doctor });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res, next) => {
  try {
    const { firstName, lastName, email, specialty, licenseNumber, phoneNumber, department } = req.body;
    let doctor = await Doctor.findById(req.user.id);
    if (!doctor) {
      doctor = await User.findOne({ _id: req.user.id, role: 'doctor' });
    }
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor profile not found.' });
    }

    if (email && email !== doctor.email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email address.' });
      }
      const existing = await Doctor.findOne({ email: email.trim().toLowerCase(), _id: { $ne: doctor._id } });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Email is already in use.' });
      }
      doctor.email = email.trim().toLowerCase();
    }

    if (firstName) doctor.firstName = firstName.trim();
    if (lastName) doctor.lastName = lastName.trim();
    if (specialty) doctor.specialty = specialty.trim();
    if (licenseNumber) doctor.licenseNumber = licenseNumber.trim();
    if (phoneNumber) doctor.phoneNumber = phoneNumber.trim();
    if (department) doctor.department = department.trim();

    await doctor.save();
    const docData = doctor.toObject();
    delete docData.password;

    res.json({ success: true, message: 'Profile updated successfully', doctor: docData });
  } catch (error) {
    next(error);
  }
});

// ================= ALL DOCTORS (For directory and booking) =================

router.get('/all', async (req, res, next) => {
  try {
    const doctors = await Doctor.find({ active: { $ne: false } })
      .select('firstName lastName specialty department licenseNumber phoneNumber email')
      .sort({ lastName: 1 });

    res.json({ success: true, doctors });
  } catch (error) {
    next(error);
  }
});

// ================= SCHEDULE & APPOINTMENTS (Daily & Weekly Views) =================

router.get('/appointments', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { view = 'day', date, status } = req.query;

    const baseDate = date ? new Date(date) : new Date();
    let start, end;

    if (view === 'week') {
      const cur = new Date(baseDate);
      const dayOfWeek = cur.getUTCDay(); // 0 is Sunday
      const diffToMonday = cur.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(cur.setUTCDate(diffToMonday));
      start = startOfUtcDay(monday);
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (view === 'all') {
      start = new Date('2020-01-01');
      end = new Date('2030-01-01');
    } else {
      // Default: single day
      start = startOfUtcDay(baseDate);
      end = endOfUtcDay(baseDate);
    }

    const query = {
      doctorId,
      date: { $gte: start, $lt: end }
    };

    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      query.status = { $ne: 'cancelled' };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'firstName lastName email phoneNumber dateOfBirth bloodGroup gender')
      .sort({ date: 1, priorityScore: -1, time: 1 });

    res.json({
      success: true,
      view,
      range: { start, end },
      appointments
    });
  } catch (error) {
    next(error);
  }
});

// Update appointment status / complete with clinical notes
router.patch('/appointments/:id/status', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res, next) => {
  try {
    const { status, diagnosis, notes } = req.body;
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found.' });
    }

    if (status) appointment.status = status;
    if (diagnosis !== undefined) appointment.diagnosis = diagnosis;
    if (notes !== undefined) appointment.notes = notes;

    await appointment.save();

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Doctor',
      userRole: 'doctor',
      action: status === 'completed' ? 'APPOINTMENT_COMPLETE' : 'APPOINTMENT_CANCEL',
      resourceType: 'Appointment',
      resourceId: appointment._id,
      details: `Appointment status updated to ${status}. Diagnosis: ${diagnosis || 'None'}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Appointment status updated', appointment });
  } catch (error) {
    next(error);
  }
});

// ================= PATIENTS LIST FOR DOCTOR =================

router.get('/patients-with-appointments', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const appointments = await Appointment.find({ doctorId }).sort({ date: -1 });
    const patientIds = [...new Set(appointments.map((a) => a.patientId.toString()))];

    const patients = await User.find({ _id: { $in: patientIds }, role: 'patient' })
      .select('-password');

    const result = patients.map((patient) => {
      const pApps = appointments.filter((a) => a.patientId.toString() === patient._id.toString());
      const now = new Date();
      const lastVisit = pApps.find((a) => new Date(a.date) < now);
      const nextAppointment = pApps.find((a) => new Date(a.date) >= now && a.status !== 'cancelled');

      return {
        ...patient.toObject(),
        totalAppointments: pApps.length,
        lastVisit: lastVisit ? lastVisit.date : null,
        nextAppointment: nextAppointment ? nextAppointment.date : null
      };
    });

    res.json({ success: true, patients: result });
  } catch (error) {
    next(error);
  }
});

// ================= AVAILABLE SLOTS =================

router.get('/available-slots', authenticateToken, async (req, res, next) => {
  try {
    const { date } = req.query;
    const doctorId = req.user.id;

    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required.' });
    }

    const dayStart = calendarDateToUtcMidnight(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const bookedAppointments = await Appointment.find({
      doctorId,
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $ne: 'cancelled' }
    });
    const bookedTimes = bookedAppointments.map((a) => a.time);

    const allSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
    const availableSlots = allSlots.filter((s) => !bookedTimes.includes(s));

    res.json({ success: true, availableSlots, bookedTimes });
  } catch (error) {
    next(error);
  }
});

// ================= PRESCRIPTIONS =================

router.post('/prescribe-medication', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res, next) => {
  try {
    const { patientId, appointmentId, medication, dosage, frequency, items, diagnosis, notes } = req.body;
    const doctorId = req.user.id;

    if (!patientId) {
      return res.status(400).json({ success: false, error: 'Patient ID is required.' });
    }

    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found.' });
    }

    let prescriptionItems = items;
    if (!prescriptionItems || prescriptionItems.length === 0) {
      if (!medication || !dosage || !frequency) {
        return res.status(400).json({
          success: false,
          error: 'Medication, dosage, and frequency are required.'
        });
      }
      prescriptionItems = [{ medication, dosage, frequency, duration: '7 days', instructions: 'Take as directed' }];
    }

    const prescription = new Prescription({
      patientId,
      doctorId,
      appointmentId,
      items: prescriptionItems,
      medication: prescriptionItems[0].medication,
      dosage: prescriptionItems[0].dosage,
      frequency: prescriptionItems[0].frequency,
      diagnosis: diagnosis || 'Clinical Consultation',
      notes: notes || ''
    });

    const saved = await prescription.save();
    const populated = await saved.populate('patientId', 'firstName lastName email');

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Doctor',
      userRole: 'doctor',
      action: 'PRESCRIPTION_CREATE',
      resourceType: 'Prescription',
      resourceId: saved._id,
      details: `Prescription created for patient ${patient.firstName} ${patient.lastName}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      prescription: populated
    });
  } catch (error) {
    next(error);
  }
});

// Get all prescriptions created by this doctor
router.get('/prescriptions', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ doctorId: req.user.id })
      .populate('patientId', 'firstName lastName email phoneNumber bloodGroup')
      .sort({ createdAt: -1 });

    res.json({ success: true, prescriptions });
  } catch (error) {
    next(error);
  }
});

// Get prescriptions for a specific patient
router.get('/prescriptions/:patientId', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({
      doctorId: req.user.id,
      patientId: req.params.patientId
    })
      .populate('patientId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ success: true, prescriptions });
  } catch (error) {
    next(error);
  }
});

// Update a prescription
router.put('/prescriptions/:id', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res, next) => {
  try {
    const { medication, dosage, frequency, items, diagnosis, notes, status } = req.body;
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      doctorId: req.user.id
    });

    if (!prescription) {
      return res.status(404).json({ success: false, error: 'Prescription not found.' });
    }

    if (items) prescription.items = items;
    if (medication) prescription.medication = medication;
    if (dosage) prescription.dosage = dosage;
    if (frequency) prescription.frequency = frequency;
    if (diagnosis !== undefined) prescription.diagnosis = diagnosis;
    if (notes !== undefined) prescription.notes = notes;
    if (status) prescription.status = status;

    await prescription.save();
    res.json({ success: true, message: 'Prescription updated successfully', prescription });
  } catch (error) {
    next(error);
  }
});

// Delete a prescription
router.delete('/prescriptions/:id', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res, next) => {
  try {
    const prescription = await Prescription.findOneAndDelete({
      _id: req.params.id,
      doctorId: req.user.id
    });

    if (!prescription) {
      return res.status(404).json({ success: false, error: 'Prescription not found.' });
    }

    res.json({ success: true, message: 'Prescription deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;