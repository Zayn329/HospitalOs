import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  hospitalId: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: Date;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory?: string[];
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema: Schema = new Schema({
  hospitalId: { type: String, required: true, unique: true, index: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  gender: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  phone: { type: String, required: true, unique: true, index: true },
  email: { type: String },
  address: { type: String },
  bloodGroup: { type: String },
  allergies: { type: [String], default: [] },
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String }
  },
  medicalHistory: { type: [String], default: [] },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, {
  timestamps: true
});

PatientSchema.pre('validate', function(next) {
  const patient = this as any;
  if (!patient.hospitalId) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    patient.hospitalId = `HOSP-${randomDigits}`;
  }
  next();
});

export const Patient = mongoose.model<IPatient>('Patient', PatientSchema);
export default Patient;
