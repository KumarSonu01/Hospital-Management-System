const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);

    if (options.body) {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(bodyStr));
      req.write(bodyStr);
    }

    req.end();
  });
}

test('Hospital Management System Backend API Suite', async (t) => {
  let adminToken = '';
  let patientToken = '';

  await t.test('1. GET /health returns online status and connected database', async () => {
    const res = await makeRequest('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.database, 'connected');
  });

  await t.test('2. GET /api/doctor/all returns seeded doctors', async () => {
    const res = await makeRequest('/api/doctor/all');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.doctors));
    assert.ok(res.body.doctors.length >= 4);
  });

  await t.test('3. POST /api/login with invalid password returns 401 Unauthorized', async () => {
    const res = await makeRequest('/api/login', {
      method: 'POST',
      body: { email: 'admin@hospital.com', password: 'WrongPassword' }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('4. POST /api/login with Admin credentials returns token and user role', async () => {
    const res = await makeRequest('/api/login', {
      method: 'POST',
      body: { email: 'admin@hospital.com', password: 'Admin@123' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.role, 'admin');
    assert.ok(res.body.token);
    adminToken = res.body.token;
  });

  await t.test('5. POST /api/login with Patient credentials returns token', async () => {
    const res = await makeRequest('/api/login', {
      method: 'POST',
      body: { email: 'john.doe@email.com', password: 'Patient@123' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.role, 'patient');
    assert.ok(res.body.token);
    patientToken = res.body.token;
  });

  await t.test('6. GET /api/admin/stats without token returns 401', async () => {
    const res = await makeRequest('/api/admin/stats');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('7. GET /api/admin/stats with Patient token returns 403 Forbidden', async () => {
    const res = await makeRequest('/api/admin/stats', {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('8. GET /api/admin/stats with Admin token returns 200 and metrics', async () => {
    const res = await makeRequest('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.stats.totalDoctors >= 4);
    assert.ok(res.body.stats.totalPatients >= 4);
  });

  await t.test('9. GET /api/wards returns bed list and ward stats', async () => {
    const res = await makeRequest('/api/wards/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.summary.totalBeds > 0);
  });

  await t.test('10. GET /api/pharmacy/alerts/low-stock returns reorder alerts', async () => {
    // Ensure at least one low-stock item exists
    await makeRequest('/api/pharmacy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        itemName: `Emergency Atropine ${Date.now()}`,
        category: 'emergency',
        stockQuantity: 4,
        reorderThreshold: 20,
        unitPrice: 24.5,
        unit: 'ampoules'
      }
    });

    const res = await makeRequest('/api/pharmacy/alerts/low-stock', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.count >= 1);
  });

  await t.test('11. POST /api/pharmacy adds a new medicinal item manually', async () => {
    const res = await makeRequest('/api/pharmacy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      body: {
        itemName: `Azithromycin ${Date.now()} IV`,
        category: 'antibiotics',
        stockQuantity: 120,
        unitPrice: 18.5,
        reorderThreshold: 30,
        unit: 'vials'
      }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.item.sku.startsWith('MED-'));
    assert.strictEqual(res.body.item.stockQuantity, 120);
  });

  await t.test('12. POST /api/admin/create-admin rejects invalid security code with 403', async () => {
    const res = await makeRequest('/api/admin/create-admin', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      body: {
        firstName: 'Unauthorized',
        lastName: 'Person',
        email: 'unauth@hospital.com',
        password: 'password123',
        securityCode: 'WRONG-CODE'
      }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('13. POST /api/admin/create-admin creates admin with valid security code', async () => {
    const testEmail = `admin.test.${Date.now()}@hospital.com`;
    const res = await makeRequest('/api/admin/create-admin', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      body: {
        firstName: 'Clinical',
        lastName: 'Director',
        email: testEmail,
        password: 'SecureAdminPassword123',
        phoneNumber: '555-0199',
        securityCode: 'HOSPITAL-SECURE-2026'
      }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
  });

  await t.test('14. PATCH /api/wards/:id/discharge discharges patient from bed', async () => {
    const wardsRes = await makeRequest('/api/wards', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const targetBed = wardsRes.body.beds[0];
    const dischargeRes = await makeRequest(`/api/wards/${targetBed._id}/discharge`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      body: { toStatus: 'available' }
    });
    assert.strictEqual(dischargeRes.status, 200);
    assert.strictEqual(dischargeRes.body.success, true);
    assert.strictEqual(dischargeRes.body.bed.status, 'available');
  });
});
