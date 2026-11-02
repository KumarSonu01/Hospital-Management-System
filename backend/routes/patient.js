const express = require('express');
const Patient = require('../models/User');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Prescription = require('../models/Prescription');
const Invoice = require('../models/Invoice');
const VitalSign = require('../models/VitalSign');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { getDiseaseLabels } = require('../constants/healthConditions');
const { assignDoctorForBooking } = require('../services/cloud/doctorAssignmentService');
const { resolveBookingPlan } = require('../services/cloud/appointmentLayerService');
const { notifyAndPush } = require('../services/cloud/notificationService');
const { calendarDateToUtcMidnight, startOfUtcDay } = require('../utils/dateHelpers');
const { validateEmail } = require('../utils/validator');
const { logActivity } = require('../utils/auditLogger');

const router = express.Router();

// ================= PROFILE =================

router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.user.id).select('-password');
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient profile not found.' });
    }
    res.json({ success: true, patient });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
    const { firstName, lastName, email, phoneNumber, dateOfBirth, gender, bloodGroup, address, emergencyContact } = req.body;
    const patient = await Patient.findById(req.user.id);

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient profile not found.' });
    }

    if (email && email !== patient.email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email address.' });
      }
      const existing = await Patient.findOne({ email: email.trim().toLowerCase(), _id: { $ne: patient._id } });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Email address is already in use.' });
      }
      patient.email = email.trim().toLowerCase();
    }

    if (firstName) patient.firstName = firstName.trim();
    if (lastName) patient.lastName = lastName.trim();
    if (phoneNumber !== undefined) patient.phoneNumber = phoneNumber.trim();
    if (dateOfBirth) patient.dateOfBirth = new Date(dateOfBirth);
    if (gender) patient.gender = gender;
    if (bloodGroup) patient.bloodGroup = bloodGroup.trim();
    if (address !== undefined) patient.address = address.trim();
    if (emergencyContact) patient.emergencyContact = emergencyContact;

    await patient.save();

    const patientData = patient.toObject();
    delete patientData.password;

    res.json({ success: true, message: 'Profile updated successfully', patient: patientData });
  } catch (error) {
    next(error);
  }
});

// ================= HEALTH CONDITIONS =================

router.get('/health-conditions', (req, res) => {
  res.json({
    success: true,
    conditions: {
      critical: getDiseaseLabels('critical'),
      moderate: getDiseaseLabels('moderate'),
      normal: getDiseaseLabels('normal')
    }
  });
});

// ================= BOOK APPOINTMENT =================

router.post('/book-appointment', authenticateToken, async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const {
      doctorId,
      date,
      time,
      reason,
      conditionType = 'normal',
      disease,
      autoAssignDoctor
    } = req.body;

    if (!disease) {
      return res.status(400).json({ success: false, error: 'Disease/reason is required.' });
    }

    const useAutoAssign = conditionType === 'critical' || !doctorId || !!autoAssignDoctor;
    let resolvedDoctorId = doctorId;

    const bookingDate = conditionType === 'critical' ? new Date() : new Date(date);
    if (Number.isNaN(bookingDate.getTime())) {
      return res.status(400).json({ success: false, error: 'A valid appointment date is required.' });
    }

    if (useAutoAssign) {
      const doc = await assignDoctorForBooking({
        conditionType,
        disease,
        date: bookingDate
      });
      if (!doc) {
        return res.status(400).json({ success: false, error: 'No doctors are currently available. Please try later.' });
      }
      resolvedDoctorId = doc._id.toString();
    }

    if (!resolvedDoctorId) {
      return res.status(400).json({ success: false, error: 'Please select a doctor or choose auto-assign.' });
    }

    if (conditionType !== 'critical' && !time) {
      return res.status(400).json({ success: false, error: 'Please choose an available appointment time slot.' });
    }

    const plan = await resolveBookingPlan({
      conditionType,
      doctorId: resolvedDoctorId,
      date: bookingDate,
      time: time || 'ASAP'
    });

    const storedDate = conditionType === 'critical'
      ? plan.finalDate
      : calendarDateToUtcMidnight(plan.finalDate);

    // DOUBLE-BOOKING PREVENTION
    if (conditionType !== 'critical') {
      const dayStart = calendarDateToUtcMidnight(storedDate);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const conflict = await Appointment.findOne({
        doctorId: resolvedDoctorId,
        date: { $gte: dayStart, $lt: dayEnd },
        time: plan.finalTime,
        status: { $ne: 'cancelled' }
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          error: `The ${plan.finalTime} slot is already booked for this doctor. Please pick another time.`
        });
      }
    }

    const appointment = new Appointment({
      patientId: req.user.id,
      doctorId: resolvedDoctorId,
      date: storedDate,
      time: plan.finalTime,
      reason: reason || disease,
      conditionType,
      disease,
      computingLayer: plan.computingLayer,
      priorityScore: plan.priorityScore
    });

    await appointment.save();

    const populated = await appointment.populate('doctorId', 'firstName lastName specialty department');

    // Notify user if emergency/critical
    if (conditionType === 'critical') {
      await notifyAndPush(io, {
        userId: req.user.id,
        role: 'patient',
        title: 'Emergency Visit Confirmed',
        message: `Emergency visit priority registered for ${disease}. Proceed to emergency ward immediately.`,
        type: 'emergency',
        relatedId: appointment._id
      });
    }

    // Emit live update
    io?.emit('appointment:update', {
      doctorId: resolvedDoctorId.toString(),
      appointmentId: appointment._id.toString()
    });

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Patient',
      userRole: 'patient',
      action: 'APPOINTMENT_CREATE',
      resourceType: 'Appointment',
      resourceId: appointment._id,
      details: `Booked ${conditionType} appointment with Dr. ID ${resolvedDoctorId} at ${plan.finalTime}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      appointment: populated,
      computingLayer: plan.computingLayer,
      priorityScore: plan.priorityScore
    });
  } catch (error) {
    next(error);
  }
});

// ================= AVAILABLE SLOTS =================

router.get('/available-slots', authenticateToken, async (req, res, next) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ success: false, error: 'Doctor ID and date are required.' });
    }

    const dayStart = calendarDateToUtcMidnight(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const bookedAppointments = await Appointment.find({
      doctorId,
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $ne: 'cancelled' }
    });
    const bookedTimes = bookedAppointments.map((app) => app.time);

    const allTimeSlots = [
      '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
    ];

    const availableSlots = allTimeSlots.filter((slot) => !bookedTimes.includes(slot));

    res.json({ success: true, availableSlots, bookedSlots: bookedTimes });
  } catch (error) {
    next(error);
  }
});

// ================= APPOINTMENTS =================

router.get('/appointments', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const { type } = req.query; // 'upcoming', 'past', or undefined for all
    const start = startOfUtcDay(new Date());

    let dateFilter = {};
    if (type === 'upcoming') {
      dateFilter = { date: { $gte: start } };
    } else if (type === 'past') {
      dateFilter = { date: { $lt: start } };
    }

    const appointments = await Appointment.find({
      patientId,
      ...dateFilter
    })
      .populate('doctorId', 'firstName lastName specialty department phoneNumber')
      .sort({ date: type === 'past' ? -1 : 1, time: 1 });

    res.json({ success: true, appointments });
  } catch (error) {
    next(error);
  }
});

// ================= CANCEL APPOINTMENT =================

router.patch('/appointments/:id/cancel', authenticateToken, async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patientId: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found.' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Patient',
      userRole: 'patient',
      action: 'APPOINTMENT_CANCEL',
      resourceType: 'Appointment',
      resourceId: appointment._id,
      details: 'Appointment cancelled by patient',
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Appointment cancelled successfully', appointment });
  } catch (error) {
    next(error);
  }
});

// ================= CARE TEAM =================

router.get('/care-team', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const doctorIds = await Appointment.find({ patientId }).distinct('doctorId');

    const careTeam = await Doctor.find({ _id: { $in: doctorIds } })
      .select('firstName lastName specialty department phoneNumber email');

    res.json({ success: true, careTeam });
  } catch (error) {
    next(error);
  }
});

// ================= PRESCRIPTIONS =================

router.get('/prescriptions', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const prescriptions = await Prescription.find({ patientId })
      .populate('doctorId', 'firstName lastName specialty department')
      .sort({ createdAt: -1 });

    res.json({ success: true, prescriptions });
  } catch (error) {
    next(error);
  }
});

// ================= BILLING INVOICES =================

router.get('/invoices', authenticateToken, async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ patientId: req.user.id })
      .populate('doctorId', 'firstName lastName specialty')
      .sort({ createdAt: -1 });

    res.json({ success: true, invoices });
  } catch (error) {
    next(error);
  }
});

// ================= VITALS =================

router.get('/vitals', authenticateToken, async (req, res, next) => {
  try {
    const readings = await VitalSign.find({ patientId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);

    // Create a shallow copy before reversing to prevent in-place mutation
    const series = [...readings].reverse().map((r) => ({
      t: r.createdAt,
      heartRate: r.heartRate,
      temperature: r.temperature,
      emergency: r.emergency
    }));

    res.json({ success: true, readings, series });
  } catch (error) {
    next(error);
  }
});

module.exports = router;