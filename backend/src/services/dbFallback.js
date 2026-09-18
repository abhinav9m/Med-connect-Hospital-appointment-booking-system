import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, '../routes/doctors.seed.json');

// Initialize in-memory seed data
let doctorsStore = [];
try {
  doctorsStore = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
} catch (e) {
  doctorsStore = [];
}

let usersStore = [
  {
    _id: 'u1',
    name: 'Aarav Patient',
    email: 'patient@demo.com',
    password: bcrypt.hashSync('demo123', 10),
    role: 'patient',
    phone: '+91 98765 43210'
  },
  {
    _id: 'u2',
    name: 'Dr. Sarah Mitchell',
    email: 'doctor@demo.com',
    password: bcrypt.hashSync('demo123', 10),
    role: 'doctor',
    phone: '+91 98765 12345',
    specialty: 'Cardiology',
    hospital: 'Apollo Heart Center',
    doctorId: 'd1'
  },
  {
    _id: 'u3',
    name: 'Abhinav',
    email: 'abhinav1@gmail.com',
    password: bcrypt.hashSync('12345', 10),
    role: 'admin',
    phone: '+91 99000 00000'
  }
];

let appointmentsStore = [
  {
    id: 'ap-101',
    doctorId: 'd1',
    doctorName: 'Dr. Sarah Mitchell',
    patientEmail: 'patient@demo.com',
    patientName: 'Aarav Patient',
    patientPhone: '+91 98765 43210',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    status: 'upcoming',
    type: 'In-person',
    age: '28',
    gender: 'Male',
    problem: 'Regular cardiac checkup and BP evaluation',
    fee: 1200,
    payment: 'Paid via UPI',
    notes: '',
    prescription: ''
  }
];

export const memoryStore = {
  doctors: doctorsStore,
  users: usersStore,
  appointments: appointmentsStore
};
