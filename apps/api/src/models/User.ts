import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: 'patient' | 'receptionist' | 'doctor' | 'laboratory_staff' | 'pharmacist' | 'billing_staff' | 'administrator' | 'system_administrator';
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: [
      'patient',
      'receptionist',
      'doctor',
      'laboratory_staff',
      'pharmacist',
      'billing_staff',
      'administrator',
      'system_administrator'
    ],
    required: true
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;
