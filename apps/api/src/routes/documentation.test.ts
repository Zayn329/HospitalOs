import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import Consultation from '../models/Consultation.js';
import AuditLog from '../models/AuditLog.js';

describe('Medical Documentation API', () => {
  const originalConsultationFindById = Consultation.findById;
  const originalConsultationSave = Consultation.prototype.save;
  const originalAuditLogSave = AuditLog.prototype.save;
  const originalAuditLogFind = AuditLog.find;

  after(() => {
    Consultation.findById = originalConsultationFindById;
    Consultation.prototype.save = originalConsultationSave;
    AuditLog.prototype.save = originalAuditLogSave;
    AuditLog.find = originalAuditLogFind;
  });

  const dummyConsultationId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    Consultation.findById = (async () => ({
      _id: dummyConsultationId,
      patientId: new mongoose.Types.ObjectId().toString(),
      doctorId: new mongoose.Types.ObjectId().toString(),
      status: 'completed',
      diagnosis: 'Initial Diagnosis',
      findings: 'Initial exam notes.',
      treatmentPlan: 'Initial therapy plan.',
      soapNotes: {
        subjective: 'Initial symptoms.',
        objective: 'Initial vitals.',
        assessment: 'Initial assessment.',
        plan: 'Initial plan.'
      },
      save: async function(this: any) { return this; }
    })) as any;

    Consultation.prototype.save = (async function(this: any) { return this; }) as any;
    AuditLog.prototype.save = (async function(this: any) { return this; }) as any;

    AuditLog.find = (() => ({
      sort: function() { return this; },
      then: function(resolve: any) {
        resolve([{
          action: 'UPDATE_CONSULTATION_NOTES',
          timestamp: new Date(),
          metadata: { consultationId: dummyConsultationId }
        }]);
      }
    })) as any;
  });

  test('POST /api/v1/consultations/:id/edit - should update clinical notes and archive previous version in AuditLog', async () => {
    const payload = {
      diagnosis: 'Updated Strep Throat',
      findings: 'Tonsils remain red but swelling is reduced.',
      treatmentPlan: 'Continue penicillin and follow-up in 3 days.',
      soapNotes: {
        subjective: 'Sore throat improving slowly.',
        objective: 'Swelling reduced.',
        assessment: 'Improving tonsillitis.',
        plan: 'Penicillin course.'
      }
    };

    let logSaved = false;
    AuditLog.prototype.save = async function(this: any) {
      logSaved = true;
      return this;
    };

    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/edit`)
      .send(payload)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.diagnosis, 'Updated Strep Throat');
    assert.strictEqual(logSaved, true);
  });

  test('POST /api/v1/consultations/:id/edit - should reject edit if mandatory fields are missing', async () => {
    const payload = {
      diagnosis: '', // missing
      findings: 'Exam shows redness',
      treatmentPlan: 'Rest',
      soapNotes: { subjective: '', objective: '', assessment: '', plan: '' }
    };

    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/edit`)
      .send(payload)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'VALIDATION_ERROR');
    assert.ok(response.body.error.message.includes('Diagnosis'));
  });

  test('POST /api/v1/consultations/:id/edit - should be idempotent and not log audit trail if notes are identical', async () => {
    const payload = {
      diagnosis: 'Initial Diagnosis',
      findings: 'Initial exam notes.',
      treatmentPlan: 'Initial therapy plan.',
      soapNotes: {
        subjective: 'Initial symptoms.',
        objective: 'Initial vitals.',
        assessment: 'Initial assessment.',
        plan: 'Initial plan.'
      }
    };

    let logSaved = false;
    AuditLog.prototype.save = async function(this: any) {
      logSaved = true;
      return this;
    };

    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/edit`)
      .send(payload)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(logSaved, false); // no audit log saved for identical inputs
  });

  test('GET /api/v1/consultations/:id/history - should retrieve audit revision history list', async () => {
    const response = await request(app)
      .get(`/api/v1/consultations/${dummyConsultationId}/history`)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.data.length > 0);
    assert.strictEqual(response.body.data[0].action, 'UPDATE_CONSULTATION_NOTES');
  });

  test('POST /api/v1/consultations/:id/enhance - should return AI enhanced SOAP notes', async () => {
    const payload = {
      findings: 'Red throat, temperature is 100F',
      treatment: 'Rest and cough syrup'
    };

    const response = await request(app)
      .post(`/api/v1/consultations/${dummyConsultationId}/enhance`)
      .send(payload)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.data.subjective);
    assert.ok(response.body.data.objective);
    assert.ok(response.body.data.assessment);
    assert.ok(response.body.data.plan);
  });
});
