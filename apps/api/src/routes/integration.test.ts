import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Prescription from '../models/Prescription.js';
import Discharge from '../models/Discharge.js';
import Bill from '../models/Bill.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

describe('HospitalOS End-to-End Clinical Lifecycle Integration Test', () => {
  const dummyPatientId = new mongoose.Types.ObjectId().toString();
  const dummyDoctorId = new mongoose.Types.ObjectId().toString();
  const dummyAppointmentId = new mongoose.Types.ObjectId().toString();
  const dummyConsultationId = new mongoose.Types.ObjectId().toString();
  const todayStr = new Date().toISOString().split('T')[0];

  const originalPatientSave = Patient.prototype.save;
  const originalPatientFind = Patient.find;
  const originalPatientFindById = Patient.findById;
  const originalPatientFindByIdAndUpdate = Patient.findByIdAndUpdate;
  const originalPatientCount = Patient.countDocuments;

  const originalDoctorFindById = Doctor.findById;

  const originalAppointmentFindById = Appointment.findById;
  const originalAppointmentFindByIdAndUpdate = Appointment.findByIdAndUpdate;
  const originalAppointmentSave = Appointment.prototype.save;
  const originalAppointmentCount = Appointment.countDocuments;

  const originalConsultationFindById = Consultation.findById;
  const originalConsultationFind = Consultation.find;
  const originalConsultationSave = Consultation.prototype.save;
  const originalConsultationCount = Consultation.countDocuments;

  const originalPrescriptionFind = Prescription.find;
  const originalPrescriptionSave = Prescription.prototype.save;

  const originalDischargeFindOne = Discharge.findOne;
  const originalDischargeSave = Discharge.prototype.save;

  const originalBillFind = Bill.find;
  const originalBillCount = Bill.countDocuments;

  const originalNotificationSave = Notification.prototype.save;
  const originalAuditLogSave = AuditLog.prototype.save;

  after(() => {
    Patient.prototype.save = originalPatientSave;
    Patient.find = originalPatientFind;
    Patient.findById = originalPatientFindById;
    Patient.findByIdAndUpdate = originalPatientFindByIdAndUpdate;
    Patient.countDocuments = originalPatientCount;

    Doctor.findById = originalDoctorFindById;

    Appointment.findById = originalAppointmentFindById;
    Appointment.findByIdAndUpdate = originalAppointmentFindByIdAndUpdate;
    Appointment.prototype.save = originalAppointmentSave;
    Appointment.countDocuments = originalAppointmentCount;

    Consultation.findById = originalConsultationFindById;
    Consultation.find = originalConsultationFind;
    Consultation.prototype.save = originalConsultationSave;
    Consultation.countDocuments = originalConsultationCount;

    Prescription.find = originalPrescriptionFind;
    Prescription.prototype.save = originalPrescriptionSave;

    Discharge.findOne = originalDischargeFindOne;
    Discharge.prototype.save = originalDischargeSave;

    Bill.find = originalBillFind;
    Bill.countDocuments = originalBillCount;

    Notification.prototype.save = originalNotificationSave;
    AuditLog.prototype.save = originalAuditLogSave;
  });

  beforeEach(() => {
    let consultationStatus = 'open';

    Patient.prototype.save = (async function(this: any) {
      this._id = this._id || dummyPatientId;
      this.hospitalId = 'HOSP-2026-9999';
      return this;
    }) as any;

    Patient.countDocuments = (async () => 1) as any;
    Patient.find = (async () => []) as any;
    Patient.findById = (async () => ({
      _id: dummyPatientId,
      firstName: 'Alice',
      lastName: 'Smith',
      dateOfBirth: '1990-05-15',
      gender: 'female',
      phone: '5551234567',
      allergies: ['Penicillin'],
      medicalHistory: ['Asthma']
    })) as any;
    Patient.findByIdAndUpdate = (async () => ({
      _id: dummyPatientId,
      location: 'discharged'
    })) as any;

    Doctor.findById = (async () => ({
      _id: dummyDoctorId,
      firstName: 'Gregory',
      lastName: 'House',
      specialization: 'Diagnostic Medicine'
    })) as any;

    Appointment.findById = (async () => ({
      _id: dummyAppointmentId,
      patientId: dummyPatientId,
      doctorId: dummyDoctorId,
      appointmentDate: todayStr,
      appointmentTime: '10:00',
      status: 'confirmed',
      save: async function(this: any) { return this; }
    })) as any;
    Appointment.findByIdAndUpdate = (async () => ({})) as any;
    Appointment.prototype.save = (async function(this: any) { return this; }) as any;
    Appointment.countDocuments = (async () => 5) as any;

    Consultation.findById = (async () => ({
      _id: dummyConsultationId,
      patientId: dummyPatientId,
      doctorId: dummyDoctorId,
      appointmentId: dummyAppointmentId,
      status: consultationStatus,
      priority: 'routine',
      symptoms: ['Chest tightness', 'Shortness of breath'],
      save: async function(this: any) {
        if (this.status) consultationStatus = this.status;
        return this;
      }
    })) as any;
    Consultation.find = (() => ({
      sort: function() { return this; },
      then: function(resolve: any) {
        resolve([
          {
            _id: dummyConsultationId,
            patientId: { firstName: 'Alice', lastName: 'Smith' },
            doctorId: { firstName: 'Gregory', lastName: 'House' },
            status: 'open',
            priority: 'emergency',
            createdAt: new Date()
          }
        ]);
      }
    })) as any;
    Consultation.prototype.save = (async function(this: any) { return this; }) as any;
    Consultation.countDocuments = (async () => 1) as any;

    Prescription.find = (async () => []) as any;
    Prescription.prototype.save = (async function(this: any) { return this; }) as any;

    Discharge.findOne = (async () => null) as any;
    Discharge.prototype.save = (async function(this: any) { return this; }) as any;

    Bill.find = (async () => []) as any;
    Bill.countDocuments = (async () => 1) as any;

    Notification.prototype.save = (async function(this: any) { return this; }) as any;
    AuditLog.prototype.save = (async function(this: any) { return this; }) as any;
  });

  test('Full Patient Journey: Register -> Check-in -> Triage -> Scribe -> Safety Check -> Complete -> Discharge -> Analytics', async () => {
    // 1. Patient Registration
    const regRes = await request(app)
      .post('/api/v1/patients')
      .send({
        firstName: 'Alice',
        lastName: 'Smith',
        dateOfBirth: '1990-05-15',
        gender: 'female',
        phone: '5551234567',
        allergies: ['Penicillin'],
        medicalHistory: ['Asthma']
      })
      .expect(201);

    assert.strictEqual(regRes.body.success, true);
    assert.ok(regRes.body.data.hospitalId);

    // 2. Patient Check-In
    const checkinRes = await request(app)
      .post(`/api/v1/appointments/${dummyAppointmentId}/checkin`)
      .expect(200);

    assert.strictEqual(checkinRes.body.success, true);
    assert.strictEqual(checkinRes.body.data.appointment.status, 'checked_in');

    // 3. Symptom Triage Evaluation & Emergency Confirmation
    const triageEvalRes = await request(app)
      .post('/api/v1/triage/evaluate')
      .send({ symptoms: 'Patient experiencing severe crushing chest pain and shortness of breath.' })
      .expect(200);

    assert.strictEqual(triageEvalRes.body.success, true);
    assert.strictEqual(triageEvalRes.body.data.priority, 'emergency');

    const triageConfirmRes = await request(app)
      .post('/api/v1/triage/confirm')
      .send({
        consultationId: dummyConsultationId,
        priority: 'emergency',
        triageNotes: 'Immediate evaluation by cardiology.',
        isOverride: false
      })
      .expect(200);

    assert.strictEqual(triageConfirmRes.body.success, true);
    assert.strictEqual(triageConfirmRes.body.data.consultation.priority, 'emergency');

    // 4. Open Consultation Workspace & Scribe
    const startRes = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/start`)
      .expect(200);

    assert.strictEqual(startRes.body.success, true);
    assert.strictEqual(startRes.body.data.consultation.status, 'in_progress');

    const scribeRes = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/scribe`)
      .send({
        symptoms: ['Chest pain', 'Dyspnea'],
        findings: 'ECG shows sinus tachycardia, no ST elevation',
        treatment: 'Sublingual nitroglycerin, oxygen therapy'
      })
      .expect(200);

    assert.strictEqual(scribeRes.body.success, true);
    assert.ok(scribeRes.body.data.subjective);

    // 5. Medication Safety Conflict & Override Completion
    const conflictRes = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/complete`)
      .send({
        diagnosis: 'Acute Angina Pectoris',
        findings: 'ECG tachycardia',
        treatmentPlan: 'Nitroglycerin and Amoxicillin',
        soapNotes: scribeRes.body.data,
        medications: ['Amoxicillin']
      })
      .expect(400);

    assert.strictEqual(conflictRes.body.success, false);
    assert.strictEqual(conflictRes.body.error.code, 'ALLERGY_CONFLICT');

    const completeRes = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/complete`)
      .send({
        diagnosis: 'Acute Angina Pectoris',
        findings: 'ECG tachycardia',
        treatmentPlan: 'Nitroglycerin and Amoxicillin',
        soapNotes: scribeRes.body.data,
        medications: ['Amoxicillin'],
        instructions: 'Take as directed',
        allergyOverrideReason: 'Patient previously tolerated Amoxicillin without reaction.'
      })
      .expect(200);

    assert.strictEqual(completeRes.body.success, true);
    assert.strictEqual(completeRes.body.data.status, 'completed');

    // 6. Patient Discharge
    const dischargeRes = await request(app)
      .post('/api/v1/discharges')
      .send({
        consultationId: dummyConsultationId,
        dischargeInstructions: 'Rest, avoid heavy exertion, call 911 if chest pain recurs.',
        followUpRecommendations: 'Follow up with cardiologist in 5 days.'
      })
      .expect(201);

    assert.strictEqual(dischargeRes.body.success, true);

    // 7. Hospital Analytics Verification
    const analyticsRes = await request(app)
      .get('/api/v1/analytics/dashboard')
      .expect(200);

    assert.strictEqual(analyticsRes.body.success, true);
    assert.ok(analyticsRes.body.data.totalPatients >= 0);
  });
});
