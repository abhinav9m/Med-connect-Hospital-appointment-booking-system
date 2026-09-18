import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { isMysqlConnected, dbQuery, memoryStore } from '../services/mysqlDb.js';

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', protect, authorize('admin'), async (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    if (isMysqlConnected()) {
      const patientRows = await dbQuery('SELECT COUNT(*) as count FROM users WHERE role = ?', ['patient']);
      const doctorRows = await dbQuery('SELECT COUNT(*) as count FROM doctors');
      const appointments = await dbQuery('SELECT * FROM appointments');

      const totalPatients = patientRows[0].count;
      const totalDoctors = doctorRows[0].count;
      const totalAppointments = appointments.length;
      const appointmentsToday = appointments.filter(a => a.date === todayStr).length;

      let totalRevenue = 0;
      const statusBreakdown = { upcoming: 0, completed: 0, cancelled: 0, pending: 0 };
      const specialtyMap = {};

      appointments.forEach(a => {
        if (a.status !== 'cancelled') {
          totalRevenue += Number(a.fee) || 0;
        }
        if (statusBreakdown[a.status] !== undefined) {
          statusBreakdown[a.status]++;
        }
      });

      const doctors = await dbQuery('SELECT specialty FROM doctors');
      doctors.forEach(d => {
        const spec = d.specialty || 'General Medicine';
        specialtyMap[spec] = (specialtyMap[spec] || 0) + 1;
      });

      const specialtyDistribution = Object.keys(specialtyMap).map(spec => ({
        name: spec,
        count: specialtyMap[spec]
      }));

      return res.json({
        success: true,
        stats: {
          totalPatients,
          totalDoctors,
          totalAppointments,
          appointmentsToday,
          totalRevenue,
          statusBreakdown,
          specialtyDistribution
        }
      });
    }

    // In-memory fallback
    const totalPatients = memoryStore.users.filter(u => u.role === 'patient').length;
    const totalDoctors = memoryStore.doctors.length;
    const appointments = memoryStore.appointments;
    const totalAppointments = appointments.length;
    const appointmentsToday = appointments.filter(a => a.date === todayStr).length;

    let totalRevenue = 0;
    const statusBreakdown = { upcoming: 0, completed: 0, cancelled: 0, pending: 0 };
    const specialtyMap = {};

    appointments.forEach(a => {
      if (a.status !== 'cancelled') {
        totalRevenue += Number(a.fee) || 0;
      }
      if (statusBreakdown[a.status] !== undefined) {
        statusBreakdown[a.status]++;
      }
    });

    memoryStore.doctors.forEach(d => {
      const spec = d.specialty || 'General Medicine';
      specialtyMap[spec] = (specialtyMap[spec] || 0) + 1;
    });

    const specialtyDistribution = Object.keys(specialtyMap).map(spec => ({
      name: spec,
      count: specialtyMap[spec]
    }));

    res.json({
      success: true,
      stats: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        appointmentsToday,
        totalRevenue,
        statusBreakdown,
        specialtyDistribution
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/patients - List all registered patients (no passwords)
router.get('/patients', protect, authorize('admin'), async (req, res, next) => {
  try {
    if (isMysqlConnected()) {
      const patients = await dbQuery('SELECT id, name, email, role, phone, createdAt FROM users WHERE role = ? ORDER BY createdAt DESC', ['patient']);
      return res.json({ success: true, patients });
    }

    const patients = memoryStore.users
      .filter(u => u.role === 'patient')
      .map(({ password, ...u }) => u);
    res.json({ success: true, patients });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/assignments - Master Doctor-Patient Assignments View
router.get('/assignments', protect, authorize('admin'), async (req, res, next) => {
  try {
    if (isMysqlConnected()) {
      const assignments = await dbQuery('SELECT * FROM appointments ORDER BY createdAt DESC');
      return res.json({ success: true, assignments });
    }

    res.json({ success: true, assignments: memoryStore.appointments });
  } catch (err) {
    next(err);
  }
});

export default router;
