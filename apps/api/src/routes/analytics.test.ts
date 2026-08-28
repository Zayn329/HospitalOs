import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../app.js';
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Patient from '../models/Patient.js';
import Bill from '../models/Bill.js';

describe('Hospital Analytics API', () => {
  const originalPatientCount = Patient.countDocuments;
  const originalAppointmentCount = Appointment.countDocuments;
  const originalConsultationCount = Consultation.countDocuments;
  const originalConsultationFind = Consultation.find;
  const originalBillCount = Bill.countDocuments;
  const originalBillFind = Bill.find;

  after(() => {
    Patient.countDocuments = originalPatientCount;
    Appointment.countDocuments = originalAppointmentCount;
    Consultation.countDocuments = originalConsultationCount;
    Consultation.find = originalConsultationFind;
    Bill.countDocuments = originalBillCount;
    Bill.find = originalBillFind;
  });

  beforeEach(() => {
    Patient.countDocuments = (async () => 15) as any;
    Appointment.countDocuments = (async (query?: any) => {
      if (query?.status === 'completed') return 10;
      if (query?.status === 'cancelled') return 2;
      return 20;
    }) as any;

    Consultation.countDocuments = (async (query?: any) => {
      if (query?.priority === 'emergency') return 2;
      return 8;
    }) as any;

    Consultation.find = (async (query?: any) => {
      if (query?.status === 'open') return new Array(6).fill({});
      if (query?.status === 'in_progress') return new Array(2).fill({});
      return [];
    }) as any;

    Bill.countDocuments = (async () => 12) as any;
    Bill.find = (async () => [
      { totalAmount: 150, status: 'paid' },
      { totalAmount: 200, status: 'unpaid' }
    ]) as any;
  });

  test('GET /api/v1/analytics/dashboard - should return operational metrics', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/dashboard')
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.totalPatients, 15);
    assert.strictEqual(response.body.data.financials.totalRevenue, 350);
    assert.strictEqual(response.body.data.financials.paidRevenue, 150);
  });

  test('GET /api/v1/analytics/patient-flow - should detect queue bottlenecks', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/patient-flow')
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.waitingQueueCount, 6);
    assert.ok(response.body.data.bottlenecks.length > 0);
  });

  test('GET /api/v1/analytics/performance-report - should generate summary report', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/performance-report')
      .expect(200);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.summary.appointments.total, 20);
    assert.strictEqual(response.body.data.summary.appointments.completed, 10);
    assert.strictEqual(response.body.data.summary.appointments.completionRate, '50.0%');
  });
});
