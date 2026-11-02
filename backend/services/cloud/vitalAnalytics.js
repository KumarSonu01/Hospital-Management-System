/**
 * Analytics-friendly projection for vitals time series.
 */
function vitalsToChartSeries(readings) {
  return readings.map((r) => ({
    t: r.createdAt,
    heartRate: r.heartRate,
    temperature: r.temperature,
    emergency: r.emergency
  }));
}

module.exports = { vitalsToChartSeries };
