import mongoose, { Schema, Document } from 'mongoose';

export interface IConsultation extends Document {
  appointmentId?: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  symptoms?: string[];
  diagnosis?: string;
  treatmentPlan?: string;
  findings?: string;
  status: 'open' | 'in_progress' | 'completed';
  priority?: 'emergency' | 'urgent' | 'routine';
  triageNotes?: string;
  triageAIEvaluated?: boolean;
  soapNotes?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  allergyOverrideReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationSchema: Schema = new Schema({
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  symptoms: { type: [String], default: [] },
  diagnosis: { type: String },
  treatmentPlan: { type: String },
  findings: { type: String },
  status: { type: String, enum: ['open', 'in_progress', 'completed'], default: 'open' },
  priority: { type: String, enum: ['emergency', 'urgent', 'routine'], default: 'routine' },
  triageNotes: { type: String },
  triageAIEvaluated: { type: Boolean, default: false },
  soapNotes: {
    subjective: { type: String, default: '' },
    objective: { type: String, default: '' },
    assessment: { type: String, default: '' },
    plan: { type: String, default: '' }
  },
  allergyOverrideReason: { type: String }
}, {
  timestamps: true
});

export const Consultation = mongoose.model<IConsultation>('Consultation', ConsultationSchema);
export default Consultation;
