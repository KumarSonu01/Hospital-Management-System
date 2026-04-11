const Doctor = require('../../models/Doctor');
const Appointment = require('../../models/Appointment');
const { findDiseaseMeta } = require('../../constants/healthConditions');
const { calendarDateToUtcMidnight } = require('../../utils/dateHelpers');

function specialtyMatches(doctorSpecialty, hint) {
  if (!doctorSpecialty) return false;
  const s = doctorSpecialty.toLowerCase();
  const h = (hint || '').toLowerCase();
  if (h === 'general') return true;
  return s.includes(h) || h.includes(s.split(' ')[0]);
}

/**
 * Picks a doctor with matching specialty (fuzzy) and fewest appointments on the given date.
 */
async function assignDoctorForBooking({ conditionType, disease, date }) {
  const meta = findDiseaseMeta(conditionType, disease);
  const hint = meta ? meta.specialtyHint : 'General';

  const doctors = await Doctor.find().select('_id specialty firstName lastName');
  if (!doctors.length) {
    throw new Error('No doctors available in the system');
  }

  const dayStart = calendarDateToUtcMidnight(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const matched = doctors.filter((d) => specialtyMatches(d.specialty, hint));
  const pool = matched.length ? matched : doctors;

  const counts = await Appointment.aggregate([
    {
      $match: {
        doctorId: { $in: pool.map((d) => d._id) },
        date: { $gte: dayStart, $lt: dayEnd },
        status: { $ne: 'cancelled' }
      }
    },
    { $group: { _id: '$doctorId', c: { $sum: 1 } } }
  ]);
  const countMap = new Map(counts.map((x) => [x._id.toString(), x.c]));

  let best = pool[0];
  let bestCount = countMap.get(best._id.toString()) || 0;
  for (const d of pool) {
    const c = countMap.get(d._id.toString()) || 0;
    if (c < bestCount) {
      best = d;
      bestCount = c;
    }
  }

  return best;
}

module.exports = { assignDoctorForBooking, specialtyMatches };
