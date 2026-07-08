import { test, describe, after, beforeEach } from 'node:test';
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
  const originalAppointmentFind = Appointment.find;
  const originalAppointmentFindOne = Appointment.findOne;
  const originalAppointmentFindById = Appointment.findById;
  const originalAppointmentSave = Appointment.prototype.save;

  after(() => {
    Doctor.findById = originalDoctorFindById;
    Patient.findById = originalPatientFindById;
    Appointment.find = originalAppointmentFind;
    Appointment.findOne = originalAppointmentFindOne;
    Appointment.findById = originalAppointmentFindById;
    Appointment.prototype.save = originalAppointmentSave;
  });

  const dummyDoctorId = new mongoose.Types.ObjectId().toString();
  const dummyPatientId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
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

    Appointment.find = (() => ({
      populate: function() {
        return {
          then: function(resolve: any) {
            resolve([]);
          }
        };
      }
    })) as any;

    Appointment.findOne = (async () => null) as any;

    Appointment.prototype.save = (async function(this: any) {
      this._id = new mongoose.Types.ObjectId();
      return this;
    }) as any;
  });

  test('POST /api/v1/appointments - should book an appointment successfully', async () => {
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

  test('POST /api/v1/appointments - should block booking on conflict and suggest alternatives', async () => {
    // Simulate doctor has conflict
    Appointment.findOne = (async () => ({
      _id: new mongoose.Types.ObjectId(),
      doctorId: dummyDoctorId,
      appointmentDate: '2026-07-08',
      appointmentTime: '09:00',
      status: 'confirmed'
    })) as any;

    // Stub search for active appointments on that day to calculate alternatives
    Appointment.find = (async () => [{
      appointmentTime: '09:00',
      status: 'confirmed'
    }]) as any;

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
    assert.deepStrictEqual(response.body.error.alternatives, ['10:00']);
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

  test('PATCH /api/v1/appointments/:id/cancel - should cancel appointment successfully and return reschedule recommendations', async () => {
    const dummyAppointmentId = new mongoose.Types.ObjectId().toString();

    Appointment.findById = ((id: any) => {
      const document = {
        _id: dummyAppointmentId,
        doctorId: dummyDoctorId,
        appointmentDate: '2026-07-08',
        appointmentTime: '09:00',
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

    // Stub search for other appointments scheduled later to recommend rescheduling
    Appointment.find = (() => ({
      populate: function() {
        return {
          then: function(resolve: any) {
            resolve([{
              _id: 'later-appt-id',
              appointmentTime: '10:00',
              appointmentDate: '2026-07-08',
              patientId: { firstName: 'Bob', lastName: 'Builder', hospitalId: 'HOSP-654321' }
            }]);
          }
        };
      }
    })) as any;

    const response = await request(app)
      .patch(`/api/v1/appointments/${dummyAppointmentId}/cancel`)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.status, 'cancelled');
    assert.ok(response.body.rescheduleRecommendations.length > 0);
    assert.strictEqual(response.body.rescheduleRecommendations[0].recommendedTime, '09:00');
  });
});
