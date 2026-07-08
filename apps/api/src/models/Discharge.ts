import mongoose, { Schema, Document } from 'mongoose';

export interface IDischarge extends Document {
  patientId: mongoose.Types.ObjectId;
  consultationId: mongoose.Types.ObjectId;
  dischargeInstructions: string;
  medications: string[];
  followUpRecommendations: string;
  status: 'draft' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const DischargeSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation', required: true, unique: true },
  dischargeInstructions: { type: String, required: true },
  medications: { type: [String], default: [] },
  followUpRecommendations: { type: String, required: true },
  status: { type: String, enum: ['draft', 'completed'], default: 'completed' }
}, {
  timestamps: true
});

export const Discharge = mongoose.model<IDischarge>('Discharge', DischargeSchema);
export default Discharge;
