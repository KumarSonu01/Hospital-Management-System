const express = require('express');
const Patient = require('../models/User');
const jwt = require('jsonwebtoken');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Prescription = require('../models/Prescription');
const { getDiseaseLabels } = require('../constants/healthConditions');
const { assignDoctorForBooking } = require('../services/cloud/doctorAssignmentService');
const { resolveBookingPlan } = require('../services/cloud/appointmentLayerService');
const { notifyAndPush } = require('../services/cloud/notificationService');
const { calendarDateToUtcMidnight, startOfUtcDay } = require('../utils/dateHelpers');

const router = express.Router();

// 🔐 AUTH MIDDLEWARE
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).send({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Invalid token' });
  }
};



// ================= PROFILE =================

router.get('/profile', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.user.id).select('-password');
    if (!patient) {
      return res.status(404).send({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Server error' });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const patient = await Patient.findById(req.user.id);

    if (!patient) {
      return res.status(404).send({ error: 'Patient not found' });
    }

    patient.firstName = firstName;
    patient.lastName = lastName;
    patient.email = email;

    await patient.save();

    const patientWithoutPassword = patient.toObject();
    delete patientWithoutPassword.password;

    res.json(patientWithoutPassword);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Server error' });
  }
});



// ================= HEALTH CONDITIONS (for dynamic UI) =================

router.get('/health-conditions', auth, (req, res) => {
  res.json({
    critical: getDiseaseLabels('critical'),
    moderate: getDiseaseLabels('moderate'),
    normal: getDiseaseLabels('normal')
  });
});

// ================= BOOK APPOINTMENT (Edge / Fog / Cloud) =================

router.post('/book-appointment', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    const {
      doctorId,
      date,
      time,
      reason,
      conditionType,
      disease,
      autoAssignDoctor
    } = req.body;

    if (!conditionType || !disease) {
      return res.status(400).json({ error: 'Condition type and disease are required' });
    }

    const allowed = getDiseaseLabels(conditionType);
    if (!allowed.includes(disease)) {
      return res.status(400).json({ error: 'Invalid disease for selected condition type' });
    }

    const useAutoAssign = conditionType === 'critical' || !!autoAssignDoctor;
    let resolvedDoctorId = doctorId;

    const bookingDate = conditionType === 'critical' ? new Date() : new Date(date);
    if (Number.isNaN(bookingDate.getTime())) {
      return res.status(400).json({ error: 'Valid appointment date is required' });
    }

    if (useAutoAssign) {
      const doc = await assignDoctorForBooking({
        conditionType,
        disease,
        date: bookingDate
      });
      resolvedDoctorId = doc._id.toString();
    }

    if (!resolvedDoctorId) {
      return res.status(400).json({ error: 'Doctor selection or auto-assign is required' });
    }

    if (conditionType !== 'critical' && !time) {
      return res.status(400).json({ error: 'Time slot is required for non-critical bookings' });
    }

    const plan = await resolveBookingPlan({
      conditionType,
      doctorId: resolvedDoctorId,
      date: bookingDate,
      time: time || 'ASAP'
    });

    const storedDate =
      conditionType === 'critical'
        ? plan.finalDate
        : calendarDateToUtcMidnight(plan.finalDate);

    const appointment = new Appointment({
      patientId: req.user.id,
      doctorId: resolvedDoctorId,
      date: storedDate,
      time: plan.finalTime,
      reason,
      conditionType,
      disease,
      computingLayer: plan.computingLayer,
      priorityScore: plan.priorityScore
    });

    await appointment.save();

    const populated = await appointment.populate('doctorId', 'firstName lastName specialty');

    if (conditionType === 'critical') {
      await notifyAndPush(io, {
        userId: req.user.id,
        role: 'patient',
        title: 'Emergency appointment scheduled',
        message: `Edge layer: ASAP visit for ${disease}. Report immediately.`,
        type: 'emergency',
        relatedId: appointment._id
      });
    }

    io?.emit('appointment:update', {
      doctorId: resolvedDoctorId.toString(),
      appointmentId: appointment._id.toString()
    });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: populated,
      computingLayer: plan.computingLayer,
      priorityScore: plan.priorityScore
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message || 'Server error' });
  }
});



// ================= AVAILABLE SLOTS =================

router.get('/available-slots', auth, async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ error: 'doctorId and date are required' });
    }
    const dayStart = calendarDateToUtcMidnight(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const bookedAppointments = await Appointment.find({
      doctorId,
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $ne: 'cancelled' }
    });
    const bookedTimes = bookedAppointments.map(app => app.time);

    const allTimeSlots = [
      '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM',
      '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
    ];

    const availableSlots = allTimeSlots.filter(slot => !bookedTimes.includes(slot));

    res.json(availableSlots);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Server error' });
  }
});



// ================= UPCOMING APPOINTMENTS (today and future) =================

router.get('/appointments', auth, async (req, res) => {
  try {
    const patientId = req.user.id;

    const start = startOfUtcDay(new Date());

    const appointments = await Appointment.find({
      patientId,
      status: { $ne: 'cancelled' },
      date: { $gte: start }
    })
      .populate('doctorId', 'firstName lastName specialty')
      .sort({ date: 1, priorityScore: -1, time: 1 });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).send({ error: 'Server error' });
  }
});



// ================= CARE TEAM =================

router.get('/care-team', auth, async (req, res) => {
  try {
    const patientId = req.user.id;

    const appointments = await Appointment.find({ patientId }).distinct('doctorId');

    const careTeam = await Doctor.find({ _id: { $in: appointments } })
      .select('firstName lastName specialty');

    res.json(careTeam);
  } catch (error) {
    console.error('Error fetching care team:', error);
    res.status(500).send({ error: 'Server error' });
  }
});



// ================= PRESCRIPTIONS =================

router.get('/prescriptions', auth, async (req, res) => {
  try {
    const patientId = req.user.id;

    const prescriptions = await Prescription.find({ patientId })
      .populate('doctorId', 'firstName lastName');

    res.json(prescriptions);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).send({ error: 'Server error' });
  }
});



module.exports = router;