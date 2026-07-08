import mongoose, { Schema, Document } from 'mongoose';

export interface IPrescription extends Document {
  consultationId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  medications: string[];
  instructions: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema: Schema = new Schema({
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  medications: { type: [String], default: [] },
  instructions: { type: String, required: true },
  status: { type: String, enum: ['draft', 'active', 'completed'], default: 'active' }
}, {
  timestamps: true
});

export const Prescription = mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
export default Prescription;
