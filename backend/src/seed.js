import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

import Doctor from './models/Doctor.js';
import User from './models/User.js';
import Appointment from './models/Appointment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const doctorSeed = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes/doctors.seed.json'), 'utf8'));

async function run() {
  if (!process.env.MONGO_URI) {
    console.log('Set MONGO_URI in .env');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB');

    // Clear existing
    await Doctor.deleteMany({});
    await User.deleteMany({});
    await Appointment.deleteMany({});

    // Seed Doctors
    await Doctor.insertMany(doctorSeed);
    console.log(`✅ Seeded ${doctorSeed.length} doctor profiles`);

    // Hash default passwords
    const demoPass = await bcrypt.hash('demo123', 10);
    const abhinavPass = await bcrypt.hash('12345', 10);

    const defaultUsers = [
      {
        name: 'Aarav Patient',
        email: 'patient@demo.com',
        password: demoPass,
        role: 'patient',
        phone: '+91 98765 43210'
      },
      {
        name: 'Dr. Sarah Mitchell',
        email: 'doctor@demo.com',
        password: demoPass,
        role: 'doctor',
        phone: '+91 98765 12345',
        specialty: 'Cardiology',
        hospital: 'Apollo Heart Center',
        doctorId: 'd1'
      },
      {
        name: 'Abhinav',
        email: 'abhinav1@gmail.com',
        password: abhinavPass,
        role: 'admin',
        phone: '+91 99000 00000'
      }
    ];

    await User.insertMany(defaultUsers);
    console.log('✅ Seeded default system users (Abhinav Admin, Demo Patient, Demo Doctor)');

    // Seed Initial Appointment
    const todayStr = new Date().toISOString().split('T')[0];
    await Appointment.create({
      id: 'ap-101',
      doctorId: 'd1',
      doctorName: 'Dr. Sarah Mitchell',
      patientEmail: 'patient@demo.com',
      patientName: 'Aarav Patient',
      patientPhone: '+91 98765 43210',
      date: todayStr,
      time: '10:00 AM',
      status: 'upcoming',
      type: 'In-person',
      age: '28',
      gender: 'Male',
      problem: 'Routine cardiac checkup & ECG review',
      fee: 1200,
      payment: 'Paid via Card',
      notes: '',
      prescription: ''
    });

    console.log('✅ Seeded initial appointments');
    console.log('🎉 Database seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  }
}

run();
