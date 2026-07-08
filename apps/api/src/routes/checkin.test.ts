import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Notification from '../models/Notification.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';

describe('Patient Check-In API', () => {
  const originalAppointmentFindById = Appointment.findById;
  const originalPatientFindById = Patient.findById;
  const originalDoctorFindById = Doctor.findById;
  const originalAppointmentSave = Appointment.prototype.save;
  const originalConsultationSave = Consultation.prototype.save;
  const originalNotificationSave = Notification.prototype.save;
  const originalConsultationFind = Consultation.find;

  after(() => {
    Appointment.findById = originalAppointmentFindById;
    Patient.findById = originalPatientFindById;
    Doctor.findById = originalDoctorFindById;
    Appointment.prototype.save = originalAppointmentSave;
    Consultation.prototype.save = originalConsultationSave;
    Notification.prototype.save = originalNotificationSave;
    Consultation.find = originalConsultationFind;
  });

  const dummyAppointmentId = new mongoose.Types.ObjectId().toString();
  const dummyPatientId = new mongoose.Types.ObjectId().toString();
  const dummyDoctorId = new mongoose.Types.ObjectId().toString();
  const todayStr = new Date().toISOString().split('T')[0];

  beforeEach(() => {
    Appointment.findById = (async () => ({
      _id: dummyAppointmentId,
      patientId: dummyPatientId,
      doctorId: dummyDoctorId,
      appointmentDate: todayStr,
      appointmentTime: '09:00',
      status: 'confirmed',
      save: async function(this: any) { return this; }
    })) as any;

    Patient.findById = (async () => ({
      _id: dummyPatientId,
      firstName: 'John',
      lastName: 'Checkin',
      phone: '9876543210'
    })) as any;

    Doctor.findById = (async () => ({
      _id: dummyDoctorId,
      firstName: 'Emily',
      lastName: 'Smith',
      specialization: 'Pediatrics'
    })) as any;

    Appointment.prototype.save = (async function(this: any) { return this; }) as any;
    Consultation.prototype.save = (async function(this: any) { return this; }) as any;
    Notification.prototype.save = (async function(this: any) { return this; }) as any;

    Consultation.find = (() => ({
      populate: function() { return this; },
      sort: function() { return this; },
      then: function(resolve: any) {
        resolve([]);
      }
    })) as any;
  });

  test('POST /api/v1/appointments/:id/checkin - should check-in patient successfully', async () => {
    const response = await request(app)
      .post(`/api/v1/appointments/${dummyAppointmentId}/checkin`)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.appointment.status, 'checked_in');
    assert.strictEqual(response.body.data.consultation.status, 'open');
  });

  test('POST /api/v1/appointments/:id/checkin - should reject if already checked_in', async () => {
    Appointment.findById = (async () => ({
      _id: dummyAppointmentId,
      patientId: dummyPatientId,
      doctorId: dummyDoctorId,
      appointmentDate: todayStr,
      status: 'checked_in'
    })) as any;

    const response = await request(app)
      .post(`/api/v1/appointments/${dummyAppointmentId}/checkin`)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'ALREADY_CHECKED_IN');
  });

  test('POST /api/v1/appointments/:id/checkin - should reject if scheduled date is not today', async () => {
    Appointment.findById = (async () => ({
      _id: dummyAppointmentId,
      patientId: dummyPatientId,
      doctorId: dummyDoctorId,
      appointmentDate: '2026-12-31', // future date
      status: 'confirmed'
    })) as any;

    const response = await request(app)
      .post(`/api/v1/appointments/${dummyAppointmentId}/checkin`)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'INVALID_DATE');
  });

  test('POST /api/v1/consultations/walkin - should create a walk-in successfully', async () => {
    const payload = {
      patientId: dummyPatientId,
      doctorId: dummyDoctorId,
      symptoms: ['Cough', 'Fever']
    };

    const response = await request(app)
      .post('/api/v1/consultations/walkin')
      .send(payload)
      .expect(201);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.status, 'open');
  });

  test('POST /api/v1/consultations/walkin - should reject walk-in if patient profile is missing', async () => {
    Patient.findById = (async () => null) as any;

    const payload = {
      patientId: dummyPatientId,
      doctorId: dummyDoctorId
    };

    const response = await request(app)
      .post('/api/v1/consultations/walkin')
      .send(payload)
      .expect(404);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'PATIENT_NOT_FOUND');
  });

  test('POST /api/v1/appointments/:id/late-options - should return late arrival options', async () => {
    Appointment.findById = (async () => ({
      _id: dummyAppointmentId,
      patientId: dummyPatientId,
      doctorId: dummyDoctorId,
      appointmentDate: todayStr,
      appointmentTime: '09:00',
      status: 'confirmed'
    })) as any;

    // Stub countDocuments for doctor workload
    Appointment.countDocuments = (async () => 3) as any;

    const response = await request(app)
      .post(`/api/v1/appointments/${dummyAppointmentId}/late-options`)
      .send({ arrivalTime: '09:25' })
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.data.recommendedAction);
    assert.ok(response.body.data.explanation);
  });
});
