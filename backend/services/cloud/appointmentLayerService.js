const Appointment = require('../../models/Appointment');
const { calendarDateToUtcMidnight } = require('../../utils/dateHelpers');

const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
];

async function nextAvailableSlotForDoctor(doctorId, date, preferredTime) {
  const dayStart = calendarDateToUtcMidnight(date);

  for (let d = 0; d < 7; d++) {
    const cur = new Date(dayStart.getTime() + d * 86400000);
    const dayEnd = new Date(cur.getTime() + 86400000);

    const booked = await Appointment.find({
      doctorId,
      date: { $gte: cur, $lt: dayEnd },
      status: { $ne: 'cancelled' }
    }).select('time');

    const taken = new Set(booked.map((a) => a.time));
    const order =
      d === 0 && preferredTime && TIME_SLOTS.includes(preferredTime)
        ? [preferredTime, ...TIME_SLOTS.filter((t) => t !== preferredTime)]
        : TIME_SLOTS;

    for (const t of order) {
      if (!taken.has(t)) {
        return { finalDate: cur, finalTime: t };
      }
    }
  }

  return { finalDate: dayStart, finalTime: preferredTime || TIME_SLOTS[0] };
}

async function countModerateAhead(doctorId, date) {
  const dayStart = calendarDateToUtcMidnight(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return Appointment.countDocuments({
    doctorId,
    date: { $gte: dayStart, $lt: dayEnd },
    conditionType: 'moderate',
    status: { $ne: 'cancelled' }
  });
}

/**
 * Edge: critical — immediate ASAP slot, highest priority.
 * Fog: moderate — priority scheduling with next available slot.
 * Cloud: normal — standard booking with chosen slot.
 */
async function resolveBookingPlan({
  conditionType,
  doctorId,
  date,
  time
}) {
  const now = new Date();

  if (conditionType === 'critical') {
    return {
      computingLayer: 'edge',
      finalDate: now,
      finalTime: 'ASAP',
      priorityScore: 1000
    };
  }

  if (conditionType === 'moderate') {
    const slot = await nextAvailableSlotForDoctor(doctorId, date, time);
    const queueAhead = await countModerateAhead(doctorId, slot.finalDate);
    return {
      computingLayer: 'fog',
      finalDate: slot.finalDate,
      finalTime: slot.finalTime,
      priorityScore: 500 - Math.min(queueAhead, 50)
    };
  }

  return {
    computingLayer: 'cloud',
    finalDate: calendarDateToUtcMidnight(date),
    finalTime: time,
    priorityScore: 100
  };
}

module.exports = {
  resolveBookingPlan,
  TIME_SLOTS
};
