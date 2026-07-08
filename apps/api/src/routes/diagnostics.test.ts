import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import LabReport from '../models/LabReport.js';
import Patient from '../models/Patient.js';
import AuditLog from '../models/AuditLog.js';

describe('Diagnostics Management API', () => {
  const originalLabReportFindById = LabReport.findById;
  const originalLabReportFind = LabReport.find;
  const originalLabReportSave = LabReport.prototype.save;
  const originalPatientFindById = Patient.findById;
  const originalAuditLogSave = AuditLog.prototype.save;

  after(() => {
    LabReport.findById = originalLabReportFindById;
    LabReport.find = originalLabReportFind;
    LabReport.prototype.save = originalLabReportSave;
    Patient.findById = originalPatientFindById;
    AuditLog.prototype.save = originalAuditLogSave;
  });

  const dummyReportId = new mongoose.Types.ObjectId().toString();
  const dummyPatientId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    LabReport.findById = (async () => ({
      _id: dummyReportId,
      patientId: dummyPatientId,
      testName: 'Lipid Panel',
      rawText: 'Cholesterol 210 mg/dL',
      isAbnormal: true,
      aiSummary: 'Mildly elevated cholesterol.',
      status: 'pending_review',
      save: async function(this: any) { return this; }
    })) as any;

    LabReport.find = (() => ({
      sort: function() { return this; },
      then: function(resolve: any) {
        resolve([{
          _id: dummyReportId,
          patientId: dummyPatientId,
          testName: 'Lipid Panel',
          rawText: 'Cholesterol 210 mg/dL',
          isAbnormal: true,
          aiSummary: 'Mildly elevated cholesterol.',
          status: 'pending_review'
        }]);
      }
    })) as any;

    LabReport.prototype.save = (async function(this: any) { return this; }) as any;

    Patient.findById = (async () => ({
      _id: dummyPatientId,
      firstName: 'Robert',
      lastName: 'Miller'
    })) as any;

    AuditLog.prototype.save = (async function(this: any) { return this; }) as any;
  });

  test('POST /api/v1/diagnostics/upload - should save a normal lab report', async () => {
    const payload = {
      patientId: dummyPatientId,
      testName: 'CBC Test',
      rawText: 'WBC is 7.0 K/uL, all other counts within normal ranges.'
    };

    const response = await request(app)
      .post('/api/v1/diagnostics/upload')
      .send(payload)
      .expect(201);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.status, 'pending_review');
    assert.strictEqual(response.body.data.isAbnormal, false);
  });

  test('POST /api/v1/diagnostics/upload - should identify abnormal blood levels automatically', async () => {
    const payload = {
      patientId: dummyPatientId,
      testName: 'Anemia Screen',
      rawText: 'Hemoglobin: 9.5 g/dL (Normal: 12-16)'
    };

    const response = await request(app)
      .post('/api/v1/diagnostics/upload')
      .send(payload)
      .expect(201);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.isAbnormal, true);
    assert.ok(response.body.data.aiSummary.toLowerCase().includes('abnormal'));
  });

  test('POST /api/v1/diagnostics/upload - should block upload on validation failures', async () => {
    const payload = {
      patientId: '', // invalid
      testName: 'Basic panel',
      rawText: ''
    };

    const response = await request(app)
      .post('/api/v1/diagnostics/upload')
      .send(payload)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'VALIDATION_ERROR');
  });

  test('GET /api/v1/diagnostics/patient/:patientId - should list lab reports', async () => {
    const response = await request(app)
      .get(`/api/v1/diagnostics/patient/${dummyPatientId}`)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.length, 1);
    assert.strictEqual(response.body.data[0].testName, 'Lipid Panel');
  });

  test('POST /api/v1/diagnostics/:id/review - should sign off lab report and log audit trail', async () => {
    let auditLogged = false;
    AuditLog.prototype.save = async function(this: any) {
      auditLogged = true;
      return this;
    };

    const response = await request(app)
      .post(`/api/v1/diagnostics/${dummyReportId}/review`)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.status, 'reviewed');
    assert.strictEqual(auditLogged, true);
  });
});
