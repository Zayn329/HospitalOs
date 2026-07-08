import { test, describe, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../app.js';
import Patient from '../models/Patient.js';
import AuditLog from '../models/AuditLog.js';

describe('Patient Registration API', () => {
  const originalFind = Patient.find;
  const originalFindOne = Patient.findOne;
  const originalSave = Patient.prototype.save;
  const originalAuditSave = AuditLog.prototype.save;
  
  after(() => {
    Patient.find = originalFind;
    Patient.findOne = originalFindOne;
    Patient.prototype.save = originalSave;
    AuditLog.prototype.save = originalAuditSave;
  });

  beforeEach(() => {
    Patient.find = (async () => []) as any;
    Patient.findOne = (async () => null) as any;
    Patient.prototype.save = (async function(this: any) {
      if (!this.hospitalId) this.hospitalId = 'HOSP-123456';
      return this;
    }) as any;
    AuditLog.prototype.save = (async function(this: any) {
      return this;
    }) as any;
  });

  test('POST /api/v1/patients - should register a new patient successfully', async () => {
    const payload = {
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      dateOfBirth: '1990-01-01',
      phone: '9876543210',
      email: 'john.doe@example.com'
    };

    const response = await request(app)
      .post('/api/v1/patients')
      .send(payload)
      .expect(201);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.firstName, 'John');
    assert.strictEqual(response.body.data.lastName, 'Doe');
    assert.match(response.body.data.hospitalId, /^HOSP-\d{6}$/);
  });

  test('POST /api/v1/patients - should prevent duplicate registration', async () => {
    // If exact phone match candidates are returned
    Patient.find = (async () => [{
      hospitalId: 'HOSP-123456',
      firstName: 'John',
      lastName: 'Doe',
      phone: '9876543210',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      address: ''
    }]) as any;

    const payload = {
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      dateOfBirth: '1990-01-01',
      phone: '9876543210'
    };

    const response = await request(app)
      .post('/api/v1/patients')
      .send(payload)
      .expect(409);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'DUPLICATE_PATIENT');
    assert.strictEqual(response.body.error.existingPatient.hospitalId, 'HOSP-123456');
  });

  test('POST /api/v1/patients - should detect a likely duplicate patient', async () => {
    // Returns a similar candidate name with different phone number
    Patient.find = (async () => [{
      hospitalId: 'HOSP-777777',
      firstName: 'Zain',
      lastName: 'Pawle',
      phone: '1111111111',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      address: '',
      toISOString: () => '1990-01-01T00:00:00.000Z'
    }]) as any;

    const payload = {
      firstName: 'zain',
      lastName: 'pawle',
      gender: 'male',
      dateOfBirth: '1990-01-01',
      phone: '2222222222'
    };

    const response = await request(app)
      .post('/api/v1/patients')
      .send(payload)
      .expect(409);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'POTENTIAL_DUPLICATE');
    assert.ok(response.body.error.matches.length > 0);
    assert.strictEqual(response.body.error.matches[0].hospitalId, 'HOSP-777777');
  });

  test('POST /api/v1/patients - should override duplicate warning and save', async () => {
    const payload = {
      firstName: 'zain',
      lastName: 'pawle',
      gender: 'male',
      dateOfBirth: '1990-01-01',
      phone: '2222222222',
      overrideDuplicate: true
    };

    const response = await request(app)
      .post('/api/v1/patients')
      .send(payload)
      .expect(201);

    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.firstName, 'zain');
    assert.strictEqual(response.body.data.lastName, 'pawle');
  });

  test('POST /api/v1/patients - should highlight missing required fields', async () => {
    const payload = {
      firstName: '',
      lastName: 'Doe',
      gender: '',
      dateOfBirth: 'invalid-date',
      phone: ''
    };

    const response = await request(app)
      .post('/api/v1/patients')
      .send(payload)
      .expect(400);

    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'VALIDATION_ERROR');
    
    const details = response.body.error.details;
    assert.ok(details.length > 0);
    assert.ok(details.some((d: any) => d.field === 'firstName'));
    assert.ok(details.some((d: any) => d.field === 'gender'));
    assert.ok(details.some((d: any) => d.field === 'dateOfBirth'));
    assert.ok(details.some((d: any) => d.field === 'phone'));
  });
});
