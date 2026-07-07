import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  reason?: string;
  appointmentType?: string;
  status: 'requested' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  appointmentDate: { type: String, required: true },
  appointmentTime: { type: String, required: true },
  reason: { type: String },
  appointmentType: { type: String, default: 'consultation' },
  status: {
    type: String,
    enum: ['requested', 'confirmed', 'checked_in', 'completed', 'cancelled'],
    default: 'confirmed'
  }
}, {
  timestamps: true
});

// Partial unique index to enforce no double booking for active appointments
AppointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, appointmentTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: 'cancelled' } }
  }
);

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
export default Appointment;
