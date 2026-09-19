import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config();

import authRoutes from './routes/auth.js';
import doctorRoutes from './routes/doctors.js';
import appointmentRoutes from './routes/appointments.js';
import adminRoutes from './routes/admin.js';
import reviewRoutes from './routes/reviews.js';

import User from './models/User.js';
import Doctor from './models/Doctor.js';
import Appointment from './models/Appointment.js';
import Review from './models/Review.js';

import { notFound, errorHandler } from './middleware/errorHandler.js';
import { initMySQL, isMysqlConnected, memoryStore } from './services/mysqlDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use((req, res, next) => {
  console.log(`[API] ${new Date().toISOString()} | ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Med connect-Hospital appointment booking system API',
    mongoConnected: mongoose.connection.readyState === 1,
    mysqlConnected: isMysqlConnected(),
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Resolve frontend static assets
const candidatePaths = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../frontend/dist'),
  path.join(__dirname, './frontend/dist')
];

let frontendDistPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
app.use(express.static(frontendDistPath));

app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) return next();
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.send('Med connect-Hospital appointment booking system API is running. Health check at /api/health');
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Med connect-Hospital appointment booking system API running on port ${PORT}`);

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      console.log('🔄 Connecting to MongoDB Atlas...');
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ CONNECTED TO MONGODB ATLAS SUCCESSFULLY!');

      // Seed initial doctors & admin if empty in MongoDB Atlas
      const docCount = await Doctor.countDocuments();
      if (docCount === 0) {
        for (const doc of memoryStore.doctors) {
          await Doctor.create(doc);
        }
        console.log('✅ Seeded initial doctors into MongoDB Atlas');
      }

      const adminUser = await User.findOne({ email: 'abhinav1@gmail.com' });
      if (!adminUser) {
        const passHash = await bcrypt.hash('12345', 10);
        await User.create({
          name: 'Abhinav',
          email: 'abhinav1@gmail.com',
          password: passHash,
          role: 'admin',
          phone: '+91 99000 00000'
        });
        console.log('✅ Default Abhinav Admin created in MongoDB Atlas');
      }

    } catch (err) {
      console.warn('⚠️ MongoDB Atlas Connection Error:', err.message);
      console.log('⚡ Attempting MySQL / Fallback DB initialization...');
      await initMySQL();
    }
  } else {
    await initMySQL();
  }
});
