import mongoose, { Schema, Document } from 'mongoose';

export interface IBill extends Document {
  patientId: mongoose.Types.ObjectId;
  consultationId: mongoose.Types.ObjectId;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  insuranceStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const BillSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation', required: true, unique: true },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  insuranceStatus: { type: String, enum: ['not_required', 'pending', 'approved', 'rejected'], default: 'not_required' }
}, {
  timestamps: true
});

export const Bill = mongoose.model<IBill>('Bill', BillSchema);
export default Bill;
