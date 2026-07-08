import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import Consultation from '../models/Consultation.js';
import Doctor from '../models/Doctor.js';
import Prescription from '../models/Prescription.js';
import LabReport from '../models/LabReport.js';
import Bill from '../models/Bill.js';
import AuditLog from '../models/AuditLog.js';

describe('Billing Management API', () => {
  const originalConsultationFindById = Consultation.findById;
  const originalDoctorFindOne = Doctor.findOne;
  const originalPrescriptionFindOne = Prescription.findOne;
  const originalLabReportFind = LabReport.find;
  const originalBillFind = Bill.find;
  const originalBillFindOne = Bill.findOne;
  const originalBillFindById = Bill.findById;
  const originalBillSave = Bill.prototype.save;
  const originalAuditLogSave = AuditLog.prototype.save;

  after(() => {
    Consultation.findById = originalConsultationFindById;
    Doctor.findOne = originalDoctorFindOne;
    Prescription.findOne = originalPrescriptionFindOne;
    LabReport.find = originalLabReportFind;
    Bill.find = originalBillFind;
    Bill.findOne = originalBillFindOne;
    Bill.findById = originalBillFindById;
    Bill.prototype.save = originalBillSave;
    AuditLog.prototype.save = originalAuditLogSave;
  });

  const dummyConsultationId = new mongoose.Types.ObjectId().toString();
  const dummyPatientId = new mongoose.Types.ObjectId().toString();
  const dummyBillId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    Consultation.findById = (async () => ({
      _id: dummyConsultationId,
      patientId: dummyPatientId,
      doctorId: new mongoose.Types.ObjectId().toString(),
      status: 'completed',
      diagnosis: 'Hypertension',
      treatmentPlan: 'Take meds'
    })) as any;

    Doctor.findOne = (async () => ({
      consultationFee: 150
    })) as any;

    Prescription.findOne = (async () => ({
      medications: ['Lisinopril 10mg']
    })) as any;

    LabReport.find = (async () => [
      { reportType: 'Blood Test' }
    ]) as any;

    Bill.find = (() => ({
      populate: function() {
        return {
          sort: function() {
            return {
              then: function(resolve: any) {
                resolve([]);
              }
            };
          }
        };
      }
    })) as any;

    Bill.findOne = (async () => null) as any;

    Bill.findById = (async () => ({
      _id: dummyBillId,
      patientId: dummyPatientId,
      consultationId: dummyConsultationId,
      totalAmount: 225,
      paymentStatus: 'pending',
      insuranceStatus: 'not_required',
      save: async function(this: any) { return this; }
    })) as any;

    Bill.prototype.save = (async function(this: any) {
      this._id = dummyBillId;
      return this;
    }) as any;

    AuditLog.prototype.save = (async function(this: any) { return this; }) as any;
  });

  test('POST /api/v1/bills - should generate a bill successfully with computed charges', async () => {
    const response = await request(app)
      .post('/api/v1/bills')
      .send({ consultationId: dummyConsultationId })
      .expect(201);

    assert.strictEqual(response.body.success, true);
    // Charge calculation: 150 (Consultation Fee) + 25 (1 Medication) + 50 (1 Lab Report) = 225
    assert.strictEqual(response.body.data.totalAmount, 225);
    assert.strictEqual(response.body.data.paymentStatus, 'pending');
  });

  test('POST /api/v1/bills - should reject duplication if bill already exists', async () => {
    Bill.findOne = (async () => ({
      _id: dummyBillId
    })) as any;

    const response = await request(app)
      .post('/api/v1/bills')
      .send({ consultationId: dummyConsultationId })
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'DUPLICATE_BILL');
  });

  test('POST /api/v1/bills - should reject bill generation for uncompleted consultation', async () => {
    Consultation.findById = (async () => ({
      _id: dummyConsultationId,
      status: 'open'
    })) as any;

    const response = await request(app)
      .post('/api/v1/bills')
      .send({ consultationId: dummyConsultationId })
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'CONSULTATION_NOT_COMPLETED');
  });

  test('POST /api/v1/bills/:id/pay - should pay bill successfully', async () => {
    const response = await request(app)
      .post(`/api/v1/bills/${dummyBillId}/pay`)
      .send({ paymentAmount: 225 })
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.bill.paymentStatus, 'paid');
    assert.ok(response.body.data.receipt.receiptNumber);
  });

  test('POST /api/v1/bills/:id/pay - should reject duplicate payment', async () => {
    Bill.findById = (async () => ({
      _id: dummyBillId,
      totalAmount: 225,
      paymentStatus: 'paid'
    })) as any;

    const response = await request(app)
      .post(`/api/v1/bills/${dummyBillId}/pay`)
      .send({ paymentAmount: 225 })
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'DUPLICATE_PAYMENT');
  });

  test('POST /api/v1/bills/:id/pay - should reject incorrect payment amount', async () => {
    const response = await request(app)
      .post(`/api/v1/bills/${dummyBillId}/pay`)
      .send({ paymentAmount: 100 })
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'INVALID_AMOUNT');
  });

  test('POST /api/v1/bills/:id/explain - should return AI explanation of bill charges', async () => {
    const response = await request(app)
      .post(`/api/v1/bills/${dummyBillId}/explain`)
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.ok(response.body.data.explanation);
  });

  test('POST /api/v1/bills/:id/verify-insurance - should verify insurance coverage', async () => {
    const response = await request(app)
      .post(`/api/v1/bills/${dummyBillId}/verify-insurance`)
      .send({ insuranceProvider: 'BlueCross', policyNumber: 'BC1234567' })
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.isCovered, true);
    assert.strictEqual(response.body.data.bill.insuranceStatus, 'approved');
  });
});
