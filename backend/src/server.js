import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

import authRoutes from './routes/auth.js';
import doctorRoutes from './routes/doctors.js';
import appointmentRoutes from './routes/appointments.js';
import adminRoutes from './routes/admin.js';
import reviewRoutes from './routes/reviews.js';

import { notFound, errorHandler } from './middleware/errorHandler.js';
import { initMySQL, isMysqlConnected } from './services/mysqlDb.js';

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
    mysqlConnected: isMysqlConnected(),
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Resolve frontend production build path for local dev & Railway Docker
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
  await initMySQL();
});
