import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

describe('Appointment Management API', () => {
  const originalDoctorFindById = Doctor.findById;
  const originalPatientFindById = Patient.findById;
  const originalAppointmentFindOne = Appointment.findOne;
  const originalAppointmentFindById = Appointment.findById;
  const originalAppointmentSave = Appointment.prototype.save;

  after(() => {
    Doctor.findById = originalDoctorFindById;
    Patient.findById = originalPatientFindById;
    Appointment.findOne = originalAppointmentFindOne;
    Appointment.findById = originalAppointmentFindById;
    Appointment.prototype.save = originalAppointmentSave;
  });

  const dummyDoctorId = new mongoose.Types.ObjectId().toString();
  const dummyPatientId = new mongoose.Types.ObjectId().toString();

  test('POST /api/v1/appointments - should book an appointment successfully', async () => {
    // Stub doctor and patient finds
    Doctor.findById = (async () => ({
      _id: dummyDoctorId,
      firstName: 'John',
      lastName: 'Adams',
      specialization: 'Cardiology',
      availability: ['09:00', '10:00']
    })) as any;

    Patient.findById = (async () => ({
      _id: dummyPatientId,
      firstName: 'Jane',
      lastName: 'Doe'
    })) as any;

    // No conflict exists
    Appointment.findOne = (async () => null) as any;

    Appointment.prototype.save = (async function(this: any) {
      this._id = new mongoose.Types.ObjectId();
      return this;
    }) as any;

    // Mock populate return
    Appointment.findById = (() => ({
      populate: function() { return this; },
      then: function(resolve: any) {
        resolve({
          _id: new mongoose.Types.ObjectId(),
          patientId: { _id: dummyPatientId, firstName: 'Jane', lastName: 'Doe', hospitalId: 'HOSP-123456' },
          doctorId: { _id: dummyDoctorId, firstName: 'John', lastName: 'Adams', specialization: 'Cardiology' },
          appointmentDate: '2026-07-08',
          appointmentTime: '09:00',
          reason: 'Heart checkup',
          status: 'confirmed'
        });
      }
    })) as any;

    const payload = {
      patientId: dummyPatientId,
      doctorId: dummyDoctorId,
      appointmentDate: '2026-07-08',
      appointmentTime: '09:00',
      reason: 'Heart checkup'
    };

    const response = await request(app)
      .post('/api/v1/appointments')
      .send(payload)
      .expect(201);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.appointmentTime, '09:00');
    assert.strictEqual(response.body.data.status, 'confirmed');
  });

  test('POST /api/v1/appointments - should block booking on conflict', async () => {
    Doctor.findById = (async () => ({
      _id: dummyDoctorId,
      lastName: 'Adams'
    })) as any;

    Patient.findById = (async () => ({
      _id: dummyPatientId
    })) as any;

    // Simulate doctor has conflict
    Appointment.findOne = (async () => ({
      _id: new mongoose.Types.ObjectId(),
      doctorId: dummyDoctorId,
      appointmentDate: '2026-07-08',
      appointmentTime: '09:00',
      status: 'confirmed'
    })) as any;

    const payload = {
      patientId: dummyPatientId,
      doctorId: dummyDoctorId,
      appointmentDate: '2026-07-08',
      appointmentTime: '09:00',
      reason: 'Heart checkup'
    };

    const response = await request(app)
      .post('/api/v1/appointments')
      .send(payload)
      .expect(409);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'DOUBLE_BOOKING');
  });

  test('PUT /api/v1/appointments/:id - should reschedule successfully', async () => {
    const dummyAppointmentId = new mongoose.Types.ObjectId().toString();

    Appointment.findById = ((id: any) => {
      const document = {
        _id: dummyAppointmentId,
        patientId: dummyPatientId,
        doctorId: dummyDoctorId,
        appointmentDate: '2026-07-08',
        appointmentTime: '09:00',
        status: 'confirmed',
        save: async function(this: any) { return this; }
      };

      const populatedDoc = {
        _id: dummyAppointmentId,
        patientId: { firstName: 'Jane', lastName: 'Doe' },
        doctorId: { firstName: 'John', lastName: 'Adams' },
        appointmentDate: '2026-07-08',
        appointmentTime: '10:00',
        status: 'confirmed'
      };

      return {
        isPopulated: false,
        populate: function() {
          this.isPopulated = true;
          return this;
        },
        then: function(resolve: any) {
          resolve(this.isPopulated ? populatedDoc : document);
        }
      };
    }) as any;

    // No conflict for new slot
    Appointment.findOne = (async () => null) as any;

    const response = await request(app)
      .put(`/api/v1/appointments/${dummyAppointmentId}`)
      .send({
        appointmentDate: '2026-07-08',
        appointmentTime: '10:00'
      })
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.appointmentTime, '10:00');
  });

  test('PATCH /api/v1/appointments/:id/cancel - should cancel appointment successfully', async () => {
    const dummyAppointmentId = new mongoose.Types.ObjectId().toString();

    Appointment.findById = ((id: any) => {
      const document = {
        _id: dummyAppointmentId,
        status: 'confirmed',
        save: async function(this: any) {
          this.status = 'cancelled';
          return this;
        }
      };

      const populatedDoc = {
        _id: dummyAppointmentId,
        patientId: { firstName: 'Jane', lastName: 'Doe' },
        doctorId: { firstName: 'John', lastName: 'Adams' },
        status: 'cancelled'
      };

      return {
        isPopulated: false,
        populate: function() {
          this.isPopulated = true;
          return this;
        },
        then: function(resolve: any) {
          resolve(this.isPopulated ? populatedDoc : document);
        }
      };
    }) as any;

    const response = await request(app)
      .patch(`/api/v1/appointments/${dummyAppointmentId}/cancel`)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.status, 'cancelled');
  });
});
