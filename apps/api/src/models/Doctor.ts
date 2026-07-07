import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctor extends Document {
  firstName: string;
  lastName: string;
  specialization: string;
  department: string;
  experience: number;
  availability: string[];
  consultationFee: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  specialization: { type: String, required: true },
  department: { type: String, required: true },
  experience: { type: Number, required: true },
  availability: { type: [String], default: ["09:00", "10:00", "11:00", "14:00", "15:00"] },
  consultationFee: { type: Number, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, {
  timestamps: true
});

export const Doctor = mongoose.model<IDoctor>('Doctor', DoctorSchema);
export default Doctor;
