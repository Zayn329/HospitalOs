import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import Consultation from '../models/Consultation.js';
import Prescription from '../models/Prescription.js';
import Patient from '../models/Patient.js';
import Discharge from '../models/Discharge.js';
import AuditLog from '../models/AuditLog.js';

describe('Patient Discharge API', () => {
  const originalConsultationFindById = Consultation.findById;
  const originalPrescriptionFindOne = Prescription.findOne;
  const originalPatientFindByIdAndUpdate = Patient.findByIdAndUpdate;
  const originalDischargeFind = Discharge.find;
  const originalDischargeFindOne = Discharge.findOne;
  const originalDischargeSave = Discharge.prototype.save;
  const originalAuditLogSave = AuditLog.prototype.save;

  after(() => {
    Consultation.findById = originalConsultationFindById;
    Prescription.findOne = originalPrescriptionFindOne;
    Patient.findByIdAndUpdate = originalPatientFindByIdAndUpdate;
    Discharge.find = originalDischargeFind;
    Discharge.findOne = originalDischargeFindOne;
    Discharge.prototype.save = originalDischargeSave;
    AuditLog.prototype.save = originalAuditLogSave;
  });

  const dummyConsultationId = new mongoose.Types.ObjectId().toString();
  const dummyPatientId = new mongoose.Types.ObjectId().toString();
  const dummyDischargeId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    Consultation.findById = (async () => ({
      _id: dummyConsultationId,
      patientId: dummyPatientId,
      doctorId: new mongoose.Types.ObjectId().toString(),
      status: 'completed',
      diagnosis: 'Acute Bronchitis',
      treatmentPlan: 'Inhaler course'
    })) as any;

    Prescription.findOne = (async () => ({
      medications: ['Albuterol Inhaler']
    })) as any;

    Patient.findByIdAndUpdate = (async () => ({})) as any;

    Discharge.find = (async () => []) as any;
    Discharge.findOne = (async () => null) as any;
    Discharge.prototype.save = (async function(this: any) {
      this._id = dummyDischargeId;
      return this;
    }) as any;

    AuditLog.prototype.save = (async function(this: any) { return this; }) as any;
  });

  test('POST /api/v1/discharges - should discharge patient successfully', async () => {
    const payload = {
      consultationId: dummyConsultationId,
      dischargeInstructions: 'Rest for 3 days and use inhaler.',
      followUpRecommendations: 'Follow up in 7 days.',
      medications: ['Albuterol Inhaler']
    };

    const response = await request(app)
      .post('/api/v1/discharges')
      .send(payload)
      .expect(201);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.status, 'completed');
  });

  test('POST /api/v1/discharges - should prevent duplicate discharge', async () => {
    Discharge.findOne = (async () => ({
      _id: dummyDischargeId
    })) as any;

    const payload = {
      consultationId: dummyConsultationId,
      dischargeInstructions: 'Rest for 3 days.',
      followUpRecommendations: 'Follow up in 7 days.'
    };

    const response = await request(app)
      .post('/api/v1/discharges')
      .send(payload)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'DUPLICATE_DISCHARGE');
  });

  test('POST /api/v1/discharges - should prevent discharge on uncompleted consultation', async () => {
    Consultation.findById = (async () => ({
      _id: dummyConsultationId,
      status: 'open'
    })) as any;

    const payload = {
      consultationId: dummyConsultationId,
      dischargeInstructions: 'Rest for 3 days.',
      followUpRecommendations: 'Follow up in 7 days.'
    };

    const response = await request(app)
      .post('/api/v1/discharges')
      .send(payload)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'CONSULTATION_NOT_COMPLETED');
  });

  test('POST /api/v1/discharges - should prevent discharge when required fields are missing', async () => {
    const payload = {
      consultationId: dummyConsultationId
      // missing dischargeInstructions and followUpRecommendations
    };

    const response = await request(app)
      .post('/api/v1/discharges')
      .send(payload)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'INCOMPLETE_DISCHARGE');
    assert.ok(response.body.error.missingFields.includes('dischargeInstructions'));
    assert.ok(response.body.error.missingFields.includes('followUpRecommendations'));
  });

  test('POST /api/v1/discharges/draft - should generate draft care plans successfully', async () => {
    const response = await request(app)
      .post('/api/v1/discharges/draft')
      .send({ consultationId: dummyConsultationId })
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.data.dischargeInstructions);
    assert.ok(response.body.data.followUpRecommendations);
  });
});
