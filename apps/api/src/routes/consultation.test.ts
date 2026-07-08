import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import Consultation from '../models/Consultation.js';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import Prescription from '../models/Prescription.js';
import AuditLog from '../models/AuditLog.js';

describe('Patient Consultation Workflow API', () => {
  const originalConsultationFindById = Consultation.findById;
  const originalConsultationFind = Consultation.find;
  const originalConsultationSave = Consultation.prototype.save;
  const originalPatientFindById = Patient.findById;
  const originalPatientFindByIdAndUpdate = Patient.findByIdAndUpdate;
  const originalAppointmentFindByIdAndUpdate = Appointment.findByIdAndUpdate;
  const originalPrescriptionFind = Prescription.find;
  const originalPrescriptionSave = Prescription.prototype.save;
  const originalAuditLogSave = AuditLog.prototype.save;

  after(() => {
    Consultation.findById = originalConsultationFindById;
    Consultation.find = originalConsultationFind;
    Consultation.prototype.save = originalConsultationSave;
    Patient.findById = originalPatientFindById;
    Patient.findByIdAndUpdate = originalPatientFindByIdAndUpdate;
    Appointment.findByIdAndUpdate = originalAppointmentFindByIdAndUpdate;
    Prescription.find = originalPrescriptionFind;
    Prescription.prototype.save = originalPrescriptionSave;
    AuditLog.prototype.save = originalAuditLogSave;
  });

  const dummyConsultationId = new mongoose.Types.ObjectId().toString();
  const dummyPatientId = new mongoose.Types.ObjectId().toString();
  const dummyAppointmentId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    Consultation.findById = (async () => ({
      _id: dummyConsultationId,
      patientId: dummyPatientId,
      doctorId: new mongoose.Types.ObjectId().toString(),
      appointmentId: dummyAppointmentId,
      status: 'open',
      priority: 'routine',
      save: async function(this: any) { return this; }
    })) as any;

    Consultation.find = (() => ({
      sort: function() { return this; },
      then: function(resolve: any) {
        resolve([]);
      }
    })) as any;
    Consultation.prototype.save = (async function(this: any) { return this; }) as any;

    Patient.findById = (async () => ({
      _id: dummyPatientId,
      firstName: 'Robert',
      lastName: 'Miller',
      allergies: ['Penicillin'],
      medicalHistory: ['Hypertension']
    })) as any;

    Patient.findByIdAndUpdate = (async () => ({})) as any;
    Appointment.findByIdAndUpdate = (async () => ({})) as any;

    Prescription.find = (async () => []) as any;
    Prescription.prototype.save = (async function(this: any) { return this; }) as any;
    AuditLog.prototype.save = (async function(this: any) { return this; }) as any;
  });

  test('POST /api/v1/consultations/:id/start - should open consultation and load clinical context', async () => {
    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/start`)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.consultation.status, 'in_progress');
    assert.strictEqual(response.body.data.patient.lastName, 'Miller');
    assert.ok(response.body.data.labResults.length > 0);
  });

  test('POST /api/v1/consultations/:id/start - should reject if already completed', async () => {
    Consultation.findById = (async () => ({
      _id: dummyConsultationId,
      status: 'completed'
    })) as any;

    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/start`)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'ALREADY_COMPLETED');
  });

  test('POST /api/v1/consultations/:id/scribe - should generate SOAP format notes', async () => {
    const payload = {
      symptoms: ['dry cough', 'mild fever'],
      findings: 'congestion in throat, temperature 99.8F',
      treatment: 'rest and hydration, cough syrup twice daily'
    };

    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/scribe`)
      .send(payload)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.data.subjective);
    assert.ok(response.body.data.objective);
    assert.ok(response.body.data.assessment);
    assert.ok(response.body.data.plan);
  });

  test('POST /api/v1/consultations/:id/complete - should complete consultation successfully without medications', async () => {
    const payload = {
      diagnosis: 'Seasonal Cough',
      findings: 'mild pharyngeal congestion',
      treatmentPlan: 'hydration and throat lozenges',
      soapNotes: {
        subjective: 'Dry cough for 2 days',
        objective: 'Congestion observed',
        assessment: 'Viral throat infection',
        plan: 'Hydration'
      }
    };

    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/complete`)
      .send(payload)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.status, 'completed');
  });

  test('POST /api/v1/consultations/:id/complete - should block completion on drug allergy warning conflict', async () => {
    const payload = {
      diagnosis: 'Streptococcal Pharyngitis',
      findings: 'Tonsillar exudate present',
      treatmentPlan: 'Amoxicillin course',
      soapNotes: {
        subjective: 'Sore throat, fever',
        objective: 'Exudate noted',
        assessment: 'Bacterial strep infection',
        plan: 'Amoxicillin'
      },
      medications: ['Amoxicillin'],
      instructions: 'Take 500mg daily'
    };

    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/complete`)
      .send(payload)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'ALLERGY_CONFLICT');
    assert.ok(response.body.error.warnings.length > 0);
  });

  test('POST /api/v1/consultations/:id/complete - should block completion on drug interaction warning conflict', async () => {
    // Mock active prescription containing Warfarin
    Prescription.find = (async () => [
      {
        patientId: dummyPatientId,
        medications: ['Warfarin'],
        status: 'active'
      }
    ]) as any;

    const payload = {
      diagnosis: 'Muscle Soreness',
      findings: 'Back pain',
      treatmentPlan: 'Aspirin course',
      soapNotes: {
        subjective: 'Back ache',
        objective: 'Pain on palpation',
        assessment: 'Sprain',
        plan: 'Aspirin'
      },
      medications: ['Aspirin'],
      instructions: 'Take 325mg daily'
    };

    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/complete`)
      .send(payload)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'ALLERGY_CONFLICT');
    assert.ok(response.body.error.warnings.some((w: string) => w.includes('Interaction')));
  });

  test('POST /api/v1/consultations/:id/complete - should block completion on duplicate medication warning conflict', async () => {
    // Mock active prescription containing Ibuprofen
    Prescription.find = (async () => [
      {
        patientId: dummyPatientId,
        medications: ['Ibuprofen 400mg'],
        status: 'active'
      }
    ]) as any;

    const payload = {
      diagnosis: 'Muscle Soreness',
      findings: 'Back pain',
      treatmentPlan: 'Ibuprofen course',
      soapNotes: {
        subjective: 'Back ache',
        objective: 'Pain on palpation',
        assessment: 'Sprain',
        plan: 'Ibuprofen'
      },
      medications: ['Ibuprofen 200mg'],
      instructions: 'Take 200mg as needed'
    };

    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/complete`)
      .send(payload)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'ALLERGY_CONFLICT');
    assert.ok(response.body.error.warnings.some((w: string) => w.includes('Duplicate')));
  });

  test('POST /api/v1/consultations/:id/complete - should complete with override reason logged', async () => {
    const payload = {
      diagnosis: 'Streptococcal Pharyngitis',
      findings: 'Tonsillar exudate present',
      treatmentPlan: 'Amoxicillin course',
      soapNotes: {
        subjective: 'Sore throat, fever',
        objective: 'Exudate noted',
        assessment: 'Bacterial strep infection',
        plan: 'Amoxicillin'
      },
      medications: ['Amoxicillin'],
      instructions: 'Take 500mg daily',
      allergyOverrideReason: 'Allergy is mild rash only; patient previously tolerated this under observation.'
    };

    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/complete`)
      .send(payload)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.status, 'completed');
  });
});
