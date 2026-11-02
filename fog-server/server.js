const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { processVitals } = require('./services/vitalsProcessor');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CLOUD_URL = process.env.CLOUD_URL || 'http://localhost:5000';
const FOG_INGEST_SECRET = process.env.FOG_INGEST_SECRET || '';

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ layer: 'fog', status: 'ok', port: PORT });
});

/**
 * Edge devices (or simulator) POST vitals here.
 * Fog performs lightweight processing and forwards to the cloud API.
 */
app.post('/api/edge/vitals', async (req, res) => {
  try {
    const { patientId, heartRate, temperature, deviceId } = req.body;
    if (!patientId || heartRate == null || temperature == null) {
      return res.status(400).json({ error: 'patientId, heartRate, temperature required' });
    }

    const { emergency, anomalyReason } = processVitals({
      heartRate: Number(heartRate),
      temperature: Number(temperature)
    });

    const headers = { 'Content-Type': 'application/json' };
    if (FOG_INGEST_SECRET) {
      headers['X-Fog-Secret'] = FOG_INGEST_SECRET;
    }

    const { data } = await axios.post(
      `${CLOUD_URL}/api/fog/vitals/forward`,
      {
        patientId,
        heartRate: Number(heartRate),
        temperature: Number(temperature),
        emergency,
        anomalyReason,
        processedByFog: true,
        metadata: { deviceId, fogPort: PORT }
      },
      { headers, timeout: 10000 }
    );

    res.status(201).json({
      layer: 'fog',
      emergency,
      anomalyReason,
      cloud: data
    });
  } catch (err) {
    console.error('Fog ingest error:', err.message);
    res.status(502).json({
      error: 'Failed to forward to cloud',
      details: err.response?.data || err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Fog server listening on ${PORT} → cloud ${CLOUD_URL}`);
});
