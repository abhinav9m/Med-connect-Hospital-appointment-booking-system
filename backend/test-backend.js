import http from 'http';

const BASE_URL = 'http://localhost:5000';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting E2E MedConnect Backend Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function assert(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAILED: ${name} ->`, err.message);
      failed++;
    }
  }

  // 1. Health Check
  await assert('GET /api/health returns status ok', async () => {
    const res = await request('GET', '/api/health');
    if (res.status !== 200 || res.body.status !== 'ok') {
      throw new Error(`Expected status 200 & status ok, got ${res.status} ${JSON.stringify(res.body)}`);
    }
  });

  // 2. Auth Login Demo Patient
  let patientToken = '';
  await assert('POST /api/auth/login logs in demo patient', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'patient@demo.com',
      password: 'demo123'
    });
    if (res.status !== 200 || !res.body.token) {
      throw new Error(`Login failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }
    patientToken = res.body.token;
  });

  // 3. Auth Register New User
  let newAuthToken = '';
  const testEmail = `testuser_${Date.now()}@example.com`;
  await assert('POST /api/auth/register registers new user', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'Test Patient',
      email: testEmail,
      password: 'Password123!',
      role: 'patient'
    });
    if (res.status !== 201 || !res.body.token) {
      throw new Error(`Registration failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    newAuthToken = res.body.token;
  });

  // 4. GET /api/auth/me
  await assert('GET /api/auth/me returns authenticated user details', async () => {
    const res = await request('GET', '/api/auth/me', null, newAuthToken);
    if (res.status !== 200 || !res.body.user) {
      throw new Error(`Failed to get user profile: ${res.status} ${JSON.stringify(res.body)}`);
    }
  });

  // 5. GET Doctors List
  await assert('GET /api/doctors returns doctor array', async () => {
    const res = await request('GET', '/api/doctors');
    if (res.status !== 200 || !Array.isArray(res.body)) {
      throw new Error(`Expected array of doctors, got ${res.status} ${JSON.stringify(res.body)}`);
    }
  });

  // 6. GET Doctors Filtered by Specialty
  await assert('GET /api/doctors?specialty=Cardiology filters properly', async () => {
    const res = await request('GET', '/api/doctors?specialty=Cardiology');
    if (res.status !== 200 || !Array.isArray(res.body)) {
      throw new Error(`Expected array, got ${res.status}`);
    }
  });

  // 7. GET Doctor by ID
  await assert('GET /api/doctors/d1 returns Dr. Sarah Mitchell', async () => {
    const res = await request('GET', '/api/doctors/d1');
    if (res.status !== 200 || res.body.id !== 'd1') {
      throw new Error(`Doctor d1 not returned properly: ${res.status} ${JSON.stringify(res.body)}`);
    }
  });

  // 8. Auth Login Demo Admin
  let adminToken = '';
  await assert('POST /api/auth/login logs in Abhinav admin', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'abhinav1@gmail.com',
      password: '12345'
    });
    if (res.status !== 200 || !res.body.token) {
      throw new Error(`Admin login failed: ${res.status}`);
    }
    adminToken = res.body.token;
  });


  // 9. Admin Add Doctor
  const testDocId = 'test_doc_' + Date.now();
  await assert('POST /api/doctors adds a new doctor (Admin)', async () => {
    const res = await request('POST', '/api/doctors', {
      id: testDocId,
      name: 'Dr. Test Specialist',
      specialty: 'Neurology',
      hospital: 'Test City Hospital',
      fee: 950,
      experience: 10,
      location: 'Mumbai'
    }, adminToken);

    if (res.status !== 201 || !res.body.success) {
      throw new Error(`Failed to add doctor: ${res.status} ${JSON.stringify(res.body)}`);
    }
  });

  // 10. Admin Delete Doctor
  await assert('DELETE /api/doctors/:id removes doctor (Admin)', async () => {
    const res = await request('DELETE', `/api/doctors/${testDocId}`, null, adminToken);
    if (res.status !== 200 || !res.body.success) {
      throw new Error(`Failed to delete doctor: ${res.status} ${JSON.stringify(res.body)}`);
    }
  });

  // 11. Book Appointment
  const bookApptId = 'test_ap_' + Date.now();
  const testDate = `2026-11-${Math.floor(Math.random()*20+1).toString().padStart(2, '0')}`;
  await assert('POST /api/appointments/book creates appointment', async () => {
    const res = await request('POST', '/api/appointments/book', {
      doctorId: 'd2',
      date: testDate,
      time: '02:30 PM',
      patientEmail: testEmail,
      patientName: 'Test Patient',
      patientPhone: '+91 99999 88888',
      type: 'Video',
      problem: 'Headache & Migraine consultation',
      fee: 1500
    }, newAuthToken);


    if (res.status !== 201 || !res.body.success) {
      throw new Error(`Booking failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
  });

  // 12. GET My Appointments
  await assert('GET /api/appointments/my/:email retrieves booked appointments', async () => {
    const res = await request('GET', `/api/appointments/my/${testEmail}`);
    if (res.status !== 200 || !Array.isArray(res.body) || res.body.length === 0) {
      throw new Error(`Expected appointments for ${testEmail}, got ${res.status} ${JSON.stringify(res.body)}`);
    }
  });

  // 13. Admin GET Stats
  await assert('GET /api/admin/stats returns analytics metrics', async () => {
    const res = await request('GET', '/api/admin/stats', null, adminToken);
    if (res.status !== 200 || !res.body.stats) {
      throw new Error(`Failed to fetch stats: ${res.status} ${JSON.stringify(res.body)}`);
    }
  });

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
