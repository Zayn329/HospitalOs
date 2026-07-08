import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import Consultation from '../models/Consultation.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

describe('Patient Triage API', () => {
  const originalConsultationFindById = Consultation.findById;
  const originalConsultationSave = Consultation.prototype.save;
  const originalNotificationSave = Notification.prototype.save;
  const originalAuditLogSave = AuditLog.prototype.save;

  after(() => {
    Consultation.findById = originalConsultationFindById;
    Consultation.prototype.save = originalConsultationSave;
    Notification.prototype.save = originalNotificationSave;
    AuditLog.prototype.save = originalAuditLogSave;
  });

  const dummyConsultationId = new mongoose.Types.ObjectId().toString();
  const dummyDoctorId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    Consultation.findById = (async () => ({
      _id: dummyConsultationId,
      patientId: new mongoose.Types.ObjectId().toString(),
      doctorId: dummyDoctorId,
      status: 'open',
      priority: 'routine',
      triageNotes: '',
      triageAIEvaluated: false,
      save: async function(this: any) { return this; }
    })) as any;

    Consultation.prototype.save = (async function(this: any) { return this; }) as any;
    Notification.prototype.save = (async function(this: any) { return this; }) as any;
    AuditLog.prototype.save = (async function(this: any) { return this; }) as any;
  });

  test('POST /api/v1/triage/evaluate - should recognize emergency symptoms', async () => {
    const response = await request(app)
      .post('/api/v1/triage/evaluate')
      .send({ symptoms: 'Patient is experiencing crushing chest pain and severe shortness of breath.' })
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.priority, 'emergency');
    assert.strictEqual(response.body.data.insufficientInfo, false);
  });

  test('POST /api/v1/triage/evaluate - should recognize routine symptoms', async () => {
    const response = await request(app)
      .post('/api/v1/triage/evaluate')
      .send({ symptoms: 'Mild scratchy throat and runny nose since yesterday morning.' })
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.priority, 'routine');
    assert.strictEqual(response.body.data.insufficientInfo, false);
  });

  test('POST /api/v1/triage/evaluate - should identify vague/insufficient symptom details', async () => {
    const response = await request(app)
      .post('/api/v1/triage/evaluate')
      .send({ symptoms: 'feels sick' })
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.insufficientInfo, true);
    assert.ok(response.body.data.suggestedQuestions.length > 0);
  });

  test('POST /api/v1/triage/confirm - should save triage priority successfully and notify doctor of emergency', async () => {
    const payload = {
      consultationId: dummyConsultationId,
      priority: 'emergency',
      triageNotes: 'Immediate attention needed, possible stroke.',
      isOverride: false
    };

    const response = await request(app)
      .post('/api/v1/triage/confirm')
      .send(payload)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.consultation.priority, 'emergency');
    assert.ok(response.body.data.notification);
    assert.strictEqual(response.body.data.notification.type, 'EMERGENCY_ALERT');
  });

  test('POST /api/v1/triage/confirm - should log override reason if nurse overrides suggested priority', async () => {
    const payload = {
      consultationId: dummyConsultationId,
      priority: 'emergency',
      triageNotes: 'Nurse clinical override due to presenting symptoms.',
      isOverride: true,
      suggestedPriority: 'urgent',
      overrideReason: 'Patient showing cardiac symptoms not fully parsed by AI.'
    };

    const response = await request(app)
      .post('/api/v1/triage/confirm')
      .send(payload)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.consultation.priority, 'emergency');
  });
});
