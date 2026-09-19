import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  appointmentId: { type: String, required: true, index: true },
  doctorId: { type: String, required: true, index: true },
  patientEmail: { type: String, required: true },
  patientName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Review', ReviewSchema);
