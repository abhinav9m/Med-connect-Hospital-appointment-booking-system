import express from 'express';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import { isMysqlConnected, dbQuery, memoryStore } from '../services/mysqlDb.js';

const router = express.Router();

// GET /api/doctors
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { specialty, location, q, minRating, sortBy } = req.query;

    if (isMysqlConnected()) {
      let sql = 'SELECT * FROM doctors WHERE 1=1';
      const params = [];

      if (specialty && specialty !== 'All' && specialty !== 'All Specialties') {
        sql += ' AND specialty = ?';
        params.push(specialty);
      }
      if (location && location !== 'All') {
        sql += ' AND location LIKE ?';
        params.push(`%${location}%`);
      }
      if (minRating) {
        sql += ' AND rating >= ?';
        params.push(parseFloat(minRating));
      }
      if (q) {
        sql += ' AND (name LIKE ? OR specialty LIKE ? OR hospital LIKE ? OR location LIKE ?)';
        const term = `%${q}%`;
        params.push(term, term, term, term);
      }

      if (sortBy === 'experience') sql += ' ORDER BY experience DESC';
      else if (sortBy === 'feeAsc') sql += ' ORDER BY fee ASC';
      else if (sortBy === 'feeDesc') sql += ' ORDER BY fee DESC';
      else sql += ' ORDER BY rating DESC';

      const doctors = await dbQuery(sql, params);
      return res.json(doctors);
    }

    // Memory fallback
    let data = [...memoryStore.doctors];
    if (specialty && specialty !== 'All' && specialty !== 'All Specialties') {
      data = data.filter(d => d.specialty === specialty);
    }
    if (location && location !== 'All') {
      data = data.filter(d => d.location.toLowerCase().includes(location.toLowerCase()));
    }
    if (minRating) {
      data = data.filter(d => d.rating >= parseFloat(minRating));
    }
    if (q) {
      const term = q.toLowerCase();
      data = data.filter(d => 
        d.name.toLowerCase().includes(term) || 
        d.specialty.toLowerCase().includes(term) ||
        (d.hospital && d.hospital.toLowerCase().includes(term))
      );
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMysqlConnected()) {
      const rows = await dbQuery('SELECT * FROM doctors WHERE id = ?', [id]);
      if (rows.length > 0) return res.json(rows[0]);
    }

    const doc = memoryStore.doctors.find(d => d.id === id);
    if (!doc) return res.status(404).json({ success: false, error: 'Doctor not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// POST /api/doctors (Admin create)
router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const customId = req.body.id || 'd_' + Date.now();
    const docData = {
      id: customId,
      name: req.body.name,
      specialty: req.body.specialty || 'General Medicine',
      experience: Number(req.body.experience) || 5,
      rating: Number(req.body.rating) || 0.0,
      reviewsCount: Number(req.body.reviewsCount) || 0,
      hospital: req.body.hospital || 'MedConnect Hospital',
      fee: Number(req.body.fee) || 800,
      education: req.body.education || 'MBBS / MD',
      about: req.body.about || 'Experienced healthcare specialist.',
      languages: Array.isArray(req.body.languages) ? req.body.languages.join(', ') : (req.body.languages || 'English, Hindi'),
      location: req.body.location || 'Delhi',
      availableToday: Number(req.body.availableToday) || 5
    };

    if (isMysqlConnected()) {
      await dbQuery(
        `INSERT INTO doctors (id, name, specialty, experience, rating, reviewsCount, hospital, fee, education, about, languages, location, availableToday)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          docData.id, docData.name, docData.specialty, docData.experience, docData.rating, docData.reviewsCount,
          docData.hospital, docData.fee, docData.education, docData.about, docData.languages, docData.location, docData.availableToday
        ]
      );
      memoryStore.doctors.push(docData);
      return res.status(201).json({ success: true, data: docData });
    }

    memoryStore.doctors.push(docData);
    res.status(201).json({ success: true, data: docData });
  } catch (err) {
    next(err);
  }
});

// PUT /api/doctors/:id (Admin or Doctor update availability & slots)
router.put('/:id', protect, authorize('admin', 'doctor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { availableToday, fee, hospital, about, specialty, experience, location } = req.body;

    if (isMysqlConnected()) {
      let updates = [];
      let params = [];

      if (availableToday !== undefined) { updates.push('availableToday = ?'); params.push(Number(availableToday)); }
      if (fee !== undefined) { updates.push('fee = ?'); params.push(Number(fee)); }
      if (hospital !== undefined) { updates.push('hospital = ?'); params.push(hospital); }
      if (about !== undefined) { updates.push('about = ?'); params.push(about); }
      if (specialty !== undefined) { updates.push('specialty = ?'); params.push(specialty); }
      if (experience !== undefined) { updates.push('experience = ?'); params.push(Number(experience)); }
      if (location !== undefined) { updates.push('location = ?'); params.push(location); }

      if (updates.length > 0) {
        params.push(id);
        await dbQuery(`UPDATE doctors SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      const rows = await dbQuery('SELECT * FROM doctors WHERE id = ?', [id]);
      if (rows.length > 0) return res.json({ success: true, data: rows[0] });
    }

    const idx = memoryStore.doctors.findIndex(d => d.id === id);
    if (idx !== -1) {
      memoryStore.doctors[idx] = { ...memoryStore.doctors[idx], ...req.body };
      return res.json({ success: true, data: memoryStore.doctors[idx] });
    }

    res.status(404).json({ success: false, error: 'Doctor not found' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/doctors/:id (Admin delete doctor)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMysqlConnected()) {
      await dbQuery('DELETE FROM doctors WHERE id = ?', [id]);
    }

    memoryStore.doctors = memoryStore.doctors.filter(d => d.id !== id);
    res.json({ success: true, message: 'Doctor removed successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
