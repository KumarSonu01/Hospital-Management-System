/**
 * Simulates wearable/clinical edge devices sending vitals to the fog endpoint periodically.
 * Set PATIENT_ID to a real MongoDB user id with role patient for end-to-end demos.
 */
require('dotenv').config();
const axios = require('axios');

const FOG_URL = process.env.FOG_URL || 'http://localhost:4000';
const PATIENT_ID = process.env.PATIENT_ID || '';
const INTERVAL_MS = Number(process.env.INTERVAL_MS) || 8000;
const DEVICE_ID = process.env.DEVICE_ID || 'edge-wearable-demo-01';

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

async function sendSample() {
  const baselineHr = 72;
  const spike = Math.random() < 0.12;
  const heartRate = Math.round(
    spike ? randomBetween(125, 155) : randomBetween(58, 98)
  );
  const temperature = Number(
    (spike ? randomBetween(38.1, 39.2) : randomBetween(36.2, 37.4)).toFixed(1)
  );

  if (!PATIENT_ID) {
    console.warn('[edge-simulator] Set PATIENT_ID in .env to a valid patient User _id.');
    return;
  }

  try {
    const { data } = await axios.post(
      `${FOG_URL}/api/edge/vitals`,
      {
        patientId: PATIENT_ID,
        heartRate,
        temperature,
        deviceId: DEVICE_ID
      },
      { timeout: 8000 }
    );
    console.log(
      new Date().toISOString(),
      'sent →',
      { heartRate, temperature, emergency: data.emergency }
    );
  } catch (e) {
    console.error('Edge send failed:', e.response?.data || e.message);
  }
}

console.log(`Edge simulator → ${FOG_URL} every ${INTERVAL_MS}ms`);
sendSample();
setInterval(sendSample, INTERVAL_MS);
