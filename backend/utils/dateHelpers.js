/**
 * Consistent UTC calendar-day boundaries for appointment `date` storage and queries.
 * HTML date inputs parse as UTC midnight (e.g. 2025-03-30 → T00:00:00.000Z).
 */

function startOfUtcDay(d = new Date()) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return x;
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}

function endOfUtcDay(d = new Date()) {
  const s = startOfUtcDay(d);
  return new Date(s.getTime() + 24 * 60 * 60 * 1000);
}

/** For a YYYY-MM-DD string or Date, return UTC midnight of that calendar day. */
function calendarDateToUtcMidnight(dateInput) {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, day] = dateInput.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, day));
  }
  return startOfUtcDay(new Date(dateInput));
}

module.exports = {
  startOfUtcDay,
  endOfUtcDay,
  calendarDateToUtcMidnight
};
