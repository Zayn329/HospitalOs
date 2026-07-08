import mongoose, { Schema, Document } from 'mongoose';

export interface ILabReport extends Document {
  patientId: mongoose.Types.ObjectId;
  testName: string;
  rawText: string;
  isAbnormal: boolean;
  aiSummary: string;
  status: 'pending_review' | 'reviewed';
  createdAt: Date;
  updatedAt: Date;
}

const LabReportSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  testName: { type: String, required: true },
  rawText: { type: String, required: true },
  isAbnormal: { type: Boolean, default: false },
  aiSummary: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['pending_review', 'reviewed'], 
    default: 'pending_review' 
  }
}, {
  timestamps: true
});

export const LabReport = mongoose.model<ILabReport>('LabReport', LabReportSchema);
export default LabReport;
