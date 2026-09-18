import express from 'express';
import { protect, optionalAuth } from '../middleware/auth.js';
import { isMysqlConnected, dbQuery, memoryStore } from '../services/mysqlDb.js';

const router = express.Router();

// POST /api/appointments/book
router.post('/book', optionalAuth, async (req, res, next) => {
  try {
    const { doctorId, date, time, patientEmail, patientName, patientPhone, type, age, gender, problem, fee, payment } = req.body;

    if (!doctorId || !date || !time || !patientEmail || !patientName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required booking details (doctor, date, time, patient email, patient name)' 
      });
    }

    const apptId = 'ap-' + Date.now();
    let docName = 'Medical Specialist';

    if (isMysqlConnected()) {
      const docs = await dbQuery('SELECT name FROM doctors WHERE id = ?', [doctorId]);
      if (docs.length > 0) docName = docs[0].name;

      // Check slot collision
      const existing = await dbQuery(
        'SELECT id FROM appointments WHERE doctorId = ? AND date = ? AND time = ? AND status != ?',
        [doctorId, date, time, 'cancelled']
      );

      if (existing.length > 0) {
        return res.status(409).json({ 
          success: false, 
          error: 'This slot is already booked for the selected doctor. Please choose another time.' 
        });
      }

      const newAppt = {
        id: apptId,
        doctorId,
        doctorName: docName,
        patientEmail: patientEmail.toLowerCase().trim(),
        patientName,
        patientPhone: patientPhone || '',
        date,
        time,
        status: 'upcoming',
        type: type || 'In-person',
        age: age || '30',
        gender: gender || 'Not specified',
        problem: problem || 'General Consultation',
        fee: Number(fee) || 800,
        payment: payment || 'Paid via Card',
        notes: '',
        prescription: ''
      };

      await dbQuery(
        `INSERT INTO appointments (id, doctorId, doctorName, patientEmail, patientName, patientPhone, date, time, status, type, age, gender, problem, fee, payment, notes, prescription)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newAppt.id, newAppt.doctorId, newAppt.doctorName, newAppt.patientEmail, newAppt.patientName,
          newAppt.patientPhone, newAppt.date, newAppt.time, newAppt.status, newAppt.type, newAppt.age,
          newAppt.gender, newAppt.problem, newAppt.fee, newAppt.payment, '', ''
        ]
      );

      memoryStore.appointments.unshift(newAppt);
      return res.status(201).json({ success: true, data: newAppt });
    }

    // In-memory check collision
    const doc = memoryStore.doctors.find(d => d.id === doctorId);
    if (doc) docName = doc.name;

    const existing = memoryStore.appointments.find(a => 
      a.doctorId === doctorId && a.date === date && a.time === time && a.status !== 'cancelled'
    );
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: 'This slot is already booked for the selected doctor. Please choose another time.' 
      });
    }

    const newAppt = {
      id: apptId,
      doctorId,
      doctorName: docName,
      patientEmail: patientEmail.toLowerCase().trim(),
      patientName,
      patientPhone: patientPhone || '',
      date,
      time,
      status: 'upcoming',
      type: type || 'In-person',
      age: age || '30',
      gender: gender || 'Not specified',
      problem: problem || 'General Consultation',
      fee: Number(fee) || 800,
      payment: payment || 'Paid via Card',
      notes: '',
      prescription: ''
    };

    memoryStore.appointments.unshift(newAppt);
    res.status(201).json({ success: true, data: newAppt });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { email, doctorId, status, date } = req.query;

    if (isMysqlConnected()) {
      let sql = 'SELECT * FROM appointments WHERE 1=1';
      const params = [];

      if (email) { sql += ' AND patientEmail = ?'; params.push(email.toLowerCase().trim()); }
      if (doctorId) { sql += ' AND doctorId = ?'; params.push(doctorId); }
      if (status) { sql += ' AND status = ?'; params.push(status); }
      if (date) { sql += ' AND date = ?'; params.push(date); }

      sql += ' ORDER BY createdAt DESC';
      const rows = await dbQuery(sql, params);
      return res.json(rows);
    }

    let data = [...memoryStore.appointments];
    if (email) data = data.filter(a => a.patientEmail.toLowerCase() === email.toLowerCase().trim());
    if (doctorId) data = data.filter(a => a.doctorId === doctorId);
    if (status) data = data.filter(a => a.status === status);
    if (date) data = data.filter(a => a.date === date);

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/my/:email
router.get('/my/:email', async (req, res, next) => {
  try {
    const cleanEmail = req.params.email.toLowerCase().trim();

    if (isMysqlConnected()) {
      const rows = await dbQuery('SELECT * FROM appointments WHERE patientEmail = ? ORDER BY createdAt DESC', [cleanEmail]);
      return res.json(rows);
    }

    const filtered = memoryStore.appointments.filter(a => a.patientEmail.toLowerCase() === cleanEmail);
    res.json(filtered);
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/doctor/:doctorId
router.get('/doctor/:doctorId', async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (isMysqlConnected()) {
      const rows = await dbQuery('SELECT * FROM appointments WHERE doctorId = ? ORDER BY createdAt DESC', [doctorId]);
      return res.json(rows);
    }

    const filtered = memoryStore.appointments.filter(a => a.doctorId === doctorId);
    res.json(filtered);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/cancel
router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMysqlConnected()) {
      await dbQuery('UPDATE appointments SET status = ? WHERE id = ?', ['cancelled', id]);
    }

    const appt = memoryStore.appointments.find(a => a.id === id);
    if (appt) appt.status = 'cancelled';

    res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['upcoming', 'completed', 'cancelled', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid appointment status' });
    }

    if (isMysqlConnected()) {
      await dbQuery('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
    }

    const appt = memoryStore.appointments.find(a => a.id === id);
    if (appt) appt.status = status;

    res.json({ success: true, message: `Appointment status updated to ${status}` });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/clinical (Doctor adds notes and prescription)
router.patch('/:id/clinical', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes, prescription } = req.body;

    if (isMysqlConnected()) {
      await dbQuery(
        'UPDATE appointments SET notes = ?, prescription = ?, status = ? WHERE id = ?',
        [notes || '', prescription || '', 'completed', id]
      );
      const rows = await dbQuery('SELECT * FROM appointments WHERE id = ?', [id]);
      if (rows.length > 0) return res.json({ success: true, data: rows[0] });
    }

    const appt = memoryStore.appointments.find(a => a.id === id);
    if (appt) {
      if (notes !== undefined) appt.notes = notes;
      if (prescription !== undefined) appt.prescription = prescription;
      appt.status = 'completed';
      return res.json({ success: true, data: appt });
    }

    res.status(404).json({ success: false, error: 'Appointment not found' });
  } catch (err) {
    next(err);
  }
});

export default router;
