export interface HealthStatus {
  status: 'UP' | 'DOWN';
  timestamp: string;
  details?: Record<string, any>;
}

export interface Patient {
  _id?: string;
  hospitalId: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Appointment {
  _id?: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  reason: string;
  status: 'requested' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}
