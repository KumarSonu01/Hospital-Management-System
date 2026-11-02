/**
 * Quick fog-side analytics: classify abnormal vitals before cloud persistence.
 */
function processVitals({ heartRate, temperature }) {
  const reasons = [];
  if (heartRate < 50 || heartRate > 120) {
    reasons.push(`Heart rate out of range (${heartRate} bpm)`);
  }
  if (temperature < 36.0 || temperature > 37.9) {
    reasons.push(`Temperature abnormal (${temperature}°C)`);
  }
  const emergency = reasons.length > 0;
  return {
    emergency,
    anomalyReason: emergency ? reasons.join('; ') : null
  };
}

module.exports = { processVitals };
